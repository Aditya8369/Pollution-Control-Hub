/**
 * Enterprise Architectural Specification:
 * Module: Urban Ambient EMF Core Service Engine
 * File: src/services/ambientEmfService.js
 * Domain: Power Density Attenuation Math, ICNIRP Safety Limits, Frequency Spectrum Categorization
 */

export class AmbientEmfService {
  constructor(config = {}) {
    this.icnirpPublicLimitWm2 = config.icnirpPublicLimitWm2 || 10.0;
    this.icnirpPublicMagneticUt = config.icnirpPublicMagneticUt || 200.0;
  }

  /**
   * Calculates Power Density Distance Decay using Inverse-Square Law:
   * PowerDensity_Target = PowerDensity_Ref / (Distance_Target / Distance_Ref)^2
   */
  calculateDistanceAttenuation(powerDensityRef, distanceRef = 2.0, distanceTarget = 10.0) {
    if (distanceTarget <= 0 || distanceRef <= 0 || powerDensityRef < 0) {
      throw new Error('Distances must be strictly positive and power density non-negative.');
    }
    const ratio = distanceTarget / distanceRef;
    const powerDensityTarget = powerDensityRef / Math.pow(ratio, 2);
    return parseFloat(powerDensityTarget.toFixed(2));
  }

  /**
   * Calculates Minimum Safe Distance to reach ICNIRP 10.0 W/m² limit
   */
  calculateSafeBufferDistanceMeters(powerDensityRef, distanceRef = 2.0) {
    if (powerDensityRef <= this.icnirpPublicLimitWm2) return distanceRef;
    const safeDistance = distanceRef * Math.sqrt(powerDensityRef / this.icnirpPublicLimitWm2);
    return Math.ceil(safeDistance);
  }

  /**
   * Evaluates ICNIRP Regulatory Public Safety Compliance
   */
  evaluateIcnirpCompliance(powerDensityWm2, magneticFieldUt = 0.0) {
    const isPowerDensityExceeded = powerDensityWm2 > this.icnirpPublicLimitWm2;
    const isMagneticExceeded = magneticFieldUt > this.icnirpPublicMagneticUt;

    const isFullyCompliant = !isPowerDensityExceeded && !isMagneticExceeded;

    return {
      isFullyCompliant,
      isPowerDensityExceeded,
      isMagneticExceeded,
      powerDensityMargin: parseFloat((powerDensityWm2 - this.icnirpPublicLimitWm2).toFixed(2))
    };
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

export const ambientEmfService = new AmbientEmfService();
