/**
 * Enterprise Architectural Specification:
 * Module: Solar Radiation & UV Index Core Service Engine
 * File: src/services/solarUvService.js
 * Domain: Erythemal Dose Math, Ozone Dobson Unit Attenuation, WHO Solar Safety Standards
 */

export class SolarUvService {
  constructor(config = {}) {
    this.whoUvLimitExtreme = config.whoUvLimitExtreme || 11.0;
    this.whoUvLimitVeryHigh = config.whoUvLimitVeryHigh || 8.0;
    this.whoUvLimitHigh = config.whoUvLimitHigh || 6.0;
    this.standardOzoneDobson = 300.0;
  }

  /**
   * Calculates Erythemal Sunburn Time in Minutes
   * Burn_Minutes = (200 * SkinFactor) / (UVI * 10)
   */
  calculateSunburnMinutes(uvi, skinType = 2) {
    if (uvi < 0 || skinType < 1) {
      throw new Error('UV Index and Skin Type must be valid positive values.');
    }
    if (uvi === 0) return 999;

    const skinFactors = { 1: 1.0, 2: 1.5, 3: 2.0, 4: 3.0 };
    const factor = skinFactors[skinType] || 1.5;

    const burnMinutes = Math.max(5, Math.round((200.0 * factor) / (uvi * 10.0)));
    return burnMinutes;
  }

  /**
   * Evaluates Solar Irradiance W/m2 to UV Index Ratio:
   * UVI = SolarIrradiance_W_m2 / 75.0 (approximate clear-sky sea level scaling)
   */
  convertSolarIrradianceToUvi(solarIrradianceWm2) {
    if (solarIrradianceWm2 < 0) {
      throw new Error('Solar irradiance must be non-negative.');
    }
    const uvi = parseFloat((solarIrradianceWm2 / 75.0).toFixed(1));
    return uvi;
  }

  /**
   * Evaluates WHO UV Exposure Category & Recommended Protective Action
   */
  evaluateWhoUvSafety(uvi) {
    let riskCategory = 'LOW';
    let recommendedSpf = 15;
    let shadeRequired = false;

    if (uvi >= this.whoUvLimitExtreme) {
      riskCategory = 'EXTREME';
      recommendedSpf = 50;
      shadeRequired = true;
    } else if (uvi >= this.whoUvLimitVeryHigh) {
      riskCategory = 'VERY_HIGH';
      recommendedSpf = 50;
      shadeRequired = true;
    } else if (uvi >= this.whoUvLimitHigh) {
      riskCategory = 'HIGH';
      recommendedSpf = 30;
      shadeRequired = true;
    } else if (uvi >= 3.0) {
      riskCategory = 'MODERATE';
      recommendedSpf = 30;
      shadeRequired = false;
    }

    return {
      uvi,
      riskCategory,
      recommendedSpf,
      shadeRequired
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

export const solarUvService = new SolarUvService();
