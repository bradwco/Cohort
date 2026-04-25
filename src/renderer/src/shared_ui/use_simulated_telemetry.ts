import { useEffect, useRef, useState } from 'react';
import type { TelemetryEvent } from './types';

const SAMPLES: Pick<TelemetryEvent, 't' | 'topic' | 'payload'>[] = [
  { t: 'mqtt', topic: 'cohort/dock/kyle', payload: '{"docked":true,"lift":0,"orb":"#E8A87C"}' },
  { t: 'agent', topic: 'fetch.ai/agent/01', payload: '{"flow_score":94,"event":"sustained_focus"}' },
  { t: 'mqtt', topic: 'cohort/dock/alex', payload: '{"docked":true,"task":"reading","rem":2700}' },
  { t: 'mqtt', topic: 'cohort/dock/bailey', payload: '{"docked":false,"pause_budget":62}' },
  { t: 'agent', topic: 'gemma/coach/kyle', payload: '{"insight":"streak_holding","conf":0.91}' },
  { t: 'mqtt', topic: 'cohort/orb/kyle', payload: '{"r":232,"g":168,"b":124,"breathe":45}' },
  { t: 'agent', topic: 'fetch.ai/squad/ochem', payload: '{"members":3,"sync":true}' },
];

export function useSimulatedTelemetry() {
  const [feed, setFeed] = useState<TelemetryEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const id = setInterval(() => {
      const s = SAMPLES[Math.floor(Math.random() * SAMPLES.length)]!;
      const ts =
        new Date().toLocaleTimeString('en-US', { hour12: false }) +
        '.' +
        String(Math.floor(Math.random() * 1000)).padStart(3, '0');
      setFeed((prev) => [...prev.slice(-40), { ...s, ts }]);
    }, 1400);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  return { feed, feedRef };
}
