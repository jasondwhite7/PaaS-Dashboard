import { ScidSample } from "../types"; 
import { GraphPoint } from "../types"; 

export default function MapDataToGraph(history: ScidSample[], 
    selector: (sample: ScidSample) => number):GraphPoint[] {
    return history.map(sample => ({
        time: new Date(sample.timestamp), value: selector(sample),
    }));
}