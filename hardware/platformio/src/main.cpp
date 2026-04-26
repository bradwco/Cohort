#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <DFRobotDFPlayerMini.h>
#include <Adafruit_NeoPixel.h>

#if __has_include("secrets.h")
#include "secrets.h"
#else
#error "Copy include/secrets.example.h to include/secrets.h and fill in Wi-Fi, MQTT, and COHORT_USER_ID."
#endif

#ifndef COHORT_USE_WIFI_MQTT
#define COHORT_USE_WIFI_MQTT 0
#endif

#ifndef COHORT_WORKFLOW_GROUP
#define COHORT_WORKFLOW_GROUP "Focus Session"
#endif

#ifndef D2
#define D2 2
#endif
#ifndef D11
#define D11 11
#endif
#ifndef D12
#define D12 12
#endif

// ---------------- DFPLAYER ----------------
static const uint8_t PIN_MP3_TX = D12;
static const uint8_t PIN_MP3_RX = D11;

HardwareSerial dfSerial(1);
DFRobotDFPlayerMini player;
bool dfReady = false;

constexpr uint8_t AUDIO_WORKING = 1;
constexpr uint8_t AUDIO_PAUSED = 2;
constexpr uint8_t AUDIO_SHUTDOWN = 3;
constexpr uint8_t AUDIO_DISTRACTED = 4;
constexpr uint8_t AUDIO_IDLE = 5;
constexpr uint8_t AUDIO_COHORT_JOINED = 6;
constexpr uint8_t AUDIO_COHORT_LEFT = 7;

// ---------------- PINS ----------------
const uint8_t buttonPins[] = { D2 };
const uint8_t buttonPinCount = sizeof(buttonPins) / sizeof(buttonPins[0]);
#define LED_PIN 9
#define NUM_LEDS 24

Adafruit_NeoPixel strip(NUM_LEDS, LED_PIN, NEO_GRB + NEO_KHZ800);

// ---------------- MQTT ----------------
WiFiClientSecure wifiClient;
PubSubClient mqtt(wifiClient);

const unsigned long mqttRetryMs = 3000;
unsigned long lastMqttAttempt = 0;

// ---------------- COLORS ----------------
uint8_t workingR = 255;
uint8_t workingG = 140;
uint8_t workingB = 40;

// ---------------- MODES ----------------
enum LedMode {
  OFF_STATE,
  WARM_BREATHING,   // working/running
  SOLID_BLUE,       // paused/lifted
  GREEN_PULSE,
  SHUTDOWN_PLAYING,
  SHUTDOWN_FADE,
  RED_BREATHING,
  IDLE_BLUE,
  RED_PULSE
};

LedMode ledMode = OFF_STATE;
LedMode previousMode = OFF_STATE;
LedMode lastReportedMode = OFF_STATE;

// ---------------- FLAGS ----------------
bool idleAudioPlayed = false;
bool idleActive = false;

// ---------------- WARM BREATHING ----------------
float warmPhase = 0.0;
float warmSpeed = 0.0016;

// ---------------- IDLE BREATHING ----------------
float idlePhase = 0.0;
float idleSpeed = 0.002;

// ---------------- RED BREATHING ----------------
int redBrightness = 0;
int redFade = 3;

// ---------------- RED PULSE ----------------
int redPulseCount = 0;
int redPulseBrightness = 0;
bool redPulseUp = true;

// ---------------- TIMING ----------------
unsigned long lastUpdate = 0;

// ---------------- WHITE PULSE ----------------
int pulseCount = 0;
int pulseBrightness = 0;
bool pulseUp = true;

// ---------------- SHUTDOWN ----------------
int shutdownBrightness = 255;
uint8_t shutdownR = 0;
uint8_t shutdownG = 0;
uint8_t shutdownB = 0;
unsigned long shutdownStartedAt = 0;
unsigned long shutdownFadeStartedAt = 0;
const unsigned long shutdownHoldMs = 180;
const unsigned long shutdownFadeDurationMs = 900;
const unsigned long shutdownAudioTimeoutMs = 3500;

