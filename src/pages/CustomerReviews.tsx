import React, { useState } from 'react';
import { Sparkles, MessageSquare, ThumbsUp, ThumbsDown, AlertCircle, Loader2 } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import clsx from 'clsx';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

interface AnalysisResult {
  summary: string;
  sentiment: 'positif' | 'neutre' | 'négatif';
  strengths: string[];
  weaknesses: string[];
}

export function CustomerReviews() {
  const [reviewsText, setReviewsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const analyzeReviews = async () => {
    if (!reviewsText.trim()) {
      setError("Veuillez coller des avis clients à analyser.");
      return;
    }

    if (!ai) {
      setError("Clé API Gemini manquante. Veuillez configurer la variable d'environnement VITE_GEMINI_API_KEY.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const prompt = `
        Tu es un expert en expérience client pour la restauration et le commerce.
        Analyse les avis clients suivants et fournis un résumé concis.
        
        Avis clients :
        """
        ${reviewsText}
        """
        
        Réponds UNIQUEMENT avec un objet JSON valide (sans markdown, sans \`\`\`json) ayant exactement cette structure :
        {
          "summary": "Un résumé global de 2 à 3 phrases maximum.",
          "sentiment": "positif" | "neutre" | "négatif",
          "strengths": ["Point fort 1", "Point fort 2"],
          "weaknesses": ["Point faible 1", "Point faible 2"]
        }
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      let text = response.text || "";
      // Nettoyer la réponse si elle contient des balises markdown
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      const parsedResult = JSON.parse(text) as AnalysisResult;
      setResult(parsedResult);
    } catch (err: any) {
      console.error("Erreur IA:", err);
      setError("Une erreur s'est produite lors de l'analyse. Assurez-vous que le texte fourni est compréhensible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <MessageSquare className="text-blue-600" />
          Avis Clients (Analyse IA)
        </h1>
        <p className="text-slate-500 text-sm mt-1">Collez vos avis clients pour obtenir un résumé instantané de l'expérience client.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input Section */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Collez vos avis ici (Google, TripAdvisor, etc.)
          </label>
          <textarea
            value={reviewsText}
            onChange={(e) => setReviewsText(e.target.value)}
            placeholder="Exemple:&#10;- Super repas, mais le service était un peu lent.&#10;- J'ai adoré le nouveau menu dessert !&#10;- La musique était trop forte..."
            className="flex-1 min-h-[300px] w-full p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-y text-sm text-slate-700"
          />
          
          {error && (
            <div className="mt-4 flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button
            onClick={analyzeReviews}
            disabled={loading || !reviewsText.trim()}
            className="mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-semibold transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Analyse en cours...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Analyser les avis
              </>
            )}
          </button>
        </div>

        {/* Results Section */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 p-6 rounded-2xl border border-indigo-100 shadow-sm flex flex-col">
          <h2 className="text-lg font-bold text-indigo-900 mb-4 flex items-center gap-2">
            <Sparkles className="text-indigo-600" size={20} />
            Synthèse de l'IA
          </h2>

          {!result && !loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-indigo-300/80 p-8 text-center">
              <MessageSquare size={48} className="mb-4 opacity-50" />
              <p>L'analyse apparaîtra ici une fois que vous aurez soumis vos avis.</p>
            </div>
          )}

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center text-indigo-600 space-y-4">
              <div className="relative flex h-12 w-12">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-12 w-12 bg-indigo-500 flex items-center justify-center">
                  <Sparkles size={24} className="text-white animate-pulse" />
                </span>
              </div>
              <p className="font-medium animate-pulse">Gemini lit vos avis...</p>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {/* Sentiment Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-indigo-900 uppercase tracking-widest">Sentiment Global :</span>
                <span className={clsx(
                  "px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1",
                  result.sentiment === 'positif' ? "bg-emerald-100 text-emerald-700" :
                  result.sentiment === 'négatif' ? "bg-rose-100 text-rose-700" :
                  "bg-slate-200 text-slate-700"
                )}>
                  {result.sentiment === 'positif' ? <ThumbsUp size={16} /> :
                   result.sentiment === 'négatif' ? <ThumbsDown size={16} /> :
                   <MessageSquare size={16} />}
                  {result.sentiment.charAt(0).toUpperCase() + result.sentiment.slice(1)}
                </span>
              </div>

              {/* Summary */}
              <div className="bg-white/60 p-4 rounded-xl border border-indigo-100">
                <p className="text-indigo-900 leading-relaxed font-medium">
                  "{result.summary}"
                </p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                  <h3 className="text-emerald-800 font-bold mb-2 flex items-center gap-2">
                    <ThumbsUp size={16} />
                    Points Forts
                  </h3>
                  <ul className="space-y-2">
                    {result.strengths.map((strength, idx) => (
                      <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                        <span className="text-emerald-400 mt-0.5">•</span>
                        {strength}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-100">
                  <h3 className="text-rose-800 font-bold mb-2 flex items-center gap-2">
                    <ThumbsDown size={16} />
                    Points à Améliorer
                  </h3>
                  <ul className="space-y-2">
                    {result.weaknesses.map((weakness, idx) => (
                      <li key={idx} className="text-sm text-rose-700 flex items-start gap-2">
                        <span className="text-rose-400 mt-0.5">•</span>
                        {weakness}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
