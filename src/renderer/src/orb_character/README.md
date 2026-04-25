# orb_character/

The animated orb character — Framer Motion (`motion`) component used across views.

## Goes here
- The `OrbCharacter` component itself
- Animation states: `idle`, `focus`, `distraction`, `friend-presence`
- Color theming (passes through orb's current color)
- Props for size, glow intensity, ring count
- Sub-components for the orb's parts if it gets complex (eye, glow, ring)

## Does NOT go here
- Page-specific layout code (use the orb FROM home_page/, overlay/, etc.)
- State management for sessions (lives in feature folders)

## Used by
- `overlay/` — primary use, large animated orb during sessions
- `home_page/` — small preview / status indicator
- `friends/` — tiny version inside friend cards (their orb color)
