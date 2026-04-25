# history_page/

The deep-dive history view — full graphs, AI insights, workflow categorization.

## Goes here
- Per-session timeline graphs (time spent per app/group)
- Aggregate graphs (week, month, streaks)
- **AI agent insights** ("you spent 2.3h coding, 40 min on Twitter")
- **Workflow categorization** display (groups like "coding", "job apps")
- Filter controls (date range, group, friend)
- Session detail drill-down
- Export / share

## Does NOT go here
- The summary preview shown on home (that lives in `home_page/`)
- Claude API calls (lives in `src/main/claude_agent/`)

## Wires into
- Reads session log via IPC ← `src/main/supabase/`
- Requests AI summaries via IPC → `src/main/claude_agent/`
