import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import CalendarHeatmap from './CalendarHeatmap';
import CalibrationHistory from './CalibrationHistory';
import { fetchHistoricalData, formatHistoricalCSV } from '../services/historicalDataService';
import { dayAqi } from '../utils/historicalAggregate';

const EXPORT_BG = 'var(--brand, #0d9488)';
const EXPORT_BG_ALT = 'var(--muted, #0d9488)';
const EXPORT_BG_ACTIVE = 'var(--brand-strong, #0b7d73)';

/**
 * The export buttons highlighted on onMouseOver/onMouseOut only, so tabbing onto one gave
 * no indication it was focused — the same visual state, reachable by pointer but not by
 * keyboard. onFocus/onBlur now mirror the pointer pair.
 *
 * @param {string} resting background to return to
 * @param {() => boolean} [isSuppressed] skip the highlight (e.g. while a button is busy)
 */
function highlightHandlers(resting, isSuppressed = () => false) {
  const apply = (e) => {
    if (!isSuppressed()) e.currentTarget.style.background = EXPORT_BG_ACTIVE;
  };
  const reset = (e) => {
    if (!isSuppressed()) e.currentTarget.style.background = resting;
  };
  return { onMouseOver: apply, onMouseOut: reset, onFocus: apply, onBlur: reset };
}

