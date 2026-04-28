import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Cloud, 
  CreditCard, 
  Banknote, 
  Receipt, 
  Landmark, 
  ArrowRight,
  TrendingUp,
  Calendar,
  CloudRain,
  Sun,
  CloudLightning,
  Snowflake,
  Wind,
  Coffee,
  Moon,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { getWeatherIcon } from '../utils/weather';
import clsx from 'clsx';

interface DailyReportStripProps {
  chartData: any[];
  weatherData: Record<string, { temp: number, code: number }>;
}

export function DailyReportStrip({ chartData, weatherData }: DailyReportStripProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Show last 5 days by default if not expanded
  const displayData = isExpanded ? chartData : chartData.slice(-5);
  const showToggleButton = chartData.length > 5;

  return (
    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
            <Calendar size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Journal de Bord Analytique</h2>
            <p className="text-xs text-slate-500 font-medium tracking-wide lowercase">Détails croisés CA, météo et paiements par jour</p>
          </div>
        </div>

        {showToggleButton && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-2 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl transition-all font-black text-[10px] uppercase tracking-widest border border-slate-200 group"
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} className="group-hover:-translate-y-0.5 transition-transform" />
                Réduire l'affichage
              </>
            ) : (
               <>
                <ChevronDown size={16} className="group-hover:translate-y-0.5 transition-transform" />
                Visualiser l'ensemble ({chartData.length} jours)
              </>
            )}
          </button>
        )}
      </div>

      <div className="space-y-4">
        <AnimatePresence initial={false}>
          {displayData.map((day, idx) => {
            const weather = weatherData[day.date];
            const isWeekend = [0, 6].includes(new Date(day.date).getDay());
            
            return (
              <motion.div
                key={day.date}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={clsx(
                  "group relative grid grid-cols-12 gap-4 items-center p-4 rounded-3xl transition-all border",
                  isWeekend ? "bg-indigo-50/30 border-indigo-100/50" : "bg-white border-slate-50 hover:border-slate-200 hover:shadow-xl hover:shadow-slate-200/40"
                )}
              >
              {/* Date & Météo */}
              <div className="col-span-12 md:col-span-3 flex items-center gap-4">
                <div className="flex flex-col min-w-[60px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">
                    {format(new Date(day.date), 'EEE', { locale: fr })}
                  </span>
                  <span className="text-xl font-black text-slate-900 tracking-tighter">
                    {format(new Date(day.date), 'dd MMM', { locale: fr })}
                  </span>
                </div>
                
                <div className={clsx(
                  "flex items-center gap-3 px-4 py-2 rounded-2xl border",
                  weather ? "bg-white border-slate-100 shadow-sm" : "bg-slate-50 border-transparent italic text-slate-400 text-[10px]"
                )}>
                  {weather ? (
                    <>
                      <div className="text-blue-500 drop-shadow-sm">
                        {getWeatherIcon(weather.code, 20)}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-black text-slate-700 leading-none">{Math.round(weather.temp)}°</span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Max</span>
                      </div>
                    </>
                  ) : (
                    "N/A"
                  )}
                </div>
              </div>

              {/* Chiffre d'Affaires Breakdown */}
              <div className="col-span-12 md:col-span-3 flex items-center gap-6">
                 <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">C.A du Jour</span>
                    <span className="text-lg font-black text-slate-900">
                      {day.total.toLocaleString('fr-FR')} €
                    </span>
                 </div>
                 
                 <div className="flex items-center gap-3 h-8 border-l border-slate-100 pl-4">
                   {day.midi > 0 && (
                     <div className="flex flex-col">
                       <div className="flex items-center gap-1">
                         <Coffee size={10} className="text-amber-500" />
                         <span className="text-[9px] font-black text-slate-400 uppercase">Midi</span>
                       </div>
                       <span className="text-xs font-bold text-slate-700">{day.midi.toLocaleString('fr-FR')} €</span>
                     </div>
                   )}
                   {day.soir > 0 && (
                     <div className="flex flex-col">
                       <div className="flex items-center gap-1">
                         <Moon size={10} className="text-indigo-500" />
                         <span className="text-[9px] font-black text-slate-400 uppercase">Soir</span>
                       </div>
                       <span className="text-xs font-bold text-slate-700">{day.soir.toLocaleString('fr-FR')} €</span>
                     </div>
                   )}
                 </div>
              </div>

              {/* Payments Breakdown */}
              <div className="col-span-12 md:col-span-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <CreditCard size={12} className="text-blue-500" />
                  <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">CB: {day.cb.toLocaleString('fr-FR')}€</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                  <Banknote size={12} className="text-emerald-500" />
                  <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">Cash: {day.cash.toLocaleString('fr-FR')}€</span>
                </div>
                {day.tr > 0 && (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                    <Receipt size={12} className="text-rose-500" />
                    <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">TR: {day.tr.toLocaleString('fr-FR')}€</span>
                  </div>
                )}
                {day.amex > 0 && (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                    <Landmark size={12} className="text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">Amex: {day.amex.toLocaleString('fr-FR')}€</span>
                  </div>
                )}
                {day.transfer > 0 && (
                  <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl">
                    <ArrowRight size={12} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-700 whitespace-nowrap">Virement: {day.transfer.toLocaleString('fr-FR')}€</span>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
        </AnimatePresence>
      </div>
    </div>
  );
}
