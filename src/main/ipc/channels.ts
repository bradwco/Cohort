export const CH = {
  // App
  PING: 'app:ping',

  // Supabase - profiles
  PROFILE_GET: 'supabase:profile-get',
  PROFILE_UPDATE: 'supabase:profile-update',

  // Supabase - friends
  FRIENDS_LIST: 'supabase:friends-list',
  FRIEND_ADD: 'supabase:friend-add',
  FRIEND_REQUESTS_LIST: 'supabase:friend-requests-list',
  FRIEND_REQUEST_SEND: 'supabase:friend-request-send',
  FRIEND_REQUEST_ACCEPT: 'supabase:friend-request-accept',
  PROFILE_SEARCH: 'supabase:profile-search',
  FRIEND_NUDGE_SEND: 'friends:nudge-send',

  // Supabase - cohorts
  COHORTS_LIST: 'supabase:cohorts-list',
  COHORT_CREATE: 'supabase:cohort-create',
  COHORT_JOIN: 'supabase:cohort-join',
  COHORT_SHARED_PROFILES: 'supabase:cohort-shared-profiles',
  COHORT_MEMBERS: 'supabase:cohort-members',
  COHORT_LEAVE: 'supabase:cohort-leave',

  // Supabase - sessions
  SESSION_START: 'supabase:session-start',
  SESSION_END: 'supabase:session-end',
  SESSION_RESUME: 'supabase:session-resume',
  SESSION_HISTORY: 'supabase:session-history',

  // Agent
  AGENT_QUERY: 'agent:query',

  // Supabase - activity logs
  ACTIVITY_LOG: 'supabase:activity-log',
  ACTIVITY_LOGS_GET: 'supabase:activity-logs-get',

  // App
  SAVE_USER_SESSION: 'app:save-user-session',

  // Shell
  OPEN_EXTERNAL: 'shell:open-external',
  OPEN_AUTH_WINDOW: 'shell:open-auth-window',

  // Hardware simulator (dev only)
  HW_SIMULATE: 'hw:simulate',

  // MQTT
  MQTT_INIT: 'mqtt:init',
  MQTT_PUBLISH_COMMAND: 'mqtt:publish-command',
  MQTT_SUBSCRIBE_FRIENDS: 'mqtt:subscribe-friends',
  MQTT_PAUSE_STATS: 'mqtt:pause-stats',
} as const;

// Renderer-bound push events (main -> renderer via webContents.send)
export const PUSH = {
  MQTT_CONNECTED: 'mqtt:connected',
  MQTT_OWN_STATE: 'mqtt:own-state',
  MQTT_FRIEND_STATE: 'mqtt:friend-state',
  FRIEND_NUDGE: 'friends:nudge',
  DEEP_LINK: 'app:deep-link',
  SESSION_PAUSED: 'session:paused',
} as const;
