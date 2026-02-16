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
    numTicks: number;
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

const GenerateXTicks = (data: GraphPoint[], numTicks: number, displayTime: number): number[] => {
    if (data.length === 0) return [];
    if (data.length === 1) return [data[0].time.getTime()];

    const newest = data[data.length - 1].time.getTime();
    const oldest = data[0].time.getTime();
    const timeRange = newest - oldest;
    const tickInterval = (displayTime / (numTicks - 1)) * 1000
    if (timeRange < tickInterval) {
        return [oldest, newest];
    }

    const ticks = [oldest];
    
    // Generate intermediate ticks working backwards from newest in 30 second increments
    // numTicks includes oldest and newest, so we need (numTicks - 2) intermediate ticks    
    for (let i = numTicks - 2; i >= 1; i--) {
        const tickTime = newest - (i * tickInterval);
        if (tickTime > oldest && !ticks.includes(tickTime)) {
            ticks.push(tickTime);
        }
    }
    
    // Add newest
    if (!ticks.includes(newest)) {
        ticks.push(newest);
    }

    // Remove duplicates and sort (just to be extra safe)
    return Array.from(new Set(ticks)).sort((a, b) => a - b);
};

export function Graph({label, data, yPadding, yStep, interval, displayTime, numTicks}: GraphProps) {
    const numPoints = displayTime / interval;
    data = data.slice(-(numPoints + 1));
    
    if (data.length === 0) {
        return <div><h3>{label}</h3><p>No data available</p></div>;
    }
    
    const yDomain = GetYDomain(data, yPadding, yStep);

    const chartData = data.map(point => ({
        time: point.time.getTime(),
        value: point.value
    }));
    
    const xTicks = GenerateXTicks(data, numTicks, displayTime);
    const oldest = data[0].time.getTime();
    const newest = data[data.length - 1].time.getTime();
    
    return (
        <div>
            <h3>{label}</h3>
            <LineChart width={600} height={200} data={chartData} 
            margin={{ top: 5, right: 40, bottom: 5, left: 5 }}>
                <XAxis 
                    key={`${oldest}-${newest}`}
                    dataKey="time"
                    type="number"
                    domain={[oldest, newest]}
                    ticks={xTicks}
                    tickFormatter={t => new Date(t).toLocaleTimeString([], {hour12: false})}
                    interval={0}
                />
                <YAxis 
                    domain={yDomain} 
                    tickFormatter={value => Math.round(value).toFixed(2)} 
                    allowDecimals={false}
                    ticks={GenerateYTicks(yDomain[0], yDomain[1], yStep)}
                />
                <Tooltip labelFormatter={t => new Date(t).toLocaleTimeString([], {hour12: false})}/>
                <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2}/>
                <CartesianGrid stroke="#ccc" />
            </LineChart>
        </div>
    );
}