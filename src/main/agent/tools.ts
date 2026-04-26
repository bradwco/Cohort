import {
  getProfile,
  getSessionActivityLogs,
  getSessionById,
  getSessionHistory,
  type ActivityLog,
  type Session,
} from '../supabase';
import type { ToolSpec } from './gemma';

type ToolResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string };

type ToolRunner = (args: Record<string, unknown>) => Promise<ToolResult>;

type ToolEntry = {
  spec: ToolSpec;
  run: ToolRunner;
};

type WorkflowBreakdown = Record<string, number>;

function ok(data: unknown): ToolResult {
  return { ok: true, data };
}

function err(message: string): ToolResult {
  return { ok: false, error: message };
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function localDateKey(isoDate: string): string {
  const date = new Date(isoDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function computeCurrentStreak(sessions: Session[]): number {
  const sessionDays = new Set(sessions.map((session) => localDateKey(session.started_at)));
  if (sessionDays.size === 0) return 0;

  let streak = 0;
  const cursor = new Date();

  for (let i = 0; i < 365; i += 1) {
    const year = cursor.getFullYear();
    const month = String(cursor.getMonth() + 1).padStart(2, '0');
    const day = String(cursor.getDate()).padStart(2, '0');
    const key = `${year}-${month}-${day}`;
    if (!sessionDays.has(key)) break;
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function summarizeWorkflows(sessions: Session[]): WorkflowBreakdown {
  return sessions.reduce<WorkflowBreakdown>((acc, session) => {
    const key = session.workflow_group || 'unknown';
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

async function getRecentSessions(args: Record<string, unknown>): Promise<ToolResult> {
  const userId = typeof args.user_id === 'string' ? args.user_id : '';
  if (!userId) return err('user_id required');
  const limit = Math.max(1, Math.min(25, toNumber(args.limit, 10)));
  const sessions = await getSessionHistory(userId);
  return ok(sessions.slice(0, limit));
}

async function getSession(args: Record<string, unknown>): Promise<ToolResult> {
  const sessionId = typeof args.session_id === 'string' ? args.session_id : '';
  if (!sessionId) return err('session_id required');

  const session = await getSessionById(sessionId);
  if (!session) return err('session not found');

  const activity = await getSessionActivityLogs(sessionId);
  return ok({ session, activity });
}

async function getSessionCalendar(args: Record<string, unknown>): Promise<ToolResult> {
  const userId = typeof args.user_id === 'string' ? args.user_id : '';
  if (!userId) return err('user_id required');

  const month = typeof args.month === 'string' ? args.month : '';
  const sessions = await getSessionHistory(userId);
  const monthSessions = month
    ? sessions.filter((session) => localDateKey(session.started_at).startsWith(month))
    : sessions;

  const days = monthSessions.reduce<Record<string, { session_count: number; workflows: WorkflowBreakdown }>>(
    (acc, session) => {
      const key = localDateKey(session.started_at);
      const workflows = acc[key]?.workflows ?? {};
      const workflow = session.workflow_group || 'unknown';
      workflows[workflow] = (workflows[workflow] ?? 0) + 1;

      acc[key] = {
        session_count: (acc[key]?.session_count ?? 0) + 1,
        workflows,
      };
      return acc;
    },
    {},
  );

  return ok({
    month: month || null,
    days,
  });
}

async function summarizeDay(args: Record<string, unknown>): Promise<ToolResult> {
  const userId = typeof args.user_id === 'string' ? args.user_id : '';
  const date = typeof args.date === 'string' ? args.date : '';
  if (!userId || !date) return err('user_id and date required');

  const sessions = (await getSessionHistory(userId)).filter((session) => localDateKey(session.started_at) === date);
  const totalPauseMinutes = sessions.reduce((sum, session) => sum + (session.pause_minutes_used ?? 0), 0);
  const flowScores = sessions
    .map((session) => session.flow_score)
    .filter((score): score is number => typeof score === 'number');
  const averageFlow = flowScores.length > 0
    ? Math.round(flowScores.reduce((sum, score) => sum + score, 0) / flowScores.length)
    : null;

  return ok({
    date,
    session_count: sessions.length,
    total_pause_minutes: totalPauseMinutes,
    average_flow_score: averageFlow,
    workflows: summarizeWorkflows(sessions),
    sessions,
  });
}

async function getDashboardMetrics(args: Record<string, unknown>): Promise<ToolResult> {
  const userId = typeof args.user_id === 'string' ? args.user_id : '';
  if (!userId) return err('user_id required');

  const windowDays = Math.max(1, Math.min(30, toNumber(args.window_days, 7)));
  const sessions = await getSessionHistory(userId);
  const since = new Date();
  since.setDate(since.getDate() - windowDays + 1);

  const recentSessions = sessions.filter((session) => new Date(session.started_at) >= since);
  const flowScores = recentSessions
    .map((session) => session.flow_score)
    .filter((score): score is number => typeof score === 'number');

  return ok({
    window_days: windowDays,
    total_sessions: recentSessions.length,
    days_active: new Set(recentSessions.map((session) => localDateKey(session.started_at))).size,
    average_flow_score: flowScores.length > 0
      ? Math.round(flowScores.reduce((sum, score) => sum + score, 0) / flowScores.length)
      : null,
    current_streak: computeCurrentStreak(sessions),
    latest_workflow: sessions[0]?.workflow_group ?? null,
    latest_ai_summary: sessions[0]?.ai_summary ?? null,
  });
}

async function getUserProfile(args: Record<string, unknown>): Promise<ToolResult> {
  const userId = typeof args.user_id === 'string' ? args.user_id : '';
  if (!userId) return err('user_id required');
  return ok(await getProfile(userId));
}

async function getSessionActivity(args: Record<string, unknown>): Promise<ToolResult> {
  const sessionId = typeof args.session_id === 'string' ? args.session_id : '';
  if (!sessionId) return err('session_id required');

  const activity = await getSessionActivityLogs(sessionId);
  const breakdown = activity.reduce<Record<ActivityLog['event_type'], number>>(
    (acc, event) => {
      acc[event.event_type] = (acc[event.event_type] ?? 0) + 1;
      return acc;
    },
    {
      app_focus: 0,
      hardware_break: 0,
    },
  );

  return ok({
    events: activity,
    counts: breakdown,
  });
}

const REGISTRY: Record<string, ToolEntry> = {
  get_recent_sessions: {
    run: getRecentSessions,
    spec: {
      type: 'function',
      function: {
        name: 'get_recent_sessions',
        description: 'Return the user’s most recent focus sessions, newest first.',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            limit: { type: 'integer', default: 10 },
          },
          required: ['user_id'],
        },
      },
    },
  },
  get_session: {
    run: getSession,
    spec: {
      type: 'function',
      function: {
        name: 'get_session',
        description: 'Return one session plus its activity log for postmortems.',
        parameters: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
          },
          required: ['session_id'],
        },
      },
    },
  },
  get_session_calendar: {
    run: getSessionCalendar,
    spec: {
      type: 'function',
      function: {
        name: 'get_session_calendar',
        description: 'Return sessions grouped by local calendar day, optionally filtered to YYYY-MM.',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            month: { type: 'string', description: 'Optional YYYY-MM month filter.' },
          },
          required: ['user_id'],
        },
      },
    },
  },
  summarize_day: {
    run: summarizeDay,
    spec: {
      type: 'function',
      function: {
        name: 'summarize_day',
        description: 'Summarize one day of sessions, pauses, and workflow mix.',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            date: { type: 'string', description: 'Local date in YYYY-MM-DD format.' },
          },
          required: ['user_id', 'date'],
        },
      },
    },
  },
  get_dashboard_metrics: {
    run: getDashboardMetrics,
    spec: {
      type: 'function',
      function: {
        name: 'get_dashboard_metrics',
        description: 'Return recent streak, flow, and activity metrics for the dashboard.',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
            window_days: { type: 'integer', default: 7 },
          },
          required: ['user_id'],
        },
      },
    },
  },
  get_user_profile: {
    run: getUserProfile,
    spec: {
      type: 'function',
      function: {
        name: 'get_user_profile',
        description: 'Return the user profile row and current presence metadata.',
        parameters: {
          type: 'object',
          properties: {
            user_id: { type: 'string' },
          },
          required: ['user_id'],
        },
      },
    },
  },
  get_session_activity: {
    run: getSessionActivity,
    spec: {
      type: 'function',
      function: {
        name: 'get_session_activity',
        description: 'Return session activity events and event-type counts.',
        parameters: {
          type: 'object',
          properties: {
            session_id: { type: 'string' },
          },
          required: ['session_id'],
        },
      },
    },
  },
};

export async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tool = REGISTRY[name];
  if (!tool) return err(`unknown tool: ${name}`);

  try {
    return await tool.run(args);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return err(message);
  }
}

export function toolSpecs(): ToolSpec[] {
  return Object.values(REGISTRY).map((tool) => tool.spec);
}
