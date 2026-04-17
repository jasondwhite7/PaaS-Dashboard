import { useEffect, useState } from "react";
import { GraphPoint, SensorRow, TimeRangeKey } from "../types";

/**
 * Hook to fetch historical (longer-than-2min) data from the backend.
 * 
 * For the 2-minute live view, the main ScidData hook is used.
 * This hook is for when the user selects 1h, 6h, 24h, or 7d —
 * it fetches downsampled data from the database.
 * 
 * @param timeRange - which time range to fetch ('1h', '6h', '24h', '7d')
 * @param selector - which field to extract (e.g., row => row.temperature)
 * @param enabled - whether to actually fetch (false for '2m' since we use live data)
 */
export default function useHistoricalData(
    timeRange: TimeRangeKey,
    selector: (row: SensorRow) => number,
    enabled: boolean
): GraphPoint[] {
    const [data, setData] = useState<GraphPoint[]>([]);

    useEffect(() => {
        if (!enabled) {
            setData([]);
            return;
        }

        //Fetch immediately on mount/range change
        fetchData();

        //Then poll at an appropriate rate depending on the range
        //Shorter ranges refresh more frequently
        const pollRates: Record<string, number> = {
            '1h': 30000,   // every 30 seconds
            '6h': 60000,   // every 1 minute
            '24h': 120000, // every 2 minutes
            '7d': 300000,  // every 5 minutes
        };
        const pollRate = pollRates[timeRange] || 60000;
        const interval = setInterval(fetchData, pollRate);

        return () => clearInterval(interval);

        async function fetchData() {
            try {
                const res = await fetch(`/api/data?range=${timeRange}`);
                if (!res.ok) return;

                const json: SensorRow[] = await res.json();
                const points: GraphPoint[] = json.map(row => ({
                    time: new Date(row.timestamp),
                    value: selector(row),
                }));

                setData(points);
            } catch {
                //silently ignore — will retry on next poll
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRange, enabled]);

    return data;
}
