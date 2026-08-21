import { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus } from '../core/events';

export const SYMPTOM_REPORTS_STORAGE_KEY = 'pollution-symptom-reports';
export const MAX_STORED_REPORTS = 200;

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

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

function toApproximateCoord(value) {
    return Math.round(value * 100) / 100;
}

export function readSymptomReports() {
    try {
        const raw = localStorage.getItem(SYMPTOM_REPORTS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveSymptomReports(reports) {
    const trimmed = reports.slice(-MAX_STORED_REPORTS);
    try {
        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(trimmed));
        return true;
    } catch {
        try {
            localStorage.setItem(
                SYMPTOM_REPORTS_STORAGE_KEY,
                JSON.stringify(reports.slice(-Math.floor(MAX_STORED_REPORTS / 4)))
            );
            return true;
        } catch {
            return false;
        }
    }
}

export default function SymptomReportButton({ fallbackPosition }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [status, setStatus] = useState('idle');

    const dialogRef = useRef(null);
    const closeBtnRef = useRef(null);
    const triggerRef = useRef(null);
    const closeTimerRef = useRef(null);

    const toggleSymptom = (symptom) => {
        setSelectedSymptoms((prev) =>
            prev.includes(symptom) ? prev.filter((s) => s !== symptom) : [...prev, symptom]
        );
    };

    const closeModal = useCallback(() => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        setIsOpen(false);
        setSelectedSymptoms([]);
        setStatus('idle');
    }, []);

    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        closeBtnRef.current?.focus();

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
                closeModal();
                return;
            }

            if (event.key !== 'Tab' || !dialogRef.current) return;

            const focusable = dialogRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            const restoreTo =
                previouslyFocused instanceof HTMLElement && previouslyFocused !== document.body
                    ? previouslyFocused
                    : triggerRef.current;
            restoreTo?.focus?.();
        };
    }, [isOpen, closeModal]);

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const submitReport = () => {
        if (selectedSymptoms.length === 0 || status === 'submitting' || status === 'submitted') return;

        setStatus('submitting');

        const finalize = async (coords) => {
            const newReport = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                symptoms: selectedSymptoms,
                timestamp: new Date().toISOString(),
                // Privacy measure: we only send approximate coordinates
                latitude: coords ? toApproximateCoord(coords.lat) : null,
                longitude: coords ? toApproximateCoord(coords.lon) : null,
            };

            // 1. Save locally
            const reports = readSymptomReports();
            reports.push(newReport);
            const savedLocally = saveSymptomReports(reports);

            // 2. Send to backend
            try {
                const response = await fetch('/api/symptoms', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newReport),
                });

                if (!response.ok) {
                    throw new Error('Failed to send to server');
                }

                eventBus.emit('SYMPTOM_REPORT_SUBMITTED');
                setStatus('submitted');
                closeTimerRef.current = setTimeout(closeModal, 1200);

            } catch (error) {
                console.error('Error submitting symptom report:', error);
                // If backend fails but local succeeds, we still show a localized failure to be safe
                setStatus('failed');
            }
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
                ref={triggerRef}
                type="button"
                onClick={() => setIsOpen(true)}
                className="symptom-report-trigger-btn"
                aria-haspopup="dialog"
            >
                I&apos;m Feeling Unwell
            </button>

            {isOpen && (
                <div
                    className="symptom-report-modal-backdrop"
                    role="presentation"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) closeModal();
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') closeModal();
                    }}
                >
                    <div
                        ref={dialogRef}
                        className="symptom-report-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="symptom-report-title"
                    >
                        <button
                            ref={closeBtnRef}
                            type="button"
                            className="symptom-report-close-btn"
                            onClick={closeModal}
                            aria-label="Close symptom report dialog"
                        >
                            ✕
                        </button>

                        <h3 id="symptom-report-title">Report how you&apos;re feeling</h3>
                        <p className="symptom-report-subtext">
                            Anonymous. Helps build a symptom map linked to local air quality.
                        </p>

                        {status === 'submitted' ? (
                            <p className="symptom-report-thanks" role="status">
                                Thanks — your report was added anonymously.
                            </p>
                        ) : (
                            <>
                                {status === 'failed' && (
                                    <p className="symptom-report-error" role="alert">
                                        Your report could not be saved right now. Please try again later.
                                    </p>
                                )}

                                <div className="symptom-report-options">
                                    {SYMPTOM_OPTIONS.map((symptom) => (
                                        <label key={symptom} className="symptom-report-option">
                                            <input
                                                type="checkbox"
                                                checked={selectedSymptoms.includes(symptom)}
                                                onChange={() => toggleSymptom(symptom)}
                                                disabled={status === 'submitting'}
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
                                        disabled={selectedSymptoms.length === 0 || status === 'submitting'}
                                    >
                                        {status === 'submitting' ? 'Submitting…' : 'Submit'}
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
