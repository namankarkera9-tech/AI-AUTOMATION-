import { memo, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { getNodeByType } from '../../lib/nodeCatalog';

const CATEGORY_COLORS = {
  trigger: { border: '#8b5cf6', bg: 'rgba(139,92,246,0.08)', badge: 'rgba(139,92,246,0.2)', text: '#c4b5fd' },
  action: { border: '#10b981', bg: 'rgba(16,185,129,0.08)', badge: 'rgba(16,185,129,0.2)', text: '#6ee7b7' },
  ai: { border: '#6366f1', bg: 'rgba(99,102,241,0.08)', badge: 'rgba(99,102,241,0.2)', text: '#a5b4fc' },
  logic: { border: '#ef4444', bg: 'rgba(239,68,68,0.08)', badge: 'rgba(239,68,68,0.2)', text: '#fca5a5' },
};

const AgentflowNode = memo(({ data, selected }) => {
  const catalog = getNodeByType(data.nodeType) || {};
  const theme = CATEGORY_COLORS[data.category] || CATEGORY_COLORS.action;

  return (
    <div
      style={{
        position: 'relative',
        minWidth: 180,
        maxWidth: 220,
        background: selected ? 'rgba(17,24,39,0.98)' : 'rgba(17,24,39,0.9)',
        border: `1.5px solid ${selected ? theme.border : 'rgba(51,65,85,0.6)'}`,
        borderRadius: 10,
        boxShadow: selected ? `0 0 20px -4px ${theme.border}40` : '0 4px 20px rgba(0,0,0,0.4)',
        transition: 'all 0.2s ease',
      }}
    >
      {/* Input Handle — all non-trigger nodes accept connections from above */}
      {data.category !== 'trigger' && (
        <Handle
          type="target"
          position={Position.Top}
          id="target"
          style={{ background: theme.border, border: `2px solid rgba(11,15,25,0.9)` }}
        />
      )}

      <div className="p-3">
        {/* Category badge */}
        <div className="flex items-center gap-2 mb-2">
          <span
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
            style={{ background: theme.badge, color: theme.text }}
          >
            {data.category || 'action'}
          </span>
          {data.nodeType === 'trigger' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </div>

        {/* Icon + Label */}
        <div className="flex items-center gap-2">
          <span className="text-lg">{catalog.icon || '⚙'}</span>
          <p className="text-white text-xs font-semibold leading-tight truncate">{data.label}</p>
        </div>

        {/* Config preview */}
        {data.config && Object.keys(data.config).length > 0 && (
          <div className="mt-2 pt-2 border-t border-slate-700/50">
            {Object.entries(data.config)
              .slice(0, 2)
              .map(([k, v]) => (
                <p key={k} className="text-slate-500 text-[10px] truncate">
                  <span className="text-slate-600">{k}:</span> {String(v).slice(0, 20)}
                </p>
              ))}
          </div>
        )}
      </div>

      {data.nodeType === 'condition' ? (
        <>
          <span className="absolute -bottom-4 left-[28%] text-[9px] text-emerald-400">true</span>
          <span className="absolute -bottom-4 right-[28%] text-[9px] text-rose-400">false</span>
          <Handle type="source" position={Position.Bottom} id="true" style={{ left: '30%', background: '#10b981', border: '2px solid rgba(11,15,25,0.9)' }} />
          <Handle type="source" position={Position.Bottom} id="false" style={{ left: '70%', background: '#ef4444', border: '2px solid rgba(11,15,25,0.9)' }} />
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          id="source"
          style={{ background: theme.border, border: `2px solid rgba(11,15,25,0.9)` }}
        />
      )}
    </div>
  );
});

AgentflowNode.displayName = 'AgentflowNode';
export default AgentflowNode;
