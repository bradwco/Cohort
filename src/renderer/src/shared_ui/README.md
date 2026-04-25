# shared_ui/

Reusable UI primitives shared across every page. The "design system" layer.

## Goes here
- **shadcn/ui components** — Button, Card, Dialog, Input, etc. (when you `npx shadcn add`, point output here)
- App-wide layout pieces — titlebar, modal shell, toast container
- Generic hooks not tied to a specific feature (e.g. `useDebounce`, `useKeyPress`)
- The `cn()` utility / Tailwind helpers (if Tailwind is added later)

## Does NOT go here
- Feature-specific components — those live in their feature folder (e.g. `friends/FriendCard.tsx`, not here)
- The animated orb (lives in `orb_character/`)

## Convention
- shadcn primitives go in `shared_ui/ui/` to match shadcn's expected layout
- Composite components built FROM shadcn primitives can sit at `shared_ui/` root
