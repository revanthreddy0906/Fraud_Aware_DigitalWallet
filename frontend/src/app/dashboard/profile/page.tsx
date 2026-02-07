'use client';

import { useState, useEffect } from 'react';
import {
    User,
    Mail,
    Phone,
    Clock,
    DollarSign,
    Activity,
    Shield,
    MapPin,
    Monitor,
    Trash2,
    CheckCircle,
    XCircle,
} from 'lucide-react';
import { usersAPI, getUser, setUser, User as UserType } from '@/lib/api';

interface Device {
    device_id: number;
    device_fingerprint: string;
    device_name: string;
    is_trusted: boolean;
}

interface Location {
    location_id: number;
    location_name: string;
    is_trusted: boolean;
}

export default function ProfilePage() {
    const [user, setUserState] = useState<UserType | null>(null);
    const [devices, setDevices] = useState<Device[]>([]);
    const [locations, setLocations] = useState<Location[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Profile form
    const [phone, setPhone] = useState('');
    const [email, setEmail] = useState('');

    // Security settings form
    const [startHour, setStartHour] = useState(6);
    const [endHour, setEndHour] = useState(23);
    const [maxAmount, setMaxAmount] = useState(10000);
    const [maxTxns, setMaxTxns] = useState(5);

    useEffect(() => {
        const storedUser = getUser();
        if (storedUser) {
            setUserState(storedUser);
            setPhone(storedUser.phone || '');
            setEmail(storedUser.email);
            setStartHour(storedUser.allowed_start_hour);
            setEndHour(storedUser.allowed_end_hour);
            setMaxAmount(storedUser.max_txn_amount);
            setMaxTxns(storedUser.max_txns_10min);
        }
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [profileData, devicesData, locationsData] = await Promise.all([
                usersAPI.getProfile(),
                usersAPI.getDevices(),
                usersAPI.getLocations(),
            ]);

            setUserState(profileData);
            setUser(profileData);
            setPhone(profileData.phone || '');
            setEmail(profileData.email);
            setStartHour(profileData.allowed_start_hour);
            setEndHour(profileData.allowed_end_hour);
            setMaxAmount(profileData.max_txn_amount);
            setMaxTxns(profileData.max_txns_10min);
            setDevices(devicesData);
            setLocations(locationsData);
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveProfile = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await usersAPI.updateProfile({ phone, email });
            setMessage({ type: 'success', text: 'Profile updated successfully' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update profile' });
        } finally {
            setSaving(false);
        }
    };

    const handleSaveSecuritySettings = async () => {
        setSaving(true);
        setMessage(null);
        try {
            await usersAPI.updateSecuritySettings({
                allowed_start_hour: startHour,
                allowed_end_hour: endHour,
                max_txn_amount: maxAmount,
                max_txns_10min: maxTxns,
            });
            setMessage({ type: 'success', text: 'Security settings updated successfully' });
            fetchData();
        } catch (error) {
            setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Failed to update settings' });
        } finally {
            setSaving(false);
        }
    };

    const handleRemoveDevice = async (deviceId: number) => {
        try {
            // This would call the API to remove the device
            // For now, just filter it out locally
            setDevices(devices.filter(d => d.device_id !== deviceId));
        } catch (error) {
            console.error('Failed to remove device:', error);
        }
    };

    const handleRemoveLocation = async (locationId: number) => {
        try {
            setLocations(locations.filter(l => l.location_id !== locationId));
        } catch (error) {
            console.error('Failed to remove location:', error);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="spinner" />
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Message */}
            {message && (
                <div
                    className={`p-4 rounded-xl flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-success/10 border border-success/30 text-success'
                        : 'bg-danger/10 border border-danger/30 text-danger'
                        }`}
                >
                    {message.type === 'success' ? (
                        <CheckCircle className="w-5 h-5" />
                    ) : (
                        <XCircle className="w-5 h-5" />
                    )}
                    {message.text}
                </div>
            )}

            {/* Profile Card */}
            <div className="glass-card p-6 lg:p-8">
                <div className="flex items-center gap-6 mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                        <span className="text-3xl font-bold text-white">
                            {user?.username?.charAt(0).toUpperCase() || 'U'}
                        </span>
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">{user?.username}</h2>
                        <p className="text-dark-400">Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            <Mail className="w-4 h-4 inline mr-2" />
                            Email
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            <Phone className="w-4 h-4 inline mr-2" />
                            Phone
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="input-field"
                            placeholder="+1-555-0100"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveProfile}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? 'Saving...' : 'Update Profile'}
                    </button>
                </div>
            </div>

            {/* Security Settings */}
            <div className="glass-card p-6 lg:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="w-6 h-6 text-primary-400" />
                    <h3 className="text-xl font-semibold text-white">Security Controls</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            <Clock className="w-4 h-4 inline mr-2" />
                            Allowed Transaction Hours
                        </label>
                        <div className="flex items-center gap-2">
                            <select
                                value={startHour}
                                onChange={(e) => setStartHour(parseInt(e.target.value))}
                                className="input-field"
                            >
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>
                                        {i.toString().padStart(2, '0')}:00
                                    </option>
                                ))}
                            </select>
                            <span className="text-dark-400">to</span>
                            <select
                                value={endHour}
                                onChange={(e) => setEndHour(parseInt(e.target.value))}
                                className="input-field"
                            >
                                {Array.from({ length: 24 }, (_, i) => (
                                    <option key={i} value={i}>
                                        {i.toString().padStart(2, '0')}:00
                                    </option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-dark-500 mt-1">
                            Transactions outside these hours will trigger alerts
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            <DollarSign className="w-4 h-4 inline mr-2" />
                            Max Transaction Amount
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-400">$</span>
                            <input
                                type="number"
                                value={maxAmount}
                                onChange={(e) => setMaxAmount(parseFloat(e.target.value))}
                                className="input-field pl-8"
                                min="0"
                            />
                        </div>
                        <p className="text-xs text-dark-500 mt-1">
                            Transactions exceeding this will require confirmation
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-2">
                            <Activity className="w-4 h-4 inline mr-2" />
                            Max Consecutive Transactions
                        </label>
                        <input
                            type="number"
                            value={maxTxns}
                            onChange={(e) => setMaxTxns(parseInt(e.target.value))}
                            className="input-field"
                            min="1"
                            max="5"
                        />
                        <p className="text-xs text-dark-500 mt-1">
                            Transactions exceeding this trigger a warning. (Max 5 allowed before auto-freeze)
                        </p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSaveSecuritySettings}
                        disabled={saving}
                        className="btn-primary"
                    >
                        {saving ? 'Saving...' : 'Save Security Settings'}
                    </button>
                </div>
            </div>

            {/* Known Devices */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <Monitor className="w-5 h-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-white">Known Devices</h3>
                </div>

                {devices.length > 0 ? (
                    <div className="space-y-3">
                        {devices.map((device) => (
                            <div
                                key={device.device_id}
                                className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-primary-500/20 flex items-center justify-center">
                                        <Monitor className="w-5 h-5 text-primary-400" />
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">{device.device_name || 'Unknown Device'}</p>
                                        <p className="text-sm text-dark-500 font-mono">
                                            {device.device_fingerprint.substring(0, 16)}...
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    {device.is_trusted && (
                                        <span className="px-3 py-1 rounded-full text-xs bg-success/20 text-success">
                                            Trusted
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleRemoveDevice(device.device_id)}
                                        className="p-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-8 text-dark-400">No known devices</p>
                )}
            </div>

            {/* Known Locations */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-3 mb-6">
                    <MapPin className="w-5 h-5 text-primary-400" />
                    <h3 className="text-lg font-semibold text-white">Known Locations</h3>
                </div>

                {locations.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {locations.map((location) => (
                            <div
                                key={location.location_id}
                                className="flex items-center justify-between p-4 rounded-xl bg-dark-900/50 border border-dark-700"
                            >
                                <div className="flex items-center gap-3">
                                    <MapPin className="w-5 h-5 text-primary-400" />
                                    <span className="text-white">{location.location_name}</span>
                                    {location.is_trusted && (
                                        <span className="px-2 py-0.5 rounded-full text-xs bg-success/20 text-success">
                                            Trusted
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleRemoveLocation(location.location_id)}
                                    className="p-2 rounded-lg bg-danger/20 text-danger hover:bg-danger/30 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-center py-8 text-dark-400">No known locations</p>
                )}
            </div>
        </div>
    );
}
