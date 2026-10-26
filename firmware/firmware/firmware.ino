#include "secrets.h"
#include <ArduinoJson.h>
#include <ArduinoMqttClient.h>
#include <DFRobot_OxygenSensor.h>
#include <SensirionI2cScd4x.h>
#include <WiFi.h>
#include <Wire.h>

#define SCD4X_I2C_ADDR_62 0x62
#define OXYGEN_I2C_ADDR 0x73

const char *ssid = WIFI_USER;
const char *password = WIFI_PASSWORD;

const char broker[] = MQTT_BROKER;
int port = MQTT_PORT;
const char topic[] = MQTT_TOPIC;
const char statusTopic[] = MQTT_STATUS_TOPIC;

const unsigned long SENSOR_INTERVAL = 5000;

float lastTemperature = NAN;
float lastHumidity = NAN;
uint16_t lastCO2 = 0;
float lastO2 = NAN;
unsigned long lastSensorRead = 0;

bool scd41Ok = false;
bool o2Ok = false;

WiFiClient wifiClient;
MqttClient mqttClient(wifiClient);

SensirionI2cScd4x scd4x;
DFRobot_OxygenSensor oxygen(&Wire);

int scdConsecutiveFails = 0;

// MQTT reconnect backoff
unsigned long lastMqttRetry = 0;
unsigned long mqttRetryInterval = 2000;  // Start at 2s, back off up to 30s

void initSCD41() {
  Serial.println("Initializing / Recovering SCD41...");
  scd4x.begin(Wire, SCD4X_I2C_ADDR_62);
  scd4x.wakeUp();
  scd4x.stopPeriodicMeasurement();
  delay(
      500); // Sensirion datasheet requires 500ms after stopPeriodicMeasurement
  scd4x.reinit();
  delay(20);
  uint16_t startErr = scd4x.startPeriodicMeasurement();
  if (startErr == 0) {
    Serial.println("SCD41 periodic measurement started!");
  } else {
    Serial.print("SCD41 startPeriodicMeasurement error, code: ");
    Serial.println(startErr);
  }
}

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  Serial.print("Connecting to Wi-Fi");
  WiFi.begin(ssid, password);
  unsigned long wifiStart = millis();
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
    // Timeout after 30 seconds to avoid infinite blocking
    if (millis() - wifiStart > 30000) {
      Serial.println("\nWi-Fi connection timed out!");
      return;
    }
  }
  Serial.println("\nConnected to Wi-Fi!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());
}

void connectMQTT() {
  if (WiFi.status() != WL_CONNECTED) {
    return;
  }

  // Don't retry too frequently
  if (mqttClient.connected()) {
    return;
  }

  Serial.print("Connecting to MQTT broker: ");
  Serial.print(broker);
  Serial.print(":");
  Serial.println(port);

  // Generate unique client ID
  String clientId = "giga-jason-" + String(random(10000, 99999));
  mqttClient.setId(clientId);

  // Keepalive: 15 seconds. Phone hotspots aggressively drop idle TCP
  // connections (NAT timeout can be as low as 30s). A short keepalive
  // ensures PINGREQ packets keep the NAT entry alive. We must call
  // mqttClient.poll() frequently enough (within 1.5x keepalive = 22.5s).
  mqttClient.setKeepAliveInterval(15 * 1000);

  // Set Last Will and Testament (LWT) so broker auto-publishes "offline"
  // if the Arduino disconnects unexpectedly (no clean DISCONNECT packet).
  mqttClient.beginWill(statusTopic, false, 1);
  mqttClient.print("offline");
  mqttClient.endWill();

  if (!mqttClient.connect(broker, port)) {
    Serial.print("MQTT connection failed! Error code = ");
    Serial.println(mqttClient.connectError());
    // Exponential backoff: 2s → 4s → 8s → 16s → 30s max
    mqttRetryInterval = min(mqttRetryInterval * 2, 30000UL);
    return;
  }

  Serial.println("Connected to MQTT broker!");
  mqttRetryInterval = 2000;  // Reset backoff on success

  // Publish "online" status message (retained so new subscribers see it)
  mqttClient.beginMessage(statusTopic, false, 1);
  mqttClient.print("online");
  mqttClient.endMessage();
  Serial.println("Published online status");
}

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Initialize SCD41 on Wire
  initSCD41();

  // Initialize O2 on Wire (same bus on breadboard)
  oxygen.begin(OXYGEN_I2C_ADDR);
  Serial.println("O2 Sensor Initialized on Wire!");

  connectWiFi();
  connectMQTT();
}

