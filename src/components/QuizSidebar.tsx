import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI } from "@google/genai";
import { HelpCircle, X, ChevronRight, RefreshCw, GripVertical, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Quiz {
  questionFr: string;
  questionZh: string;
  answerFr: string;
  answerZh: string;
  category: string;
}

const FALLBACK_QUIZZES: Quiz[] = [
  {
    questionFr: "Quelle est la capitale de la France ?",
    questionZh: "法国的首都是哪里？",
    answerFr: "Paris",
    answerZh: "巴黎",
    category: "Géographie"
  },
  {
    questionFr: "Quel est le plus grand océan du monde ?",
    questionZh: "世界上最大的海洋是什么？",
    answerFr: "Pacifique",
    answerZh: "太平洋",
    category: "Géographie"
  },
  {
    questionFr: "Qui a peint la Joconde ?",
    questionZh: "谁画了蒙娜丽莎？",
    answerFr: "Léonard de Vinci",
    answerZh: "列奥纳多·达·芬奇",
    category: "Art"
  },
  {
    questionFr: "Quelle est la planète la plus proche du Soleil ?",
    questionZh: "距离太阳最近的行星是哪一颗？",
    answerFr: "Mercure",
    answerZh: "水星",
    category: "Science"
  }
];

const CACHE_KEY = 'nordic_quiz_cache';
const QUOTA_ERROR_KEY = 'nordic_quiz_quota_error';
const CACHE_EXPIRATION = 86400000; // 24 hours
const QUOTA_COOLDOWN = 900000; // 15 minutes

export function QuizSidebar() {
  const [isVisible, setIsVisible] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [quiz, setQuiz] = useState<Quiz | null>(() => {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      try {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_EXPIRATION) {
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

  const fetchQuiz = useCallback(async (force = false) => {
    if (loading) return;
    
    // If not forced and we have a quiz, don't fetch
    if (!force && quiz) return;

    // Check for quota cooldown
    const lastQuotaError = localStorage.getItem(QUOTA_ERROR_KEY);
    if (lastQuotaError && Date.now() - parseInt(lastQuotaError) < QUOTA_COOLDOWN && !force) {
      const fallback = FALLBACK_QUIZZES[Math.floor(Math.random() * FALLBACK_QUIZZES.length)];
      setQuiz(fallback);
      setError("Quota API dépassé. Mode hors-ligne temporaire.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("API Key missing");
      }
      const ai = new GoogleGenAI({ apiKey });
      const categories = ['geography', 'psychology', 'history', 'mathematics', 'medicine', 'science', 'biology'];
      const category = categories[Math.floor(Math.random() * categories.length)];
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Generate a random quiz question in the category of ${category}. 
        Provide the question and answer in both French and Chinese (Simplified).
        The answer should be short (1-3 words).
        Return ONLY a JSON object with the following structure:
        {
          "questionFr": "...",
          "questionZh": "...",
          "answerFr": "...",
          "answerZh": "...",
          "category": "..."
        }`,
        config: {
          responseMimeType: "application/json"
        }
      });

      const data = JSON.parse(response.text || '{}');
      if (data.questionFr) {
        setQuiz(data);
        localStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
        localStorage.removeItem(QUOTA_ERROR_KEY); // Clear error on success
      } else {
        throw new Error("Invalid data");
      }
    } catch (err: any) {
      console.error("Error fetching quiz:", err);
      
      // Use fallback if API fails
      const fallback = FALLBACK_QUIZZES[Math.floor(Math.random() * FALLBACK_QUIZZES.length)];
      setQuiz(fallback);

      if (err.message?.includes('429') || err.message?.includes('quota')) {
        localStorage.setItem(QUOTA_ERROR_KEY, Date.now().toString());
        setError("Quota API dépassé. Utilisation du mode hors-ligne.");
      } else {
        setError("Mode hors-ligne activé.");
      }
    } finally {
      setLoading(false);
    }
  }, [loading, quiz]);

  // Fetch only when expanded for the first time if no quiz
  useEffect(() => {
    if (isExpanded && !quiz && !loading) {
      fetchQuiz();
    }
  }, [isExpanded, quiz, loading, fetchQuiz]);

  // Auto-hide after 5 seconds
  useEffect(() => {
    const hideTimeout = setTimeout(() => {
      if (!isExpanded) {
        setIsVisible(false);
      }
    }, 5000);

    return () => clearTimeout(hideTimeout);
  }, [isExpanded]);

  // Rotate quiz every 10 minutes (further reduced frequency)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isExpanded && document.hasFocus()) {
        fetchQuiz(true);
      }
    }, 600000); // 10 minutes

    return () => clearInterval(interval);
  }, [fetchQuiz, isExpanded]);

  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
    setIsVisible(true);
  };

  return (
    <>
      {/* Discreet Trigger Bar */}
      <div 
        className="fixed right-0 top-1/2 -translate-y-1/2 w-1.5 h-32 bg-slate-400/10 hover:bg-blue-500/30 cursor-pointer z-50 transition-all rounded-l-full"
        onMouseEnter={() => setIsVisible(true)}
        onClick={toggleExpand}
      />

      {isVisible && (
        <motion.div
          drag="y"
          dragConstraints={{ top: -300, bottom: 300 }}
          dragElastic={0.1}
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: isExpanded ? 0 : 260, opacity: 1 }}
          transition={{ type: 'spring', damping: 20, stiffness: 100 }}
          className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex items-center"
        >
          {/* Drag Handle & Toggle Button */}
          <div className="flex flex-col items-center bg-white/80 backdrop-blur-md border border-slate-200 shadow-xl rounded-l-2xl overflow-hidden">
            <div 
              className="p-1.5 text-slate-300 hover:text-slate-500 cursor-grab active:cursor-grabbing border-b border-slate-100 transition-colors"
              title="Faire glisser verticalement"
            >
              <GripVertical size={14} />
            </div>
            <button
              onClick={toggleExpand}
              className={`p-3 text-slate-600 hover:text-blue-600 transition-all group ${isExpanded ? 'rotate-180' : ''}`}
            >
              <ChevronRight size={20} className="group-hover:scale-110 transition-transform" />
            </button>
          </div>

          {/* The Content Card */}
          <div className={`w-72 bg-white/90 backdrop-blur-lg border-l border-y border-slate-200 shadow-2xl p-6 rounded-l-3xl h-auto max-h-[80vh] overflow-y-auto ${isExpanded ? 'block' : 'hidden'}`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <HelpCircle size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">Quiz Flash</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{quiz?.category || 'Culture'}</p>
                </div>
              </div>
              <button 
                onClick={() => fetchQuiz(true)}
                disabled={loading}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-all disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>

            {loading && !quiz ? (
              <div className="py-8 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Génération...</p>
              </div>
            ) : error && !quiz ? (
              <div className="py-8 flex flex-col items-center gap-3 text-center">
                <div className="p-2 bg-red-50 text-red-500 rounded-lg">
                  <X size={16} />
                </div>
                <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest leading-tight">
                  {error}
                </p>
                <button 
                  onClick={() => fetchQuiz(true)}
                  className="text-[10px] font-bold text-blue-600 hover:underline uppercase tracking-widest mt-2"
                >
                  Réessayer
                </button>
              </div>
            ) : quiz ? (
              <div className="space-y-6">
                {loading && (
                  <div className="flex items-center justify-center gap-2 py-1 bg-blue-50 rounded-lg mb-2">
                    <RefreshCw size={10} className="animate-spin text-blue-600" />
                    <span className="text-[8px] font-bold text-blue-600 uppercase tracking-widest">Mise à jour...</span>
                  </div>
                )}
                {error && (
                  <div className="flex items-center justify-center gap-2 py-1 bg-amber-50 rounded-lg mb-2">
                    <AlertCircle size={10} className="text-amber-600" />
                    <span className="text-[8px] font-bold text-amber-600 uppercase tracking-widest">{error}</span>
                  </div>
                )}
                <div className="space-y-3">
                  <p className="text-sm font-bold text-slate-700 leading-relaxed">{quiz.questionFr}</p>
                  <p className="text-xs font-medium text-slate-400 leading-relaxed italic">{quiz.questionZh}</p>
                </div>

                <div className="pt-6 border-t border-slate-100 flex flex-col items-center gap-4">
                  <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Réponse</p>
                  
                  {/* Discreet Answer: Tiny, Mirrored, Inverted */}
                  <div className="flex flex-col items-center gap-2 opacity-20 hover:opacity-100 transition-opacity cursor-help">
                    <div className="text-[8px] font-bold text-slate-500 transform scale-x-[-1] rotate-180 select-none">
                      {quiz.answerFr}
                    </div>
                    <div className="text-[8px] font-bold text-slate-500 transform scale-x-[-1] rotate-180 select-none">
                      {quiz.answerZh}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-slate-400 py-8">Aucun quiz disponible</p>
            )}

            <div className="mt-8 pt-4 border-t border-slate-100 flex justify-center">
              <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Mise à jour toutes les 10 min</p>
            </div>
          </div>
        </motion.div>
      )}
    </>
  );
}
