import { GitBranch, X } from 'lucide-react';

export default function GraphPreviewPanel({ nodes = [], edges = [], onClose }) {
  return (
    <aside className="flex h-full flex-col border-l border-slate-800 bg-slate-950/95">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white"><GitBranch size={14} className="text-indigo-400" /> Graph preview</div>
        <button onClick={onClose} aria-label="Close graph preview" className="text-slate-500 hover:text-white"><X size={14} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3">
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><p className="text-lg font-bold text-white">{nodes.length}</p><p className="text-[10px] text-slate-500">Nodes</p></div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/70 p-3"><p className="text-lg font-bold text-white">{edges.length}</p><p className="text-[10px] text-slate-500">Connections</p></div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">Execution graph</p>
        {nodes.map((node, index) => {
          const outgoing = edges.filter((edge) => edge.source === node.id);
          return (
            <div key={node.id} className="mb-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3">
              <div className="flex items-center gap-2"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/15 text-[9px] text-indigo-300">{index + 1}</span><p className="truncate text-xs font-medium text-slate-200">{node.data?.label || node.id}</p></div>
              <p className="ml-7 mt-1 text-[10px] text-slate-500">{node.data?.nodeType || node.type || 'node'}{outgoing.length ? ` · → ${outgoing.map((edge) => nodes.find((item) => item.id === edge.target)?.data?.label || edge.target).join(', ')}` : ' · end'}</p>
            </div>
          );
        })}
        {!nodes.length && <p className="py-8 text-center text-xs text-slate-600">Add nodes to preview the workflow.</p>}
      </div>
    </aside>
  );
}