// ---------------- TOUCH SENSOR ----------------
const bool sensorActiveState = HIGH;
bool lastButtonState[buttonPinCount];
unsigned long lastChangeTime[buttonPinCount] = { 0 };
const int debounceMs = 50;
unsigned long lastToggleTime = 0;
const int doubleTapWindow = 400;
const int idleDecisionWindowMs = 2000;
unsigned long lastHeartbeat = 0;
bool pendingIdleActive = false;
unsigned long pendingIdleActiveAt = 0;
bool colorCommandActive = false;
char colorBuffer[7] = { 0 };
uint8_t colorBufferIndex = 0;

void handleSerial();
void handleButton();
void handlePendingIdleActive();
void handleDFPlayer();
void handleLights();
void handleWarm();
void handleIdle();
void handleRed();
void handlePulse();
void handleRedPulse();
void handleShutdownFade();
void setAllColor(uint8_t r, uint8_t g, uint8_t b);
void captureCurrentLedColor(uint8_t& r, uint8_t& g, uint8_t& b);
void startShutdownFade();
void playAudio(uint8_t track);
void forceOff();
void forcePaused(bool playSound);
void forceWorking(bool playSound);
bool handleColorCommandChar(char c);
void applyWorkingColorHex(const char* hex);
int hexValue(char c);

String stateTopic() {
#if COHORT_USE_WIFI_MQTT
  return String("focus-orb/") + COHORT_USER_ID + "/state";
#else
  return String();
#endif
}

void publishState(const char* json) {
#if COHORT_USE_WIFI_MQTT
  if (!mqtt.connected()) {
    Serial.print("MQTT:SKIP ");
    Serial.println(json);
    return;
  }

  mqtt.publish(stateTopic().c_str(), json, true);
  Serial.print("MQTT:PUBLISH ");
  Serial.println(json);
#else
  Serial.print("SERIAL:EVENT ");
  Serial.println(json);
#endif
}

void printStatus(const char* status) {
  Serial.print("STATUS:");
  Serial.println(status);
}

const char* modeName(LedMode mode) {
  switch (mode) {
    case OFF_STATE: return "OFF";
    case WARM_BREATHING: return "WORKING";
    case SOLID_BLUE: return "PAUSED";
    case GREEN_PULSE: return "COHORT_JOINED";
    case SHUTDOWN_PLAYING:
    case SHUTDOWN_FADE: return "ENDING";
    case RED_BREATHING: return "DISTRACTED";
    case IDLE_BLUE: return "IDLE";
    case RED_PULSE: return "COHORT_LEFT";
  }
  return "UNKNOWN";
}

void reportModeIfNeeded() {
  if (ledMode == lastReportedMode) return;
  lastReportedMode = ledMode;

  if (ledMode == WARM_BREATHING) printStatus("WORKING");
  else if (ledMode == SOLID_BLUE) printStatus("PAUSED");
  else if (ledMode == OFF_STATE) printStatus("OFF");
  else if (ledMode == IDLE_BLUE) printStatus("IDLE");
  else if (ledMode == RED_BREATHING) printStatus("DISTRACTED");
  else if (ledMode == SHUTDOWN_PLAYING || ledMode == SHUTDOWN_FADE) printStatus("ENDING");
}

void connectWifi() {
#if COHORT_USE_WIFI_MQTT
  if (WiFi.status() == WL_CONNECTED) return;

  Serial.print("WIFI:CONNECTING ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    delay(250);
    Serial.print(".");
  }

  Serial.println();
  Serial.print("WIFI:CONNECTED ");
  Serial.println(WiFi.localIP());
#endif
}

void connectMqtt() {
#if COHORT_USE_WIFI_MQTT
  if (mqtt.connected()) return;

  const unsigned long now = millis();
  if (now - lastMqttAttempt < mqttRetryMs) return;
  lastMqttAttempt = now;

  const String clientId = String("cohort-orb-") + COHORT_USER_ID;
  Serial.print("MQTT:CONNECTING ");
  Serial.println(MQTT_HOST);

  if (mqtt.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD)) {
    Serial.println("MQTT:CONNECTED");
  } else {
    Serial.print("MQTT:FAILED rc=");
    Serial.println(mqtt.state());
  }
