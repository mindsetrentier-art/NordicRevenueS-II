import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CloudRain, ChevronDown, ChevronUp, CheckCircle2, TrendingDown } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const generateInsights = async () => {
    if (!ai) {
      setError("Clé API Gemini manquante. Veuillez configurer la variable d'environnement VITE_GEMINI_API_KEY ou GEMINI_API_KEY.");
      return;
    }

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
      
      let weatherContext = "";
      if (weatherForecast) {
        weatherContext = `
        Prévisions météo pour les 7 prochains jours (températures min/max, précipitations en mm) :
        ${JSON.stringify({
          dates: weatherForecast.time,
          max_temp: weatherForecast.temperature_2m_max,
          min_temp: weatherForecast.temperature_2m_min,
          precipitation: weatherForecast.precipitation_sum
        })}
        `;
      }

      const prompt = `
        Tu es un analyste financier expert pour la restauration et le commerce de détail.
        Voici les données de chiffre d'affaires (CA) pour la période : ${periodLabel}.
        
        Évolution quotidienne du CA : ${JSON.stringify(revenueData)}
        Répartition des paiements : ${JSON.stringify(paymentData)}
        ${weatherContext}
        
        Rédige une analyse concise en français pour le gérant. Tu dois IMPÉRATIVEMENT répondre au format JSON valide avec la structure suivante exacte :
        {
          "summary": "Résumé de 3 ou 4 phrases identifiant la tendance principale du CA, incluant une remarque météo (s'il y a lieu), et donnant un conseil d'action globale.",
          "strengths": ["Point fort 1 (ex: Forte hausse du CA mardi)", "Point fort 2 (ex: Excellente proportion de paiements CB)"],
          "weaknesses": ["Point faible ou point d'attention 1 (ex: Baisse d'activité le jeudi)", "Point faible 2 (ex: Volume faible en espèces)"]
        }
        Ne renvoie que du JSON, sans formatage markdown \`\`\`json.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      let text = response.text || "{}";
      text = text.replace(/```json/gi, '').replace(/```/g, '').trim();
      
      const parsedData = JSON.parse(text) as InsightData;
      setInsights(parsedData);
      localStorage.setItem(`ai_insights_${periodLabel}`, JSON.stringify({ data: parsedData, timestamp: Date.now() }));
      localStorage.removeItem('ai_insights_quota_error');
    } catch (err: any) {
      console.error("Erreur IA:", err);
      if (err?.status === 429 || err.message?.includes('429') || err.message?.includes('RESOURCE_EXHAUSTED') || err.message?.includes('quota')) {
        localStorage.setItem('ai_insights_quota_error', Date.now().toString());
        setError("Quota d'utilisation de l'IA dépassé. Veuillez vérifier votre forfait Gemini ou réessayer plus tard.");
      } else if (err?.status === 401 || err?.status === 403 || err.message?.includes('API_KEY_INVALID')) {
        setError("Clé API Gemini invalide ou non autorisée. Veuillez vérifier vos paramètres.");
      } else {
        setError("Une erreur inattendue s'est produite lors de la génération de l'analyse IA.");
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
