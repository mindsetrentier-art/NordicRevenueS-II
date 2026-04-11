import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, X, Globe, TrendingUp, Clock, Loader2, ChevronRight, ChevronLeft, ExternalLink, Play, Pause } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import clsx from 'clsx';

interface NewsItem {
  title: string;
  category: string;
  source: string;
  time: string;
  date: string;
}

export function NewsTicker() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [scrollSpeed, setScrollSpeed] = useState(() => {
    const saved = localStorage.getItem('newsScrollSpeed');
    return saved ? parseFloat(saved) : 1;
  });
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState<'fr' | 'zh'>(() => {
    const saved = localStorage.getItem('newsLanguage');
    return (saved === 'fr' || saved === 'zh') ? saved : 'fr';
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('newsScrollSpeed', scrollSpeed.toString());
  }, [scrollSpeed]);

  useEffect(() => {
    localStorage.setItem('newsLanguage', language);
  }, [language]);

  const fetchNews = async (lang: 'fr' | 'zh' = language) => {
    setLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) return;
      
      const ai = new GoogleGenAI({ apiKey });
      
      const now = new Date();
      const dateStr = now.toLocaleString(lang === 'fr' ? 'fr-FR' : 'zh-CN', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const prompt = lang === 'fr' 
        ? `
          Génère 8 actualités mondiales importantes et réalistes pour la date du ${dateStr}.
          Sujets : Économie, Géopolitique, Tendances technologiques, Nouveautés mondiales.
          Sources : Reuters, BFM TV, Bloomberg, Financial Times, Le Monde, CNN.
          Pour chaque info, invente une heure précise (ex: "09:42") et la date du jour.
          Format JSON strict :
          [
            { "title": "Titre court et percutant", "category": "Économie", "source": "Reuters", "time": "09:42", "date": "09/04/2026" }
          ]
        `
        : `
          Generate 8 important and realistic global news items in Chinese (Mandarin) for the date ${dateStr}.
          Topics: Economy, Geopolitics, Tech Trends, Global News.
          Sources: Xinhua, CCTV, South China Morning Post, Phoenix TV, Caixin, Reuters China.
          For each item, invent a precise time (e.g., "09:42") and today's date.
          Strict JSON format:
          [
            { "title": "Short and impactful title in Chinese", "category": "Category in Chinese", "source": "Source name", "time": "09:42", "date": "09/04/2026" }
          ]
        `;

      const response = await (ai as any).models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const text = response.text || "";
      const cleanedText = text.replace(/```json|```/g, '').trim();
      const parsedNews = JSON.parse(cleanedText);
      setNews(parsedNews);
    } catch (error: any) {
      // Handle rate limits and other errors gracefully without polluting the console
      if (error?.status === 429 || error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
        console.warn('Quota Gemini atteint. Utilisation des actualités de secours.');
      } else {
        console.warn('Impossible de récupérer les actualités en direct. Utilisation des actualités de secours.');
      }
      
      // Fallback news
      setNews([
        { title: lang === 'fr' ? "Marchés mondiaux en hausse après les annonces de la Fed" : "美联储发布公告后全球市场上涨", category: lang === 'fr' ? "Économie" : "经济", source: lang === 'fr' ? "Reuters" : "路透社", time: "10:45", date: new Date().toLocaleDateString() },
        { title: lang === 'fr' ? "Nouveau sommet diplomatique pour la paix en Europe" : "欧洲和平新外交峰会召开", category: lang === 'fr' ? "Géopolitique" : "地缘政治", source: lang === 'fr' ? "BFM TV" : "新华社", time: "11:02", date: new Date().toLocaleDateString() },
        { title: lang === 'fr' ? "Lancement réussi de la nouvelle mission spatiale" : "新太空任务成功发射", category: lang === 'fr' ? "Science" : "科技", source: lang === 'fr' ? "Bloomberg" : "彭博社", time: "11:15", date: new Date().toLocaleDateString() },
        { title: lang === 'fr' ? "Avancée majeure dans le développement de l'IA quantique" : "量子人工智能发展取得重大突破", category: lang === 'fr' ? "Technologie" : "技术", source: lang === 'fr' ? "Le Monde" : "央视新闻", time: "12:30", date: new Date().toLocaleDateString() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const nextNews = () => {
    if (news.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % news.length);
  };

  const prevNews = () => {
    if (news.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + news.length) % news.length);
  };

  useEffect(() => {
    // Apparaît après 5 secondes
    const timer = setTimeout(() => {
      setIsVisible(true);
      fetchNews();
    }, 5000);

    // Refresh toutes les 5 minutes
    const refreshInterval = setInterval(fetchNews, 5 * 60 * 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(refreshInterval);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div 
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="w-full bg-black/80 backdrop-blur-xl border-b border-white/5 h-10 flex items-center overflow-hidden relative z-50 shadow-2xl"
    >
      {/* Scanline Effect */}
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%),linear-gradient(90deg,rgba(255,0,0,0.03),rgba(0,255,0,0.01),rgba(0,0,255,0.03))] bg-[length:100%_2px,3px_100%] z-20 opacity-20" />
      
      {/* Label "LIVE" */}
      <div className="absolute left-0 top-0 bottom-0 px-4 bg-red-600/90 flex items-center gap-2 z-30 shadow-[4px_0_20px_rgba(220,38,38,0.4)] skew-x-[-12deg] -ml-2 pl-6">
        <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shadow-[0_0_8px_white]" />
        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-white skew-x-[12deg]">Direct</span>
      </div>

      {/* Scrolling Container */}
      <div 
        className="flex-1 flex items-center overflow-hidden whitespace-nowrap group relative"
        onMouseEnter={() => {
          if (isAutoPlay && scrollRef.current) scrollRef.current.style.animationPlayState = 'paused';
        }}
        onMouseLeave={() => {
          if (isAutoPlay && scrollRef.current) scrollRef.current.style.animationPlayState = 'running';
        }}
      >
        {isAutoPlay ? (
          <div 
            ref={scrollRef}
            className="flex items-center gap-12 pl-[100%] animate-marquee"
            style={{ animationDuration: `${(news.length * 10) / scrollSpeed}s` }}
          >
            {news.length > 0 ? (
              // Double the news for seamless loop
              [...news, ...news].map((item, idx) => (
                <div 
                  key={idx} 
                  className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition-colors"
                  onClick={() => setIsExpanded(true)}
                >
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-mono">
                    {item.category}
                  </span>
                  <p className="text-white/90 text-xs font-medium tracking-tight">
                    {item.title}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-white/30">
                    <span className="font-bold text-white/50">{item.source}</span>
                    <span className="opacity-50">/</span>
                    <span className="text-blue-400/60">{item.time}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center gap-2 text-white/50 text-xs">
                <Loader2 size={12} className="animate-spin" />
                Récupération des dernières actualités mondiales...
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center px-12">
            <AnimatePresence mode="wait">
              {news.length > 0 && (
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="flex items-center gap-3 cursor-pointer hover:text-blue-400 transition-colors"
                  onClick={() => setIsExpanded(true)}
                >
                  <span className="text-[9px] font-bold text-blue-400 uppercase tracking-wider bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded-sm font-mono">
                    {news[currentIndex].category}
                  </span>
                  <p className="text-white/90 text-xs font-medium tracking-tight">
                    {news[currentIndex].title}
                  </p>
                  <div className="flex items-center gap-2 text-[9px] font-mono text-white/30">
                    <span className="font-bold text-white/50">{news[currentIndex].source}</span>
                    <span className="opacity-50">/</span>
                    <span className="text-blue-400/60">{news[currentIndex].time}</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Manual Navigation Arrows */}
            <div className="absolute inset-y-0 left-0 flex items-center pl-2">
              <button 
                onClick={prevNews}
                className="p-1 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center pr-2">
              <button 
                onClick={nextNews}
                className="p-1 hover:bg-white/10 rounded-full text-white/30 hover:text-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Play/Pause Toggle */}
      <div className="flex items-center px-3 border-l border-white/5 z-30">
        <button 
          onClick={() => setIsAutoPlay(!isAutoPlay)}
          className={clsx(
            "p-1.5 rounded-lg transition-all flex items-center gap-2 group/toggle",
            isAutoPlay ? "text-white/30 hover:text-white" : "text-blue-400 bg-blue-500/10"
          )}
          title={isAutoPlay ? "Passer en mode manuel" : "Activer le défilement auto"}
        >
          {isAutoPlay ? <Pause size={12} /> : <Play size={12} />}
          <span className="text-[8px] font-bold uppercase tracking-widest hidden lg:inline">
            {isAutoPlay ? "Auto" : "Manuel"}
          </span>
        </button>
      </div>

      {/* Language Selector */}
      <div className="flex items-center gap-1 px-3 border-l border-white/5 text-[9px] font-mono text-white/30 z-30">
        <button 
          onClick={() => { setLanguage('fr'); fetchNews('fr'); }}
          className={clsx("hover:text-white transition-colors", language === 'fr' ? "text-blue-400 font-bold" : "text-white/30")}
        >
          FR
        </button>
        <span className="opacity-20">/</span>
        <button 
          onClick={() => { setLanguage('zh'); fetchNews('zh'); }}
          className={clsx("hover:text-white transition-colors", language === 'zh' ? "text-blue-400 font-bold" : "text-white/30")}
        >
          ZH
        </button>
      </div>

      {/* Speed Control (Direct) */}
      <div className="hidden md:flex items-center gap-2 px-3 border-l border-white/5 text-[9px] font-mono text-white/30 z-30">
        <span className="uppercase tracking-tighter">Vitesse</span>
        <select 
          value={scrollSpeed} 
          onChange={(e) => setScrollSpeed(Number(e.target.value))}
          className="bg-transparent border-none outline-none cursor-pointer hover:text-blue-400 transition-colors appearance-none text-center w-8 font-bold"
        >
          <option value="0.5" className="bg-slate-900 text-white">0.5x</option>
          <option value="1" className="bg-slate-900 text-white">1.0x</option>
          <option value="1.5" className="bg-slate-900 text-white">1.5x</option>
          <option value="2" className="bg-slate-900 text-white">2.0x</option>
          <option value="3" className="bg-slate-900 text-white">3.0x</option>
        </select>
      </div>

      {/* Expand Button */}
      <button 
        onClick={() => setIsExpanded(true)}
        className="absolute right-0 top-0 bottom-0 px-5 bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all flex items-center gap-2 z-30 border-l border-white/5 backdrop-blur-md group/btn"
      >
        <TrendingUp size={12} className="group-hover/btn:scale-110 transition-transform" />
        <span className="text-[9px] font-black uppercase tracking-[0.15em] hidden sm:inline">Flux</span>
        <ChevronRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
      </button>

      {/* Expanded Modal */}
      <AnimatePresence>
        {isExpanded && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsExpanded(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-xl text-white">
                    <Globe size={20} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Actualités Mondiales</h3>
                    <p className="text-xs text-slate-500">Flux en direct • Mis à jour toutes les 5 min</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsExpanded(false)}
                  className="p-2 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                {news.map((item, idx) => (
                  <div key={idx} className="group p-4 rounded-2xl hover:bg-slate-50 transition-all border border-slate-100 hover:border-blue-100 hover:shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-black uppercase tracking-tighter text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                        {item.category}
                      </span>
                      <div className="flex items-center gap-3 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {item.date} {item.time}
                        </span>
                        <span className="font-bold text-slate-600">{item.source}</span>
                      </div>
                    </div>
                    <h4 className="text-slate-900 font-bold leading-snug group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </h4>
                    <div className="mt-3 flex items-center justify-end">
                      <button className="text-[10px] font-bold text-blue-600 flex items-center gap-1 hover:underline">
                        Lire l'article complet <ExternalLink size={10} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex flex-col gap-1 w-full sm:w-auto">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Vitesse du flux</span>
                    <span className="text-[10px] font-mono text-blue-600 font-bold">{scrollSpeed.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.2" 
                    max="3" 
                    step="0.1" 
                    value={scrollSpeed}
                    onChange={(e) => setScrollSpeed(parseFloat(e.target.value))}
                    className="w-full sm:w-48 h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                      onClick={() => { setLanguage('fr'); fetchNews('fr'); }}
                      className={clsx("px-2 py-1 rounded-md text-[10px] font-bold transition-all", language === 'fr' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                    >
                      Français
                    </button>
                    <button 
                      onClick={() => { setLanguage('zh'); fetchNews('zh'); }}
                      className={clsx("px-2 py-1 rounded-md text-[10px] font-bold transition-all", language === 'zh' ? "bg-white text-blue-600 shadow-sm" : "text-slate-400 hover:text-slate-600")}
                    >
                      中文
                    </button>
                  </div>
                  <button 
                    onClick={() => {
                      fetchNews();
                      setIsExpanded(false);
                    }}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors shadow-sm"
                  >
                    Actualiser
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}} />
    </motion.div>
  );
}
