import { ScidSample } from "../types"; 
import { GraphPoint } from "../types"; 

export default function MapDataToGraph(
    history: ScidSample[], 
    selector: (sample: ScidSample) => number | null
): GraphPoint[] {
    return history
        .map(sample => {
            const val = selector(sample);
            return {
                time: new Date(sample.timestamp),
                value: (typeof val === 'number' && !isNaN(val)) ? val : null as any,
            };
        })
        .filter(p => p.value !== null && !isNaN(p.value));
}