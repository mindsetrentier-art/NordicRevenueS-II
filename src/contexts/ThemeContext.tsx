import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  themeColor: string;
  setThemeColor: (color: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const THEME_COLORS = [
  // Red
  '#f87171', '#ef4444', '#dc2626', '#b91c1c', '#991b1b',
  // Orange
  '#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412',
  // Amber
  '#fbbf24', '#f59e0b', '#d97706', '#b45309', '#92400e',
  // Yellow
  '#facc15', '#eab308', '#ca8a04', '#a16207', '#854d0e',
  // Lime
  '#a3e635', '#84cc16', '#65a30d', '#4d7c0f', '#3f6212',
  // Green
  '#4ade80', '#22c55e', '#16a34a', '#15803d', '#166534',
  // Emerald
  '#34d399', '#10b981', '#059669', '#047857', '#065f46',
  // Teal
  '#2dd4bf', '#14b8a6', '#0d9488', '#0f766e', '#115e59',
  // Cyan
  '#22d3ee', '#06b6d4', '#0891b2', '#0e7490', '#155e75',
  // Sky
  '#38bdf8', '#0ea5e9', '#0284c7', '#0369a1', '#075985',
  // Blue
  '#60a5fa', '#3b82f6', '#2563eb', '#1d4ed8', '#1e3a8a',
  // Indigo
  '#818cf8', '#6366f1', '#4f46e5', '#4338ca', '#3730a3',
  // Violet
  '#a78bfa', '#8b5cf6', '#7c3aed', '#6d28d9', '#5b21b6',
  // Purple
  '#c084fc', '#a855f7', '#9333ea', '#7e22ce', '#6b21a8',
  // Fuchsia
  '#e879f9', '#d946ef', '#c026d3', '#a21caf', '#86198f',
  // Pink
  '#f472b6', '#ec4899', '#db2777', '#be185d', '#9d174d',
];

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeColor, setThemeColor] = useState(() => {
    return localStorage.getItem('app_theme_color') || '#2563eb';
  });

  useEffect(() => {
    localStorage.setItem('app_theme_color', themeColor);
    document.documentElement.style.setProperty('--theme-color', themeColor);
    document.documentElement.style.setProperty('--theme-color-light', `${themeColor}22`);
    document.documentElement.style.setProperty('--theme-color-transparent', `${themeColor}00`);
    
    // Harmonize the entire app by overriding the default blue palette
    document.documentElement.style.setProperty('--color-blue-50', `color-mix(in srgb, ${themeColor} 10%, white)`);
    document.documentElement.style.setProperty('--color-blue-100', `color-mix(in srgb, ${themeColor} 20%, white)`);
    document.documentElement.style.setProperty('--color-blue-200', `color-mix(in srgb, ${themeColor} 30%, white)`);
    document.documentElement.style.setProperty('--color-blue-300', `color-mix(in srgb, ${themeColor} 50%, white)`);
    document.documentElement.style.setProperty('--color-blue-400', `color-mix(in srgb, ${themeColor} 70%, white)`);
    document.documentElement.style.setProperty('--color-blue-500', `color-mix(in srgb, ${themeColor} 85%, white)`);
    document.documentElement.style.setProperty('--color-blue-600', themeColor);
    document.documentElement.style.setProperty('--color-blue-700', `color-mix(in srgb, ${themeColor} 85%, black)`);
    document.documentElement.style.setProperty('--color-blue-800', `color-mix(in srgb, ${themeColor} 70%, black)`);
    document.documentElement.style.setProperty('--color-blue-900', `color-mix(in srgb, ${themeColor} 50%, black)`);
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
