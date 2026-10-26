import { GraphPoint } from "../types";

export const roundUp = (value: number, step: number) => Math.ceil(value / step) * step;
export const roundDown = (value: number, step: number) => Math.floor(value / step) * step;

/**
 * Calculates evenly-spaced Y-axis domain, step size, and ticks capped at maxTicks (default 5).
 * Guarantees all ticks and bounds are clean multiples of baseStep.
 */
export const calculateYAxis = (
    data: GraphPoint[],
    baseStep: number,
    maxTicks: number = 5
): { domain: [number, number]; step: number; ticks: number[] } => {
    const stepUnit = baseStep > 0 ? baseStep : 1;
    const maxIntervals = Math.max(1, maxTicks - 1); // 5 ticks = 4 intervals

    if (data.length === 0) {
        const defaultMax = stepUnit * maxIntervals;
        const ticks: number[] = [];
        for (let i = 0; i <= maxIntervals; i++) {
            ticks.push(Number((i * stepUnit).toFixed(4)));
        }
        return { domain: [0, defaultMax], step: stepUnit, ticks };
    }

    const points = data.map(d => d.value);
    const dataMin = Math.min(...points);
    const dataMax = Math.max(...points);

    // Initial boundary rounding to baseStep
    let min = roundDown(dataMin, stepUnit);
    let max = roundUp(dataMax, stepUnit);

    // Flat line handling (constant values)
    if (min === max) {
        min = Math.max(0, min - stepUnit * 2);
        max = max + stepUnit * 2;
    }

    const range = max - min;
    const intervals = Math.round(range / stepUnit);

    let step = stepUnit;
    if (intervals > maxIntervals) {
        // Calculate the minimum multiple of baseStep needed to span the range in <= 4 intervals
        step = Math.ceil((range / maxIntervals) / stepUnit) * stepUnit;
        const targetSpan = maxIntervals * step;
        const diff = targetSpan - range;

        // Distribute extra span in clean steps of baseStep
        const diffBelow = Math.floor((diff / 2) / stepUnit) * stepUnit;
        const diffAbove = diff - diffBelow;

        min = min - diffBelow;
        max = max + diffAbove;
    }

    const count = Math.round((max - min) / step);
    const ticks: number[] = [];
    for (let i = 0; i <= count; i++) {
        ticks.push(Number((min + i * step).toFixed(4)));
    }

    return { domain: [min, max], step, ticks };
};

export const getYDomain = (data: GraphPoint[], padding: number, step: number) => {
    return calculateYAxis(data, step, 5).domain;
};

export const generateYTicks = (min: number, max: number, step: number) => {
    const ticks = [];
    if (step <= 0 || min >= max) return [min];
    const count = Math.round((max - min) / step);
    for (let i = 0; i <= count; i++) {
        const val = Number((min + i * step).toFixed(4));
        ticks.push(val);
    }
    return ticks;
};

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