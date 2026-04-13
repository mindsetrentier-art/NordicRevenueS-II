import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CloudRain } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface AIInsightsProps {
  revenueData: any[];
  paymentData: any;
  periodLabel: string;
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
  const [insights, setInsights] = useState<string | null>(() => {
    const cached = localStorage.getItem(`ai_insights_${periodLabel}`);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 24 hours for the same period
        if (Date.now() - timestamp < 86400000) {
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
        
        Rédige une analyse très concise (3 ou 4 phrases courtes) en français pour le gérant.
        1. Identifie la tendance principale du CA (hausse, baisse, jours forts).
        2. S'il y a des prévisions météo, fais une prédiction ou donne un conseil basé sur la météo à venir et l'historique (ex: "Pluie prévue ce week-end, prévoyez plus de livraisons").
        3. Donne un conseil d'action rapide.
        
        Ne fais pas d'introduction, va droit au but. Utilise un ton professionnel et encourageant.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      const text = response.text || "Analyse non disponible.";
      setInsights(text);
      localStorage.setItem(`ai_insights_${periodLabel}`, JSON.stringify({ data: text, timestamp: Date.now() }));
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
            <div className="text-indigo-900 text-sm leading-relaxed space-y-2">
              {insights.split('\n').map((paragraph, idx) => (
                paragraph.trim() ? <p key={idx}>{paragraph}</p> : null
              ))}
            </div>
          )}
        </div>

        <button
          onClick={generateInsights}
          disabled={loading}
          className="shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {loading ? 'Génération...' : insights ? 'Actualiser l\'analyse' : 'Générer l\'analyse'}
        </button>
      </div>
    </div>
  );
}
