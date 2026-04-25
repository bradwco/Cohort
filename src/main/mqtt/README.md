# mqtt/

MQTT client (HiveMQ Cloud) — the messaging hub for lamp ↔ desktop ↔ friends.

## Goes here
- MQTT connection setup (URL, user, pass from `.env`)
- Reconnect-with-backoff logic
- **Topic conventions** (single source of truth):
  - `focus-orb/<userId>/state` — this user's orb state
  - `focus-orb/friends/<friendId>/state` — friend orb states
  - `focus-orb/<userId>/command` — desktop → orb commands
- Publish helpers (`publishOrbState`, `publishSessionStart`, ...)
- Inbound message handlers — forward to renderer via `webContents.send('mqtt:friend-state', ...)`

## Does NOT go here
- UI for friends — lives in `src/renderer/src/friends/`
- Persistence of session data — lives in `src/main/supabase/`
- Hardware pairing handshake — lives in `src/main/hardware_pairing/`

## Wires into
- Subscribed friend list comes from `src/main/supabase/`
- Receives outbound publish requests via IPC from renderer
- Forwards inbound to renderer (both main window AND overlay)
