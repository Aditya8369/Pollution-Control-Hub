import { useMemo, useState } from "react";

/**
 * Builds the plain-text complaint summary for a hotspot. Deliberately only
 * ever includes aggregate figures (count, date range, coordinates, generic
 * descriptions) — never individual report ids or any per-reporter identifying
 * detail, since the escalation draft may be forwarded to a real authority.
 */
export function buildEscalationDraftText(hotspot, { cityName } = {}) {
  const dateRange = `${new Date(hotspot.earliestReportAt).toLocaleDateString()} – ${new Date(
    hotspot.latestReportAt
  ).toLocaleDateString()}`;

  const location = cityName
    ? `${cityName} (approx. ${hotspot.centerLat.toFixed(4)}, ${hotspot.centerLon.toFixed(4)})`
    : `approx. ${hotspot.centerLat.toFixed(4)}, ${hotspot.centerLon.toFixed(4)}`;

  return [
    "POLLUTION HOTSPOT — COMMUNITY ESCALATION SUMMARY",
    "",
    `Location: ${location}`,
    `Reporting window: ${dateRange}`,
    `Independent reports received: ${hotspot.reportCount}`,
    `Community-weighted severity score: ${hotspot.averageSeverity.toFixed(1)} (avg. upvotes per report)`,
    "",
    `This location has received ${hotspot.reportCount} independent pollution reports from ` +
      `residents within a ~500m radius during the period above, indicating a recurring, ` +
      `community-confirmed issue rather than an isolated incident. We request that the ` +
      `relevant pollution-control authority review this location for inspection and remediation.`,
    "",
    "Generated via Pollution Control Hub's community reporting system. Individual reporter " +
      "identities are not included in this summary.",
  ].join("\n");
}

export default function EscalationDraft({ hotspot, cityName, onClose }) {
  const draftText = useMemo(
    () => buildEscalationDraftText(hotspot, { cityName }),
    [hotspot, cityName]
  );
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(draftText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be unavailable (e.g. insecure context) — the
      // textarea below still lets the user select-and-copy manually.
    }
  };

  return (
    <div className="escalation-draft">
      <div className="panel-head">
        <h3>Escalation Draft</h3>
        <p>Ready to submit to a local pollution-control authority</p>
      </div>

      <textarea
        readOnly
        className="escalation-draft__text"
        value={draftText}
        rows={12}
      />

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <button type="button" onClick={copyToClipboard}>
          {copied ? "Copied!" : "Copy draft"}
        </button>
        {onClose && (
          <button type="button" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}
