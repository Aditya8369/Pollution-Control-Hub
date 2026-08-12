import { useState, useEffect } from 'react';
import { eventBus } from '../core/events';

const COMMUNITY_REPORTS_STORAGE_KEY = 'pollution-community-reports';

function readGeotaggedCommunityReports() {
    try {
        const raw = localStorage.getItem(COMMUNITY_REPORTS_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        if (!Array.isArray(parsed)) return [];
        return parsed.filter(
            (report) =>
                report &&
                typeof report.latitude === 'number' &&
                typeof report.longitude === 'number' &&
                !isNaN(report.latitude) &&
                !isNaN(report.longitude)
        );
    } catch {
        return [];
    }
}

/**
 * Reads geotagged community reports from localStorage and keeps them in sync with
 * COMMUNITY_REPORT_SUBMITTED events and cross-tab storage changes.
 *
 * Extracted out of LocationMap so the component stays presentational and the
 * localStorage side effect can be mocked in tests instead of touching real storage.
 *
 * @returns {Array<Object>} Geotagged community reports.
 */
export function useCommunityReports() {
    const [communityReports, setCommunityReports] = useState(() => readGeotaggedCommunityReports());

    useEffect(() => {
        const updateReports = () => {
            setCommunityReports(readGeotaggedCommunityReports());
        };

        eventBus.on('COMMUNITY_REPORT_SUBMITTED', updateReports);

        const handleStorage = (e) => {
            if (!e.key || e.key === COMMUNITY_REPORTS_STORAGE_KEY) {
                updateReports();
            }
        };
        window.addEventListener('storage', handleStorage);

        return () => {
            eventBus.off('COMMUNITY_REPORT_SUBMITTED', updateReports);
            window.removeEventListener('storage', handleStorage);
        };
    }, []);

    return communityReports;
}