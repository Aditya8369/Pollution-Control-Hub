import React, { useState, useEffect } from 'react';
import { logActivity, fetchFootprintSummary, updateReductionStep } from '../services/footprintPlannerService';

/**
 * @component CarbonFootprintPlanner
 * @description Comprehensive UI for activity logging, footprint trend charts, and interactive reduction plan checklists.
 */
const CarbonFootprintPlanner = () => {
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Form state
    const [formData, setFormData] = useState({
        category: 'COMMUTE',
        subcategory: 'car_petrol',
        quantity: '',
        date: new Date().toISOString().split('T')[0],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        loadSummary();
    }, []);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const data = await fetchFootprintSummary();
            setSummary(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.quantity || formData.quantity <= 0) {
            alert('Please enter a valid quantity.');
            return;
        }

        setIsSubmitting(true);
        try {
            await logActivity(formData);
            setFormData({ ...formData, quantity: '' }); // Reset quantity only
            await loadSummary();
        } catch (err) {
            alert(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStepToggle = async (stepId, currentStatus) => {
        try {
            await updateReductionStep(stepId, !currentStatus);
            await loadSummary();
        } catch (err) {
            alert('Failed to update step status.');
        }
    };

    const getDifficultyColor = (difficulty) => {
        const colors = {
            EASY: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
            MODERATE: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
            HARD: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        };
        return colors[difficulty] || colors.EASY;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                {error}
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Carbon Footprint Tracker</h2>
                <p className="text-gray-600 dark:text-gray-400 mt-2">
                    Log your daily activities, track your impact, and follow your personalized reduction plan.
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Activity Logging Form */}
                <div className="lg:col-span-1 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Log Activity</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Category</label>
                            <select
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                <option value="COMMUTE">Commute</option>
                                <option value="ENERGY">Energy</option>
                                <option value="DIET">Diet</option>
                                <option value="SHOPPING">Shopping</option>
                                <option value="TRAVEL">Travel</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Specific Activity</label>
                            <select
                                value={formData.subcategory}
                                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            >
                                {formData.category === 'COMMUTE' && (
                                    <>
                                        <option value="car_petrol">Petrol Car (per km)</option>
                                        <option value="car_electric">Electric Car (per km)</option>
                                        <option value="public_transit">Public Transit (per km)</option>
                                    </>
                                )}
                                {formData.category === 'ENERGY' && (
                                    <>
                                        <option value="electricity_grid">Grid Electricity (per kWh)</option>
                                        <option value="natural_gas">Natural Gas (per kWh)</option>
                                    </>
                                )}
                                {formData.category === 'DIET' && (
                                    <>
                                        <option value="meat_heavy">Meat-Heavy Diet (per day)</option>
                                        <option value="balanced">Balanced Diet (per day)</option>
                                        <option value="vegetarian">Vegetarian Diet (per day)</option>
                                    </>
                                )}
                                {formData.category === 'TRAVEL' && (
                                    <>
                                        <option value="domestic_flight">Domestic Flight (per km)</option>
                                        <option value="train">Train Travel (per km)</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                placeholder="e.g., 15"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date</label>
                            <input
                                type="date"
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            {isSubmitting ? 'Logging...' : 'Log Activity'}
                        </button>
                    </form>
                </div>

                {/* Summary and Reduction Plan */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Emissions</div>
                            <div className="text-3xl font-bold text-gray-900 dark:text-white mt-1">
                                {summary?.totalEmissions || 0} <span className="text-lg font-normal text-gray-500">kg CO₂</span>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                            <div className="text-sm text-gray-500 dark:text-gray-400 uppercase tracking-wide">Projected Annual Savings</div>
                            <div className="text-3xl font-bold text-green-600 mt-1">
                                {summary?.projectedAnnualSavings || 0} <span className="text-lg font-normal text-gray-500">kg CO₂</span>
                            </div>
                        </div>
                    </div>

                    {/* Reduction Plan Checklist */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Your Personalized Reduction Plan</h3>
                        <div className="space-y-3">
                            {summary?.activeReductionSteps.map((step) => (
                                <div
                                    key={step.id}
                                    className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${step.isCompleted
                                            ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
                                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={step.isCompleted}
                                        onChange={() => handleStepToggle(step.id, step.isCompleted)}
                                        className="mt-1 w-5 h-5 text-green-600 rounded focus:ring-green-500 border-gray-300"
                                    />
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className={`font-semibold ${step.isCompleted ? 'text-green-800 dark:text-green-300 line-through' : 'text-gray-900 dark:text-white'}`}>
                                                {step.title}
                                            </h4>
                                            <span className={`px-2 py-0.5 text-xs font-bold rounded-full ${getDifficultyColor(step.difficulty)}`}>
                                                {step.difficulty}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{step.description}</p>
                                        <div className="text-xs text-green-600 dark:text-green-400 font-medium mt-2">
                                            Potential savings: {step.potentialSavingsKg} kg CO₂/month
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CarbonFootprintPlanner;
