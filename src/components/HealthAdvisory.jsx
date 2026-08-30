import { useState, useEffect, memo, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import jsPDF from 'jspdf';
import GlossaryLinkedText from './GlossaryLinkedText';
import { readSymptomReports } from './SymptomReportButton';
import { eventBus } from '../core/events';
import { getAQIBand } from '../services/airQualityService';

function isSameLocalDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function calculateSymptomReportCounts() {
  try {
    const reports = readSymptomReports();
    const now = new Date();
    const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);

    let todayCount = 0;
    let yesterdayCount = 0;

    if (Array.isArray(reports)) {
      reports.forEach((report) => {
        if (!report || !report.timestamp) return;
        const reportDate = new Date(report.timestamp);
        if (isNaN(reportDate.getTime())) return;

        if (isSameLocalDay(reportDate, now)) {
          todayCount++;
        } else if (isSameLocalDay(reportDate, yesterday)) {
          yesterdayCount++;
        }
      });
    }

    return { todayCount, yesterdayCount };
  } catch {
    return { todayCount: 0, yesterdayCount: 0 };
  }
}

// -----------------------------------------------------------------------------
// 1. MEMOIZED ICONS (Extracted outside the component to prevent re-renders)
// A11Y FIX: Added aria-hidden="true" and focusable="false" so screen readers ignore decorative SVGs
// -----------------------------------------------------------------------------
const LungsIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path d="M12 2v20M6 5c-3 0-4 3-4 7s2 7 4 7c3 0 4-4 4-7S9 5 6 5zM18 5c3 0 4 3 4 7s-2 7-4 7c-3 0-4-4-4-7s1-7 4-7z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const HeartIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const SkinIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path d="M12 2a5 5 0 0 0-5 5v3a5 5 0 0 0 10 0V7a5 5 0 0 0-5-5z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M17 16c0-2.2-1.8-4-4-4h-2c-2.2 0-4 1.8-4 4v4h10v-4z" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const EyesIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const BrainIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path d="M9.5 2a3.5 3.5 0 0 0-3.5 3.5v.55A3.5 3.5 0 0 0 4 9.34v1.32a3.5 3.5 0 0 0-1 2.47V15.5A3.5 3.5 0 0 0 6.5 19h.55A3.5 3.5 0 0 0 10 21.45V22" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M14.5 2a3.5 3.5 0 0 1 3.5 3.5v.55A3.5 3.5 0 0 1 20 9.34v1.32a3.5 3.5 0 0 1 1 2.47V15.5A3.5 3.5 0 0 1 17.5 19h-.55A3.5 3.5 0 0 1 14 21.45V22" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const ImmuneIcon = memo(() => (
  <svg className="organ-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
    <path d="M12 2 3 6v6c0 5 4 9.5 9 10 5-.5 9-5 9-10V6l-9-4Z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
));

const MaskIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <rect x="3" y="11" width="18" height="10" rx="2" />
    <path d="M12 2a5 5 0 0 0-5 5v4h10V7a5 5 0 0 0-5-5z" />
  </svg>
));

const VentilationIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M3 12h18M12 3v18M4.93 4.93l14.14 14.14M4.93 19.07L19.07 4.93" />
  </svg>
));

const ExerciseIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v8H2Z" />
    <path d="M6 2v6M14 2v6" />
  </svg>
));

const InhalerIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M4 9h16v11H4zM4 5h6v4H4zM14 5h6v4h-6z" />
  </svg>
));

const PurifierIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7" />
  </svg>
));

const LimitIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v4l3 3" />
  </svg>
));

const WalksIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
  </svg>
));

const DietIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 16a6 6 0 1 1 6-6 6 6 0 0 1-6 6Z" />
  </svg>
));

const PlayIcon = memo(() => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false" style={{ width: '20px', height: '20px' }}>
    <path d="M12 2L2 22h20L12 2Z" />
  </svg>
));

// -----------------------------------------------------------------------------
// 1b. USER HEALTH PROFILE (voluntary, persisted locally on this device)
// -----------------------------------------------------------------------------
const HEALTH_PROFILE_STORAGE_KEY = 'pch_health_profile';

