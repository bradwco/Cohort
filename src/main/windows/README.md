# windows/

`BrowserWindow` factories. One file per window.

## Goes here
- `main_window.ts` — Home/History window
  - 1200×800, normal chrome
  - Loads the main renderer entry (`renderer/index.html`)
  - Hosts home_page, history_page, settings_page, friends, pairing
- `overlay_window.ts` — overlay shown during a session
  - 320×480, `transparent: true`, `frame: false`, `alwaysOnTop: true`, `skipTaskbar: true`
  - Loads the overlay renderer entry (separate HTML file)
  - Created hidden, `.show()` on session start, `.hide()` on session end
- Window lifecycle helpers (cross-window event broadcast, focus management)

## Does NOT go here
- App-level lifecycle (`whenReady`, `window-all-closed`) — that's in `src/main/index.ts`
- Renderer code — lives in `src/renderer/`

## Convention
- Each factory exports `create<Name>Window(): BrowserWindow` and is called from `src/main/index.ts`
- Both windows share one preload script (`src/preload/index.ts`) for now
