import { getSupabaseClient } from './client';

export interface Profile {
  id: string;
  username: string;
  orb_color: string;
  hardware_status: 'docked' | 'offline';
  current_activity: string;
  last_ping: string;
  avatar?: { skin: string; hair: string; eyes: string; outfit: string; accessory: string; background: string } | null;
}

export interface Session {
  id: string;
  user_id: string;
  workflow_group: string;
  planned_duration_minutes: number;
  started_at: string;
  ended_at: string | null;
  pause_minutes_used: number;
  flow_score: number | null;
  ai_summary: string | null;
}

export interface Friendship {
  user_id: string;
  friend_ids: string[];
}

export interface ActivityLog {
  id: string;
  session_id: string;
  user_id: string;
  event_type: 'app_focus' | 'hardware_break';
  event_detail: Record<string, unknown>;
  logged_at: string;
}

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient().from('profiles').select('*').eq('id', userId).single();
  if (error) {
    console.error('getProfile:', error.message);
    return null;
  }
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'hardware_status' | 'current_activity' | 'orb_color' | 'last_ping' | 'avatar'>>,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('profiles')
    .update({ ...updates, last_ping: new Date().toISOString() })
    .eq('id', userId);
  if (error) console.error('updateProfile:', error.message);
}

export async function searchProfileByUsername(username: string): Promise<Profile | null> {
  const { data, error } = await getSupabaseClient()
    .from('profiles')
    .select('*')
    .ilike('username', username)
    .single();
  if (error || !data) return null;
  return data as Profile;
}

export async function addFriend(userId: string, friendId: string): Promise<boolean> {
  if (userId === friendId) return false;
  const { error } = await getSupabaseClient().rpc('add_friend_bidirectional', {
    p_user_id: userId,
    p_friend_id: friendId,
  });
  if (error) {
    console.error('addFriend:', error.message);
    return false;
  }
  return true;
}

export async function getFriendsWithProfiles(userId: string): Promise<Profile[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('friendships')
    .select('friend_ids')
    .eq('user_id', userId)
    .single();

  if (error || !data) return [];
  const friendIds: string[] = (data as Friendship).friend_ids ?? [];
  if (friendIds.length === 0) return [];

  const { data: profiles, error: profileError } = await db.from('profiles').select('*').in('id', friendIds);
  if (profileError) {
    console.error('getFriendProfiles:', profileError.message);
    return [];
  }
  return (profiles ?? []) as Profile[];
}

export async function startSession(
  userId: string,
  workflowGroup: string,
  plannedDurationMinutes: number,
): Promise<Session | null> {
  const { data, error } = await getSupabaseClient()
    .from('sessions')
    .insert({
      user_id: userId,
      workflow_group: workflowGroup,
      planned_duration_minutes: plannedDurationMinutes,
      started_at: new Date().toISOString(),
      pause_minutes_used: 0,
    })
    .select()
    .single();

  if (error) {
    console.error('startSession:', error.message);
    return null;
  }
  return data as Session;
}

export async function endSession(
  sessionId: string,
  pauseMinutesUsed: number,
  flowScore: number,
  aiSummary: string,
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      pause_minutes_used: pauseMinutesUsed,
      flow_score: flowScore,
      ai_summary: aiSummary,
    })
    .eq('id', sessionId);
  if (error) console.error('endSession:', error.message);
}

export async function getSessionHistory(userId: string): Promise<Session[]> {
  const { data, error } = await getSupabaseClient()
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(50);
  if (error) {
    console.error('getSessionHistory:', error.message);
    return [];
  }
  return (data ?? []) as Session[];
}

export async function logActivity(
  sessionId: string,
  userId: string,
  eventType: ActivityLog['event_type'],
  eventDetail: Record<string, unknown>,
): Promise<void> {
  const { error } = await getSupabaseClient().from('activity_logs').insert({
    session_id: sessionId,
    user_id: userId,
    event_type: eventType,
    event_detail: eventDetail,
    logged_at: new Date().toISOString(),
  });
  if (error) console.error('logActivity:', error.message);
}

export async function getSessionActivityLogs(sessionId: string): Promise<ActivityLog[]> {
  const { data, error } = await getSupabaseClient()
    .from('activity_logs')
    .select('*')
    .eq('session_id', sessionId)
    .order('logged_at', { ascending: true });
  if (error) {
    console.error('getActivityLogs:', error.message);
    return [];
  }
  return (data ?? []) as ActivityLog[];
}
