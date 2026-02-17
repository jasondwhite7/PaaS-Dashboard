import { ScidSample } from "../index/types"; 
import { GraphPoint } from "../index/types"; 

export default function MapDataToGraph(history: ScidSample[], 
    selector: (sample: ScidSample) => number):GraphPoint[] {
    return history.map(sample => ({
        time: new Date(sample.timestamp), value: selector(sample),
    }));
}