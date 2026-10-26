import express from 'express';
import cors from 'cors';
import mqtt from 'mqtt';
import { initDatabase, insertReading, getRawData, getDownsampledData, getRowCount, closeDatabase, getMaintenanceLogs, insertMaintenanceLog, clearMaintenanceLogs } from './database';

const app = express();
const PORT = 3001;

// ── Middleware ───────────────────────────────────────────────────────────
app.use(cors());           // Allow requests from the React frontend
app.use(express.json());   // Parse JSON request bodies

// ── Error Tracking ──────────────────────────────────────────────────────
// Errors are kept in memory (not in the DB) since they're transient
interface ErrorLog {
    message: string;
    timestamp: string;
    count: number;
}
let errors: ErrorLog[] = [];

function logSensorError(message: string): void {
    const timestamp = new Date().toISOString();
    // Find if this error already exists anywhere in the active list
    const existing = errors.find(e => e.message === message);
    if (existing) {
        existing.timestamp = timestamp;
        existing.count = (existing.count || 1) + 1;
    } else {
        errors.push({ message, timestamp, count: 1 });
        if (errors.length > 50) {
            errors.shift();
        }
    }
}

// ── MQTT Client Setup ───────────────────────────────────────────────────
const MQTT_BROKER_URL = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const MQTT_TOPIC = process.env.MQTT_TOPIC || 'paas-dashboard-jason/sensors/readings';
const MQTT_STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC || 'paas-dashboard-jason/sensors/status';

let arduinoNodeStatus: 'online' | 'offline' | 'unknown' = 'unknown';
let lastMessageTime: number | null = null;
let messageCount = 0;

console.log(`[MQTT] Connecting to broker at ${MQTT_BROKER_URL}...`);

