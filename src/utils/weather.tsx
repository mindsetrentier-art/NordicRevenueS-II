import React from 'react';
import { Sun, Cloud, CloudFog, CloudDrizzle, CloudRain, Snowflake, CloudLightning } from 'lucide-react';

export const getWeatherIcon = (code: number, size = 18) => {
  if (code === 0 || code === 1) return <Sun size={size} className="text-amber-500" />;
  if (code === 2 || code === 3) return <Cloud size={size} className="text-slate-400" />;
  if (code >= 45 && code <= 48) return <CloudFog size={size} className="text-slate-400" />;
  if (code >= 51 && code <= 55) return <CloudDrizzle size={size} className="text-blue-400" />;
  if (code >= 61 && code <= 65) return <CloudRain size={size} className="text-blue-600" />;
  if (code >= 71 && code <= 77) return <Snowflake size={size} className="text-sky-300" />;
  if (code >= 95) return <CloudLightning size={size} className="text-purple-600" />;
  return <Cloud size={size} className="text-slate-400" />;
};

export const getWeatherLabel = (code: number) => {
  if (code === 0) return 'Dégagé';
  if (code === 1 || code === 2 || code === 3) return 'Nuageux';
  if (code >= 45 && code <= 48) return 'Brouillard';
  if (code >= 51 && code <= 55) return 'Bruine';
  if (code >= 61 && code <= 65) return 'Pluie';
  if (code >= 71 && code <= 77) return 'Neige';
  if (code >= 95) return 'Orage';
  return 'Inconnu';
};

export const fetchHistoricalWeather = async (startDate: string, endDate: string) => {
  try {
    let lat = 48.8566; // Defaults to Paris if geo fails
    let lon = 2.3522;
    
    try {
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { 
            timeout: 3000, 
            maximumAge: 300000 
          })
        );
        if (pos && pos.coords) {
          lat = pos.coords.latitude;
          lon = pos.coords.longitude;
        }
      }
    } catch(e) {
      console.warn("Geolocation skipped or failed, using default coordinates", e);
    }

    // Secondary validation for lat/lon
    if (!isFinite(lat) || !isFinite(lon)) {
      lat = 48.8566;
      lon = 2.3522;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    
    // Open-Meteo Forecast API only supports up to 2 days in the past.
    // If the end date is older than 2 days ago, use the Archive API directly.
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);
    
    const useArchive = end < twoDaysAgo;
    const baseUrl = useArchive 
      ? "https://archive-api.open-meteo.com/v1/archive" 
      : "https://api.open-meteo.com/v1/forecast";
    
    const url = `${baseUrl}?latitude=${lat}&longitude=${lon}&start_date=${startDate}&end_date=${endDate}&daily=weathercode,temperature_2m_max&timezone=GMT`;
    
    const res = await fetch(url);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.reason || `Erreur réseau (${res.status})`);
    }
    
    const data = await res.json();
    
    if (data && data.daily) {
      const weatherMap: Record<string, { temp: number, code: number }> = {};
      data.daily.time.forEach((dateStr: string, idx: number) => {
        weatherMap[dateStr] = {
          temp: Math.round(data.daily.temperature_2m_max[idx]),
          code: data.daily.weathercode[idx]
        };
      });
      return { data: weatherMap, error: null };
    }
    
    throw new Error("Données météo invalides");
  } catch (error) {
    console.error("Erreur météo historique:", error);
    return { 
      data: null, 
      error: error instanceof Error ? error.message : "Impossible de récupérer les données météorologiques." 
    };
  }
};
