import { useEffect, useState } from "react";
import { ScidSample, ErrorLog } from "../types";


//function that returns the data history and the time at which it updated
export default function GetScidData() {
    const [history, setHistory] = useState<ScidSample[]>([]); //sensor data
    const [errors, setErrors] = useState<ErrorLog[]>([]); //track errors

    //useEffect because this runs after the component renders
    useEffect(() => {
        // Combined 5 second interval for all live updates
        const interval = setInterval(async () => {
            // 1. Fetch live data (last 2 mins)
            try {
                const res = await fetch("/api/data?range=2m");
                if (res.ok) {
                    const json = await res.json();
                    setHistory(json.map((row: any) => ({
                        temperature: row.temperature,
                        humidity: row.humidity,
                        co2: row.co2,
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
                    setErrors(json.map((e: any) => ({
                        message: e.message,
                        timestamp: new Date(e.timestamp),
                    })));
                }
            } catch {
                //silently ignore error-fetch failures
            }
        }, 5000); // Poll strictly every 5 seconds

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

    return {history, errors, clearError, clearAllErrors}; //return data history, last update, and error status
}