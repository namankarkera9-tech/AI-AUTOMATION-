import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import useWorkflowStore from '../../store/workflowStore';
import { getNodeByType, CATEGORY_META } from '../../lib/nodeCatalog';

const CONFIG_FIELDS = {
  trigger: [{ key: 'triggerType', label: 'Trigger Type', type: 'select', options: ['manual', 'webhook', 'schedule', 'event'] },
             { key: 'interval', label: 'Interval (schedule)', type: 'text', placeholder: '60m' },
             { key: 'endpoint', label: 'Endpoint (webhook)', type: 'text', placeholder: '/webhook/path' }],
  gmail_send: [{ key: 'to', label: 'To (Email)', type: 'text', placeholder: 'user@example.com' },
               { key: 'subject', label: 'Subject', type: 'text' },
               { key: 'body', label: 'Body', type: 'textarea' }],
  gmail_read: [{ key: 'query', label: 'Gmail Query', type: 'text', placeholder: 'is:unread' },
               { key: 'maxResults', label: 'Max Results', type: 'number' }],
  slack_post: [{ key: 'channel', label: 'Channel', type: 'text', placeholder: '#ops-general' },
               { key: 'message', label: 'Message', type: 'textarea' }],
  discord_post: [{ key: 'channelId', label: 'Channel ID', type: 'text', placeholder: 'ops-channel' },
                 { key: 'content', label: 'Message Content', type: 'textarea' }],
  sheets_append: [{ key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
                  { key: 'range', label: 'Range', type: 'text', placeholder: 'Sheet1!A:Z' },
                  { key: 'values', label: 'Row values (JSON)', type: 'textarea', placeholder: '["{{email}}", "{{subject}}"]' }],
  sheets_read: [{ key: 'spreadsheetId', label: 'Spreadsheet ID', type: 'text' },
                { key: 'range', label: 'Range', type: 'text', placeholder: 'Sheet1!A1:D10' }],
  ai_summarize: [{ key: 'model', label: 'Model', type: 'select', options: ['gemini-1.5-pro', 'claude-3.5-sonnet', 'gpt-4o'] },
                 { key: 'prompt', label: 'Prompt', type: 'textarea' }],
  ai_classify: [{ key: 'model', label: 'Model', type: 'select', options: ['gemini-1.5-pro', 'claude-3.5-sonnet', 'gpt-4o'] },
                { key: 'prompt', label: 'Prompt', type: 'textarea' }],
  condition: [{ key: 'field', label: 'Field to Check', type: 'text', placeholder: 'status' },
              { key: 'value', label: 'Expected Value', type: 'text', placeholder: 'SUCCESS' }],
};

export default function NodeConfigPanel() {
  const { getSelectedNode, updateNodeConfig, updateNodeLabel, setSelectedNode } = useWorkflowStore();
  const selectedNode = getSelectedNode();
  const selectedNodeId = selectedNode?.id;
  const selectedNodeLabel = selectedNode?.data?.label;
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (selectedNodeId) {
      setLabel(selectedNodeLabel || '');
    }
  }, [selectedNodeId, selectedNodeLabel]);

  if (!selectedNode) {
    return (
      <div
        className="h-full flex flex-col items-center justify-center px-4"
        style={{ background: 'rgba(11,15,25,0.97)', borderLeft: '1px solid rgba(51,65,85,0.5)' }}
      >
        <div className="text-center">
          <div className="w-10 h-10 rounded-xl bg-slate-800/60 flex items-center justify-center mx-auto mb-3">
            <span className="text-slate-600 text-lg">⚙</span>
          </div>
          <p className="text-slate-500 text-xs">Select a node to configure it</p>
        </div>
      </div>
    );
  }

  const nodeType = selectedNode.data?.nodeType;
  const catalogNode = getNodeByType(nodeType);
  const catMeta = CATEGORY_META[selectedNode.data?.category] || {};
  const fields = CONFIG_FIELDS[nodeType] || [];
  const config = selectedNode.data?.config || {};

  const handleConfigChange = (key, value) => {
    updateNodeConfig(selectedNode.id, { [key]: value });
  };

  const handleLabelBlur = () => {
    updateNodeLabel(selectedNode.id, label);
  };

  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'rgba(11,15,25,0.97)', borderLeft: '1px solid rgba(51,65,85,0.5)' }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <p className="text-white text-xs font-semibold">Node Config</p>
          <p className="text-[10px] mt-0.5" style={{ color: catMeta.color || '#6366f1' }}>
            {catalogNode?.label || nodeType}
          </p>
        </div>
        <button
          onClick={() => setSelectedNode(null)}
          className="text-slate-500 hover:text-white transition-colors"
        >
          <X size={14} />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Label field (always present) */}
        <div>
          <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1.5">
            Node Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={handleLabelBlur}
            className="w-full bg-slate-800/60 border border-slate-700/60 text-white text-xs rounded-lg px-3 py-2
              focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Dynamic config fields */}
        {fields.map((field) => (
          <div key={field.key}>
            <label className="text-slate-400 text-[10px] uppercase tracking-wider font-medium block mb-1.5">
              {field.label}
            </label>
            {field.type === 'textarea' ? (
              <textarea
                rows={3}
                value={field.key === 'values' && Array.isArray(config[field.key]) ? JSON.stringify(config[field.key]) : config[field.key] || ''}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-slate-800/60 border border-slate-700/60 text-white text-xs rounded-lg px-3 py-2
                  focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            ) : field.type === 'select' ? (
              <select
                value={config[field.key] || (field.options && field.options[0]) || ''}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/60 text-white text-xs rounded-lg px-3 py-2
                  focus:outline-none focus:border-brand-500 transition-colors"
              >
                {(field.options || []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : (
              <input
                type={field.type || 'text'}
                value={config[field.key] || ''}
                onChange={(e) => handleConfigChange(field.key, e.target.value)}
                placeholder={field.placeholder}
                className="w-full bg-slate-800/60 border border-slate-700/60 text-white text-xs rounded-lg px-3 py-2
                  focus:outline-none focus:border-brand-500 transition-colors"
              />
            )}
          </div>
        ))}

        {/* Node ID readonly */}
        <div className="pt-2 border-t border-slate-800">
          <p className="text-slate-600 text-[10px]">Node ID: <span className="text-slate-500">{selectedNode.id}</span></p>
        </div>
      </div>
    </div>
  );
}
