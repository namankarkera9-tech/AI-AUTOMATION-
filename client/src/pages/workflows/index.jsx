import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { GitBranch, Plus, Search, Copy, Trash2, RefreshCw } from 'lucide-react';
import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import { workflowAPI } from '../../lib/api';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState([]);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data } = await workflowAPI.list({ search: query, limit: 50 });
      setWorkflows(data.data.workflows || []);
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Unable to load workflows.');
    } finally {
      setIsLoading(false);
    }
  }, [query]);

  useEffect(() => { loadWorkflows(); }, [loadWorkflows]);

  const duplicate = async (id) => {
    try {
      const { data } = await workflowAPI.duplicate(id);
      const copy = data.data.workflow;
      router.push(`/workflows/${copy._id || copy.id}`);
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Could not duplicate workflow.');
    }
  };

  const remove = async (workflow) => {
    if (!window.confirm(`Delete “${workflow.name}”? This cannot be undone.`)) return;
    try {
      await workflowAPI.delete(workflow._id || workflow.id);
      setWorkflows((items) => items.filter((item) => (item._id || item.id) !== (workflow._id || workflow.id)));
    } catch (error) {
      setMessage(error.response?.data?.error?.message || 'Could not delete workflow.');
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <section className="mx-auto max-w-6xl px-6 py-7 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-white">Workflows</h1>
              <p className="mt-1 text-sm text-slate-500">Search, edit, duplicate, and manage your automations.</p>
            </div>
            <Link href="/workflows/builder" className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-500">
              <Plus size={15} /> Create workflow
            </Link>
          </div>

          <div className="mb-5 flex gap-2">
            <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900/60 px-3">
              <Search size={15} className="text-slate-500" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search workflows…" className="w-full bg-transparent py-3 text-sm text-white outline-none placeholder:text-slate-600" />
            </div>
            <button onClick={loadWorkflows} aria-label="Refresh workflows" className="rounded-xl border border-slate-800 px-3 text-slate-400 hover:text-white"><RefreshCw size={15} /></button>
          </div>

          {message && <p role="status" className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">{message}</p>}
          {isLoading ? <div className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900/40" /> : workflows.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40">
              {workflows.map((workflow) => {
                const id = workflow._id || workflow.id;
                return (
                  <article key={id} className="flex flex-wrap items-center gap-4 border-b border-slate-800/80 px-5 py-4 last:border-b-0">
                    <GitBranch size={18} className="text-indigo-400" />
                    <Link href={`/workflows/${id}`} className="min-w-0 flex-1">
                      <h2 className="truncate text-sm font-semibold text-white hover:text-indigo-300">{workflow.name}</h2>
                      <p className="mt-1 truncate text-xs text-slate-500">{workflow.description || `${workflow.nodes?.length || 0} nodes · Updated ${new Date(workflow.updatedAt).toLocaleDateString()}`}</p>
                    </Link>
                    <span className="rounded-full border border-slate-700 px-2.5 py-1 text-[10px] uppercase tracking-wide text-slate-400">{workflow.status || 'draft'}</span>
                    <span className="text-xs text-slate-500">v{workflow.version || 1}</span>
                    <button onClick={() => duplicate(id)} aria-label={`Duplicate ${workflow.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-slate-800 hover:text-white"><Copy size={14} /></button>
                    <button onClick={() => remove(workflow)} aria-label={`Delete ${workflow.name}`} className="rounded-lg p-2 text-slate-500 hover:bg-red-500/10 hover:text-red-400"><Trash2 size={14} /></button>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-800 py-16 text-center">
              <GitBranch size={28} className="mx-auto text-slate-600" />
              <p className="mt-3 text-sm font-medium text-slate-300">No workflows found</p>
              <p className="mt-1 text-xs text-slate-500">Create one manually or generate it from a prompt.</p>
            </div>
          )}
        </section>
      </AppShell>
    </ProtectedRoute>
  );
}
