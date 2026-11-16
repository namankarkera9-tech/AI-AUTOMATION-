import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, RefreshCw, ExternalLink, Wifi } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { integrationAPI } from '../lib/api';

const PROVIDER_META = {
  gmail: {
    name: 'Gmail',
    icon: '✉',
    color: '#ea4335',
    bg: 'rgba(234,67,53,0.12)',
    description: 'Read & send emails, parse content, automate replies',
    scopes: ['gmail.send', 'gmail.readonly'],
  },
  slack: {
    name: 'Slack',
    icon: '💬',
    color: '#4a154b',
    bg: 'rgba(74,21,75,0.12)',
    description: 'Post messages to channels, trigger workflows on events',
    scopes: ['chat:write', 'channels:read'],
  },
  discord: {
    name: 'Discord',
    icon: '🎮',
    color: '#5865f2',
    bg: 'rgba(88,101,242,0.12)',
    description: 'Broadcast bot messages to server channels automatically',
    scopes: ['bot', 'messages.read'],
  },
  'google-sheets': {
    name: 'Google Sheets',
    icon: '📊',
    color: '#0f9d58',
    bg: 'rgba(15,157,88,0.12)',
    description: 'Append rows, read ranges, sync operational data',
    scopes: ['spreadsheets'],
  },
};

