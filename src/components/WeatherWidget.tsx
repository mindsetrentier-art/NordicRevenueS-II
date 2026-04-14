import React, { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudLightning, Thermometer, Clock, ChevronDown, ChevronUp, Wind, Leaf } from 'lucide-react';
import clsx from 'clsx';

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
  forecast: {
    date: string;
    aqi: number;
    pollen: number;
  }[];
}

interface WeatherData {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  code: number;
  isDay: boolean;
}

interface ForecastDay {
  date: string;
  code: number;
  maxTemp: number;
  minTemp: number;
}

export function WeatherWidget() {
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [locationName, setLocationName] = useState<string | null>(null);
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

  const [showWeatherDetails, setShowWeatherDetails] = useState(false);
  const [showAqiDetails, setShowAqiDetails] = useState(false);

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
      }, 20000); // Increased to 20s for better visibility
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
    const getPos = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Fallback to Paris if geolocation fails
          setLocation({ lat: 48.8566, lon: 2.3522 });
          setLocationName('Paris (Défaut)');
        }
      );
    };
    getPos();
  }, []);

  useEffect(() => {
    if (!location) return;

    const fetchData = async () => {
      if (!location) return;

      // 1. Fetch Weather & Forecast
      try {
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${location.lat}&longitude=${location.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&timezone=auto`
        );
        
        if (!weatherRes.ok) throw new Error(`Weather API returned ${weatherRes.status}`);
        
        const weatherData = await weatherRes.json();
        
        if (weatherData.current) {
          setWeather({
            temp: Math.round(weatherData.current.temperature_2m),
            feelsLike: Math.round(weatherData.current.apparent_temperature),
            humidity: weatherData.current.relative_humidity_2m,
            windSpeed: Math.round(weatherData.current.wind_speed_10m),
            code: weatherData.current.weather_code,
            isDay: weatherData.current.is_day === 1
          });
        }

        if (weatherData.daily) {
          const daily = weatherData.daily;
          const forecastData: ForecastDay[] = daily.time.map((t: string, i: number) => ({
            date: t,
            code: daily.weather_code[i],
            maxTemp: Math.round(daily.temperature_2m_max[i]),
            minTemp: Math.round(daily.temperature_2m_min[i])
          })).slice(1, 6);
          setForecast(forecastData);
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      }

      // 2. Fetch Location Name (Reverse Geocoding)
      // Using BigDataCloud as it's more reliable for client-side than Nominatim
      try {
        const geoRes = await fetch(
          `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${location.lat}&longitude=${location.lon}&localityLanguage=fr`
        );
        if (geoRes.ok) {
          const geoData = await geoRes.json();
          const city = geoData.city || geoData.locality || geoData.principalSubdivision;
          if (city) setLocationName(city);
        }
      } catch (e) {
        console.error('Error fetching location name:', e);
      }

      // 3. Fetch Air Quality & Pollen
      try {
        const aqRes = await fetch(
          `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${location.lat}&longitude=${location.lon}&current=european_aqi,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&hourly=european_aqi,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen&timezone=auto`
        );
        
        if (!aqRes.ok) throw new Error(`Air Quality API returned ${aqRes.status}`);
        
        const aqData = await aqRes.json();
        if (aqData.current) {
          const currentAq = aqData.current;
          const totalPollen = 
            (currentAq.alder_pollen || 0) + 
            (currentAq.birch_pollen || 0) + 
            (currentAq.grass_pollen || 0) + 
            (currentAq.mugwort_pollen || 0) + 
            (currentAq.olive_pollen || 0) + 
            (currentAq.ragweed_pollen || 0);

          // Extract daily max AQI and Pollen for forecast
          const hourly = aqData.hourly;
          const aqForecast: { date: string; aqi: number; pollen: number }[] = [];
          if (hourly && hourly.time) {
            const days: Record<string, { aqi: number; pollen: number }> = {};
            hourly.time.forEach((t: string, i: number) => {
              const date = t.split('T')[0];
              const aqiVal = hourly.european_aqi[i];
              const pollenVal = 
                (hourly.alder_pollen?.[i] || 0) + 
                (hourly.birch_pollen?.[i] || 0) + 
                (hourly.grass_pollen?.[i] || 0) + 
                (hourly.mugwort_pollen?.[i] || 0) + 
                (hourly.olive_pollen?.[i] || 0) + 
                (hourly.ragweed_pollen?.[i] || 0);

              if (!days[date]) {
                days[date] = { aqi: aqiVal, pollen: pollenVal };
              } else {
                days[date].aqi = Math.max(days[date].aqi, aqiVal);
                days[date].pollen = Math.max(days[date].pollen, pollenVal);
              }
            });
            Object.entries(days).slice(1, 6).forEach(([date, vals]) => {
              aqForecast.push({ date, aqi: vals.aqi, pollen: vals.pollen });
            });
          }

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
            },
            forecast: aqForecast
          });
        }
      } catch (error) {
        console.error('Error fetching air quality:', error);
      }
    };

    fetchData();
    const timer = setInterval(fetchData, 600000); // Update every 10 mins
    return () => clearInterval(timer);
  }, [location]);

  const getWeatherIcon = (code: number, isDay: boolean = true) => {
    if (code === 0) return isDay ? <Sun size={14} className="text-yellow-500" /> : <Cloud size={14} className="text-slate-300" />;
    if (code <= 3) return <Cloud size={14} className="text-slate-400" />;
    if (code <= 48) return <Cloud size={14} className="text-slate-300" />; // Fog
    if (code <= 67) return <CloudRain size={14} className="text-blue-400" />;
    if (code <= 77) return <Cloud size={14} className="text-slate-200" />; // Snow
    if (code <= 82) return <CloudRain size={14} className="text-blue-500" />;
    if (code <= 99) return <CloudLightning size={14} className="text-purple-400" />;
    return <Sun size={14} className="text-yellow-500" />;
  };

  const getWeatherLabel = (code: number) => {
    if (code === 0) return 'Dégagé';
    if (code <= 3) return 'Partiellement nuageux';
    if (code <= 48) return 'Brouillard';
    if (code <= 67) return 'Pluie';
    if (code <= 77) return 'Neige';
    if (code <= 82) return 'Averses';
    if (code <= 99) return 'Orageux';
    return 'Dégagé';
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

  const getSuggestions = () => {
    if (!weather || !airQuality) return [];
    const suggestions = [];

    // Weather suggestions
    if (weather.temp > 25) suggestions.push("Hydratez-vous régulièrement 💧");
    if (weather.temp < 5) suggestions.push("Couvrez-vous bien 🧣");
    if (weather.code >= 51) suggestions.push("N'oubliez pas votre parapluie ☂️");
    if (weather.code === 0 && weather.isDay) suggestions.push("Profitez du soleil ! ☀️");

    // AQI suggestions
    if (airQuality.aqi > 60) suggestions.push("Évitez les activités physiques intenses en extérieur 🏃‍♂️");
    if (airQuality.aqi > 80) suggestions.push("Portez un masque si vous êtes sensible 😷");
    if (airQuality.aqi < 30) suggestions.push("Air pur : idéal pour aérer votre intérieur 🪟");

    // Pollen suggestions
    if (airQuality.pollen.total > 50) suggestions.push("Alerte pollen : rincez vos cheveux le soir 🚿");

    return suggestions;
  };

  const toggleScale = () => {
    setScale(prev => (prev >= 1.5 ? 0.8 : prev + 0.2));
  };

  const suggestions = getSuggestions();

  return (
    <div 
      className="fixed top-10 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center pointer-events-none"
      style={{
        transform: `translate(calc(-50% + ${position.x}px), ${position.y}px) scale(${scale})`,
        transformOrigin: 'top center'
      }}
    >
      <div 
        onMouseDown={handleMouseDown}
        onTouchStart={handleMouseDown}
        className={`
          bg-white/95 backdrop-blur-2xl border border-slate-200/60 px-6 py-2.5 rounded-b-[2.5rem] shadow-2xl shadow-slate-300/40 
          flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-slate-600 text-xs font-bold transition-all duration-500 pointer-events-auto
          cursor-move select-none group max-w-[95vw] border-t-0
          ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
      >
        <div className="absolute top-1 left-1/2 -translate-x-1/2 w-8 h-1 bg-slate-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-400" />
          <span className="tabular-nums font-bold">{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          {locationName && (
            <span className="text-[10px] text-slate-400 ml-1 hidden md:inline">({locationName})</span>
          )}
        </div>
        
        {weather && (
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4 relative group/weather">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowWeatherDetails(!showWeatherDetails);
                setShowAqiDetails(false);
              }}
              className="flex items-center gap-1.5 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer active:scale-95" 
              title={`${getWeatherLabel(weather.code)} (Ressenti ${weather.feelsLike}°C)`}
            >
              {getWeatherIcon(weather.code, weather.isDay)}
              <div className="flex flex-col leading-none text-left">
                <span className="tabular-nums font-bold">{weather.temp}°C</span>
                <span className="text-[8px] text-slate-400 font-medium">Ressenti {weather.feelsLike}°</span>
              </div>
            </button>
            <div className="flex items-center gap-1.5" title="Humidité">
              <CloudRain size={14} className="text-blue-300" />
              <span className="tabular-nums">{weather.humidity}%</span>
            </div>
            <div className="flex items-center gap-1.5" title="Vent">
              <Wind size={14} className="text-slate-300" />
              <span className="tabular-nums">{weather.windSpeed} km/h</span>
            </div>

            {/* Weather Details Tooltip */}
            <div className={clsx(
              "absolute top-full left-1/2 -translate-x-1/2 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 transition-all duration-300 z-50 text-left",
              showWeatherDetails ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 group-hover/weather:opacity-100 group-hover/weather:visible group-hover/weather:translate-y-0"
            )}>
              <div className="mb-4 pb-3 border-b border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">{locationName || 'Votre position'}</h4>
                    <p className="text-[10px] text-slate-500">{getWeatherLabel(weather.code)}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-black text-slate-900">{weather.temp}°C</div>
                    <p className="text-[10px] text-slate-400">Ressenti {weather.feelsLike}°C</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="flex justify-between text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                    <span>Humidité</span>
                    <span className="font-bold">{weather.humidity}%</span>
                  </div>
                  <div className="flex justify-between text-slate-600 bg-slate-50 p-1.5 rounded-lg">
                    <span>Vent</span>
                    <span className="font-bold">{weather.windSpeed} km/h</span>
                  </div>
                </div>
              </div>

              {forecast.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prévisions 5 jours</h5>
                  {forecast.map((day) => (
                    <div key={day.date} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                      <span className="text-[10px] font-medium text-slate-600 w-12">
                        {new Date(day.date).toLocaleDateString('fr-FR', { weekday: 'short' })}
                      </span>
                      <div className="flex items-center gap-2 flex-1 justify-center">
                        {getWeatherIcon(day.code)}
                        <span className="text-[9px] text-slate-400 truncate max-w-[80px]">{getWeatherLabel(day.code)}</span>
                      </div>
                      <div className="flex items-center gap-2 w-16 justify-end">
                        <span className="text-[10px] font-bold text-slate-900">{day.maxTemp}°</span>
                        <span className="text-[10px] text-slate-400">{day.minTemp}°</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {airQuality && (
          <div className="relative group/details flex items-center gap-3 border-l border-slate-200 pl-4">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowAqiDetails(!showAqiDetails);
                setShowWeatherDetails(false);
              }}
              className="flex items-center gap-1.5 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer active:scale-95"
            >
              <Wind size={14} className={getAqiColor(airQuality.aqi)} />
              <span className="hidden sm:inline">AQI {airQuality.aqi}</span>
            </button>
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowAqiDetails(!showAqiDetails);
                setShowWeatherDetails(false);
              }}
              className="flex items-center gap-1.5 hover:bg-slate-100 p-1 rounded-lg transition-colors cursor-pointer active:scale-95"
            >
              <Leaf size={14} className={getPollenColor(airQuality.pollen.total)} />
              <span className="hidden sm:inline">Pollen</span>
            </button>

            {/* Tooltip for details */}
            <div className={clsx(
              "absolute top-full left-1/2 -translate-x-1/2 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 p-4 transition-all duration-300 z-50 text-left",
              showAqiDetails ? "opacity-100 visible translate-y-0" : "opacity-0 invisible -translate-y-2 group-hover/details:opacity-100 group-hover/details:visible group-hover/details:translate-y-0"
            )}>
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
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-600 mb-3">
                  <div className="flex justify-between"><span>Aulne:</span> <span className="font-medium">{Math.round(airQuality.pollen.alder)}</span></div>
                  <div className="flex justify-between"><span>Bouleau:</span> <span className="font-medium">{Math.round(airQuality.pollen.birch)}</span></div>
                  <div className="flex justify-between"><span>Graminées:</span> <span className="font-medium">{Math.round(airQuality.pollen.grass)}</span></div>
                  <div className="flex justify-between"><span>Armoise:</span> <span className="font-medium">{Math.round(airQuality.pollen.mugwort)}</span></div>
                  <div className="flex justify-between"><span>Olivier:</span> <span className="font-medium">{Math.round(airQuality.pollen.olive)}</span></div>
                  <div className="flex justify-between"><span>Ambroisie:</span> <span className="font-medium">{Math.round(airQuality.pollen.ragweed)}</span></div>
                </div>
              </div>

              {airQuality.forecast.length > 0 && (
                <div className="pt-3 border-t border-slate-100 mb-3">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Prévisions Air & Pollens</h5>
                  <div className="space-y-2">
                    {airQuality.forecast.map(f => (
                      <div key={f.date} className="flex justify-between items-center text-[10px]">
                        <span className="text-slate-500 w-10">{new Date(f.date).toLocaleDateString('fr-FR', { weekday: 'short' })}</span>
                        <div className="flex items-center gap-3 flex-1 justify-end">
                          <div className="flex items-center gap-1">
                            <Wind size={10} className={getAqiColor(f.aqi)} />
                            <span className={clsx("font-bold", getAqiColor(f.aqi))}>{f.aqi}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Leaf size={10} className={getPollenColor(f.pollen)} />
                            <span className={clsx("font-bold", getPollenColor(f.pollen))}>{Math.round(f.pollen)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {suggestions.length > 0 && (
                <div className="pt-3 border-t border-slate-100">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Conseils du jour</h5>
                  <div className="space-y-1">
                    {suggestions.slice(0, 2).map((s, i) => (
                      <div key={i} className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        {s}
                      </div>
                    ))}
                  </div>
                </div>
              )}
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
          className="bg-white/80 backdrop-blur-sm border border-slate-200/50 px-3 py-1 rounded-b-xl shadow-lg flex items-center gap-2 text-[10px] font-bold text-slate-500 hover:bg-white transition-all duration-300 cursor-move pointer-events-auto mt-0 group"
          title="Afficher météo et heure"
        >
          <Clock size={10} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="tabular-nums">{time.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
          {weather && (
            <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
              {getWeatherIcon(weather.code, weather.isDay)}
              <span>{weather.temp}°</span>
            </div>
          )}
        </button>
      )}
    </div>
  );
}