#endif
}

void enterWorking(bool publish) {
  forceWorking(true);
  if (publish) publishState("{\"status\":\"docked\",\"origin\":\"orb\",\"workflowGroup\":\"" COHORT_WORKFLOW_GROUP "\"}");
  printStatus("WORKING");
}

void enterPaused(bool publish) {
  forcePaused(true);
  if (publish) publishState("{\"status\":\"undocked\",\"origin\":\"orb\"}");
  printStatus("PAUSED");
}

void resumeWorking(bool publish) {
  forceWorking(true);
  if (publish) publishState("{\"status\":\"redocked\",\"origin\":\"orb\"}");
  printStatus("WORKING");
}

void beginShutdown() {
  captureCurrentLedColor(shutdownR, shutdownG, shutdownB);
  if (shutdownR == 0 && shutdownG == 0 && shutdownB == 0) {
    if (ledMode == SOLID_BLUE) {
      shutdownB = 255;
    } else {
      shutdownR = workingR;
      shutdownG = workingG;
      shutdownB = workingB;
    }
  }

  shutdownStartedAt = millis();
  ledMode = SHUTDOWN_PLAYING;
  idleActive = false;
  idleAudioPlayed = false;

  if (dfReady) playAudio(AUDIO_SHUTDOWN);
  else startShutdownFade();

  publishState("{\"event\":\"end_session\",\"status\":\"offline\",\"origin\":\"orb\"}");
  printStatus("ENDING");
}

// ---------------- SETUP ----------------
void setup() {
  Serial.begin(9600);
  delay(250);
  Serial.println("BOOT:COHORT_ORB");
  dfSerial.begin(9600, SERIAL_8N1, PIN_MP3_RX, PIN_MP3_TX);

  for (uint8_t i = 0; i < buttonPinCount; i++) {
    pinMode(buttonPins[i], INPUT_PULLUP);
  }

  strip.begin();
  strip.clear();
  strip.show();

  delay(1500);

  for (int i = 0; i < 5; i++) {
    if (player.begin(dfSerial)) {
      dfReady = true;
      break;
    }
    delay(500);
  }

  if (dfReady) player.volume(30);
  Serial.print("DFPLAYER:");
  Serial.println(dfReady ? "READY" : "MISSING");

#if COHORT_USE_WIFI_MQTT
  wifiClient.setInsecure();
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  connectWifi();
  connectMqtt();
#else
  Serial.println("TRANSPORT:USB_SERIAL");
#endif

  Serial.print("BUTTON:PINS ");
  for (uint8_t i = 0; i < buttonPinCount; i++) {
    lastButtonState[i] = digitalRead(buttonPins[i]);
    Serial.print(buttonPins[i]);
    if (i + 1 < buttonPinCount) Serial.print(",");
  }
  Serial.println();

  printStatus("OFF");
}

// ---------------- LOOP ----------------
void loop() {
#if COHORT_USE_WIFI_MQTT
  connectWifi();
  connectMqtt();
  mqtt.loop();
#endif

  handleSerial();
  handleButton();
  handlePendingIdleActive();
  handleDFPlayer();
  handleLights();
  reportModeIfNeeded();

  if (millis() - lastHeartbeat > 2000) {
    lastHeartbeat = millis();
    Serial.print("HEARTBEAT:");
    Serial.println(modeName(ledMode));
  }
}

