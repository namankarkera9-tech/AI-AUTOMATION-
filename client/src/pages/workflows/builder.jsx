import { useState } from 'react';
import { useRouter } from 'next/router';
import { AlertTriangle } from 'lucide-react';
import AppShell from '../../components/AppShell';
import ProtectedRoute from '../../components/ProtectedRoute';
import WorkflowCanvas from '../../components/WorkflowCanvas';
import NodePalette from '../../components/NodePalette';
import NodeConfigPanel from '../../components/NodeConfigPanel';
import PromptInputPanel from '../../components/PromptInputPanel';
import GraphPreviewPanel from '../../components/GraphPreviewPanel';
import WorkflowToolbar from '../../components/WorkflowToolbar';
import useWorkflowStore from '../../store/workflowStore';
import { workflowAPI } from '../../lib/api';

export default function WorkflowBuilder() {
  const router = useRouter();
  const {
    currentWorkflow, isGenerating, isSaving, nodes, edges, error,
    generateWorkflow, saveWorkflow, executeWorkflow, clearWorkflow,
    createBlankWorkflow, setWorkflowName,
  } = useWorkflowStore();
  const [prompt, setPrompt] = useState('');
  const [promptOpen, setPromptOpen] = useState(true);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setPromptOpen(false);
    try {
      const workflow = await generateWorkflow(prompt.trim());
      setStatusMsg(`✓ AI generated "${workflow.name}" with ${workflow.nodes?.length || 0} nodes`);
    } catch (err) {
      setStatusMsg(`Error: ${err.message}`);
    }
  };

  const handleSave = async () => {
    try {
      const workflow = await saveWorkflow();
      setStatusMsg(`✓ Saved "${workflow?.name || 'Workflow'}"`);
    } catch (err) {
      setStatusMsg(`Save error: ${err.message}`);
    }
  };

  const handleExecute = async () => {
    if (!currentWorkflow) return;
    try {
      const saved = await saveWorkflow();
      const id = saved?._id || saved?.id || currentWorkflow._id || currentWorkflow.id;
      if (!id) throw new Error('Save the workflow before executing it.');
      await executeWorkflow(id);
      setStatusMsg('▶ Execution queued — opening timeline…');
      router.push('/executions');
    } catch (err) {
      setStatusMsg(`Execution error: ${err.message}`);
    }
  };

  const handleValidate = async () => {
    try {
      const saved = await saveWorkflow();
      const id = saved?._id || saved?.id;
      if (!id) throw new Error('Save the workflow before validating it.');
      const { data } = await workflowAPI.validate(id);
      const result = data.data.validation;
      setStatusMsg(result.valid ? '✓ Workflow graph is valid' : `Validation: ${result.errors.join(' ')}`);
    } catch (err) {
      setStatusMsg(`Validation error: ${err.message}`);
    }
  };

  const handleClear = () => {
    clearWorkflow();
    setPrompt('');
    setPromptOpen(true);
    setStatusMsg('');
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="flex h-[calc(100vh-3.5rem)] flex-col">
          <WorkflowToolbar
            workflow={currentWorkflow}
            nodeCount={nodes.length}
            isSaving={isSaving}
            isGenerating={isGenerating}
            onNameChange={setWorkflowName}
            onNew={() => { createBlankWorkflow(); setStatusMsg('Blank workflow ready — add nodes from the palette.'); }}
            onPrompt={() => setPromptOpen((open) => !open)}
            onValidate={handleValidate}
            onSave={handleSave}
            onExecute={handleExecute}
            onClear={handleClear}
            previewOpen={previewOpen}
            onPreview={() => setPreviewOpen((open) => !open)}
          />
          {statusMsg && <p role="status" className="truncate border-b border-slate-800 bg-slate-950/60 px-4 py-1.5 text-xs text-slate-400">{statusMsg}</p>}
          {promptOpen && <PromptInputPanel value={prompt} onChange={setPrompt} onGenerate={handleGenerate} isGenerating={isGenerating} />}

          <div className="flex flex-1 overflow-hidden">
            <div className="hidden w-48 flex-shrink-0 lg:block"><NodePalette /></div>
            <div className="relative flex-1">
              {isGenerating && <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"><div className="glass-panel rounded-2xl px-8 py-6 text-center"><div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" /><p className="text-sm font-medium text-white">AI Generating Workflow…</p><p className="mt-1 text-xs text-slate-500">Calling workflow generator</p></div></div>}
              {error && <div role="alert" className="absolute left-4 right-4 top-4 z-10 flex items-center gap-2 rounded-xl border border-red-500/30 px-4 py-3 text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.1)' }}><AlertTriangle size={14} />{error}</div>}
              <WorkflowCanvas />
            </div>
            <div className="hidden w-56 flex-shrink-0 lg:block">{previewOpen ? <GraphPreviewPanel nodes={nodes} edges={edges} onClose={() => setPreviewOpen(false)} /> : <NodeConfigPanel />}</div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
