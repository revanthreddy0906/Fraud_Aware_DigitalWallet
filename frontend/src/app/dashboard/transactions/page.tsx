'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Send,
    AlertTriangle,
    CheckCircle,
    XCircle,
    Clock,
    MapPin,
    Monitor,
    Loader2,
} from 'lucide-react';
import { transactionsAPI, Transaction, FraudAnalysis } from '@/lib/api';

export default function TransactionsPage() {
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('San Francisco, USA');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Transaction result state
    const [pendingTransaction, setPendingTransaction] = useState<Transaction | null>(null);
    const [fraudAnalysis, setFraudAnalysis] = useState<FraudAnalysis | null>(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [countdown, setCountdown] = useState(60);
    const [transactionComplete, setTransactionComplete] = useState(false);
    const [transactionMessage, setTransactionMessage] = useState('');

    // Countdown timer for high-risk transactions
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (showConfirmModal && countdown > 0) {
            timer = setInterval(() => {
                setCountdown((prev) => prev - 1);
            }, 1000);
        } else if (countdown === 0 && pendingTransaction) {
            handleTimeout();
        }
        return () => clearInterval(timer);
    }, [showConfirmModal, countdown, pendingTransaction]);

    const handleTimeout = async () => {
        if (!pendingTransaction) return;

        try {
            const result = await transactionsAPI.timeout(pendingTransaction.txn_id);
            setShowConfirmModal(false);
            setTransactionComplete(true);
            setTransactionMessage(`⚠️ ${result.message}`);
            setPendingTransaction(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Timeout handling failed');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setTransactionComplete(false);

        try {
            const result = await transactionsAPI.send({
                amount: parseFloat(amount),
                recipient,
                description: description || undefined,
                location,
                device_id: 'web_browser_' + Date.now(),
            });

            setFraudAnalysis(result.fraud_analysis);

            if (result.fraud_analysis.requires_confirmation) {
                // High-risk transaction - show confirmation modal
                setPendingTransaction(result.transaction);
                setCountdown(60);
                setShowConfirmModal(true);
            } else {
                // Transaction completed
                setTransactionComplete(true);
                setTransactionMessage(result.message);
                resetForm();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirm = async (confirmed: boolean) => {
        if (!pendingTransaction) return;

        setLoading(true);
        try {
            const result = await transactionsAPI.confirm(pendingTransaction.txn_id, confirmed);
            setShowConfirmModal(false);
            setTransactionComplete(true);
            setTransactionMessage(result.message);
            setPendingTransaction(null);
            if (confirmed) {
                resetForm();
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Confirmation failed');
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setAmount('');
        setRecipient('');
        setDescription('');
        setFraudAnalysis(null);
    };

    const getRiskBadgeClass = (level: string) => {
        switch (level) {
            case 'low':
                return 'risk-low';
            case 'medium':
                return 'risk-medium';
            case 'high':
                return 'risk-high';
            default:
                return '';
        }
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Send Money Form */}
            <div className="glass-card p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                        <Send className="w-6 h-6 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-semibold text-white">Send Money</h2>
                        <p className="text-sm text-dark-400">Transfer funds securely with fraud protection</p>
                    </div>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm flex items-center gap-3">
                        <XCircle className="w-5 h-5 flex-shrink-0" />
                        {error}
                    </div>
                )}

                {/* Success Message */}
                {transactionComplete && (
                    <div className="mb-6 p-4 rounded-xl bg-success/10 border border-success/30 text-success text-sm flex items-center gap-3">
                        <CheckCircle className="w-5 h-5 flex-shrink-0" />
                        {transactionMessage}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Recipient
                        </label>
                        <input
                            type="text"
                            value={recipient}
                            onChange={(e) => setRecipient(e.target.value)}
                            className="input-field"
                            placeholder="Enter recipient name or ID"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Amount (USD)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">$</span>
                            <input
                                type="number"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                className="input-field pl-8"
                                placeholder="0.00"
                                min="0.01"
                                step="0.01"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            Description (Optional)
                        </label>
                        <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="input-field"
                            placeholder="What's this for?"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            <MapPin className="w-4 h-4 inline mr-1" />
                            Current Location (Simulated)
                        </label>
                        <select
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="input-field"
                        >
                            <option value="San Francisco, USA">San Francisco, USA</option>
                            <option value="New York, USA">New York, USA</option>
                            <option value="Los Angeles, USA">Los Angeles, USA</option>
                            <option value="Chicago, USA">Chicago, USA</option>
                            <option value="Miami, USA">Miami, USA (New Location)</option>
                            <option value="London, UK">London, UK (New Location)</option>
                            <option value="Tokyo, Japan">Tokyo, Japan (New Location)</option>
                        </select>
                        <p className="text-xs text-dark-500 mt-1">
                            Try selecting a new location to trigger fraud detection
                        </p>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="btn-primary w-full flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Send Money
                            </>
                        )}
                    </button>
                </form>
            </div>

            {/* Fraud Analysis Result (for non-high-risk) */}
            {fraudAnalysis && !showConfirmModal && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Fraud Analysis Result</h3>

                    <div className="flex items-center gap-4 mb-4">
                        <div className="flex-1">
                            <p className="text-sm text-dark-400 mb-1">Anomaly Score</p>
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-3 bg-dark-800 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-500"
                                        style={{
                                            width: `${fraudAnalysis.anomaly_score}%`,
                                            backgroundColor:
                                                fraudAnalysis.anomaly_score <= 30
                                                    ? '#10b981'
                                                    : fraudAnalysis.anomaly_score <= 60
                                                        ? '#f59e0b'
                                                        : '#ef4444',
                                        }}
                                    />
                                </div>
                                <span className="text-lg font-bold text-white">{fraudAnalysis.anomaly_score}</span>
                            </div>
                        </div>
                        <span className={`px-4 py-2 rounded-xl text-sm font-medium ${getRiskBadgeClass(fraudAnalysis.risk_level)}`}>
                            {fraudAnalysis.risk_level.toUpperCase()} RISK
                        </span>
                    </div>

                    {fraudAnalysis.risk_factors.length > 0 && (
                        <div className="mt-4 p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                            <p className="text-sm font-medium text-dark-300 mb-2">Risk Factors Detected:</p>
                            <ul className="space-y-1">
                                {fraudAnalysis.alerts.map((alert, idx) => (
                                    <li key={idx} className="text-sm text-dark-400 flex items-center gap-2">
                                        <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
                                        {alert}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {/* High-Risk Confirmation Modal */}
            {showConfirmModal && pendingTransaction && fraudAnalysis && (
                <div className="modal-overlay">
                    <div className="glass-card p-8 max-w-lg w-full mx-4 relative">
                        {/* Countdown Circle */}
                        <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                            <div className="relative">
                                <svg className="w-24 h-24 transform -rotate-90">
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="45"
                                        fill="none"
                                        stroke="#334155"
                                        strokeWidth="6"
                                    />
                                    <circle
                                        cx="48"
                                        cy="48"
                                        r="45"
                                        fill="none"
                                        stroke={countdown > 30 ? '#f59e0b' : '#ef4444'}
                                        strokeWidth="6"
                                        strokeDasharray="283"
                                        strokeDashoffset={283 - (283 * countdown) / 60}
                                        className="transition-all duration-1000"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-2xl font-bold text-white">{countdown}</span>
                                </div>
                            </div>
                        </div>

                        <div className="text-center mt-8">
                            <AlertTriangle className="w-16 h-16 text-danger mx-auto mb-4" />
                            <h3 className="text-2xl font-bold text-white mb-2">High-Risk Transaction</h3>
                            <p className="text-dark-400 mb-6">
                                This transaction has been flagged. Please confirm within {countdown} seconds or
                                your wallet will be temporarily frozen.
                            </p>
                        </div>

                        {/* Transaction Details */}
                        <div className="bg-dark-900/50 rounded-xl p-4 mb-6 space-y-2">
                            <div className="flex justify-between">
                                <span className="text-dark-400">Amount</span>
                                <span className="text-white font-medium">
                                    ${parseFloat(amount).toFixed(2)}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-400">Recipient</span>
                                <span className="text-white">{recipient}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-dark-400">Risk Score</span>
                                <span className="text-danger font-medium">{fraudAnalysis.anomaly_score}/100</span>
                            </div>
                        </div>

                        {/* Risk Factors */}
                        <div className="mb-6">
                            <p className="text-sm font-medium text-dark-300 mb-2">Detected Issues:</p>
                            <ul className="space-y-2">
                                {fraudAnalysis.alerts.map((alert, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-center gap-2 text-sm text-danger bg-danger/10 p-2 rounded-lg"
                                    >
                                        <XCircle className="w-4 h-4 flex-shrink-0" />
                                        {alert}
                                    </li>
                                ))}
                            </ul>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-4">
                            <button
                                onClick={() => handleConfirm(false)}
                                className="flex-1 py-3 px-4 rounded-xl bg-dark-700 hover:bg-dark-600 text-white font-medium transition-colors flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                <XCircle className="w-5 h-5" />
                                Cancel
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                className="flex-1 btn-primary flex items-center justify-center gap-2"
                                disabled={loading}
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <>
                                        <CheckCircle className="w-5 h-5" />
                                        Confirm
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
