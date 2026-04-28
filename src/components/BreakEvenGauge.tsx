import React from 'react';
import { motion } from 'motion/react';
import { Target, TrendingUp, AlertCircle, CheckCircle2, Zap } from 'lucide-react';
import { clsx } from 'clsx';

interface BreakEvenGaugeProps {
  currentRevenue: number;
  totalCosts: number;
  periodLabel: string;
  daysCount?: number;
}

export function BreakEvenGauge({ currentRevenue, totalCosts, periodLabel, daysCount }: BreakEvenGaugeProps) {
  const isDaily = !!daysCount && daysCount > 0;
  const targetRevenue = isDaily ? totalCosts / daysCount : totalCosts;
  const displayRevenue = isDaily ? currentRevenue / daysCount : currentRevenue;

  const percentage = targetRevenue > 0 ? Math.min((displayRevenue / targetRevenue) * 100, 150) : 0;
  const isBrokenEven = displayRevenue >= targetRevenue && targetRevenue > 0;
  const remaining = Math.max(targetRevenue - displayRevenue, 0);

  // Gauge constants
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (Math.min(percentage, 100) / 100) * circumference;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm flex flex-col items-center justify-center relative overflow-hidden group h-full">
      {/* Visual Decoration */}
      <div className={clsx(
        "absolute -top-12 -right-12 w-32 h-32 blur-[60px] rounded-full transition-all duration-700",
        isBrokenEven ? "bg-emerald-500/10 group-hover:bg-emerald-500/20" : "bg-indigo-500/5 group-hover:bg-indigo-500/10"
      )} />

      <div className="w-full flex items-center justify-between mb-8 relative z-10">
        <div>
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-1">
            {isDaily ? "Rentabilité Journalière" : "Seuil de Rentabilité"}
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{periodLabel}</p>
        </div>
        <div className={clsx(
          "p-2 rounded-xl transition-colors",
          isBrokenEven ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-400"
        )}>
          {isBrokenEven ? <Zap size={18} /> : <Target size={18} />}
        </div>
      </div>

      <div className="relative flex items-center justify-center mb-8">
        {/* SVG Gauge */}
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {/* Progress Track */}
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={isBrokenEven ? "#10b981" : "#4f46e5"}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeLinecap="round"
            className="drop-shadow-[0_0_8px_rgba(79,70,229,0.2)]"
          />
          {isBrokenEven && (
             <motion.circle
              initial={{ opacity: 0 }}
              animate={{ opacity: [0.2, 0.4, 0.2] }}
              transition={{ repeat: Infinity, duration: 2 }}
              cx={size / 2}
              cy={size / 2}
              r={radius + 8}
              fill="none"
              stroke="#10b981"
              strokeWidth={2}
              strokeDasharray="4 8"
            />
          )}
        </svg>

        {/* Center Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <motion.p 
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            className={clsx(
              "text-4xl font-black tracking-tighter",
              isBrokenEven ? "text-emerald-600" : "text-slate-900"
            )}
          >
            {Math.round(percentage)}%
          </motion.p>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {isBrokenEven ? "Objectif Atteint" : "Couverture"}
          </p>
        </div>
      </div>

      <div className="w-full space-y-4 relative z-10">
        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <div className="flex flex-col">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {isDaily ? "Objectif / Jour" : "Coûts Fixes"}
            </span>
            <span className="text-sm font-black text-slate-900">{Math.round(targetRevenue).toLocaleString('fr-FR')} €</span>
          </div>
          <div className="h-8 w-px bg-slate-200" />
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
              {isDaily ? "Moyenne Réelle" : "Revenue Actuel"}
            </span>
            <span className={clsx(
              "text-sm font-black",
              isBrokenEven ? "text-emerald-600" : "text-indigo-600"
            )}>
              {Math.round(displayRevenue).toLocaleString('fr-FR')} €
            </span>
          </div>
        </div>

        {isBrokenEven ? (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-700">
            <CheckCircle2 size={18} className="shrink-0" />
            <p className="text-[11px] font-bold leading-tight">
              {isDaily 
                ? "Félicitations ! Votre CA moyen journalier dépasse votre seuil de rentabilité théorique."
                : `Félicitations ! Vous êtes en zone de profit net depuis que vous avez dépassé les ${totalCosts.toLocaleString('fr-FR')} €.`
              }
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-4 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700">
            <AlertCircle size={18} className="shrink-0" />
            <p className="text-[11px] font-bold leading-tight">
              {isDaily
                ? `Il vous manque en moyenne ${Math.round(remaining).toLocaleString('fr-FR')} € par jour pour être rentable.`
                : `Il manque encore ${remaining.toLocaleString('fr-FR')} € pour atteindre votre seuil de rentabilité ce mois-ci.`
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
