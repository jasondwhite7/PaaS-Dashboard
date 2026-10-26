import { useEffect, useState } from "react";
import { ScidSample, ErrorLog } from "../types";


//function that returns the data history and the time at which it updated
export default function GetScidData() {
    const [history, setHistory] = useState<ScidSample[]>([]); //sensor data
    const [errors, setErrors] = useState<ErrorLog[]>([]); //track errors

    //useEffect because this runs after the component renders
    useEffect(() => {
        const fetchData = async () => {
            // 1. Fetch live data (last 2 mins)
            try {
                const res = await fetch("/api/data?range=2m");
                if (res.ok) {
                    const json = await res.json();
                    setHistory(json.map((row: any) => ({
                        temperature: row.temperature,
                        humidity: row.humidity,
                        co2: row.co2,
                        o2: row.o2,
                        timestamp: new Date(row.timestamp),
                    })));
                }
            } catch (err) {
                console.error('Failed to fetch sensor data:', err);
            }

            // 2. Fetch errors
            try {
                const res = await fetch("/api/errors");
                if (res.ok) {
                    const json = await res.json();
                    const grouped = new Map<string, ErrorLog>();
                    for (const e of json) {
                        const count = typeof e.count === 'number' ? e.count : 1;
                        const timestamp = new Date(e.timestamp);
                        const existing = grouped.get(e.message);
                        if (existing) {
                            existing.count += count;
                            if (timestamp > existing.timestamp) {
                                existing.timestamp = timestamp;
                            }
                        } else {
                            grouped.set(e.message, {
                                message: e.message,
                                timestamp,
                                count,
                            });
                        }
                    }
                    setErrors(Array.from(grouped.values()));
                }
            } catch {
                //silently ignore error-fetch failures
            }
        };

        // Fetch immediately on mount so the screen isn't blank
        fetchData();

        // Poll every 3 seconds for snappy updates
        const interval = setInterval(fetchData, 3000);

        return () => clearInterval(interval); // cleanup on unmount
    }, []);

    const clearError = (index: number) => {
        //Tell the backend to clear this specific error
        fetch(`/api/errors/clear/${index}`, { method: 'POST' });
        setErrors(prev => prev.filter((_, i) => i !== index));
    };

    const clearAllErrors = () => {
        //Tell the backend to clear all errors
        fetch('/api/errors/clear', { method: 'POST' });
        setErrors([]);
    };

    return { history, errors, clearError, clearAllErrors }; //return data history, last update, and error status
}