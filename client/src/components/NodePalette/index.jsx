import { NODE_CATALOG, CATEGORY_META, getNodesByCategory } from '../../lib/nodeCatalog';

const categories = ['trigger', 'action', 'ai', 'logic'];

function NodeCard({ node }) {
  const onDragStart = (event) => {
    event.dataTransfer.setData('application/agentflow-node', JSON.stringify(node));
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-grab active:cursor-grabbing
        hover:bg-slate-800/70 border border-transparent hover:border-slate-700/50 transition-all group"
    >
      <span className="text-base w-5 text-center">{node.icon}</span>
      <div className="min-w-0">
        <p className="text-white text-xs font-medium truncate">{node.label}</p>
        <p className="text-slate-500 text-[10px] truncate">{node.description}</p>
      </div>
    </div>
  );
}

export default function NodePalette() {
  return (
    <div
      className="h-full flex flex-col overflow-hidden"
      style={{ background: 'rgba(11,15,25,0.97)', borderRight: '1px solid rgba(51,65,85,0.5)' }}
    >
      <div className="px-4 py-3 border-b border-slate-800">
        <p className="text-white text-xs font-semibold">Node Palette</p>
        <p className="text-slate-500 text-[10px] mt-0.5">Drag to canvas</p>
      </div>

      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat];
          const nodes = getNodesByCategory(cat);
          return (
            <div key={cat}>
              <div className="flex items-center gap-2 px-2 mb-1">
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: meta.color }}
                />
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: meta.color }}>
                  {meta.label}
                </p>
              </div>
              <div className="space-y-0.5">
                {nodes.map((node) => (
                  <NodeCard key={node.id} node={node} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
