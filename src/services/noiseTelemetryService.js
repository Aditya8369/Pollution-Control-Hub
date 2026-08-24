/**
 * Enterprise Architectural Specification:
 * Module: Noise Pollution Telemetry Core Service Engine
 * File: src/services/noiseTelemetryService.js
 * Domain: Noise Level Decibel Aggregations, Inverse-Square Attenuation Math, WHO Compliance Audits
 */

/**
 * Risk bands returned by {@link NoiseTelemetryService#evaluateWhoCompliance}.
 *
 * Exported as a frozen object rather than left as bare string literals in the
 * function body. A caller comparing against `RISK_CATEGORY.HIGH_EXPOSURE` gets a
 * `TypeError` on a typo; a caller comparing against `'HIGH_EXPOSURE'` gets a
 * silently-false branch, which is how the bug this replaces stayed hidden.
 */
export const RISK_CATEGORY = Object.freeze({
  SAFE: 'SAFE',
  MODERATE_EXPOSURE: 'MODERATE_EXPOSURE',
  HIGH_EXPOSURE: 'HIGH_EXPOSURE',
  SEVERE_HEARING_RISK: 'SEVERE_HEARING_RISK',
});

/** Level at and above which sustained exposure carries hearing-damage risk (WHO). */
const HIGH_EXPOSURE_THRESHOLD_DBA = 75.0;

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
   *
   * @param {number} splRef Sound pressure level measured at `rRef`, in dBA.
   * @param {number} rRef Distance at which `splRef` was measured, in metres.
   * @param {number} rTarget Distance to evaluate, in metres.
   * @returns {number} Sound pressure level at `rTarget`, in dBA.
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
   * Evaluates WHO Sound Exposure Compliance Status.
   *
   * The four bands are ordered most severe first, so a reading only ever matches
   * one of them:
   *
   * - `>= 85 dBA` — SEVERE_HEARING_RISK
   * - `>= 75 dBA` — HIGH_EXPOSURE
   * - over the applicable WHO limit (55 day / 45 night) — MODERATE_EXPOSURE
   * - otherwise — SAFE
   *
   * @param {number} dbaValue Measured level, in dBA.
   * @param {boolean} [isNighttime] Apply the 45 dBA night limit rather than the 55 dBA day limit.
   * @returns {{dbaValue: number, limit: number, isExceeded: boolean, isSevereRisk: boolean,
   *           exceededMargin: number, riskCategory: string}}
   */
  evaluateWhoCompliance(dbaValue, isNighttime = false) {
    if (!Number.isFinite(dbaValue)) {
      throw new Error('Decibel value must be a finite number.');
    }

    const limit = isNighttime ? this.whoNightLimit : this.whoDayLimit;
    const isExceeded = dbaValue > limit;
    const isSevereRisk = dbaValue >= this.whoHearingRiskThreshold;

    // Previously the middle branch assigned to `fontCategory`, an identifier that
    // does not exist. Under a module's strict mode that is a ReferenceError, not
    // an implicit global, so every reading in the 75–85 dBA band — the busy-road
    // and construction-site band this service exists to report on — threw.
    let riskCategory = RISK_CATEGORY.SAFE;
    if (isSevereRisk) {
      riskCategory = RISK_CATEGORY.SEVERE_HEARING_RISK;
    } else if (dbaValue >= HIGH_EXPOSURE_THRESHOLD_DBA) {
      riskCategory = RISK_CATEGORY.HIGH_EXPOSURE;
    } else if (isExceeded) {
      riskCategory = RISK_CATEGORY.MODERATE_EXPOSURE;
    }

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
   *
   * This is the *average* level over a set of measurements — "how loud was it,
   * typically". Two readings of 70 dBA average to 70 dBA. For "how loud is it
   * with both sources running at once", which is a different question with a
   * different answer, use {@link NoiseTelemetryService#calculateCombinedSourceDba}.
   *
   * @param {number[]} dbaArray Measurements in dBA.
   * @returns {number} Energy-averaged level in dBA, or 0 for an empty input.
   */
  calculateLogarithmicAverageDba(dbaArray) {
    const values = NoiseTelemetryService.#finiteValues(dbaArray);
    if (values.length === 0) {
      return 0.0;
    }
    const sumLinear = values.reduce((acc, dba) => acc + Math.pow(10, dba / 10), 0);
    const avgLinear = sumLinear / values.length;
    const logAvg = 10 * Math.log10(avgLinear);
    return parseFloat(logAvg.toFixed(1));
  }

  /**
   * Calculates the Combined Sound Pressure Level of Simultaneous Sources
   * L_total = 10 * log10( sum( 10^(L_i / 10) ) )
   *
   * This is logarithmic *addition*, and it is what the "+3 dB rule" describes:
   * two incoherent sources of equal level combine to 3 dB above either one, so
   * 70 dBA and 70 dBA running together read 73 dBA.
   *
   * Distinct from {@link NoiseTelemetryService#calculateLogarithmicAverageDba},
   * which answers "what was the typical level across these readings". Conflating
   * the two understates a multi-source site by 10*log10(N) dB.
   *
   * @param {number[]} dbaArray Levels of each simultaneous source, in dBA.
   * @returns {number} Combined level in dBA, or 0 for an empty input.
   */
  calculateCombinedSourceDba(dbaArray) {
    const values = NoiseTelemetryService.#finiteValues(dbaArray);
    if (values.length === 0) {
      return 0.0;
    }
    const sumLinear = values.reduce((acc, dba) => acc + Math.pow(10, dba / 10), 0);
    const combined = 10 * Math.log10(sumLinear);
    return parseFloat(combined.toFixed(1));
  }

  /**
   * Computes Buffer Distance Required to Reach Quiet Zone Standard (55 dBA)
   * r_buffer = r_ref * 10^((SPL_ref - 55) / 20)
   *
   * @param {number} splRef Source level measured at `rRef`, in dBA.
   * @param {number} [rRef] Distance at which `splRef` was measured, in metres.
   * @returns {number} Distance in metres at which the level falls to 55 dBA, rounded up.
   */
  calculateQuietZoneBufferMeters(splRef, rRef = 5.0) {
    if (!Number.isFinite(splRef) || !Number.isFinite(rRef) || rRef <= 0) {
      throw new Error('Reference level and distance must be finite, and distance strictly positive.');
    }
    if (splRef <= 55.0) return rRef;
    const ratio = Math.pow(10, (splRef - 55.0) / 20.0);
    const rBuffer = rRef * ratio;
    return Math.ceil(rBuffer);
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

  /**
   * The finite numbers in `input`, or an empty array if it is not an array.
   *
   * A single `null` in a telemetry batch used to turn the whole aggregate into
   * `NaN` — `Math.pow(10, null / 10)` is 1, not NaN, so it did not even fail
   * loudly; it quietly contributed a 0 dBA source. Dropping non-numbers keeps one
   * bad sample from rewriting the reading.
   *
   * @param {unknown} input
   * @returns {number[]}
   */
  static #finiteValues(input) {
    if (!Array.isArray(input)) return [];
    return input.filter((value) => typeof value === 'number' && Number.isFinite(value));
  }
}

export const noiseTelemetryService = new NoiseTelemetryService();
