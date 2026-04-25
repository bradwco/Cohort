# home_page/

The default screen of the desktop app — what you see when no focus session is running.

## Goes here
- Top-level home layout (header, content grid, "Start session" CTA)
- **Calendar streak tracker** — day-by-day grid of past sessions
- **Friends sidebar slot** — composes the panel from `friends/`
- **History dashboard summary** — preview graphs + link to `history_page/`
- Quick-access entry points to settings and pairing
- Anything that ONLY appears on the home screen

## Does NOT go here
- The friends list itself (that lives in `friends/`)
- Detailed history graphs (those live in `history_page/`)
- Settings forms (those live in `settings_page/`)
- The animated orb (that lives in `orb_character/`)

## Wires into
- Reads session history via IPC → `src/main/supabase/`
- Reads friend presence via IPC → `src/main/mqtt/`
