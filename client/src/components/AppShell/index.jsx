import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  LayoutDashboard, GitBranch, Play, Puzzle, Settings,
  Bell, LogOut, Menu, X, ChevronRight, Zap, Activity
} from 'lucide-react';
import useAuthStore from '../../store/authStore';
import { notificationAPI } from '../../lib/api';
import { getSocket, joinUserRoom } from '../../lib/socket';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/workflows/builder', label: 'AI Builder', icon: Zap },
  { href: '/workflows', label: 'Workflows', icon: GitBranch },
  { href: '/executions', label: 'Executions', icon: Play },
  { href: '/integrations', label: 'Integrations', icon: Puzzle },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function AppShell({ children }) {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const notifRef = useRef(null);

  useEffect(() => {
    loadNotifications();
    if (user?.id) {
      const socket = getSocket();
      joinUserRoom(user.id);
      socket.on('notification:new', (notif) => {
        setNotifications((prev) => [notif, ...prev.slice(0, 29)]);
        setUnreadCount((c) => c + 1);
      });
      return () => socket.off('notification:new');
    }
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadNotifications = async () => {
    try {
      const { data } = await notificationAPI.list();
      const notifs = data.data.notifications || [];
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.isRead).length);
    } catch {}
  };

  const handleMarkRead = async (notification) => {
    if (notification.isRead) return;
    try {
      await notificationAPI.markRead(notification._id || notification.id);
      setNotifications((items) => items.map((item) =>
        (item._id || item.id) === (notification._id || notification.id) ? { ...item, isRead: true } : item
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch {}
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const isActive = (href) =>
    router.pathname === href || router.pathname.startsWith(href + '/');

  const notifTypeColor = {
    success: '#10b981', error: '#ef4444', escalation: '#f59e0b',
    warning: '#f59e0b', info: '#6366f1',
  };

  return (
    <div className="flex h-screen bg-console-bg overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative z-30 h-full w-64 flex-shrink-0 flex flex-col transition-transform duration-300
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ background: 'rgba(11,15,25,0.98)', borderRight: '1px solid rgba(51,65,85,0.6)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center glow-brand"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
            <Activity size={16} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-none">Agentflow AI</p>
            <p className="text-slate-500 text-[10px] mt-0.5">v1.0 · Operations Console</p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer group
                  ${isActive(href)
                    ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
              >
                <Icon size={16} className={isActive(href) ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300'} />
                {label}
                {isActive(href) && <ChevronRight size={12} className="ml-auto text-brand-500" />}
              </div>
            </Link>
          ))}
        </nav>

        {/* User Footer */}
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-slate-800/40">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-medium truncate">{user?.name || 'Operator'}</p>
              <p className="text-slate-500 text-[10px] truncate capitalize">{user?.role || 'operator'}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-slate-500 hover:text-red-400 transition-colors"
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-14 flex items-center justify-between px-4 lg:px-6 border-b border-slate-800 bg-console-bg/80 backdrop-blur-sm flex-shrink-0">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>

          <div className="hidden lg:flex items-center gap-2">
            <span className="text-slate-600 text-sm">
              {NAV_ITEMS.find((n) => isActive(n.href))?.label || 'Console'}
            </span>
          </div>

          {/* Notification bell */}
          <div className="relative ml-auto" ref={notifRef}>
            <button
              id="notification-bell"
              onClick={() => setNotifOpen(!notifOpen)}
              className="relative text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800"
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 top-11 w-80 glass-panel rounded-xl overflow-hidden z-50 shadow-2xl">
                <div className="px-4 py-3 border-b border-slate-700/60 flex items-center justify-between">
                  <p className="text-white text-sm font-semibold">Notifications</p>
                  <span className="text-slate-500 text-xs">{unreadCount} unread</span>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-slate-500 text-sm">
                      No notifications yet
                    </div>
                  ) : (
                    notifications.slice(0, 15).map((notif, i) => (
                      <div
                        key={notif._id || notif.id || i}
                        onClick={() => handleMarkRead(notif)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => { if (event.key === 'Enter') handleMarkRead(notif); }}
                        className={`px-4 py-3 border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors
                          ${!notif.isRead ? 'bg-brand-950/30' : ''}`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
                            style={{ backgroundColor: notifTypeColor[notif.type] || '#6366f1' }}
                          />
                          <div className="min-w-0">
                            <p className="text-white text-xs font-medium truncate">{notif.title}</p>
                            <p className="text-slate-400 text-[11px] mt-0.5 leading-snug line-clamp-2">{notif.message}</p>
                            <p className="text-slate-600 text-[10px] mt-1">
                              {notif.createdAt ? new Date(notif.createdAt).toLocaleTimeString() : ''}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
