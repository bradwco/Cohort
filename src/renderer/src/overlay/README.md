# overlay/

The transparent, always-on-top window shown DURING a focus session. Different React entry from the main window.

## Goes here
- Overlay window root component
- **Adjustable timer** (start/pause/extend, time remaining)
- **Animated orb character** (composed from `orb_character/`)
- **Red distraction border** that pulses when activity tracker flags a distraction
- **"Summarize / help" button** (Cluely-style: screenshots current work, asks Claude)
- Drag handle for repositioning the overlay
- Click-through toggle

## Does NOT go here
- The orb component itself (lives in `orb_character/`)
- Activity-tracker logic (lives in `src/main/activity_tracking/`)
- Claude API calls (lives in `src/main/claude_agent/`)

## Wires into
- Listens for distraction events via IPC ← `src/main/activity_tracking/`
- Calls "summarize" via IPC → `src/main/claude_agent/`
- Reflects orb state from MQTT via IPC ← `src/main/mqtt/`

## Window setup
- BrowserWindow created in `src/main/windows/` with `transparent: true, frame: false, alwaysOnTop: true`
- Loads its own HTML entry — separate from the main window's React tree
