import { useEffect } from 'react';
import { useRouter } from 'next/router';
import useAuthStore from '../../store/authStore';

export default function ProtectedRoute({ children }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-console-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Authenticating session…</p>
        </div>
      </div>
    );
  }

  return children;
}
