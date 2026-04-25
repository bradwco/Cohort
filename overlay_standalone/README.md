# overlay_standalone/

A self-contained Electron mini-app for iterating on the overlay UI in isolation. **No build step. No shared code with the rest of the app.** Edit `index.html`, re-run, see the change.

## Run it
```
npm run dev:overlay
```

A 360×220 transparent always-on-top window appears. The whole card is draggable. Closing it exits the mini-app — the main Cohort app is unaffected.

## Files
- `main.cjs` — minimal Electron main process with all the Cluely / Discord-style flags
- `index.html` — vanilla HTML + CSS + JS overlay (animated orb, countdown timer, Summarize button)
- (No preload, no IPC, no React, no TypeScript — kept dead simple so you can iterate fast)

## Cluely-style flags applied (in `main.cjs`)
- `transparent: true` — see-through background
- `frame: false` — no titlebar
- `alwaysOnTop: true` + `setAlwaysOnTop(true, 'screen-saver')` — sits over fullscreen apps and games
- `setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true })` — follows you across macOS Spaces and Windows virtual desktops
- `skipTaskbar: true` — doesn't appear in taskbar / dock
- `hasShadow: false` — no OS-level drop shadow

Click-through is **off** during dev so you can drag and click. Enable for production:
```js
win.setIgnoreMouseEvents(true, { forward: true });
```

## Drag handling (CSS)
- `body { -webkit-app-region: drag }` makes the whole window draggable
- `button { -webkit-app-region: no-drag }` keeps interactive elements clickable

## Porting it into the main app
When you're happy with the design:
1. Move the `BrowserWindow` config + the three `setX(...)` calls in `main.cjs` into `src/main/windows/overlay_window.ts`
2. Move the markup in `index.html` into React components inside `src/renderer/src/overlay/`
3. The CSS rules and `-webkit-app-region` attributes port over unchanged
