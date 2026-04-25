import { useEffect, useRef, useState } from 'react';
import type { TelemetryEvent } from './types';

export function useSimulatedTelemetry() {
  const [feed, setFeed] = useState<TelemetryEvent[]>([]);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Keep telemetry idle until the real event pipeline is wired in.
    setFeed([]);
  }, []);

  useEffect(() => {
    if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight;
  }, [feed]);

  return { feed, feedRef };
}
