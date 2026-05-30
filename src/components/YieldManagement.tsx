import React, { useState } from 'react';
import { motion } from 'motion/react';
import { TrendingUp, Percent, Sparkles, Flame, DollarSign, Activity } from 'lucide-react';
import { Revenue } from '../types';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

interface YieldManagementProps {
  revenues: Revenue[];
  todayRevenue: number;
  averageFoodCost?: number; // percentage (0-100)
}

export function YieldManagement({ revenues, todayRevenue, averageFoodCost = 30 }: YieldManagementProps) {
  // Simplified fixed costs estimation (labor + overhead) for daily calculation
  const fixedCostRatio = 0.45; // 45%
  const foodCostRatio = averageFoodCost / 100;
  
  const estimatedMargin = todayRevenue * (1 - foodCostRatio - fixedCostRatio);
  const marginPercentage = todayRevenue > 0 ? (estimatedMargin / todayRevenue) * 100 : 0;

  // Chart data: simulating demand across the week to show pricing opportunities
  const yieldData = [
    { day: 'Lun', demand: 45, maxPriceOpt: 0, suggestion: 'Happy Hour' },
    { day: 'Mar', demand: 40, maxPriceOpt: 0, suggestion: 'Promo Menu' },
    { day: 'Mer', demand: 60, maxPriceOpt: 5, suggestion: 'Standard' },
    { day: 'Jeu', demand: 85, maxPriceOpt: 12, suggestion: '+10% Cocktails' },
    { day: 'Ven', demand: 95, maxPriceOpt: 18, suggestion: 'Yield Max (+15%)' },
    { day: 'Sam', demand: 100, maxPriceOpt: 20, suggestion: 'Menu Fixe' },
    { day: 'Dim', demand: 75, maxPriceOpt: 8, suggestion: 'Brunch Premium' },
  ];

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] p-8 shadow-xl text-white relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10">
        <Activity size={120} />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Sparkles className="text-amber-400" size={24} />
              Optimisation de la Rentabilité (Yield)
            </h2>
            <p className="text-slate-400 text-sm font-medium mt-1">
              Visualisation temps réel et recommandations dynamiques de prix
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Marge en Temps Réel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 border border-white/10">
              <p className="text-xs font-bold text-slate-300 uppercase tracking-widest mb-1">Marge Nette (Aujourd'hui)</p>
              <div className="flex items-end gap-3 mb-4">
                <span className="text-4xl font-black text-emerald-400">
                  {estimatedMargin.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
                <span className="text-sm font-bold text-emerald-500 bg-emerald-500/20 px-2 py-1 rounded-lg mb-1">
                  {marginPercentage.toFixed(1)}% net
                </span>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Revenu Brut</span>
                  <span className="font-bold">{todayRevenue.toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Food Cost Est. ({averageFoodCost}%)</span>
                  <span className="font-bold text-rose-400">- {(todayRevenue * foodCostRatio).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Charges Fixes Est. (45%)</span>
                  <span className="font-bold text-rose-400">- {(todayRevenue * fixedCostRatio).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="h-px w-full bg-white/10 my-2" />
                <div className="flex justify-between items-center text-xs text-emerald-400 font-black">
                  <span>Bénéfice estimé</span>
                  <span>{estimatedMargin.toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            </div>
            
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-5">
              <div className="flex items-start gap-3">
                <Flame className="text-amber-400 shrink-0 mt-0.5" size={18} />
                <div>
                  <h4 className="text-sm font-bold text-amber-400 mb-1">Opportunité Active</h4>
                  <p className="text-xs text-amber-200/80 leading-relaxed">
                    Demande faible détectée ce soir. Nous recommandons un <span className="font-black text-amber-300">Happy Hour (-15%)</span> sur les boissons de 18h à 20h pour stimuler l'affluence.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Recommendations Chart */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-widest mb-6">Prédictions de Demande & Stratégie Prix</h3>
            <div className="h-[200px] w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <ComposedChart data={yieldData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff15" />
                  <XAxis 
                    dataKey="day" 
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    dy={10}
                  />
                  <YAxis 
                    yAxisId="left"
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dx={-10}
                  />
                  <YAxis 
                    yAxisId="right"
                    orientation="right"
                    tick={{ fill: '#f59e0b', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    dx={10}
                  />
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar yAxisId="left" dataKey="demand" name="Demande Prédite (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={30} fillOpacity={0.6} />
                  <Line yAxisId="right" type="monotone" dataKey="maxPriceOpt" name="Majoration Prix (%)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#1e293b' }} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              {yieldData.map((d, i) => (
                <div key={i} className="bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[10px] flex flex-col min-w-[90px]">
                  <span className="font-bold text-slate-400">{d.day}</span>
                  <span className="font-black text-white">{d.suggestion}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
