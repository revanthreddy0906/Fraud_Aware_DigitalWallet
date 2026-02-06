'use client';

import { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Filter,
    Calendar,
    TrendingUp,
    TrendingDown,
    Search,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { transactionsAPI, Transaction, formatINR } from '@/lib/api';

type FilterPeriod = 'week' | 'month' | '3months' | 'all';

export default function StatementPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const [exportLoading, setExportLoading] = useState(false);

    // Filters
    const [period, setPeriod] = useState<FilterPeriod>('month');
    const [riskFilter, setRiskFilter] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');

    // Pagination
    const [page, setPage] = useState(1);
    const limit = 10;

    useEffect(() => {
        fetchTransactions();
    }, [period, riskFilter, typeFilter, page]);

    const getDateRange = (period: FilterPeriod): { start_date?: string; end_date?: string } => {
        const now = new Date();
        let start: Date | undefined;

        switch (period) {
            case 'week':
                start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3months':
                start = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                return {};
        }

        return {
            start_date: start?.toISOString(),
            end_date: now.toISOString(),
        };
    };

    const fetchTransactions = async () => {
        setLoading(true);
        try {
            const dateRange = getDateRange(period);
            const result = await transactionsAPI.getHistory({
                limit,
                offset: (page - 1) * limit,
                ...dateRange,
                risk_level: riskFilter !== 'all' ? riskFilter : undefined,
                transaction_type: typeFilter !== 'all' ? typeFilter : undefined,
            });

            setTransactions(result.transactions);
            setTotal(result.total);
        } catch (error) {
            console.error('Failed to fetch transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleExport = async (format: 'csv' | 'json') => {
        setExportLoading(true);
        try {
            const dateRange = getDateRange(period);
            const result = await transactionsAPI.export(format, dateRange.start_date, dateRange.end_date);

            if (format === 'csv') {
                // Convert to CSV
                const csvData = result.data as Record<string, unknown>[];
                const columns = result.columns || [];
                const csvContent =
                    columns.join(',') +
                    '\n' +
                    csvData
                        .map((row: Record<string, unknown>) =>
                            columns.map((col: string) => `"${row[col] || ''}"`).join(',')
                        )
                        .join('\n');

                // Download
                const blob = new Blob([csvContent], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                // Download JSON
                const jsonContent = JSON.stringify(result.data, null, 2);
                const blob = new Blob([jsonContent], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `transactions_${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Export failed:', error);
        } finally {
            setExportLoading(false);
        }
    };

    const formatCurrency = (amount: number) => {
        return formatINR(amount);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const totalPages = Math.ceil(total / limit);

    // Filter by search
    const filteredTransactions = searchQuery
        ? transactions.filter(
            (txn) =>
                txn.recipient?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                txn.description?.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : transactions;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Bank Statement</h2>
                    <p className="text-dark-400">Complete transaction history with filters</p>
                </div>

                {/* Export Buttons */}
                <div className="flex gap-2">
                    <button
                        onClick={() => handleExport('csv')}
                        disabled={exportLoading}
                        className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                    <button
                        onClick={() => handleExport('json')}
                        disabled={exportLoading}
                        className="px-4 py-2 rounded-xl bg-dark-800 hover:bg-dark-700 text-dark-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        JSON
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                    {/* Period Filter */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-dark-400" />
                        <select
                            value={period}
                            onChange={(e) => {
                                setPeriod(e.target.value as FilterPeriod);
                                setPage(1);
                            }}
                            className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                            <option value="week">Last Week</option>
                            <option value="month">Last Month</option>
                            <option value="3months">Last 3 Months</option>
                            <option value="all">All Time</option>
                        </select>
                    </div>

                    {/* Risk Filter */}
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-dark-400" />
                        <select
                            value={riskFilter}
                            onChange={(e) => {
                                setRiskFilter(e.target.value);
                                setPage(1);
                            }}
                            className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
                        >
                            <option value="all">All Risk Levels</option>
                            <option value="low">Low Risk</option>
                            <option value="medium">Medium Risk</option>
                            <option value="high">High Risk</option>
                        </select>
                    </div>

                    {/* Type Filter */}
                    <select
                        value={typeFilter}
                        onChange={(e) => {
                            setTypeFilter(e.target.value);
                            setPage(1);
                        }}
                        className="bg-dark-900 border border-dark-700 rounded-lg px-3 py-2 text-sm text-white"
                    >
                        <option value="all">All Types</option>
                        <option value="credit">Credits Only</option>
                        <option value="debit">Debits Only</option>
                    </select>

                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dark-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search transactions..."
                            className="w-full bg-dark-900 border border-dark-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-dark-500"
                        />
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="glass-card overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="spinner" />
                    </div>
                ) : filteredTransactions.length > 0 ? (
                    <>
                        <div className="overflow-x-auto">
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Date & Time</th>
                                        <th>Description</th>
                                        <th>Amount</th>
                                        <th>Status</th>
                                        <th>Risk</th>
                                        <th>Score</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTransactions.map((txn) => (
                                        <tr key={txn.txn_id}>
                                            <td className="whitespace-nowrap">
                                                <div className="flex items-center gap-3">
                                                    <div
                                                        className={`w-8 h-8 rounded-lg flex items-center justify-center ${txn.transaction_type === 'credit'
                                                            ? 'bg-success/20'
                                                            : 'bg-danger/20'
                                                            }`}
                                                    >
                                                        {txn.transaction_type === 'credit' ? (
                                                            <TrendingDown className="w-4 h-4 text-success" />
                                                        ) : (
                                                            <TrendingUp className="w-4 h-4 text-danger" />
                                                        )}
                                                    </div>
                                                    <span className="text-sm text-dark-300">
                                                        {formatDate(txn.timestamp)}
                                                    </span>
                                                </div>
                                            </td>
                                            <td>
                                                <div>
                                                    <p className="text-white font-medium">{txn.recipient || 'N/A'}</p>
                                                    <p className="text-sm text-dark-500">{txn.description || ''}</p>
                                                </div>
                                            </td>
                                            <td className="whitespace-nowrap">
                                                <span
                                                    className={`font-semibold ${txn.transaction_type === 'credit'
                                                        ? 'text-success'
                                                        : 'text-white'
                                                        }`}
                                                >
                                                    {txn.transaction_type === 'credit' ? '+' : '-'}
                                                    {formatCurrency(txn.amount)}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`px-2 py-1 rounded-lg text-xs font-medium ${txn.status === 'completed'
                                                        ? 'bg-success/20 text-success'
                                                        : txn.status === 'blocked'
                                                            ? 'bg-danger/20 text-danger'
                                                            : txn.status === 'pending'
                                                                ? 'bg-warning/20 text-warning'
                                                                : 'bg-dark-700 text-dark-400'
                                                        }`}
                                                >
                                                    {txn.status}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={`px-2 py-1 rounded-lg text-xs font-medium ${txn.risk_level === 'low'
                                                        ? 'bg-success/20 text-success'
                                                        : txn.risk_level === 'medium'
                                                            ? 'bg-warning/20 text-warning'
                                                            : 'bg-danger/20 text-danger'
                                                        }`}
                                                >
                                                    {txn.risk_level}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 h-2 bg-dark-800 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${txn.anomaly_score}%`,
                                                                backgroundColor:
                                                                    txn.anomaly_score <= 30
                                                                        ? '#10b981'
                                                                        : txn.anomaly_score <= 60
                                                                            ? '#f59e0b'
                                                                            : '#ef4444',
                                                            }}
                                                        />
                                                    </div>
                                                    <span className="text-sm text-dark-400">{txn.anomaly_score}</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between p-4 border-t border-dark-700">
                            <p className="text-sm text-dark-400">
                                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total}{' '}
                                transactions
                            </p>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                                    disabled={page === 1}
                                    className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronLeft className="w-4 h-4 text-dark-300" />
                                </button>
                                <span className="text-sm text-dark-400">
                                    Page {page} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={page >= totalPages}
                                    className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <ChevronRight className="w-4 h-4 text-dark-300" />
                                </button>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="text-center py-16 text-dark-400">
                        <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>No transactions found</p>
                        <p className="text-sm mt-1">Try adjusting your filters</p>
                    </div>
                )}
            </div>
        </div>
    );
}
