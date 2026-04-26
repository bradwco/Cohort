export type ViewId = 'dashboard' | 'history' | 'friends' | 'settings';

export type TelemetryEvent = {
  t: 'mqtt' | 'agent';
  topic: string;
  payload: string;
  ts: string;
};
