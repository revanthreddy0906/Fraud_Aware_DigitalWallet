'use client';

import { useState, useEffect } from 'react';
import {
    Shield,
    AlertTriangle,
    Bell,
    CheckCircle,
    XCircle,
    Clock,
    Activity,
    Settings,
} from 'lucide-react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
} from 'recharts';
import { alertsAPI, usersAPI, Alert } from '@/lib/api';

interface AlertStats {
    total_alerts: number;
    by_type: Record<string, number>;
    by_severity: Record<string, number>;
    resolved: number;
    unresolved: number;
    resolution_rate: number;
}

interface BehaviorBaseline {
    avg_transaction_amount: number;
    max_historical_amount: number;
    typical_txn_count_daily: number;
    most_active_hour_start: number;
    most_active_hour_end: number;
    transaction_count: number;
}

export default function RiskAnalysisPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [unresolvedCount, setUnresolvedCount] = useState(0);
    const [stats, setStats] = useState<AlertStats | null>(null);
    const [baseline, setBaseline] = useState<BehaviorBaseline | null>(null);
    const [alertPrefs, setAlertPrefs] = useState({ alert_sms: true, alert_email: true });
    const [freezeDuration, setFreezeDuration] = useState(30);
    const [loading, setLoading] = useState(true);
    const [savingPrefs, setSavingPrefs] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [alertsData, statsData, baselineData, prefsData, securityData] = await Promise.all([
                alertsAPI.getAlerts({ limit: 20 }),
                alertsAPI.getStats(30),
                alertsAPI.getBehaviorBaseline().catch(() => null),
                usersAPI.getAlertPreferences(),
                usersAPI.getSecuritySettings(),
            ]);

            setAlerts(alertsData.alerts);
            setUnresolvedCount(alertsData.unresolved_count);
            setStats(statsData);
            setBaseline(baselineData);
            setAlertPrefs(prefsData);
            setFreezeDuration(securityData.freeze_duration_minutes);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleResolveAlert = async (alertId: number) => {
        try {
            await alertsAPI.resolve(alertId, 'Resolved by user');
            fetchData();
        } catch (error) {
            console.error('Failed to resolve alert:', error);
        }
    };

    const handleResolveAll = async () => {
        try {
            await alertsAPI.resolveAll();
            fetchData();
        } catch (error) {
            console.error('Failed to resolve alerts:', error);
        }
    };

    const handleSavePrefs = async () => {
        setSavingPrefs(true);
        try {
            await Promise.all([
                usersAPI.updateAlertPreferences(alertPrefs),
                usersAPI.updateSecuritySettings({ freeze_duration_minutes: freezeDuration }),
            ]);
        } catch (error) {
            console.error('Failed to save preferences:', error);
        } finally {
            setSavingPrefs(false);
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'low':
                return '#10b981';
            case 'medium':
                return '#f59e0b';
            case 'high':
                return '#ef4444';
            case 'critical':
                return '#dc2626';
            default:
                return '#64748b';
        }
    };

    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#dc2626'];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    // Prepare chart data
    const severityChartData = stats
        ? Object.entries(stats.by_severity)
            .filter(([_, count]) => count > 0)
            .map(([severity, count]) => ({
                name: severity.charAt(0).toUpperCase() + severity.slice(1),
                value: count,
                color: getSeverityColor(severity),
            }))
        : [];

    const typeChartData = stats
        ? Object.entries(stats.by_type).map(([type, count]) => ({
            name: type.replace(/_/g, ' '),
            count,
        }))
        : [];

    return (
        <div className="space-y-6">
            {/* Header with unresolved count */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Risk Analysis</h2>
                    <p className="text-dark-400">
                        Monitor alerts, view risk patterns, and manage security settings
                    </p>
                </div>
                {unresolvedCount > 0 && (
                    <button
                        onClick={handleResolveAll}
                        className="px-4 py-2 rounded-xl bg-success/20 text-success border border-success/30 hover:bg-success/30 transition-colors flex items-center gap-2"
                    >
                        <CheckCircle className="w-4 h-4" />
                        Resolve All ({unresolvedCount})
                    </button>
                )}
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-warning/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-warning" />
                        </div>
                        <span className="text-dark-400 text-sm">Total Alerts</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.total_alerts || 0}</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-danger/20 flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-danger" />
                        </div>
                        <span className="text-dark-400 text-sm">Unresolved</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.unresolved || 0}</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-success/20 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-success" />
                        </div>
                        <span className="text-dark-400 text-sm">Resolved</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.resolved || 0}</p>
                </div>

                <div className="glass-card p-5">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-primary-400" />
                        </div>
                        <span className="text-dark-400 text-sm">Resolution Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{stats?.resolution_rate || 0}%</p>
                </div>
            </div>

            {/* Charts and Behavior */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Severity Distribution */}
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Severity Distribution</h3>
                    {severityChartData.length > 0 ? (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={severityChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {severityChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                        }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-dark-400">
                            No alerts in this period
                        </div>
                    )}
                    <div className="flex flex-wrap justify-center gap-4 mt-4">
                        {severityChartData.map((item) => (
                            <div key={item.name} className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-sm text-dark-400">{item.name}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Alert Types Chart */}
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Alerts by Type</h3>
                    {typeChartData.length > 0 ? (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={typeChartData} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                    <XAxis type="number" stroke="#64748b" />
                                    <YAxis
                                        type="category"
                                        dataKey="name"
                                        stroke="#64748b"
                                        width={120}
                                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: '#1e293b',
                                            border: '1px solid #475569',
                                            borderRadius: '8px',
                                        }}
                                    />
                                    <Bar dataKey="count" fill="#0ea5e9" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="h-48 flex items-center justify-center text-dark-400">
                            No alerts in this period
                        </div>
                    )}
                </div>
            </div>

            {/* Behavior Baseline */}
            {baseline && (
                <div className="glass-card p-6">
                    <div className="flex items-center gap-3 mb-6">
                        <Shield className="w-5 h-5 text-primary-400" />
                        <h3 className="text-lg font-semibold text-white">Your Behavior Profile</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                            <p className="text-dark-400 text-sm mb-1">Avg Transaction</p>
                            <p className="text-xl font-bold text-white">
                                ${baseline.avg_transaction_amount.toFixed(0)}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                            <p className="text-dark-400 text-sm mb-1">Max Historical</p>
                            <p className="text-xl font-bold text-white">
                                ${baseline.max_historical_amount.toFixed(0)}
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                            <p className="text-dark-400 text-sm mb-1">Daily Transactions</p>
                            <p className="text-xl font-bold text-white">{baseline.typical_txn_count_daily}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                            <p className="text-dark-400 text-sm mb-1">Active Hours</p>
                            <p className="text-xl font-bold text-white">
                                {baseline.most_active_hour_start}:00 - {baseline.most_active_hour_end}:00
                            </p>
                        </div>
                        <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                            <p className="text-dark-400 text-sm mb-1">Total Analyzed</p>
                            <p className="text-xl font-bold text-white">{baseline.transaction_count}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Alert Preferences */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Settings className="w-5 h-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-white">Alert Preferences</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-primary-400" />
                            <span className="text-white">SMS Alerts</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alertPrefs.alert_sms}
                                onChange={(e) => setAlertPrefs({ ...alertPrefs, alert_sms: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-dark-700 peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center gap-3">
                            <Bell className="w-5 h-5 text-primary-400" />
                            <span className="text-white">Email Alerts</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={alertPrefs.alert_email}
                                onChange={(e) => setAlertPrefs({ ...alertPrefs, alert_email: e.target.checked })}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-dark-700 peer-focus:ring-2 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                        </label>
                    </div>

                    <div className="p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center gap-3 mb-3">
                            <Clock className="w-5 h-5 text-primary-400" />
                            <span className="text-white">Auto-freeze Duration</span>
                        </div>
                        <select
                            value={freezeDuration}
                            onChange={(e) => setFreezeDuration(parseInt(e.target.value))}
                            className="w-full bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 text-white"
                        >
                            <option value={15}>15 minutes</option>
                            <option value={30}>30 minutes</option>
                            <option value={60}>1 hour</option>
                            <option value={120}>2 hours</option>
                        </select>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSavePrefs}
                        disabled={savingPrefs}
                        className="btn-primary"
                    >
                        {savingPrefs ? 'Saving...' : 'Save Preferences'}
                    </button>
                </div>
            </div>

            {/* Recent Alerts */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Recent Alerts</h3>
                {alerts.length > 0 ? (
                    <div className="space-y-3">
                        {alerts.slice(0, 10).map((alert) => (
                            <div
                                key={alert.alert_id}
                                className={`flex items-center justify-between p-4 rounded-xl border ${alert.resolved
                                        ? 'bg-dark-900/30 border-dark-700 opacity-60'
                                        : 'bg-dark-900/50 border-dark-600'
                                    }`}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                                        style={{ backgroundColor: `${getSeverityColor(alert.severity)}20` }}
                                    >
                                        <AlertTriangle
                                            className="w-5 h-5"
                                            style={{ color: getSeverityColor(alert.severity) }}
                                        />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{alert.message}</p>
                                        <p className="text-sm text-dark-400">
                                            {formatDate(alert.created_at)} • {alert.alert_type.replace(/_/g, ' ')}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span
                                        className={`px-3 py-1 rounded-full text-xs font-medium`}
                                        style={{
                                            backgroundColor: `${getSeverityColor(alert.severity)}20`,
                                            color: getSeverityColor(alert.severity),
                                        }}
                                    >
                                        {alert.severity}
                                    </span>
                                    {!alert.resolved && (
                                        <button
                                            onClick={() => handleResolveAlert(alert.alert_id)}
                                            className="p-2 rounded-lg bg-success/20 text-success hover:bg-success/30 transition-colors"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 text-dark-400">
                        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No alerts to display</p>
                    </div>
                )}
            </div>
        </div>
    );
}
