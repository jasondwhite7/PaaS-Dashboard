interface BatteryProps{
    number: number;
    stroke: string;
    width: number;
}

export function Battery({number, stroke, width}: BatteryProps) {
    const fillStyle = {
        '--fill-height': `${width}%`,
        backgroundColor: stroke
    } as React.CSSProperties;
    
    return (
        <div className="battery">
            <div className="battery-shell">
                <div className="battery-fill" style={fillStyle}></div>
            </div>
            <span>Battery {number}</span>
        </div>
    );
}