import React, { useState, useEffect } from 'react';
import { fetchOffsetProjects, purchaseCarbonOffset, fetchUserPortfolio } from '../services/carbonOffsetService';

/**
 * @component CarbonOffsetMarketplace
 * @description Main UI displaying available offset projects, impact metrics, and purchase flow.
 */
const CarbonOffsetMarketplace = () => {
    const [projects, setProjects] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [purchaseModal, setPurchaseModal] = useState({ open: false, project: null, tons: 1 });
    const [isPurchasing, setIsPurchasing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                const [projectsData, portfolioData] = await Promise.all([
                    fetchOffsetProjects(),
                    fetchUserPortfolio()
                ]);
                setProjects(projectsData);
                setPortfolio(portfolioData);
            } catch (err) {
                setError('Failed to load marketplace data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const handlePurchase = async () => {
        if (!purchaseModal.project) return;
        setIsPurchasing(true);
        try {
            await purchaseCarbonOffset(purchaseModal.project.id, purchaseModal.tons);
            setPurchaseModal({ open: false, project: null, tons: 1 });
            // Refresh portfolio
            const updatedPortfolio = await fetchUserPortfolio();
            setPortfolio(updatedPortfolio);
            alert('Thank you! Your carbon offset purchase was successful.');
        } catch (err) {
            alert(err.message || 'Purchase failed. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Marketplace...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Carbon Portfolio</h2>
                <p className="text-gray-600 dark:text-gray-300">
                    Total Offset: <span className="font-bold text-blue-600 dark:text-blue-400">{portfolio?.totalOffsetTons || 0} tons</span> of CO₂
                </p>
            </div>

            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">Available Offset Projects</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((project) => (
                    <div key={project.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700 h-32 flex items-center justify-center">
                            <span className="text-4xl">🌱</span>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{project.name}</h4>
                                <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                    {project.certification.replace('_', ' ')}
                                </span>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">{project.description}</p>

                            <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Location:</span>
                                    <span className="font-medium dark:text-gray-200">{project.location}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Price:</span>
                                    <span className="font-medium dark:text-gray-200">${project.pricePerTon.toFixed(2)} / ton</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Available:</span>
                                    <span className="font-medium dark:text-gray-200">{project.availableTons} tons</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setPurchaseModal({ open: true, project, tons: 1 })}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
                            >
                                Offset Now
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {purchaseModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Purchase Offset</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Supporting: <span className="font-semibold">{purchaseModal.project.name}</span>
                        </p>

                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tons of CO₂</label>
                            <input
                                type="number"
                                min="1"
                                max={purchaseModal.project.availableTons}
                                value={purchaseModal.tons}
                                onChange={(e) => setPurchaseModal({ ...purchaseModal, tons: Number(e.target.value) })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div className="flex justify-between items-center mb-6 text-lg font-bold dark:text-white">
                            <span>Total:</span>
                            <span>${(purchaseModal.tons * purchaseModal.project.pricePerTon).toFixed(2)}</span>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setPurchaseModal({ open: false, project: null, tons: 1 })}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                                disabled={isPurchasing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={isPurchasing}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                            >
                                {isPurchasing ? 'Processing...' : 'Confirm Purchase'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CarbonOffsetMarketplace;
