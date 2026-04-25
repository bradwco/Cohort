# hardware_pairing/

Desktop-side logic for pairing the app with an ESP32 Focus Orb.

## Goes here
- Discovery (Wi-Fi mDNS scan or BLE advert listening)
- Pairing handshake with the orb (challenge/response, token exchange)
- Persist paired-orb metadata (orb ID, MQTT topic, friendly name) — to disk + Supabase
- Re-pair / forget-orb logic
- ipcMain handlers exposed to the renderer's `pairing/` UI
- Emit pairing-state events back to renderer

## Does NOT go here
- The pairing UI — that lives in `src/renderer/src/pairing/`
- Firmware code — that lives in the root `hardware/` folder
- MQTT message routing — that lives in `src/main/mqtt/`

## Wires into
- Reads from / writes to Supabase via `src/main/supabase/`
- After successful pair, tells `src/main/mqtt/` which topics to subscribe to
