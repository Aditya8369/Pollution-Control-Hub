/**
 * Enterprise Architectural Specification:
 * Module: Industrial Wastewater Effluent Core Service Engine
 * File: src/services/industrialEffluentService.js
 * Domain: Mass Balance Calculations, BOD/COD Ratios, Treatment Removal Efficiencies
 */

export class IndustrialEffluentService {
  constructor(config = {}) {
    this.cpcbBodLimitMgL = config.cpcbBodLimitMgL || 30.0;
    this.cpcbCodLimitMgL = config.cpcbCodLimitMgL || 250.0;
    this.cpcbChromiumLimitPpm = config.cpcbChromiumLimitPpm || 2.0;
  }

  /**
   * Calculates Daily Mass Loading in Kg/day:
   * Mass_Kg_Day = (Concentration_mg_L * Flow_KLD) / 1000
   */
  calculateDailyMassLoading(concentrationMgL, flowKld) {
    if (concentrationMgL < 0 || flowKld < 0) {
      throw new Error('Concentration and flow rate must be non-negative.');
    }
    const massKgDay = (concentrationMgL * flowKld) / 1000.0;
    return parseFloat(massKgDay.toFixed(2));
  }

  /**
   * Evaluates BOD/COD Ratio for Biodegradability Index:
   * BOD/COD >= 0.5 -> Highly Biodegradable
   * BOD/COD < 0.3 -> Toxic / Refractory (Requires Advanced Oxidation)
   */
  evaluateBiodegradabilityIndex(bodMgL, codMgL) {
    if (codMgL <= 0) {
      throw new Error('COD concentration must be strictly positive.');
    }
    const ratio = parseFloat((bodMgL / codMgL).toFixed(2));
    let classification = 'MODERATE_BIODEGRADABLE';

    if (ratio >= 0.5) classification = 'HIGHLY_BIODEGRADABLE';
    else if (ratio < 0.3) classification = 'TOXIC_REFRACTORY';

    return {
      bodMgL,
      codMgL,
      ratio,
      classification
    };
  }

  /**
   * Evaluates CPCB Discharge Limit Compliance
   */
  evaluateDischargeCompliance(bodMgL, codMgL, chromiumPpm = 0.0) {
    const isBodExceeded = bodMgL > this.cpcbBodLimitMgL;
    const isCodExceeded = codMgL > this.cpcbCodLimitMgL;
    const isChromiumExceeded = chromiumPpm > this.cpcbChromiumLimitPpm;

    const isFullyCompliant = !isBodExceeded && !isCodExceeded && !isChromiumExceeded;

    return {
      isFullyCompliant,
      isBodExceeded,
      isCodExceeded,
      isChromiumExceeded,
      bodMargin: parseFloat((bodMgL - this.cpcbBodLimitMgL).toFixed(1)),
      codMargin: parseFloat((codMgL - this.cpcbCodLimitMgL).toFixed(1))
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

export const industrialEffluentService = new IndustrialEffluentService();
