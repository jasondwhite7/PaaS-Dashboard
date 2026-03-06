import { Dispatch, SetStateAction } from "react";
import { TabKey } from "../types";

interface TabsProps {
    activeTab: TabKey;
    setActiveTab: Dispatch<SetStateAction<TabKey>>
}

export default function Tabs({activeTab, setActiveTab}: TabsProps) {

    const tabs: {key: TabKey; label: string}[] = [
        {key: 'environment', label: 'Environment'},
        {key: 'battery', label: 'Batteries'},
        {key: 'solar', label: 'Solar Panels'},
        {key: 'bio', label: 'Bio-Systems'},
        {key: 'lights', label: 'Lights'},
    ]

    return (
        <div className="tab-nav">
        {/* Tab Navigation */}
            {tabs.map(tab => (
                <button 
                    key={tab.key}
                    className={activeTab === tab.key ? 'tab-btn active' : 'tab-btn'}
                    onClick={() => setActiveTab(tab.key)}
                >
                    {tab.label}
                </button>
            ))}
        {/* Tab Navigation */}
        </div>
    )
}