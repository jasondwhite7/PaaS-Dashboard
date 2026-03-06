interface BatteryProps{
    number: number;
    stroke: string;
}

export function Battery({number, stroke}: BatteryProps) {
    
    return (
        <div className="battery">
            <div className="battery-color" style={{backgroundColor: stroke}}></div>
            <span>Battery {number}</span>
        </div>
    );
}