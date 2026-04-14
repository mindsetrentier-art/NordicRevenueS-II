import React, { useMemo } from 'react';
import { motion } from 'motion/react';
import { Award, Calendar, Zap, TrendingUp, Star, CheckCircle2, Target, Flame } from 'lucide-react';
import { Revenue, Badge } from '../types';
import { format, subDays, isSameDay, differenceInDays } from 'date-fns';
import clsx from 'clsx';

interface SuccessBadgesProps {
  revenues: Revenue[];
}

export function SuccessBadges({ revenues }: SuccessBadgesProps) {
  const badges = useMemo(() => {
    const unlocked: Badge[] = [];
    
    if (revenues.length === 0) return unlocked;

    // 1. Régularité (7 jours consécutifs)
    const sortedDates = Array.from(new Set(revenues.map(r => r.date))).sort();
    let maxStreak = 0;
    let currentStreak = 0;
    
    for (let i = 0; i < sortedDates.length; i++) {
      if (i > 0) {
        const diff = differenceInDays(new Date(sortedDates[i]), new Date(sortedDates[i-1]));
        if (diff === 1) {
          currentStreak++;
        } else {
          currentStreak = 1;
        }
      } else {
        currentStreak = 1;
      }
      maxStreak = Math.max(maxStreak, currentStreak);
    }

    if (maxStreak >= 7) {
      unlocked.push({
        id: 'regularity_7',
        title: 'Métronome',
        description: '7 jours de saisie consécutifs. Quelle régularité !',
        icon: 'Flame',
        color: 'text-orange-500 bg-orange-50 border-orange-100'
      });
    }

    // 2. Record de CA (Une journée > 5000€ par exemple, ou juste le fait d'avoir des données)
    const maxDayTotal = Math.max(...revenues.map(r => r.total));
    if (maxDayTotal > 2000) {
      unlocked.push({
        id: 'high_revenue',
        title: 'Grand Cru',
        description: 'Record de CA journalier dépassé (> 2000€).',
        icon: 'TrendingUp',
        color: 'text-emerald-500 bg-emerald-50 border-emerald-100'
      });
    }

    // 3. Pionnier (Premier enregistrement)
    if (revenues.length >= 1) {
      unlocked.push({
        id: 'pioneer',
        title: 'Pionnier',
        description: 'Premier pas vers une gestion optimisée.',
        icon: 'Star',
        color: 'text-blue-500 bg-blue-50 border-blue-100'
      });
    }

    // 4. Expert (Plus de 50 enregistrements)
    if (revenues.length >= 50) {
      unlocked.push({
        id: 'expert',
        title: 'Maître des Chiffres',
        description: 'Plus de 50 services enregistrés.',
        icon: 'Award',
        color: 'text-purple-500 bg-purple-50 border-purple-100'
      });
    }

    return unlocked;
  }, [revenues]);

  const IconMap: Record<string, any> = {
    Flame,
    TrendingUp,
    Star,
    Award,
    Target,
    CheckCircle2
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-sm">
          <Award size={24} />
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Badges de Succès</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Vos accomplissements et records</p>
        </div>
      </div>

      {badges.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
            <Award size={32} />
          </div>
          <p className="text-slate-400 font-bold text-sm">Continuez à saisir vos recettes pour débloquer vos premiers badges !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {badges.map((badge, index) => {
            const Icon = IconMap[badge.icon] || Award;
            return (
              <motion.div
                key={badge.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ y: -5 }}
                className={clsx(
                  "p-6 rounded-[2rem] border flex flex-col items-center text-center transition-all hover:shadow-xl group",
                  badge.color
                )}
              >
                <div className="mb-4 p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                  <Icon size={32} />
                </div>
                <h3 className="font-black text-slate-900 mb-1 tracking-tight">{badge.title}</h3>
                <p className="text-[10px] font-bold text-slate-500 leading-tight uppercase tracking-widest opacity-80">
                  {badge.description}
                </p>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
