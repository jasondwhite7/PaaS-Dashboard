import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GraphPoint, TimeRangeKey } from "../types";
import { getYDomain, generateXTicks, generateYTicks } from "../utils/GraphHelpers";
import { useState } from "react";
import useHistoricalData from "../hooks/useHistoricalData";
import { SensorRow } from "../types";

// Smart tick & format configuration per time range
const TIME_RANGE_CONFIG: Record<string, { 
    value: string; 
    label: string; 
    seconds: number; 
    numTicks: number;
    formatTick: (t: number) => string;
}> = {
    '2m': { 
        value: '2m', label: '2 Minutes', seconds: 120, numTicks: 4,
        formatTick: (t) => {
            const d = new Date(t);
            return `${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
        }
    },
    '1h': { 
        value: '1h', label: '1 Hour', seconds: 3600, numTicks: 4,
        formatTick: (t) => {
            const d = new Date(t);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
    },
    '6h': { 
        value: '6h', label: '6 Hours', seconds: 21600, numTicks: 4,
        formatTick: (t) => {
            const d = new Date(t);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
    },
    '24h': { 
        value: '24h', label: '24 Hours', seconds: 86400, numTicks: 4,
        formatTick: (t) => {
            const d = new Date(t);
            return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        }
    },
    '7d': { 
        value: '7d', label: '7 Days', seconds: 604800, numTicks: 4,
        formatTick: (t) => {
            const d = new Date(t);
            return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
        }
    },
};

interface GraphProps {
    label: string;
    data: GraphPoint[];        // live data (last 2 minutes from ScidData hook)
    yPadding: number;
    yStep: number;
    stroke: string;
    unit: string;
    dataSelector: (row: SensorRow) => number;  // which field to extract for historical queries
}

export function Graph({label, data, yPadding, yStep, stroke, unit, dataSelector}: GraphProps) {
    const [timeRange, setTimeRange] = useState<TimeRangeKey>('2m');

    // For ranges > 2m, fetch historical data from the backend database
    const isHistorical = timeRange !== '2m';
    const historicalData = useHistoricalData(timeRange, dataSelector, isHistorical);

    // Use live data for 2m, historical data for everything else
    let activeData: GraphPoint[];
    if (isHistorical) {
        activeData = historicalData;
    } else {
        // For live 2m view, use the data as provided by the backend (already 2m)
        activeData = data;
    }

    const config = TIME_RANGE_CONFIG[timeRange];
    const activeDisplayTime = config.seconds;
    const activeNumTicks = config.numTicks;
    const formatTick = config.formatTick;

    if (activeData.length === 0) {
        return <div><h3>{label}</h3><p>No data available</p></div>;
    }
    
    // Always use the latest point from the live data stream for the "Current" display
    // even if the chart is showing historical data.
    const latestLivePoint = data.length > 0 ? data[data.length - 1] : activeData[activeData.length - 1];
    
    const yDomain = getYDomain(activeData, yPadding, yStep);

    const chartData = activeData.map(point => ({
        time: point.time.getTime(),
        value: point.value
    }));
    
    const xTicks = generateXTicks(activeData, activeNumTicks, activeDisplayTime);
    const oldest = activeData[0].time.getTime();
    const newest = activeData[activeData.length - 1].time.getTime();
    
    return (
        <div>
            <h3>
                <span style={{color: 'var(--text)'}}>{label}</span>
                <span style={{color: 'var(--text)'}}>Current: {latestLivePoint.value.toFixed(2)} {unit}</span>
            </h3>

            <select 
                value={timeRange} 
                onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
                style={{marginBottom: '10px'}}
            >
                {Object.values(TIME_RANGE_CONFIG).map(range => (
                    <option key={range.value} value={range.value}>{range.label}</option>
                ))}
            </select>

            <LineChart width={400} height={200} data={chartData} 
            margin={{ top: 0, right: 35, bottom: 0, left: 15 }}>
                <XAxis 
                    key={`${oldest}-${newest}`}
                    dataKey="time"
                    type="number"
                    domain={[oldest, newest]}
                    ticks={xTicks}
                    tickFormatter={formatTick}
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
                    backgroundColor: "var(--background2)",
                    border: "1px solid var(--background4)",
                    borderRadius: "8px"
                }}/>
                <Line type="monotone" dataKey="value" stroke={stroke} dot={false} strokeWidth={2}/>
                <CartesianGrid stroke="var(--text)" strokeDasharray="3 3" strokeOpacity={0.5}/>
            </LineChart>
        </div>
    );
}