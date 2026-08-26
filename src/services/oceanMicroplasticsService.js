/**
 * Enterprise Architectural Specification:
 * Module: Ocean & Coastal Microplastics Core Service Engine
 * File: src/services/oceanMicroplasticsService.js
 * Domain: Marine Plastic Density Calculations, Bioaccumulation Factor (BAF), Skimmer Filtration Math
 */

export class OceanMicroplasticsService {
  constructor(config = {}) {
    this.noaaSafeThresholdParticlesM3 = config.noaaSafeThresholdParticlesM3 || 50.0;
    this.noaaCriticalThresholdParticlesM3 = config.noaaCriticalThresholdParticlesM3 || 1000.0;
  }

  /**
   * Calculates Total Plastic Removal Rate Per Hour:
   * Particles_Removed_Hr = ParticleDensity_m3 * Flow_m3_Hr * Efficiency
   */
  calculateSkimmerRemovalRate(particleDensityM3, flowM3Hour, meshEfficiency = 0.90) {
    if (particleDensityM3 < 0 || flowM3Hour < 0 || meshEfficiency < 0 || meshEfficiency > 1.0) {
      throw new Error('Valid non-negative parameters and efficiency between 0 and 1 required.');
    }
    const totalRemoved = Math.round(particleDensityM3 * flowM3Hour * meshEfficiency);
    const postFiltrationDensity = parseFloat((particleDensityM3 * (1.0 - meshEfficiency)).toFixed(1));

    return {
      particleDensityM3,
      flowM3Hour,
      meshEfficiencyPercent: meshEfficiency * 100,
      totalRemoved,
      postFiltrationDensity
    };
  }

  /**
   * Evaluates Trophic Bioaccumulation Risk Factor (BAF) for Trophic Levels (1 to 4)
   * BAF_Level = Concentration * TrophicMultiplier^Level
   */
  evaluateBioaccumulationRisk(particleDensityM3, trophicLevel = 3) {
    if (particleDensityM3 < 0 || trophicLevel < 1 || trophicLevel > 5) {
      throw new Error('Particle density must be non-negative and trophic level between 1 and 5.');
    }
    const bafFactor = parseFloat((particleDensityM3 * Math.pow(1.8, trophicLevel - 1)).toFixed(1));

    let riskCategory = 'LOW_TROPHIC_RISK';
    if (bafFactor >= 2000.0) riskCategory = 'CRITICAL_BIOACCUMULATION';
    else if (bafFactor >= 800.0) riskCategory = 'HIGH_TROPHIC_RISK';
    else if (bafFactor >= 200.0) riskCategory = 'MODERATE_TROPHIC_RISK';

    return {
      particleDensityM3,
      trophicLevel,
      bafFactor,
      riskCategory
    };
  }

  /**
   * Evaluates NOAA Marine Water Safety Compliance
   */
  evaluateNoaaCompliance(particleDensityM3) {
    const isExceeded = particleDensityM3 > this.noaaSafeThresholdParticlesM3;
    const isCritical = particleDensityM3 >= this.noaaCriticalThresholdParticlesM3;

    return {
      particleDensityM3,
      isExceeded,
      isCritical,
      exceededMargin: parseFloat(Math.max(0, particleDensityM3 - this.noaaSafeThresholdParticlesM3).toFixed(1))
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

export const oceanMicroplasticsService = new OceanMicroplasticsService();
