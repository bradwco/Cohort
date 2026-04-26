# hardware/

ESP32 firmware for the Cohort focus orb.

## PlatformIO firmware

The active firmware lives in `hardware/platformio`.

1. Install PlatformIO.
2. Copy `hardware/platformio/include/secrets.example.h` to `hardware/platformio/include/secrets.h`.
3. Leave `COHORT_USE_WIFI_MQTT` as `0` for USB serial mode.
4. From `hardware/platformio`, run:

```sh
pio run -t upload
pio device monitor
```

## Tap behavior

In the default USB serial mode, the ESP32 prints hardware events to the serial port and the Electron app reads them directly. Wi-Fi SSID/password are not needed while the board is physically plugged into the PC.

The ESP32 does not need a Supabase user id in USB serial mode. When you run `npm run dev` and sign in, the Electron app uses the current logged-in user id for every hardware event received from the board.

Sensor behavior:

- active from offline -> emits `{"status":"docked","origin":"orb"}` and starts the overlay/session flow
- inactive while running -> emits `{"status":"undocked","origin":"orb"}` and pauses/closes the overlay
- active while paused -> waits 2 seconds for a possible second active, then emits `{"status":"redocked","origin":"orb"}` and resumes the overlay/session flow

Second sensor edge while paused/idle:

- after the first sensor edge starts the 2-second pending window, any next sensor edge emits `{"event":"end_session","status":"offline","origin":"orb"}` and the desktop closes the active Supabase session

## Live color sync

When the desktop serial bridge connects, it reads the currently logged-in profile's `orb_color` and sends it to the ESP32 as:

```text
C<RRGGBB>
```

The firmware uses that color for the working/overlay breathing state, so cohort/member color changes can be reflected live without reflashing.

The desktop can also force state corrections over serial:

- `W` - working color breathing
- `P` - paused blue
- `O` - off

## Animation and audio map

- Working / overlay running: profile-color breathing, DFPlayer track `001.mp3`
- Paused / dashboard: solid blue, DFPlayer track `002.mp3`
- End session: current-state color hold, then fade out, DFPlayer track `003.mp3`
- Distracted start: red breathing, DFPlayer track `004.mp3`
- Idle start: blue breathing, DFPlayer track `005.mp3`
- Cohort member joined: two green pulses, DFPlayer track `006.mp3`
- Cohort member left: two red pulses, DFPlayer track `007.mp3`

The code uses the `DFRobotDFPlayerMini` library with the DFRobot DFPlayer Mini module. Put the files on the SD card using DFPlayer's standard numeric naming, for example `001.mp3` through `007.mp3`.

## Orb State Reference

| Orb state | Color / animation | What causes it |
| --- | --- | --- |
| Off | LEDs off | App/session offline, desktop sends `O`, end-session fade completes |
| Working | Logged-in profile color, dramatic breathing | Sensor active from off, redock/resume, desktop sends `W` |
| Paused / dashboard | Solid blue | Sensor inactive while working, overlay pause/stop, desktop sends `P` |
| Pending paused action | Solid blue remains | First sensor edge while paused; firmware waits 2 seconds for a possible second edge |
| End session | Current state color hold, then fade to off | Second sensor edge during pending paused window, or `end_session` event |
| Idle | Blue breathing | Overlay marks focus state `idle`, desktop sends serial `5` |
| Idle end | Returns to previous state | Overlay exits idle, desktop sends serial `7` |
| Distracted | Red breathing | Overlay classifies screen as distracted, desktop sends serial `2` |
| Distracted end | Returns to previous/productive state | Overlay recovers to productive, desktop sends serial `3` |
| Cohort joined | Two green pulses, then previous state | Desktop/serial command `1` |
| Cohort left | Two red pulses, then previous state | Desktop/serial command `8` |

If you later want untethered Wi-Fi mode, set `COHORT_USE_WIFI_MQTT` to `1` and fill in Wi-Fi/MQTT values. The ESP32 will publish to `focus-orb/<COHORT_USER_ID>/state`.

## Desktop serial bridge

The Electron app auto-connects to a likely ESP32 serial port after login. The serial bridge receives the current logged-in `userId` from the renderer and passes ESP32 tap events into the same desktop session flow as the hardware simulator. You can force a port in `.env`:

```env
HARDWARE_TRANSPORT=serial
HARDWARE_SERIAL_PORT=COM5
HARDWARE_SERIAL_BAUD=9600
```

When the overlay marks focus state, the desktop sends serial commands back to the ESP32:

- distracted -> `2`
- distracted ended -> `3`
- idle -> `5`
- idle ended -> `7`

## Serial inputs

Send these single-character commands through the serial monitor:

- `1` - Cohort member joined
- `8` - Cohort member left
- `2` - Distracted start
- `3` - Distracted end
- `5` - Idle start
- `7` - Idle end

The firmware echoes each command as `SERIAL:<EVENT_NAME>` and also prints state changes such as `STATUS:WORKING`, `STATUS:PAUSED`, `STATUS:IDLE`, and `STATUS:DISTRACTED`.

## Default pin map

- `GPIO 9` - capacitive sensor input, active-high by default
- `GPIO 5` - WS2812B / NeoPixel data
- `D11` - DFPlayer RX
- `D12` - DFPlayer TX

Adjust these constants at the top of `src/main.cpp` if your wiring differs.

## Notes

The firmware intentionally does not write to Supabase directly. In USB mode it sends hardware intent over Serial; in Wi-Fi mode it sends hardware intent over MQTT. The Electron main process remains responsible for Supabase updates, overlay open/close behavior, pause accounting, and session finalization.
