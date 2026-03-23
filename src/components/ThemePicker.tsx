import React, { useState } from 'react';
import { Palette, X } from 'lucide-react';
import { useTheme, THEME_COLORS } from '../contexts/ThemeContext';
import clsx from 'clsx';

export function ThemePicker({ direction = 'down' }: { direction?: 'up' | 'down' }) {
  const { themeColor, setThemeColor } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        title="Changer la couleur d'ambiance"
      >
        <Palette size={20} style={{ color: themeColor }} />
        <span className="hidden md:inline">Thème</span>
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div 
            className={clsx(
              "absolute w-72 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-4",
              direction === 'up' 
                ? "bottom-full left-0 mb-2" 
                : "top-full right-0 mt-2"
            )}
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-900">Couleur d'ambiance</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 max-h-64 overflow-y-auto p-1">
              {THEME_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    setThemeColor(color);
                    setIsOpen(false);
                  }}
                  className={clsx(
                    "w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1",
                    themeColor === color ? "ring-2 ring-slate-400 scale-110" : ""
                  )}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