// ---------------- SERIAL ----------------
void handleSerial() {
  while (Serial.available()) {
    char c = Serial.read();

    if (colorCommandActive || c == 'C') {
      if (handleColorCommandChar(c)) continue;
    }

    if (c == 'O') {
      Serial.println("SERIAL:STATE_OFF");
      forceOff();
    }

    else if (c == 'P') {
      Serial.println("SERIAL:STATE_PAUSED");
      forcePaused(false);
    }

    else if (c == 'W') {
      Serial.println("SERIAL:STATE_WORKING");
      forceWorking(false);
    }

    else if (c == '1') {
      Serial.println("SERIAL:COHORT_MEMBER_JOINED");
      previousMode = ledMode;
      ledMode = GREEN_PULSE;

      pulseCount = 0;
      pulseBrightness = 0;
      pulseUp = true;

      idleActive = false;
      idleAudioPlayed = false;

      playAudio(AUDIO_COHORT_JOINED);
    }

    else if (c == '2') {
      Serial.println("SERIAL:DISTRACTED_START");
      previousMode = ledMode;
      ledMode = RED_BREATHING;

      redBrightness = 0;

      idleActive = false;
      idleAudioPlayed = false;

      playAudio(AUDIO_DISTRACTED);
    }

    else if (c == '3') {
      Serial.println("SERIAL:DISTRACTED_END");
      ledMode = previousMode;
    }

    else if (c == '5') {
      Serial.println("SERIAL:IDLE_START");
      previousMode = ledMode;
      ledMode = IDLE_BLUE;

      idlePhase = 0;
      idleActive = true;
      idleAudioPlayed = false;
    }

    else if (c == '7') {
      Serial.println("SERIAL:IDLE_END");
      idleActive = false;
      idleAudioPlayed = false;
      ledMode = previousMode;

      strip.show();
    }

    else if (c == '8') {
      Serial.println("SERIAL:COHORT_MEMBER_LEFT");
      previousMode = ledMode;
      ledMode = RED_PULSE;

      redPulseCount = 0;
      redPulseBrightness = 0;
      redPulseUp = true;

      idleActive = false;
      idleAudioPlayed = false;

      playAudio(AUDIO_COHORT_LEFT);
    }
  }
}

// ---------------- TOUCH SENSOR ----------------
void handleButton() {
  for (uint8_t i = 0; i < buttonPinCount; i++) {
    bool currentState = digitalRead(buttonPins[i]);

    if (currentState != lastButtonState[i] &&
        millis() - lastChangeTime[i] > debounceMs) {

      lastChangeTime[i] = millis();
      lastButtonState[i] = currentState;

      Serial.print("SENSOR:");
      Serial.print(currentState == sensorActiveState ? "ACTIVE" : "INACTIVE");
      Serial.print(" pin=");
      Serial.println(buttonPins[i]);

      unsigned long now = millis();
      const bool isActive = currentState == sensorActiveState;

      if (ledMode == SOLID_BLUE) {
        if (pendingIdleActive && now - pendingIdleActiveAt < idleDecisionWindowMs) {
          pendingIdleActive = false;
          beginShutdown();
          return;
        }

        pendingIdleActive = true;
        pendingIdleActiveAt = now;
        Serial.println("SENSOR:PENDING_IDLE_EDGE");
        return;
      }

      if (isActive) {
        if (ledMode == OFF_STATE || ledMode == SHUTDOWN_FADE) {
          pendingIdleActive = false;
          enterWorking(true);
        }
      } else if (ledMode == WARM_BREATHING) {
        pendingIdleActive = false;
        enterPaused(true);
      }
    }
  }
}

void handlePendingIdleActive() {
  if (!pendingIdleActive) return;
  if (ledMode != SOLID_BLUE) {
    pendingIdleActive = false;
    return;
  }

  if (millis() - pendingIdleActiveAt >= idleDecisionWindowMs) {
    pendingIdleActive = false;
    resumeWorking(true);
  }
}

// ---------------- DFPLAYER ----------------
void handleDFPlayer() {
  if (ledMode == SHUTDOWN_PLAYING && millis() - shutdownStartedAt > shutdownHoldMs) {
    startShutdownFade();
    return;
  }

  if (ledMode == SHUTDOWN_PLAYING && millis() - shutdownStartedAt > shutdownAudioTimeoutMs) {
    startShutdownFade();
    return;
  }

  if (!dfReady) return;

  if (player.available()) {
    uint8_t type = player.readType();

    if (type == DFPlayerPlayFinished &&
        ledMode == SHUTDOWN_PLAYING) {

      startShutdownFade();
    }
  }
}

