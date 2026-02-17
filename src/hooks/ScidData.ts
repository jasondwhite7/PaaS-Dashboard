import { useEffect, useState } from "react";
import { ScidData, ScidSample, ErrorLog } from "../index/types";


//function that returns the data history and the time at which it updated
export default function GetScidData() {
    const [history, setHistory] = useState<ScidSample[]>([]); //sensor data
    const [errors, setErrors] = useState<ErrorLog[]>([]); //track errors

    //useEffect because this runs after the component renders
    useEffect(() => {
        //5 second interval
        const interval = setInterval(async () => {
            try {
                //res - response from the Arduino's IP
                const res = await fetch("http://100.69.172.98", {
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

    return {history, errors, clearError, clearAllErrors}; //return data history, last update, and error status
}