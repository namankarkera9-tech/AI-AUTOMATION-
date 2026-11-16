import { useEffect, useState, useRef, useCallback } from 'react';
import { RefreshCw, Play, Square, Pause, RotateCcw, ChevronRight } from 'lucide-react';
import AppShell from '../components/AppShell';
import ProtectedRoute from '../components/ProtectedRoute';
import { executionAPI } from '../lib/api';
import { getSocket, joinExecution, leaveExecution } from '../lib/socket';
import { AGENT_BADGE_META } from '../lib/nodeCatalog';

const STATUS_STYLES = {
  COMPLETED: { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Completed' },
  FAILED: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Failed' },
  RUNNING: { color: '#6366f1', bg: 'rgba(99,102,241,0.12)', label: 'Running' },
  RETRYING: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Retrying' },
  PENDING: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Pending' },
  PAUSED: { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Paused' },
  CANCELLED: { color: '#64748b', bg: 'rgba(100,116,139,0.12)', label: 'Cancelled' },
};

const LEVEL_COLORS = { info: '#60a5fa', success: '#34d399', warning: '#fbbf24', error: '#f87171' };

function TimelineLog({ log }) {
  const agent = AGENT_BADGE_META[log.agent] || { label: log.agent, color: '#6366f1', bg: 'rgba(99,102,241,0.15)' };
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-800/50 last:border-0 group hover:bg-slate-800/20 px-1 rounded transition-colors">
      <div className="flex-shrink-0 pt-0.5">
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: agent.bg, color: agent.color }}
        >
          {agent.label}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs leading-snug" style={{ color: LEVEL_COLORS[log.level] || '#94a3b8' }}>
          {log.message}
        </p>
        {log.nodeId && <p className="text-[10px] text-slate-600 mt-0.5">Node: {log.nodeId}</p>}
      </div>
      <p className="text-[10px] text-slate-600 flex-shrink-0">
        {log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : ''}
      </p>
    </div>
  );
}

