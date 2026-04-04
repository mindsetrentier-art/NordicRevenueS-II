import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, Thermometer, Clock, ChevronDown, ChevronUp, Wind, Leaf } from 'lucide-react';

interface AirQualityData {
  aqi: number;
  pollen: {
    total: number;
    alder: number;
    birch: number;
    grass: number;
    mugwort: number;
    olive: number;
    ragweed: number;
  };
}

export function WeatherWidget() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [airQuality, setAirQuality] = useState<AirQualityData | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('weather-widget-pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(() => {
    const saved = localStorage.getItem('weather-widget-scale');
    return saved ? parseFloat(saved) : 1;
  });

  useEffect(() => {
    localStorage.setItem('weather-widget-pos', JSON.stringify(position));
  }, [position]);

  useEffect(() => {
    localStorage.setItem('weather-widget-scale', scale.toString());
  }, [scale]);

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isVisible || isDragging) return;

    let hideTimer: NodeJS.Timeout;
    
    const startTimer = () => {
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, 10000); // Increased to 10s so user can read everything
    };

    startTimer();

    const handleActivity = () => {
      startTimer();
    };

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      if (hideTimer) clearTimeout(hideTimer);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [isVisible, isDragging]);

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    setDragStart({ x: clientX - position.x, y: clientY - position.y });
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      let newX = clientX - dragStart.x;
      let newY = clientY - dragStart.y;

      // Viewport constraints
      const padding = 10;
      const bottomNavHeight = window.innerWidth < 1024 ? 80 : 0; // Account for mobile bottom nav
      
      const minX = -window.innerWidth / 2 + padding;
      const maxX = window.innerWidth / 2 - padding;
      const minY = 0;
      const maxY = window.innerHeight - bottomNavHeight - 50; // 50 is approx widget height

      newX = Math.max(minX, Math.min(maxX, newX));
      newY = Math.max(minY, Math.min(maxY, newY));

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
  }, [isDragging, dragStart]);

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      },
      (error) => console.error('Error getting location:', error)
    );
  }, []);

  useEffect(() => {
    if (!location) return;

    const fetchData = async () => {
      try {
        // Fetch weather
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current_weather=true`
        );
        const weatherData = await weatherRes.json();
        setWeather({
          temp: Math.round(weatherData.current_weather.temperature),
          code: weatherData.current_weather.weathercode,
        });

        // Fetch air quality & pollen
        const aqRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=european_aqi,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen`
        );
        const aqData = await aqRes.json();
        const currentAq = aqData.current;
        const totalPollen = 
          (currentAq.alder_pollen || 0) + 
          (currentAq.birch_pollen || 0) + 
          (currentAq.grass_pollen || 0) + 
          (currentAq.mugwort_pollen || 0) + 
          (currentAq.olive_pollen || 0) + 
          (currentAq.ragweed_pollen || 0);

        setAirQuality({
          aqi: currentAq.european_aqi,
          pollen: {
            total: totalPollen,
            alder: currentAq.alder_pollen || 0,
            birch: currentAq.birch_pollen || 0,
            grass: currentAq.grass_pollen || 0,
            mugwort: currentAq.mugwort_pollen || 0,
            olive: currentAq.olive_pollen || 0,
            ragweed: currentAq.ragweed_pollen || 0
          }
        });

      } catch (error) {
        console.error('Error fetching weather/air quality:', error);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 600000); // Update every 10 mins
    return () => clearInterval(timer);
  }, [location]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun size={14} className="text-yellow-500" />;
    if (code <= 3) return <Cloud size={14} className="text-slate-400" />;
    if (code <= 67) return <CloudRain size={14} className="text-blue-400" />;
    if (code <= 99) return <CloudLightning size={14} className="text-purple-400" />;
    return <Sun size={14} className="text-yellow-500" />;
  };

  const getAqiColor = (aqi: number) => {
    if (aqi <= 20) return "text-green-500";
    if (aqi <= 40) return "text-yellow-500";
    if (aqi <= 60) return "text-orange-500";
    if (aqi <= 80) return "text-red-500";
    return "text-purple-500";
  };

  const getAqiLabel = (aqi: number) => {
    if (aqi <= 20) return "Bonne";
    if (aqi <= 40) return "Passable";
    if (aqi <= 60) return "Modérée";
    if (aqi <= 80) return "Mauvaise";
    if (aqi <= 100) return "Très mauvaise";
    return "Extrêmement mauvaise";
  };

  const getPollenColor = (pollen: number) => {
    if (pollen <= 10) return "text-green-500";
    if (pollen <= 50) return "text-yellow-500";
    if (pollen <= 100) return "text-orange-500";
    return "text-red-500";
  };

  const getPollenLabel = (pollen: number) => {
    if (pollen <= 10) return "Faible";
    if (pollen <= 50) return "Modéré";
    if (pollen <= 100) return "Élevé";
    return "Très élevé";
  };

  const toggleScale = () => {
    setScale(prev => (prev >= 1.5 ? 0.8 : prev + 0.2));
  };

  return (
    <div 
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none"
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px) scale(${scale})`,
        transformOrigin: 'top center'
      }}
    >
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={`
          bg-white/90 backdrop-blur-md border border-slate-200/50 px-4 py-1.5 rounded-b-2xl shadow-xl 
          flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-600 text-xs font-medium transition-all duration-500 pointer-events-auto
          cursor-move select-none group max-w-[90vw]
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
      >
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" />
          <span className="tabular-nums">{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        {weather && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex items-center gap-1.5" title="Météo">
              {getWeatherIcon(weather.code)}
              <span className="capitalize hidden sm:inline">
                {weather.code === 0 ? 'Dégagé' : weather.code <= 3 ? 'Nuageux' : 'Pluie'}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title="Température">
              <Thermometer size={14} className="text-orange-400" />
              <span className="tabular-nums">{weather.temp}°C</span>
            </div>
          </div>
        )}

        {airQuality && (
          <div className="relative group/details flex items-center gap-3 border-l border-slate-200 pl-4 cursor-help">
            <div className="flex items-center gap-1.5">
              <Wind size={14} className={getAqiColor(airQuality.aqi)} />
              <span className="hidden sm:inline">AQI {airQuality.aqi}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Leaf size={14} className={getPollenColor(airQuality.pollen.total)} />
              <span className="hidden sm:inline">Pollen</span>
            </div>

            {/* Tooltip for details */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 opacity-0 invisible group-hover/details:opacity-100 group-hover/details:visible transition-all duration-300 z-50 pointer-events-none text-left">
              <div className="mb-3 pb-2 border-b border-slate-100">
                <div className="font-bold text-slate-800 mb-1 flex items-center gap-2">
                  <Wind size={14} className={getAqiColor(airQuality.aqi)} />
                  Qualité de l'air : {getAqiLabel(airQuality.aqi)}
                </div>
                <div className="text-slate-500 text-[10px]">Indice AQI Européen : {airQuality.aqi}</div>
              </div>
              
              <div>
                <div className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                  <Leaf size={14} className={getPollenColor(airQuality.pollen.total)} />
                  Pollens : {getPollenLabel(airQuality.pollen.total)}
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-600">
                  <div className="flex justify-between"><span>Aulne:</span> <span className="font-medium">{Math.round(airQuality.pollen.alder)}</span></div>
                  <div className="flex justify-between"><span>Bouleau:</span> <span className="font-medium">{Math.round(airQuality.pollen.birch)}</span></div>
                  <div className="flex justify-between"><span>Graminées:</span> <span className="font-medium">{Math.round(airQuality.pollen.grass)}</span></div>
                  <div className="flex justify-between"><span>Armoise:</span> <span className="font-medium">{Math.round(airQuality.pollen.mugwort)}</span></div>
                  <div className="flex justify-between"><span>Olivier:</span> <span className="font-medium">{Math.round(airQuality.pollen.olive)}</span></div>
                  <div className="flex justify-between"><span>Ambroisie:</span> <span className="font-medium">{Math.round(airQuality.pollen.ragweed)}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleScale();
            }}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            title="Changer la taille"
          >
            <div className="w-3 h-3 border-2 border-current rounded-sm" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setIsVisible(false);
            }}
            className="p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            title="Réduire"
          >
            <ChevronUp size={14} />
          </button>
        </div>
      </div>
      
      {!isVisible && (
        <button
          onClick={() => setIsVisible(true)}
          onMouseDown={handleMouseDown}
          onTouchStart={handleMouseDown}
          className="w-12 h-1.5 bg-slate-300 hover:bg-slate-400 rounded-b-full transition-all duration-300 cursor-move pointer-events-auto mt-0"
          title="Afficher météo et heure"
        />
      )}
    </div>
  );
}