void loop() {
  // ── 1. Keep MQTT alive (MUST be called frequently!) ─────────────────
  // This sends PINGREQ packets and processes incoming packets.
  // If this isn't called within ~1.5x the keepalive interval, the broker
  // will consider the client dead and trigger the LWT.
  mqttClient.poll();

  // ── 2. Check and reconnect Wi-Fi if needed ──────────────────────────
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Wi-Fi dropped! Reconnecting...");
    connectWiFi();
  }

  // ── 3. Reconnect to MQTT if dropped (with backoff) ──────────────────
  if (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    unsigned long now = millis();
    if (now - lastMqttRetry >= mqttRetryInterval) {
      lastMqttRetry = now;
      Serial.println("MQTT disconnected. Retrying...");
      connectMQTT();
    }
  }

  // ── 4. Read sensors and publish at the configured interval ──────────
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;

    // --- Read DFRobot Oxygen Sensor ---
    Wire.beginTransmission(OXYGEN_I2C_ADDR);
    byte o2BusErr = Wire.endTransmission();
    if (o2BusErr != 0) {
      lastO2 = NAN;
      o2Ok = false;
      Serial.print("DFRobot O2 I2C Disconnected, code: ");
      Serial.println(o2BusErr);
    } else {
      // Use 3 samples instead of 10 to keep this call fast (~300ms vs ~2s).
      // The old value of 10 blocked the loop long enough to starve
      // mqttClient.poll(), causing keepalive timeouts and disconnects.
      float o2Val = oxygen.getOxygenData(3);
      if (!isnan(o2Val) && o2Val > 0.0f && o2Val <= 100.0f) {
        lastO2 = o2Val;
        o2Ok = true;
      } else {
        lastO2 = NAN;
        o2Ok = false;
        Serial.println("DFRobot O2 Sensor Error: Invalid reading");
      }
    }

    // Poll MQTT between sensor reads to keep keepalive alive
    mqttClient.poll();

    // --- Read Sensirion SCD41 Sensor ---
    bool dataReady = false;
    uint16_t readyErr = scd4x.getDataReadyStatus(dataReady);

    if (readyErr != 0) {
      scdConsecutiveFails++;
      Serial.print("SCD41 I2C Communication Error, code: ");
      Serial.println(readyErr);
    } else if (dataReady) {
      uint16_t readErr =
          scd4x.readMeasurement(lastCO2, lastTemperature, lastHumidity);
      if (readErr == 0) {
        scd41Ok = true;
        scdConsecutiveFails = 0;
      } else {
        scdConsecutiveFails++;
        Serial.print("SCD41 Read Error, code: ");
        Serial.println(readErr);
      }
    } else {
      // Data is still being sampled by sensor; keep existing valid readings
      Serial.println("SCD41 sampling in progress (using previous reading)");
    }

    // Only auto-recover if actual I2C errors persisted for multiple cycles
    if (scdConsecutiveFails >= 5) {
      scd41Ok = false;
      Serial.println(
          "SCD41 communication lost. Attempting auto-recovery...");
      initSCD41();
      scdConsecutiveFails = 0;
    }

    // --- Publish data over MQTT if connected ---
    if (mqttClient.connected()) {
      StaticJsonDocument<350> data;

      if (scd41Ok && !isnan(lastTemperature)) {
        data["temperature"] = lastTemperature;
      } else {
        data["temperature"] = nullptr;
      }

      if (scd41Ok && !isnan(lastHumidity)) {
        data["humidity"] = lastHumidity;
      } else {
        data["humidity"] = nullptr;
      }

      if (scd41Ok && lastCO2 > 0) {
        data["co2"] = lastCO2;
      } else {
        data["co2"] = nullptr;
      }

      if (o2Ok && !isnan(lastO2)) {
        data["o2"] = lastO2;
      } else {
        data["o2"] = nullptr;
      }

      JsonObject sensors = data.createNestedObject("sensors");

      JsonObject scd41Obj = sensors.createNestedObject("scd41");
      scd41Obj["ok"] = scd41Ok;
      if (!scd41Ok) {
        scd41Obj["error"] = "SCD41 read error or disconnected";
      }

      JsonObject o2Obj = sensors.createNestedObject("dfrobot_o2");
      o2Obj["ok"] = o2Ok;
      if (!o2Ok) {
        o2Obj["error"] = "DFRobot O2 invalid reading or disconnected";
      }

      String payload;
      serializeJson(data, payload);

      mqttClient.beginMessage(topic);
      mqttClient.print(payload);
      mqttClient.endMessage();

      Serial.print("Published: ");
      Serial.println(payload);
    } else {
      Serial.println("Skipping publish: Not connected to MQTT broker");
    }
  }
}