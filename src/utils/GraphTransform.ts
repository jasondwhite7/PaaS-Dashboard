import { ScidSample } from "../hooks/ScidData";
import { GraphPoint } from "../components/Graph";

export default function MapDataToGraph(history: ScidSample[], 
    selector: (sample: ScidSample) => number):GraphPoint[] {
    return history.map(sample => ({
        time: new Date(sample.timestamp), value: selector(sample),
    }));
}