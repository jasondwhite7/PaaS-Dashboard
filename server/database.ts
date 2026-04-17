import Database from 'better-sqlite3';
import path from 'path';

// Database file lives next to the server code
const DB_PATH = path.join(__dirname, '..', 'sensor_data.db');

let db: Database.Database;

// ── Types ───────────────────────────────────────────────────────────────
export interface SensorRow {
    id: number;
    temperature: number;
    humidity: number;
    co2: number;
    timestamp: string; // ISO 8601 string
}

// ── Setup ───────────────────────────────────────────────────────────────

/**
 * Initialize the database connection and create the table if it doesn't exist.
 * 
 * CREATE TABLE creates the "sensor_data" table with 5 columns:
 *   - id: auto-incrementing number (each row gets a unique ID)
 *   - temperature, humidity, co2: decimal numbers (REAL = floating point)
 *   - timestamp: date/time stored as text in ISO 8601 format
 * 
 * "IF NOT EXISTS" means it only creates the table the first time.
 * After that, it just opens the existing database file.
 */
export function initDatabase(): void {
    db = new Database(DB_PATH);

    // Enable WAL mode for better performance with concurrent reads/writes
    // (WAL = Write-Ahead Logging — lets reads happen while writes are happening)
    db.pragma('journal_mode = WAL');

    db.exec(`
        CREATE TABLE IF NOT EXISTS sensor_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            temperature REAL NOT NULL,
            humidity REAL NOT NULL,
            co2 REAL NOT NULL,
            timestamp TEXT NOT NULL
        )
    `);

    // Create an index on timestamp for faster time-range queries
    // Think of it like a book's index — helps find rows by date quickly
    db.exec(`
        CREATE INDEX IF NOT EXISTS idx_timestamp ON sensor_data (timestamp)
    `);

    console.log(`Database initialized at ${DB_PATH}`);
}

// ── Insert ──────────────────────────────────────────────────────────────

/**
 * Insert a single sensor reading into the database.
 * 
 * This is a "prepared statement" — it's like a template with ? placeholders.
 * SQLite fills in the values safely (prevents SQL injection attacks).
 * .run() executes the statement with the given values.
 */
export function insertReading(temperature: number, humidity: number, co2: number): void {
    const stmt = db.prepare(`
        INSERT INTO sensor_data (temperature, humidity, co2, timestamp)
        VALUES (?, ?, ?, ?)
    `);
    stmt.run(temperature, humidity, co2, new Date().toISOString());
}

// ── Query ───────────────────────────────────────────────────────────────

/**
 * Get raw (non-downsampled) sensor data for a given time range.
 * 
 * WHERE timestamp > ? — filters to only rows after the cutoff time
 * ORDER BY timestamp ASC — sorts oldest to newest (for graphing)
 */
export function getRawData(secondsAgo: number): SensorRow[] {
    const cutoff = new Date(Date.now() - secondsAgo * 1000).toISOString();
    const stmt = db.prepare(`
        SELECT id, temperature, humidity, co2, timestamp
        FROM sensor_data
        WHERE timestamp > ?
        ORDER BY timestamp ASC
    `);
    return stmt.all(cutoff) as SensorRow[];
}

/**
 * Get downsampled sensor data — averages readings into time buckets.
 * 
 * This is the key query for longer time ranges. Here's what it does:
 * 
 * 1. WHERE timestamp > ? — filter to the time range
 * 2. GROUP BY bucket — group rows into time buckets
 *    - The bucket is calculated by dividing the Unix timestamp by bucketSeconds
 *      and rounding down (integer division), then multiplying back
 *    - Example: with 60s buckets, all readings between 14:00:00 and 14:00:59
 *      get grouped together
 * 3. AVG(temperature) — average the values within each bucket
 * 4. MIN(timestamp) — use the earliest timestamp in each bucket as the label
 * 
 * This turns 720 data points (1 hour at 5s intervals) into ~120 points
 * (1 per 30 seconds), making the graph smooth and fast.
 */
export function getDownsampledData(secondsAgo: number, bucketSeconds: number): SensorRow[] {
    const cutoff = new Date(Date.now() - secondsAgo * 1000).toISOString();
    const stmt = db.prepare(`
        SELECT 
            0 as id,
            AVG(temperature) as temperature,
            AVG(humidity) as humidity,
            AVG(co2) as co2,
            MIN(timestamp) as timestamp
        FROM sensor_data
        WHERE timestamp > ?
        GROUP BY CAST((strftime('%s', timestamp) / ?) AS INTEGER)
        ORDER BY timestamp ASC
    `);
    return stmt.all(cutoff, bucketSeconds) as SensorRow[];
}

/**
 * Get the total number of rows in the database.
 * Useful for monitoring database size.
 */
export function getRowCount(): number {
    const result = db.prepare('SELECT COUNT(*) as count FROM sensor_data').get() as { count: number };
    return result.count;
}

/**
 * Close the database connection gracefully.
 */
export function closeDatabase(): void {
    if (db) {
        db.close();
        console.log('Database connection closed.');
    }
}
