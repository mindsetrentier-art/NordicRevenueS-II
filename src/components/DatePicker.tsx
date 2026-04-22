import React, { useState, useRef, useEffect } from 'react';
import { format, parse } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calendar as CalendarIcon } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import clsx from 'clsx';
import 'react-day-picker/dist/style.css';

interface DatePickerProps {
  date: string; // YYYY-MM-DD
  onChange: (date: string) => void;
  className?: string;
}

export function DatePicker({ date, onChange, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse YYYY-MM-DD string to Date object
  const selectedDate = date ? parse(date, 'yyyy-MM-dd', new Date()) : new Date();

  // Handle outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (day: Date | undefined) => {
    if (day) {
      onChange(format(day, 'yyyy-MM-dd'));
      setIsOpen(false);
    }
  };

  return (
    <div className={clsx("relative w-full", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-full flex items-center gap-3 bg-slate-50 border transition-shadow rounded-xl px-4 py-3 text-left outline-none",
          isOpen ? "border-blue-500 ring-2 ring-blue-500/20" : "border-slate-200 focus:ring-2 focus:ring-blue-500 hover:bg-slate-100"
        )}
      >
        <CalendarIcon size={20} className="text-blue-600 shrink-0" />
        <span className="flex-1 font-medium text-slate-900">
          {selectedDate ? format(selectedDate, "d MMMM yyyy", { locale: fr }) : "Sélectionner une date"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 z-50 bg-white rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 p-3 animate-in fade-in slide-in-from-top-2">
          <style>{`
            .rdp-root {
              --rdp-accent-color: var(--color-blue-600);
              --rdp-background-color: var(--color-blue-50);
              --rdp-accent-background-color: var(--color-blue-50);
              margin: 0;
            }
            .rdp-day_selected, .rdp-day_selected:focus-visible, .rdp-day_selected:hover {
              background-color: var(--rdp-accent-color) !important;
              color: white !important;
              font-weight: bold;
            }
            .rdp-button:hover:not([disabled]):not(.rdp-day_selected) {
              background-color: var(--color-slate-100);
            }
          `}</style>
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleSelect}
            locale={fr}
            showOutsideDays
            fixedWeeks
            className="select-none"
          />
        </div>
      )}
    </div>
  );
}
