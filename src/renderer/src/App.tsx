import { useState } from 'react';

export default function App() {
  const [reply, setReply] = useState<string | null>(null);

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32 }}>
      <h1>Cohort</h1>
      <p>Electron + React + TypeScript + Vite is wired up.</p>
      <button onClick={async () => setReply(await window.api.ping())}>
        Ping main
      </button>
      {reply && <p>main replied: {reply}</p>}
    </div>
  );
}
