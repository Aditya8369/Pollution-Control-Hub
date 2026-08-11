import { useState } from 'react';
import { eventBus } from '../core/events';

export const SYMPTOM_REPORTS_STORAGE_KEY = 'pollution-symptom-reports';

const SYMPTOM_OPTIONS = [
    'Headache',
    'Coughing',
    'Eye irritation',
    'Sore throat',
    'Shortness of breath',
    'Fatigue',
    'Dizziness',
    'Skin irritation',
];

/**
 * Rounds a coordinate to ~1.1km precision so stored reports stay
 * approximate rather than an exact trace of the reporter.
 * @param {number} value
 * @returns {number}
 */
function toApproximateCoord(value) {
    return Math.round(value * 100) / 100;
}

/** @returns {any[]} */
export function readSymptomReports() {
    try {
        const raw = localStorage.getItem(SYMPTOM_REPORTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

/** @param {any[]} reports */
function saveSymptomReports(reports) {
    try {
        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(reports));
    } catch {
        // Best-effort persistence; a full quota shouldn't break the report flow.
    }
}

/** @param {{fallbackPosition?: {lat: number, lon: number}}} params */
export default function SymptomReportButton({ fallbackPosition }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [status, setStatus] = useState('idle');

    /** @param {string} symptom */
    const toggleSymptom = (symptom) => {
        setSelectedSymptoms((prev) =>
            prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
        );
    };

    const closeModal = () => {
        setIsOpen(false);
        setSelectedSymptoms([]);
        setStatus('idle');
    };

    const submitReport = () => {
        if (selectedSymptoms.length === 0) return;

        /** @param {{lat: number, lon: number}|null} coords */
        const finalize = (coords) => {
            const reports = readSymptomReports();
            reports.push({
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                symptoms: selectedSymptoms,
                timestamp: new Date().toISOString(),
                latitude: coords ? toApproximateCoord(coords.lat) : null,
                longitude: coords ? toApproximateCoord(coords.lon) : null,
            });
            saveSymptomReports(reports);
            eventBus.emit('SYMPTOM_REPORT_SUBMITTED');
            setStatus('submitted');
            setTimeout(closeModal, 1200);
        };

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) =>
                    finalize({ lat: position.coords.latitude, lon: position.coords.longitude }),
                () => finalize(fallbackPosition || null),
                { timeout: 5000 }
            );
        } else {
            finalize(fallbackPosition || null);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="symptom-report-trigger-btn"
                aria-haspopup="dialog"
            >
                I'm Feeling Unwell
            </button>

            {isOpen && (
                <div className="symptom-report-modal-backdrop" role="presentation" onClick={closeModal}>
                    <div
                        className="symptom-report-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="symptom-report-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h3 id="symptom-report-title">Report how you're feeling</h3>
                        <p className="symptom-report-subtext">
                            Anonymous. Helps build a symptom map linked to local air quality.
                        </p>

                        {status === 'submitted' ? (
                            <p className="symptom-report-thanks">Thanks — your report was added anonymously.</p>
                        ) : (
                            <>
                                <div className="symptom-report-options">
                                    {SYMPTOM_OPTIONS.map((symptom) => (
                                        <label key={symptom} className="symptom-report-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedSymptoms.includes(symptom)}
                                                onChange={() => toggleSymptom(symptom)}
                                            />
                                            {symptom}
                                        </label>
                                    ))}
                                </div>

                                <div className="symptom-report-actions">
                                    <button type="button" className="btn-secondary" onClick={closeModal}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-primary"
                                        onClick={submitReport}
                                        disabled={selectedSymptoms.length === 0}
                                    >
                                        Submit
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}