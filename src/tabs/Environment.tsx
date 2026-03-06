import { ScidSample } from "../types";
import MapDataToGraph from "../utils/GraphTransform";
import { Graph } from "../components/Graph";
import { useState } from "react";

interface EnvironmentalTabProps {
    scd: ScidSample[];
}

export default function EnvironmentTab({scd}: EnvironmentalTabProps) {
  const tempData = MapDataToGraph(scd, s => s.temperature);
  const humidData = MapDataToGraph(scd, s => s.humidity);
  const co2Data = MapDataToGraph(scd, s => s.co2);
  
  const graphs = [
    {key: 'temp', label: 'Temperature (°C)', data: tempData, yPadding: 2, yStep: 2, stroke: 'var(--pink)', unit: '°C'},
    {key: 'humidity', label: 'Humidity (%)', data: humidData, yPadding: 2, yStep: 2, stroke: 'var(--blue)', unit: '%'},
    {key: 'co2', label: 'CO2 (ppm)', data: co2Data, yPadding: 25, yStep: 25, stroke: 'var(--green)', unit: 'ppm'},
  ];

  const [visibleGraphs, setVisibleGraphs] = useState(
    Object.fromEntries(graphs.map(g => [g.key, true]))
  );

  const [dropDownOpen, setDropDownOpen] = useState(false)

  const toggleGraph = (key: string) => {
    setVisibleGraphs(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <div>
      {/* Dropdown */}
      <div className="dropdown">
        <button className="dropdown-btn" onClick={() => setDropDownOpen(!dropDownOpen)}>
          Graphs <span className={dropDownOpen ? 'dropdown-arrow open' : 'dropdown-arrow'}>▼</span>
        </button>
        {dropDownOpen && (
          <div className="dropdown-menu">
            {graphs.map(graph => (
            <label key={graph.key} className="checkbox-label">
              <input 
                type="checkbox" 
                checked={visibleGraphs[graph.key]} 
                onChange={() => toggleGraph(graph.key)}
              />
              <span className="checkmark"></span>
                {graph.label}
            </label>
            ))}
          </div>
        )}
      </div>
      {/* Dropdown */}

      {/* Graphs */}
      <div className="graphs-container">
        {graphs.map(graph => (
        visibleGraphs[graph.key] && (
        <div key={graph.key} className="graph-card">
          <Graph 
            label={graph.label}
            data={graph.data}
            yPadding={graph.yPadding}
            yStep={graph.yStep}
            interval={5}
            displayTime={120}
            numTicks={4}
            stroke={graph.stroke}
            unit={graph.unit}
          />
        </div>
        )))}
      </div>
      {/* Graphs */}
    </div>
  )
}