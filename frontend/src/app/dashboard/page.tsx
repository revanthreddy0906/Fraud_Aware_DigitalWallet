'use client';

import { useState, useEffect } from 'react';
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Shield,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area,
} from 'recharts';
import { transactionsAPI, alertsAPI, getUser, User, formatINR } from '@/lib/api';

interface Stats {
    this_month: {
        total_spent: number;
        total_received: number;
        transaction_count: number;
    };
    risk_breakdown: {
        low: number;
        medium: number;
        high: number;
    };
    all_time: {
        completed_transactions: number;
        blocked_transactions: number;
    };
}

interface TimelinePoint {
    date: string;
    avg_anomaly_score: number;
    transaction_count: number;
    max_score: number;
}

export default function OverviewPage() {
    const [user, setUser] = useState<User | null>(null);
    const [balance, setBalance] = useState<number>(0);
    const [walletStatus, setWalletStatus] = useState<string>('active');
    const [stats, setStats] = useState<Stats | null>(null);
    const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
    const [unresolvedAlerts, setUnresolvedAlerts] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = getUser();
        setUser(storedUser);
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [balanceData, statsData, timelineData, alertsData] = await Promise.all([
                transactionsAPI.getBalance(),
                transactionsAPI.getStats(),
                transactionsAPI.getRiskTimeline(30),
                alertsAPI.getUnresolved(),
            ]);

            setBalance(balanceData.balance);
            setWalletStatus(balanceData.wallet_status);
            setStats(statsData);
            setTimeline(timelineData.timeline);
            setUnresolvedAlerts(alertsData.count);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return formatINR(amount);
    };

    const getRiskColor = (score: number) => {
        if (score <= 30) return '#10b981';
        if (score <= 60) return '#f59e0b';
        return '#ef4444';
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
            {/* Welcome Message */}
            <div className="mb-8">
                <h1 className="text-2xl lg:text-3xl font-bold text-white">
                    Welcome back, <span className="gradient-text">{user?.username || 'User'}</span>
                </h1>
                <p className="text-dark-400 mt-1">Here&apos;s your wallet overview and security status</p>
            </div>

            {/* Top Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                {/* Balance Card */}
                <div className="glass-card p-6 glass-card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-primary-400" />
                        </div>
                        <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${walletStatus === 'active'
                                ? 'bg-success/20 text-success'
                                : 'bg-info/20 text-info'
                                }`}
                        >
                            {walletStatus}
                        </span>
                    </div>
                    <p className="text-dark-400 text-sm">Current Balance</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white mt-1">
                        {formatCurrency(balance)}
                    </p>
                </div>

                {/* Monthly Spending */}
                <div className="glass-card p-6 glass-card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-danger/20 flex items-center justify-center">
                            <ArrowUpRight className="w-6 h-6 text-danger" />
                        </div>
                        <TrendingUp className="w-5 h-5 text-dark-500" />
                    </div>
                    <p className="text-dark-400 text-sm">This Month Spent</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white mt-1">
                        {formatCurrency(stats?.this_month.total_spent || 0)}
                    </p>
                    <p className="text-xs text-dark-500 mt-2">
                        {stats?.this_month.transaction_count || 0} transactions
                    </p>
                </div>

                {/* Monthly Income */}
                <div className="glass-card p-6 glass-card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-success/20 flex items-center justify-center">
                            <ArrowDownRight className="w-6 h-6 text-success" />
                        </div>
                        <TrendingDown className="w-5 h-5 text-dark-500" />
                    </div>
                    <p className="text-dark-400 text-sm">This Month Received</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white mt-1">
                        {formatCurrency(stats?.this_month.total_received || 0)}
                    </p>
                </div>

                {/* Security Score */}
                <div className="glass-card p-6 glass-card-hover">
                    <div className="flex items-center justify-between mb-4">
                        <div className="w-12 h-12 rounded-xl bg-warning/20 flex items-center justify-center">
                            <Shield className="w-6 h-6 text-warning" />
                        </div>
                        {unresolvedAlerts > 0 && (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-danger/20 text-danger">
                                {unresolvedAlerts} alerts
                            </span>
                        )}
                    </div>
                    <p className="text-dark-400 text-sm">Blocked Transactions</p>
                    <p className="text-2xl lg:text-3xl font-bold text-white mt-1">
                        {stats?.all_time.blocked_transactions || 0}
                    </p>
                    <p className="text-xs text-dark-500 mt-2">
                        All-time fraud prevention
                    </p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Risk Timeline Chart */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Risk Timeline</h3>
                            <p className="text-sm text-dark-400">Anomaly scores over the last 30 days</p>
                        </div>
                        <Activity className="w-5 h-5 text-primary-400" />
                    </div>
                    <div className="h-64">
                        {timeline.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={timeline}>
                                    <defs>
                                        <linearGradient id="riskGradient" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#E53935" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#E53935" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis
                                        dataKey="date"
                                        stroke="#64748b"
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                    />
                                    <YAxis
                                        stroke="#64748b"
                                        tick={{ fill: '#64748b', fontSize: 12 }}
                                        domain={[0, 100]}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                        }}
                                        labelStyle={{ color: '#e2e8f0' }}
                                        itemStyle={{ color: '#E53935' }}
                                        formatter={(value) => [`${(value as number)?.toFixed(1) || '0'}`, 'Avg Score']}
                                        labelFormatter={(label) => new Date(label).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="avg_anomaly_score"
                                        stroke="#E53935"
                                        strokeWidth={2}
                                        fillOpacity={1}
                                        fill="url(#riskGradient)"
                                    />
                                    <Line
                                        type="monotone"
                                        dataKey="max_score"
                                        stroke="#f59e0b"
                                        strokeWidth={1}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="flex items-center justify-center h-full text-dark-400">
                                No transaction data available
                            </div>
                        )}
                    </div>
                </div>

                {/* Risk Breakdown */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-white">Risk Breakdown</h3>
                            <p className="text-sm text-dark-400">This month&apos;s transactions</p>
                        </div>
                        <AlertTriangle className="w-5 h-5 text-warning" />
                    </div>
                    <div className="space-y-4">
                        {/* Low Risk */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-dark-300">Low Risk</span>
                                <span className="text-sm font-medium text-success">
                                    {stats?.risk_breakdown.low || 0}
                                </span>
                            </div>
                            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-success rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats
                                            ? (stats.risk_breakdown.low /
                                                (stats.risk_breakdown.low +
                                                    stats.risk_breakdown.medium +
                                                    stats.risk_breakdown.high || 1)) *
                                            100
                                            : 0
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* Medium Risk */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-dark-300">Medium Risk</span>
                                <span className="text-sm font-medium text-warning">
                                    {stats?.risk_breakdown.medium || 0}
                                </span>
                            </div>
                            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-warning rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats
                                            ? (stats.risk_breakdown.medium /
                                                (stats.risk_breakdown.low +
                                                    stats.risk_breakdown.medium +
                                                    stats.risk_breakdown.high || 1)) *
                                            100
                                            : 0
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>

                        {/* High Risk */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-dark-300">High Risk</span>
                                <span className="text-sm font-medium text-danger">
                                    {stats?.risk_breakdown.high || 0}
                                </span>
                            </div>
                            <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-danger rounded-full transition-all duration-500"
                                    style={{
                                        width: `${stats
                                            ? (stats.risk_breakdown.high /
                                                (stats.risk_breakdown.low +
                                                    stats.risk_breakdown.medium +
                                                    stats.risk_breakdown.high || 1)) *
                                            100
                                            : 0
                                            }%`,
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Total Transactions */}
                    <div className="mt-8 pt-6 border-t border-dark-700">
                        <div className="flex items-center justify-between">
                            <span className="text-dark-400">Total Completed</span>
                            <span className="text-xl font-bold text-white">
                                {stats?.all_time.completed_transactions || 0}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Quick Actions</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <a
                        href="/dashboard/transactions"
                        className="p-4 rounded-xl bg-dark-800/50 hover:bg-primary-500/10 border border-dark-700 hover:border-primary-500/30 transition-all text-center group"
                    >
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <ArrowUpRight className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="text-sm text-dark-300 group-hover:text-white">Send Money</span>
                    </a>
                    <a
                        href="/dashboard/statement"
                        className="p-4 rounded-xl bg-dark-800/50 hover:bg-primary-500/10 border border-dark-700 hover:border-primary-500/30 transition-all text-center group"
                    >
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Activity className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="text-sm text-dark-300 group-hover:text-white">View History</span>
                    </a>
                    <a
                        href="/dashboard/risk-analysis"
                        className="p-4 rounded-xl bg-dark-800/50 hover:bg-primary-500/10 border border-dark-700 hover:border-primary-500/30 transition-all text-center group"
                    >
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-warning/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Shield className="w-5 h-5 text-warning" />
                        </div>
                        <span className="text-sm text-dark-300 group-hover:text-white">Security</span>
                    </a>
                    <a
                        href="/dashboard/profile"
                        className="p-4 rounded-xl bg-dark-800/50 hover:bg-primary-500/10 border border-dark-700 hover:border-primary-500/30 transition-all text-center group"
                    >
                        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-primary-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Wallet className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="text-sm text-dark-300 group-hover:text-white">Settings</span>
                    </a>
                </div>
            </div>
        </div>
    );
}
