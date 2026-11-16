import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Eye, EyeOff, Activity } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function Login() {
  const router = useRouter();
  const { login, isLoading, error } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(form);
    if (result.success) {
      router.replace('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-console-bg flex items-center justify-center px-4">
      {/* Background orb */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute top-[-30%] left-[50%] translate-x-[-50%] w-[800px] h-[800px] rounded-full opacity-5"
          style={{ background: 'radial-gradient(circle, #6366f1, transparent)' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-4 glow-brand"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Activity size={22} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Sign in to Agentflow</h1>
          <p className="text-slate-500 text-sm mt-1">AI Operations Console</p>
        </div>

        <div className="glass-panel rounded-2xl p-8">
          {error && (
            <div className="mb-5 px-4 py-3 rounded-lg text-sm text-red-300 border border-red-500/30"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Email Address</label>
              <input
                id="login-email"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full bg-slate-800/60 border border-slate-700/60 text-white text-sm rounded-xl px-4 py-3
                  focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-600"
                placeholder="operator@company.com"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs font-medium block mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full bg-slate-800/60 border border-slate-700/60 text-white text-sm rounded-xl px-4 py-3 pr-12
                    focus:outline-none focus:border-brand-500 transition-colors placeholder-slate-600"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit"
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating…
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-6">
            No account yet?{' '}
            <Link href="/register" className="text-brand-400 hover:text-brand-300 transition-colors font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
