export type ViewId = 'dashboard' | 'history' | 'friends' | 'orb' | 'settings';

export type TelemetryEvent = {
  t: 'mqtt' | 'agent';
  topic: string;
  payload: string;
  ts: string;
};
