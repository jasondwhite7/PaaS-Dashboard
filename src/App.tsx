import "./App.css"
import {useState} from "react";
import GetScidData from "./hooks/ScidData";
import EnvironmentTab from "./tabs/Environment";
import BatteryTab from "./tabs/Batteries";
import ErrorLog from "./components/ErrorLog"
import Tabs from "./components/Tabs";
import {TabKey} from "./types";
import Header from "./components/Header";


export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('environment');
  
  const {history: scd, errors: scdErrors, clearError: scdClearError, clearAllErrors: scdClearAllErrors} = GetScidData();
  
  const tabContent = {
    environment: <EnvironmentTab scd={scd} />,
    battery: <BatteryTab/>,
    solar: <div><p>Solar Panels Coming Soon!</p></div>,
    bio: <div><p>Bio-Systems Coming Soon!</p></div>,
    lights: <div><p>Lights Coming Soon!</p></div>,
  };

  return (
    <div> 
      {/* Header */}
      <Header/>

      {/* Tab Navigation */}
      <Tabs activeTab={activeTab} setActiveTab={setActiveTab}></Tabs>

      {/* Errors */}
      {scdErrors.length > 0 && (
        <ErrorLog errors={scdErrors} clearError={scdClearError} clearAllErrors={scdClearAllErrors}/>
      )}

      {/* Tab Display */}
      {tabContent[activeTab]}
    </div>
  );
}
