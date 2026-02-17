//SCD41 data
export interface ScidData {
    temperature: number;
    humidity: number;
    co2: number;
}

export interface ScidSample extends ScidData {
    timestamp: Date;
}

export interface ErrorLog {
    message: string;
    timestamp: Date;
}

export interface GraphPoint {
    time: Date;
    value: number;
}