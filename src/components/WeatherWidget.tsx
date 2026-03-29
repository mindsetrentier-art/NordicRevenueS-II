import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, Thermometer, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export function WeatherWidget() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  const [isVisible, setIsVisible] = useState(true);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [position, setPosition] = useState(() => {
    const saved = localStorage.getItem('weather-widget-pos');
    return saved ? JSON.parse(saved) : { x: 0, y: 0 };
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    localStorage.setItem('weather-widget-pos', JSON.stringify(position));
  }, [position]);

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
      }, 5000);
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
      setPosition({
        x: clientX - dragStart.x,
        y: clientY - dragStart.y,
      });
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

    const fetchWeather = async () => {
      try {
        const response = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current_weather=true`
        );
        const data = await response.json();
        setWeather({
          temp: Math.round(data.current_weather.temperature),
          code: data.current_weather.weathercode,
        });
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    fetchWeather();
    const weatherTimer = setInterval(fetchWeather, 600000); // Update every 10 mins
    return () => clearInterval(weatherTimer);
  }, [location]);

  const getWeatherIcon = (code: number) => {
    if (code === 0) return <Sun size={14} className="text-yellow-500" />;
    if (code <= 3) return <Cloud size={14} className="text-slate-400" />;
    if (code <= 67) return <CloudRain size={14} className="text-blue-400" />;
    if (code <= 99) return <CloudLightning size={14} className="text-purple-400" />;
    return <Sun size={14} className="text-yellow-500" />;
  };

  return (
    <div 
      className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none"
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px)`
      }}
    >
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={`
          bg-white/80 backdrop-blur-md border border-slate-200/50 px-4 py-1.5 rounded-b-2xl shadow-sm 
          flex items-center gap-4 text-slate-600 text-xs font-medium transition-all duration-500 pointer-events-auto
          cursor-move select-none
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
      >
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" />
          <span>{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        {weather && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="flex items-center gap-1.5">
              {getWeatherIcon(weather.code)}
              <span className="capitalize">
                {weather.code === 0 ? 'Dégagé' : weather.code <= 3 ? 'Nuageux' : 'Pluie'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Thermometer size={14} className="text-orange-400" />
              <span>{weather.temp}°C</span>
            </div>
          </div>
        )}
        
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setIsVisible(false);
          }}
          className="ml-2 p-1 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
        >
          <ChevronUp size={14} />
        </button>
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
