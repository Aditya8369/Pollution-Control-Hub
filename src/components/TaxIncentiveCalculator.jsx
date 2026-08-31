import React, { useState, useEffect } from 'react';
import { fetchActiveRules, runSimulation } from '../services/taxCalculationService';

/**
 * @component TaxIncentiveCalculator
 * @description Interactive dashboard for inputting tax rates, incentive thresholds, and viewing projected financial and environmental outcomes.
 */
const TaxIncentiveCalculator = () => {
    const [rules, setRules] = useState({ taxRules: [], incentiveRules: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [params, setParams] = useState({
        baselineEmissions: 10000,
        projectedReductionPercentage: 20,
    });

    const [result, setResult] = useState(null);
    const [isSimulating, setIsSimulating] = useState(false);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        try {
            const data = await fetchActiveRules();
            setRules(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSimulate = async () => {
        setIsSimulating(true);
        setError(null);
        try {
            const simulationResult = await runSimulation({
                ...params,
                taxRules: rules.taxRules,
                incentiveRules: rules.incentiveRules,
            });
            setResult(simulationResult);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSimulating(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div></div>;

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dynamic Tax & Incentive Simulation Engine</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Model the financial and environmental impact of pollution taxes and green incentives.
                </p>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Configuration Panel */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-700 pb-2">
                        Simulation Parameters
                    </h3>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Baseline Emissions: {params.baselineEmissions.toLocaleString()} tons
                        </label>
                        <input
                            type="range"
                            min="1000"
                            max="50000"
                            step="500"
                            value={params.baselineEmissions}
                            onChange={(e) => setParams({ ...params, baselineEmissions: parseInt(e.target.value) })}
                            className="w-full accent-blue-600"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Projected Reduction: {params.projectedReductionPercentage}%
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            step="1"
                            value={params.projectedReductionPercentage}
                            onChange={(e) => setParams({ ...params, projectedReductionPercentage: parseInt(e.target.value) })}
                            className="w-full accent-green-600"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">Active Tax Rules</h4>
                        {rules.taxRules.map(rule => (
                            <div key={rule.id} className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                • {rule.name}: ${rule.ratePerTon}/ton (above {rule.thresholdTons}t)
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={handleSimulate}
                        disabled={isSimulating}
                        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {isSimulating ? 'Calculating...' : 'Run Simulation'}
                    </button>
                </div>

                {/* Results Dashboard */}
                <div className="lg:col-span-2 space-y-6">
                    {!result ? (
                        <div className="h-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 p-12">
                            <div className="text-center text-gray-500 dark:text-gray-400">
                                <p>Adjust parameters and run simulation to view projections.</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projected Tax Revenue</div>
                                    <div className="text-3xl font-bold text-green-600 mt-1">
                                        ${result.totalTaxRevenue.toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                                    <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Incentives Distributed</div>
                                    <div className="text-3xl font-bold text-blue-600 mt-1">
                                        ${result.totalIncentivesDistributed.toLocaleString()}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Environmental Impact</h3>

                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-400">Net Emissions After Reduction</span>
                                            <span className="font-bold text-gray-900 dark:text-white">{result.netEmissionsAfterReduction.toLocaleString()} tons</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                            <div
                                                className="bg-orange-500 h-2.5 rounded-full transition-all duration-500"
                                                style={{ width: `${(result.netEmissionsAfterReduction / params.baselineEmissions) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-600 dark:text-gray-400">Environmental Benefit Score</span>
                                            <span className="font-bold text-green-600">{result.environmentalBenefitScore}/100</span>
                                        </div>
                                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                            <div
                                                className="bg-green-500 h-2.5 rounded-full transition-all duration-500"
                                                style={{ width: `${result.environmentalBenefitScore}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                        <strong>Net Financial Impact on Industries:</strong>{' '}
                                        <span className={result.financialImpactOnIndustries > 0 ? 'text-red-600' : 'text-green-600'}>
                                            ${Math.abs(result.financialImpactOnIndustries).toLocaleString()}
                                            {result.financialImpactOnIndustries > 0 ? ' (Net Cost)' : ' (Net Benefit)'}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TaxIncentiveCalculator;
