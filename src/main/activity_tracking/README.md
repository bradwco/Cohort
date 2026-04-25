# activity_tracking/

Background polling of the user's foreground activity during a focus session.

## Goes here
- `active-win` polling loop (start on session start, stop on session end)
- In-memory event buffer (timestamp, app name, window title)
- **Distraction detection** — compare current foreground app against an allow/deny list, fire event when a distraction is detected
- Flush event log to disk (and to `src/main/supabase/` for history)
- Hand the event log to `src/main/claude_agent/` at session end for categorization

## Does NOT go here
- The red-border UI on the overlay — lives in `src/renderer/src/overlay/`
- Categorization logic — lives in `src/main/claude_agent/`

## Wires into
- Emits distraction events to overlay via `webContents.send('activity:distraction', ...)`
- Pushes raw event log to `claude_agent/` and persisted log to `supabase/`