const HEALTH_CONDITIONS = [
  { id: 'asthma', label: 'Asthma' },
  { id: 'heartDisease', label: 'Heart Disease' },
  { id: 'allergies', label: 'Allergies' },
  { id: 'copd', label: 'COPD / Chronic Lung Condition' },
  { id: 'pregnancy', label: 'Pregnancy' }
];

const CONDITION_ADVISORY_MESSAGES = {
  asthma: 'Keep your rescue inhaler within reach and avoid outdoor exertion when AQI is elevated — pollutants can trigger airway inflammation quickly.',
  heartDisease: 'Avoid strenuous outdoor activity during poor air quality; fine particulates (PM2.5) are linked to increased cardiovascular strain.',
  allergies: 'Check pollen and particulate levels before heading out, and keep windows closed on high-AQI days to limit allergen and pollutant exposure.',
  copd: 'Monitor symptoms closely on poor air quality days and keep prescribed medication accessible; consider an N95 mask for unavoidable outdoor exposure.',
  pregnancy: 'Limit prolonged outdoor exposure on high-pollution days, as fine particulates have been associated with risks to maternal and fetal health.'
};

function loadHealthProfile() {
  try {
    if (typeof window === 'undefined') return [];
    const raw = window.localStorage.getItem(HEALTH_PROFILE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`Error reading localStorage key "${HEALTH_PROFILE_STORAGE_KEY}":`, err);
  }
  return [];
}

const getTipRelevance = (tipId, currentAqi, healthConditions) => {
  let score = 0;
  const aqi = currentAqi ?? 25; // default to good if undefined
  
  if (tipId === "mask") {
    score += aqi >= 150 ? 12 : aqi >= 101 ? 6 : 2;
  }
  if (tipId === "ventilation") {
    score += aqi < 101 ? 8 : 1; // ventilation is high priority when air is clean
  }
  if (tipId === "exercise") {
    score += aqi < 101 ? 10 : 1; // exercise is good when clean
  }
  if (tipId === "inhaler") {
    score += healthConditions.includes("asthma") || healthConditions.includes("copd") ? 15 : 2;
    score += aqi >= 101 ? 5 : 0;
  }
  if (tipId === "purifier") {
    score += healthConditions.includes("allergies") || healthConditions.includes("copd") || healthConditions.includes("asthma") ? 12 : 2;
    score += aqi >= 101 ? 6 : 0;
  }
  if (tipId === "limit") {
    score += healthConditions.includes("heartDisease") || healthConditions.includes("copd") || healthConditions.includes("pregnancy") ? 14 : 2;
    score += aqi >= 101 ? 8 : 0;
  }
  if (tipId === "walks") {
    score += healthConditions.includes("pregnancy") ? 10 : 2;
    score += aqi >= 101 ? 2 : 8;
  }
  if (tipId === "diet") {
    score += 3;
  }
  if (tipId === "play") {
    score += aqi < 101 ? 10 : 1;
  }

  return score;
};

const getPersonalizedWarning = (id, aqi) => {
  const baseMsg = CONDITION_ADVISORY_MESSAGES[id] || "";
  if (aqi == null) return baseMsg;

  if (aqi >= 300) {
    return `🔴 CRITICAL HAZARD: ${baseMsg} Avoid all outdoor activities. Seek clean indoor air immediately.`;
  }
  if (aqi >= 150) {
    return `🟠 URGENT WARNING: ${baseMsg} Strictly limit outdoor exposure and avoid physical exertion outside.`;
  }
  if (aqi >= 101) {
    return `🟡 CAUTION: ${baseMsg} Reduce heavy or prolonged outdoor exertion.`;
  }
  return `🟢 INFO: ${baseMsg} Air quality is acceptable today.`;
};

