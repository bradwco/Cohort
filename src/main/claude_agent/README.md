# claude_agent/

THIS IS WRONG RIGHT NOT THIS IS SUPPOSED TO BE A AGENTVERSE -> GEMMA & VULTR GPU AGENT

Claude API integration — categorization, summaries, and the overlay's "summarize/help" feature.

## Goes here
- Anthropic SDK client init (API key from `.env`)
- **Categorize-activity** function — takes the activity event log, groups events into workflows ("coding", "job apps", "social media", ...) using tool use
- **Session summary** function — generate the post-session writeup ("you spent 2.3h coding, got pulled into Twitter for 40 min")
- **Summarize-help** function — handler for overlay's Cluely-style button: take a screenshot, prompt Claude with the user's current work, return contextual help
- **Insights** function — periodic pattern detection over historical sessions
- Prompt templates for each function

## Does NOT go here
- The button UI — lives in `src/renderer/src/overlay/`
- The activity log itself — lives in `src/main/activity_tracking/`

## Wires into
- Consumes event logs from `src/main/activity_tracking/`
- Persists categorizations + summaries via `src/main/supabase/`
- Returns results via IPC handlers (called from `overlay/`, `home_page/`, `history_page/`)
