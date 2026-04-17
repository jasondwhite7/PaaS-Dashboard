//SCD41 data
export interface ScidData {
    temperature: number;
    humidity: number;
    co2: number;
}

export interface ScidSample extends ScidData {
    timestamp: Date;
}

// Shape of a row coming from the backend database API
export interface SensorRow {
    id: number;
    temperature: number;
    humidity: number;
    co2: number;
    timestamp: string; // ISO 8601 string from SQLite
}

export interface ErrorLog {
    message: string;
    timestamp: Date;
}

export interface GraphPoint {
    time: Date;
    value: number;
}

export type TabKey = 'environment' | 'battery' | 'solar' | 'bio' | 'lights';

export type TimeRangeKey = '2m' | '1h' | '6h' | '24h' | '7d';
