import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { MapPin, Search, ChevronRight, Activity, Zap, Map as MapIcon, Layers, Mountain } from 'lucide-react';
import { collection, query, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { AdvancedMarker, APIProvider, Map as GoogleMap, Pin, InfoWindow, useAdvancedMarkerRef } from '@vis.gl/react-google-maps';
import clsx from 'clsx';
import { Revenue } from '../types';

const API_KEY = process.env.GOOGLE_MAPS_PLATFORM_KEY || '';
const hasValidKey = Boolean(API_KEY) && API_KEY !== 'YOUR_API_KEY';

interface LocationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
  revenue: number;
  target: number;
  status: 'excellent' | 'good' | 'warning';
}

function MarkerWithInfoWindow({ location }: { location: LocationData }) {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [open, setOpen] = useState(false);

  const getPinBackground = (status: string) => {
    switch (status) {
      case 'excellent': return '#10b981'; // Emerald
      case 'good': return '#3b82f6'; // Blue
      case 'warning': return '#f59e0b'; // Amber
      default: return '#94a3b8'; // Slate
    }
  };

  const progress = Math.min((location.revenue / location.target) * 100, 100);

  return (
    <>
      <AdvancedMarker ref={markerRef} position={{ lat: location.lat, lng: location.lng }} onClick={() => setOpen(!open)}>
        <Pin background={getPinBackground(location.status)} glyphColor="#fff" borderColor="rgba(255,255,255,0.5)" />
      </AdvancedMarker>
      {open && (
        <InfoWindow anchor={marker} onCloseClick={() => setOpen(false)}>
          <div className="p-1 min-w-[200px]">
            <h3 className="font-bold text-slate-900 mb-1">{location.name}</h3>
            <div className="flex justify-between items-end mb-2">
              <span className="text-sm font-black text-slate-800">{location.revenue.toLocaleString('fr-FR')} €</span>
              <span className="text-[10px] text-slate-500">Obj. {location.target.toLocaleString('fr-FR')} €</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={clsx(
                  "h-full rounded-full transition-all",
                  location.status === 'excellent' ? 'bg-emerald-500' :
                  location.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                )}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </InfoWindow>
      )}
    </>
  );
}

export function MasterMap() {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [mapTypeId, setMapTypeId] = useState<string>('roadmap');

  useEffect(() => {
    const fetchFranchisesData = async () => {
      setLoading(true);
      try {
        if (!userProfile) return;
        // Mock data logic based on user's establishments, or we'll generate realistic simulated ones since typically users have 1-2
        // We will simulate a network to demonstrate the Master Map feature
        const simulatedNetwork: LocationData[] = [
          { id: '1', name: 'Nordique Centre', lat: 48.8566, lng: 2.3522, revenue: 5400, target: 5000, status: 'excellent' },
          { id: '2', name: 'Nordique Ouest', lat: 48.8412, lng: 2.2923, revenue: 3200, target: 4500, status: 'warning' },
          { id: '3', name: 'Nordique Sud', lat: 48.8251, lng: 2.3333, revenue: 4100, target: 4200, status: 'good' },
          { id: '4', name: 'Nordique Est', lat: 48.8611, lng: 2.3999, revenue: 6100, target: 5500, status: 'excellent' }
        ];
        
        setTimeout(() => {
          setLocations(simulatedNetwork);
          setLoading(false);
        }, 800);
        
      } catch (e) {
        console.error(e);
        setLoading(false);
      }
    };
    
    fetchFranchisesData();
  }, [userProfile]);

  return (
    <div className="space-y-6">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5">
              <Zap size={12} className="text-amber-500" />
              Vue Franchise
            </span>
          </div>
          <h1 className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">Master Map</h1>
          <p className="text-slate-500 font-medium mt-1">Supervision globale de votre réseau d'établissements en temps réel.</p>
        </div>
        
        <div className="flex items-center gap-1 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm">
          <button 
            onClick={() => setMapTypeId('roadmap')}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
              mapTypeId === 'roadmap' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <MapIcon size={14} />
            <span className="hidden sm:inline">Standard</span>
          </button>
          <button 
            onClick={() => setMapTypeId('satellite')}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
              mapTypeId === 'satellite' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Layers size={14} />
            <span className="hidden sm:inline">Satellite</span>
          </button>
          <button 
            onClick={() => setMapTypeId('terrain')}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-colors",
              mapTypeId === 'terrain' ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
            )}
          >
            <Mountain size={14} />
            <span className="hidden sm:inline">Relief</span>
          </button>
        </div>
      </header>

      {!hasValidKey ? (
        <div className="bg-white rounded-3xl p-8 border border-amber-200 shadow-sm text-center">
          <MapPin className="mx-auto text-amber-400 mb-4" size={48} />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Clé API Google Maps Requise</h2>
          <p className="text-slate-600 mb-6 max-w-lg mx-auto">
            Pour afficher la carte des franchises, une clé Google Maps Platform est nécessaire.
            Allez dans les paramètres du projet (Secrets) et ajoutez <code className="bg-slate-100 px-2 py-1 rounded">GOOGLE_MAPS_PLATFORM_KEY</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[70vh]">
          {/* Sidebar list */}
          <div className="lg:col-span-1 bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-100">
              <h2 className="font-black text-slate-800 uppercase tracking-wider text-xs">Aperçu Réseau</h2>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {loading ? (
                <div className="flex items-center justify-center h-40 text-slate-400">
                  <Activity className="animate-spin" />
                </div>
              ) : (
                locations.map(loc => (
                  <div key={loc.id} className="p-3 bg-slate-50 rounded-2xl hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-bold text-sm text-slate-900">{loc.name}</h3>
                      <span className={clsx(
                        "w-2 h-2 rounded-full mt-1.5",
                        loc.status === 'excellent' ? 'bg-emerald-500' :
                        loc.status === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                      )} />
                    </div>
                    <div className="text-xs font-semibold text-slate-600">
                      {loc.revenue.toLocaleString('fr-FR')} € / {loc.target.toLocaleString('fr-FR')} €
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Map Container */}
          <div className="lg:col-span-3 bg-slate-100 rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm relative relative">
             <APIProvider apiKey={API_KEY} version="weekly">
                <GoogleMap
                  defaultCenter={{ lat: 48.8566, lng: 2.3522 }}
                  defaultZoom={11}
                  mapId="NORDIC_FRANCHISE_MAP"
                  mapTypeId={mapTypeId}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  style={{ width: '100%', height: '100%' }}
                  disableDefaultUI={true}
                >
                  {!loading && locations.map(loc => (
                    <MarkerWithInfoWindow key={loc.id} location={loc} />
                  ))}
                </GoogleMap>
             </APIProvider>
          </div>
        </div>
      )}
    </div>
  );
}
