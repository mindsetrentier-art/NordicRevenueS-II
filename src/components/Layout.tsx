import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemePicker } from './ThemePicker';
import { 
  LayoutDashboard, 
  Store, 
  Receipt, 
  BarChart3, 
  Settings, 
  Bell,
  LogOut,
  MessageSquare
} from 'lucide-react';
import clsx from 'clsx';
import { Logo } from './Logo';

import { MusicPlayer } from './MusicPlayer';
import { WeatherWidget } from './WeatherWidget';
import { ProverbWidget } from './ProverbWidget';
import { HistoricalBar } from './HistoricalBar';
import { QuizSidebar } from './QuizSidebar';
import { NewsTicker } from './NewsTicker';

export function Layout() {
  const { userProfile, logout } = useAuth();
  const { themeColor } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') },
    { to: '/entry', icon: Receipt, label: t('nav.entry') },
    { to: '/reports', icon: BarChart3, label: t('nav.reports') },
    { to: '/establishments', icon: Store, label: t('nav.establishments') },
    { to: '/alerts', icon: Bell, label: t('nav.alerts') },
    { to: '/reviews', icon: MessageSquare, label: t('nav.reviews') },
    { to: '/settings', icon: Settings, label: t('nav.settings') },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 transition-colors duration-500">
      <NewsTicker />
      
      <div 
        className="flex-1 flex flex-col lg:flex-row bg-slate-50 relative"
        style={{
          boxShadow: `inset 0 0 0 4px var(--theme-color), inset 0 0 20px 4px var(--theme-color-light)`
        }}
      >
        <MusicPlayer />
        <WeatherWidget />
        <ProverbWidget />
        <HistoricalBar />
        <QuizSidebar />
        
        {/* Mobile Header */}
      <header className="lg:hidden bg-white/95 backdrop-blur-md border-b border-slate-200 p-3 sm:p-4 flex items-center justify-between sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3">
          <Logo className="w-8 h-8 rounded-lg shadow-sm shrink-0" />
          <h1 className="font-bold text-base sm:text-lg tracking-tight truncate max-w-[140px] sm:max-w-none">NordicRevenueS</h1>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <ThemePicker />
          <button 
            onClick={handleLogout} 
            className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Déconnexion"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* Sidebar (Desktop only) */}
      <aside className={clsx(
        "hidden lg:flex flex-col w-64 bg-white border-r border-slate-200 sticky top-0 h-screen z-30",
      )}>
        <div className="p-6 flex items-center gap-3">
          <Logo className="w-8 h-8 rounded-lg shadow-sm" />
          <h1 className="font-bold text-xl tracking-tight text-slate-900">NordicRevenueS</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => clsx(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors",
                isActive 
                  ? "bg-blue-50 text-blue-700" 
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <item.icon size={20} />
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center justify-between px-2 mb-4">
            <ThemePicker direction="up" />
          </div>
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold uppercase">
              {userProfile?.displayName?.charAt(0) || userProfile?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">
                {userProfile?.displayName || 'Utilisateur'}
              </p>
              <p className="text-xs text-slate-500 truncate">
                {userProfile?.role === 'admin' ? 'Administrateur' : 'Manager'}
              </p>
            </div>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl font-medium text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut size={20} />
            {t('nav.logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Bottom Navigation (Mobile only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-transparent px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] z-50 flex items-center overflow-x-auto flex-nowrap gap-2 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-slate-300/80 [&::-webkit-scrollbar-thumb]:rounded-full">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              "flex flex-col items-center gap-1.5 p-2 rounded-xl transition-all shrink-0 min-w-[4.5rem]",
              isActive 
                ? "text-blue-600" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon size={22} className={clsx("transition-transform", "active:scale-90", isActive && "stroke-[2.5px]")} />
                <span className="text-[10px] font-semibold truncate w-full text-center">{item.label.split(' ')[0]}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  </div>
  );
}
