# pairing/

The hardware-pairing UI flow — UI ONLY. Connection logic lives in `src/main/hardware_pairing/`.

## Goes here
- "Scan for nearby orbs" screen
- Pairing-mode prompt (instructs user to put orb in pairing mode)
- Connection status indicator (idle / scanning / connecting / paired / error)
- Pair / unpair / re-pair buttons
- Currently-paired-orb summary card (shown on settings page)

## Does NOT go here
- BLE / Wi-Fi handshake code (lives in `src/main/hardware_pairing/`)
- Token storage (lives in `src/main/hardware_pairing/`)

## Wires into
- All actions go through IPC → `src/main/hardware_pairing/`
- Subscribes to pairing-state events via IPC events