/** @param {any} params */
export default function HistoricalAnalysis({ position }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [dateError, setDateError] = useState('');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  const workerRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (data && data.daily && data.daily.length > 0) {
      setStartDate(data.daily[0].date);
      setEndDate(data.daily[data.daily.length - 1].date);
    }
  }, [data]);

  useEffect(() => {
    try {
      // Initialize web worker
      workerRef.current = new Worker(new URL('../workers/historicalDataWorker.js', import.meta.url), {
        type: 'module'
      });

      workerRef.current.onmessage = (e) => {
        if (e.data.error) {
          setError(e.data.error);
          setLoading(false);
        } else {
          setData(e.data);
          setLoading(false);
        }
      };
    } catch (err) {
      console.error('Failed to initialize historical data worker:', err);
      setError('Historical data processing is unavailable in this environment.');
      setLoading(false);
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        // Fetch last 3 years of data
        const rawData = await fetchHistoricalData(position.lat, position.lon, 3);

        if (active) {
          if (workerRef.current) {
            // Offload processing to worker
            workerRef.current.postMessage(rawData);
          } else {
            setError('Historical data processing is unavailable.');
            setLoading(false);
          }
        }
      } catch (err) {
        if (active) {
          setError(err.message || 'Failed to load historical data');
          setLoading(false);
        }
      }
    }

    if (position?.lat && position?.lon) {
      loadData();
    }

    return () => {
      active = false;
    };
  }, [position?.lat, position?.lon]);

  const minDate = data?.daily?.[0]?.date || '';
  const maxDate = data?.daily?.[data.daily.length - 1]?.date || '';

  const handleExportPDF = () => {
    if (!data || !data.daily) return;
    if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError('');

    try {
      setIsExportingPDF(true);

      const filtered = data.daily
        .filter(d => d.date >= startDate && d.date <= endDate)
        .sort((a, b) => a.date.localeCompare(b.date));

      const daysAnalysed = filtered.length;
      if (daysAnalysed === 0) return;

      // Days the archive has no reading for carry a null AQI. They must not reach the
      // statistics -- averaged in they read as 0, and compared numerically they satisfy
      // `<= 50` and get filed under "Good".
      const measuredDays = filtered.filter(d => dayAqi(d) != null);
      const aqis = measuredDays.map(dayAqi);
      const daysMeasured = measuredDays.length;

      const avgAqi = aqis.length > 0 ? Math.round(aqis.reduce((a, b) => a + b, 0) / aqis.length) : '-';
      const minAqi = aqis.length > 0 ? Math.min(...aqis) : '-';
      const maxAqi = aqis.length > 0 ? Math.max(...aqis) : '-';

      const highestDay = measuredDays.find(d => dayAqi(d) === maxAqi);
      const lowestDay = measuredDays.find(d => dayAqi(d) === minAqi);

      const calcAvg = (key) => {
        const vals = filtered.map(d => d[key]).filter(v => typeof v === 'number' && Number.isFinite(v));
        return vals.length > 0 ? (vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : 'N/A';
      };

      const avgPm25 = calcAvg('pm25');
      const avgPm10 = calcAvg('pm10');
      const avgNo2 = calcAvg('no2');
      const avgOzone = calcAvg('ozone');
      const avgCo = calcAvg('co');

      let goodDays = 0, moderateDays = 0, poorDays = 0, veryPoorDays = 0, hazardousDays = 0;
      const unmeasuredDays = daysAnalysed - daysMeasured;
      measuredDays.forEach(d => {
        const val = dayAqi(d);
        if (val <= 50) goodDays++;
        else if (val <= 100) moderateDays++;
        else if (val <= 200) poorDays++;
        else if (val <= 300) veryPoorDays++;
        else hazardousDays++;
      });

      // Deterministic rule-based observations
      const categories = [
        { name: 'Good', count: goodDays },
        { name: 'Moderate', count: moderateDays },
        { name: 'Poor', count: poorDays },
        { name: 'Very Poor', count: veryPoorDays },
        { name: 'Hazardous', count: hazardousDays },
      ];
      const predominant = categories.reduce((prev, curr) => (curr.count > prev.count ? curr : prev), categories[0]);

      const observations = [];
      if (daysMeasured === 0) {
        observations.push(`No air quality measurements are available for the selected reporting period.`);
      } else {
        observations.push(`Air quality remained predominantly ${predominant.name} across the ${daysMeasured} day(s) with measurements.`);
      }
      if (unmeasuredDays > 0) {
        observations.push(`${unmeasuredDays} of the ${daysAnalysed} day(s) in range had no readings and are excluded from these figures.`);
      }
      if (highestDay) {
        observations.push(`Peak pollution occurred on ${highestDay.date} with an AQI of ${maxAqi}.`);
      }
      if (avgPm25 !== 'N/A') {
        observations.push(`PM2.5 recorded the highest average concentration among the monitored pollutants.`);
      }
      if (hazardousDays === 0) {
        observations.push(`No Hazardous AQI levels were observed during the reporting period.`);
      } else {
        observations.push(`${hazardousDays} Hazardous AQI level(s) were observed during the reporting period.`);
      }

      // Generate report using jsPDF
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 18; // 18mm margin
      let y = 20;

      // Header Banner
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(13, 148, 136); // #0d9488 brand teal
      pdf.text('Pollution Control Hub', pageWidth / 2, y, { align: 'center' });
      y += 7;

      pdf.setFontSize(12);
      pdf.setTextColor(30, 41, 59); // slate-800
      pdf.text('Historical Air Quality Report', pageWidth / 2, y, { align: 'center' });
      y += 9;

      pdf.setDrawColor(203, 213, 225); // slate-300
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8; // generous spacing after header before first section

      // Helper function for section headers
      const addSectionHeader = (title) => {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11.5);
        pdf.setTextColor(13, 148, 136);
        pdf.text(title, margin, y);
        y += 4;
        pdf.setDrawColor(226, 232, 240); // slate-200
        pdf.setLineWidth(0.3);
        pdf.line(margin, y, pageWidth - margin, y);
        y += 7; // spacing after heading before content
      };

      // Two-column stat row printing helper
      const labelX = margin;
      const valueX = margin + 55; // 55mm offset for perfectly aligned colon and values

      const addStatRow = (label, val) => {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(71, 85, 105); // slate-600 label
        pdf.text(label, labelX, y);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(15, 23, 42); // slate-900 value
        pdf.text(`:  ${val}`, valueX, y);
        y += 5.5;
      };

      // 1. Location Section
      addSectionHeader('Location');
      const locName = position?.cityName ? position.cityName : null;
      if (locName) {
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text(locName, margin, y);
        y += 6;
      }
      if (position?.lat != null && position?.lon != null) {
        addStatRow('Latitude', position.lat.toFixed(4));
        addStatRow('Longitude', position.lon.toFixed(4));
      }
      y += 6; // spacing between major sections

      // 2. Reporting Period Section
      addSectionHeader('Reporting Period');
      addStatRow('From', startDate);
      addStatRow('To', endDate);
      y += 6;

      // 3. Summary Statistics Section
      addSectionHeader('Summary Statistics');
      addStatRow('Days Analysed', String(daysAnalysed));
      // Stated explicitly so a reader can tell a clean average from a thin one.
      addStatRow('Days With Readings', `${daysMeasured} of ${daysAnalysed}`);
      y += 2.5;
      addStatRow('Average AQI', String(avgAqi));
      addStatRow('Minimum AQI', String(minAqi));
      addStatRow('Maximum AQI', String(maxAqi));
      y += 2.5;
      addStatRow('Average PM2.5', `${avgPm25} µg/m³`);
      addStatRow('Average PM10', `${avgPm10} µg/m³`);
      addStatRow('Average NO₂', `${avgNo2} µg/m³`);
      addStatRow('Average Ozone', `${avgOzone} µg/m³`);
      addStatRow('Average CO', `${avgCo} µg/m³`);
      y += 6;

      // 4. Air Quality Overview Section
      addSectionHeader('Air Quality Overview');
      addStatRow('Good Days', String(goodDays));
      addStatRow('Moderate Days', String(moderateDays));
      addStatRow('Poor Days', String(poorDays));
      addStatRow('Very Poor Days', String(veryPoorDays));
      addStatRow('Hazardous Days', String(hazardousDays));
      y += 2.5;
      if (highestDay) {
        addStatRow('Highest AQI Date', `${highestDay.date} (AQI ${maxAqi})`);
      }
      if (lowestDay) {
        addStatRow('Lowest AQI Date', `${lowestDay.date} (AQI ${minAqi})`);
      }
      y += 6;

      // 5. Environmental Summary Section
      addSectionHeader('Environmental Summary');
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(51, 65, 85);

      observations.forEach((obs) => {
        const lines = pdf.splitTextToSize(`• ${obs}`, pageWidth - margin * 2);
        pdf.text(lines, margin, y);
        y += lines.length * 5 + 3.5; // spacing between observations
      });
      y += 4;

      // 6. Footer Section
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.4);
      pdf.line(margin, pageHeight - 20, pageWidth - margin, pageHeight - 20);

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8.5);
      pdf.setTextColor(100, 116, 139);

      const now = new Date();
      const formattedNow = `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      pdf.text(`Generated on: ${formattedNow}`, margin, pageHeight - 11);
      pdf.text('Generated by Pollution Control Hub', pageWidth - margin, pageHeight - 11, { align: 'right' });

      const cityNameStr = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'historical';
      pdf.save(`${cityNameStr}_pollution_history_${startDate}_to_${endDate}.pdf`);
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.daily) return;
    if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError('');

    const csvContent = formatHistoricalCSV(data.daily, startDate, endDate);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'historical';
    link.download = `${cityName}_pollution_history_${startDate}_to_${endDate}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!data || !data.daily) return;
    if (new Date(startDate) > new Date(endDate)) {
      setDateError('Start date cannot be after end date.');
      return;
    }
    setDateError('');

    const filtered = data.daily
      .filter(day => day.date >= startDate && day.date <= endDate)
      .sort((a, b) => a.date.localeCompare(b.date));

    const mapped = filtered.map(day => ({
      'Date': day.date,
      'AQI': day.maxAqi,
      'PM2.5': day.pm25,
      'PM10': day.pm10,
      'NO2': day.no2,
      'Ozone': day.ozone,
      'CO': day.co
    }));

    const jsonContent = JSON.stringify(mapped, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    const cityName = position?.cityName ? position.cityName.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'historical';
    link.download = `${cityName}_pollution_history_${startDate}_to_${endDate}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="historical-analysis-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', textAlign: 'center' }}>
        <div className="live-dot active" style={{ marginBottom: '1rem' }}></div>
        <p>{t("historicalAnalysis.loading", "Crunching 3 years of historical AQI data...")}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="historical-analysis-container" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        <p>{t("historicalAnalysis.error", "Error: {{error}}", { error })}</p>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div data-testid="historical-analysis" ref={containerRef} className="historical-analysis-container section-card">
      <header style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, margin: '0 0 0.25rem' }}>{t("historicalAnalysis.title", "Long-Term Climate & Pollution Trends")}</h2>
        <p style={{ fontSize: '0.88rem', opacity: 0.8, margin: 0 }}>
          {t("historicalAnalysis.subtitle", "Showing 3 years of daily max AQI severity for {{city}}", { city: position?.cityName || t("historicalAnalysis.yourArea", "your area") })}
        </p>
      </header>

      <div className="export-controls-section" data-html2canvas-ignore="true" style={{
        marginBottom: '2rem',
        padding: '1.25rem',
        borderRadius: 'var(--r-sm, 10px)',
        background: 'var(--bg-card-alt, rgba(0,0,0,0.02))',
        border: '1px solid var(--line, rgba(0,0,0,0.08))'
      }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 1rem 0', color: 'var(--ink)' }}>{t("historicalAnalysis.exportSectionTitle", "Export Historical Data")}</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
            <label htmlFor="export-start-date" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' }}>{t("historicalAnalysis.startDate", "Start Date")}</label>
            <input
              type="date"
              id="export-start-date"
              value={startDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setStartDate(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: '1 1 180px' }}>
            <label htmlFor="export-end-date" style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--muted)' }}>{t("historicalAnalysis.endDate", "End Date")}</label>
            <input
              type="date"
              id="export-end-date"
              value={endDate}
              min={minDate}
              max={maxDate}
              onChange={(e) => setEndDate(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid var(--line)',
                background: 'var(--card)',
                color: 'var(--ink)',
                fontSize: '0.9rem',
                outline: 'none',
                fontFamily: 'inherit'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flex: '1 1 auto', flexWrap: 'wrap' }}>
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              type="button"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: isExportingPDF ? 'not-allowed' : 'pointer',
                borderRadius: '6px',
                background: 'var(--brand, #0d9488)',
                color: '#ffffff',
                border: 'none',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                opacity: isExportingPDF ? 0.7 : 1,
                transition: 'background 0.2s'
              }}
              {...highlightHandlers(EXPORT_BG, () => isExportingPDF)}
            >
              {isExportingPDF ? t("historicalAnalysis.exportingPDF", "Exporting PDF...") : t("historicalAnalysis.exportPDF", "Export PDF")}
            </button>
            <button
              onClick={handleExportCSV}
              type="button"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                background: 'var(--brand, #0d9488)',
                color: '#ffffff',
                border: 'none',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                transition: 'background 0.2s'
              }}
              {...highlightHandlers(EXPORT_BG)}
            >
              {t("historicalAnalysis.exportCSV", "Export CSV")}
            </button>
            <button
              onClick={handleExportJSON}
              type="button"
              style={{
                padding: '0.5rem 1rem',
                fontSize: '0.9rem',
                fontWeight: 500,
                cursor: 'pointer',
                borderRadius: '6px',
                background: 'var(--muted, #0d9488)',
                color: '#ffffff',
                border: 'none',
                height: '38px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
                transition: 'background 0.2s'
              }}
              {...highlightHandlers(EXPORT_BG_ALT)}
            >
              {t("historicalAnalysis.exportJSON", "Export JSON")}
            </button>
          </div>
        </div>
        {dateError && <p style={{ color: 'var(--danger, #ef4444)', fontSize: '0.85rem', margin: '0.5rem 0 0 0' }}>{dateError}</p>}
      </div>

      <div className="stats-row" style={{ marginBottom: '2rem' }}>
        <div className="stat-box" style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.05)', flex: '1 1 200px', minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0 0 0.25rem' }}>{t("historicalAnalysis.avgAqi", "Overall Average AQI")}</p>
          <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, fontFamily: '"Fraunces", serif' }}>
            {data.overallAvg == null ? '—' : data.overallAvg}
          </p>
        </div>
        <div className="stat-box" style={{ padding: '1rem', borderRadius: '0.5rem', background: 'rgba(0,0,0,0.05)', flex: '1 1 200px', minWidth: 0 }}>
          <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0 0 0.25rem' }}>{t("historicalAnalysis.daysRecorded", "Days Recorded")}</p>
          {/* Days with an actual reading, not days present in the response. The two differ
              wherever the archive has gaps, and the average above is over the former. */}
          <p style={{ fontSize: '1.8rem', fontWeight: 700, margin: 0, fontFamily: '"Fraunces", serif' }}>
            {data.daysWithReadings ?? data.daily.length}
          </p>
          {data.daysInRange > (data.daysWithReadings ?? data.daily.length) && (
            <p style={{ fontSize: '0.75rem', opacity: 0.7, margin: '0.25rem 0 0' }}>
              {t("historicalAnalysis.daysInRangeSuffix", "of {{days}} in range", { days: data.daysInRange })}
            </p>
          )}
        </div>
      </div>

      <div className="heatmap-section" style={{ overflow: 'hidden' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 500, margin: '0 0 1rem' }}>{t("historicalAnalysis.heatmapTitle", "Daily Severity Calendar")}</h3>
        <CalendarHeatmap data={data.daily} />

        <CalibrationHistory
          sensorId={`${position.lat.toFixed(4)}-${position.lon.toFixed(4)}`}
        />
      </div>
    </div>
  );
}