import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Star, TrendingUp, Award, Medal } from 'lucide-react';
import clsx from 'clsx';

const mockStaffData = [
  {
    id: '1',
    name: 'Sophie Martin',
    role: 'Manager',
    score: 985,
    upsellRate: 24,
    accuracy: 100,
    satisfaction: 4.9,
    badges: ['top_seller', 'perfect_register']
  },
  {
    id: '2',
    name: 'Thomas Dubois',
    role: 'Serveur',
    score: 840,
    upsellRate: 18,
    accuracy: 98,
    satisfaction: 4.8,
    badges: ['customer_favorite']
  },
  {
    id: '3',
    name: 'Julie Leroy',
    role: 'Serveuse',
    score: 790,
    upsellRate: 15,
    accuracy: 99,
    satisfaction: 4.7,
    badges: []
  }
];

const BadgeIcon = ({ type }: { type: string }) => {
  switch (type) {
    case 'top_seller':
      return (
        <motion.div 
          whileHover={{ scale: 1.2, rotate: 10 }}
          className="relative group cursor-help"
        >
          <div className="absolute inset-0 bg-amber-400 blur-md opacity-50 rounded-full animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-amber-300 to-amber-500 text-white p-1.5 rounded-full shadow-sm">
            <TrendingUp size={14} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
            Top Vendeur
          </div>
        </motion.div>
      );
    case 'perfect_register':
      return (
        <motion.div 
          whileHover={{ scale: 1.2, rotate: -10 }}
          className="relative group cursor-help"
        >
          <div className="absolute inset-0 bg-emerald-400 blur-md opacity-50 rounded-full animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-emerald-300 to-emerald-500 text-white p-1.5 rounded-full shadow-sm">
            <Target size={14} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
            Caisse Parfaite
          </div>
        </motion.div>
      );
    case 'customer_favorite':
      return (
        <motion.div 
          whileHover={{ scale: 1.2, rotate: 180 }}
          transition={{ duration: 0.3 }}
          className="relative group cursor-help"
        >
          <div className="absolute inset-0 bg-purple-400 blur-md opacity-50 rounded-full animate-pulse"></div>
          <div className="relative bg-gradient-to-br from-purple-300 to-purple-500 text-white p-1.5 rounded-full shadow-sm">
            <Star size={14} />
          </div>
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10">
            Favori Clients
          </div>
        </motion.div>
      );
    default:
      return null;
  }
};

export function StaffLeaderboard() {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Trophy className="text-amber-500" size={20} />
            Classement de l'Équipe
          </h2>
          <p className="text-sm text-slate-500 mt-1">Performances et gamification du mois</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-amber-100">
          <Award size={14} />
          Saison en cours
        </div>
      </div>

      <div className="space-y-4">
        {mockStaffData.sort((a, b) => b.score - a.score).map((staff, index) => (
          <motion.div 
            key={staff.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={clsx(
              "flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border transition-all hover:shadow-md gap-4 sm:gap-0",
              index === 0 ? "bg-gradient-to-r from-amber-50 to-white border-amber-200" : 
              index === 1 ? "bg-gradient-to-r from-slate-50 to-white border-slate-200" :
              "bg-white border-slate-100"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={clsx(
                "w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-bold text-lg shadow-sm",
                index === 0 ? "bg-amber-100 text-amber-600" :
                index === 1 ? "bg-slate-200 text-slate-600" :
                "bg-orange-100 text-orange-600"
              )}>
                {index === 0 ? <Trophy size={20} /> : index === 1 ? <Medal size={20} /> : `#${index + 1}`}
              </div>
              
              <div>
                <h3 className="font-bold text-slate-900 flex items-center gap-2">
                  {staff.name}
                  <div className="flex gap-1">
                    {staff.badges.map(badge => (
                      <BadgeIcon key={badge} type={badge} />
                    ))}
                  </div>
                </h3>
                <p className="text-xs text-slate-500">{staff.role}</p>
              </div>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pl-14 sm:pl-0">
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div className="text-center">
                  <p className="font-bold text-slate-700">{staff.upsellRate}%</p>
                  <p>Upsell</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">{staff.accuracy}%</p>
                  <p>Caisse</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-slate-700">{staff.satisfaction}/5</p>
                  <p>Avis</p>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-2xl font-black text-slate-900">{staff.score}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Points</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
