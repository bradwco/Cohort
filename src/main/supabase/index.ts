import { getSupabaseClient } from './client';

export interface Profile {
  id: string;
  username: string;
  orb_color: string;
  hardware_status: 'docked' | 'offline';
  current_activity: string;
  last_ping: string;
  avatar?: { skin: string; hair: string; eyes: string; outfit: string; accessory: string; background: string } | null;
  focus_state?: 'productive' | 'distracted' | 'idle' | 'offline' | null;
}

export interface FriendRequest {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'declined';
  created_at: string;
  requester?: Profile | null;
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

export interface Cohort {
  id: string;
  name: string;
  invite_code: string;
  owner_id: string;
  created_at: string;
  member_count?: number;
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
  updates: Partial<Pick<Profile, 'hardware_status' | 'current_activity' | 'orb_color' | 'last_ping' | 'avatar' | 'focus_state'>>,
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

async function shareCohort(userId: string, otherUserId: string): Promise<boolean> {
  const db = getSupabaseClient();
  const { data: mine, error } = await db
    .from('cohort_members')
    .select('cohort_id')
    .eq('user_id', userId);
  if (error || !mine || mine.length === 0) return false;

  const cohortIds = (mine as Array<{ cohort_id: string }>).map((row) => row.cohort_id);
  const { data: theirs, error: theirsError } = await db
    .from('cohort_members')
    .select('cohort_id')
    .eq('user_id', otherUserId)
    .in('cohort_id', cohortIds)
    .limit(1);
  return !theirsError && Boolean(theirs?.length);
}

export async function sendFriendRequest(requesterId: string, receiverId: string): Promise<FriendRequest | null> {
  if (requesterId === receiverId) return null;
  if (!(await shareCohort(requesterId, receiverId))) {
    console.error('sendFriendRequest: users must share a cohort');
    return null;
  }

  const db = getSupabaseClient();
  const { data, error } = await db
    .from('friend_requests')
    .upsert(
      {
        requester_id: requesterId,
        receiver_id: receiverId,
        status: 'pending',
      },
      { onConflict: 'requester_id,receiver_id' },
    )
    .select()
    .single();

  if (error) {
    console.error('sendFriendRequest:', error.message);
    return null;
  }
  return data as FriendRequest;
}

export async function getFriendRequests(userId: string): Promise<FriendRequest[]> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('friend_requests')
    .select('*')
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error || !data) {
    if (error) console.error('getFriendRequests:', error.message);
    return [];
  }

  const requesterIds = (data as FriendRequest[]).map((request) => request.requester_id);
  if (requesterIds.length === 0) return data as FriendRequest[];

  const { data: profiles } = await db.from('profiles').select('*').in('id', requesterIds);
  const profileMap = new Map(((profiles ?? []) as Profile[]).map((profile) => [profile.id, profile]));
  return (data as FriendRequest[]).map((request) => ({
    ...request,
    requester: profileMap.get(request.requester_id) ?? null,
  }));
}

