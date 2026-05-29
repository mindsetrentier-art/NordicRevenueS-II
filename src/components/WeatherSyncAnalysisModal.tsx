import React, { useEffect, useState } from 'react';
import { X, CloudRain, ShieldAlert, CheckCircle2, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, query, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { fetchHourlyWeather, getWeatherIcon, getWeatherLabel } from '../utils/weather';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip as RechartsTooltip, ResponsiveContainer, ComposedChart 
} from 'recharts';

interface WeatherSyncAnalysisModalProps {
  onClose: () => void;
}

export function WeatherSyncAnalysisModal({ onClose }: WeatherSyncAnalysisModalProps) {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;
      try {
        setLoading(true);
        // Fetch last 7 days of logs
        const endDate = new Date();
        const startDate = subDays(endDate, 7);
        
        const logsRef = collection(db, 'pos_sync_logs');
        // Simple query without complex filters to avoid missing index
        const q = query(
          logsRef,
          orderBy('timestamp', 'desc'),
          limit(500)
        );
        
        const querySnapshot = await getDocs(q);
        const logs = querySnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id
        })) as any[];
        
        // Filter by user
        const userLogs = logs.filter(log => log.userId === userProfile.uid);
        
        if (userLogs.length === 0) {
          setError("Aucun historique de synchronisation récent trouvé.");
          setLoading(false);
          return;
        }

        const startTimestamp = userLogs[userLogs.length - 1].timestamp.toDate();
        const endTimestamp = userLogs[0].timestamp.toDate();
        
        const weatherRes = await fetchHourlyWeather(
          format(startOfDay(startTimestamp), 'yyyy-MM-dd'),
          format(endOfDay(endTimestamp), 'yyyy-MM-dd')
        );
        
        if (weatherRes.error || !weatherRes.data) {
          setError(weatherRes.error || "Impossible de récupérer les données horaires.");
          setLoading(false);
          return;
        }
        
        const hourlyData = weatherRes.data;
        
        // Map data: Group logs by hour and correlate with precipitation
        const hourlyMap: Record<string, { time: string, timeLabel: string, timestamp: number, fails: number, success: number, precipitation: number, weatherCode: number }> = {};
        
        hourlyData.time.forEach((t: string, idx: number) => {
          const date = new Date(t);
          const timeKey = format(date, 'yyyy-MM-dd-HH');
          
          hourlyMap[timeKey] = {
            time: timeKey,
            timeLabel: format(date, 'dd MMM, HH:mm', { locale: fr }),
            timestamp: date.getTime(),
            fails: 0,
            success: 0,
            precipitation: hourlyData.precipitation[idx] || 0,
            weatherCode: hourlyData.weathercode[idx] || 0,
          };
        });
        
        userLogs.forEach(log => {
          if (!log.timestamp?.toDate) return;
          const logDate = log.timestamp.toDate();
          const timeKey = format(logDate, 'yyyy-MM-dd-HH');
          if (hourlyMap[timeKey]) {
            if (log.status === 'failed') hourlyMap[timeKey].fails += 1;
            if (log.status === 'success') hourlyMap[timeKey].success += 1;
          }
        });
        
        // Filter only the timeline that has logs or significant precipitation
        const finalChartData = Object.values(hourlyMap)
          .filter(d => d.fails > 0 || d.success > 0 || d.precipitation > 0)
          .sort((a, b) => a.timestamp - b.timestamp);
          
        setChartData(finalChartData);
      } catch (err: any) {
        console.error('Error analyzing sync weather:', err);
        setError("Erreur technique lors de l'analyse.");
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [userProfile]);

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
      >
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="flex justify-between items-center p-6 border-b border-slate-100">
            <div>
              <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <CloudRain className="text-blue-500" />
                Analyse Profonde : Climat & Connectivité
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                Comparaison horaire des échecs de synchronisation Pos et de la météo (précipitations)
              </p>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 hover:text-slate-700 cursor-pointer"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
            {loading ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-3">
                <History className="animate-spin text-blue-500" size={32} />
                <span className="font-medium text-sm">Analyse et corrélation des logs en cours...</span>
              </div>
            ) : error ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-6 rounded-2xl flex items-center gap-3">
                <ShieldAlert size={24} className="text-rose-500 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="bg-white border border-slate-200 text-slate-600 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                <CheckCircle2 size={40} className="text-emerald-400 mb-3" />
                <h3 className="font-bold text-lg text-slate-800">Aucune anomalie détectée</h3>
                <p className="text-sm">Pas d'échecs rencontrés dans les dernières archives ou données trop éparses pour être corrélées.</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
                  <h3 className="text-sm font-black text-slate-900 mb-4 uppercase tracking-wider">Volume des échecs vs Précipitations (mm)</h3>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis 
                          dataKey="timeLabel" 
                          tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          dy={10}
                        />
                        <YAxis 
                          yAxisId="left"
                          tick={{ fill: '#ef4444', fontSize: 10, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                          dx={-10}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          tick={{ fill: '#3b82f6', fontSize: 10, fontWeight: 700 }}
                          axisLine={false}
                          tickLine={false}
                          dx={10}
                        />
                        <RechartsTooltip 
                          contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)', padding: '16px' }}
                          labelStyle={{ fontWeight: 'bold', color: '#0f172a', marginBottom: '8px' }}
                        />
                        <Bar yAxisId="left" dataKey="fails" name="Échecs API" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                        <Line yAxisId="right" type="monotone" dataKey="precipitation" name="Pluie (mm)" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: '#fff' }} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-2xl">
                    <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-wider mb-1">Météo</h4>
                    <p className="text-xs text-blue-900/80 leading-relaxed font-medium">Les précipitations intenses ou orages perturbent parfois les réseaux 4G/5G locaux ou infrastructures de cuivre vieillissantes.</p>
                  </div>
                  <div className="bg-rose-50/50 border border-rose-100 p-5 rounded-2xl">
                    <h4 className="text-[10px] font-black text-rose-800 uppercase tracking-wider mb-1">Caisse Connectée</h4>
                    <p className="text-xs text-rose-900/80 leading-relaxed font-medium">Des pics rouges correspondant aux lignes bleues démontreraient une fragilité structurelle de la connectivité réseau au climat (liaison instable).</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
