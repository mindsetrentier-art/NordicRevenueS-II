import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, Minimize2, Banknote, TrendingUp, Users, Target, Clock, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import clsx from 'clsx';

interface ExecutiveWallProps {
  isOpen: boolean;
  onClose: () => void;
  totalRevenue: number;
  revenueChange: number | null;
  avgRevenue: number;
  chartData: any[];
  establishmentName: string;
}

export function ExecutiveWall({ 
  isOpen, 
  onClose, 
  totalRevenue, 
  revenueChange, 
  avgRevenue, 
  chartData,
  establishmentName 
}: ExecutiveWallProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-[#050505] z-[200] overflow-hidden text-white font-sans selection:bg-blue-500/30"
      >
        {/* Cinematic Backdrop Glows */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[60%] h-[60%] bg-blue-600/10 blur-[150px] rounded-full animate-pulse" />
          <div className="absolute -bottom-[20%] -right-[10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[150px] rounded-full" />
        </div>

        {/* Top Navigation / Header */}
        <div className="relative z-10 p-12 flex justify-between items-start">
          <motion.div
            initial={{ x: -50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <h1 className="text-4xl font-black tracking-tighter text-white flex items-center gap-4">
              NordicRevenueS
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            </h1>
            <p className="text-xl font-medium text-slate-500 mt-2 uppercase tracking-[0.3em]">{establishmentName}</p>
          </motion.div>

          <div className="flex items-center gap-12 text-right">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="hidden md:block"
            >
              <div className="flex items-center gap-3 justify-end text-slate-400 mb-1">
                <Clock size={20} />
                <p className="text-sm font-black uppercase tracking-widest">Heure Locale</p>
              </div>
              <p className="text-3xl font-black tracking-tight">{format(currentTime, 'HH:mm:ss')}</p>
            </motion.div>

            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="hidden lg:block text-right"
            >
              <div className="flex items-center gap-3 justify-end text-slate-400 mb-1">
                <Calendar size={20} />
                <p className="text-sm font-black uppercase tracking-widest">Date</p>
              </div>
              <p className="text-3xl font-black tracking-tight capitalize">{format(currentTime, 'eeee dd MMMM', { locale: fr })}</p>
            </motion.div>

            <button
              onClick={onClose}
              className="p-4 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all active:scale-90"
            >
              <Minimize2 size={32} />
            </button>
          </div>
        </div>

        {/* Global Performance Grid */}
        <div className="relative z-10 px-12 h-[calc(100vh-200px)] grid grid-cols-12 gap-12 items-center">
          
          {/* Main KPI Tower */}
          <div className="col-span-12 lg:col-span-5 space-y-12">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
              className="space-y-4"
            >
              <p className="text-xs font-black text-blue-400 uppercase tracking-[0.5em] ml-2">Total Period Growth</p>
              <div className="relative inline-block">
                <h2 className="text-[10rem] font-black tracking-[-0.05em] leading-none text-white drop-shadow-2xl">
                  {totalRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€
                </h2>
                {revenueChange !== null && (
                  <div className={clsx(
                    "absolute -right-24 top-12 px-6 py-3 rounded-2xl text-2xl font-black shadow-2xl",
                    revenueChange >= 0 ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                  )}>
                    {revenueChange >= 0 ? '+' : ''}{revenueChange.toFixed(1)}%
                  </div>
                )}
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-8">
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="p-8 bg-white/5 border border-white/10 rounded-[3rem]"
              >
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Daily Average</p>
                <div className="flex items-center gap-4">
                  <Banknote size={32} className="text-emerald-500" />
                  <p className="text-4xl font-black tracking-tight">{avgRevenue.toLocaleString('fr-FR', { maximumFractionDigits: 0 })}€</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="p-8 bg-white/5 border border-white/10 rounded-[3rem]"
              >
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Efficiency Ratio</p>
                <div className="flex items-center gap-4">
                  <Target size={32} className="text-blue-500" />
                  <p className="text-4xl font-black tracking-tight">84%</p>
                </div>
              </motion.div>
            </div>
          </div>

          {/* Epic Data Visualization */}
          <div className="col-span-12 lg:col-span-7 h-full flex flex-col justify-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="w-full h-full max-h-[600px] p-12 bg-white/[0.02] border border-white/[0.05] rounded-[4rem] relative group"
            >
               <div className="absolute top-12 left-12 flex items-center gap-4 mb-8">
                <div className="w-3 h-3 rounded-full bg-blue-500" />
                <p className="text-lg font-black uppercase tracking-widest text-slate-400">Revenue Stream Evolution</p>
              </div>

              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 100, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="execWallGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Tooltip 
                    content={() => null} // Disable tooltip for TV mode
                    cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 2 }} 
                  />
                  <XAxis 
                    dataKey="date" 
                    hide 
                  />
                  <YAxis hide />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={8}
                    fillOpacity={1} 
                    fill="url(#execWallGradient)" 
                    animationDuration={3000}
                  />
                </AreaChart>
              </ResponsiveContainer>
              
              <div className="absolute bottom-12 left-12 right-12 flex justify-between items-center text-slate-500">
                <p className="text-sm font-black uppercase tracking-widest">{format(new Date(chartData[0]?.date), 'dd MMM yyyy', { locale: fr })}</p>
                <div className="flex gap-2">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1 rounded-full bg-white/20" />
                  ))}
                </div>
                <p className="text-sm font-black uppercase tracking-widest">{format(new Date(), 'dd MMM yyyy', { locale: fr })}</p>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Bottom Ticker/Status */}
        <div className="absolute bottom-0 left-0 w-full p-12 bg-gradient-to-t from-black to-transparent flex items-center justify-between text-slate-500">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <p className="text-xs font-bold uppercase tracking-widest">Server: Online</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <p className="text-xs font-bold uppercase tracking-widest">Sync: Real-time</p>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Executive Dashboard // Private Access</p>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
