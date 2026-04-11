import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { ThemePicker } from './ThemePicker';
import { 
  LayoutDashboard, 
  Store, 
  Receipt, 
  BarChart3, 
  Settings, 
  Bell,
  LogOut
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
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/entry', icon: Receipt, label: 'Saisie Recettes' },
    { to: '/reports', icon: BarChart3, label: 'Rapports' },
    { to: '/establishments', icon: Store, label: 'Établissements' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
    { to: '/settings', icon: Settings, label: 'Paramètres' },
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
      <header className="lg:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <Logo className="w-8 h-8 rounded-lg shadow-sm" />
          <h1 className="font-bold text-lg tracking-tight">NordicRevenueS</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemePicker />
          <button 
            onClick={handleLogout} 
            className="p-2 text-slate-600 hover:text-red-600 transition-colors"
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
            Déconnexion
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
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-transparent px-2 py-1 z-40 flex items-center justify-around">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => clsx(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-colors min-w-[60px]",
              isActive 
                ? "text-blue-600" 
                : "text-slate-500 hover:text-slate-900"
            )}
          >
            <item.icon size={20} className={clsx("transition-transform", "active:scale-90")} />
            <span className="text-[10px] font-medium truncate w-full text-center">{item.label.split(' ')[0]}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  </div>
  );
}
