import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Save, Play, Copy, Trash2, ArrowLeft, History } from 'lucide-react';
import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import WorkflowCanvas from '../../components/WorkflowCanvas';
import NodePalette from '../../components/NodePalette';
import NodeConfigPanel from '../../components/NodeConfigPanel';
import useWorkflowStore from '../../store/workflowStore';
import { workflowAPI } from '../../lib/api';
import { executionAPI } from '../../lib/api';
import { getSocket, joinExecution, leaveExecution } from '../../lib/socket';

export default function WorkflowEditor() {
  const router = useRouter();
  const { id } = router.query;
  const { currentWorkflow, isSaving, nodes, loadWorkflow, saveWorkflow, executeWorkflow, clearWorkflow } = useWorkflowStore();
  const [isLoading, setIsLoading] = useState(true);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [lastExecutionId, setLastExecutionId] = useState(null);
  const [executionTimeline, setExecutionTimeline] = useState([]);
  const [versions, setVersions] = useState([]);

  const loadWorkflowById = useCallback((workflowId) => loadWorkflow(workflowId), [loadWorkflow]);
  const resetWorkflow = useCallback(() => clearWorkflow(), [clearWorkflow]);

  useEffect(() => {
    if (!id) return;
    resetWorkflow();
    setIsLoading(true);
    loadWorkflowById(id)
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, [id, resetWorkflow, loadWorkflowById]);

  const handleSave = async () => {
    try {
      await saveWorkflow();
      setStatus('✓ Saved successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
  };

  const handleExecute = async () => {
    if (!currentWorkflow) return;
    try {
      const savedWorkflow = await saveWorkflow();
      const workflowId = savedWorkflow?._id || savedWorkflow?.id || id;
      const execution = await executeWorkflow(workflowId);
      setLastExecutionId(execution._id || execution.id);
      router.push('/executions');
    } catch (err) {
      setStatus(`Execution error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (!lastExecutionId) return undefined;
    joinExecution(lastExecutionId);
    executionAPI.timeline(lastExecutionId).then(({ data }) => setExecutionTimeline(data.data.logs || [])).catch(() => {});
    const socket = getSocket();
    const onEvent = (event) => { if (event.executionId === lastExecutionId) setExecutionTimeline((items) => [...items, event]); };
    socket.on('execution:event', onEvent);
    return () => { socket.off('execution:event', onEvent); leaveExecution(lastExecutionId); };
  }, [lastExecutionId]);

  const handleDuplicate = async () => {
    try {
      const { data } = await workflowAPI.duplicate(id);
      router.push(`/workflows/${data.data.workflow._id || data.data.workflow.id}`);
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Delete this workflow permanently?')) return;
    try {
      await workflowAPI.delete(id);
      router.push('/dashboard');
    } catch {}
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="flex items-center justify-center h-[calc(100vh-3.5rem)]">
            <div className="text-center">
              <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Loading workflow…</p>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex flex-col h-[calc(100vh-3.5rem)]">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-800 bg-console-bg flex-shrink-0">
            <button
              onClick={() => router.back()}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {currentWorkflow?.name || 'Workflow Editor'}
              </p>
              <p className="text-slate-600 text-[10px]">
                v{currentWorkflow?.version || 1} · {nodes.length} nodes
              </p>
            </div>

            {status && <p className="text-slate-400 text-xs hidden lg:block truncate max-w-48">{status}</p>}
            {error && <p className="text-red-400 text-xs hidden lg:block">{error}</p>}

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                id="editor-save"
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:border-emerald-500 hover:text-emerald-400 transition-all"
              >
                <Save size={12} />
                {isSaving ? 'Saving…' : 'Save'}
              </button>
              <button
                id="editor-duplicate"
                onClick={handleDuplicate}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-slate-700 text-slate-300 hover:border-slate-500 transition-all"
              >
                <Copy size={12} />
                Duplicate
              </button>
              <button
                id="editor-versions"
                onClick={async () => {
                  try {
                    const { data } = await workflowAPI.versions(id);
                    setVersions(data.data.versions || []);
                  } catch (e) { setStatus(e.response?.data?.error?.message || 'Could not load versions'); }
                }}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500"
              >
                <History size={12} /> Versions
              </button>
              <button
                id="editor-execute"
                onClick={handleExecute}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                <Play size={12} />
                Execute
              </button>
              <button
                id="editor-delete"
                onClick={handleDelete}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-500/40 transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
          {versions.length > 0 && (
            <section className="border-b border-slate-800 bg-slate-950/90 px-5 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-2 text-xs font-semibold text-slate-300">Version history</span>
                {versions.map((version) => (
                  <div key={`${version.version}-${version.createdAt}`} className="flex items-center gap-2 rounded-lg border border-slate-800 px-2.5 py-1.5">
                    <span className="text-[10px] text-slate-400">v{version.version}{version.current ? ' · current' : ''}</span>
                    {!version.current && <button onClick={async () => { await workflowAPI.restoreVersion(id, version.version); await loadWorkflowById(id); setVersions([]); setStatus(`Restored version ${version.version}`); }} className="text-[10px] text-indigo-300 hover:text-white">Restore</button>}
                  </div>
                ))}
                <button onClick={() => setVersions([])} className="ml-auto text-xs text-slate-500 hover:text-white">Close</button>
              </div>
            </section>
          )}

          {/* Canvas area */}
          <div className="flex flex-1 overflow-hidden">
            <div className="w-48 flex-shrink-0 hidden lg:block">
              <NodePalette />
            </div>
            <div className="flex-1">
              <WorkflowCanvas />
            </div>
            <div className="w-56 flex-shrink-0 hidden lg:block">
              <NodeConfigPanel />
            </div>
          </div>
          {executionTimeline.length > 0 && (
            <section className="max-h-44 overflow-y-auto border-t border-slate-800 bg-slate-950/80 px-5 py-3">
              <h2 className="mb-2 text-xs font-semibold text-slate-300">Latest execution timeline</h2>
              {executionTimeline.map((event, index) => <p key={event._id || event.id || index} className="py-1 text-[11px] text-slate-400"><span className="mr-2 uppercase text-indigo-300">{event.agent}</span>{event.message}</p>)}
            </section>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
