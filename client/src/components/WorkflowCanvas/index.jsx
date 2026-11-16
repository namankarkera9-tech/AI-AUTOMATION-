import { useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import AgentflowNode from './AgentflowNode';
import useWorkflowStore from '../../store/workflowStore';

const nodeTypes = { custom: AgentflowNode };

export default function WorkflowCanvas({ readOnly = false }) {
  const { nodes, edges, setNodes, setEdges, setSelectedNode } = useWorkflowStore();

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(nodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(edges);

  // Sync local React Flow state up to the Zustand store
  const handleNodesChange = useCallback(
    (changes) => {
      onNodesChange(changes);
      setRfNodes((nds) => {
        setNodes(nds);
        return nds;
      });
    },
    [onNodesChange, setNodes, setRfNodes]
  );

  const handleEdgesChange = useCallback(
    (changes) => {
      onEdgesChange(changes);
      setRfEdges((eds) => {
        setEdges(eds);
        return eds;
      });
    },
    [onEdgesChange, setEdges, setRfEdges]
  );

  const onConnect = useCallback(
    (params) => {
      const newEdge = {
        ...params,
        animated: true,
        id: `e_${params.source}_${params.sourceHandle || 'source'}_${params.target}_${params.targetHandle || 'target'}`,
      };
      setRfEdges((eds) => {
        const updated = addEdge(newEdge, eds);
        setEdges(updated);
        return updated;
      });
    },
    [setRfEdges, setEdges]
  );

  const onNodeClick = useCallback(
    (_, node) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, [setSelectedNode]);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const nodeDataStr = event.dataTransfer.getData('application/agentflow-node');
      if (!nodeDataStr) return;
      const catalogNode = JSON.parse(nodeDataStr);

      const position = { x: event.clientX - 250, y: event.clientY - 100 };
      const newNode = {
        id: `node_${Date.now()}`,
        type: 'custom',
        position,
        data: {
          label: catalogNode.label,
          nodeType: catalogNode.nodeType,
          category: catalogNode.category,
          config: { ...catalogNode.defaultConfig },
        },
      };

      setRfNodes((nds) => {
        const updated = [...nds, newNode];
        setNodes(updated);
        return updated;
      });
    },
    [setRfNodes, setNodes]
  );

  // Sync store edits (including node config/position changes) into React Flow.
  useEffect(() => {
    setRfNodes(nodes);
    setRfEdges(edges);
  }, [nodes, edges, setRfNodes, setRfEdges]);

  return (
    <div style={{ width: '100%', height: '100%', background: '#080c14' }}>
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={readOnly ? undefined : handleNodesChange}
        onEdgesChange={readOnly ? undefined : handleEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={readOnly ? undefined : onDragOver}
        onDrop={readOnly ? undefined : onDrop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{ animated: true, style: { stroke: '#6366f1', strokeWidth: 2 } }}
        style={{ background: 'transparent' }}
      >
        <Background color="#1e293b" gap={20} size={1} />
        <Controls
          style={{
            background: 'rgba(17,24,39,0.95)',
            border: '1px solid rgba(51,65,85,0.5)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor={(n) => {
            const catColors = { trigger: '#8b5cf6', action: '#10b981', ai: '#6366f1', logic: '#ef4444' };
            return catColors[n.data?.category] || '#6366f1';
          }}
          style={{
            background: 'rgba(11,15,25,0.9)',
            border: '1px solid rgba(51,65,85,0.4)',
            borderRadius: 8,
          }}
        />
        {nodes.length === 0 && (
          <Panel position="top-center">
            <div className="mt-20 text-center">
              <p className="text-slate-600 text-sm">
                Drag nodes from the palette or use AI generation to build your workflow
              </p>
            </div>
          </Panel>
        )}
      </ReactFlow>
    </div>
  );
}
