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
    id: '4',
    name: 'Harry',
    role: 'Barman',
    score: 720,
    upsellRate: 12,
    accuracy: 97,
    satisfaction: 4.6,
    badges: [],
    isBlonde: true
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
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Trophy className="text-amber-500" size={24} />
            Classement de l'Équipe
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Performances et gamification du mois</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-amber-100 shadow-sm self-start sm:self-auto">
          <Award size={16} />
          Saison en cours
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {mockStaffData.sort((a, b) => b.score - a.score).map((staff, index) => (
          <motion.div 
            key={staff.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={clsx(
              "flex flex-col lg:flex-row lg:items-center justify-between p-6 rounded-[2rem] border transition-all hover:shadow-lg group gap-6",
              index === 0 ? "bg-gradient-to-br from-amber-50/50 via-white to-white border-amber-200 shadow-amber-500/5" : 
              index === 1 ? "bg-gradient-to-br from-slate-50/50 via-white to-white border-slate-200 shadow-slate-500/5" :
              "bg-white border-slate-100"
            )}
          >
            <div className="flex items-center gap-6">
              <div className={clsx(
                "w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm transition-transform group-hover:scale-110",
                staff.name === 'Harry' ? "bg-[#FBF2C0] text-[#D4AF37] border-2 border-[#F3E5AB]" :
                index === 0 ? "bg-amber-100 text-amber-600" :
                index === 1 ? "bg-slate-200 text-slate-600" :
                "bg-orange-100 text-orange-600"
              )}>
                {staff.name === 'Harry' ? "H" : index === 0 ? <Trophy size={28} /> : index === 1 ? <Medal size={28} /> : `#${index + 1}`}
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={clsx(
                    "font-black text-lg tracking-tight",
                    staff.name === 'Harry' ? "text-[#B8860B]" : "text-slate-900"
                  )}>
                    {staff.name}
                  </h3>
                  <div className="flex gap-1.5">
                    {staff.badges.map(badge => (
                      <BadgeIcon key={badge} type={badge} />
                    ))}
                  </div>
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{staff.role}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-8 lg:gap-12">
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-lg font-black text-slate-900 tracking-tighter">{staff.upsellRate}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upsell</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-slate-900 tracking-tighter">{staff.accuracy}%</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Caisse</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-black text-slate-900 tracking-tighter">{staff.satisfaction}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avis</p>
                </div>
              </div>
              
              <div className="lg:text-right bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl shadow-slate-900/20">
                <p className="text-2xl font-black tracking-tighter">{staff.score}</p>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Points</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
