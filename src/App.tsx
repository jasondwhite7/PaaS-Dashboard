import GetScidData from "./hooks/ScidData";
import Clock from "./components/Clock";
import {Graph} from "./components/Graph";
import MapDataToGraph from "./utils/GraphTransform";

//main app function
export default function App() {
  //get the data from the scd and name it scd
  const {history: scd, lastUpdate: scdUpdate} = GetScidData();

  const tempData = MapDataToGraph(scd, s => s.temperature);
  const humidData = MapDataToGraph(scd, s => s.humidity);
  const co2Data = MapDataToGraph(scd, s => s.co2);
  return (
    <div>
      <h1>Sensor Data</h1> {/*header*/}
      <Clock/> {/*clock*/}
      {/*if data exists create graphs, if not, write loading...*/}
      {scd ? (
        <>
          <Graph label="Temperature (C°)" data={tempData} yPadding={2} yStep={2} interval={5} displayTime={120}/>
          <Graph label="Humidity (%)" data={humidData} yPadding={2} yStep={2} interval={5} displayTime={120}/>
          <Graph label="CO2 (ppm)" data={co2Data} yPadding={25} yStep={25} interval={5} displayTime={120}/>
        </>
      ) : (
        <p>Loading...</p> 
      )}
    </div>
  );
}
