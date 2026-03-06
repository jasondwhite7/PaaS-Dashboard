import Clock from "./Clock"

export default function Header() {
    return (
    <div className="header">
        <div className="logo-section">
            <img src="/purdue-logo.png" alt="logo" width={83} height={45}/>
            <img src="/search-logo.png" alt="logo" width={67} height={67}/>
            <h1>PaaS Dashboard</h1>
        </div>
        <Clock/>
    </div>
    )
}