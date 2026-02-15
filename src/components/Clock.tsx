import { useEffect, useState } from "react";

//component which records the date and time
export default function Clock() {
    //string to hold the date and time
    const [time, setTime] = useState("");

    //basically a loop to get the date and time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date().toLocaleString([], {hour12: false}));
        }, 1000);

        return () => clearInterval(interval) //unmount if needed
    }, []);
    return <div>{time}</div>; //html element of the date and time
}