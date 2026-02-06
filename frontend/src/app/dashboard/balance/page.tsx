'use client';

import { useState, useEffect } from 'react';
import {
    Wallet,
    Snowflake,
    Lock,
    Unlock,
    AlertCircle,
    Clock,
    TrendingUp,
    TrendingDown,
} from 'lucide-react';
import { transactionsAPI, alertsAPI, Transaction } from '@/lib/api';

export default function BalancePage() {
    const [balance, setBalance] = useState(0);
    const [walletStatus, setWalletStatus] = useState<'active' | 'frozen'>('active');
    const [freezeUntil, setFreezeUntil] = useState<string | null>(null);
    const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [balanceData, historyData] = await Promise.all([
                transactionsAPI.getBalance(),
                transactionsAPI.getHistory({ limit: 5 }),
            ]);

            setBalance(balanceData.balance);
            setWalletStatus(balanceData.wallet_status as 'active' | 'frozen');
            setFreezeUntil(balanceData.freeze_until);
            setRecentTransactions(historyData.transactions);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFreeze = async () => {
        setActionLoading(true);
        try {
            await alertsAPI.freezeWallet(30, 'Manual freeze from balance page');
            await fetchData();
        } catch (error) {
            console.error('Failed to freeze wallet:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUnfreeze = async () => {
        setActionLoading(true);
        try {
            await alertsAPI.unfreezeWallet();
            await fetchData();
        } catch (error) {
            console.error('Failed to unfreeze wallet:', error);
        } finally {
            setActionLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
        }).format(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getTimeRemaining = () => {
        if (!freezeUntil) return null;
        const until = new Date(freezeUntil);
        const now = new Date();
        const diff = until.getTime() - now.getTime();
        const minutes = Math.ceil(diff / 60000);
        return minutes > 0 ? minutes : 0;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Main Balance Card */}
            <div className="glass-card p-8 lg:p-12 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl" />

                <div className="relative">
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-6">
                        <span
                            className={`px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 ${walletStatus === 'frozen'
                                    ? 'bg-info/20 text-info border border-info/30'
                                    : 'bg-success/20 text-success border border-success/30'
                                }`}
                        >
                            {walletStatus === 'frozen' ? (
                                <>
                                    <Snowflake className="w-4 h-4" />
                                    Wallet Frozen
                                </>
                            ) : (
                                <>
                                    <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                                    Active
                                </>
                            )}
                        </span>

                        {walletStatus === 'frozen' && freezeUntil && (
                            <div className="flex items-center gap-2 text-dark-400 text-sm">
                                <Clock className="w-4 h-4" />
                                <span>{getTimeRemaining()} minutes remaining</span>
                            </div>
                        )}
                    </div>

                    {/* Balance Display */}
                    <div className="text-center mb-8">
                        <p className="text-dark-400 mb-2">Available Balance</p>
                        <h1 className="text-5xl lg:text-6xl font-bold text-white mb-4">
                            {formatCurrency(balance)}
                        </h1>
                        <p className="text-dark-500">USD</p>
                    </div>

                    {/* Freeze/Unfreeze Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        {walletStatus === 'frozen' ? (
                            <button
                                onClick={handleUnfreeze}
                                disabled={actionLoading}
                                className="btn-primary flex items-center justify-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <Unlock className="w-5 h-5" />
                                        Unfreeze Wallet
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={handleFreeze}
                                disabled={actionLoading}
                                className="px-6 py-3 rounded-xl bg-info/20 text-info border border-info/30 hover:bg-info/30 transition-colors flex items-center gap-2"
                            >
                                {actionLoading ? (
                                    <div className="spinner" />
                                ) : (
                                    <>
                                        <Lock className="w-5 h-5" />
                                        Freeze Wallet (30 min)
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Freeze Warning */}
                    {walletStatus === 'frozen' && (
                        <div className="mt-6 p-4 rounded-xl bg-warning/10 border border-warning/30 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-warning font-medium">Wallet is Frozen</p>
                                <p className="text-sm text-dark-400 mt-1">
                                    Outgoing transactions are blocked until the freeze period ends or you manually
                                    unfreeze the wallet.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Recent Transactions */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-white">Recent Activity</h3>
                    <a
                        href="/dashboard/statement"
                        className="text-sm text-primary-400 hover:text-primary-300 transition-colors"
                    >
                        View All →
                    </a>
                </div>

                {recentTransactions.length > 0 ? (
                    <div className="space-y-3">
                        {recentTransactions.map((txn) => (
                            <div
                                key={txn.txn_id}
                                className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 hover:bg-dark-800/50 transition-colors"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-xl flex items-center justify-center ${txn.transaction_type === 'credit'
                                                ? 'bg-success/20'
                                                : 'bg-danger/20'
                                            }`}
                                    >
                                        {txn.transaction_type === 'credit' ? (
                                            <TrendingDown className="w-5 h-5 text-success" />
                                        ) : (
                                            <TrendingUp className="w-5 h-5 text-danger" />
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">
                                            {txn.recipient || txn.description || 'Transaction'}
                                        </p>
                                        <p className="text-sm text-dark-400">{formatDate(txn.timestamp)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p
                                        className={`font-semibold ${txn.transaction_type === 'credit' ? 'text-success' : 'text-white'
                                            }`}
                                    >
                                        {txn.transaction_type === 'credit' ? '+' : '-'}
                                        {formatCurrency(txn.amount)}
                                    </p>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full ${txn.risk_level === 'low'
                                                ? 'bg-success/20 text-success'
                                                : txn.risk_level === 'medium'
                                                    ? 'bg-warning/20 text-warning'
                                                    : 'bg-danger/20 text-danger'
                                            }`}
                                    >
                                        {txn.risk_level}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-dark-400">
                        <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No recent transactions</p>
                    </div>
                )}
            </div>
        </div>
    );
}
