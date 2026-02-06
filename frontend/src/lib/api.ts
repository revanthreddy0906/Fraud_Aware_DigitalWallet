// API configuration and helper functions

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Currency formatting for Indian Rupees (INR)
export const formatINR = (amount: number): string => {
    const formatter = new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    return formatter.format(amount);
};

// Short format for compact display (e.g., ₹1.5L, ₹2.3Cr)
export const formatINRShort = (amount: number): string => {
    if (amount >= 10000000) {
        return `₹${(amount / 10000000).toFixed(2)}Cr`;
    } else if (amount >= 100000) {
        return `₹${(amount / 100000).toFixed(2)}L`;
    } else if (amount >= 1000) {
        return `₹${(amount / 1000).toFixed(1)}K`;
    }
    return `₹${amount.toFixed(2)}`;
};

// Type definitions
export interface User {
    user_id: number;
    username: string;
    email: string;
    phone: string | null;
    allowed_start_hour: number;
    allowed_end_hour: number;
    max_txn_amount: number;
    max_txns_10min: number;
    wallet_status: 'active' | 'frozen';
    balance: number;
    freeze_until: string | null;
    freeze_duration_minutes: number;
    alert_sms: boolean;
    alert_email: boolean;
    last_login_time: string | null;
    last_login_location: string | null;
    last_login_device: string | null;
    created_at: string;
}

export interface Transaction {
    txn_id: number;
    user_id: number;
    amount: number;
    transaction_type: 'credit' | 'debit';
    recipient: string | null;
    description: string | null;
    timestamp: string;
    device_id: string | null;
    location: string | null;
    ip_address: string | null;
    anomaly_score: number;
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: string[];
    status: 'pending' | 'completed' | 'blocked' | 'cancelled';
    requires_confirmation: boolean;
    confirmed_at: string | null;
}

export interface Alert {
    alert_id: number;
    user_id: number;
    txn_id: number | null;
    alert_type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    message: string;
    resolved: boolean;
    resolved_at: string | null;
    resolution_note: string | null;
    created_at: string;
}

export interface FraudAnalysis {
    anomaly_score: number;
    risk_level: 'low' | 'medium' | 'high';
    risk_factors: string[];
    requires_confirmation: boolean;
    alerts: string[];
}

export interface LoginResponse {
    access_token: string;
    token_type: string;
    user: User;
    last_login: {
        time: string | null;
        location: string | null;
        device: string | null;
    };
}

// Auth helpers
export const setToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
    }
};

export const getToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
};

export const removeToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
    }
};

export const setUser = (user: User) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(user));
    }
};

export const getUser = (): User | null => {
    if (typeof window !== 'undefined') {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
    return null;
};

// API request helper
async function apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> {
    const token = getToken();

    const headers: HeadersInit = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'An error occurred' }));
        // Handle both string and object error details
        let errorMessage = 'Request failed';
        if (typeof error.detail === 'string') {
            errorMessage = error.detail;
        } else if (typeof error.detail === 'object' && error.detail !== null) {
            // For structured errors like auto-freeze, extract the message
            errorMessage = error.detail.message || JSON.stringify(error.detail);
        }
        throw new Error(errorMessage);
    }

    return response.json();
}

// Auth API
export const authAPI = {
    login: (username: string, password: string) =>
        apiRequest<LoginResponse>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username, password }),
        }),

    register: (username: string, email: string, password: string, phone?: string) =>
        apiRequest<{ access_token: string; token_type: string; user: User }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password, phone }),
        }),

    me: () => apiRequest<User>('/auth/me'),

    logout: () => apiRequest<{ message: string }>('/auth/logout', { method: 'POST' }),
};

// Users API
export const usersAPI = {
    getProfile: () => apiRequest<User>('/users/profile'),

    updateProfile: (data: { phone?: string; email?: string }) =>
        apiRequest<User>('/users/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getSecuritySettings: () =>
        apiRequest<{
            allowed_start_hour: number;
            allowed_end_hour: number;
            max_txn_amount: number;
            max_txns_10min: number;
            freeze_duration_minutes: number;
            wallet_status: string;
            freeze_until: string | null;
        }>('/users/security-settings'),

    updateSecuritySettings: (settings: {
        allowed_start_hour?: number;
        allowed_end_hour?: number;
        max_txn_amount?: number;
        max_txns_10min?: number;
        freeze_duration_minutes?: number;
    }) => apiRequest<{ message: string; settings: Record<string, unknown> }>('/users/security-settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
    }),

    getAlertPreferences: () =>
        apiRequest<{ alert_sms: boolean; alert_email: boolean }>('/users/alert-preferences'),

    updateAlertPreferences: (prefs: { alert_sms?: boolean; alert_email?: boolean }) =>
        apiRequest<{ message: string; preferences: Record<string, boolean> }>('/users/alert-preferences', {
            method: 'PUT',
            body: JSON.stringify(prefs),
        }),

    getDevices: () => apiRequest<Array<{ device_id: number; device_fingerprint: string; device_name: string; is_trusted: boolean }>>('/users/devices'),

    getLocations: () => apiRequest<Array<{ location_id: number; location_name: string; is_trusted: boolean }>>('/users/locations'),
};

