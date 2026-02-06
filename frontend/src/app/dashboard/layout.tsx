'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import {
    LayoutDashboard,
    Send,
    Wallet,
    FileText,
    Shield,
    User,
    LogOut,
    Menu,
    X,
    Bell,
    Snowflake,
} from 'lucide-react';
import { getToken, getUser, removeToken, alertsAPI, transactionsAPI, User as UserType } from '@/lib/api';

const navItems = [
    { href: '/dashboard', label: 'Overview', icon: LayoutDashboard },
    { href: '/dashboard/transactions', label: 'Send Money', icon: Send },
    { href: '/dashboard/balance', label: 'Balance', icon: Wallet },
    { href: '/dashboard/statement', label: 'Statement', icon: FileText },
    { href: '/dashboard/risk-analysis', label: 'Risk Analysis', icon: Shield },
    { href: '/dashboard/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [user, setUser] = useState<UserType | null>(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [unreadAlerts, setUnreadAlerts] = useState(0);
    const [walletStatus, setWalletStatus] = useState<'active' | 'frozen'>('active');
    const [freezeUntil, setFreezeUntil] = useState<string | null>(null);

    useEffect(() => {
        // Check auth
        const token = getToken();
        if (!token) {
            router.push('/');
            return;
        }

        // Get user
        const storedUser = getUser();
        if (storedUser) {
            setUser(storedUser);
        }

        // Fetch alerts count and wallet status
        const fetchData = async () => {
            try {
                const [alertsData, balanceData] = await Promise.all([
                    alertsAPI.getUnresolved(),
                    transactionsAPI.getBalance(),
                ]);
                setUnreadAlerts(alertsData.count);
                setWalletStatus(balanceData.wallet_status as 'active' | 'frozen');
                setFreezeUntil(balanceData.freeze_until);
            } catch (error) {
                console.error('Failed to fetch data:', error);
            }
        };

        fetchData();
        // Refresh every 5 seconds for faster wallet status updates
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, [router]);

    const handleLogout = () => {
        removeToken();
        router.push('/');
    };

    const formatFreezeTime = (freezeUntil: string) => {
        const until = new Date(freezeUntil);
        const now = new Date();
        const diff = until.getTime() - now.getTime();
        const minutes = Math.ceil(diff / 60000);
        return minutes > 0 ? `${minutes} min` : 'Unfreezing...';
    };

    return (
        <div className="min-h-screen flex">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed lg:static inset-y-0 left-0 z-50 w-72 glass-card border-r border-dark-700 transform transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="p-4 border-b border-dark-700">
                        <Image
                            src="/logo.jpeg"
                            alt="Money Square"
                            width={280}
                            height={80}
                            className="rounded-lg w-full h-auto"
                            priority
                        />
                    </div>

                    {/* Wallet Status */}
                    <div className="p-4 mx-4 mt-4 rounded-xl bg-dark-900/50 border border-dark-700">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-dark-400">Wallet Status</span>
                            {walletStatus === 'frozen' ? (
                                <Snowflake className="w-4 h-4 text-info animate-pulse" />
                            ) : (
                                <div className="w-2 h-2 rounded-full bg-success animate-pulse" />
                            )}
                        </div>
                        <span
                            className={`text-lg font-semibold ${walletStatus === 'frozen' ? 'text-info' : 'text-success'
                                }`}
                        >
                            {walletStatus === 'frozen' ? 'Frozen' : 'Active'}
                        </span>
                        {walletStatus === 'frozen' && freezeUntil && (
                            <p className="text-xs text-dark-400 mt-1">
                                Unfreezes in: {formatFreezeTime(freezeUntil)}
                            </p>
                        )}
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={`sidebar-link ${isActive ? 'active' : ''}`}
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User section */}
                    <div className="p-4 border-t border-dark-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                                <span className="text-white font-semibold">
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">
                                    {user?.username || 'User'}
                                </p>
                                <p className="text-xs text-dark-400 truncate">{user?.email || ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-xl text-dark-400 hover:text-white hover:bg-dark-800 transition-colors"
                        >
                            <LogOut className="w-4 h-4" />
                            <span>Sign Out</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-h-screen">
                {/* Top bar */}
                <header className="sticky top-0 z-30 glass-card border-b border-dark-700 px-4 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className="lg:hidden p-2 rounded-lg hover:bg-dark-800"
                            >
                                {sidebarOpen ? (
                                    <X className="w-6 h-6 text-dark-300" />
                                ) : (
                                    <Menu className="w-6 h-6 text-dark-300" />
                                )}
                            </button>
                            <h2 className="text-xl font-semibold text-white">
                                {navItems.find((item) => item.href === pathname)?.label || 'Dashboard'}
                            </h2>
                        </div>

                        <div className="flex items-center gap-4">
                            {/* Alerts button */}
                            <Link
                                href="/dashboard/risk-analysis"
                                className="relative p-2 rounded-lg hover:bg-dark-800 transition-colors"
                            >
                                <Bell className="w-5 h-5 text-dark-300" />
                                {unreadAlerts > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white text-xs flex items-center justify-center font-medium">
                                        {unreadAlerts > 9 ? '9+' : unreadAlerts}
                                    </span>
                                )}
                            </Link>

                            {/* Current time */}
                            <span className="hidden sm:block text-sm text-dark-400">
                                {new Date().toLocaleDateString('en-IN', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </span>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 p-4 lg:p-8">{children}</main>
            </div>
        </div>
    );
}
