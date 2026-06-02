import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Revenue } from '../types';
import { parseISO, getDay } from 'date-fns';
import { Wallet } from 'lucide-react';

interface WeekdayPaymentBreakdownChartProps {
  revenues: Revenue[];
}

export function WeekdayPaymentBreakdownChart({ revenues }: WeekdayPaymentBreakdownChartProps) {
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

  // Initialize data structure
  const weekdayData = daysOfWeek.reduce((acc, day) => {
    acc[day.id] = {
      cb: 0,
      tr: 0,
      cash: 0,
      amex: 0,
      transfer: 0
    };
    return acc;
  }, {} as Record<number, { cb: number; tr: number; cash: number; amex: number; transfer: number }>);

  // Accumulate payment types for filtered revenues
  revenues.forEach(rev => {
    if (!rev.payments) return;
    const date = parseISO(rev.date);
    const dayIndex = getDay(date); // 0 = Sunday, 1 = Monday, etc.

    if (weekdayData[dayIndex] !== undefined) {
      const p = rev.payments;
      weekdayData[dayIndex].cb += (p.cb || 0) + (p.cbContactless || 0);
      weekdayData[dayIndex].cash += (p.cash || 0);
      weekdayData[dayIndex].amex += (p.amex || 0) + (p.amexContactless || 0);
      weekdayData[dayIndex].tr += (p.tr || 0) + (p.trContactless || 0);
      weekdayData[dayIndex].transfer += (p.transfer || 0);
    }
  });

  // Prepare chart data
  const chartData = daysOfWeek.map(day => {
    const data = weekdayData[day.id];
    return {
      name: day.name,
      'Carte Bancaire': Math.round(data.cb),
      'Tickets Resto': Math.round(data.tr),
      'Espèces': Math.round(data.cash),
      'AMEX': Math.round(data.amex),
      'Virement': Math.round(data.transfer)
    };
  });

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm h-full flex flex-col">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
          <Wallet size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Répartition des Paiements par Jour</h2>
          <p className="text-xs text-slate-500 font-medium">Volume de transactions cumulé par mode de paiement</p>
        </div>
      </div>

      <div className="flex-1 h-64 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
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
              formatter={(value: any) => [`${Number(value).toLocaleString('fr-FR')} €`]}
              contentStyle={{
                backgroundColor: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '1rem',
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                padding: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                fontFamily: 'inherit'
              }}
            />
            <Legend 
              verticalAlign="top" 
              align="right" 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingBottom: '20px' }}
            />
            <Bar dataKey="Carte Bancaire" stackId="payments" fill="#2563eb" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Tickets Resto" stackId="payments" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Espèces" stackId="payments" fill="#10b981" radius={[0, 0, 0, 0]} />
            <Bar dataKey="AMEX" stackId="payments" fill="#a855f7" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Virement" stackId="payments" fill="#64748b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
