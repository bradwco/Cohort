export type FocusMetricState = 'productive' | 'distracted' | 'idle';

export type SessionMetrics = {
  productive_duration_seconds: number;
  distracted_duration_seconds: number;
  distracted_occurrences: number;
  idle_duration_seconds: number;
  idle_occurrences: number;
  phone_lift_count: number;
  total_work_duration_seconds: number;
};

type MutableSessionMetrics = SessionMetrics & {
  sessionId: string;
  currentState: FocusMetricState;
  currentStateStartedAt: number;
};

const zeroMetrics = (): SessionMetrics => ({
  productive_duration_seconds: 0,
  distracted_duration_seconds: 0,
  distracted_occurrences: 0,
  idle_duration_seconds: 0,
  idle_occurrences: 0,
  phone_lift_count: 0,
  total_work_duration_seconds: 0,
});

let activeMetrics: MutableSessionMetrics | null = null;

export function startSessionMetrics(sessionId: string, startedAt?: string | null): void {
  const startMs = startedAt ? Date.parse(startedAt) : Date.now();
  activeMetrics = {
    ...zeroMetrics(),
    sessionId,
    currentState: 'productive',
    currentStateStartedAt: Number.isFinite(startMs) ? startMs : Date.now(),
  };
}

export function recordFocusState(state: string): void {
  if (!activeMetrics || !isMetricState(state)) return;
  const now = Date.now();
  closeCurrentState(now);

  if (state === 'distracted') activeMetrics.distracted_occurrences += 1;
  if (state === 'idle') activeMetrics.idle_occurrences += 1;

  activeMetrics.currentState = state;
  activeMetrics.currentStateStartedAt = now;
}

export function recordPhoneLift(): void {
  if (!activeMetrics) return;
  activeMetrics.phone_lift_count += 1;
}

export function finishSessionMetrics(sessionId: string): SessionMetrics | null {
  if (!activeMetrics || activeMetrics.sessionId !== sessionId) return null;
  closeCurrentState(Date.now());
  const result = toSnapshot(activeMetrics);
  activeMetrics = null;
  return result;
}

export function calculateFlowScore(metrics: SessionMetrics): number {
  const total = Math.max(1, metrics.total_work_duration_seconds);
  const productiveRatio = metrics.productive_duration_seconds / total;
  const distractedRatio = metrics.distracted_duration_seconds / total;
  const idleRatio = metrics.idle_duration_seconds / total;
  const liftPenalty = Math.min(20, metrics.phone_lift_count * 3);
  return Math.max(0, Math.min(100, Math.round(productiveRatio * 100 - distractedRatio * 45 - idleRatio * 30 - liftPenalty)));
}

function closeCurrentState(now: number): void {
  if (!activeMetrics) return;
  const elapsed = Math.max(0, Math.round((now - activeMetrics.currentStateStartedAt) / 1000));
  if (activeMetrics.currentState === 'productive') activeMetrics.productive_duration_seconds += elapsed;
  if (activeMetrics.currentState === 'distracted') activeMetrics.distracted_duration_seconds += elapsed;
  if (activeMetrics.currentState === 'idle') activeMetrics.idle_duration_seconds += elapsed;
  activeMetrics.total_work_duration_seconds += elapsed;
  activeMetrics.currentStateStartedAt = now;
}

function toSnapshot(metrics: MutableSessionMetrics): SessionMetrics {
  return {
    productive_duration_seconds: metrics.productive_duration_seconds,
    distracted_duration_seconds: metrics.distracted_duration_seconds,
    distracted_occurrences: metrics.distracted_occurrences,
    idle_duration_seconds: metrics.idle_duration_seconds,
    idle_occurrences: metrics.idle_occurrences,
    phone_lift_count: metrics.phone_lift_count,
    total_work_duration_seconds: metrics.total_work_duration_seconds,
  };
}

function isMetricState(state: string): state is FocusMetricState {
  return state === 'productive' || state === 'distracted' || state === 'idle';
}
