import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, Move } from 'lucide-react';

const HISTORICAL_EVENTS = [
  { date: "29 Mai 1453", title: "Chute de Constantinople", summary: "Marque la fin de l'Empire byzantin et un tournant décisif dans l'histoire européenne." },
  { date: "12 Octobre 1492", title: "Découverte de l'Amérique", summary: "Christophe Colomb atteint les Amériques, ouvrant la voie à l'exploration européenne." },
  { date: "31 Octobre 1517", title: "Les 95 thèses", summary: "Martin Luther initie la Réforme protestante, bouleversant le christianisme." },
  { date: "15 Octobre 1582", title: "Calendrier grégorien", summary: "Introduction du nouveau calendrier par le pape Grégoire XIII pour corriger le décalage solaire." },
  { date: "25 Août 1609", title: "Lunette astronomique", summary: "Galilée observe le ciel, révolutionnant notre compréhension de l'univers." },
  { date: "5 Juillet 1687", title: "Principia Mathematica", summary: "Isaac Newton publie ses lois du mouvement et de la gravitation universelle." },
  { date: "4 Juillet 1776", title: "Indépendance des États-Unis", summary: "Adoption de la Déclaration d'indépendance face à la Grande-Bretagne." },
  { date: "14 Juillet 1789", title: "Révolution française", summary: "Prise de la Bastille, marquant la fin de la monarchie absolue en France." },
  { date: "2 Décembre 1804", title: "Sacre de Napoléon", summary: "Napoléon Bonaparte devient Empereur des Français." },
  { date: "17 Novembre 1869", title: "Canal de Suez", summary: "Inauguration de la voie navigable reliant la mer Méditerranée à la mer Rouge." },
  { date: "14 Février 1876", title: "Invention du téléphone", summary: "Alexander Graham Bell dépose le brevet du premier téléphone fonctionnel." },
  { date: "31 Mars 1889", title: "Tour Eiffel", summary: "Inauguration du monument emblématique lors de l'Exposition universelle de Paris." },
  { date: "28 Juillet 1914", title: "Première Guerre mondiale", summary: "Début du premier conflit mondial suite à l'attentat de Sarajevo." },
  { date: "3 Septembre 1928", title: "Découverte de la pénicilline", summary: "Alexander Fleming découvre le premier antibiotique, révolutionnant la médecine." },
  { date: "24 Octobre 1945", title: "Création de l'ONU", summary: "Fin de la Seconde Guerre mondiale et fondation de l'Organisation des Nations Unies." },
  { date: "4 Octobre 1957", title: "Spoutnik 1", summary: "Lancement du premier satellite artificiel par l'Union soviétique." },
  { date: "21 Juillet 1969", title: "Apollo 11", summary: "Neil Armstrong devient le premier homme à marcher sur la Lune." },
  { date: "9 Novembre 1989", title: "Chute du mur de Berlin", summary: "Fin de la division de l'Allemagne et symbole de l'effondrement du bloc communiste." },
  { date: "26 Décembre 1991", title: "Fin de l'URSS", summary: "Dissolution de l'Union soviétique, marquant la fin de la guerre froide." },
  { date: "15 Janvier 2001", title: "Lancement de Wikipédia", summary: "Création de l'encyclopédie libre en ligne, révolutionnant l'accès au savoir." },
  { date: "9 Janvier 2007", title: "Premier iPhone", summary: "Steve Jobs présente le smartphone qui va transformer la communication mondiale." },
  { date: "4 Juillet 2012", title: "Boson de Higgs", summary: "Découverte de la particule élémentaire au CERN, confirmant le modèle standard." },
  { date: "11 Mars 2020", title: "Pandémie de COVID-19", summary: "Début de la crise sanitaire mondiale bouleversant l'économie et la société." }
];

export function HistoricalBar() {
  const [isVisible, setIsVisible] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [currentEvent, setCurrentEvent] = useState(HISTORICAL_EVENTS[0]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initial delay of 5 seconds
  useEffect(() => {
    const initialTimer = setTimeout(() => {
      setIsVisible(true);
      pickRandomEvent();
      startCollapseTimer();
    }, 5000);

    return () => clearTimeout(initialTimer);
  }, []);

  // Change event every minute (60000 ms)
  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      pickRandomEvent();
    }, 60000);

    return () => clearInterval(interval);
  }, [isVisible]);

  const pickRandomEvent = () => {
    const randomIndex = Math.floor(Math.random() * HISTORICAL_EVENTS.length);
    setCurrentEvent(HISTORICAL_EVENTS[randomIndex]);
  };

  const startCollapseTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setIsExpanded(false);
    }, 5000);
  };

  const handleInteract = () => {
    setIsExpanded(true);
    startCollapseTimer();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      drag
      dragMomentum={false}
      onDragStart={handleInteract}
      onDrag={handleInteract}
      onMouseEnter={handleInteract}
      onMouseMove={handleInteract}
      onTouchStart={handleInteract}
      onMouseLeave={startCollapseTimer}
      onTouchEnd={startCollapseTimer}
      className="fixed z-[60] cursor-move"
      style={{ left: 16, top: '50%', y: '-50%' }}
    >
      <AnimatePresence mode="wait">
        {isExpanded ? (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.8, x: -20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.4)] border border-slate-700 w-64 relative group"
          >
            <div className="absolute -top-2 -left-2 p-1.5 bg-slate-800 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg border border-slate-600">
              <Move size={14} />
            </div>
            
            <div className="flex items-center gap-3 mb-3">
              <div className="bg-blue-500/20 p-2 rounded-xl shrink-0">
                <History className="text-blue-400" size={18} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">Le saviez-vous ?</span>
                <div className="font-black text-sm text-white leading-tight">{currentEvent.date}</div>
              </div>
            </div>
            
            <div>
              <h4 className="font-bold text-slate-100 text-sm mb-1.5">{currentEvent.title}</h4>
              <p className="text-xs text-slate-400 leading-relaxed">{currentEvent.summary}</p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="collapsed"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="bg-transparent p-3 rounded-full flex items-center justify-center cursor-pointer"
          >
            <History className="text-blue-400" size={24} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
