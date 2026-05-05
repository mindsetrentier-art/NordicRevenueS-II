import React from 'react';
import { motion } from 'motion/react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cost, Establishment } from '../types';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Calculator, PieChart } from 'lucide-react';

interface CostEvolutionChartProps {
  costs: Cost[];
  establishments: Establishment[];
  selectedEst: string;
}

export function CostEvolutionChart({ costs, establishments, selectedEst }: CostEvolutionChartProps) {
  // Process data for the chart
  // Group by month
  const monthlyData = costs.reduce((acc: any, cost) => {
    const monthKey = cost.month;
    if (!acc[monthKey]) {
      acc[monthKey] = {
        month: monthKey,
        displayMonth: format(parseISO(`${monthKey}-01`), 'MMM yyyy', { locale: fr }),
        laborCost: 0,
        cogs: 0,
        otherCosts: 0,
      };
    }
    acc[monthKey].laborCost += cost.laborCost;
    acc[monthKey].cogs += cost.cogs;
    acc[monthKey].otherCosts += ((cost.otherCosts || 0) + (cost.rent || 0) + (cost.utilities || 0) + (cost.bankLoan || 0) + (cost.taxes || 0) + (cost.vat || 0));
    return acc;
  }, {});

  const chartData = Object.values(monthlyData).sort((a: any, b: any) => a.month.localeCompare(b.month));

  const totalLabor: any = chartData.reduce((sum: number, d: any) => sum + (d.laborCost || 0), 0);
  const totalCogs: any = chartData.reduce((sum: number, d: any) => sum + (d.cogs || 0), 0);
  const totalOther: any = chartData.reduce((sum: number, d: any) => sum + (d.otherCosts || 0), 0);

  const avgLabor = chartData.length > 0 ? totalLabor / chartData.length : 0;
  const avgCogs = chartData.length > 0 ? totalCogs / chartData.length : 0;
  const totalCostsAll = totalLabor + totalCogs + totalOther;

  if (costs.length === 0) {
    return (
      <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center min-h-[400px]">
        <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
          <Calculator size={32} />
        </div>
        <h3 className="text-lg font-black text-slate-900 mb-2">Aucune donnée de coût</h3>
        <p className="text-sm text-slate-500 max-w-sm">
          Saisissez vos coûts mensuels dans le gestionnaire de Prime Cost pour voir l'évolution de vos marges.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-10">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-600/20">
            <PieChart size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Répartition & Évolution des Coûts</h2>
            <p className="text-xs text-slate-500 font-medium">Evolution mensuelle du Prime Cost</p>
          </div>
        </div>
      </div>

      <div className="h-80 w-full mb-6">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis 
              dataKey="displayMonth" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 11, fontWeight: 700 }}
              tickFormatter={(value) => `${value.toLocaleString('fr-FR')} €`}
            />
            <Tooltip
              cursor={{ fill: 'rgba(225, 29, 72, 0.05)' }}
              contentStyle={{ 
                borderRadius: '16px', 
                border: '1px solid #f1f5f9', 
                boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                padding: '12px'
              }}
              labelStyle={{ fontWeight: 800, marginBottom: '8px', textTransform: 'uppercase', fontSize: '10px' }}
            />
            <Legend 
              iconType="circle"
              wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}
            />
            <Bar dataKey="laborCost" name="Main d'œuvre" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
            <Bar dataKey="cogs" name="Matières (COGS)" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
            <Bar dataKey="otherCosts" name="Autres Charges" stackId="a" fill="#94a3b8" radius={[10, 10, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-50">
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne Main d'œuvre</p>
          <p className="text-xl font-black text-indigo-600">
            {avgLabor.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Moyenne Matières</p>
          <p className="text-xl font-black text-amber-600">
            {avgCogs.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Cumulé</p>
          <p className="text-xl font-black text-slate-900">
            {totalCostsAll.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
          </p>
        </div>
      </div>
    </div>
  );
}
