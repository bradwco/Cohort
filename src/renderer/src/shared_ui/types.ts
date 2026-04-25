export type ViewId = 'network' | 'history' | 'graveyard' | 'hardware';

export type TelemetryEvent = {
  t: 'mqtt' | 'agent';
  topic: string;
  payload: string;
  ts: string;
};
