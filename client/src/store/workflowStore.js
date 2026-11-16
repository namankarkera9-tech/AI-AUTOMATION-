import { create } from 'zustand';
import { workflowAPI } from '../lib/api';

const useWorkflowStore = create((set, get) => ({
  workflows: [],
  currentWorkflow: null,
  nodes: [],
  edges: [],
  selectedNodeId: null,
  isGenerating: false,
  isSaving: false,
  error: null,

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (nodeId) => set({ selectedNodeId: nodeId }),
  setWorkflowName: (name) => set((state) => ({
    currentWorkflow: state.currentWorkflow ? { ...state.currentWorkflow, name } : state.currentWorkflow,
  })),

  getSelectedNode: () => {
    const { nodes, selectedNodeId } = get();
    return nodes.find((n) => n.id === selectedNodeId) || null;
  },

  updateNodeConfig: (nodeId, config) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, config: { ...n.data.config, ...config } } } : n
      ),
    }));
  },

  updateNodeLabel: (nodeId, label) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, label } } : n
      ),
    }));
  },

  loadWorkflow: async (id) => {
    set({ error: null });
    try {
      const { data } = await workflowAPI.get(id);
      const wf = data.data.workflow;
      set({
        currentWorkflow: wf,
        nodes: wf.nodes || [],
        edges: wf.edges || [],
        selectedNodeId: null,
      });
      return wf;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to load workflow';
      set({ error: msg });
      throw new Error(msg);
    }
  },

  saveWorkflow: async () => {
    const { currentWorkflow, nodes, edges } = get();
    if (!currentWorkflow) return;
    set({ isSaving: true, error: null });
    try {
      const payload = {
        nodes,
        edges,
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        tags: currentWorkflow.tags,
        trigger: currentWorkflow.trigger,
      };
      const hasId = currentWorkflow._id || currentWorkflow.id;
      const { data } = hasId
        ? await workflowAPI.update(hasId, payload)
        : await workflowAPI.create(payload);
      set({ currentWorkflow: data.data.workflow, isSaving: false });
      return data.data.workflow;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to save workflow';
      set({ isSaving: false, error: msg });
      throw new Error(msg);
    }
  },

  generateWorkflow: async (prompt) => {
    set({ isGenerating: true, error: null });
    try {
      const { data } = await workflowAPI.generate(prompt);
      const wf = data.data.workflow;
      set({
        currentWorkflow: wf,
        nodes: wf.nodes || [],
        edges: wf.edges || [],
        isGenerating: false,
        selectedNodeId: null,
      });
      return wf;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to generate workflow';
      set({ isGenerating: false, error: msg });
      throw new Error(msg);
    }
  },

  executeWorkflow: async (id) => {
    try {
      const { data } = await workflowAPI.execute(id);
      return data.data.execution;
    } catch (err) {
      const msg = err.response?.data?.error?.message || 'Failed to execute workflow';
      throw new Error(msg);
    }
  },

  clearWorkflow: () => {
    set({ currentWorkflow: null, nodes: [], edges: [], selectedNodeId: null, error: null });
  },

  createBlankWorkflow: () => {
    const workflow = {
      name: 'Untitled Workflow',
      description: '',
      trigger: { type: 'manual', config: {} },
      tags: [],
      nodes: [],
      edges: [],
      version: 1,
    };
    set({ currentWorkflow: workflow, nodes: [], edges: [], selectedNodeId: null, error: null });
    return workflow;
  },

  clearError: () => set({ error: null }),
}));

export default useWorkflowStore;
