import { Battery } from "../components/Battery";

export default function BatteryTab() {
    const legendItems = [
        {label: 'Charging', color: 'var(--green)'},
        {label: 'Idle', color: 'var(--blue)'},
        {label: 'Discharging', color: 'var(--orange)'},
        {label: 'Dead', color: 'var(--pink)'}
    ];

    const batteries = [
        {number: 1, stroke: 'var(--green)'},
        {number: 2, stroke: 'var(--blue)'},
        {number: 3, stroke: 'var(--orange)'},
        {number: 4, stroke: 'var(--pink)'},
        {number: 5, stroke: 'var(--blue)'},
        {number: 6, stroke: 'var(--green)'},
        {number: 7, stroke: 'var(--green)'},
        {number: 8, stroke: 'var(--green)'},
        {number: 9, stroke: 'var(--green)'},
        {number: 10, stroke: 'var(--orange)'},
        {number: 11, stroke: 'var(--pink)'},
        {number: 12, stroke: 'var(--pink)'},
        {number: 13, stroke: 'var(--orange)'},
        {number: 14, stroke: 'var(--green)'},
        {number: 15, stroke: 'var(--green)'},
        {number: 16, stroke: 'var(--green)'}
    ];

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
                        <Battery key={index} number={index + 1} stroke={item.stroke}/>
                    ))}
                </div>
            </div>
        </div>
    )
}