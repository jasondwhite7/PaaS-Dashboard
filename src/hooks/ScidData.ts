import { clear } from "console";
import { useEffect, useState } from "react";

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

//function that returns the data history and the time at which it updated
export default function GetScidData() {
    const [history, setHistory] = useState<ScidSample[]>([]); //sensor data
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null); //last update
    const [errors, setErrors] = useState<ErrorLog[]>([]); //track errors

    //useEffect because this runs after the component renders
    useEffect(() => {
        //5 second interval
        const interval = setInterval(async () => {
            try {
                //res - response from the Arduino's IP
                const res = await fetch("http://100.69.173.129", {
                    signal: AbortSignal.timeout(4000) // 4 second timeout
                });
                
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`);
                }
                
                const text = await res.text(); //get raw response first
                
                if (!text || text.trim() === '') {
                    throw new Error('Empty response from Arduino');
                }
                
                const json: ScidData = JSON.parse(text); //parse manually
                
                // Validate the data has required fields
                if (typeof json.temperature !== 'number' || 
                    typeof json.humidity !== 'number' || 
                    typeof json.co2 !== 'number') {
                    throw new Error('Invalid data format from Arduino');
                }
                
                setHistory(prev => [...prev, {...json, timestamp: new Date()}]); //add the current data and time
                setLastUpdate(new Date()); //set the last update to the current data                
            } catch (err) {
                console.error('Failed to fetch sensor data:', err);
                const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                setErrors(prev => [...prev, { message: errorMessage, timestamp: new Date() }]);
                // Don't update history - just skip this data point
            }
        }, 5000); // poll every 5 second

        return () => clearInterval(interval); //unmount if needed
    }, []); 
    
    const clearError = (index: number) => {
        setErrors(prev => prev.filter((_, i) => i !== index));
    };
    
    const clearAllErrors = () => setErrors([]);

    return {history, lastUpdate, errors, clearError, clearAllErrors}; //return data history, last update, and error status
}