import { RefreshCw, Sparkles } from 'lucide-react';

export default function PromptInputPanel({ value, onChange, onGenerate, isGenerating }) {
  return (
    <section className="border-b border-slate-800/80 px-4 py-4" style={{ background: 'rgba(99,102,241,0.04)' }}>
      <p className="mb-2 flex items-center gap-1.5 text-xs text-slate-400">
        <Sparkles size={11} className="text-brand-400" /> Describe your automation in plain English and generate an editable workflow graph.
      </p>
      <div className="flex gap-3">
        <textarea
          id="builder-prompt-input"
          rows={2}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Enter' && event.metaKey) onGenerate(); }}
          placeholder="e.g. When an invoice email arrives in Gmail, extract the amount with AI, log it to Google Sheets, and notify the finance Slack channel"
          className="flex-1 resize-none rounded-xl border border-slate-700/60 bg-slate-800/60 px-4 py-2.5 text-sm text-white transition-colors placeholder-slate-600 focus:border-brand-500 focus:outline-none"
        />
        <button
          id="builder-generate"
          onClick={onGenerate}
          disabled={isGenerating || !value.trim()}
          className="flex flex-shrink-0 items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
        >
          {isGenerating ? <><RefreshCw size={14} className="animate-spin" /> Generating…</> : <><Sparkles size={14} /> Generate</>}
        </button>
      </div>
      <p className="mt-1.5 text-[10px] text-slate-600">Press ⌘+Enter to generate</p>
    </section>
  );
}
