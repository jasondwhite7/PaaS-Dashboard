import express from 'express';
import cors from 'cors';
import { initDatabase, insertReading, getRawData, getDownsampledData, getRowCount, closeDatabase } from './database';

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
}
let errors: ErrorLog[] = [];

// ── Arduino Polling ─────────────────────────────────────────────────────
const ARDUINO_URL = 'http://100.69.161.65';
const POLL_INTERVAL = 5000; // 5 seconds

/**
 * Poll the Arduino sensor every 5 seconds.
 * This is the same logic that was in the React hook (ScidData.ts),
 * but now it runs on the server so data collection continues
 * even if the browser tab is closed.
 */
async function pollArduino(): Promise<void> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000); // 4 second timeout

        const res = await fetch(ARDUINO_URL, {
            signal: controller.signal
        });
        clearTimeout(timeout);

        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }

        const text = await res.text();

        if (!text || text.trim() === '') {
            throw new Error('Empty response from Arduino');
        }

        const json = JSON.parse(text);

        // Validate the data has required fields
        if (typeof json.temperature !== 'number' ||
            typeof json.humidity !== 'number' ||
            typeof json.co2 !== 'number') {
            throw new Error('Invalid data format from Arduino');
        }

        // Store in the database
        insertReading(json.temperature, json.humidity, json.co2);

    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Arduino poll failed:', errorMessage);
        errors.push({ message: errorMessage, timestamp: new Date().toISOString() });
    }
}

// ── Time Range Config ───────────────────────────────────────────────────
// Maps the time range keys to their query parameters.
// bucketSeconds = 0 means "return raw data, no downsampling"
const RANGE_CONFIG: Record<string, { seconds: number; bucketSeconds: number }> = {
    '2m':  { seconds: 120,    bucketSeconds: 0 },     // raw data (24 points)
    '1h':  { seconds: 3600,   bucketSeconds: 30 },    // avg per 30s → ~120 points
    '6h':  { seconds: 21600,  bucketSeconds: 180 },   // avg per 3m → ~120 points
    '24h': { seconds: 86400,  bucketSeconds: 600 },   // avg per 10m → ~144 points
    '7d':  { seconds: 604800, bucketSeconds: 3600 },   // avg per 1h → ~168 points
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
 * Returns the list of Arduino polling errors.
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
 * GET /api/status
 * Returns server status and database stats. Useful for debugging.
 */
app.get('/api/status', (_req, res) => {
    res.json({
        status: 'running',
        totalReadings: getRowCount(),
        errorCount: errors.length,
        arduinoUrl: ARDUINO_URL,
        pollInterval: POLL_INTERVAL,
    });
});

// ── Start ───────────────────────────────────────────────────────────────

// Initialize the database
initDatabase();

// Start polling the Arduino
const pollInterval = setInterval(pollArduino, POLL_INTERVAL);
console.log(`Polling Arduino at ${ARDUINO_URL} every ${POLL_INTERVAL / 1000}s`);

// Start the HTTP server
app.listen(PORT, () => {
    console.log(`PaaS backend running on http://localhost:${PORT}`);
    console.log(`API endpoints:`);
    console.log(`  GET  /api/data?range=2m|1h|6h|24h|7d`);
    console.log(`  GET  /api/errors`);
    console.log(`  POST /api/errors/clear`);
    console.log(`  POST /api/errors/clear/:index`);
    console.log(`  GET  /api/status`);
});

// Graceful shutdown — close database when the server stops
process.on('SIGINT', () => {
    console.log('\nShutting down...');
    clearInterval(pollInterval);
    closeDatabase();
    process.exit(0);
});

process.on('SIGTERM', () => {
    clearInterval(pollInterval);
    closeDatabase();
    process.exit(0);
});