// Transactions API
export const transactionsAPI = {
    getBalance: () =>
        apiRequest<{ balance: number; wallet_status: string; freeze_until: string | null; currency: string }>('/transactions/balance'),

    send: (data: { amount: number; recipient: string; description?: string; device_id?: string; location?: string }) =>
        apiRequest<{ transaction: Transaction; fraud_analysis: FraudAnalysis; message: string }>('/transactions/send', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    confirm: (txn_id: number, confirmed: boolean) =>
        apiRequest<{ message: string; transaction: Transaction }>('/transactions/confirm', {
            method: 'POST',
            body: JSON.stringify({ txn_id, confirmed }),
        }),

    timeout: (txn_id: number) =>
        apiRequest<{ message: string; freeze_until: string; transaction: Transaction }>(`/transactions/timeout/${txn_id}`, {
            method: 'POST',
        }),

    getHistory: (params?: { limit?: number; offset?: number; start_date?: string; end_date?: string; risk_level?: string; transaction_type?: string }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        return apiRequest<{ transactions: Transaction[]; total: number; limit: number; offset: number }>(
            `/transactions/history?${searchParams.toString()}`
        );
    },

    getRiskTimeline: (days?: number) =>
        apiRequest<{ timeline: Array<{ date: string; avg_anomaly_score: number; transaction_count: number; max_score: number }>; period_days: number }>(
            `/transactions/risk-timeline${days ? `?days=${days}` : ''}`
        ),

    getStats: () =>
        apiRequest<{
            this_month: { total_spent: number; total_received: number; transaction_count: number };
            risk_breakdown: { low: number; medium: number; high: number };
            all_time: { completed_transactions: number; blocked_transactions: number };
        }>('/transactions/stats'),

    export: (format: 'csv' | 'json', start_date?: string, end_date?: string) => {
        const params = new URLSearchParams({ format });
        if (start_date) params.append('start_date', start_date);
        if (end_date) params.append('end_date', end_date);
        return apiRequest<{ format: string; data: unknown[]; columns?: string[]; count: number }>(`/transactions/export?${params.toString()}`);
    },
};

// Alerts API
export const alertsAPI = {
    getAlerts: (params?: { resolved?: boolean; limit?: number; offset?: number }) => {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined) searchParams.append(key, String(value));
            });
        }
        return apiRequest<{ alerts: Alert[]; total: number; unresolved_count: number }>(
            `/alerts?${searchParams.toString()}`
        );
    },

    getUnresolved: () =>
        apiRequest<{ alerts: Alert[]; count: number }>('/alerts/unresolved'),

    resolve: (alert_id: number, resolution_note?: string) =>
        apiRequest<{ message: string; alert: Alert }>(`/alerts/${alert_id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ resolution_note }),
        }),

    resolveAll: () =>
        apiRequest<{ message: string; count: number }>('/alerts/resolve-all', { method: 'POST' }),

    freezeWallet: (duration_minutes?: number, reason?: string) =>
        apiRequest<{ message: string; wallet_status: string; freeze_until: string }>('/alerts/freeze-wallet', {
            method: 'POST',
            body: JSON.stringify({ duration_minutes, reason }),
        }),

    unfreezeWallet: () =>
        apiRequest<{ message: string; wallet_status: string }>('/alerts/unfreeze-wallet', { method: 'POST' }),

    getStats: (days?: number) =>
        apiRequest<{
            total_alerts: number;
            by_type: Record<string, number>;
            by_severity: Record<string, number>;
            resolved: number;
            unresolved: number;
            resolution_rate: number;
        }>(`/alerts/stats${days ? `?days=${days}` : ''}`),

    getBehaviorBaseline: () =>
        apiRequest<{
            avg_transaction_amount: number;
            max_historical_amount: number;
            typical_txn_count_daily: number;
            most_active_hour_start: number;
            most_active_hour_end: number;
            transaction_count: number;
        }>('/alerts/behavior-baseline'),
};
