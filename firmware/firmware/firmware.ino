#include <ArduinoJson.h>
#include <DFRobot_OxygenSensor.h>
#include <SensirionI2cScd4x.h>
#include <WiFi.h>
#include <Wire.h>

#define SCD4X_I2C_ADDR_62 0x62
#define OXYGEN_I2C_ADDR 0x73

const char *ssid = "URHome";
const char *password = "whitgRCTnF212081";

const unsigned long SENSOR_INTERVAL = 5000;

float lastTemperature = NAN;
float lastHumidity = NAN;
uint16_t lastCO2 = 0;
float lastO2 = NAN;
unsigned long lastSensorRead = 0;

WiFiServer server(80);

SensirionI2cScd4x scd4x;
DFRobot_OxygenSensor oxygen(&Wire1);

void setup() {
  Serial.begin(115200);
  Wire.begin();

  // Initialize SCD41
  scd4x.begin(Wire, SCD4X_I2C_ADDR_62);
  Serial.println("SCD41 initialized!");

  // Start periodic measurement
  scd4x.startPeriodicMeasurement();

  // Initialize O2 on Wire1 (pins SDA1 and SCL1 on GIGA)
  Wire1.begin();
  oxygen.begin(OXYGEN_I2C_ADDR);
  Serial.println("O2 Sensor Initialized!");

  WiFi.begin(ssid, password);
  Serial.print("Connecting to Wi-Fi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("\nConnected!");
  Serial.print("IP Address: ");
  Serial.println(WiFi.localIP());

  server.begin();
  Serial.println("Server started!");
}

void loop() {
  unsigned long now = millis();
  if (now - lastSensorRead >= SENSOR_INTERVAL) {
    lastSensorRead = now;

    lastO2 = oxygen.getOxygenData(10);
    Serial.println("O2 Updated");

    bool dataReady = false;
    scd4x.getDataReadyStatus(dataReady);
    if (dataReady) {
      if (scd4x.readMeasurement(lastCO2, lastTemperature, lastHumidity) == 0) {
        Serial.println("SCD41 Updated");
      }
    }
  }
  WiFiClient client = server.available();
  if (!client)
    return;

  Serial.println("Client Connected");
  StaticJsonDocument<200> data;
  data["temperature"] = lastTemperature;
  data["humidity"] = lastHumidity;
  data["co2"] = lastCO2;
  data["o2"] = lastO2;

  client.println("HTTP/1.1 200 OK");
  client.println("Content-Type: application/json");
  client.println("Connection: close");
  client.println("Access-Control-Allow-Origin: *");
  client.println();
  serializeJson(data, client);
  client.println();
  client.stop();
  Serial.println("Client disconnected");
}
