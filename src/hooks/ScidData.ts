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

//function that returns the data history and the time at which it updated
export default function GetScidData() {
    const [history, setHistory] = useState<ScidSample[]>([]); //sensor data
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null); //last update

    //useEffect because this runs after the component renders
    useEffect(() => {
        //5 second interval
        const interval = setInterval(async () => {
        //res - response from the Arduino's IP
        const res = await fetch("http://100.69.173.129"); // Arduino IP
        const json: ScidData = await res.json(); //wait until it receives a json
        setHistory(prev => [...prev, {...json, timestamp: new Date()}]); //add the current data and time
        setLastUpdate(new Date()); //set the last update to the current data
    }, 5000); // poll every 5 second

    return () => clearInterval(interval); //unmount if needed
  }, []); 
    
  return {history, lastUpdate}; //return data history and last update
}   