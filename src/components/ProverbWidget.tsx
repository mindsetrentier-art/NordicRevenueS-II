import React, { useState, useEffect, useRef } from 'react';
import { Quote, ChevronRight, ChevronLeft, Move } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PROVERBS = [
  { fr: "Petit à petit, l'oiseau fait son nid.", zh: "循序渐进，终会成功。" },
  { fr: "Qui vivra verra.", zh: "事在人为，静观其变。" },
  { fr: "L'habit ne fait pas le moine.", zh: "人不可貌相，海不可斗量。" },
  { fr: "Mieux vaut tard que jamais.", zh: "亡羊补牢，未为晚也。" },
  { fr: "Chaque chose en son temps.", zh: "凡事皆有其时。" },
  { fr: "Un voyage de mille lieues commence par un seul pas.", zh: "千里之行，始于足下。" },
  { fr: "L'occasion ne se présente qu'une fois.", zh: "机不可失，时不再来。" },
  { fr: "L'échec est la mère du succès.", zh: "失败是成功之母。" },
  { fr: "On n'est jamais trop vieux pour apprendre.", zh: "活到老，学到老。" },
  { fr: "Le temps, c'est de l'argent.", zh: "一寸光阴一寸金。" }
];

export function ProverbWidget() {
  const [currentProverb, setCurrentProverb] = useState(PROVERBS[0]);
  const [isVisible, setIsVisible] = useState(false);
  const [isRetracted, setIsRetracted] = useState(true);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('proverb-widget-pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 100 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const inactivityTimer = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    localStorage.setItem('proverb-widget-pos', JSON.stringify(position));
  }, [position]);

  // Show proverb every 5 minutes
  useEffect(() => {
    const showProverb = () => {
      const randomIndex = Math.floor(Math.random() * PROVERBS.length);
      setCurrentProverb(PROVERBS[randomIndex]);
      setIsVisible(true);
      setIsRetracted(false);
      
      // Disappear after 10 seconds
      setTimeout(() => {
        setIsVisible(false);
      }, 10000);
    };

    // Initial show
    showProverb();

    const interval = setInterval(showProverb, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Inactivity timer to retract
  useEffect(() => {
    if (isRetracted || isDragging || !isVisible) return;

    const resetInactivityTimer = () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      inactivityTimer.current = setTimeout(() => {
        setIsRetracted(true);
      }, 5000);
    };

    resetInactivityTimer();

    const handleActivity = () => resetInactivityTimer();
    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isRetracted, isDragging, isVisible]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    dragStart.current = { x: clientX - position.x, y: clientY - position.y };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      let newX = clientX - dragStart.current.x;
      let newY = clientY - dragStart.current.y;

      // Constraints
      const padding = 10;
      newX = Math.max(0, Math.min(window.innerWidth - 40, newX));
      newY = Math.max(padding, Math.min(window.innerHeight - 150, newY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('touchend', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('touchend', handleMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      className="fixed z-[110] pointer-events-none"
      style={{ left: position.x, top: position.y }}
    >
      <div className="flex items-center pointer-events-auto">
        {/* Retracted Bar */}
        {isRetracted && (
          <button
            onClick={() => {
              setIsRetracted(false);
              setIsVisible(true);
            }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
            className="w-1.5 h-12 bg-blue-500/50 hover:bg-blue-600/80 rounded-full transition-all cursor-move"
            title="Afficher le proverbe"
          />
        )}

        {/* Proverb Card */}
        <AnimatePresence>
          {!isRetracted && isVisible && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white/90 backdrop-blur-md border border-slate-200 p-4 rounded-2xl shadow-xl max-w-xs relative group"
            >
              <div 
                onMouseDown={handleMouseDown}
                onTouchStart={handleMouseDown}
                className="absolute -top-2 -left-2 p-1 bg-slate-100 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-move"
              >
                <Move size={12} />
              </div>

              <div className="flex flex-col gap-2">
                <Quote size={16} className="text-blue-500 mb-1" />
                <p className="text-sm font-medium text-slate-800 italic leading-relaxed">
                  "{currentProverb.fr}"
                </p>
                <div className="h-px bg-slate-100 w-full my-1" />
                <p className="text-sm font-bold text-slate-900 leading-relaxed">
                  {currentProverb.zh}
                </p>
              </div>

              <button
                onClick={() => setIsRetracted(true)}
                className="absolute top-2 right-2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
