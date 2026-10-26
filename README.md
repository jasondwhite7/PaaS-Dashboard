# PaaS Dashboard

An environmental monitoring dashboard and IoT sensor logging system built with React, Vite, Express, SQLite, Eclipse Mosquitto (MQTT), and Arduino GIGA R1 WiFi.

---

## Prerequisites & Installation

Select your operating system below for step-by-step setup instructions.

---

### 🍎 macOS Setup

#### 1. Install Command Line Tools (C++ Compiler)

Required for native SQLite bindings (`better-sqlite3`):

```bash
xcode-select --install
```

#### 2. Install Node.js & npm (LTS Recommended)

Node.js v20 LTS or v22 LTS is recommended:

- **Homebrew:**
  ```bash
  brew install node
  ```
- **Or Official Installer:** Download from [nodejs.org](https://nodejs.org/).

Verify:

```bash
node -v   # v20.x or higher
npm -v    # v10.x or higher
```

#### 3. Install & Configure Mosquitto MQTT Broker

Install Eclipse Mosquitto via Homebrew:

```bash
brew install mosquitto
```

**Allow LAN Connections from Arduino:**
By default, Mosquitto 2.0+ only accepts connections from `localhost`. To allow the Arduino to connect over your network:

1. Open the configuration file:
   - **Apple Silicon:** `/opt/homebrew/etc/mosquitto/mosquitto.conf`
   - **Intel Mac:** `/usr/local/etc/mosquitto/mosquitto.conf`
2. Add:
   ```conf
   listener 1883
   allow_anonymous true
   ```
3. Start Mosquitto:
   ```bash
   brew services start mosquitto
   ```
   _(Or run directly in terminal: `mosquitto -v`)_

---

### 🪟 Windows Setup

#### 1. Install Node.js & npm (LTS Recommended)

Download and run the installer from [nodejs.org](https://nodejs.org/) (ensure **"Automatically install necessary tools"** is checked).

#### 2. Install Visual Studio C++ Build Tools & Python (If needed)

If `better-sqlite3` fails to build:

```powershell
winget install Microsoft.VisualStudio.2022.BuildTools --force --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
winget install Python.Python.3.12
```

#### 3. Install & Configure Mosquitto MQTT Broker

Install Mosquitto:

```powershell
winget install EclipseFoundation.Mosquitto
```

In `C:\Program Files\mosquitto\mosquitto.conf`, add:

```conf
listener 1883
allow_anonymous true
```

Start the service:

```powershell
net start mosquitto
```

---

### 🔌 Arduino Firmware Setup (Hardware)

If flashing the Arduino GIGA R1 WiFi (`firmware/firmware/firmware.ino`):

1. **Install Arduino IDE 2.x:** [arduino.cc/en/software](https://www.arduino.cc/en/software)
2. **Install Board Support:** Open **Boards Manager** and install **Arduino Mbed OS Giga Boards**.
3. **Install Required Libraries (Library Manager):**
   - `ArduinoMqttClient`
   - `Sensirion I2C SCD4x`
   - `Sensirion Core`
   - `DFRobot_OxygenSensor`
   - `ArduinoJson`

#### Configure Secrets

Edit `firmware/firmware/secrets.h`:

```c
#pragma once

#define WIFI_USER "Your_WiFi_SSID"
#define WIFI_PASSWORD "Your_WiFi_Password"

// Set to your computer's local IP running Mosquitto (find via: ipconfig getifaddr en0)
#define MQTT_BROKER "192.168.1.100"
#define MQTT_PORT 1883

#define MQTT_TOPIC "paas-dashboard-jason/sensors/readings"
#define MQTT_STATUS_TOPIC "paas-dashboard-jason/sensors/status"
```

> [!NOTE]
> If testing using a mobile hotspot or campus Wi-Fi with client isolation, direct communication between the Arduino and computer will be blocked. Connect both to a standard local network, or use an external cloud MQTT broker.

---

## Project Setup & Running

### 1. Clone & Enter Directory

```bash
git clone https://github.com/jasondwhite7/PaaS-Dashboard.git
cd PaaS-Dashboard
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run the Application

```bash
npm run dev
```

This runs the frontend and backend concurrently:

- **Frontend (Vite):** [http://localhost:3000](http://localhost:3000)
- **Backend API (Express):** [http://localhost:3001](http://localhost:3001)

#### Running Services Separately:

- **Backend:** `npm run server`
- **Frontend:** `npm start`

### 4. Build for Production

```bash
npm run build
npm run preview
```

---

## Configuration

The backend Express server (`server/index.ts`) connects to your MQTT broker and can be configured with environment variables:

| Variable            | Default Value                           | Description                    |
| ------------------- | --------------------------------------- | ------------------------------ |
| `MQTT_BROKER_URL`   | `mqtt://localhost:1883`                 | MQTT broker connection URL     |
| `MQTT_TOPIC`        | `paas-dashboard-jason/sensors/readings` | Topic for incoming sensor data |
| `MQTT_STATUS_TOPIC` | `paas-dashboard-jason/sensors/status`   | Topic for Arduino LWT / status |
| `PORT`              | `3001`                                  | Backend HTTP API port          |

**Database:**
Readings and maintenance logs are automatically saved in a local SQLite database (`sensor_data.db`).

---

## Troubleshooting

### 1. `[vite] http proxy error: connect ECONNREFUSED 127.0.0.1:3001`

When running `npm run dev`, Vite boots faster than the TypeScript backend compiles. Once the backend prints `PaaS backend running on http://localhost:3001`, the connection resolves automatically.

### 2. MQTT Broker Connection Refused (`[MQTT Broker Error]`)

Ensure the Mosquitto service is running:

- **macOS:** `brew services start mosquitto` (or `mosquitto -v` in a terminal)
- **Windows:** `net start mosquitto`

### 3. Arduino Fails to Connect to Mosquitto

- Check that `mosquitto.conf` contains `listener 1883` and `allow_anonymous true`.
- Confirm your computer's local IP (`ipconfig getifaddr en0`) matches `MQTT_BROKER` in `secrets.h`.
- Verify firewall allows inbound traffic on port 1883.

### 4. `node-gyp` or `better-sqlite3` Build Failures

- **macOS:** Run `xcode-select --install`.
- **Windows:** Ensure Visual Studio C++ Build Tools & Python are installed.
- Clear npm cache and reinstall:
  ```bash
  npm cache clean --force
  npm install
  ```

### 5. Port 3000 or 3001 Already in Use

- **macOS:**
  ```bash
  lsof -i :3000 -t | xargs kill -9
  lsof -i :3001 -t | xargs kill -9
  ```
- **Windows:**
  ```powershell
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  ```
