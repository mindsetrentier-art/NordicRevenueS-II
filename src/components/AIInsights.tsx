import React, { useState } from 'react';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface AIInsightsProps {
  revenueData: any[];
  paymentData: any;
  periodLabel: string;
}

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
      const prompt = `
        Tu es un analyste financier expert pour la restauration et le commerce de détail.
        Voici les données de chiffre d'affaires (CA) pour la période : ${periodLabel}.
        
        Évolution quotidienne du CA : ${JSON.stringify(revenueData)}
        Répartition des paiements : ${JSON.stringify(paymentData)}
        
        Rédige une analyse très concise (3 ou 4 phrases courtes) en français pour le gérant.
        1. Identifie la tendance principale (hausse, baisse, jours forts).
        2. Commente la répartition des paiements (ex: forte utilisation des Tickets Resto ou CB).
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
            <div className="flex items-center gap-2 text-indigo-600 text-sm py-2">
              <Loader2 className="animate-spin" size={16} />
              <span>Analyse de vos données en cours...</span>
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