export default function Executions() {
  const [executions, setExecutions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sort, setSort] = useState('newest');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [liveEvents, setLiveEvents] = useState([]);
  const prevSelectedRef = useRef(null);

  const loadExecutions = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = { limit: 20, skip: page * 20, sort, ...(selectedStatus !== 'all' ? { status: selectedStatus } : {}) };
      const { data } = await executionAPI.list(params);
      setExecutions(data.data.executions || []);
      setTotal(data.data.total || 0);
    } catch {}
    setIsLoading(false);
  }, [selectedStatus, page, sort]);

  const loadTimeline = async (id) => {
    setTimeline([]);
    setLiveEvents([]);
    try {
      const { data } = await executionAPI.timeline(id);
      setTimeline(data.data.logs || []);
    } catch {}
  };

  useEffect(() => {
    loadExecutions();
  }, [loadExecutions]);

  useEffect(() => {
    if (!selectedId) return;
    if (prevSelectedRef.current && prevSelectedRef.current !== selectedId) {
      leaveExecution(prevSelectedRef.current);
    }
    prevSelectedRef.current = selectedId;
    loadTimeline(selectedId);
    joinExecution(selectedId);

    const socket = getSocket();
    const handleEvent = (event) => {
      if (event.executionId === selectedId) {
        setLiveEvents((prev) => [...prev, event]);
      }
    };
    const handleStatus = (data) => {
      if (data.executionId === selectedId) {
        setExecutions((prev) =>
          prev.map((e) =>
            (e._id || e.id) === selectedId ? { ...e, status: data.status } : e
          )
        );
      }
    };
    socket.on('execution:event', handleEvent);
    socket.on('execution:status', handleStatus);
    return () => {
      socket.off('execution:event', handleEvent);
      socket.off('execution:status', handleStatus);
    };
  }, [selectedId]);

  const allTimeline = [...timeline, ...liveEvents];

  const handleControl = async (action) => {
    if (!selectedId) return;
    try {
      await executionAPI[action](selectedId);
      loadExecutions();
    } catch {}
  };

  const selectedExec = executions.find((e) => (e._id || e.id) === selectedId);
  const statusConf = selectedExec ? STATUS_STYLES[selectedExec.status] || STATUS_STYLES.PENDING : null;

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
          {/* Execution List */}
          <div className="w-80 flex-shrink-0 flex flex-col border-r border-slate-800"
            style={{ background: 'rgba(11,15,25,0.97)' }}>
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <p className="text-white text-sm font-semibold">Executions</p>
              <button
                id="executions-refresh"
                onClick={loadExecutions}
                className="text-slate-500 hover:text-white transition-colors"
              >
                <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* Filter */}
            <div className="px-3 py-2 border-b border-slate-800 flex gap-1.5 flex-wrap">
              {['all', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedStatus(s)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all ${
                    selectedStatus === s
                      ? 'bg-brand-600/30 text-brand-300 border border-brand-500/40'
                      : 'text-slate-500 hover:text-slate-300 border border-transparent'
                  }`}
                >
                  {s}
                </button>
              ))}
              <select aria-label="Sort executions" value={sort} onChange={(event) => { setSort(event.target.value); setPage(0); }} className="ml-auto rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-[10px] text-slate-300">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option>
              </select>
            </div>
            <div className="flex items-center justify-between border-t border-slate-800 px-3 py-2 text-[10px] text-slate-500">
              <span>{total ? `${page * 20 + 1}–${Math.min((page + 1) * 20, total)} of ${total}` : '0 executions'}</span>
              <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage((value) => Math.max(0, value - 1))} className="disabled:opacity-30">Previous</button>
                <button disabled={(page + 1) * 20 >= total} onClick={() => setPage((value) => value + 1)} className="disabled:opacity-30">Next</button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/40">
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <div key={i} className="px-4 py-4 animate-pulse">
                    <div className="h-3 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-2 bg-slate-800 rounded w-1/2" />
                  </div>
                ))
              ) : executions.length === 0 ? (
                <div className="px-4 py-8 text-center text-slate-500 text-sm">
                  No executions found
                </div>
              ) : (
                executions.map((exec) => {
                  const conf = STATUS_STYLES[exec.status] || STATUS_STYLES.PENDING;
                  const isSelected = (exec._id || exec.id) === selectedId;
                  return (
                    <button
                      key={exec._id || exec.id}
                      onClick={() => setSelectedId(exec._id || exec.id)}
                      className={`w-full text-left px-4 py-3.5 hover:bg-slate-800/40 transition-colors ${
                        isSelected ? 'bg-slate-800/60 border-l-2 border-brand-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-white text-xs font-medium truncate pr-2">
                          {exec.workflowSnapshot?.name || 'Workflow Execution'}
                        </p>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ background: conf.bg, color: conf.color }}
                        >
                          {conf.label}
                        </span>
                      </div>
                      <p className="text-slate-600 text-[10px]">
                        {exec.createdAt ? new Date(exec.createdAt).toLocaleString() : ''}
                        {exec.duration ? ` · ${Math.round(exec.duration / 1000)}s` : ''}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Timeline Panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {selectedId && selectedExec ? (
              <>
                {/* Header */}
                <div className="px-5 py-3 border-b border-slate-800 flex items-center gap-4 flex-shrink-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate">
                      {selectedExec.workflowSnapshot?.name || 'Execution Timeline'}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ background: statusConf.bg, color: statusConf.color }}
                      >
                        {statusConf.label}
                      </span>
                      {selectedExec.retryCount > 0 && (
                        <span className="text-slate-500 text-[10px]">Retried {selectedExec.retryCount}x</span>
                      )}
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2">
                    {selectedExec.status === 'RUNNING' && (
                      <button
                        id="exec-pause"
                        onClick={() => handleControl('pause')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:border-yellow-500 hover:text-yellow-400 transition-all"
                      >
                        <Pause size={12} /> Pause
                      </button>
                    )}
                    {selectedExec.status === 'PAUSED' && (
                      <button
                        id="exec-resume"
                        onClick={() => handleControl('resume')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition-all"
                      >
                        <Play size={12} /> Resume
                      </button>
                    )}
                    {['RUNNING', 'PAUSED', 'RETRYING'].includes(selectedExec.status) && (
                      <button
                        id="exec-cancel"
                        onClick={() => handleControl('cancel')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-red-400 hover:border-red-500 transition-all"
                      >
                        <Square size={12} /> Cancel
                      </button>
                    )}
                    {['COMPLETED', 'FAILED', 'CANCELLED'].includes(selectedExec.status) && (
                      <button
                        id="exec-retry"
                        onClick={() => handleControl('retry')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white hover:opacity-90 transition-all"
                        style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
                      >
                        <RotateCcw size={12} /> Retry
                      </button>
                    )}
                  </div>
                </div>

                {/* Timeline Events */}
                <div className="flex-1 overflow-y-auto px-5 py-3">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-slate-400 text-xs font-medium">Agent Timeline</p>
                    {selectedExec.status === 'RUNNING' && (
                      <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        Live
                      </span>
                    )}
                    <span className="text-slate-600 text-[10px] ml-auto">{allTimeline.length} events</span>
                  </div>

                  {allTimeline.length === 0 ? (
                    <div className="text-center py-10 text-slate-500 text-sm">
                      {selectedExec.status === 'PENDING' ? 'Execution queued, starting soon…' : 'No timeline events yet'}
                    </div>
                  ) : (
                    <div>
                      {allTimeline.map((log, i) => (
                        <TimelineLog key={log._id || log.id || i} log={log} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ChevronRight size={24} className="text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500 text-sm">Select an execution to see the live agent timeline</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
