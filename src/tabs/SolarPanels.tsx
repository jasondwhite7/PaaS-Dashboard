import { useState, useEffect } from "react";
import { SolarPanel } from "../components/SolarPanel";
import { MaintenanceLog, SolarPanelData } from "../types";

const PANEL_COUNT = 10;

/** Build panel data from logs */
function buildPanels(logs: MaintenanceLog[]): SolarPanelData[] {
    return Array.from({ length: PANEL_COUNT }, (_, i) => {
        const name = `Panel ${i + 1}`;
        return {
            id: i + 1,
            name,
            maintenanceLogs: logs.filter(l => l.panelName === name),
        };
    });
}

export default function SolarPanelsTab() {
    const [logs, setLogs] = useState<MaintenanceLog[]>([]);
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);
    const [viewLogsPanel, setViewLogsPanel] = useState<string | null>(null);

    // Form state
    const [formPanel, setFormPanel] = useState('Panel 1');
    const [formDate, setFormDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [formTechnician, setFormTechnician] = useState('');
    const [formNotes, setFormNotes] = useState('');
    const [formProblem, setFormProblem] = useState(false);

    // Load logs from backend on mount
    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch('/api/logs');
                if (res.ok) {
                    const data = await res.json();
                    setLogs(data);
                }
            } catch (err) {
                console.error("Failed to fetch logs:", err);
            }
        };
        fetchLogs();
        
        // Also poll every 5 seconds just to stay in sync across devices
        const interval = setInterval(fetchLogs, 5000);
        return () => clearInterval(interval);
    }, []);

    const panels = buildPanels(logs);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newLog: MaintenanceLog = {
            panelName: formPanel,
            date: formDate,
            technician: formTechnician.trim(),
            notes: formNotes.trim(),
            problemFound: formProblem,
        };
        
        // Save to backend
        try {
            await fetch('/api/logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLog),
            });
            // Update local state instantly for snappy UI
            setLogs(prev => [newLog, ...prev]);
        } catch (err) {
            console.error("Failed to save log:", err);
        }

        setFormPanel('Panel 1');
        setFormDate(new Date().toISOString().split('T')[0]);
        setFormTechnician('');
        setFormNotes('');
        setFormProblem(false);
        setModalOpen(false);
    };

    const handleClearLogs = async () => {
        try {
            await fetch('/api/logs', { method: 'DELETE' });
            setLogs([]);
        } catch (err) {
            console.error("Failed to clear logs:", err);
        }
        setConfirmClear(false);
    };

    // Logs for the currently viewed panel, sorted newest first
    const viewingLogs = viewLogsPanel
        ? logs
            .filter(l => l.panelName === viewLogsPanel)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        : [];

    const legendItems = [
        { label: '> 60 days', color: 'var(--green)' },
        { label: '30–60 days', color: '#e6c54a' },
        { label: '7–30 days', color: 'var(--orange)' },
        { label: '< 7 days', color: '#e53e3e' },
    ];

    return (
        <div>
            {/* Legend + Button Row */}
            <div className="solar-controls">
                <div className="legend">
                    <h3>Days Until Maintenance</h3>
                    <div className="legend-items">
                        {legendItems.map((item, i) => (
                            <div key={i} className="legend-item">
                                <div className="legend-color" style={{ backgroundColor: item.color }} />
                                <span>{item.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <button
                    className="maintenance-btn"
                    onClick={() => setModalOpen(true)}
                >
                    + Log Maintenance
                </button>
                {logs.length > 0 && (
                    <button
                        className="clear-logs-btn"
                        onClick={() => setConfirmClear(true)}
                    >
                        Clear Logs
                    </button>
                )}
            </div>

            {/* Solar Panels Grid */}
            <div className="solar-panels-container">
                <div className="solar-panels">
                    {panels.map(panel => (
                        <SolarPanel
                            key={panel.id}
                            id={panel.id}
                            name={panel.name}
                            maintenanceLogs={panel.maintenanceLogs}
                            onViewLogs={setViewLogsPanel}
                        />
                    ))}
                </div>
            </div>

            {/* Confirm Clear Modal */}
            {confirmClear && (
                <div className="maintenance-overlay" onClick={() => setConfirmClear(false)}>
                    <div className="maintenance-modal confirm-modal" onClick={e => e.stopPropagation()}>
                        <div className="confirm-icon">⚠️</div>
                        <h3>Clear All Logs?</h3>
                        <p className="confirm-message">
                            This will permanently delete all solar panel service logs and cannot be undone.
                        </p>
                        <div className="maintenance-form-actions">
                            <button
                                className="confirm-delete-btn"
                                onClick={handleClearLogs}
                            >
                                Yes, Clear All
                            </button>
                            <button className="cancel-btn" onClick={() => setConfirmClear(false)}>
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Maintenance Log Form Modal */}
            {modalOpen && (
                <div className="maintenance-overlay" onClick={() => setModalOpen(false)}>
                    <div className="maintenance-modal" onClick={e => e.stopPropagation()}>
                        <h3>Log Maintenance</h3>
                        <form className="maintenance-form" onSubmit={handleSubmit}>
                            <label>
                                Panel
                                <select
                                    value={formPanel}
                                    onChange={e => setFormPanel(e.target.value)}
                                >
                                    {Array.from({ length: PANEL_COUNT }, (_, i) => (
                                        <option key={i} value={`Panel ${i + 1}`}>
                                            Panel {i + 1}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label>
                                Technician
                                <input
                                    type="text"
                                    value={formTechnician}
                                    onChange={e => setFormTechnician(e.target.value)}
                                    placeholder="Name of person who performed service"
                                    required
                                />
                            </label>

                            <label>
                                Date
                                <input
                                    type="date"
                                    value={formDate}
                                    onChange={e => setFormDate(e.target.value)}
                                    required
                                />
                            </label>

                            <label>
                                Notes
                                <textarea
                                    value={formNotes}
                                    onChange={e => setFormNotes(e.target.value)}
                                    placeholder="Describe the maintenance performed..."
                                    rows={3}
                                />
                            </label>

                            <label className="checkbox-row">
                                <input
                                    type="checkbox"
                                    checked={formProblem}
                                    onChange={e => setFormProblem(e.target.checked)}
                                />
                                <span className="problem-checkmark" />
                                <span className="problem-label">Problem found during maintenance</span>
                            </label>

                            <div className="maintenance-form-actions">
                                <button type="button" className="cancel-btn" onClick={() => setModalOpen(false)}>
                                    Cancel
                                </button>
                                <button type="submit" className="submit-btn">
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* View Logs Modal */}
            {viewLogsPanel && (
                <div className="maintenance-overlay" onClick={() => setViewLogsPanel(null)}>
                    <div className="maintenance-modal logs-modal" onClick={e => e.stopPropagation()}>
                        <h3>{viewLogsPanel} — Service History</h3>
                        {viewingLogs.length === 0 ? (
                            <p className="no-logs-message">No maintenance logs recorded for this panel.</p>
                        ) : (
                            <div className="logs-list">
                                {viewingLogs.map((log, i) => (
                                    <div key={i} className={`log-entry ${log.problemFound ? 'log-entry-problem' : ''}`}>
                                        <div className="log-entry-header">
                                            <span className="log-entry-date">
                                                {new Date(log.date).toLocaleDateString()}
                                            </span>
                                            {log.problemFound && (
                                                <span className="log-entry-badge">⚠ Problem</span>
                                            )}
                                        </div>
                                        <div className="log-entry-tech">
                                            By: {log.technician || '—'}
                                        </div>
                                        {log.notes && (
                                            <div className="log-entry-notes">{log.notes}</div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="maintenance-form-actions">
                            <button className="cancel-btn" onClick={() => setViewLogsPanel(null)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
