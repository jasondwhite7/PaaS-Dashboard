import { GraphPoint } from "../types";

export const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;
export const roundDown = (value: number, step: number) => Math.floor(value / step) * step;

export const getYDomain = (data: GraphPoint[], padding: number, step: number) => {
    if (data.length === 0) {
        return [0, padding];
    }
    const points = data.map(d => d.value);
    const min = roundUp(Math.min(...points) - padding, step);
    const max = roundDown(Math.max(...points) + padding, step);
    return [min, max];
}

export const generateYTicks = (min: number, max: number, step: number) => {
    const ticks = [];
    for (let i = min; i <= max; i += step) {
        ticks.push(i);
    }
    return ticks;
}

export const generateXTicks = (data: GraphPoint[], numTicks: number, displayTime: number): number[] => {
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