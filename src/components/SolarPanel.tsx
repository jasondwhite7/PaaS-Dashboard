import { useState } from "react";
import { MaintenanceLog } from "../types";

const MAINTENANCE_INTERVAL_DAYS = 90;

interface SolarPanelProps {
    id: number;
    name: string;
    maintenanceLogs: MaintenanceLog[];
    onViewLogs: (panelName: string) => void;
}

/**
 * Calculate days remaining until the next required maintenance.
 * Returns null if no maintenance has ever been recorded.
 */
function getDaysUntilMaintenance(logs: MaintenanceLog[]): number | null {
    if (logs.length === 0) return null;

    // Find the most recent log by date
    const sorted = [...logs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const lastDate = new Date(sorted[0].date);
    const nextDue = new Date(lastDate);
    nextDue.setDate(nextDue.getDate() + MAINTENANCE_INTERVAL_DAYS);

    const now = new Date();
    const diffMs = nextDue.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns a color based on days remaining.
 * Green (>60) → Yellow (30-60) → Orange (7-30) → Red (<7)
 */
function getUrgencyColor(days: number | null): string {
    if (days === null) return 'var(--background5)';
    if (days <= 0)  return '#e53e3e';
    if (days <= 7)  return '#e53e3e';
    if (days <= 30) return 'var(--orange)';
    if (days <= 60) return '#e6c54a';
    return 'var(--green)';
}

export function SolarPanel({ id, name, maintenanceLogs, onViewLogs }: SolarPanelProps) {
    const [showTooltip, setShowTooltip] = useState(false);
    const daysLeft = getDaysUntilMaintenance(maintenanceLogs);
    const color = getUrgencyColor(daysLeft);

    // Most recent log
    const sortedLogs = [...maintenanceLogs].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const latestLog = sortedLogs.length > 0 ? sortedLogs[0] : null;
    const hasProblem = latestLog?.problemFound ?? false;

    return (
        <div
            className="solar-panel"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
        >
            {/* Tooltip */}
            {showTooltip && (
                <div className="solar-tooltip">
                    <div className="solar-tooltip-header">{name}</div>
                    <div className="solar-tooltip-row">
                        <span className="solar-tooltip-label">Maintenance Due:</span>
                        <span style={{ color }}>
                            {daysLeft === null
                                ? 'No record'
                                : daysLeft <= 0
                                    ? 'Overdue!'
                                    : `${daysLeft} days`}
                        </span>
                    </div>
                    {latestLog && (
                        <>
                            <div className="solar-tooltip-divider" />
                            <div className="solar-tooltip-row">
                                <span className="solar-tooltip-label">Last Service:</span>
                                <span>{new Date(latestLog.date).toLocaleDateString()}</span>
                            </div>
                            <div className="solar-tooltip-row">
                                <span className="solar-tooltip-label">Technician:</span>
                                <span>{latestLog.technician || '—'}</span>
                            </div>
                            {latestLog.problemFound && (
                                <div className="solar-tooltip-problem">
                                    ⚠ Problem found during last service
                                </div>
                            )}
                            {latestLog.notes && (
                                <div className="solar-tooltip-notes">
                                    "{latestLog.notes}"
                                </div>
                            )}
                        </>
                    )}
                    {maintenanceLogs.length > 0 && (
                        <div className="solar-tooltip-view-logs"
                            onMouseDown={() => onViewLogs(name)}
                        >
                            View all {maintenanceLogs.length} log{maintenanceLogs.length !== 1 ? 's' : ''} →
                        </div>
                    )}
                </div>
            )}

            {/* Panel Body */}
            <div className="solar-panel-body" style={{ borderColor: color }}>
                {/* Problem indicator icon */}
                {hasProblem && (
                    <div className="solar-panel-problem-badge" title="Problem found">⚠</div>
                )}
                {/* Solar cell grid lines */}
                <div className="solar-panel-cells">
                    {Array.from({ length: 8 }, (_, i) => (
                        <div key={i} className="solar-cell" />
                    ))}
                </div>
                {/* Urgency glow bar at the bottom */}
                <div className="solar-panel-glow" style={{ backgroundColor: color }} />
            </div>

            {/* Label */}
            <span className="solar-panel-label">{name}</span>
            <span className="solar-panel-days" style={{ color }}>
                {daysLeft === null ? '—' : daysLeft <= 0 ? 'OVERDUE' : `${daysLeft}d`}
            </span>
        </div>
    );
}
