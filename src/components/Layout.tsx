import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, THEME_COLORS } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { ThemePicker } from './ThemePicker';
import { 
  Gauge, 
  Building2, 
  Map as MapIcon,
  CircleDollarSign, 
  LineChart, 
  SlidersHorizontal, 
  BellRing,
  LogOut,
  Star,
  Plus,
  HelpCircle
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
  const { themeColor, setThemeColor } = useTheme();
  const { t } = useLanguage();
  const navigate = useNavigate();

  // Ambiance color rotation every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const randomColor = THEME_COLORS[Math.floor(Math.random() * THEME_COLORS.length)];
      setThemeColor(randomColor);
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [setThemeColor]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: Gauge, label: t('nav.dashboard'), shortLabel: 'Flash' },
    { to: '/entry', icon: CircleDollarSign, label: t('nav.entry'), shortLabel: 'Caisse' },
    { to: '/reports', icon: LineChart, label: t('nav.reports'), shortLabel: 'Rapports' },
    { to: '/establishments', icon: Building2, label: t('nav.establishments'), shortLabel: 'Sites' },
    { to: '/master-map', icon: MapIcon, label: 'Vue Master', shortLabel: 'Master' },
    { to: '/alerts', icon: BellRing, label: t('nav.alerts'), shortLabel: 'Alertes' },
    { to: '/reviews', icon: Star, label: t('nav.reviews'), shortLabel: 'Avis' },
    { to: '/guide', icon: HelpCircle, label: 'Guide & Aide', shortLabel: 'Guide' },
    { to: '/settings', icon: SlidersHorizontal, label: t('nav.settings'), shortLabel: 'Params' },
  ];

  return (
    <div className="min-h-screen flex flex-col font-sans text-slate-900 transition-colors duration-500">
      <NewsTicker />
      
      <div 
        className="flex-1 flex flex-col lg:flex-row bg-white relative overflow-hidden"
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

        <div className="px-4 mb-4">
          <button
            onClick={() => navigate('/entry')}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={20} />
            Nouvelle Saisie
          </button>
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

      {/* Mobile Floating Action Button */}
      <button
        onClick={() => navigate('/entry')}
        className="lg:hidden fixed bottom-24 right-6 w-14 h-14 bg-blue-600 text-white rounded-full shadow-2xl flex items-center justify-center z-40 active:scale-90 transition-transform"
        aria-label="Nouvelle Saisie"
      >
        <Plus size={28} />
      </button>

      {/* Bottom Navigation (Mobile only) - Optimized for Reach and Clarity */}
      <nav className="lg:hidden fixed bottom-5 left-4 right-4 h-16 bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-1.5 rounded-[2rem] z-50 flex items-center overflow-x-auto no-scrollbar gap-1 shadow-[0_15px_50px_-12px_rgba(0,0,0,0.15)] ring-1 ring-slate-900/5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              "flex flex-col items-center justify-center gap-1 min-w-[4rem] h-full rounded-[1.4rem] transition-all duration-300 relative shrink-0 px-2",
              isActive 
                ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-105 z-10" 
                : "text-slate-400 hover:bg-slate-50"
            )}
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  size={isActive ? 20 : 18} 
                  className={clsx(
                    "transition-all duration-300", 
                    isActive ? "stroke-[3px]" : "stroke-[2.2px]"
                  )} 
                />
                <span className={clsx(
                  "text-[9px] font-black uppercase tracking-[0.05em] truncate w-full text-center px-0.5",
                  isActive ? "text-white" : "text-slate-500"
                )}>
                  {item.shortLabel}
                </span>
                {isActive && (
                  <motion.div 
                    layoutId="activeTab"
                    className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"
                  />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  </div>
  );
}
