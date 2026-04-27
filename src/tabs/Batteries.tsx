import { Battery } from "../components/Battery";

export default function BatteryTab() {
    const legendItems = [
        {label: 'Charging', color: 'var(--green)'},
        {label: 'Idle', color: 'var(--blue)'},
        {label: 'Discharging', color: 'var(--orange)'},
        {label: 'Dead', color: 'var(--pink)'}
    ];

    // Generate mock batteries on every render to simulate live incoming data
    const batteries = Array.from({length: 16}, (_, i) => {
        const percentage = Math.floor(Math.random() * 100);
        
        // Assign a random state to show off the visual design
        let stroke = 'var(--green)'; // Default charging
        if (percentage < 5) {
            stroke = 'var(--pink)'; // Dead
        } else {
            const states = ['var(--green)', 'var(--blue)', 'var(--orange)'];
            stroke = states[Math.floor(Math.random() * states.length)];
        }

        return {
            number: i + 1,
            stroke,
            percentage
        };
    });

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