// ---------------- LIGHTS ----------------
void handleLights() {
  switch (ledMode) {

    case OFF_STATE:
      strip.clear();
      strip.show();
      break;

    case WARM_BREATHING:
      handleWarm();
      break;

    case SOLID_BLUE:
      setAllColor(0, 0, 255);
      break;

    case GREEN_PULSE:
      handlePulse();
      break;

    case RED_BREATHING:
      handleRed();
      break;

    case IDLE_BLUE:
      handleIdle();
      break;

    case RED_PULSE:
      handleRedPulse();
      break;

    case SHUTDOWN_PLAYING:
      setAllColor(shutdownR, shutdownG, shutdownB);
      break;

    case SHUTDOWN_FADE:
      handleShutdownFade();
      break;
  }
}

// ---------------- WARM (working) ----------------
void handleWarm() {
  warmPhase += warmSpeed;
  if (warmPhase > 6.28318) warmPhase = 0;

  float wave = (sin(warmPhase) + 1.0) * 0.5;
  float shaped = wave * wave * (3.0 - 2.0 * wave);
  float baseScale = 0.12 + shaped * 0.88;

  for (int i = 0; i < NUM_LEDS; i++) {
    float shimmer = (sin(warmPhase * 1.8 + i * 0.72) + 1.0) * 0.5;
    float scale = baseScale * (0.84 + shimmer * 0.16);
    strip.setPixelColor(
      i,
      strip.Color(
        (uint8_t)(workingR * scale),
        (uint8_t)(workingG * scale),
        (uint8_t)(workingB * scale)
      )
    );
  }
  strip.show();
}

// ---------------- IDLE ----------------
void handleIdle() {
  if (!idleActive) return;

  if (!idleAudioPlayed) {
    playAudio(AUDIO_IDLE);
    idleAudioPlayed = true;
  }

  idlePhase += idleSpeed;
  if (idlePhase > 6.28318) idlePhase = 0;

  float wave = (sin(idlePhase) + 1.0) * 0.5;

  setAllColor(
    (uint8_t)(40 + wave * 60),
    (uint8_t)(90 + wave * 90),
    (uint8_t)(180 + wave * 60)
  );
}

// ---------------- RED BREATHING (Distracted) ----------------
void handleRed() {
  if (millis() - lastUpdate < 20) return;
  lastUpdate = millis();

  redBrightness += redFade;

  if (redBrightness <= 0 || redBrightness >= 255)
    redFade = -redFade;

  setAllColor(redBrightness, 0, 0);
}

// ---------------- COHORT JOINED ----------------
void handlePulse() {
  if (millis() - lastUpdate < 20) return;
  lastUpdate = millis();

  if (pulseUp) {
    pulseBrightness += 8;
    if (pulseBrightness >= 255) pulseUp = false;
  } else {
    pulseBrightness -= 8;

    if (pulseBrightness <= 0) {
      pulseBrightness = 0;
      pulseUp = true;
      pulseCount++;

      if (pulseCount >= 2) {
        ledMode = previousMode;
        return;
      }
    }
  }

  setAllColor(0, pulseBrightness, 0);
}

// ---------------- COHORT LEFT  ----------------
void handleRedPulse() {
  if (millis() - lastUpdate < 20) return;
  lastUpdate = millis();

  if (redPulseUp) {
    redPulseBrightness += 10;
    if (redPulseBrightness >= 255) redPulseUp = false;
  } else {
    redPulseBrightness -= 10;

    if (redPulseBrightness <= 0) {
      redPulseBrightness = 0;
      redPulseUp = true;
      redPulseCount++;

      if (redPulseCount >= 2) {
        ledMode = previousMode;
        return;
      }
    }
  }

  setAllColor(redPulseBrightness, 0, 0);
}

