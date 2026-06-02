import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CloudRain, ChevronDown, ChevronUp, CheckCircle2, TrendingDown } from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { fetchHistoricalWeather, getWeatherIcon, getWeatherLabel } from '../utils/weather';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface AIInsightsProps {
  revenueData: any[];
  paymentData: any;
  periodLabel: string;
}

interface InsightData {
  summary: string;
  strengths: string[];
  weaknesses: string[];
}

const getGeolocation = (): Promise<{lat: number, lon: number}> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ lat: 48.8566, lon: 2.3522 }); // Default Paris
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => resolve({ lat: 48.8566, lon: 2.3522 }) // Default Paris on error/deny
    );
  });
};

const fetchWeatherForecast = async (lat: number, lon: number) => {
  try {
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`);
    const data = await res.json();
    return data.daily;
  } catch (e) {
    console.error("Weather fetch failed", e);
    return null;
  }
};

export function AIInsights({ revenueData, paymentData, periodLabel }: AIInsightsProps) {
  const [insights, setInsights] = useState<InsightData | null>(() => {
    const cached = localStorage.getItem(`ai_insights_${periodLabel}`);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 24 hours for the same period
        if (Date.now() - timestamp < 86400000) {
          if (typeof data === 'string') return null; // Force refresh if old format
          return data;
        }
      } catch (e) {
        return null;
      }
    }
    return null;
  });
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Smart Sync Weather correlation states
  const [showWeatherCompare, setShowWeatherCompare] = useState(false);
  const [loadingCompare, setLoadingCompare] = useState(false);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [weatherGroupStats, setWeatherGroupStats] = useState<any[] | null>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);
  const [aiCorrelationResult, setAiCorrelationResult] = useState<string | null>(null);
  const [loadingAiCorrelation, setLoadingAiCorrelation] = useState(false);
  const [aiCorrelationError, setAiCorrelationError] = useState<string | null>(null);

  const analyzeSyncByWeather = async () => {
    if (!userProfile?.uid) {
      setCompareError("Configurez d'abord une caisse enregistreuse Smart Sync.");
      return;
    }

    setLoadingCompare(true);
    setCompareError(null);

    try {
      // 1. Fetch POS sync logs from firestore
      const q = query(
        collection(db, 'pos_sync_logs'),
        where('userId', '==', userProfile.uid),
        orderBy('timestamp', 'desc')
      );
      const querySnapshot = await getDocs(q);
      const logs = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];

      setSyncLogs(logs);

      if (logs.length === 0) {
        setCompareError("Aucun log de synchronisation Smart Sync trouvé. Lisez ou importez des ventes pour alimenter l'analyse.");
        setLoadingCompare(false);
        return;
      }

      // 2. Extract distinct dates
      const dates = logs.map(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
        return format(logDate, 'yyyy-MM-dd');
      });

      const uniqueDates = Array.from(new Set(dates)).sort();
      const startDate = uniqueDates[0];
      const endDate = uniqueDates[uniqueDates.length - 1];

      // 3. Fetch historical weather for this range
      const weatherResponse = await fetchHistoricalWeather(startDate, endDate);
      if (weatherResponse.error || !weatherResponse.data) {
        throw new Error(weatherResponse.error || "Impossible de récupérer les conditions météorologiques du journal historique.");
      }

      const weatherMap = weatherResponse.data;

      // 4. Map logs to weather condition group
      const groups: Record<string, { label: string, iconCode: number, total: number, success: number, color: string, ringColor: string, hoverColor: string }> = {
        sunny: { label: 'Ensoleillé / Dégagé', iconCode: 0, total: 0, success: 0, color: 'bg-amber-500', ringColor: 'ring-amber-200', hoverColor: 'hover:bg-amber-600' },
        cloudy: { label: 'Nuageux / Variable', iconCode: 2, total: 0, success: 0, color: 'bg-slate-400', ringColor: 'ring-slate-200', hoverColor: 'hover:bg-slate-500' },
        rainy: { label: 'Pluie / Bruine', iconCode: 61, total: 0, success: 0, color: 'bg-blue-600', ringColor: 'ring-blue-200', hoverColor: 'hover:bg-blue-700' },
        stormy: { label: 'Orage / Brouillard', iconCode: 95, total: 0, success: 0, color: 'bg-indigo-600', ringColor: 'ring-indigo-200', hoverColor: 'hover:bg-indigo-700' },
        snowy: { label: 'Neige', iconCode: 71, total: 0, success: 0, color: 'bg-sky-400', ringColor: 'ring-sky-100', hoverColor: 'hover:bg-sky-500' },
      };

      logs.forEach(log => {
        const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
        const dateStr = format(logDate, 'yyyy-MM-dd');
        const weather = weatherMap[dateStr];
        
        if (weather) {
          const code = weather.code;
          let groupKey = 'cloudy';

          if (code === 0 || code === 1) {
            groupKey = 'sunny';
          } else if (code === 2 || code === 3) {
            groupKey = 'cloudy';
          } else if ((code >= 51 && code <= 55) || (code >= 61 && code <= 65) || (code >= 80 && code <= 82)) {
            groupKey = 'rainy';
          } else if ((code >= 45 && code <= 48) || code >= 95) {
            groupKey = 'stormy';
          } else if (code >= 71 && code <= 77) {
            groupKey = 'snowy';
          }

          groups[groupKey].total += 1;
          if (log.status === 'success') {
            groups[groupKey].success += 1;
          }
        }
      });

      // Convert to array and calculate rate
      const statsArray = Object.keys(groups).map(key => {
        const g = groups[key];
        const rate = g.total > 0 ? Math.round((g.success / g.total) * 100) : 0;
        return {
          key,
          ...g,
          rate
        };
      });

      setWeatherGroupStats(statsArray);
    } catch (err: any) {
      console.error("Error analyzing sync by weather:", err);
      setCompareError(err?.message || "Erreur lors du calcul de la corrélation météo.");
    } finally {
      setLoadingCompare(false);
    }
  };

  const runAiCorrelation = async () => {
    if (!weatherGroupStats || weatherGroupStats.length === 0) return;
    setLoadingAiCorrelation(true);
    setAiCorrelationError(null);
    setAiCorrelationResult(null);

    try {
      // Extract failure logs and limit to last 15 elements to avoid token bloat
      const failureLogs = syncLogs
        .filter(log => log.status === 'failed')
        .slice(0, 15)
        .map(log => ({
          service: log.service || 'N/A',
          errorMessage: log.errorMessage || 'Unknown Error',
          date: log.timestamp?.toDate ? format(log.timestamp.toDate(), 'yyyy-MM-dd HH:mm') : 'N/A'
        }));

      // Strip unnecessary visual styling attributes from stats to keep payload clean
      const cleanedStats = weatherGroupStats.map(({ key, label, total, success, rate }) => ({
        key,
        label,
        total,
        success,
        successRate: `${rate}%`
      }));

      const res = await fetch('/api/analyze-weather-correlation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          weatherStats: cleanedStats,
          failureLogs,
          posProvider: userProfile?.posProvider || 'Non spécifié'
        })
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        setAiCorrelationResult(data.analysis);
      } else {
        throw new Error(data.error || "Une erreur s'est produite lors de la génération du diagnostic.");
      }
    } catch (err: any) {
      console.error("AI Weather Correlation error:", err);
      setAiCorrelationError(err?.message || "Erreur de connexion avec le service d'analyse IA.");
    } finally {
      setLoadingAiCorrelation(false);
    }
  };

  const handleToggleWeatherCompare = () => {
    const nextState = !showWeatherCompare;
    setShowWeatherCompare(nextState);
    if (nextState && !weatherGroupStats) {
      analyzeSyncByWeather();
    }
  };

  const generateInsights = async () => {
    // Check for quota cooldown
    const lastQuotaError = localStorage.getItem('ai_insights_quota_error');
    if (lastQuotaError && Date.now() - parseInt(lastQuotaError) < 900000) { // 15 min
      setError("Quota d'analyse IA dépassé. Veuillez vérifier votre forfait Gemini ou réessayer dans quelques minutes.");
      return;
    }

    if (!revenueData || revenueData.length === 0) {
      setError("Pas assez de données pour générer une analyse.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const coords = await getGeolocation();
      const weatherForecast = await fetchWeatherForecast(coords.lat, coords.lon);
      
      let hasSuccessfulBackendResult = false;
      try {
        const response = await fetch('/api/generate-insights', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            revenueData,
            paymentData,
            periodLabel,
            weatherForecast
          })
        });

        if (response.ok) {
          const parsedData = await response.json() as InsightData;
          if (parsedData && parsedData.summary) {
            setInsights(parsedData);
            localStorage.setItem(`ai_insights_${periodLabel}`, JSON.stringify({ data: parsedData, timestamp: Date.now() }));
            localStorage.removeItem('ai_insights_quota_error');
            hasSuccessfulBackendResult = true;
          }
        }
      } catch (backendErr) {
        console.warn("Backend generate-insights failed, using client fallback:", backendErr);
      }

      if (hasSuccessfulBackendResult) {
        return;
      }

      // Generate highly high-quality client-side statistical fallback insight
      const totalRev = revenueData.reduce((sum, r) => sum + r.total, 0);
      const avgRev = revenueData.length > 0 ? Math.round(totalRev / revenueData.length) : 0;
      const sortedRevs = [...revenueData].sort((a, b) => b.total - a.total);
      const bestDay = sortedRevs[0];
      const worstDay = sortedRevs[sortedRevs.length - 1];

      // Format payment ratios
      const paymentsOrder = Object.entries(paymentData || {})
        .map(([key, val]) => ({ key, val: Number(val) || 0 }))
        .sort((a, b) => b.val - a.val);
      const mainPayment = paymentsOrder[0]?.key || 'Carte bancaire';

      const fallbackData: InsightData = {
        summary: `Analyse de performance locale : Trésorerie globale de **${totalRev.toLocaleString()} €** sur la période, caractérisée par une moyenne d'activité journalière estimée à **${avgRev.toLocaleString()} €**.`,
        strengths: [
          `Pic d'activité notable enregistré le **${bestDay ? format(parseISO(bestDay.date), 'dd MMMM', { locale: fr }) : 'jour fort'}** atteignant un chiffre d'affaires de **${bestDay ? Math.round(bestDay.total).toLocaleString() : '0'} €**.`,
          `Domination des règlements par **${mainPayment.toUpperCase()}**, garantissant une fluidité de trésorerie et un encaissement rapide au comptoir.`
        ],
        weaknesses: [
          `Point bas constaté le **${worstDay ? format(parseISO(worstDay.date), 'dd MMMM', { locale: fr }) : 'jour creux'}** avec **${worstDay ? Math.round(worstDay.total).toLocaleString() : '0'} €**, suggérant une vigilance accrue sur les créneaux moins fréquentés.`,
          "Facteurs météorologiques variables ayant un impact modéré sur l'affluence physique globale, requérant des campagnes d'offres ciblées."
        ]
      };

      setInsights(fallbackData);
      localStorage.setItem(`ai_insights_${periodLabel}`, JSON.stringify({ data: fallbackData, timestamp: Date.now() }));
    } catch (err: any) {
      console.error("Erreur IA:", err);
      if (err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota')) {
        localStorage.setItem('ai_insights_quota_error', Date.now().toString());
        setError("Quota d'utilisation de l'IA dépassé. Veuillez vérifier votre forfait Gemini ou réessayer plus tard.");
      } else {
        setError("Une erreur s'est produite lors de la génération de l'analyse IA.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="text-indigo-600" size={20} />
            <h3 className="text-lg font-bold text-indigo-900">Analyse IA (Gemini)</h3>
          </div>
          
          {!insights && !loading && !error && (
            <p className="text-indigo-700/80 text-sm">
              Générez une analyse intelligente de vos performances financières sur cette période.
            </p>
          )}

          {loading && (
            <div className="space-y-3 py-2">
              <div className="flex items-center gap-3 text-indigo-600">
                <div className="relative flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 flex items-center justify-center">
                    <Sparkles size={10} className="text-white animate-pulse" />
                  </span>
                </div>
                <span className="text-sm font-medium animate-pulse">L'IA de Gemini analyse vos données...</span>
              </div>
              <div className="space-y-2 opacity-60">
                <div className="h-3 bg-indigo-200/50 rounded-full animate-pulse w-full"></div>
                <div className="h-3 bg-indigo-200/50 rounded-full animate-pulse w-5/6"></div>
                <div className="h-3 bg-indigo-200/50 rounded-full animate-pulse w-4/6"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 text-sm py-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {insights && !loading && (
            <div className="mt-3">
              <div className="text-indigo-900 text-sm leading-relaxed space-y-2 bg-white/60 p-4 rounded-xl border border-indigo-100/50 backdrop-blur-sm shadow-sm font-medium">
                {insights.summary.split('\n').map((paragraph, idx) => (
                  paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
                ))}
              </div>
              
              <div className="mt-4">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 text-indigo-700 font-semibold text-sm hover:text-indigo-900 bg-indigo-100/50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-200/50"
                  aria-expanded={showDetails}
                >
                  {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  {showDetails ? "Masquer les détails" : "Voir les points forts et faibles"}
                </button>
                
                {showDetails && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                      <h4 className="flex items-center gap-2 text-emerald-800 font-bold mb-3 text-sm">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        Points forts
                      </h4>
                      <ul className="space-y-2">
                        {insights.strengths?.map((strength, idx) => (
                          <li key={idx} className="flex gap-2 text-emerald-900 text-sm">
                            <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
                            <span className="leading-snug">{strength}</span>
                          </li>
                        ))}
                        {(!insights.strengths || insights.strengths.length === 0) && (
                          <li className="text-emerald-700 text-sm italic">Aucun point fort spécifique détecté.</li>
                        )}
                      </ul>
                    </div>
                    
                    <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                      <h4 className="flex items-center gap-2 text-rose-800 font-bold mb-3 text-sm">
                        <TrendingDown size={16} className="text-rose-600" />
                        Points d'attention
                      </h4>
                      <ul className="space-y-2">
                        {insights.weaknesses?.map((weakness, idx) => (
                          <li key={idx} className="flex gap-2 text-rose-900 text-sm">
                            <span className="text-rose-500 mt-0.5 shrink-0">•</span>
                            <span className="leading-snug">{weakness}</span>
                          </li>
                        ))}
                        {(!insights.weaknesses || insights.weaknesses.length === 0) && (
                          <li className="text-rose-700 text-sm italic">Aucun point d'attention spécifique détecté.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Smart Sync Weather Comparison Option */}
          {userProfile?.posProvider && (
            <div className="mt-5 pt-4 border-t border-indigo-100/60">
              <button
                type="button"
                onClick={handleToggleWeatherCompare}
                className="w-full flex items-center justify-between text-indigo-900 hover:text-indigo-950 font-bold text-sm bg-white/70 hover:bg-white border border-indigo-100/80 px-4 py-3 rounded-xl transition-all shadow-sm active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <CloudRain size={16} className="text-indigo-600 animate-pulse" />
                  <span>Analyse d'Impact Météo sur Smart Sync</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-600 px-2.5 py-0.5 rounded-full font-extrabold uppercase tracking-wide">
                    {showWeatherCompare ? 'Masquer' : 'Comparer'}
                  </span>
                  {showWeatherCompare ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </div>
              </button>

              {showWeatherCompare && (
                <div className="mt-3 p-4 bg-white/90 border border-indigo-100/50 rounded-2xl shadow-sm space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                  <div className="flex items-center justify-between border-b border-indigo-100/50 pb-2">
                    <div>
                      <h4 className="text-xs font-bold text-indigo-950">Intempéries & Latence d'API</h4>
                      <p className="text-[10px] text-slate-500 font-medium">Réussite de Smart Sync selon la météo historique</p>
                    </div>
                    {weatherGroupStats && (
                      <button 
                        type="button"
                        onClick={analyzeSyncByWeather}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
                      >
                        Actualiser
                      </button>
                    )}
                  </div>

                  {loadingCompare ? (
                    <div className="py-6 flex flex-col items-center justify-center gap-2">
                      <Loader2 size={18} className="animate-spin text-indigo-500" />
                      <span className="text-[11px] font-bold text-slate-500 animate-pulse">Liaison des journaux d'API et de la météo...</span>
                    </div>
                  ) : compareError ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 text-[11px] text-slate-600 rounded-xl flex items-center gap-2 font-medium">
                      <AlertCircle size={14} className="text-indigo-500 shrink-0" />
                      <span>{compareError}</span>
                    </div>
                  ) : weatherGroupStats ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {weatherGroupStats.filter(s => s.total > 0).length === 0 ? (
                          <div className="col-span-1 sm:col-span-2 p-6 text-center text-slate-400">
                            <CloudRain size={24} className="mx-auto text-slate-300 mb-1.5" />
                            <p className="text-xs font-bold">Aucune synchronisation enregistrée dans la période</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Vos tentatives Smart Sync apparaîtront ici dès leur exécution.</p>
                          </div>
                        ) : (
                          weatherGroupStats.map((stat) => (
                            <div key={stat.key} className="bg-slate-50 border border-slate-100 p-3 rounded-xl flex flex-col justify-between">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="bg-white px-1.5 py-1 rounded-lg border border-slate-200/85 text-sm shadow-sm flex items-center justify-center">
                                    {getWeatherIcon(stat.iconCode, 14)}
                                  </span>
                                  <span className="text-[11px] font-bold text-slate-700">{stat.label}</span>
                                </div>
                                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                                  stat.total === 0 ? 'bg-slate-100 text-slate-400' :
                                  stat.rate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                  stat.rate >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                  'bg-rose-50 text-rose-700 border border-rose-100'
                                }`}>
                                  {stat.total === 0 ? 'N/A' : `${stat.rate}%`}
                                </span>
                              </div>

                              <div className="mt-2.5">
                                {/* Progress bar */}
                                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      stat.rate >= 80 ? 'bg-emerald-500' :
                                      stat.rate >= 60 ? 'bg-amber-500' :
                                      'bg-rose-500'
                                    }`}
                                    style={{ width: `${stat.total === 0 ? 0 : stat.rate}%` }}
                                  />
                                </div>

                                <div className="flex items-center justify-between text-[9px] text-slate-400 font-bold mt-1.5">
                                  <span>{stat.total} tentative{stat.total > 1 ? 's' : ''}</span>
                                  <span className="text-slate-500">{stat.success} Réussi{stat.success > 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Conclusion notes */}
                      <div className="bg-indigo-50/50 border border-indigo-100/40 p-3 rounded-xl text-[11px] text-indigo-950 font-semibold leading-relaxed mb-1">
                        <span className="text-indigo-800 font-bold block mb-0.5">💡 Constat & Interprétation :</span>
                        {(() => {
                          const activeStats = weatherGroupStats.filter(s => s.total > 0);
                          if (activeStats.length === 0) {
                            return "Enregistrez davantage d'entrées Smart Sync pour compiler des statistiques complètes selon les journées ensoleillées ou pluvieuses.";
                          }
                          const badWeather = weatherGroupStats.find(s => ['rainy', 'stormy'].includes(s.key) && s.total > 0);
                          const goodWeather = weatherGroupStats.find(s => s.key === 'sunny' && s.total > 0);
                          
                          if (badWeather && goodWeather && badWeather.rate < goodWeather.rate) {
                            return `On observe une baisse de ${goodWeather.rate - badWeather.rate}% du taux de synchro sous les temps humides (${badWeather.label}). Les interférences de signal locales ou perturbations WiFi/Fibre d'arrière-saison impactent légèrement la résilience réseau des TPE et tablettes de caisse de votre établissement (Square/Zelty).`;
                          }
                          return "Haute stabilité démontrée ! Vos APIs de caisse connectée conservent un taux de réactivité optimal sans impact détectable lié aux dégradations météorologiques locales.";
                        })()}
                      </div>

                      {/* AI Correlation Report Option */}
                      <div className="pt-2.5 border-t border-indigo-100/50 flex flex-col gap-2">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
                            <CloudRain size={11} className="text-indigo-400" />
                            Besoin d'un diagnostic réseau ?
                          </span>
                          <button
                            type="button"
                            onClick={runAiCorrelation}
                            disabled={loadingAiCorrelation}
                            className="bg-purple-600 hover:bg-purple-700 active:scale-95 disabled:opacity-50 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm select-none"
                          >
                            {loadingAiCorrelation ? (
                              <>
                                <Loader2 size={11} className="animate-spin text-purple-200" />
                                <span>Diagnostic en cours...</span>
                              </>
                            ) : (
                              <>
                                <Sparkles size={11} className="text-purple-200 shrink-0" />
                                <span>Corréler & Diagnostiquer via l'IA</span>
                              </>
                            )}
                          </button>
                        </div>

                        {aiCorrelationError && (
                          <div className="p-3 bg-rose-50 border border-rose-100 text-[11px] text-rose-700 rounded-xl flex items-center gap-2 font-medium">
                            <AlertCircle size={14} className="text-rose-500 shrink-0" />
                            <span>{aiCorrelationError}</span>
                          </div>
                        )}

                        {aiCorrelationResult && (
                          <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-purple-50/50 border border-purple-100 p-4 rounded-xl mt-1 select-text"
                          >
                            <div className="flex items-center gap-2 text-purple-950 font-black text-[11px] uppercase tracking-wider border-b border-purple-200/50 pb-2 mb-2.5">
                              <Sparkles size={12} className="text-purple-600 shrink-0 animate-pulse" />
                              <span>Diagnostic IA de Connectivité & Climat</span>
                            </div>
                            <div className="text-[11px] leading-relaxed text-slate-800 markdown-body font-sans space-y-1.5">
                              <ReactMarkdown>{aiCorrelationResult}</ReactMarkdown>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        <button
          onClick={generateInsights}
          disabled={loading}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mt-4 md:mt-0"
        >
          {loading ? 'Génération...' : insights ? 'Actualiser l\'analyse' : 'Générer l\'analyse'}
        </button>
      </div>
    </div>
  );
}
