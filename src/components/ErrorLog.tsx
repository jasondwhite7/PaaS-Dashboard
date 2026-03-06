import { useState } from "react";
import { ErrorLog as ErrorLogType } from "../types";

interface ErrorLogProps {
    errors: ErrorLogType[];
    clearError: (index: number) => void;
    clearAllErrors: () => void;
}

export default function ErrorLog({errors, clearError, clearAllErrors}: ErrorLogProps) {
    
    const [errorsExpanded, setErrorsExpanded] = useState(false);

    return (
        <div>
            {/* Errors */}
            {errors.length > 0 && (
                <div className="error-section">
                    {/* Summary bar - always visible */}
                    <div>
                        <button className="error-summary-btn" onClick={() => setErrorsExpanded(!errorsExpanded)}>
                        <span>⚠️ {errors.length} Connection {errors.length === 1 ? 'Error ' : 'Errors '}</span>
                        <span className={errorsExpanded ? 'dropdown-arrow open' : 'dropdown-arrow'}>▼</span>
                        </button>
                    </div>

                    {/* Expanded list */}
                    {errorsExpanded && (
                        <div className="error-list">
                            {errors.length > 1 && (
                                <button className="dismiss-btn" onClick={() => {
                                clearAllErrors();
                                setErrorsExpanded(false);
                                }}>
                                Clear All
                                </button>
                            )}
                            {errors.map((error, index) => (
                                <div key={index} className="error-item">
                                    <span>[{error.timestamp.toLocaleTimeString()}] {error.message}</span>
                                    <button className="dismiss-btn" onClick={() => {
                                        clearError(index);
                                        setErrorsExpanded(false);
                                    }}>
                                    Dismiss
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
