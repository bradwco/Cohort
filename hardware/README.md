# hardware/

The ESP32 firmware for the Focus Orb lamp itself. Arduino sketch lives here.

## Goes here
- `focus_orb/focus_orb.ino` — main sketch
- **WS2812B addressable LED ring** driver code (Adafruit NeoPixel or FastLED)
- **Hall effect sensor** reader — detects when the phone is docked
- **Wi-Fi connect** logic (credentials over BLE provisioning or hardcoded for dev)
- **MQTT client** — publish orb state, subscribe to friend topics
- **Pairing handshake** with the desktop app (challenge/response over BLE or Wi-Fi)
- LED animation routines (idle, dock-detected, friend-color blend, distraction pulse)
- `pinmap.md` or comments documenting wiring (which GPIO → LED data, → Hall, → button)
- `lib/` — vendored Arduino libs if needed

## Does NOT go here
- Desktop pairing code — lives in `src/main/hardware_pairing/`
- MQTT broker config — lives on HiveMQ Cloud (.env on desktop, hardcoded on firmware for now)

## Tooling
- Flash via Arduino IDE (board: ESP32-S3 Dev Module) or `arduino-cli`
- Required libraries: `WiFi`, `PubSubClient` (MQTT), `Adafruit_NeoPixel` (or FastLED)

## Wires into
- Talks to the same MQTT broker (HiveMQ) as `src/main/mqtt/`
- Topic conventions match `src/main/mqtt/README.md`
