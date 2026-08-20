import { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  getCalibrationHistory,
  getCalibrationVersion,
  saveCalibrationVersion,
} from '../services/calibrationVersionService';

export default function CalibrationHistory({ sensorId }) {
  const [versions, setVersions] = useState([]);
  const [parameters, setParameters] = useState('');
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Which sensor the panel is currently showing. A read for a sensor the user has
  // already navigated away from must not land on top of a newer one — without this,
  // whichever IndexedDB request finished last won, so the panel could show sensor A's
  // revisions under sensor B's heading.
  const activeSensorRef = useRef(sensorId);
  activeSensorRef.current = sensorId;

  const loadHistory = useCallback(async () => {
    if (!sensorId) return;

    setLoading(true);
    setError(null);

    try {
      const history = await getCalibrationHistory(sensorId);
      if (activeSensorRef.current !== sensorId) return;
      setVersions(history);
    } catch (err) {
      if (activeSensorRef.current !== sensorId) return;
      setError(err.message || 'Failed to load calibration history.');
      // Leaving stale revisions on screen next to an error implies they belong to this
      // sensor. They may not.
      setVersions([]);
    } finally {
      if (activeSensorRef.current === sensorId) setLoading(false);
    }
  }, [sensorId]);

  useEffect(() => {
    // Clear before reading, so the previous sensor's revisions are never shown under the
    // new sensor's heading while the new read is in flight.
    setVersions([]);
    setSelectedVersion(null);
    loadHistory();
  }, [loadHistory]);

  async function handleSave(event) {
    event.preventDefault();

    if (!parameters.trim()) return;

    setSaving(true);
    setError(null);

    try {
      let parsedParameters;

      try {
        parsedParameters = JSON.parse(parameters);
      } catch {
        parsedParameters = { value: parameters.trim() };
      }

      await saveCalibrationVersion({
        sensorId,
        calibrationParameters: parsedParameters,
      });

      setParameters('');
      setSelectedVersion(null);
      await loadHistory();
    } catch (err) {
      setError(err.message || 'Failed to save calibration version.');
    } finally {
      setSaving(false);
    }
  }

  async function handleViewVersion(version) {
    try {
      const record = await getCalibrationVersion(sensorId, version);
      setSelectedVersion(record);
    } catch (err) {
      setError(err.message || 'Failed to retrieve calibration version.');
    }
  }

  if (!sensorId) return null;

  return (
    <section
      data-testid="calibration-history"
      className="section-card"
      style={{ marginTop: '1.5rem', padding: '1.5rem' }}
    >
      <header style={{ marginBottom: '1.25rem' }}>
        <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
          Sensor Calibration History
        </h2>
        <p style={{ margin: '0.4rem 0 0', opacity: 0.75 }}>
          Keep historic revisions of calibration parameters.
        </p>
      </header>

      <form onSubmit={handleSave} style={{ marginBottom: '1.5rem' }}>
        <label
          htmlFor="calibration-parameters"
          style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}
        >
          Calibration parameters
        </label>

        <textarea
          id="calibration-parameters"
          value={parameters}
          onChange={(event) => setParameters(event.target.value)}
          placeholder='Example: {"pm25Offset": 1.2, "pm10Offset": -0.4}'
          rows={3}
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            border: '1px solid rgba(0,0,0,0.2)',
            resize: 'vertical',
          }}
        />

        <button
          type="submit"
          disabled={saving || !parameters.trim()}
          style={{ marginTop: '0.75rem' }}
        >
          {saving ? 'Saving...' : 'Save New Version'}
        </button>
      </form>

      {error && (
        <p role="alert" style={{ color: '#ef4444' }}>
          {error}
        </p>
      )}

      {loading && <p>Loading calibration history...</p>}

      {!loading && versions.length === 0 && (
        <p style={{ opacity: 0.7 }}>
          No calibration versions have been recorded yet.
        </p>
      )}

      {versions.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>
            Version History
          </h3>

          {versions.map((record) => (
            <div
              key={record.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '1rem',
                padding: '0.9rem 0',
                borderBottom: '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <div>
                <strong>Version {record.version}</strong>
                <div style={{ fontSize: '0.85rem', opacity: 0.7 }}>
                  {new Date(record.createdAt).toLocaleString()}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleViewVersion(record.version)}
              >
                View
              </button>
            </div>
          ))}
        </div>
      )}

      {selectedVersion && (
        <div
          style={{
            marginTop: '1.25rem',
            padding: '1rem',
            borderRadius: '0.5rem',
            background: 'rgba(0,0,0,0.05)',
          }}
        >
          <strong>Version {selectedVersion.version}</strong>

          <pre
            style={{
              marginTop: '0.75rem',
              overflowX: 'auto',
              whiteSpace: 'pre-wrap',
            }}
          >
            {JSON.stringify(
              selectedVersion.calibrationParameters,
              null,
              2
            )}
          </pre>
        </div>
      )}
    </section>
  );
}

CalibrationHistory.propTypes = {
  sensorId: PropTypes.string,
};
