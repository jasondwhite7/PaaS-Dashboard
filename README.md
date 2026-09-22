# PaaS Dashboard

An environmental monitoring dashboard and IoT sensor logging system built with React, Vite, Express, SQLite, and Arduino GIGA R1 WiFi.

---

## Prerequisites & Package Installation

> **Note:** This guide assumes **Git is already installed** on your system.

Select your operating system below for step-by-step instructions on installing the required packages and dependencies.

---

### 🍎 macOS Installation

Follow these steps in **Terminal** (`Terminal.app` or iTerm2):

#### 1. Install Command Line Tools (C++ Compiler)
`better-sqlite3` requires C++ compilation tools for native Node.js bindings. Run:
```bash
xcode-select --install
```
If a dialog appears, click **Install** and wait for the installation to finish. If already installed, it will print an error indicating it is already present, which you can safely ignore.

#### 2. Install Node.js & npm (LTS Recommended)
Node.js v20 LTS or v22 LTS is recommended. You can install it using any of the methods below:

- **Method A: Homebrew (Recommended)**
  If you have Homebrew installed:
  ```bash
  brew install node
  ```
  *(If you do not have Homebrew, install it first via [brew.sh](https://brew.sh) or use Method B).*

- **Method B: Official Installer**
  1. Download the macOS installer (`.pkg`) from [nodejs.org](https://nodejs.org/).
  2. Run the installer and follow the on-screen instructions (npm is included automatically).

- **Method C: NVM (Node Version Manager)**
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  source ~/.zshrc
  nvm install --lts
  nvm use --lts
  ```

#### 3. Verify Installation
```bash
node -v   # Should output v20.x or higher
npm -v    # Should output v10.x or higher
```

---

### 🪟 Windows Installation

Follow these steps in **PowerShell** or **Command Prompt** (Run as Administrator when installing software):

#### 1. Install Node.js & npm (LTS Recommended)
Node.js v20 LTS or v22 LTS is recommended. Choose one of the following methods:

- **Method A: Official Installer (Recommended for Beginners)**
  1. Download the Windows Installer (`.msi`, 64-bit) from [nodejs.org](https://nodejs.org/).
  2. Run the installer.
  3. During the setup wizard, ensure the checkbox **"Automatically install the necessary tools (such as Python and Visual Studio Build Tools)"** is checked (this handles C++ build tools for native modules like SQLite automatically).
  4. Complete the wizard and restart your terminal.

- **Method B: Windows Package Manager (`winget`)**
  Open PowerShell as Administrator and run:
  ```powershell
  winget install OpenJS.NodeJS.LTS
  ```

- **Method C: Chocolatey**
  Open PowerShell as Administrator and run:
  ```powershell
  choco install nodejs-lts
  ```

#### 2. Install Visual Studio C++ Build Tools & Python (If not already installed)
Native packages like `better-sqlite3` need C++ build tools and Python for `node-gyp`. If you did not install them with the Node installer, install them using:

- **Using winget:**
  ```powershell
  winget install Microsoft.VisualStudio.2022.BuildTools --force --override "--passive --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
  winget install Python.Python.3.12
  ```
- **Or Manual Download:**
  1. Download the **Build Tools for Visual Studio** from [visualstudio.microsoft.com](https://visualstudio.microsoft.com/downloads/).
  2. Run the installer and select the **Desktop development with C++** workload.
  3. Install Python 3 from [python.org](https://www.python.org/downloads/) (make sure to check **"Add python.exe to PATH"**).

#### 3. Verify Installation
Restart your terminal and run:
```powershell
node -v   # Should output v20.x or higher
npm -v    # Should output v10.x or higher
```

---

### 🔌 Optional: Arduino Firmware Prerequisites (Hardware Developers)

If you plan to flash or modify the sensor hub firmware (`firmware/firmware/firmware.ino`):

1. **Install Arduino IDE 2.x:**
   - **macOS:** Download from [arduino.cc](https://www.arduino.cc/en/software) or `brew install --cask arduino-ide`
   - **Windows:** Download from [arduino.cc](https://www.arduino.cc/en/software) or `winget install Arduino.IDE`
2. **Install Board Support:**
   - Open Arduino IDE -> **Tools** -> **Board** -> **Boards Manager...**
   - Search for **Arduino Mbed OS Giga Boards** and click **Install**.
3. **Install Required Libraries:**
   - Open Arduino IDE -> **Tools** -> **Manage Libraries...**
   - Search and install:
     - `Sensirion I2C SCD4x` (by Sensirion)
     - `Sensirion Core` (by Sensirion)
     - `ArduinoJson` (by Benoît Blanchon)
     - `DFRobot_OxygenSensor` (by DFRobot)
     *(Note: `WiFi` and `Wire` libraries are included with the Giga board core package).*

---

## Project Setup & Running

Once Node.js and npm are installed:

### 1. Clone & Enter the Directory
```bash
git clone https://github.com/jasondwhite7/PaaS-Dashboard.git
cd PaaS-Dashboard
```

### 2. Install Dependencies
Install all npm packages required for both the frontend (React/Vite) and backend (Express/SQLite):
```bash
npm install
```

### 3. Run the Application

#### Option A: Run Full Stack (Frontend + Backend Concurrently)
```bash
npm run dev
```
This starts:
- **Frontend (Vite dev server):** [http://localhost:3000](http://localhost:3000)
- **Backend API (Express server):** [http://localhost:3001](http://localhost:3001)

#### Option B: Run Services Separately
If you prefer running the frontend and backend in separate terminal windows:
- **Backend Server:**
  ```bash
  npm run server
  ```
- **Frontend Dashboard:**
  ```bash
  npm start
  ```

### 4. Build for Production
To build the production-ready React client:
```bash
npm run build
```
To preview the production build:
```bash
npm run preview
```

---

## Configuration

- **Arduino Sensor URL:** The backend polls live sensor data from the Arduino server. You can configure the IP address in `server/index.ts`:
  ```typescript
  const ARDUINO_URL = 'http://100.69.1.146'; // Update to your Arduino's IP
  ```
- **Database:** Sensor readings are automatically stored in a local SQLite file named `sensor_data.db`.

---

## Common Troubleshooting

- **Error: `node-gyp` or `better-sqlite3` build failure:**
  - **macOS:** Ensure Xcode Command Line Tools are installed (`xcode-select --install`).
  - **Windows:** Ensure the C++ Build Tools and Python are installed and available in your `PATH`.
  - Try clearing npm cache and reinstalling:
    ```bash
    npm cache clean --force
    npm install
    ```
- **Port 3000 or 3001 already in use:**
  - Check for background node processes using the port:
    - **macOS:** `lsof -i :3000` / `lsof -i :3001` then `kill -9 <PID>`
    - **Windows:** `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`
