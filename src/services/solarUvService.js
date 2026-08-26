/**
 * Enterprise Architectural Specification:
 * Module: Solar Radiation & UV Index Core Service Engine
 * File: src/services/solarUvService.js
 * Domain: Erythemal Dose Math, Ozone Dobson Unit Attenuation, WHO Solar Safety Standards
 */

/**
 * Relative erythemal tolerance by Fitzpatrick phototype, I through VI.
 *
 * The scale runs to VI. It used to stop at 4, and the `|| 1.5` fallback below it
 * handed types V and VI the type II factor — the second most sun-sensitive skin
 * on the scale — so the two phototypes with the most natural photoprotection were
 * told they would burn in roughly a third of the time they actually would, on a
 * screen that gave no sign their input had not been understood.
 */
export const FITZPATRICK_SKIN_FACTORS = Object.freeze({
  1: 1.0,   // Type I   — always burns, never tans
  2: 1.5,   // Type II  — usually burns, tans minimally
  3: 2.0,   // Type III — sometimes burns, tans uniformly
  4: 3.0,   // Type IV  — rarely burns, tans easily
  5: 5.0,   // Type V   — very rarely burns, tans profusely
  6: 10.0,  // Type VI  — never burns, deeply pigmented
});

/** Returned in place of a burn time when there is no erythemal risk at all. */
export const NO_BURN_RISK_MINUTES = 999;

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
   *
   * The result is the real burn time. It used to be clamped with
   * `Math.max(5, …)`, which only ever moved the answer upward, and only in the
   * conditions where the margin matters most: at UVI 10 a type II reading of 3
   * minutes was reported as 5, overstating safe exposure by 67%. A UI that
   * prefers to render "under 5 minutes" can do that with the real number in
   * hand — the service should not decide it on the UI's behalf.
   *
   * @param {number} uvi UV index, 0 or greater.
   * @param {number} [skinType] Fitzpatrick phototype, an integer 1-6.
   * @returns {number} Minutes to erythema, or {@link NO_BURN_RISK_MINUTES} at UVI 0.
   * @throws {Error} If `uvi` is negative or not finite, or `skinType` is not 1-6.
   */
  calculateSunburnMinutes(uvi, skinType = 2) {
    if (!Number.isFinite(uvi) || uvi < 0) {
      throw new Error('UV Index and Skin Type must be valid positive values.');
    }
    if (!Number.isInteger(skinType) || skinType < 1 || skinType > 6) {
      throw new Error('Skin type must be a Fitzpatrick phototype between 1 and 6.');
    }
    if (uvi === 0) return NO_BURN_RISK_MINUTES;

    const factor = FITZPATRICK_SKIN_FACTORS[skinType];

    return Math.round((200.0 * factor) / (uvi * 10.0));
  }

  /**
   * Evaluates Solar Irradiance W/m2 to UV Index Ratio:
   * UVI = SolarIrradiance_W_m2 / 75.0 (approximate clear-sky sea level scaling)
   *
   * @param {number} solarIrradianceWm2 Broadband solar irradiance in W/m^2.
   * @returns {number} Approximate UV index, to one decimal place.
   */
  convertSolarIrradianceToUvi(solarIrradianceWm2) {
    if (!Number.isFinite(solarIrradianceWm2) || solarIrradianceWm2 < 0) {
      throw new Error('Solar irradiance must be non-negative.');
    }
    const uvi = parseFloat((solarIrradianceWm2 / 75.0).toFixed(1));
    return uvi;
  }

  /**
   * Evaluates WHO UV Exposure Category & Recommended Protective Action
   *
   * @param {number} uvi UV index.
   * @returns {{uvi: number, riskCategory: string, recommendedSpf: number, shadeRequired: boolean}}
   */
  evaluateWhoUvSafety(uvi) {
    if (!Number.isFinite(uvi) || uvi < 0) {
      throw new Error('UV Index must be a finite non-negative number.');
    }

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
   * A burn time rendered for display, without losing the real figure.
   *
   * The five-minute floor that used to live inside `calculateSunburnMinutes`
   * was a presentation decision — nobody sets a three-minute timer — expressed
   * as arithmetic, where it corrupted the number every caller depended on. It
   * belongs here instead, where the label is explicitly a label and
   * `minutes` still carries the truth.
   *
   * @param {number} uvi UV index.
   * @param {number} [skinType] Fitzpatrick phototype, an integer 1-6.
   * @returns {{minutes: number, label: string, isUrgent: boolean}}
   */
  describeSunburnRisk(uvi, skinType = 2) {
    const minutes = this.calculateSunburnMinutes(uvi, skinType);

    if (minutes === NO_BURN_RISK_MINUTES) {
      return { minutes, label: 'No burn risk', isUrgent: false };
    }
    if (minutes < 5) {
      return { minutes, label: 'Under 5 minutes', isUrgent: true };
    }
    if (minutes >= 120) {
      const hours = Math.floor(minutes / 60);
      return { minutes, label: `About ${hours} hours`, isUrgent: false };
    }
    return { minutes, label: `About ${minutes} minutes`, isUrgent: minutes < 15 };
  }

  /**
   * Input Sanitizer against Script Injection
   *
   * @param {unknown} str
   * @returns {string}
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
