import React, { useState, useEffect } from 'react';
import { fetchLedgerData, executeTrade, verifyLedgerIntegrity } from '../services/blockchainService';

/**
 * @component CarbonCreditLedger
 * @description Interactive UI displaying credit balances, transaction history, and a marketplace for trading credits.
 */
const CarbonCreditLedger = () => {
    const [ledgerData, setLedgerData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [ledgerStatus, setLedgerStatus] = useState(null);

    const [tradeForm, setTradeForm] = useState({ receiverEmail: '', amount: '', notes: '' });
    const [isTrading, setIsTrading] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchLedgerData();
            setLedgerData(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleTrade = async (e) => {
        e.preventDefault();
        setIsTrading(true);
        setError(null);
        try {
            await executeTrade({
                ...tradeForm,
                amount: parseFloat(tradeForm.amount),
            });
            setTradeForm({ receiverEmail: '', amount: '', notes: '' });
            await loadData();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsTrading(false);
        }
    };

    const handleVerify = async () => {
        setIsVerifying(true);
        try {
            const isValid = await verifyLedgerIntegrity();
            setLedgerStatus(isValid ? 'VALID' : 'CORRUPTED');
        } catch (err) {
            setLedgerStatus('ERROR');
        } finally {
            setIsVerifying(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto p-6 space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Carbon Credit Ledger</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Blockchain-inspired immutable tracking of community carbon credits.
                    </p>
                </div>
                <button
                    onClick={handleVerify}
                    disabled={isVerifying}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                    {isVerifying ? 'Verifying...' : 'Verify Ledger Integrity'}
                    {ledgerStatus === 'VALID' && <span className="text-green-300">✓ Valid</span>}
                    {ledgerStatus === 'CORRUPTED' && <span className="text-red-300">✗ Corrupted</span>}
                </button>
            </div>

            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Wallet Balance */}
                <div className="lg:col-span-1 bg-gradient-to-br from-green-600 to-teal-700 rounded-xl p-6 text-white shadow-lg">
                    <h3 className="text-lg font-semibold opacity-90">Available Balance</h3>
                    <div className="text-4xl font-bold mt-2">{ledgerData?.wallet.balance.toFixed(2)}</div>
                    <div className="text-sm opacity-80 mt-1">Carbon Credits (tCO2e)</div>
                </div>

                {/* Trade Form */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Execute Trade</h3>
                    <form onSubmit={handleTrade} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Receiver Email</label>
                            <input
                                type="email"
                                value={tradeForm.receiverEmail}
                                onChange={(e) => setTradeForm({ ...tradeForm, receiverEmail: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                            <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={tradeForm.amount}
                                onChange={(e) => setTradeForm({ ...tradeForm, amount: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                            <input
                                type="text"
                                value={tradeForm.notes}
                                onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <button
                                type="submit"
                                disabled={isTrading}
                                className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                            >
                                {isTrading ? 'Processing...' : 'Transfer Credits'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Transaction History & Blocks */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Ledger Blocks & Transactions</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Block Index</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Hash</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Timestamp</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Transactions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {ledgerData?.recentBlocks.map((block) => (
                                <tr key={block.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">#{block.blockIndex}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400 font-mono" title={block.currentHash}>
                                        {block.currentHash.substring(0, 16)}...
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                                        {new Date(block.timestamp).toLocaleString()}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">
                                        {block.transactions.length} tx(s)
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default CarbonCreditLedger;
