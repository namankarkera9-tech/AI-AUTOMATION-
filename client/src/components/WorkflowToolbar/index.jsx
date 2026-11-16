import { Play, Plus, Save, ShieldCheck, Sparkles, Wand2, X } from 'lucide-react';

export default function WorkflowToolbar({
  workflow, nodeCount, isSaving, isGenerating, onNameChange, onNew, onPrompt, onValidate, onSave, onExecute, onClear, previewOpen, onPreview,
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-console-bg px-4 py-2.5">
      <Wand2 size={14} className="text-brand-400" />
      {workflow ? <input aria-label="Workflow name" value={workflow.name || ''} onChange={(event) => onNameChange(event.target.value)} className="min-w-32 flex-1 bg-transparent text-sm font-medium text-white outline-none" /> : <span className="flex-1 text-sm font-medium text-white">AI Workflow Builder</span>}
      {workflow && <span className="mr-auto text-xs text-slate-500">{nodeCount} nodes</span>}
      <button onClick={onNew} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-brand-500 hover:text-brand-300"><Plus size={12} /> New blank</button>
      <button onClick={onPrompt} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-brand-500 hover:text-brand-300"><Sparkles size={12} /> AI Prompt</button>
      <button onClick={onPreview} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-indigo-500">{previewOpen ? 'Hide preview' : 'Graph preview'}</button>
      {workflow && <>
        <button onClick={onValidate} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500"><ShieldCheck size={12} /> Validate</button>
        <button onClick={onSave} disabled={isSaving} className="flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-emerald-500"><Save size={12} /> {isSaving ? 'Saving…' : 'Save'}</button>
        <button onClick={onExecute} disabled={isGenerating} className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"><Play size={12} /> Execute</button>
        <button onClick={onClear} aria-label="Clear workflow" className="rounded-lg border border-slate-800 px-3 py-1.5 text-slate-500 hover:border-red-500/40 hover:text-red-400"><X size={12} /></button>
      </>}
    </div>
  );
}
