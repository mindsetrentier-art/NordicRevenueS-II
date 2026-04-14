import React from 'react';
import { motion } from 'motion/react';
import { Trophy, TrendingUp, TrendingDown, Store, Award, Medal } from 'lucide-react';
import { Revenue, Establishment } from '../types';
import { format, subDays, isWithinInterval } from 'date-fns';
import clsx from 'clsx';

interface EstablishmentLeaderboardProps {
  revenues: Revenue[];
  establishments: Establishment[];
}

export function EstablishmentLeaderboard({ revenues, establishments }: EstablishmentLeaderboardProps) {
  const now = new Date();
  const last7Days = {
    start: subDays(now, 7),
    end: now
  };
  const prev7Days = {
    start: subDays(now, 14),
    end: subDays(now, 8)
  };

  const stats = establishments.map(est => {
    const estRevenues = revenues.filter(r => r.establishmentId === est.id);
    
    const currentPeriodTotal = estRevenues
      .filter(r => isWithinInterval(new Date(r.date), last7Days))
      .reduce((sum, r) => sum + r.total, 0);
      
    const prevPeriodTotal = estRevenues
      .filter(r => isWithinInterval(new Date(r.date), prev7Days))
      .reduce((sum, r) => sum + r.total, 0);
      
    const growth = prevPeriodTotal > 0 
      ? ((currentPeriodTotal - prevPeriodTotal) / prevPeriodTotal) * 100 
      : (currentPeriodTotal > 0 ? 100 : 0);

    return {
      ...est,
      currentTotal: currentPeriodTotal,
      growth
    };
  }).sort((a, b) => b.growth - a.growth);

  if (establishments.length <= 1) return null;

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Trophy className="text-amber-500" size={24} />
            Leaderboard Performance
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Compétition saine entre vos établissements (Croissance 7j)</p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-blue-100 shadow-sm self-start sm:self-auto">
          <TrendingUp size={16} />
          Cette Semaine
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {stats.map((est, index) => (
          <motion.div 
            key={est.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={clsx(
              "flex items-center justify-between p-6 rounded-[2rem] border transition-all hover:shadow-lg group gap-4",
              index === 0 ? "bg-gradient-to-br from-amber-50/50 via-white to-white border-amber-200 shadow-amber-500/5" : 
              "bg-white border-slate-100"
            )}
          >
            <div className="flex items-center gap-6">
              <div className={clsx(
                "w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center font-black text-xl shadow-sm transition-transform group-hover:scale-110",
                index === 0 ? "bg-amber-100 text-amber-600" :
                index === 1 ? "bg-slate-100 text-slate-500" :
                index === 2 ? "bg-orange-50 text-orange-600" :
                "bg-slate-50 text-slate-400"
              )}>
                {index === 0 ? <Trophy size={24} /> : index === 1 ? <Medal size={24} /> : `#${index + 1}`}
              </div>
              
              <div>
                <h3 className="font-black text-slate-900 text-lg tracking-tight flex items-center gap-2">
                  <Store size={18} className="text-slate-400" />
                  {est.name}
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {est.currentTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} cette semaine
                </p>
              </div>
            </div>

            <div className="text-right">
              <div className={clsx(
                "inline-flex items-center gap-1 px-3 py-1.5 rounded-xl font-black text-sm",
                est.growth > 0 ? "bg-emerald-50 text-emerald-600" : 
                est.growth < 0 ? "bg-rose-50 text-rose-600" : 
                "bg-slate-50 text-slate-500"
              )}>
                {est.growth > 0 ? <TrendingUp size={16} /> : est.growth < 0 ? <TrendingDown size={16} /> : null}
                {est.growth > 0 ? '+' : ''}{est.growth.toFixed(1)}%
              </div>
              {index === 0 && est.growth > 0 && (
                <p className="text-[10px] font-black text-amber-500 uppercase tracking-tighter mt-1 animate-pulse">
                  Bravo ! En tête du CA 🚀
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