// ---------------- SHUTDOWN FADE ----------------
void handleShutdownFade() {
  if (millis() - lastUpdate < 15) return;
  lastUpdate = millis();

  const unsigned long elapsed = millis() - shutdownFadeStartedAt;

  if (elapsed >= shutdownFadeDurationMs) {
    strip.clear();
    strip.show();
    ledMode = OFF_STATE;
    return;
  }

  const float remaining = 1.0 - ((float)elapsed / (float)shutdownFadeDurationMs);
  const float eased = remaining * remaining;

  setAllColor(
    (uint8_t)(shutdownR * eased),
    (uint8_t)(shutdownG * eased),
    (uint8_t)(shutdownB * eased)
  );
}

// ---------------- LED OUTPUT ----------------
void setAllColor(uint8_t r, uint8_t g, uint8_t b) {
  for (int i = 0; i < NUM_LEDS; i++) {
    strip.setPixelColor(i, strip.Color(r, g, b));
  }
  strip.show();
}

void captureCurrentLedColor(uint8_t& r, uint8_t& g, uint8_t& b) {
  uint32_t totalR = 0;
  uint32_t totalG = 0;
  uint32_t totalB = 0;

  for (int i = 0; i < NUM_LEDS; i++) {
    const uint32_t color = strip.getPixelColor(i);
    totalR += (color >> 16) & 0xFF;
    totalG += (color >> 8) & 0xFF;
    totalB += color & 0xFF;
  }

  r = (uint8_t)(totalR / NUM_LEDS);
  g = (uint8_t)(totalG / NUM_LEDS);
  b = (uint8_t)(totalB / NUM_LEDS);
}

void startShutdownFade() {
  shutdownFadeStartedAt = millis();
  ledMode = SHUTDOWN_FADE;
}

void playAudio(uint8_t track) {
  Serial.print("AUDIO:");
  Serial.println(track);
  if (dfReady) player.play(track);
}

void forceOff() {
  pendingIdleActive = false;
  ledMode = OFF_STATE;
  idleActive = false;
  idleAudioPlayed = false;
  strip.clear();
  strip.show();
}

void forcePaused(bool playSound) {
  pendingIdleActive = false;
  ledMode = SOLID_BLUE;
  idleActive = false;
  idleAudioPlayed = false;
  if (playSound) playAudio(AUDIO_PAUSED);
}

void forceWorking(bool playSound) {
  pendingIdleActive = false;
  ledMode = WARM_BREATHING;
  warmPhase = 0;
  idleActive = false;
  idleAudioPlayed = false;
  if (playSound) playAudio(AUDIO_WORKING);
}

bool handleColorCommandChar(char c) {
  if (c == 'C') {
    colorCommandActive = true;
    colorBufferIndex = 0;
    return true;
  }

  if (c == '#' || c == ':' || c == ' ' || c == '\r' || c == '\n') return true;

  if (hexValue(c) < 0) {
    colorCommandActive = false;
    colorBufferIndex = 0;
    return true;
  }

  if (colorBufferIndex < 6) {
    colorBuffer[colorBufferIndex++] = c;
  }

  if (colorBufferIndex == 6) {
    colorBuffer[6] = '\0';
    applyWorkingColorHex(colorBuffer);
    colorCommandActive = false;
    colorBufferIndex = 0;
  }

  return true;
}

void applyWorkingColorHex(const char* hex) {
  int r1 = hexValue(hex[0]);
  int r2 = hexValue(hex[1]);
  int g1 = hexValue(hex[2]);
  int g2 = hexValue(hex[3]);
  int b1 = hexValue(hex[4]);
  int b2 = hexValue(hex[5]);
  if (r1 < 0 || r2 < 0 || g1 < 0 || g2 < 0 || b1 < 0 || b2 < 0) return;

  workingR = (uint8_t)((r1 << 4) | r2);
  workingG = (uint8_t)((g1 << 4) | g2);
  workingB = (uint8_t)((b1 << 4) | b2);

  Serial.print("COLOR:WORKING #");
  Serial.println(hex);
}

int hexValue(char c) {
  if (c >= '0' && c <= '9') return c - '0';
  if (c >= 'a' && c <= 'f') return c - 'a' + 10;
  if (c >= 'A' && c <= 'F') return c - 'A' + 10;
  return -1;
}
