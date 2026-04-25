# ipc/

The single source of truth for IPC — channel names + handler registration.

## Goes here
- **Channel name constants** (one file) — every `ipcMain.handle(...)` channel string lives here so renderer + preload + main agree
- **Handler registration** — `registerIpcHandlers()` called once from `src/main/index.ts` after `app.whenReady()`
- Each handler is a thin shim that delegates to a service folder (`mqtt/`, `supabase/`, `claude_agent/`, etc.) — no business logic in this folder

## Does NOT go here
- Service implementations — those live in their own folders
- The preload bridge — lives in `src/preload/`

## Convention
- Channel naming: `<service>:<action>` — e.g. `mqtt:publish-state`, `supabase:list-sessions`, `claude:summarize`
- One handler per IPC call. If the renderer needs to listen for events, the service uses `webContents.send(...)` directly — that's not registered here