function IntegrationCard({ integration, onConnect, onReconnect, onTest, onToggle, testing }) {
  const meta = PROVIDER_META[integration.id] || {};
  const isConnected = integration.status === 'connected';

  return (
    <div
      className="rounded-2xl p-6 border transition-all hover:border-slate-700"
      style={{
        background: 'rgba(17,24,39,0.75)',
        border: isConnected ? `1px solid ${meta.color}30` : '1px solid rgba(51,65,85,0.5)',
        boxShadow: isConnected ? `0 0 20px -8px ${meta.color}` : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: meta.bg }}
          >
            {meta.icon}
          </div>
          <div>
            <p className="text-white text-sm font-semibold">{meta.name || integration.id}</p>
            <p className="text-slate-500 text-[10px] capitalize">{integration.id}</p>
          </div>
        </div>
        {isConnected && integration.enabled !== false ? (
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-400 text-xs font-medium">Connected</span>
          </div>
        ) : (
          <span className="text-slate-500 text-xs">Disconnected</span>
        )}
      </div>

      <p className="text-slate-400 text-xs mb-4 leading-relaxed">{meta.description}</p>

      {/* Account info */}
      {integration.accountEmail && (
        <div className="flex items-center gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <CheckCircle size={12} className="text-emerald-400" />
          <p className="text-slate-300 text-xs truncate">{integration.accountEmail}</p>
        </div>
      )}

      {/* Scopes */}
      {(integration.scopes || meta.scopes || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {(integration.scopes?.length > 0 ? integration.scopes : meta.scopes || []).map((scope) => (
            <span
              key={scope}
              className="text-[10px] px-2 py-0.5 rounded-md"
              style={{ background: `${meta.color}18`, color: meta.color }}
            >
              {scope}
            </span>
          ))}
        </div>
      )}

      {integration.lastError && (
        <div className="flex items-start gap-2 mb-4 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <XCircle size={12} className="text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-red-300 text-[11px] leading-snug">{integration.lastError}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
      <button
        id={`connect-${integration.id}`}
        onClick={() => isConnected ? onReconnect(integration.id) : onConnect(integration.id)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
        style={
          isConnected
            ? { background: 'rgba(255,255,255,0.06)', color: '#94a3b8', border: '1px solid rgba(51,65,85,0.5)' }
            : { background: `linear-gradient(135deg, ${meta.color}CC, ${meta.color})`, color: 'white' }
        }
      >
        <Wifi size={12} />
        {isConnected ? 'Reconnect / Refresh' : `Connect ${meta.name || integration.id}`}
      </button>
      <button
        onClick={() => onTest(integration.id)}
        disabled={!isConnected || testing === integration.id}
        className="w-full rounded-xl border border-slate-700 py-2.5 text-xs font-semibold text-slate-300 hover:border-indigo-500 hover:text-indigo-300 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {testing === integration.id ? 'Testing…' : 'Test connection'}
      </button>
      {isConnected && (
        <button onClick={() => onToggle(integration)} className="col-span-2 text-[11px] text-slate-500 hover:text-white">
          {integration.enabled === false ? 'Enable integration' : 'Disable integration'}
        </button>
      )}
      </div>
    </div>
  );
}

export default function Integrations() {
  const [integrations, setIntegrations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [testing, setTesting] = useState(null);

  const loadIntegrations = async () => {
    setIsLoading(true);
    try {
      const { data } = await integrationAPI.list();
      setIntegrations(data.data.integrations || []);
    } catch {}
    setIsLoading(false);
  };

  useEffect(() => {
    loadIntegrations();

    // Handle OAuth callback query params
    const params = new URLSearchParams(window.location.search);
    const connected = params.get('connected');
    const error = params.get('error');
    if (connected) {
      setStatus(`✓ ${connected} connected successfully`);
      loadIntegrations();
      window.history.replaceState({}, '', '/integrations');
    }
    if (error) {
      setStatus(`⚠ OAuth error: ${decodeURIComponent(error)}`);
    }
  }, []);

  const handleConnect = async (provider) => {
    try {
      const { data } = await integrationAPI.oauthStart(provider);
      window.location.href = data.data.redirectUrl;
    } catch {
      setStatus(`Failed to start OAuth for ${provider}`);
    }
  };

  const handleReconnect = async (provider) => {
    handleConnect(provider);
  };

  const handleTest = async (provider) => {
    setTesting(provider);
    try {
      await integrationAPI.test(provider);
      setStatus(`✓ ${PROVIDER_META[provider]?.name || provider} connection is healthy`);
    } catch (error) {
      setStatus(`⚠ ${error.response?.data?.error?.message || `Could not connect to ${provider}`}`);
    } finally {
      setTesting(null);
    }
  };

  const handleToggle = async (integration) => {
    try {
      await integrationAPI.setEnabled(integration.id, integration.enabled === false);
      await loadIntegrations();
    } catch (error) {
      setStatus(`⚠ ${error.response?.data?.error?.message || 'Could not update integration'}`);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="px-6 lg:px-8 py-6 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-xl font-bold">Integrations</h1>
              <p className="text-slate-500 text-sm mt-0.5">Connect third-party services via OAuth</p>
            </div>
            <button
              id="integrations-refresh"
              onClick={loadIntegrations}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 border border-slate-700 hover:border-slate-600 transition-all"
            >
              <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {status && (
            <div
              className={`mb-5 px-4 py-3 rounded-xl text-sm border ${
                status.startsWith('✓')
                  ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/5'
                  : 'text-red-300 border-red-500/30 bg-red-500/5'
              }`}
            >
              {status}
            </div>
          )}

          {/* Connected count banner */}
          {!isLoading && (
            <div className="mb-5 px-4 py-3 rounded-xl border border-slate-800/60 flex items-center gap-3"
              style={{ background: 'rgba(17,24,39,0.6)' }}>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <p className="text-white text-sm">
                  <span className="font-bold">{integrations.filter((i) => i.status === 'connected').length}</span>
                  <span className="text-slate-400"> / {integrations.length} integrations connected</span>
                </p>
              </div>
              <p className="text-slate-500 text-xs ml-auto">Tokens encrypted with AES-256-GCM at rest</p>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="rounded-2xl p-6 animate-pulse border border-slate-800"
                  style={{ background: 'rgba(17,24,39,0.5)' }}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-700" />
                    <div>
                      <div className="h-3 bg-slate-700 rounded w-20 mb-1.5" />
                      <div className="h-2 bg-slate-800 rounded w-12" />
                    </div>
                  </div>
                  <div className="h-2 bg-slate-800 rounded w-full mb-2" />
                  <div className="h-2 bg-slate-800 rounded w-4/5 mb-6" />
                  <div className="h-9 bg-slate-700 rounded-xl" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {integrations.map((integration) => (
                <IntegrationCard
                  key={integration.id}
                  integration={integration}
                  onConnect={handleConnect}
                  onReconnect={handleReconnect}
                  onTest={handleTest}
                  onToggle={handleToggle}
                  testing={testing}
                />
              ))}
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
