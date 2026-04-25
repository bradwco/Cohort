# settings_page/

The settings view — account, preferences, advanced config.

## Goes here
- Account info (Supabase user, sign out)
- **Hardware pairing entry point** (links to `pairing/`)
- Theme / appearance toggles
- Notification preferences
- Activity-tracking preferences (which apps to track / ignore)
- MQTT broker config (advanced)
- About / version info

## Does NOT go here
- The pairing flow itself (that lives in `pairing/`)
- Auth network calls (those live in `src/main/supabase/`)

## Wires into
- Updates user profile via IPC → `src/main/supabase/`
- Triggers pair-mode via IPC → `src/main/hardware_pairing/`
