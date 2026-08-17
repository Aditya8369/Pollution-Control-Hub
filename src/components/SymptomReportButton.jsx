import { useState, useEffect, useRef, useCallback } from 'react';
import { eventBus } from '../core/events';

export const SYMPTOM_REPORTS_STORAGE_KEY = 'pollution-symptom-reports';

/**
 * How many reports are kept.
 *
 * The list was never trimmed, so it grew until localStorage refused the write — and the
 * write failure was swallowed, leaving the dialog to thank the visitor for a report that
 * had not been stored. A cap plus a reported failure is better than either.
 */
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

/** Elements that can hold focus inside the dialog, in document order. */
const FOCUSABLE_SELECTOR =
    'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

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

/**
 * Persists the reports, trimming to the newest {@link MAX_STORED_REPORTS}.
 *
 * @param {any[]} reports
 * @returns {boolean} Whether the write landed. The caller has to know: a report the
 *   visitor was thanked for and that was silently dropped is worse than an error.
 */
export function saveSymptomReports(reports) {
    const trimmed = reports.slice(-MAX_STORED_REPORTS);

    try {
        localStorage.setItem(SYMPTOM_REPORTS_STORAGE_KEY, JSON.stringify(trimmed));
        return true;
    } catch {
        // Most likely a full quota. Retry once with a much shorter list before giving up,
        // so one oversized history does not permanently block reporting.
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

/** @param {{fallbackPosition?: {lat: number, lon: number}}} params */
export default function SymptomReportButton({ fallbackPosition }) {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    /** idle | submitting | submitted | failed */
    const [status, setStatus] = useState('idle');

    const dialogRef = useRef(null);
    const closeBtnRef = useRef(null);
    const triggerRef = useRef(null);
    const closeTimerRef = useRef(null);

    /** @param {string} symptom */
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

    // Focus management and the Escape/Tab handling that `aria-modal` promises.
    //
    // None of this was here: focus stayed on the trigger behind the backdrop, which
    // assistive technology treats as inert once aria-modal is set, so the dialog was
    // never announced and Tab walked the page behind it. Escape did nothing, and the
    // only way out with a keyboard was to tab through every checkbox to reach Cancel.
    // This mirrors what SolutionsAwareness already does for its article modal.
    useEffect(() => {
        if (!isOpen) return undefined;

        const previouslyFocused = document.activeElement;
        closeBtnRef.current?.focus();

        /** @param {KeyboardEvent} event */
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
            // Back to whatever opened the dialog. A pointer-opened dialog can leave
            // `document.activeElement` on <body>, in which case the trigger is where
            // focus belongs — dropping it on <body> restarts tab order at the top of
            // the page, which is the thing that makes a modal painful to use.
            const restoreTo =
                previouslyFocused instanceof HTMLElement && previouslyFocused !== document.body
                    ? previouslyFocused
                    : triggerRef.current;
            restoreTo?.focus?.();
        };
    }, [isOpen, closeModal]);

    // A pending auto-close must not outlive the component. Nothing cancelled the old
    // timer, so unmounting inside its 1.2 seconds set state on a component that was gone.
    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    const submitReport = () => {
        // Geolocation can take up to the 5s timeout below, and the button used to stay
        // live throughout — three clicks while the permission prompt was up filed three
        // reports, which then showed as three separate markers on the map. A failed
        // attempt can still be retried; only an in-flight or completed one is refused.
        if (selectedSymptoms.length === 0 || status === 'submitting' || status === 'submitted') return;

        setStatus('submitting');

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

            if (!saveSymptomReports(reports)) {
                setStatus('failed');
                return;
            }

            eventBus.emit('SYMPTOM_REPORT_SUBMITTED');
            setStatus('submitted');
            closeTimerRef.current = setTimeout(closeModal, 1200);
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
                    // Closes on the backdrop itself rather than stopping propagation on
                    // the dialog. Same behaviour, but the dialog keeps no handler of its
                    // own, which is what jsx-a11y was flagging.
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
                                        Your report could not be saved — this browser&apos;s storage is
                                        full or unavailable. Nothing was recorded.
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
