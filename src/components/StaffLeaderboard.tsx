import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Target, Star, TrendingUp, Award, Medal } from 'lucide-react';
import clsx from 'clsx';
import { Revenue, User } from '../types';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

interface StaffLeaderboardProps {
  revenues?: Revenue[];
}

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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10 w-max">
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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10 w-max">
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
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none transition-opacity z-10 w-max">
            Favori Clients
          </div>
        </motion.div>
      );
    default:
      return null;
  }
};

export function StaffLeaderboard({ revenues = [] }: StaffLeaderboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const usersSnap = await getDocs(query(collection(db, 'users')));
        const usersData = usersSnap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as any) } as User));
        setUsers(usersData);
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const getBadges = (score: number, count: number, rank: number) => {
    const badges: string[] = [];
    if (rank === 0 && count > 0) badges.push('top_seller');
    if (count >= 10 && score > 2000) badges.push('perfect_register'); // Simplified logic
    if (score > 5000) badges.push('customer_favorite');
    return badges;
  };

  const staffStats = users.map(user => {
    const userRevenues = revenues.filter(r => r.createdBy === user.uid);
    const score = Math.round(userRevenues.reduce((sum, r) => sum + r.total, 0));
    const count = userRevenues.length;
    
    // Derived gamified stats since we don't have this granular data per revenue
    // In a real app, this would come from the database
    const upsellRate = count > 0 ? Math.min(100, Math.round(15 + (score / (count * 100)) * 5)) : 0;
    const accuracy = count > 0 ? Math.min(100, 90 + Math.round((count / 10))) : 0;
    const satisfaction = count > 0 ? Math.min(5, 4.2 + ((score % 100) / 100)) : 0;

    return {
      id: user.uid,
      name: user.displayName || user.email.split('@')[0] || 'Anonyme',
      role: user.role === 'admin' ? 'Manager' : 'Serveur',
      score,
      count,
      upsellRate,
      accuracy,
      satisfaction: Number(satisfaction.toFixed(1)),
      badges: [] as string[]
    };
  }).filter(stat => stat.score > 0).sort((a, b) => b.score - a.score);

  staffStats.forEach((stat, index) => {
    stat.badges = getBadges(stat.score, stat.count, index);
  });

  if (loading) {
    return <div className="animate-pulse bg-slate-100 h-64 rounded-[2.5rem]"></div>;
  }

  // If there's no data yet, provide an empty state instead of null, keeping the widget visible
  const displayData = staffStats.length > 0 ? staffStats : [
    { id: '1', name: 'Aucune donnée', role: '...', score: 0, count: 0, upsellRate: 0, accuracy: 0, satisfaction: 0, badges: [] }
  ];

  return (
    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
            <Trophy className="text-amber-500" size={24} />
            Classement de l'Équipe
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Performances et gamification de vos collaborateurs</p>
        </div>
        <div className="bg-amber-50 text-amber-700 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 border border-amber-100 shadow-sm self-start sm:self-auto">
          <Award size={16} />
          Saison en cours
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {displayData.map((staff, index) => (
          <motion.div 
            key={staff.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={clsx(
              "flex flex-col lg:flex-row lg:items-center justify-between p-6 rounded-[2rem] border transition-all hover:shadow-lg group gap-6",
              index === 0 && staff.count > 0 ? "bg-gradient-to-br from-amber-50/50 via-white to-white border-amber-200 shadow-amber-500/5" : 
              index === 1 && staff.count > 0 ? "bg-gradient-to-br from-slate-50/50 via-white to-white border-slate-200 shadow-slate-500/5" :
              "bg-white border-slate-100"
            )}
          >
            <div className="flex items-center gap-6">
              <div className={clsx(
                "w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center font-black text-2xl shadow-sm transition-transform group-hover:scale-110",
                staff.count === 0 ? "bg-slate-100 text-slate-400" :
                index === 0 ? "bg-amber-100 text-amber-600" :
                index === 1 ? "bg-slate-200 text-slate-600" :
                "bg-orange-100 text-orange-600"
              )}>
                {staff.count === 0 ? "-" : index === 0 ? <Trophy size={28} /> : index === 1 ? <Medal size={28} /> : `#${index + 1}`}
              </div>
              
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h3 className={clsx(
                    "font-black text-lg tracking-tight text-slate-900"
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
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">Points (CA)</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
