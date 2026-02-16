import GetScidData from "./hooks/ScidData";
import Clock from "./components/Clock";
import {Graph} from "./components/Graph";
import MapDataToGraph from "./utils/GraphTransform";
import  "./App.css"

//main app function
export default function App() {
  //get the data from the scd and name it scd
  const {history: scd, lastUpdate: scdUpdate, errors: scdErrors, clearError: scdClearError, clearAllErrors: scdClearAllErrors} = GetScidData();

  const tempData = MapDataToGraph(scd, s => s.temperature);
  const humidData = MapDataToGraph(scd, s => s.humidity);
  const co2Data = MapDataToGraph(scd, s => s.co2);
  return (
    <div>
      <div className="header">
        <div className="logo-section">
          <img src="your-logo.png" alt="logo" />
        <h1>PAAS Dashboard</h1>
      </div>
      <Clock />
      </div>
      {/* Show error messages */}
      {scdErrors.length > 0 && (
        <div className="error-section">
          {scdErrors.length > 1 && (
            <button onClick={scdClearAllErrors} >
              Clear All Errors ({scdErrors.length})
            </button>
          )}
          {scdErrors.map((error, index) => (
            <div key={index} className="error-item">
              <span>[{error.timestamp.toLocaleTimeString()}] {error.message}</span>
              <button onClick={() => scdClearError(index)}>Dismiss</button>
            </div>
          ))}
        </div>
      )}
      {/*if data exists create graphs, if not, write loading...*/}
      {scd ? (
        <div className="graphs-container">
          <Graph label="Temperature (C°)" data={tempData} yPadding={2} yStep={2} interval={5} displayTime={120} numTicks={4}/>
          <Graph label="Humidity (%)" data={humidData} yPadding={2} yStep={2} interval={5} displayTime={120} numTicks={4}/>
          <Graph label="CO2 (ppm)" data={co2Data} yPadding={25} yStep={25} interval={5} displayTime={120} numTicks={4}/>
        </div>
      ) : (
        <p>Loading...</p> 
      )}
    </div>
  );
}
