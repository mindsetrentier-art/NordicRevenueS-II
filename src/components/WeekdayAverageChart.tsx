import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Revenue } from '../types';
import { format, parseISO, getDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarDays } from 'lucide-react';
import clsx from 'clsx';

interface WeekdayAverageChartProps {
  revenues: Revenue[];
}

export function WeekdayAverageChart({ revenues }: WeekdayAverageChartProps) {
  // Days of week in French, starting from Monday
  const daysOfWeek = [
    { id: 1, name: 'Lundi' },
    { id: 2, name: 'Mardi' },
    { id: 3, name: 'Mercredi' },
    { id: 4, name: 'Jeudi' },
    { id: 5, name: 'Vendredi' },
    { id: 6, name: 'Samedi' },
    { id: 0, name: 'Dimanche' }
  ];

  // Process data
  const weekdayStats = revenues.reduce((acc, rev) => {
    const date = parseISO(rev.date);
    const dayIndex = getDay(date); // 0 (Sun) to 6 (Sat)
    
    if (!acc[dayIndex]) {
      acc[dayIndex] = { total: 0, count: 0, days: new Set() };
    }
    
    acc[dayIndex].total += rev.total;
    acc[dayIndex].days.add(rev.date);
    return acc;
  }, {} as Record<number, { total: number, count: number, days: Set<string> }>);

  const chartData = daysOfWeek.map(day => {
    const stats = weekdayStats[day.id];
    const average = stats ? stats.total / stats.days.size : 0;
    return {
      name: day.name,
      average: Math.round(average),
      rawId: day.id
    };
  });

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
          <CalendarDays size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Performance Hebdomadaire</h2>
          <p className="text-xs text-slate-500 font-medium">Moyenne du CA par jour de la semaine</p>
        </div>
      </div>

      <div className="flex-1 h-64 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 700 }}
              tickFormatter={(val) => `${val.toLocaleString('fr-FR')}€`}
            />
            <Tooltip 
              cursor={{ fill: 'rgba(99, 102, 241, 0.05)', radius: 12 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-2xl min-w-[150px]">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{data.name}</p>
                      <p className="text-lg font-black text-slate-900">{data.average.toLocaleString('fr-FR')} €</p>
                      <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">Moyenne journalière</p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="average" 
              radius={[10, 10, 0, 0]} 
              maxBarSize={40}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={entry.average === Math.max(...chartData.map(d => d.average)) ? '#4f46e5' : '#e2e8f0'} 
                  className="transition-all duration-300 hover:fill-indigo-400"
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-6 flex flex-wrap gap-4 pt-6 border-t border-slate-50">
        {chartData.sort((a, b) => b.average - a.average).slice(0, 3).map((item, idx) => (
          <div key={item.name} className="flex items-center gap-2">
            <div className={clsx(
              "w-2 h-2 rounded-full",
              idx === 0 ? "bg-indigo-600" : idx === 1 ? "bg-indigo-400" : "bg-indigo-200"
            )} />
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
              Top {idx + 1}: {item.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
