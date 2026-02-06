'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Shield, Eye, EyeOff, Wallet, AlertTriangle, MapPin, Clock, Monitor } from 'lucide-react';
import { authAPI, setToken, setUser, getToken } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lastLogin, setLastLogin] = useState<{
    time: string | null;
    location: string | null;
    device: string | null;
  } | null>(null);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    // Redirect if already logged in
    if (getToken()) {
      router.push('/dashboard');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const response = await authAPI.login(username, password);
        setToken(response.access_token);
        setUser(response.user);
        setLastLogin(response.last_login);

        // Show last login briefly then redirect
        setTimeout(() => {
          router.push('/dashboard');
        }, 2000);
      } else {
        const response = await authAPI.register(username, email, password, phone || undefined);
        setToken(response.access_token);
        setUser(response.user);
        router.push('/dashboard');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const formatLastLoginTime = (time: string | null) => {
    if (!time) return 'Never';
    const date = new Date(time);
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* Background decorations */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary-600/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 mb-4 animate-float">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold gradient-text">Fraud-Aware Wallet</h1>
          <p className="text-dark-400 mt-2">Secure digital transactions with smart protection</p>
        </div>

        {/* Last Login Info (shown after successful login) */}
        {lastLogin && (
          <div className="glass-card p-6 mb-6 animate-pulse">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              Last Login Information
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3 text-dark-300">
                <Clock className="w-4 h-4 text-primary-400" />
                <span>Time: {formatLastLoginTime(lastLogin.time)}</span>
              </div>
              <div className="flex items-center gap-3 text-dark-300">
                <MapPin className="w-4 h-4 text-primary-400" />
                <span>Location: {lastLogin.location || 'Unknown'}</span>
              </div>
              <div className="flex items-center gap-3 text-dark-300">
                <Monitor className="w-4 h-4 text-primary-400" />
                <span>Device: {lastLogin.device || 'Unknown'}</span>
              </div>
            </div>
            <p className="text-xs text-dark-400 mt-4">Redirecting to dashboard...</p>
          </div>
        )}

        {/* Login/Register Form */}
        {!lastLogin && (
          <div className="glass-card p-8">
            {/* Tabs */}
            <div className="flex gap-4 mb-6">
              <button
                onClick={() => setIsLogin(true)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${isLogin
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-dark-400 hover:text-dark-300'
                  }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setIsLogin(false)}
                className={`flex-1 py-3 rounded-xl font-medium transition-all ${!isLogin
                    ? 'bg-primary-500/20 text-primary-400 border border-primary-500/30'
                    : 'text-dark-400 hover:text-dark-300'
                  }`}
              >
                Register
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-4 p-4 rounded-xl bg-danger/10 border border-danger/30 text-danger text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input-field"
                  placeholder="Enter username"
                  required
                />
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input-field"
                    placeholder="Enter email"
                    required={!isLogin}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-dark-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-12"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {!isLogin && (
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input-field"
                    placeholder="+1-555-0100"
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="spinner" />
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </>
                )}
              </button>
            </form>

            {/* Demo credentials */}
            {isLogin && (
              <div className="mt-6 p-4 rounded-xl bg-dark-900/50 border border-dark-700">
                <p className="text-xs text-dark-400 mb-2">Demo Credentials:</p>
                <p className="text-sm text-dark-300">
                  Username: <span className="text-primary-400 font-mono">demo_user</span>
                </p>
                <p className="text-sm text-dark-300">
                  Password: <span className="text-primary-400 font-mono">password123</span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-dark-500 text-sm mt-6">
          Protected by advanced fraud detection
        </p>
      </div>
    </div>
  );
}
