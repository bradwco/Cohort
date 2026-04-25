export const CH = {
  // App
  PING: 'app:ping',

  // Supabase — profiles
  PROFILE_GET: 'supabase:profile-get',
  PROFILE_UPDATE: 'supabase:profile-update',

  // Supabase — friends
  FRIENDS_LIST: 'supabase:friends-list',
  FRIEND_ADD: 'supabase:friend-add',
  PROFILE_SEARCH: 'supabase:profile-search',

  // Supabase — sessions
  SESSION_START: 'supabase:session-start',
  SESSION_END: 'supabase:session-end',
  SESSION_HISTORY: 'supabase:session-history',

  // Supabase — activity logs
  ACTIVITY_LOG: 'supabase:activity-log',
  ACTIVITY_LOGS_GET: 'supabase:activity-logs-get',

  // Shell
  OPEN_EXTERNAL: 'shell:open-external',

  // Hardware simulator (dev only)
  HW_SIMULATE: 'hw:simulate',

  // MQTT
  MQTT_INIT: 'mqtt:init',
  MQTT_PUBLISH_COMMAND: 'mqtt:publish-command',
  MQTT_SUBSCRIBE_FRIENDS: 'mqtt:subscribe-friends',
  MQTT_PAUSE_STATS: 'mqtt:pause-stats',
} as const;

// Renderer-bound push events (main → renderer via webContents.send)
export const PUSH = {
  MQTT_CONNECTED: 'mqtt:connected',
  MQTT_OWN_STATE: 'mqtt:own-state',
  MQTT_FRIEND_STATE: 'mqtt:friend-state',
  DEEP_LINK: 'app:deep-link',
} as const;
