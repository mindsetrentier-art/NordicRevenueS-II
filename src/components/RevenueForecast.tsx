import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, TrendingUp, Calendar, Cloud, Loader2, AlertCircle, Info, ChevronRight, Users } from 'lucide-react';
import { format, addDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { GoogleGenAI, Type } from "@google/genai";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import { fetchHistoricalWeather, getWeatherIcon } from '../utils/weather';
import clsx from 'clsx';

interface RevenueForecastProps {
  historicalData: { date: string; total: number }[];
  establishmentName: string;
}

interface PredictionDay {
  date: string;
  predictedRevenue: number;
  confidence: number;
  reasoning: string;
  staffRecommendation: number;
}

export function RevenueForecast({ historicalData, establishmentName }: RevenueForecastProps) {
  const [predictions, setPredictions] = useState<PredictionDay[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insight, setInsight] = useState<string>('');

  const generateForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = new Date();
      const startDate = format(today, 'yyyy-MM-dd');
      const endDate = format(addDays(today, 7), 'yyyy-MM-dd');

      // 1. Fetch upcoming weather
      const weatherRes = await fetchHistoricalWeather(startDate, endDate);
      if (weatherRes.error || !weatherRes.data) {
        throw new Error(weatherRes.error || "Impossible de récupérer les prévisions météo");
      }

      // 2. Initialize Gemini
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      
      // 3. Prepare prompt
      const historyStr = historicalData.slice(-30).map(d => `${d.date}: ${d.total}€`).join('\n');
      const weatherStr = Object.entries(weatherRes.data as Record<string, { temp: number, code: number }>).map(([date, w]) => `${date}: ${w.temp}°C, code ${w.code}`).join('\n');

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Tu es un expert en analyse financière et prévisionnelle pour le secteur de la restauration et de l'hôtellerie.
        
        Établissement: ${establishmentName}
        Historique des 30 derniers jours (CA):
        ${historyStr}
        
        Prévisions météo pour les 7 prochains jours:
        ${weatherStr}
        
        Ta mission:
        1. Prédire le Chiffre d'Affaires journalier pour les 7 prochains jours.
        2. Suggérer le nombre d'employés (staff) optimal pour chaque jour (en te basant sur le CA prédit, sachant qu'en moyenne un employé gère environ 400-600€ de CA).
        
        Réponds UNIQUEMENT au format JSON comme suit:
        {
          "predictions": [
            { 
              "date": "YYYY-MM-DD", 
              "predictedRevenue": 1500, 
              "confidence": 0.85, 
              "reasoning": "Texte court expliquant la prédiction",
              "staffRecommendation": 3
            }
          ],
          "globalInsight": "Une synthèse de 2 phrases sur la tendance à venir"
        }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              predictions: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    date: { type: Type.STRING },
                    predictedRevenue: { type: Type.NUMBER },
                    confidence: { type: Type.NUMBER },
                    reasoning: { type: Type.STRING },
                    staffRecommendation: { type: Type.NUMBER }
                  },
                  required: ['date', 'predictedRevenue', 'confidence', 'reasoning', 'staffRecommendation']
                }
              },
              globalInsight: { type: Type.STRING }
            },
            required: ['predictions', 'globalInsight']
          }
        }
      });

      const result = JSON.parse(response.text);
      setPredictions(result.predictions);
      setInsight(result.globalInsight);
    } catch (err) {
      console.error("Forecast Error:", err);
      setError("Impossible de générer les prévisions. Veuillez réessayer plus tard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (historicalData.length > 0 && predictions.length === 0) {
      generateForecast();
    }
  }, [historicalData]);

  const combinedData = [
    ...historicalData.slice(-7).map(d => ({ ...d, type: 'actual' })),
    ...predictions.map(p => ({ date: p.date, total: p.predictedRevenue, type: 'forecast', ...p }))
  ];

  return (
    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white border border-slate-800 shadow-2xl relative overflow-hidden group">
      {/* Background Glow */}
      <div className="absolute -top-24 -right-24 w-64 h-64 bg-blue-600/20 blur-[100px] rounded-full group-hover:bg-blue-600/30 transition-all" />
      
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
              <Sparkles size={18} />
            </div>
            <h2 className="text-xl font-black tracking-tight">Prédictions IA</h2>
          </div>
          <p className="text-xs text-slate-400 font-medium ml-10">Prévisions basées sur l'historique et la météo</p>
        </div>
        
        <button 
          onClick={generateForecast}
          disabled={loading}
          className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 group/btn"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} className="group-hover/btn:scale-110 transition-transform" />}
          Actualiser
        </button>
      </div>

      {predictions.some(p => p.predictedRevenue > 2500) && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-center gap-4 relative z-10"
        >
          <div className="p-2 bg-amber-500 text-white rounded-xl shadow-lg shadow-amber-500/20">
            <AlertCircle size={20} />
          </div>
          <div>
            <p className="text-sm font-black text-amber-500 uppercase tracking-tight">Alerte Affluence</p>
            <p className="text-xs text-amber-200/70 font-medium">
              Forte affluence prévue {format(parseISO(predictions.find(p => p.predictedRevenue > 2500)?.date || ''), 'EEEE', { locale: fr })}. Prévoyez un renfort en salle.
            </p>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
        <div className="lg:col-span-2">
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center bg-white/5 rounded-3xl border border-white/10">
              <Loader2 size={40} className="text-blue-500 animate-spin mb-4" />
              <p className="text-sm font-medium text-slate-400">Analyse des tendances par Gemini...</p>
            </div>
          ) : error ? (
            <div className="h-64 flex flex-col items-center justify-center bg-rose-500/10 rounded-3xl border border-rose-500/20 p-6 text-center">
              <AlertCircle size={40} className="text-rose-500 mb-4" />
              <p className="text-sm font-medium text-rose-200">{error}</p>
            </div>
          ) : predictions.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={combinedData}>
                  <defs>
                    <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(date) => format(parseISO(date), 'dd/MM')}
                  />
                  <YAxis hide />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl">
                            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                              {format(parseISO(data.date), 'EEEE dd MMMM', { locale: fr })}
                            </p>
                            <p className="text-lg font-black text-white">
                              {data.total.toLocaleString('fr-FR')} €
                            </p>
                            {data.type === 'forecast' && (
                              <div className="mt-2 text-[10px] text-blue-400 font-bold bg-blue-400/10 px-2 py-1 rounded inline-block">
                                PRÉVISION IA ({Math.round(data.confidence * 100)}%)
                              </div>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#3b82f6" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#actualGradient)" 
                    data={combinedData.filter(d => d.type === 'actual')}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#8b5cf6" 
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    fillOpacity={1} 
                    fill="url(#forecastGradient)" 
                    data={combinedData.filter(d => d.type === 'forecast')}
                  />
                  <ReferenceLine x={historicalData[historicalData.length - 1]?.date} stroke="#ffffff20" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-blue-500 rounded" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Réalisé</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-1 bg-violet-500 rounded border-dashed border-t border-b" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Anticipé</span>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest flex items-center gap-2 mb-4">
              <Info size={14} />
              Conseil Stratégique
            </h3>
            {loading ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-4 bg-white/10 rounded w-full" />
                <div className="h-4 bg-white/10 rounded w-4/5" />
              </div>
            ) : (
              <p className="text-sm text-slate-300 leading-relaxed font-medium italic">
                "{insight || 'Génération de l\'analyse en cours...'}"
              </p>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Focus sur les prochains jours</h3>
            {predictions.slice(0, 3).map((p, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl group/item hover:bg-white/10 transition-all overflow-hidden relative">
                {p.staffRecommendation >= 5 && (
                  <div className="absolute top-0 right-0 w-1 h-full bg-amber-500" />
                )}
                <div className="flex items-center gap-3">
                  <div className="text-center min-w-[40px]">
                    <p className="text-[10px] font-bold text-slate-500 uppercase">{format(parseISO(p.date), 'EEE', { locale: fr })}</p>
                    <p className="text-sm font-black text-white">{format(parseISO(p.date), 'dd')}</p>
                  </div>
                  <div className="h-8 w-px bg-white/10" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-bold text-white uppercase">{p.predictedRevenue.toLocaleString('fr-FR')} €</p>
                      <div className={clsx(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black uppercase",
                        p.staffRecommendation >= 5 ? "bg-amber-500/20 text-amber-500" : "bg-blue-500/20 text-blue-400"
                      )}>
                        <Users size={10} />
                        {p.staffRecommendation}
                      </div>
                    </div>
                    <p className="text-[9px] text-slate-500 font-medium truncate max-w-[120px]">{p.reasoning}</p>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-600 group-hover/item:text-blue-400 transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
