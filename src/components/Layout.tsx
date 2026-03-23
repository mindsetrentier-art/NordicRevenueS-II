import React, { useState } from 'react';
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
  LogOut,
  Menu,
  X
} from 'lucide-react';
import clsx from 'clsx';

import { MusicPlayer } from './MusicPlayer';

export function Layout() {
  const { userProfile, logout } = useAuth();
  const { themeColor } = useTheme();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
    <div 
      className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 transition-colors duration-500"
      style={{
        boxShadow: `inset 0 0 0 4px var(--theme-color), inset 0 0 20px 4px var(--theme-color-light)`
      }}
    >
      <MusicPlayer />
      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-slate-200 p-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg text-white">
            <BarChart3 size={20} />
          </div>
          <h1 className="font-bold text-lg tracking-tight">NordicRevenueS</h1>
        </div>
        <div className="flex items-center gap-2">
          <ThemePicker />
          <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-600">
            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className={clsx(
        "fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="p-6 hidden md:flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-sm">
            <BarChart3 size={24} />
          </div>
          <h1 className="font-bold text-xl tracking-tight text-slate-900">NordicRevenueS</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
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

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
