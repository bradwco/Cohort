# supabase/

Supabase client — auth, session history, friend graph.

## Goes here
- Supabase client initialization (URL + anon key from `.env`)
- **Auth flows** — sign up, sign in, sign out, session refresh
- **Sessions table** — write start, duration, distractions, summary; read history
- **Friend graph** — invite, accept, list, remove
- **Paired devices table** — orb metadata persisted from `hardware_pairing/`
- ipcMain handlers exposing all of the above to the renderer
- Token storage (electron's `safeStorage` for refresh tokens)

## Does NOT go here
- UI for any of these — lives in the renderer feature folders
- Realtime presence — that's MQTT, lives in `src/main/mqtt/`

## Wires into
- Used by every other main-process service that needs durable state
