import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, TrendingUp, Info, Users, Maximize2, Star } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, CartesianGrid } from 'recharts';
import { Revenue, Establishment } from '../types';
import clsx from 'clsx';

interface EfficiencyBenchmarkProps {
  establishments: Establishment[];
  revenues: Revenue[];
  periodDays: number;
}

export function EfficiencyBenchmark({ establishments, revenues, periodDays }: EfficiencyBenchmarkProps) {
  // Calculate metrics per establishment
  const benchmarkData = establishments.map(est => {
    const estRevenues = revenues.filter(r => r.establishmentId === est.id);
    const totalRevenue = estRevenues.reduce((sum, r) => sum + r.total, 0);
    const avgDailyRevenue = totalRevenue / Math.max(periodDays, 1);
    
    // CA / m² (Monthly estimate / surface)
    const revenuePerSqm = est.surface && est.surface > 0 ? (avgDailyRevenue * 30.42) / est.surface : 0;
    
    // CA / Capacity (Monthly estimate / capacity)
    const revenuePerSeat = est.capacity && est.capacity > 0 ? (avgDailyRevenue * 30.42) / est.capacity : 0;

    // Efficiency Score (normalized 0-100 based on some arbitrary targets for demo)
    // Target: 800€/m²/month
    const sqmScore = Math.min((revenuePerSqm / 800) * 100, 100);
    const totalScore = sqmScore; // For now primary metric

    return {
      name: est.name,
      revenuePerSqm,
      revenuePerSeat,
      score: Math.round(totalScore),
      originalRevenue: totalRevenue
    };
  }).sort((a, b) => b.score - a.score);

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-600/20">
              <BarChart3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Benchmark d'Efficacité</h2>
              <p className="text-xs text-slate-500 font-medium">Comparaison par m² et par siège</p>
            </div>
          </div>
        </div>
        <div className="bg-violet-50 text-violet-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-violet-100">
          <Star size={14} />
          Performance Relative
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="h-80 w-full">
           <ResponsiveContainer width="100%" height="100%">
            <BarChart data={benchmarkData} layout="vertical" margin={{ left: 40, right: 30 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
              <XAxis type="number" hide />
              <YAxis 
                type="category" 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 11, fontWeight: 800 }}
              />
              <Tooltip 
                cursor={{ fill: 'rgba(139, 92, 246, 0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-2xl min-w-[200px]">
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight mb-3 border-b border-slate-100 pb-2">{data.name}</p>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">Score Efficacité</span>
                            <span className="text-sm font-black text-violet-600">{data.score}/100</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">CA / m² / mois</span>
                            <span className="text-sm font-black text-slate-900">{data.revenuePerSqm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">CA / siège / mois</span>
                            <span className="text-sm font-black text-slate-900">{data.revenuePerSeat.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €</span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="score" radius={[0, 10, 10, 0]} barSize={32}>
                {benchmarkData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={index === 0 ? '#8b5cf6' : '#c4b5fd'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-6">
          <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2rem]">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-violet-600">
                <Info size={24} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight mb-2">Pourquoi cet indice ?</h3>
                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                  Le volume de CA seul ne dit pas tout. Un petit établissement peut être plus <strong>rentable</strong> qu'un grand s'il optimise mieux son espace. Cet indice neutralise l'effet de taille.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-violet-500 mb-2">
                <Maximize2 size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Top CA/m²</span>
              </div>
              <p className="text-lg font-black text-slate-900">{benchmarkData[0]?.name || '-'}</p>
              <p className="text-xs font-bold text-violet-600 mt-1">
                {benchmarkData[0]?.revenuePerSqm.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / mois
              </p>
            </div>

            <div className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm">
              <div className="flex items-center gap-2 text-blue-500 mb-2">
                <Users size={16} />
                <span className="text-[10px] font-black uppercase tracking-widest">Top CA/Siège</span>
              </div>
              <p className="text-lg font-black text-slate-900">
                {benchmarkData.sort((a,b) => b.revenuePerSeat - a.revenuePerSeat)[0]?.name || '-'}
              </p>
              <p className="text-xs font-bold text-blue-600 mt-1">
                {benchmarkData.sort((a,b) => b.revenuePerSeat - a.revenuePerSeat)[0]?.revenuePerSeat.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} € / mois
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 p-2 ml-2">
            <TrendingUp size={12} />
            <span>Calculé sur les {periodDays} derniers jours d'activité.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
