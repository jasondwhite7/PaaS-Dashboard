import GetScidData from "./hooks/ScidData";
import Clock from "./components/Clock";
import { useState } from "react";
import EnvironmentTab from "./tabs/Environment";
import "./App.css"

export default function App() {
  const [activeTab, setActiveTab] = useState('environment');

  const {history: scd, errors: scdErrors, clearError: scdClearError, clearAllErrors: scdClearAllErrors} = GetScidData();

  return (
    <div> 
      {/* Header */}
      <div className="header">
        <div className="logo-section">
          <img src="/purdue-logo.png" alt="logo" width={83} height={45}/>
          <img src="/search-logo.png" alt="logo" width={67} height={67}/>
        <h1>PAAS Dashboard</h1>
      </div>
      <Clock />
      </div>
      {/* Header */}

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button className={activeTab === 'environment' ? 'tab-btn active' : 'tab-btn'}
        onClick={() => setActiveTab('environment')}>
          Environment
        </button>
        <button className={activeTab === 'battery' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('battery')}>
            Batteries
          </button>
        <button className={activeTab === 'solar' ? 'tab-btn active' : 'tab-btn'}
        onClick={() => setActiveTab('solar')}>
          Solar Panel
        </button>
        <button className={activeTab === 'bio' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('bio')}>
          Bio-Systems
        </button>
        <button className={activeTab === 'lights' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('lights')}>
          Lights
        </button>
      </div>
      {/* Tab Navigation */}

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
      {/* Show error messages */}

      {/*if data exists create graphs, if not, write loading...*/}
      {activeTab === 'environment' && scd && (
        <EnvironmentTab scd={scd}/>
      )}

      {activeTab === 'battery' && (
        <div>
          <p>Batteries Coming Soon!</p>
        </div>
      )}

      {activeTab === 'solar' && (
        <div>
          <p>Solar Panels Coming Soon!</p>
        </div>
      )}
      {activeTab === 'bio' && (
        <div>
          <p>Bio-Systems Coming Soon!</p>
        </div>
      )}
      {activeTab === 'lights' && (
        <div>
          <p>Lights Coming Soon!</p>
        </div>
      )}
    </div>
  );
}
