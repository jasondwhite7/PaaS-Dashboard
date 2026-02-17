import GetScidData from "./hooks/ScidData";
import Clock from "./components/Clock";
import {Graph} from "./components/Graph";
import MapDataToGraph from "./utils/GraphTransform";
import  "./App.css"

//main app function
export default function App() {
  //get the data from the scd and name it scd
  const {history: scd, errors: scdErrors, clearError: scdClearError, clearAllErrors: scdClearAllErrors} = GetScidData();

  const tempData = MapDataToGraph(scd, s => s.temperature);
  const humidData = MapDataToGraph(scd, s => s.humidity);
  const co2Data = MapDataToGraph(scd, s => s.co2);
  return (
    <div>
      <div className="header">
        <div className="logo-section">
          <img src="/purdue-logo.png" alt="logo" width={83} height={45}/>
          <img src="/search-logo.png" alt="logo" width={67} height={67}/>
        <h1>PAAS Dashboard</h1>
      </div>
      <Clock />
      </div>
      {/* Show error messages */}
      {scdErrors.length > 0 && (
        <div className="error-section">
          {scdErrors.length > 1 && (
            <button className="dismiss-btn" onClick={scdClearAllErrors} >
              Clear All Errors ({scdErrors.length})
            </button>
          )}
          {scdErrors.map((error, index) => (
            <div key={index} className="error-item">
              <span>[{error.timestamp.toLocaleTimeString()}] {error.message}</span>
              <button className="dismiss-btn" onClick={() => scdClearError(index)}>Dismiss</button>
            </div>
          ))}
        </div>
      )}
      {/*if data exists create graphs, if not, write loading...*/}
      {scd ? (
        <div className="graphs-container">
          <div className="graph-card">
            <Graph label="Temperature (°C)" data={tempData} yPadding={2} yStep={2} interval={5} displayTime={120} numTicks={4} stroke="#FF0000" unit="°C"/>
          </div>
          <div className="graph-card">
            <Graph label="Humidity (%)" data={humidData} yPadding={2} yStep={2} interval={5} displayTime={120} numTicks={4} stroke="#0000FF" unit="%"/>
          </div>
          <div className="graph-card">
          <Graph label="CO2 (ppm)" data={co2Data} yPadding={25} yStep={25} interval={5} displayTime={120} numTicks={4} stroke="#008000" unit="ppm"/>
          </div>
        </div>
      ) : (
        <p>Loading...</p> 
      )}
    </div>
  );
}
