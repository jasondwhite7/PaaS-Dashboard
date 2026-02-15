import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

export interface GraphPoint {
    time: Date;
    value: number;
}

interface GraphProps {
    label: string;
    data: GraphPoint[];
    yPadding: number;
    yStep: number;
    interval: number;
    displayTime: number;
}

const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;
const roundDown = (value: number, step: number) => Math.floor(value / step) * step;

const GetYDomain = (data: GraphPoint[], padding: number, step: number) => {
    if (data.length === 0) {
        return [0, padding];
    }
    const points = data.map(d => d.value);
    const min = roundDown(Math.min(...points) - padding, step);
    const max = roundUp(Math.max(...points) + padding, step);
    return [min, max];
}

const GenerateYTicks = (min: number, max: number, step: number) => {
    const ticks = [];
    for (let i = min; i <= max; i += step) {
        ticks.push(i);
    }
    return ticks;
}

const GenerateXTicks = (data: GraphPoint[]): number[] => {
    if (data.length === 0) return [];

    const newest = data[data.length - 1].time.getTime();
    const oldest = data[0].time.getTime();

    const ticks = [oldest];
    
    // Add intermediate ticks only if they're within the data range
    const tick90 = newest - 90000;
    const tick60 = newest - 60000;
    const tick30 = newest - 30000;
    
    if (tick90 > oldest) ticks.push(tick90);
    if (tick60 > oldest) ticks.push(tick60);
    if (tick30 > oldest) ticks.push(tick30);
    
    ticks.push(newest);

    return ticks;
};

export function Graph({label, data, yPadding, yStep, interval, displayTime}: GraphProps) {
    const numPoints = displayTime / interval;
    data = data.slice(-numPoints);
    
    if (data.length === 0) {
        return <div><h3>{label}</h3><p>No data available</p></div>;
    }
    
    const yDomain = GetYDomain(data, yPadding, yStep);

    const chartData = data.map(point => ({
        time: point.time.getTime(),
        value: point.value
    }));
    
    const xTicks = GenerateXTicks(data);
    const oldest = data[0].time.getTime();
    const newest = data[data.length - 1].time.getTime();
    
    return (
        <div>
            <h3>{label}</h3>
            <LineChart width={600} height={200} data={chartData} margin={{ top: 5, right: 40, bottom: 5, left: 5 }}>
                <XAxis 
                    dataKey="time"
                    type="number"
                    domain={[oldest, newest]}
                    ticks={xTicks}
                    tickFormatter={t => new Date(t).toLocaleTimeString([], {hour12: false})}
                />
                <YAxis 
                    domain={yDomain} 
                    tickFormatter={value => Math.round(value).toFixed(2)} 
                    allowDecimals={false}
                    ticks={GenerateYTicks(yDomain[0], yDomain[1], yStep)}
                />
                <Tooltip labelFormatter={t => new Date(t).toLocaleTimeString([], {hour12: false})}/>
                <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
                <CartesianGrid stroke="#ccc" />
            </LineChart>
        </div>
    );
}