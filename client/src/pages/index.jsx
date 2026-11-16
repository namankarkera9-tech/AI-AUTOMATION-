import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../store/authStore';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen bg-console-bg text-white overflow-x-hidden">
      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
        <div className="absolute bottom-[-10%] right-[20%] w-[400px] h-[400px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, #8b5cf6, transparent)' }} />
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <span className="text-white text-sm font-bold">A</span>
          </div>
          <span className="text-white font-bold text-lg">Agentflow AI</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <button className="text-slate-400 hover:text-white text-sm transition-colors px-4 py-2">Sign In</button>
          </Link>
          <Link href="/register">
            <button className="px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Get Started
            </button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8 border"
          style={{ background: 'rgba(99,102,241,0.12)', borderColor: 'rgba(99,102,241,0.3)', color: '#a5b4fc' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Multi-Agent Orchestration Platform · v1.0
        </div>

        <h1 className="text-5xl lg:text-7xl font-black tracking-tight mb-6 leading-tight">
          Describe it.
          <br />
          <span style={{ background: 'linear-gradient(135deg, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Watch it build.
          </span>
          <br />
          Execute at scale.
        </h1>

        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Agentflow AI transforms plain-English descriptions into executable visual workflows.
          A chain of cooperating AI agents plans, executes, validates, and recovers — automatically.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/register">
            <button id="cta-get-started"
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold text-white transition-all hover:scale-105 glow-brand"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Launch the Console →
            </button>
          </Link>
          <Link href="/login">
            <button className="w-full sm:w-auto px-8 py-3.5 rounded-xl text-base font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 transition-all">
              Sign In
            </button>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            {
              icon: '🧠',
              title: 'AI Workflow Generation',
              desc: 'Type a prompt and watch a full executable workflow graph materialize with real nodes and connections.',
              color: '#6366f1',
            },
            {
              icon: '⛓',
              title: 'Multi-Agent Chain',
              desc: 'Planner → Execution → Validation → Recovery → Monitoring. Every step is agentic, observable, and auditable.',
              color: '#10b981',
            },
            {
              icon: '⚡',
              title: 'Real-Time Streaming',
              desc: 'Watch every agent event stream live in the execution timeline. Full Socket.IO powered observability.',
              color: '#f59e0b',
            },
            {
              icon: '🔌',
              title: 'Native Integrations',
              desc: 'Gmail, Slack, Discord, and Google Sheets connected via OAuth. Tokens encrypted at rest with AES-256-GCM.',
              color: '#8b5cf6',
            },
            {
              icon: '🔄',
              title: 'Auto-Recovery Engine',
              desc: 'Intelligent failure classification (AUTH_EXPIRED, RATE_LIMIT, TRANSIENT) with exponential backoff and escalation.',
              color: '#ef4444',
            },
            {
              icon: '📊',
              title: 'Audit Trail',
              desc: 'Every agent event, node output, and execution decision persisted for full compliance and debugging.',
              color: '#06b6d4',
            },
          ].map((f) => (
            <div key={f.title}
              className="rounded-2xl p-6 border border-slate-800/60 hover:border-slate-700 transition-all hover:translate-y-[-2px]"
              style={{ background: 'rgba(17,24,39,0.6)' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl mb-4"
                style={{ background: `${f.color}20` }}>
                {f.icon}
              </div>
              <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-20 text-center">
        <div className="rounded-2xl p-10 border border-slate-800"
          style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.08))' }}>
          <h2 className="text-3xl font-bold text-white mb-4">Ready to automate operations?</h2>
          <p className="text-slate-400 mb-6">Like n8n or Zapier, but with an explicit agentic execution layer on top.</p>
          <Link href="/register">
            <button className="px-8 py-3 rounded-xl font-semibold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              Start Building for Free
            </button>
          </Link>
        </div>
      </section>
    </div>
  );
}