export async function acceptFriendRequest(userId: string, requestId: string): Promise<boolean> {
  const db = getSupabaseClient();
  const { data, error } = await db
    .from('friend_requests')
    .select('*')
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .single();

  if (error || !data) {
    if (error) console.error('acceptFriendRequest find:', error.message);
    return false;
  }

  const request = data as FriendRequest;
  const ok = await addFriend(request.receiver_id, request.requester_id);
  if (!ok) return false;

  const { error: updateError } = await db
    .from('friend_requests')
    .update({ status: 'accepted' })
    .eq('id', requestId);
  if (updateError) {
    console.error('acceptFriendRequest update:', updateError.message);
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

function makeInviteCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

export async function createCohort(userId: string, name: string): Promise<Cohort | null> {
  const db = getSupabaseClient();
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  for (let attempt = 0; attempt < 4; attempt++) {
    const inviteCode = makeInviteCode();
    const { data, error } = await db
      .from('cohorts')
      .insert({
        name: trimmedName,
        owner_id: userId,
        invite_code: inviteCode,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') continue;
      console.error('createCohort:', error.message);
      return null;
    }

    const cohort = data as Cohort;
    const { error: memberError } = await db.from('cohort_members').upsert({
      cohort_id: cohort.id,
      user_id: userId,
      role: 'owner',
    });
    if (memberError) {
      console.error('createCohort membership:', memberError.message);
    }
    return { ...cohort, member_count: 1 };
  }

  console.error('createCohort: invite code collision');
  return null;
}

export async function joinCohort(userId: string, inviteCode: string): Promise<Cohort | null> {
  const db = getSupabaseClient();
  const code = inviteCode.trim().toUpperCase().replace(/^COHORT-/, '');
  if (!code) return null;

  const { data: cohort, error } = await db
    .from('cohorts')
    .select('*')
    .eq('invite_code', code)
    .single();
  if (error || !cohort) {
    if (error) console.error('joinCohort find:', error.message);
    return null;
  }

  const { error: memberError } = await db.from('cohort_members').upsert({
    cohort_id: (cohort as Cohort).id,
    user_id: userId,
    role: 'member',
  });
  if (memberError) {
    console.error('joinCohort membership:', memberError.message);
    return null;
  }

  return cohort as Cohort;
}

export async function getCohorts(userId: string): Promise<Cohort[]> {
  const db = getSupabaseClient();
  const { data: memberships, error } = await db
    .from('cohort_members')
    .select('cohort_id')
    .eq('user_id', userId);

  if (error || !memberships) {
    if (error) console.error('getCohorts memberships:', error.message);
    return [];
  }

  const cohortIds = memberships.map((row) => (row as { cohort_id: string }).cohort_id);
  if (cohortIds.length === 0) return [];

  const { data: cohorts, error: cohortError } = await db
    .from('cohorts')
    .select('*')
    .in('id', cohortIds)
    .order('created_at', { ascending: false });

  if (cohortError) {
    console.error('getCohorts:', cohortError.message);
    return [];
  }

  const { data: allMembers } = await db
    .from('cohort_members')
    .select('cohort_id')
    .in('cohort_id', cohortIds);

  const counts = new Map<string, number>();
  for (const row of (allMembers ?? []) as Array<{ cohort_id: string }>) {
    counts.set(row.cohort_id, (counts.get(row.cohort_id) ?? 0) + 1);
  }

  return ((cohorts ?? []) as Cohort[]).map((cohort) => ({
    ...cohort,
    member_count: counts.get(cohort.id) ?? 0,
  }));
}

export async function leaveCohort(userId: string, cohortId: string): Promise<boolean> {
  const { error } = await getSupabaseClient()
    .from('cohort_members')
    .delete()
    .eq('cohort_id', cohortId)
    .eq('user_id', userId);
  if (error) {
    console.error('leaveCohort:', error.message);
    return false;
  }
  return true;
}

export async function getCohortMembers(cohortId: string): Promise<Array<Profile & { streak: number }>> {
  const db = getSupabaseClient();
  const { data: members, error } = await db
    .from('cohort_members')
    .select('user_id')
    .eq('cohort_id', cohortId);

  if (error || !members) return [];
  const userIds = (members as Array<{ user_id: string }>).map((row) => row.user_id);
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await db.from('profiles').select('*').in('id', userIds);
  if (profileError) return [];

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const { data: sessions } = await db
    .from('sessions')
    .select('user_id, started_at')
    .in('user_id', userIds)
    .gte('started_at', thirtyDaysAgo.toISOString());

  const sessionsByUser = new Map<string, Set<string>>();
  for (const s of (sessions ?? []) as Array<{ user_id: string; started_at: string }>) {
    const dateKey = new Date(s.started_at).toLocaleDateString();
    if (!sessionsByUser.has(s.user_id)) sessionsByUser.set(s.user_id, new Set());
    sessionsByUser.get(s.user_id)!.add(dateKey);
  }

  const today = new Date();
  const computeStreak = (dateSet: Set<string>) => {
    let streak = 0;
    for (let i = 0; i < 31; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (dateSet.has(d.toLocaleDateString())) streak++;
      else break;
    }
    return streak;
  };

  return ((profiles ?? []) as Profile[]).map((p) => ({
    ...p,
    streak: computeStreak(sessionsByUser.get(p.id) ?? new Set()),
  }));
}

export async function getSharedCohortProfiles(userId: string): Promise<Profile[]> {
  const db = getSupabaseClient();
  const { data: mine, error } = await db
    .from('cohort_members')
    .select('cohort_id')
    .eq('user_id', userId);

  if (error || !mine || mine.length === 0) return [];
  const cohortIds = (mine as Array<{ cohort_id: string }>).map((row) => row.cohort_id);

  const { data: members, error: memberError } = await db
    .from('cohort_members')
    .select('user_id')
    .in('cohort_id', cohortIds)
    .neq('user_id', userId);
  if (memberError || !members) return [];

  const userIds = Array.from(new Set((members as Array<{ user_id: string }>).map((row) => row.user_id)));
  if (userIds.length === 0) return [];

  const { data: profiles, error: profileError } = await db.from('profiles').select('*').in('id', userIds);
  if (profileError) {
    console.error('getSharedCohortProfiles:', profileError.message);
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
  conversationHistory?: unknown[],
): Promise<void> {
  const { error } = await getSupabaseClient()
    .from('sessions')
    .update({
      ended_at: new Date().toISOString(),
      pause_minutes_used: pauseMinutesUsed,
      flow_score: flowScore,
      ai_summary: aiSummary,
      ...(conversationHistory !== undefined && { conversation_history: conversationHistory }),
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
