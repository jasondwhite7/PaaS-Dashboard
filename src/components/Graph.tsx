import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { GraphPoint, TimeRangeKey, ScidSample } from "../types";
import { calculateYAxis, generateXTicks } from "../utils/GraphHelpers";
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
    dataSelector: (row: SensorRow) => number | null;  // which field to extract for historical queries
    isTemperature?: boolean;
    rawHistory?: ScidSample[]; // raw samples to detect consecutive missed readings
}

export function Graph({ label, data, yPadding, yStep, stroke, unit, dataSelector, isTemperature, rawHistory }: GraphProps) {
    const [timeRange, setTimeRange] = useState<TimeRangeKey>('2m');
    const [isFahrenheit, setIsFahrenheit] = useState(false);

    const isTemp = isTemperature ?? (unit === '°C' || label.toLowerCase().includes('temp'));

    // Dynamic unit and title label based on toggle
    const displayUnit = (isTemp && isFahrenheit) ? '°F' : unit;
    const displayLabel = isTemp
        ? (isFahrenheit ? label.replace('°C', '°F') : label)
        : label;

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

    // Determine consecutive missed readings and last valid reading
    let lastValidPoint: GraphPoint | null = null;
    let consecutiveMisses = 0;

    if (rawHistory && rawHistory.length > 0) {
        for (let i = rawHistory.length - 1; i >= 0; i--) {
            const val = dataSelector(rawHistory[i] as any);
            if (val === null || typeof val !== 'number' || isNaN(val)) {
                consecutiveMisses++;
            } else {
                if (!lastValidPoint) {
                    lastValidPoint = {
                        time: new Date(rawHistory[i].timestamp),
                        value: val,
                    };
                }
                break;
            }
        }

        // Check if incoming polling has stalled completely (> 7s since last live sample)
        const latestTime = rawHistory[rawHistory.length - 1].timestamp.getTime();
        const secondsSinceLast = (Date.now() - latestTime) / 1000;
        if (secondsSinceLast > 7) {
            consecutiveMisses += Math.floor(secondsSinceLast / 5);
        }
    }

    if (!lastValidPoint && data.length > 0) {
        lastValidPoint = data[data.length - 1];
    }
    if (!lastValidPoint && activeData.length > 0) {
        lastValidPoint = activeData[activeData.length - 1];
    }

    // "only make it 'Sensor Offline / No Data' if more than 3 consecutive no readings have been received"
    const isOffline = (rawHistory ? rawHistory.length === 0 : data.length === 0)
        ? (activeData.length === 0)
        : consecutiveMisses > 3;

    const hasValidLiveValue = !isOffline && lastValidPoint !== null && typeof lastValidPoint.value === 'number' && !isNaN(lastValidPoint.value);
    const liveValue = (hasValidLiveValue && lastValidPoint !== null) ? lastValidPoint.value : 0;
    const displayCurrentValue = (isTemp && isFahrenheit)
        ? liveValue * 1.8 + 32
        : liveValue;

    // Convert plotted points to Fahrenheit if active
    const convertedActiveData = (isTemp && isFahrenheit)
        ? activeData.map(p => ({
            time: p.time,
            value: p.value * 1.8 + 32,
        }))
        : activeData;

    const baseStep = (isTemp && isFahrenheit) ? 4 : yStep;
    const { domain: yDomain, step: computedStep, ticks: yTicks } = calculateYAxis(convertedActiveData, baseStep, 5);

    const chartData = convertedActiveData.map(point => ({
        time: point.time.getTime(),
        value: point.value
    }));

    const xTicks = generateXTicks(convertedActiveData, activeNumTicks, activeDisplayTime);
    const oldest = convertedActiveData.length > 0 ? convertedActiveData[0].time.getTime() : 0;
    const newest = convertedActiveData.length > 0 ? convertedActiveData[convertedActiveData.length - 1].time.getTime() : 0;

    return (
        <div>
            <h3>
                <span style={{ color: 'var(--text)' }}>{displayLabel}</span>
                <span style={{ color: 'var(--text)' }}>
                    Current: {hasValidLiveValue ? `${displayCurrentValue.toFixed(2)} ${displayUnit}` : 'Sensor Offline / No Data'}
                </span>
            </h3>

            <div className="graph-card-controls">
                <select
                    value={timeRange}
                    onChange={(e) => setTimeRange(e.target.value as TimeRangeKey)}
                >
                    {Object.values(TIME_RANGE_CONFIG).map(range => (
                        <option key={range.value} value={range.value}>{range.label}</option>
                    ))}
                </select>

                {isTemp && (
                    <label className="temp-toggle-label" title="Toggle Fahrenheit (°F)">
                        <input
                            type="checkbox"
                            checked={isFahrenheit}
                            onChange={(e) => setIsFahrenheit(e.target.checked)}
                        />
                        <span className="checkmark"></span>
                        <span style={{ color: isFahrenheit ? 'var(--text)' : 'var(--text-muted)' }}>°F</span>
                    </label>
                )}
            </div>

            {activeData.length === 0 ? (
                <div style={{
                    height: '200px',
                    width: '400px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center',
                    color: 'var(--text-muted)',
                    border: '1px dashed var(--background3)',
                    borderRadius: '8px',
                    margin: '10px 0',
                    padding: '0 20px',
                    boxSizing: 'border-box'
                }}>
                    <p style={{ margin: 0, fontSize: '14px', color: 'var(--text)' }}>
                        No readings in the past {config.label}.
                    </p>
                    {timeRange === '2m' && (
                        <p style={{ margin: '8px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                            Select an older time range above (e.g. 1 Hour) to view historical data.
                        </p>
                    )}
                </div>
            ) : (
                <LineChart width={400} height={200} data={chartData}
                    margin={{ top: 15, right: 25, bottom: 0, left: 30 }}>
                    <XAxis
                        key={`${oldest}-${newest}`}
                        dataKey="time"
                        type="number"
                        domain={[oldest, newest]}
                        ticks={xTicks}
                        tickFormatter={formatTick}
                        interval={0}
                        tick={{ dy: 10 }}
                        strokeDasharray="3 3"
                        stroke="var(--text)"
                        strokeOpacity={0.2}
                    />
                    <YAxis
                        width={45}
                        domain={yDomain}
                        tickFormatter={value => computedStep < 1 ? Number(value).toFixed(1) : Math.round(value).toString()}
                        allowDecimals={false}
                        interval={0}
                        ticks={yTicks}
                        tick={{ dx: -5 }}
                        strokeDasharray="3 3"
                        stroke="var(--text)"
                        strokeOpacity={0.2}
                    />
                    <Tooltip
                        labelFormatter={t => new Date(t).toLocaleTimeString([], { hour12: false })}
                        formatter={(value) => value ? `${Number(value).toFixed(2)} ${displayUnit}` : 'N/A'}
                        contentStyle={{
                            backgroundColor: "var(--background2)",
                            border: "1px solid var(--background4)",
                            borderRadius: "8px"
                        }} />
                    <Line type="monotone" dataKey="value" stroke={stroke} dot={false} strokeWidth={2} />
                    <CartesianGrid stroke="var(--text)" strokeDasharray="3 3" strokeOpacity={0.5} />
                </LineChart>
            )}
        </div>
    );
}