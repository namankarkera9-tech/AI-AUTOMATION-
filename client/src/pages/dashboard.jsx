import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { RefreshCw, Play, Zap, CheckCircle, XCircle, Clock } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import MetricGrid from '../components/MetricGrid';
import { workflowAPI } from '../lib/api';
import { getSocket } from '../lib/socket';
import { AGENT_BADGE_META } from '../lib/nodeCatalog';

const STATUS_CONFIG = {
  COMPLETED: { icon: CheckCircle, color: '#10b981', label: 'Completed' },
  FAILED: { icon: XCircle, color: '#ef4444', label: 'Failed' },
  RUNNING: { icon: Play, color: '#6366f1', label: 'Running' },
  RETRYING: { icon: RefreshCw, color: '#f59e0b', label: 'Retrying' },
  PENDING: { icon: Clock, color: '#64748b', label: 'Pending' },
  PAUSED: { icon: Clock, color: '#94a3b8', label: 'Paused' },
  CANCELLED: { icon: XCircle, color: '#64748b', label: 'Cancelled' },
};

function ActivityFeedItem({ log }) {
  const agentMeta = AGENT_BADGE_META[log.agent] || { label: log.agent, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
  const levelColors = { info: '#60a5fa', success: '#34d399', warning: '#fbbf24', error: '#f87171' };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800/50 last:border-0">
      <span
        className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5"
        style={{ background: agentMeta.bg, color: agentMeta.color }}
      >
        {agentMeta.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug" style={{ color: levelColors[log.level] || '#94a3b8' }}>
          {log.message}
        </p>
        <p className="text-[10px] text-slate-600 mt-0.5">
          {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
        </p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);

  const loadDashboard = async () => {
    setIsLoading(true);
    try {
      const { data: res } = await workflowAPI.dashboard();
      setData(res.data);
    } catch (err) {
      console.error('Dashboard load error', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
    const socket = getSocket();
    const handleEvent = (event) => {
      setLiveEvents((prev) => [event, ...prev.slice(0, 19)]);
    };
    socket.on('dashboard:event', handleEvent);
    return () => socket.off('dashboard:event', handleEvent);
  }, []);

  const allLogs = [...liveEvents, ...(data?.recentLogs || [])].slice(0, 20);

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="px-6 lg:px-8 py-6 max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-white text-xl font-bold">Operations Dashboard</h1>
              <p className="text-slate-500 text-sm mt-0.5">Real-time workflow orchestration overview</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                id="dashboard-refresh"
                onClick={loadDashboard}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-slate-300 border border-slate-700 hover:border-slate-600 transition-all"
              >
                <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
                Refresh
              </button>
              <Link href="/workflows/builder">
                <button
                  id="dashboard-new-workflow"
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white"
                  style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                >
                  <Zap size={14} />
                  New Workflow
                </button>
              </Link>
            </div>
          </div>

          {/* Metric Grid */}
          <div className="mb-6">
            <MetricGrid metrics={data?.metrics || {}} isLoading={isLoading} />
          </div>

          {/* Two-column lower section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Recent Workflows */}
            <div className="rounded-xl border border-slate-800/60" style={{ background: 'rgba(17,24,39,0.7)' }}>
              <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <p className="text-white text-sm font-semibold">Recent Workflows</p>
                <Link href="/workflows/builder">
                  <button className="text-brand-400 text-xs hover:text-brand-300 transition-colors">View all →</button>
                </Link>
              </div>
              <div className="divide-y divide-slate-800/40">
                {isLoading ? (
                  Array(4).fill(0).map((_, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-slate-700" />
                      <div className="h-3 bg-slate-700 rounded flex-1" />
                      <div className="h-3 bg-slate-800 rounded w-16" />
                    </div>
                  ))
                ) : data?.recentWorkflows?.length > 0 ? (
                  data.recentWorkflows.map((wf) => (
                    <div
                      key={wf._id || wf.id}
                      className="px-5 py-3 flex items-center gap-3 hover:bg-slate-800/30 transition-colors cursor-pointer"
                      onClick={() => router.push(`/workflows/${wf._id || wf.id}`)}
                    >
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        wf.status === 'active' ? 'bg-emerald-400' :
                        wf.status === 'draft' ? 'bg-slate-500' : 'bg-slate-600'
                      }`} />
                      <p className="text-white text-sm flex-1 truncate">{wf.name}</p>
                      <span className="text-slate-500 text-xs capitalize">{wf.status}</span>
                    </div>
                  ))
                ) : (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">
                    No workflows yet.{' '}
                    <Link href="/workflows/builder" className="text-brand-400">Create one →</Link>
                  </div>
                )}
              </div>
            </div>

            {/* AI Reasoning Activity */}
            <div className="rounded-xl border border-slate-800/60" style={{ background: 'rgba(17,24,39,0.7)' }}>
              <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <p className="text-white text-sm font-semibold">AI Agent Activity</p>
                  {liveEvents.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  )}
                </div>
                <span className="text-slate-600 text-xs">Live stream</span>
              </div>
              <div className="px-5 max-h-72 overflow-y-auto">
                {allLogs.length > 0 ? (
                  allLogs.map((log, i) => (
                    <ActivityFeedItem key={log._id || log.id || i} log={log} />
                  ))
                ) : (
                  <div className="py-8 text-center text-slate-500 text-sm">
                    Agent activity will appear here during executions
                  </div>
                )}
              </div>
            </div>

            {/* Recent Executions */}
            <div className="lg:col-span-2 rounded-xl border border-slate-800/60" style={{ background: 'rgba(17,24,39,0.7)' }}>
              <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between">
                <p className="text-white text-sm font-semibold">Recent Executions</p>
                <Link href="/executions">
                  <button className="text-brand-400 text-xs hover:text-brand-300 transition-colors">View all →</button>
                </Link>
              </div>
              <div className="divide-y divide-slate-800/40">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="px-5 py-3 flex items-center gap-4 animate-pulse">
                      <div className="w-16 h-3 bg-slate-700 rounded" />
                      <div className="h-3 bg-slate-700 rounded flex-1" />
                      <div className="w-20 h-3 bg-slate-800 rounded" />
                    </div>
                  ))
                ) : data?.recentExecutions?.length > 0 ? (
                  data.recentExecutions.slice(0, 6).map((exec) => {
                    const statusConf = STATUS_CONFIG[exec.status] || STATUS_CONFIG.PENDING;
                    const StatusIcon = statusConf.icon;
                    return (
                      <div
                        key={exec._id || exec.id}
                        className="px-5 py-3 flex items-center gap-4 hover:bg-slate-800/30 transition-colors cursor-pointer"
                        onClick={() => router.push(`/executions`)}
                      >
                        <StatusIcon size={14} style={{ color: statusConf.color }} className="flex-shrink-0" />
                        <p className="text-white text-sm flex-1 truncate">
                          {exec.workflowSnapshot?.name || 'Workflow Execution'}
                        </p>
                        <span className="text-xs" style={{ color: statusConf.color }}>{statusConf.label}</span>
                        <span className="text-slate-600 text-xs">
                          {exec.duration ? `${Math.round(exec.duration / 1000)}s` : '—'}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="px-5 py-8 text-center text-slate-500 text-sm">
                    No executions yet. Execute a workflow to see results here.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
