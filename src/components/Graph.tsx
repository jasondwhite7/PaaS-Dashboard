import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GraphPoint } from "../types";
import { getYDomain, generateXTicks, generateYTicks } from "../utils/GraphHelpers";

interface GraphProps {
    label: string;
    data: GraphPoint[];
    yPadding: number;
    yStep: number;
    interval: number;
    displayTime: number;
    numTicks: number;
    stroke: string;
    unit: string;
}

export function Graph({label, data, yPadding, yStep, interval, displayTime, numTicks, stroke, unit}: GraphProps) {
    const numPoints = displayTime / interval;
    data = data.slice(-(numPoints + 1));
    
    if (data.length === 0) {
        return <div><h3>{label}</h3><p>No data available</p></div>;
    }
    
    const yDomain = getYDomain(data, yPadding, yStep);

    const chartData = data.map(point => ({
        time: point.time.getTime(),
        value: point.value
    }));
    
    const xTicks = generateXTicks(data, numTicks, displayTime);
    const oldest = data[0].time.getTime();
    const newest = data[data.length - 1].time.getTime();
    
    return (
        <div>
            <h3>
                <span>{label}</span>
                <span>Current: {data[data.length - 1].value.toFixed(2)} {unit}</span>
            </h3>
            <LineChart width={400} height={200} data={chartData} 
            margin={{ top: 0, right: 20, bottom: 0, left: 15 }}>
                <XAxis 
                    key={`${oldest}-${newest}`}
                    dataKey="time"
                    type="number"
                    domain={[oldest, newest]}
                    ticks={xTicks}
                    tickFormatter={t => {
                        const date = new Date(t);
                        const min = date.getMinutes().toString().padStart(2, '0');
                        const sec = date.getSeconds().toString().padStart(2, '0');
                        return `${min}:${sec}`;
                    }}
                    interval={0}
                    tick={{dy:10}}
                    strokeDasharray="3 3"
                    stroke="var(--text)"
                    strokeOpacity={0.2}
                />
                <YAxis 
                    domain={yDomain} 
                    tickFormatter={value => Math.round(value).toFixed(2)} 
                    allowDecimals={false}
                    ticks={generateYTicks(yDomain[0], yDomain[1], yStep)}
                    tick={{dx:-10}}
                    strokeDasharray="3 3"
                    stroke="var(--text)"
                    strokeOpacity={0.2}
                />
                <Tooltip 
                labelFormatter={t => new Date(t).toLocaleTimeString([], {hour12: false})}
                formatter={(value) => value ? `${Number(value).toFixed(2)} ${unit}` : 'N/A'}
                contentStyle={{
                    backgroundColor: "var(--background2",
                    border: '1px solid "var(--background4"',
                    borderRadius: "8px"
                }}/>
                <Line type="monotone" dataKey="value" stroke={stroke} dot={false} strokeWidth={2}/>
                <CartesianGrid stroke="var(--text)" strokeDasharray="3 3" strokeOpacity={0.5}/>
            </LineChart>
        </div>
    );
}