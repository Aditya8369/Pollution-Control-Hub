/**
 * Enterprise Architectural Specification:
 * Module: Noise Pollution Telemetry Core Service Engine
 * File: src/services/noiseTelemetryService.js
 * Domain: Noise Level Decibel Aggregations, Inverse-Square Attenuation Math, WHO Compliance Audits
 */

export class NoiseTelemetryService {
  constructor(config = {}) {
    this.defaultBaselineDba = config.defaultBaselineDba || 60.0;
    this.whoDayLimit = 55.0;
    this.whoNightLimit = 45.0;
    this.whoHearingRiskThreshold = 85.0;
  }

  /**
   * Calculates Inverse-Square Law Sound Pressure Level Attenuation
   * SPL_2 = SPL_1 - 20 * log10(r2 / r1)
   */
  calculateSoundAttenuation(splRef, rRef, rTarget) {
    if (rTarget <= 0 || rRef <= 0) {
      throw new Error('Distance must be strictly positive.');
    }
    const attenuation = 20 * Math.log10(rTarget / rRef);
    const splTarget = Math.max(0, splRef - attenuation);
    return parseFloat(splTarget.toFixed(2));
  }

  /**
   * Evaluates WHO Sound Exposure Compliance Status
   */
  evaluateWhoCompliance(dbaValue, isNighttime = false) {
    const limit = isNighttime ? this.whoNightLimit : this.whoDayLimit;
    const isExceeded = dbaValue > limit;
    const isSevereRisk = dbaValue >= this.whoHearingRiskThreshold;

    let riskCategory = 'SAFE';
    if (isSevereRisk) riskCategory = 'SEVERE_HEARING_RISK';
    else if (dbaValue >= 75.0) fontCategory = 'HIGH_EXPOSURE';
    else if (isExceeded) riskCategory = 'MODERATE_EXPOSURE';

    return {
      dbaValue,
      limit,
      isExceeded,
      isSevereRisk,
      exceededMargin: parseFloat(Math.max(0, dbaValue - limit).toFixed(1)),
      riskCategory
    };
  }

  /**
   * Calculates Energy Average of Decibel Measurements (Logarithmic Addition)
   * L_avg = 10 * log10( (1/N) * sum( 10^(L_i / 10) ) )
   */
  calculateLogarithmicAverageDba(dbaArray) {
    if (!Array.isArray(dbaArray) || dbaArray.length === 0) {
      return 0.0;
    }
    const sumLinear = dbaArray.reduce((acc, dba) => acc + Math.pow(10, dba / 10), 0);
    const avgLinear = sumLinear / dbaArray.length;
    const logAvg = 10 * Math.log10(avgLinear);
    return parseFloat(logAvg.toFixed(1));
  }

  /**
   * Computes Buffer Distance Required to Reach Quiet Zone Standard (55 dBA)
   * r_buffer = r_ref * 10^((SPL_ref - 55) / 20)
   */
  calculateQuietZoneBufferMeters(splRef, rRef = 5.0) {
    if (splRef <= 55.0) return rRef;
    const ratio = Math.pow(10, (splRef - 55.0) / 20.0);
    const rBuffer = rRef * ratio;
    return Math.ceil(rBuffer);
  }

  /**
   * Input Sanitizer against Script Injection
   */
  sanitizeInput(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, (match) => {
      const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
      };
      return map[match];
    });
  }
}

export const noiseTelemetryService = new NoiseTelemetryService();
