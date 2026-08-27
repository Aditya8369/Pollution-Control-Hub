/**
 * Unit Tests for CAAQMS Sensor Calibration Utilities
 */

import { describe, it, expect } from 'vitest';
import { calibrateCaaqmsSensor } from './caaqmsSensorCalibrationUtils';

describe('CaaqmsSensorCalibrationUtils', () => {
  it('should calibrate OPC optical sensor readings under high humidity conditions', () => {
    const res = calibrateCaaqmsSensor('OPC-901', 250.0, 85.0);
    expect(res).toBeDefined();
    expect(res.calibratedPm10UgM3).toBeLessThan(250.0);
    expect(res.driftPercentage).toBeGreaterThan(0.0);
  });
});
