# friends/

Everything friend-network related on the renderer side.

## Goes here
- **Friends list** (cards showing each friend + their orb color/state)
- **Friends sidebar component** (used by `home_page/`)
- **Add friend / accept invite** flow UI
- Friend profile detail view
- Real-time presence display (who's locked in right now)
- React hooks for subscribing to friend state (e.g. `useFriendPresence`)

## Does NOT go here
- The MQTT client itself (lives in `src/main/mqtt/`)
- Friend graph DB queries (live in `src/main/supabase/`)

## Wires into
- Friend list via IPC ← `src/main/supabase/`
- Live presence via IPC events ← `src/main/mqtt/` (forwarded from MQTT topics)
