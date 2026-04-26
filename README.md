# Cohort

A focus timer with a physical orb that docks your phone to lock it away. Study alongside friends in real time, track your flow score, and get called out the moment you lose focus.

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Environment Variables](#environment-variables)
  - [Installation](#installation)
  - [Running the App](#running-the-app)
- [Hardware](#hardware)
  - [Components](#components)
  - [Firmware](#firmware)
  - [MQTT Protocol](#mqtt-protocol)
  - [Wiring](#wiring)
- [Project Structure](#project-structure)
- [AI & Agent System](#ai--agent-system)
- [Local VLM Setup (Ollama)](#local-vlm-setup-ollama)

---

## Overview

Cohort is an Electron desktop app paired with a physical hardware orb. When you dock your phone on the orb, a focus session begins and a fullscreen overlay activates. Your screen is continuously classified by a local AI model — deep work, admin, or distracted — and your flow score is calculated in real time. Friends and cohort members can see each other's session status live. Voice announcements (via ElevenLabs) call you out when you lift your phone or lose focus.

---

## Features

- **Phone docking detection** — Hall effect sensor on the orb triggers session start/end over MQTT
- **Fullscreen focus overlay** — transparent always-on-top overlay that tracks your screen
- **AI screen classification** — local VLM (Ollama/Gemma) classifies every screenshot as `deep_work`, `admin`, or `distracted`
- **Flow score** — calculated from productive time, distraction count, idle time, and phone lifts
- **Live session dashboard** — elapsed time, pause budget, lift count, current workflow
- **Social / Cohorts** — see friends' live session status, send nudges, join study cohorts
- **Session history** — per-session metrics, flow score, and AI postmortem summaries
- **ElevenLabs voice announcements** — personalized voice cues for 8 session events (optional, defaults to hardware SD card audio)
- **AI insights** — Gemma-powered agent provides dashboard insights and session postmortems
- **Pause budget** — configurable pause tolerance (gentle / standard / strict) with auto-end on budget exhaustion
- **LED orb animations** — breathing, color themes, friend-color blending, distraction pulse

---

## Architecture

```
┌─────────────────────────────────────────┐
│           Electron Desktop App          │
│                                         │
│  ┌─────────────┐   ┌─────────────────┐  │
│  │ Main Window │   │ Focus Overlay   │  │
│  │ (Dashboard) │   │ (Transparent,   │  │
│  │  React/TS   │   │  Always-on-top) │  │
│  └──────┬──────┘   └────────┬────────┘  │
│         │   IPC (contextBridge)  │       │
│         └──────────┬──────────┘         │
│              Main Process               │
│         ┌──────────┴──────────┐         │
│         │   MQTT   │ Supabase │         │
│         │  Client  │  Client  │         │
│         └────┬─────┴──────────┘         │
│              │                          │
│    ┌─────────┴────────┐                 │
│    │  Python Agent    │                 │
│    │  (uagents, port  │                 │
│    │   8001)          │                 │
│    └──────────────────┘                 │
└─────────────────────────────────────────┘
         │ MQTT (HiveMQ Cloud)
         ▼
┌─────────────────┐
│   Focus Orb     │
│   (ESP32-S3)    │
│  Hall sensor    │
│  WS2812B LEDs   │
│  MQTT client    │
└─────────────────┘
```

**Data flow:**
1. Phone placed on orb → Hall effect sensor triggers → ESP32 publishes `docked` to MQTT
2. Desktop app receives MQTT message → starts session in Supabase → shows overlay
3. Overlay captures screenshots → local Ollama VLM classifies screen → metrics recorded
4. Session end → flow score calculated → saved to Supabase with metrics
5. Friends see live status via MQTT subscriptions

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop app | Electron 41, React 18, TypeScript, Vite |
| Styling | Tailwind CSS, Framer Motion |
| Backend / DB | Supabase (Postgres + Auth + Realtime) |
| Hardware comms | MQTT over HiveMQ Cloud |
| Local AI | Ollama + Gemma / Moondream (screen classification) |
| Cloud AI | Google Gemini API (fallback classifier + agent) |
| AI agent | Python uagents framework (ReAct loop) |
| Voice | ElevenLabs API (optional personalized announcements) |
| Auth | Supabase Auth (magic link + Google OAuth, custom `cohort://` protocol) |
| Proxy | Node.js Ollama proxy with Bearer auth, Cloudflare Tunnel |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.11+ (for the agent backend)
- Ollama installed locally (for screen classification)
- A Supabase project
- A HiveMQ Cloud account (or any MQTT broker)

### Environment Variables

Create a `.env` file at the project root:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# MQTT (HiveMQ Cloud)
MQTT_URL=mqtts://your-broker.hivemq.cloud:8883
MQTT_USER=your-mqtt-username
MQTT_PASS=your-mqtt-password

# AI — Gemini (optional, fallback classifier)
GEMINI_API_KEY=your-gemini-key

# Local VLM — Ollama
LOCAL_VLM_URL=http://127.0.0.1:11434/api/chat
LOCAL_VLM_MODEL=moondream

# Python agent
AGENT_PORT=8001
AGENT_BEARER=your-optional-bearer-token
AGENT_SEED_PHRASE=your-uagents-seed-phrase

# Ollama proxy (optional)
OLLAMA_PROXY_PORT=8787
OLLAMA_PROXY_BEARER=your-proxy-token
OLLAMA_BASE_URL=http://127.0.0.1:11434

# ElevenLabs (optional — configured per-user in Settings)
# API key and voice ID are stored in userData, not here
```

### Installation

```bash
# Install Node dependencies
npm install

# Install Python dependencies
cd uagents_core
pip install -r requirements.txt
cd ..
```

### Running the App

```bash
# Start in development mode (hot reload)
npm run dev

# Start the Python agent (separate terminal)
cd uagents_core
python main.py

# Start the Ollama proxy (optional, separate terminal)
npm run ollama:proxy

# Build for production
npm run build
```

---

## Hardware

### Components

| Component | Part | Notes |
|---|---|---|
| Microcontroller | ESP32-S3 Dev Module | Wi-Fi + BLE, flashed via Arduino IDE |
| LED ring | WS2812B addressable LEDs | Driven via Adafruit NeoPixel or FastLED |
| Dock sensor | Hall effect sensor | Detects phone placement via magnet |
| Audio | SD card module + speaker | Plays pre-recorded .wav/.mp3 announcements |
| Power | | |
| Enclosure | | |
| Phone magnet | | Small magnet embedded in phone case or MagSafe disc |

### Firmware

The firmware lives in `hardware/` (Arduino sketch). It is not yet committed — see `hardware/README.md` for the planned structure.

**Responsibilities:**
- Connect to Wi-Fi (credentials hardcoded for dev or provisioned over BLE)
- Connect to HiveMQ MQTT broker
- Read Hall effect sensor → publish `docked` / `undocked` / `redocked` / `offline` to MQTT
- Subscribe to command topic for LED control from desktop
- Drive WS2812B LED animations (idle breathing, docked pulse, friend-color blend, distraction flash)
- Play audio from SD card on session events
- Pairing handshake with desktop app

**Tooling:**
- Flash via Arduino IDE (board: ESP32-S3 Dev Module) or `arduino-cli`
- Required libraries: `WiFi`, `PubSubClient`, `Adafruit_NeoPixel` (or FastLED)

### MQTT Protocol

All messages are JSON published to `focus-orb/{userId}/state`.

**Orb → Desktop (state messages):**

```json
{ "status": "docked", "workflowGroup": "Deep Work", "plannedDurationMinutes": 50, "sessionStartedAt": "2025-01-01T10:00:00Z" }
{ "status": "undocked", "pauseStart": 1700000000000 }
{ "status": "redocked", "totalPauseMs": 12000 }
{ "status": "offline" }
```

**Desktop → Orb (command messages)** on `focus-orb/{userId}/command`:

```json
{ "brightness": 72 }
{ "breathSpeed": 45 }
{ "color": "#E8A87C" }
```

**Broker:** HiveMQ Cloud (`mqtts://`, port 8883)

### Wiring

|  |  |
|---|---|
| Hall effect sensor data pin | |
| Hall effect sensor VCC | 3.3V |
| Hall effect sensor GND | GND |
| WS2812B data pin | |
| WS2812B VCC | 5V |
| WS2812B GND | GND |
| SD card module (SPI) | |
| Speaker | |

---

## Project Structure

```
cohort-desktop/
├── src/
│   ├── main/                   # Electron main process
│   │   ├── index.ts            # Entry point, window management, deep links
│   │   ├── ipc/
│   │   │   ├── channels.ts     # IPC channel name constants
│   │   │   └── index.ts        # All ipcMain.handle registrations
│   │   ├── mqtt/
│   │   │   └── index.ts        # MQTT client, orb state machine
│   │   ├── supabase/
│   │   │   └── index.ts        # All Supabase queries
│   │   ├── elevenlabs/
│   │   │   └── index.ts        # Voice announcements module
│   │   ├── agent/
│   │   │   ├── index.ts        # Local HTTP server bridging to Python agent
│   │   │   ├── runtime.ts      # Gemini-based ReAct runtime
│   │   │   ├── tools.ts        # Agent tool definitions (Supabase queries)
│   │   │   └── gemma.ts        # Gemma model integration
│   │   ├── session_metrics.ts  # In-session metrics tracking + flow score
│   │   └── windows/
│   │       └── main_window.ts  # BrowserWindow factory
│   ├── preload/
│   │   └── index.ts            # contextBridge API surface
│   └── renderer/
│       └── src/
│           ├── App.tsx          # Root: auth gate, dashboard shell
│           ├── home_page/       # Dashboard view
│           ├── history_page/    # Session history
│           ├── friends_page/    # Friends + cohorts
│           ├── settings_page/   # Settings (orb, voice, account)
│           ├── onboarding/      # Auth + onboarding flow
│           ├── lib/             # Supabase auth helpers
│           ├── state/           # localStorage onboarding state
│           └── shared_ui/       # Sidebar, header, telemetry panel, etc.
├── overlay_standalone/
│   ├── main.cjs                # Overlay Electron main process
│   ├── preload.cjs             # Overlay preload
│   └── index.html              # Overlay React app entry
├── uagents_core/               # Python agent backend
│   ├── main.py                 # uagents entry point
│   ├── requirements.txt
│   └── agent/                  # ReAct loop, Supabase tools, REST handlers
├── hardware/                   # ESP32 firmware (planned)
├── scripts/
│   └── ollama_proxy.mjs        # Bearer-auth proxy for Ollama
├── resources/
│   └── icon.ico                # App taskbar icon
├── electron.vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## AI & Agent System

Cohort uses a two-layer AI system:

**1. Screen classifier (local, real-time)**
- Runs Ollama locally with `moondream` (default) or any vision model
- Screenshots taken during active sessions → classified as `deep_work`, `admin`, or `distracted`
- Results feed into session metrics and flow score
- Gemini API available as a cloud fallback

**2. Insight agent (Python + uagents)**
- ReAct loop powered by Gemma via vLLM or Ollama
- Tools: Supabase queries for session history, profiles, cohort data
- Handles three intents:
  - `dashboard_insight` — live motivational insight shown on the dashboard
  - `session_postmortem` — end-of-session breakdown
  - `chat` — freeform conversation
- Exposed as a local HTTP server on port 8001
- Also registers with Fetch.ai Agentverse for external integrations

**Flow score formula:**
```
score = (productive%) × 100
      - (distracted%) × 45
      - (idle%) × 30
      - min(phone_lifts × 3, 20)
```
Clamped to 0–100.

---

## Local VLM Setup (Ollama)

```bash
# Install Ollama (ollama.com)
# Pull a vision model
ollama pull moondream

# Verify it's running
curl http://127.0.0.1:11434/v1/models

# (Optional) Run the authenticated proxy
npm run ollama:proxy

# (Optional) Expose publicly via Cloudflare tunnel
# See OLLAMA_CLOUDFLARE_TUNNEL_STEPS.txt for full instructions
npm run ollama:tunnel
```

The public tunnel endpoint (used by teammates without local Ollama) is configured in `.env` as `LOCAL_VLM_URL`.
