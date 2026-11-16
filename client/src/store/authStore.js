import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI } from '../lib/api';
import { disconnectSocket } from '../lib/socket';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async ({ email, password }) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.login({ email, password });
          const { token, user } = data.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('agentflow_token', token);
            localStorage.setItem('agentflow_user', JSON.stringify(user));
          }
          set({ user, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.error?.message || 'Login failed';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      register: async ({ name, email, password }) => {
        set({ isLoading: true, error: null });
        try {
          const { data } = await authAPI.register({ name, email, password });
          const { token, user } = data.data;
          if (typeof window !== 'undefined') {
            localStorage.setItem('agentflow_token', token);
            localStorage.setItem('agentflow_user', JSON.stringify(user));
          }
          set({ user, token, isAuthenticated: true, isLoading: false });
          return { success: true };
        } catch (err) {
          const msg = err.response?.data?.error?.message || 'Registration failed';
          set({ isLoading: false, error: msg });
          return { success: false, error: msg };
        }
      },

      logout: () => {
        disconnectSocket();
        if (typeof window !== 'undefined') {
          localStorage.removeItem('agentflow_token');
          localStorage.removeItem('agentflow_user');
        }
        set({ user: null, token: null, isAuthenticated: false, error: null });
      },

      refreshMe: async () => {
        try {
          const { data } = await authAPI.me();
          set({ user: data.data.user, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },

      updateProfile: async (profile) => {
        const { data } = await authAPI.updateMe(profile);
        set({ user: data.data.user });
        return data.data.user;
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'agentflow-auth',
      partialize: (s) => ({ user: s.user, token: s.token, isAuthenticated: s.isAuthenticated }),
    }
  )
);

export default useAuthStore;
