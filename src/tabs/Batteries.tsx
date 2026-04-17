import { Battery } from "../components/Battery";

export default function BatteryTab() {
    const legendItems = [
        {label: 'Charging', color: 'var(--green)'},
        {label: 'Idle', color: 'var(--blue)'},
        {label: 'Discharging', color: 'var(--orange)'},
        {label: 'Dead', color: 'var(--pink)'}
    ];

    const batteries = Array.from({length: 16}, (_, i) => ({
        number: i + 1,
        stroke: 'var(--green)',
        percentage: Math.floor(Math.random() * 100)
    }));

    return (
        <div>
            {/* Legend */}
            <div className="legend">
                <h3>Battery Status</h3>
                <div className="legend-items">
                    {legendItems.map((item, index) => (
                        <div key={index} className="legend-item">
                            <div className="legend-color" style={{backgroundColor: item.color}}></div>
                            <span>{item.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Batteries */}
            <div className="batteries-container">
                <div className="batteries">
                    {batteries.map((item, index) => (
                        <Battery key={index} number={index + 1} stroke={item.stroke} width={item.percentage}/>
                    ))}
                </div>
            </div>
        </div>
    )
}