export default function MetricGrid({ metrics = {}, isLoading = false }) {
  const cards = [
    {
      label: 'Total Workflows',
      value: metrics.totalWorkflows ?? 0,
      sub: `${metrics.activeWorkflows ?? 0} active`,
      color: '#6366f1',
      bg: 'rgba(99,102,241,0.12)',
      icon: '⬡',
    },
    {
      label: 'Total Executions',
      value: metrics.totalExecutions ?? 0,
      sub: `${metrics.runningExecutions ?? 0} running`,
      color: '#10b981',
      bg: 'rgba(16,185,129,0.12)',
      icon: '▶',
    },
    {
      label: 'Success Rate',
      value: `${metrics.successRate ?? 100}%`,
      sub: `${metrics.completedExecutions ?? 0} completed`,
      color: '#34d399',
      bg: 'rgba(52,211,153,0.12)',
      icon: '✓',
    },
    {
      label: 'Failed Runs',
      value: metrics.failedExecutions ?? 0,
      sub: 'Require attention',
      color: '#f87171',
      bg: 'rgba(248,113,113,0.12)',
      icon: '✕',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl p-5 animate-pulse" style={{ background: 'rgba(17,24,39,0.8)', border: '1px solid rgba(51,65,85,0.4)' }}>
            <div className="h-3 bg-slate-700 rounded w-2/3 mb-4" />
            <div className="h-7 bg-slate-700 rounded w-1/3 mb-2" />
            <div className="h-2 bg-slate-800 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-xl p-5 transition-all duration-200 hover:scale-[1.02]"
          style={{
            background: 'rgba(17,24,39,0.8)',
            border: '1px solid rgba(51,65,85,0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">{card.label}</p>
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: card.bg, color: card.color }}
            >
              {card.icon}
            </div>
          </div>
          <p className="text-white text-2xl font-bold mb-1">{card.value}</p>
          <p className="text-slate-500 text-xs">{card.sub}</p>
          <div className="mt-3 h-0.5 rounded-full" style={{ background: card.bg }}>
            <div className="h-full rounded-full" style={{ background: card.color, width: '60%' }} />
          </div>
        </div>
      ))}
    </div>
  );
}
