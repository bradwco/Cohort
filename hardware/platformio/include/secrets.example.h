#pragma once

// Copy this file to include/secrets.h and fill in your local values.
// Do not commit include/secrets.h.

// Leave this at 0 when the ESP32 is plugged into the desktop over USB.
// Set to 1 only if you want the ESP32 to publish directly to MQTT over Wi-Fi.
#define COHORT_USE_WIFI_MQTT 0

// Only needed when COHORT_USE_WIFI_MQTT is 1.
#define WIFI_SSID "your-wifi-name"
#define WIFI_PASSWORD "your-wifi-password"

// Only needed when COHORT_USE_WIFI_MQTT is 1.
// USB serial mode pulls the user id from the currently logged-in desktop user.
#define COHORT_USER_ID "00000000-0000-0000-0000-000000000000"
#define MQTT_HOST "your-mqtt-host.example.com"
#define MQTT_PORT 8883
#define MQTT_USER "your-mqtt-username"
#define MQTT_PASSWORD "your-mqtt-password"

// Used by both USB serial and MQTT modes.
#define COHORT_WORKFLOW_GROUP "Focus Session"