// Configure MQTT with robust reconnect settings
const mqttClient = mqtt.connect(MQTT_BROKER_URL, {
    clientId: `paas-server-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    clean: true,
    keepalive: 60,              // 60s keepalive ping
    reconnectPeriod: 2000,      // Auto-reconnect every 2 seconds
    connectTimeout: 10000,      // 10s to establish initial connection
    resubscribe: true,          // Auto-resubscribe on reconnect
});

mqttClient.on('connect', () => {
    console.log(`[MQTT] Connected to broker at ${MQTT_BROKER_URL}`);
    mqttClient.subscribe([MQTT_TOPIC, MQTT_STATUS_TOPIC], { qos: 1 }, (err) => {
        if (err) {
            console.error(`[MQTT] Subscription failed:`, err.message);
            logSensorError(`[MQTT Subscription Error] ${err.message}`);
        } else {
            console.log(`[MQTT] Subscribed to "${MQTT_TOPIC}" and "${MQTT_STATUS_TOPIC}"`);
        }
    });
});

mqttClient.on('error', (err) => {
    console.error('[MQTT] Broker connection error:', err.message);
    logSensorError(`[MQTT Broker Error] ${err.message}`);
});

mqttClient.on('reconnect', () => {
    console.log('[MQTT] Attempting to reconnect to broker...');
});

mqttClient.on('close', () => {
    console.log('[MQTT] Connection to broker closed');
});

mqttClient.on('offline', () => {
    console.log('[MQTT] Client went offline');
});

mqttClient.on('message', (topic, payload) => {
    const text = payload.toString().trim();

    // Handle Arduino LWT / Status announcements
    if (topic === MQTT_STATUS_TOPIC) {
        if (text === 'offline') {
            arduinoNodeStatus = 'offline';
            console.warn('[MQTT Status] Arduino GIGA node went OFFLINE (LWT triggered by broker)');
            logSensorError('[Arduino Offline] Sensor node disconnected unexpectedly');
        } else if (text === 'online') {
            arduinoNodeStatus = 'online';
            console.log('[MQTT Status] Arduino GIGA node is ONLINE');
        }
        return;
    }

    try {
        if (!text || text === '') {
            logSensorError('MQTT error: Empty payload received');
            return;
        }

        let json: any;
        try {
            json = JSON.parse(text);
        } catch {
            logSensorError(`MQTT error: Failed to parse JSON: "${text.slice(0, 50)}"`);
            return;
        }

        // Track message timing
        lastMessageTime = Date.now();
        messageCount++;

        // Mark Arduino as online since we just received data from it
        arduinoNodeStatus = 'online';

        // 1. Check Sensirion SCD41 Status (Temperature, Humidity, CO2)
        const scdOk = json.sensors?.scd41?.ok ?? (
            typeof json.temperature === 'number' && !isNaN(json.temperature) &&
            typeof json.humidity === 'number' && !isNaN(json.humidity) &&
            typeof json.co2 === 'number' && !isNaN(json.co2)
        );

        if (!scdOk) {
            const scdErrMsg = json.sensors?.scd41?.error || 'SCD41 sensor error (invalid reading or disconnected)';
            logSensorError(`[SCD41 Sensor] ${scdErrMsg}`);
        }

        // 2. Check DFRobot Oxygen Sensor Status (O2)
        const o2Ok = json.sensors?.dfrobot_o2?.ok ?? (
            typeof json.o2 === 'number' && !isNaN(json.o2)
        );

        if (!o2Ok) {
            const o2ErrMsg = json.sensors?.dfrobot_o2?.error || 'DFRobot O2 sensor error (invalid reading or disconnected)';
            logSensorError(`[DFRobot O2 Sensor] ${o2ErrMsg}`);
        }

        // 3. Extract sensor values (null for whichever sensor failed)
        const temperature = (scdOk && typeof json.temperature === 'number' && !isNaN(json.temperature)) ? json.temperature : null;
        const humidity = (scdOk && typeof json.humidity === 'number' && !isNaN(json.humidity)) ? json.humidity : null;
        const co2 = (scdOk && typeof json.co2 === 'number' && !isNaN(json.co2)) ? json.co2 : null;
        const o2 = (o2Ok && typeof json.o2 === 'number' && !isNaN(json.o2)) ? json.o2 : null;

        // 4. Save to database if at least one sensor provided valid data
        if (temperature !== null || humidity !== null || co2 !== null || o2 !== null) {
            insertReading(temperature, humidity, co2, o2);
        }
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('MQTT message handling failed:', errorMessage);
        logSensorError(`MQTT error: ${errorMessage}`);
    }
});

// ── Time Range Config ───────────────────────────────────────────────────
// Maps the time range keys to their query parameters.
// bucketSeconds = 0 means "return raw data, no downsampling"
const RANGE_CONFIG: Record<string, { seconds: number; bucketSeconds: number }> = {
    '2m': { seconds: 120, bucketSeconds: 0 },     // raw data (24 points)
    '1h': { seconds: 3600, bucketSeconds: 30 },    // avg per 30s → ~120 points
    '6h': { seconds: 21600, bucketSeconds: 180 },   // avg per 3m → ~120 points
    '24h': { seconds: 86400, bucketSeconds: 600 },   // avg per 10m → ~144 points
    '7d': { seconds: 604800, bucketSeconds: 3600 },   // avg per 1h → ~168 points
};

// ── API Routes ──────────────────────────────────────────────────────────

/**
 * GET /api/data?range=2m
 * 
 * Returns sensor data for the given time range.
 * Short ranges return raw data; longer ranges return downsampled (averaged) data.
 */
app.get('/api/data', (req, res) => {
    const range = (req.query.range as string) || '2m';
    const config = RANGE_CONFIG[range];

    if (!config) {
        res.status(400).json({ error: `Invalid range: ${range}. Valid: ${Object.keys(RANGE_CONFIG).join(', ')}` });
        return;
    }

    try {
        const data = config.bucketSeconds === 0
            ? getRawData(config.seconds)
            : getDownsampledData(config.seconds, config.bucketSeconds);

        res.json(data);
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: 'Database query failed' });
    }
});

/**
 * GET /api/errors
 * Returns the list of sensor and connection errors.
 */
app.get('/api/errors', (_req, res) => {
    res.json(errors);
});

/**
 * POST /api/errors/clear
 * Clears all errors.
 */
app.post('/api/errors/clear', (_req, res) => {
    errors = [];
    res.json({ success: true });
});

/**
 * POST /api/errors/clear/:index
 * Clears a specific error by index.
 */
app.post('/api/errors/clear/:index', (req, res) => {
    const index = parseInt(req.params.index, 10);
    if (isNaN(index) || index < 0 || index >= errors.length) {
        res.status(400).json({ error: 'Invalid error index' });
        return;
    }
    errors.splice(index, 1);
    res.json({ success: true });
});

/**
 * GET /api/logs
 * Returns all maintenance logs for solar panels.
 */
app.get('/api/logs', (_req, res) => {
    try {
        const logs = getMaintenanceLogs();
        res.json(logs);
    } catch (err) {
        console.error('Failed to get logs:', err);
        res.status(500).json({ error: 'Failed to fetch logs' });
    }
});

/**
 * POST /api/logs
 * Adds a new maintenance log.
 */
app.post('/api/logs', (req, res) => {
    try {
        const { panelName, date, technician, notes, problemFound } = req.body;
        insertMaintenanceLog(panelName, date, technician, notes, problemFound);
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to insert log:', err);
        res.status(500).json({ error: 'Failed to save log' });
    }
});

/**
 * DELETE /api/logs
 * Clears all maintenance logs (for testing).
 */
app.delete('/api/logs', (_req, res) => {
    try {
        clearMaintenanceLogs();
        res.json({ success: true });
    } catch (err) {
        console.error('Failed to clear logs:', err);
        res.status(500).json({ error: 'Failed to clear logs' });
    }
});

/**
 * GET /api/status
 * Returns server status and database stats. Useful for debugging.
 */
app.get('/api/status', (_req, res) => {
    res.json({
        status: 'running',
        totalReadings: getRowCount(),
        errorCount: errors.length,
        mqttBroker: MQTT_BROKER_URL,
        mqttTopic: MQTT_TOPIC,
        mqttStatusTopic: MQTT_STATUS_TOPIC,
        mqttConnected: mqttClient.connected,
        arduinoNodeStatus,
        lastMessageTime: lastMessageTime ? new Date(lastMessageTime).toISOString() : null,
        messageCount,
    });
});

// ── Start ───────────────────────────────────────────────────────────────

// Initialize the database
initDatabase();

// Start the HTTP server
app.listen(PORT, () => {
    console.log(`PaaS backend running on http://localhost:${PORT}`);
    console.log(`MQTT subscribed to "${MQTT_TOPIC}" on ${MQTT_BROKER_URL}`);
    console.log(`API endpoints:`);
    console.log(`  GET  /api/data?range=2m|1h|6h|24h|7d`);
    console.log(`  GET  /api/errors`);
    console.log(`  POST /api/errors/clear`);
    console.log(`  POST /api/errors/clear/:index`);
    console.log(`  GET  /api/logs`);
    console.log(`  POST /api/logs`);
    console.log(`  DELETE /api/logs`);
    console.log(`  GET  /api/status`);
});

// Graceful shutdown — close database and MQTT client when the server stops
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    mqttClient.end();
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    mqttClient.end();
    closeDatabase();
    process.exit(0);
});
