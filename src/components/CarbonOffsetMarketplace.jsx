import React, { useState, useEffect, useCallback } from 'react';
import { fetchOffsetProjects, purchaseCarbonOffset, fetchUserPortfolio } from '../services/carbonOffsetService';
import { validateQuantity, formatUsd, lineTotal, certificationLabel } from '../utils/offsetQuantity';

/**
 * @component CarbonOffsetMarketplace
 * @description Main UI displaying available offset projects, impact metrics, and purchase flow.
 */
const CarbonOffsetMarketplace = () => {
    const [projects, setProjects] = useState([]);
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // `tons` is kept as the raw string the user typed. Coercing on every keystroke
    // erased the difference between an empty field and a deliberate 0, and turned a
    // half-typed "1e" into NaN before anything could object to it.
    const [purchaseModal, setPurchaseModal] = useState({ open: false, project: null, tons: '1' });
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [purchaseError, setPurchaseError] = useState(null);
    const [confirmation, setConfirmation] = useState(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [projectsData, portfolioData] = await Promise.all([
                fetchOffsetProjects(),
                fetchUserPortfolio()
            ]);
            setProjects(Array.isArray(projectsData) ? projectsData : []);
            setPortfolio(portfolioData);
            setError(null);
        } catch (err) {
            setError('Failed to load marketplace data.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const quantity = validateQuantity(purchaseModal.tons, purchaseModal.project?.availableTons);
    const total = lineTotal(quantity.tons, purchaseModal.project?.pricePerTon);
    const canConfirm = quantity.valid && total !== null && !isPurchasing;

    const closeModal = () => {
        setPurchaseModal({ open: false, project: null, tons: '1' });
        setPurchaseError(null);
    };

    const handlePurchase = async () => {
        if (!purchaseModal.project) return;
        // The button is disabled while this is false, but the check is repeated here so
        // the guarantee does not depend on the button being the only way in.
        if (!quantity.valid) {
            setPurchaseError(quantity.error);
            return;
        }

        setIsPurchasing(true);
        setPurchaseError(null);
        try {
            await purchaseCarbonOffset(purchaseModal.project.id, quantity.tons);
            closeModal();
            // Availability changed, so the project list is now stale too — refreshing
            // only the portfolio left every card advertising its pre-purchase stock.
            const [updatedProjects, updatedPortfolio] = await Promise.all([
                fetchOffsetProjects().catch(() => null),
                fetchUserPortfolio(),
            ]);
            if (updatedProjects) setProjects(Array.isArray(updatedProjects) ? updatedProjects : []);
            setPortfolio(updatedPortfolio);
            setConfirmation(`Thank you — ${quantity.tons} ton${quantity.tons === 1 ? '' : 's'} of CO\u2082 offset.`);
        } catch (err) {
            setPurchaseError(err?.message || 'Purchase failed. Please try again.');
        } finally {
            setIsPurchasing(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500" data-testid="marketplace-loading">Loading Marketplace...</div>;
    if (error) {
        return (
            <div className="p-8 text-center" data-testid="marketplace-error">
                <p className="text-red-500 mb-4">{error}</p>
                <button
                    onClick={loadData}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 p-6 rounded-lg border border-blue-100 dark:border-blue-800">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Your Carbon Portfolio</h2>
                <p className="text-gray-600 dark:text-gray-300">
                    Total Offset: <span className="font-bold text-blue-600 dark:text-blue-400" data-testid="portfolio-total">{portfolio?.totalOffsetTons ?? 0} tons</span> of CO₂
                </p>
            </div>

            {confirmation && (
                <div
                    role="status"
                    data-testid="purchase-confirmation"
                    className="mb-6 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md text-green-800 dark:text-green-300 text-sm"
                >
                    {confirmation}
                </div>
            )}

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
                                {certificationLabel(project.certification) && (
                                    <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                                        {certificationLabel(project.certification)}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 flex-1">{project.description}</p>

                            <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Location:</span>
                                    <span className="font-medium dark:text-gray-200">{project.location}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Price:</span>
                                    <span className="font-medium dark:text-gray-200" data-testid={`price-${project.id}`}>{formatUsd(project.pricePerTon)} / ton</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Available:</span>
                                    <span className="font-medium dark:text-gray-200" data-testid={`available-${project.id}`}>{project.availableTons ?? 0} tons</span>
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    setPurchaseError(null);
                                    setConfirmation(null);
                                    setPurchaseModal({ open: true, project, tons: '1' });
                                }}
                                disabled={lineTotal(1, project.pricePerTon) === null}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {lineTotal(1, project.pricePerTon) === null ? 'Price unavailable' : 'Offset Now'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {purchaseModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6" data-testid="purchase-modal">
                        <h3 className="text-xl font-bold mb-4 dark:text-white">Purchase Offset</h3>
                        <p className="text-gray-600 dark:text-gray-300 mb-4">
                            Supporting: <span className="font-semibold">{purchaseModal.project.name}</span>
                        </p>

                        <div className="mb-4">
                            <label htmlFor="offset-tons" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tons of CO₂</label>
                            <input
                                id="offset-tons"
                                type="number"
                                min="1"
                                step="1"
                                max={purchaseModal.project.availableTons}
                                value={purchaseModal.tons}
                                aria-invalid={!quantity.valid}
                                aria-describedby={quantity.error ? 'offset-tons-error' : undefined}
                                onChange={(e) => {
                                    setPurchaseError(null);
                                    setPurchaseModal((prev) => ({ ...prev, tons: e.target.value }));
                                }}
                                className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:text-white ${quantity.valid
                                    ? 'border-gray-300 dark:border-gray-600'
                                    : 'border-red-400 dark:border-red-500'
                                    }`}
                            />
                            {quantity.error && (
                                <p id="offset-tons-error" data-testid="quantity-error" className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    {quantity.error}
                                </p>
                            )}
                        </div>

                        <div className="flex justify-between items-center mb-6 text-lg font-bold dark:text-white">
                            <span>Total:</span>
                            {/* Never `$NaN`. A total is a claim about what someone is
                                about to be charged; when the page cannot make that
                                claim it says so rather than printing one. */}
                            <span data-testid="purchase-total">{total === null ? '—' : formatUsd(total)}</span>
                        </div>

                        {purchaseError && (
                            <p role="alert" data-testid="purchase-error" className="mb-4 text-sm text-red-600 dark:text-red-400">
                                {purchaseError}
                            </p>
                        )}

                        <div className="flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                                disabled={isPurchasing}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handlePurchase}
                                disabled={!canConfirm}
                                className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
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
