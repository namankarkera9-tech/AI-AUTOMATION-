import { useEffect, useState } from 'react';
import { Key, LogOut, CheckCircle, XCircle, Circle } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import useAuthStore from '../store/authStore';
import { useRouter } from 'next/router';
import { healthAPI } from '../lib/api';

function SettingSection({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800/60 overflow-hidden mb-5"
      style={{ background: 'rgba(17,24,39,0.7)' }}>
      <div className="px-6 py-4 border-b border-slate-800/60">
        <p className="text-white text-sm font-semibold">{title}</p>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

function StatusIndicator({ ok, label }) {
  return (
    <div className="flex items-center gap-2">
      {ok === null ? <Circle size={14} className="text-slate-600" /> : ok ? (
        <CheckCircle size={14} className="text-emerald-400" />
      ) : (
        <XCircle size={14} className="text-red-400" />
      )}
      <p className="text-slate-300 text-sm">{label}</p>
    </div>
  );
}

export default function Settings() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAuthStore();
  const [health, setHealth] = useState(null);
  const [isCheckingHealth, setIsCheckingHealth] = useState(false);
  const [profile, setProfile] = useState({ name: user?.name || '', email: user?.email || '' });
  const [profileMessage, setProfileMessage] = useState('');

  useEffect(() => setProfile({ name: user?.name || '', email: user?.email || '' }), [user?.name, user?.email]);

  const checkHealth = async () => {
    setIsCheckingHealth(true);
    try {
      const { data } = await healthAPI.check();
      setHealth(data);
    } catch {
      setHealth({ status: 'unavailable' });
    } finally {
      setIsCheckingHealth(false);
    }
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      await updateProfile(profile);
      setProfileMessage('Profile updated.');
    } catch (error) {
      setProfileMessage(error.response?.data?.error?.message || 'Could not update profile.');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="px-6 lg:px-8 py-6 max-w-2xl mx-auto">
          <div className="mb-6">
            <h1 className="text-white text-xl font-bold">Settings</h1>
            <p className="text-slate-500 text-sm mt-0.5">Manage your account and platform preferences</p>
          </div>

          {/* Profile */}
          <SettingSection title="Profile">
            <form onSubmit={saveProfile} className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {(profile.name || user?.name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 space-y-3">
                <label className="block text-xs text-slate-500">Name<input required value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
                <label className="block text-xs text-slate-500">Email<input required type="email" value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white" /></label>
                <span
                  className="inline-block mt-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize"
                  style={{ background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
                >
                  {user?.role || 'operator'}
                </span>
                <div className="flex items-center gap-3">
                  <button type="submit" className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-500">Save profile</button>
                  <span role="status" className="text-xs text-slate-400">{profileMessage}</span>
                </div>
              </div>
            </form>
          </SettingSection>

          {/* Security */}
          <SettingSection title="Security Configuration">
            <div className="space-y-3">
              <StatusIndicator ok={health ? health.security?.jwtSecretConfigured : null} label="JWT_SECRET configured in environment" />
              <StatusIndicator ok={health ? health.security?.credentialEncryptionKeyConfigured : null} label="Credential encryption key configured" />
              <StatusIndicator ok={health ? health.security?.helmetEnabled : null} label="HTTP security headers enabled" />
              <StatusIndicator ok={health ? health.security?.corsRestricted : null} label="CORS restricted to configured client origin" />
              <StatusIndicator ok={null} label="Passwords hashed using bcrypt cost 12" />
              <StatusIndicator ok={null} label="Auth endpoints rate-limited and requests validated" />
              {!health && <p className="text-xs text-slate-500">Run the API health check to verify environment configuration.</p>}
            </div>
          </SettingSection>

          {/* API Health */}
          <SettingSection title="API Health Check">
            <button
              id="settings-health-check"
              onClick={checkHealth}
              disabled={isCheckingHealth}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 border border-slate-700 hover:border-brand-500 hover:text-brand-400 transition-all mb-4"
            >
              <Key size={14} className={isCheckingHealth ? 'animate-spin' : ''} />
              {isCheckingHealth ? 'Checking…' : 'Check API Health'}
            </button>

            {health && (
              <div className="space-y-2 text-sm">
                <StatusIndicator ok={health.status === 'healthy'} label={`Server: ${health.status}`} />
                <StatusIndicator
                  ok={health.services?.database?.includes('mongodb')}
                  label={`Database: ${health.services?.database || '—'}`}
                />
                <StatusIndicator
                  ok={!!health.services?.queueEngine}
                  label={`Queue Engine: ${health.services?.queueEngine || '—'}`}
                />
                <StatusIndicator
                  ok={!!health.services?.socketServer}
                  label={`Socket.IO: ${health.services?.socketServer || '—'}`}
                />
                <StatusIndicator ok={health.aiProviders?.openrouterConfigured} label="OpenRouter API key configured" />
                <StatusIndicator ok={health.aiProviders?.geminiConfigured} label="Gemini API key configured" />
                <p className="text-slate-500 text-xs mt-2">Uptime: {health.uptime} · v{health.version}</p>
              </div>
            )}
          </SettingSection>

          {/* Environment */}
          <SettingSection title="Environment">
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">API Endpoint</span>
                <code className="text-slate-300 text-xs bg-slate-800 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api'}
                </code>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-slate-800">
                <span className="text-slate-400">Socket.IO</span>
                <code className="text-slate-300 text-xs bg-slate-800 px-2 py-1 rounded">
                  {process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001'}
                </code>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-slate-400">Platform</span>
                <span className="text-slate-300 text-xs">Agentflow AI v1.0.0</span>
              </div>
            </div>
          </SettingSection>

          {/* Logout */}
          <button
            id="settings-logout"
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium text-red-400 border border-red-500/30 hover:border-red-500/60 hover:bg-red-500/5 transition-all"
          >
            <LogOut size={14} />
            Sign Out
          </button>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