// -----------------------------------------------------------------------------
// 2. MAIN COMPONENT
// -----------------------------------------------------------------------------
export default function HealthAdvisory({ currentAqi }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('general');
  const [healthConditions, setHealthConditions] = useState(loadHealthProfile);
  const hasSensitiveProfile = healthConditions.length > 0;
  const [symptomStats, setSymptomStats] = useState(() => calculateSymptomReportCounts());

  useEffect(() => {
    const handleReportSubmitted = () => {
      setSymptomStats(calculateSymptomReportCounts());
    };

    eventBus.on('SYMPTOM_REPORT_SUBMITTED', handleReportSubmitted);
    return () => {
      eventBus.off('SYMPTOM_REPORT_SUBMITTED', handleReportSubmitted);
    };
  }, []);

  // Persist the user's voluntary health profile locally on this device.
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HEALTH_PROFILE_STORAGE_KEY, JSON.stringify(healthConditions));
      }
    } catch (err) {
      console.warn(`Error writing to localStorage key "${HEALTH_PROFILE_STORAGE_KEY}":`, err);
    }
  }, [healthConditions]);

  // If the user has opted in with any condition, surface the sensitive-group tab by default.
  useEffect(() => {
    if (hasSensitiveProfile) {
      setActiveTab('sensitive');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleHealthCondition = (id) => {
    setHealthConditions((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const organImpacts = [
    { title: t('healthAdvisory.organs.lungs.title'), impact: t('healthAdvisory.organs.lungs.impact'), icon: <LungsIcon /> },
    { title: t('healthAdvisory.organs.heart.title'), impact: t('healthAdvisory.organs.heart.impact'), icon: <HeartIcon /> },
    { title: t('healthAdvisory.organs.skin.title'), impact: t('healthAdvisory.organs.skin.impact'), icon: <SkinIcon /> },
    { title: t('healthAdvisory.organs.eyes.title'), impact: t('healthAdvisory.organs.eyes.impact'), icon: <EyesIcon /> },
    { title: t('healthAdvisory.organs.brain.title'), impact: t('healthAdvisory.organs.brain.impact'), icon: <BrainIcon /> },
    { title: t('healthAdvisory.organs.immune.title'), impact: t('healthAdvisory.organs.immune.impact'), icon: <ImmuneIcon /> }
  ];

  const audiences = {
    general: {
      label: t('healthAdvisory.audiences.general.label'),
      desc: t('healthAdvisory.audiences.desc_general', { defaultValue: 'Advisories and tips for healthy adults with no pre-existing conditions.' }),
      tips: [
        { id: "mask", title: t('healthAdvisory.tips.general.mask.title'), detail: t('healthAdvisory.tips.general.mask.detail'), priority: t('healthAdvisory.priorities.medium', { defaultValue: 'Medium' }), badgeClass: 'badge-warning', icon: <MaskIcon /> },
        { id: "ventilation", title: t('healthAdvisory.tips.general.ventilation.title'), detail: t('healthAdvisory.tips.general.ventilation.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <VentilationIcon /> },
        { id: "exercise", title: t('healthAdvisory.tips.general.exercise.title'), detail: t('healthAdvisory.tips.general.exercise.detail'), priority: t('healthAdvisory.priorities.low', { defaultValue: 'Low' }), badgeClass: 'badge-info', icon: <ExerciseIcon /> }
      ]
    },
    sensitive: {
      label: t('healthAdvisory.audiences.sensitive.label'),
      desc: t('healthAdvisory.audiences.desc_sensitive', { defaultValue: 'Essential guidance for individuals with asthma, heart conditions, or allergies.' }),
      tips: [
        { id: "inhaler", title: t('healthAdvisory.tips.sensitive.inhaler.title'), detail: t('healthAdvisory.tips.sensitive.inhaler.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <InhalerIcon /> },
        { id: "purifier", title: t('healthAdvisory.tips.sensitive.purifier.title'), detail: t('healthAdvisory.tips.sensitive.purifier.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <PurifierIcon /> },
        { id: "limit", title: t('healthAdvisory.tips.sensitive.limit.title'), detail: t('healthAdvisory.tips.sensitive.limit.detail'), priority: t('healthAdvisory.priorities.medium', { defaultValue: 'Medium' }), badgeClass: 'badge-warning', icon: <LimitIcon /> }
      ]
    },
    vulnerable: {
      label: t('healthAdvisory.audiences.vulnerable.label'),
      desc: t('healthAdvisory.audiences.desc_vulnerable', { defaultValue: 'Protective actions tailored for developing lungs and older age groups.' }),
      tips: [
        { id: "walks", title: t('healthAdvisory.tips.vulnerable.walks.title'), detail: t('healthAdvisory.tips.vulnerable.walks.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <WalksIcon /> },
        { id: "diet", title: t('healthAdvisory.tips.vulnerable.diet.title'), detail: t('healthAdvisory.tips.vulnerable.diet.detail'), priority: t('healthAdvisory.priorities.medium', { defaultValue: 'Medium' }), badgeClass: 'badge-warning', icon: <DietIcon /> },
        { id: "play", title: t('healthAdvisory.tips.vulnerable.play.title'), detail: t('healthAdvisory.tips.vulnerable.play.detail'), priority: t('healthAdvisory.priorities.high', { defaultValue: 'High' }), badgeClass: 'badge-danger', icon: <PlayIcon /> }
      ]
    }
  };

  const sortedTips = useMemo(() => {
    const activeTips = audiences[activeTab]?.tips || [];
    return [...activeTips].map(tip => {
      const relevance = getTipRelevance(tip.id, currentAqi, healthConditions);
      return { ...tip, relevance };
    }).sort((a, b) => b.relevance - a.relevance);
  }, [activeTab, currentAqi, healthConditions]);

  const handleDownloadPDF = () => {
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = 20;

      const checkPageBreak = (needed = 12) => {
        if (y + needed > pageHeight - margin) {
          pdf.addPage();
          y = 20;
        }
      };

      // Header Banner
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(18);
      pdf.setTextColor(13, 148, 136);
      pdf.text('Pollution Control Hub', pageWidth / 2, y, { align: 'center' });
      y += 7;

      pdf.setFontSize(13);
      pdf.setTextColor(30, 41, 59);
      pdf.text('Personalized Health Advisory', pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9.5);
      pdf.setTextColor(100, 116, 139);
      const aqiText = currentAqi != null ? `Current AQI: ${currentAqi}` : 'Current AQI: N/A';
      const dateText = `Generated: ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
      pdf.text(`${aqiText} | ${dateText}`, pageWidth / 2, y, { align: 'center' });
      y += 8;

      pdf.setDrawColor(203, 213, 225);
      pdf.setLineWidth(0.5);
      pdf.line(margin, y, pageWidth - margin, y);
      y += 8;

      // Section 1: Health Profile & Conditions
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.5);
      pdf.setTextColor(13, 148, 136);
      pdf.text('Selected Health Profile & Conditions', margin, y);
      y += 6;

      if (hasSensitiveProfile) {
        healthConditions.forEach((id) => {
          checkPageBreak(16);
          const conditionLabel = HEALTH_CONDITIONS.find((c) => c.id === id)?.label || id;
          const warningText = getPersonalizedWarning(id, currentAqi);

          pdf.setFont('helvetica', 'bold');
          pdf.setFontSize(10);
          pdf.setTextColor(30, 41, 59);
          pdf.text(`• ${conditionLabel}:`, margin, y);
          y += 5;

          pdf.setFont('helvetica', 'normal');
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);
          const wrappedLines = pdf.splitTextToSize(warningText, contentWidth - 4);
          wrappedLines.forEach((line) => {
            checkPageBreak(5);
            pdf.text(line, margin + 4, y);
            y += 4.5;
          });
          y += 2;
        });
      } else {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9.5);
        pdf.setTextColor(71, 85, 105);
        pdf.text('No specific pre-existing health conditions selected. Providing general audience guidance.', margin, y);
        y += 6;
      }

      y += 4;
      checkPageBreak(15);

      // Section 2: Active Advisory Category
      const activeAudience = audiences[activeTab] || audiences.general;
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.5);
      pdf.setTextColor(13, 148, 136);
      pdf.text(`Advisory Audience: ${activeAudience.label}`, margin, y);
      y += 5.5;

      if (activeAudience.desc) {
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(100, 116, 139);
        const descLines = pdf.splitTextToSize(activeAudience.desc, contentWidth);
        descLines.forEach((line) => {
          checkPageBreak(5);
          pdf.text(line, margin, y);
          y += 4.5;
        });
      }
      y += 6;

      // Section 3: Actionable Tips
      checkPageBreak(15);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11.5);
      pdf.setTextColor(13, 148, 136);
      pdf.text('Recommended Health & Protective Tips', margin, y);
      y += 6;

      sortedTips.forEach((tip, index) => {
        checkPageBreak(18);

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text(`${index + 1}. ${tip.title} [Priority: ${tip.priority}]`, margin, y);
        y += 5;

        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(9);
        pdf.setTextColor(71, 85, 105);
        const detailLines = pdf.splitTextToSize(tip.detail, contentWidth - 4);
        detailLines.forEach((line) => {
          checkPageBreak(5);
          pdf.text(line, margin + 4, y);
          y += 4.5;
        });
        y += 3;
      });

      pdf.save('personalized_health_advisory.pdf');
    } catch (err) {
      console.error('Failed to generate PDF report:', err);
    }
  };

  return (
    <section data-testid="health-advisory" className="panel health-advisory-panel" aria-labelledby="health-advisory-title">
      <div className="panel-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h2 id="health-advisory-title">{t('healthAdvisory.title', { defaultValue: 'Health Advisory' })}</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {currentAqi != null && (
            <span data-testid="advisory-aqi" style={{ fontSize: '0.9rem', fontWeight: 'bold', background: 'rgba(13, 148, 136, 0.15)', color: 'var(--brand)', padding: '0.2rem 0.6rem', borderRadius: '999px' }}>
              Current AQI: {currentAqi}
            </span>
          )}
          <button
            type="button"
            className="btn-secondary text-sm"
            onClick={handleDownloadPDF}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
          >
            📥 {t('healthAdvisory.downloadBtn', { defaultValue: 'Download My Health Advisory' })}
          </button>
        </div>
      </div>

      {/* Community Health Insight */}
      <div
        className="community-health-insight"
        data-testid="community-health-insight"
        style={{
          marginTop: '1rem',
          marginBottom: '1rem',
          padding: '1rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid var(--border-color, #e2e8f0)',
          backgroundColor: 'var(--card-bg, #f8fafc)',
        }}
      >
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
          Community Health Insight
        </h3>
        <p style={{ margin: '0.35rem 0', fontSize: '0.9rem', color: 'var(--text-secondary, #475569)' }}>
          {symptomStats.todayCount} symptom report{symptomStats.todayCount === 1 ? '' : 's'} today vs. {symptomStats.yesterdayCount} yesterday
        </p>
        <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: 500 }}>
          Current AQI: {' '}
          <span style={{ color: getAQIBand(currentAqi).color, fontWeight: 700 }}>
            {currentAqi != null ? currentAqi : 'Unavailable'}
          </span>
          {currentAqi != null && (
            <span style={{ marginLeft: '0.4rem', color: getAQIBand(currentAqi).color }}>
              ({getAQIBand(currentAqi).label})
            </span>
          )}
        </p>
      </div>

      {/* Voluntary Health Profile */}
      <div className="health-profile-section" data-testid="health-profile-section">
        <h3 className="section-subtitle" id="health-profile-subtitle">
          {t('healthAdvisory.profile.title', { defaultValue: 'Your Health Profile (optional)' })}
        </h3>
        <p className="tab-description">
          {t('healthAdvisory.profile.desc', {
            defaultValue: 'Voluntarily add any pre-existing conditions to get tailored, higher-priority guidance. Stored only on this device.'
          })}
        </p>
        
        {/* A11Y FIX: Group checkboxes so screen readers know they are a related list */}
        <div 
          className="health-conditions-list" 
          role="group" 
          aria-labelledby="health-profile-subtitle"
        >
          {HEALTH_CONDITIONS.map((condition) => (
            <label key={condition.id} className="health-condition-checkbox">
              <input
                type="checkbox"
                checked={healthConditions.includes(condition.id)}
                onChange={() => toggleHealthCondition(condition.id)}
              />
              {t(`healthAdvisory.profile.conditions.${condition.id}`, { defaultValue: condition.label })}
            </label>
          ))}
        </div>
      </div>

      <div className="divider-line" aria-hidden="true" />

      {/* Organ Impacts Grid */}
      <h3 className="section-subtitle">{t('healthAdvisory.organSubtitle')}</h3>
      <div className="advisory-grid">
        {organImpacts.map((organ) => (
          <article key={organ.title} className="advisory-card">
            <div className="advisory-card-header">
              {/* A11Y FIX: Removed redundant tooltip since the title is written right next to it */}
              <span className="organ-icon-wrapper" aria-hidden="true">
                {organ.icon}
              </span>
              <h3>{organ.title}</h3>
            </div>
            <p><GlossaryLinkedText text={organ.impact} /></p>
          </article>
        ))}
      </div>

      <div className="divider-line" aria-hidden="true" />

      {/* Interactive Tabs Section */}
      <div className="tabs-container">
        <div className="tabs-header">
          <h3 className="section-subtitle" id="tailored-advisory-title">{t('healthAdvisory.tailoredSubtitle')}</h3>
          
          {/* A11Y FIX: Proper Tablist pattern with keyboard navigation */}
          <div 
            className="tabs-list-buttons" 
            role="tablist" 
            aria-labelledby="tailored-advisory-title"
          >
            {Object.keys(audiences).map((key, index, arr) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`tab-${key}`}
                aria-selected={activeTab === key}
                aria-controls={`tabpanel-${key}`}
                tabIndex={activeTab === key ? 0 : -1}
                className={`tab-btn ${activeTab === key ? 'active' : ''}`}
                onClick={() => setActiveTab(key)}
                onKeyDown={(e) => {
                  let nextIndex = index;
                  if (e.key === 'ArrowRight') {
                    nextIndex = (index + 1) % arr.length;
                  } else if (e.key === 'ArrowLeft') {
                    nextIndex = (index - 1 + arr.length) % arr.length;
                  }
                  if (nextIndex !== index) {
                    const nextKey = arr[nextIndex];
                    setActiveTab(nextKey);
                    document.getElementById(`tab-${nextKey}`)?.focus();
                  }
                }}
              >
                {audiences[key].label}
              </button>
            ))}
          </div>
        </div>

        {/* A11Y FIX: Tab Panel wrapper ensures screen readers contextually link the content to the tab */}
        <div 
          id={`tabpanel-${activeTab}`} 
          role="tabpanel" 
          aria-labelledby={`tab-${activeTab}`}
          tabIndex={0}
          style={{ outline: 'none' }} // Relies on standard inner focus
        >
          <p className="tab-description" aria-live="polite">{audiences[activeTab].desc}</p>

          {/* Personalized Advisory (shown with higher prominence for opted-in users) */}
          {hasSensitiveProfile && (
            <div 
              className="personalized-advisory-banner" 
              data-testid="personalized-advisory-banner"
              role="region"
              aria-label="Personalized Advisory Alerts"
            >
              <h3>
                <span aria-hidden="true">⚠️</span> {t('healthAdvisory.profile.personalizedTitle', { defaultValue: 'Personalized Guidance For You' })}
              </h3>
              <ul>
                {healthConditions.map((id) => (
                  <li key={id} data-testid="personalized-condition-item">
                    <strong>
                      {t(`healthAdvisory.profile.conditions.${id}`, {
                        defaultValue: HEALTH_CONDITIONS.find((c) => c.id === id)?.label || id
                      })}
                      :
                    </strong>{' '}
                    {getPersonalizedWarning(id, currentAqi)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actionable Tips Grid */}
          <ul className="tips-grid" aria-label={`Tips for ${audiences[activeTab].label}`}>
            {sortedTips.map((tip) => {
              const isHighlyRelevant = tip.relevance >= 10;
              return (
                <li
                  key={tip.title}
                  className="tip-action-card"
                  data-testid="tip-action-card"
                  style={{
                    border: isHighlyRelevant ? "2px solid #ef4444" : "1px solid var(--line)",
                    boxShadow: isHighlyRelevant ? "0 4px 12px rgba(239, 68, 68, 0.15)" : "none",
                    position: "relative"
                  }}
                >
                  <div className="tip-header">
                    <div className="tip-icon-wrapper" aria-hidden="true">
                      {tip.icon}
                    </div>
                    <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                      {isHighlyRelevant && (
                        <span
                          data-testid="relevance-badge"
                          style={{
                            backgroundColor: "#fee2e2",
                            color: "#ef4444",
                            padding: "0.15rem 0.4rem",
                            borderRadius: "4px",
                            fontSize: "0.7rem",
                            fontWeight: "bold"
                          }}
                        >
                          🚨 Critical
                        </span>
                      )}
                      <span className={`priority-badge ${tip.badgeClass}`} aria-label={`Priority: ${tip.priority}`}>
                        {tip.priority}
                      </span>
                    </div>
                  </div>
                  <h3 className="tip-title">{tip.title}</h3>
                  <p className="tip-detail"><GlossaryLinkedText text={tip.detail} /></p>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
