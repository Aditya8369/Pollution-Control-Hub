import React from 'react';

interface ChartControlsProps {
  viewMode: 'line' | 'bar' | 'pie';
  setViewMode: (mode: 'line' | 'bar' | 'pie') => void;
  isLogScale: boolean;
  setIsLogScale: (val: boolean) => void;
}

export const ChartControls: React.FC<ChartControlsProps> = ({
  viewMode,
  setViewMode,
  isLogScale,
  setIsLogScale,
}) => {
  return (
    <div className="chart-controls-wrapper" role="toolbar" aria-label="Chart data view controls">
      {/* View Mode Toggle Buttons */}
      <button
        className={viewMode === 'line' ? 'active' : ''}
        onClick={() => setViewMode('line')}
        aria-label="Switch view to Line Chart"
        aria-pressed={viewMode === 'line'}
      >
        📈 Line
      </button>

      <button
        className={viewMode === 'bar' ? 'active' : ''}
        onClick={() => setViewMode('bar')}
        aria-label="Switch view to Bar Chart"
        aria-pressed={viewMode === 'bar'}
      >
        📊 Bar
      </button>

      {/* Axis Scale Toggle Switches */}
      <button
        className={`scale-toggle ${isLogScale ? 'enabled' : ''}`}
        onClick={() => setIsLogScale(!isLogScale)}
        aria-label="Toggle Logarithmic Scale"
        aria-pressed={isLogScale}
      >
        Log Scale
      </button>
    </div>
  );
};
