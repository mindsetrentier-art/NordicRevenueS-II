import React, { useState, useEffect, useCallback } from 'react';
import { Music, Play, Pause, SkipForward, SkipBack, X, LogIn, Youtube } from 'lucide-react';

type Platform = 'spotify' | 'deezer' | 'youtube';

interface Playlist {
  id: string;
  name: string;
  imageUrl: string;
  trackCount?: number;
}

export function MusicPlayer() {
  const [isOpen, setIsOpen] = useState(false);
  const [activePlatform, setActivePlatform] = useState<Platform>('spotify');
  
  const [tokens, setTokens] = useState<Record<Platform, string | null>>({
    spotify: null,
    deezer: null,
    youtube: null
  });
  
  const [playlists, setPlaylists] = useState<Record<Platform, Playlist[]>>({
    spotify: [],
    deezer: [],
    youtube: []
  });
  
  const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const savedSpotify = localStorage.getItem('spotify_token');
    const savedDeezer = localStorage.getItem('deezer_token');
    const savedYoutube = localStorage.getItem('youtube_token');
    
    setTokens({
      spotify: savedSpotify,
      deezer: savedDeezer,
      youtube: savedYoutube
    });

    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) return;
      
      if (event.data?.type === 'SPOTIFY_AUTH_SUCCESS') {
        const { token } = event.data;
        setTokens(prev => ({ ...prev, spotify: token }));
        localStorage.setItem('spotify_token', token);
        setErrorMsg(null);
      } else if (event.data?.type === 'DEEZER_AUTH_SUCCESS') {
        const { token } = event.data;
        setTokens(prev => ({ ...prev, deezer: token }));
        localStorage.setItem('deezer_token', token);
        setErrorMsg(null);
      } else if (event.data?.type === 'YOUTUBE_AUTH_SUCCESS') {
        const { token } = event.data;
        setTokens(prev => ({ ...prev, youtube: token }));
        localStorage.setItem('youtube_token', token);
        setErrorMsg(null);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleLogout = useCallback((platform: Platform) => {
    setTokens(prev => ({ ...prev, [platform]: null }));
    if (activePlatform === platform) setSelectedPlaylist(null);
    localStorage.removeItem(`${platform}_token`);
  }, [activePlatform]);

  const fetchPlaylists = useCallback(async (platform: Platform) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const token = tokens[platform];
      if (!token) return;

      if (platform === 'spotify') {
        const response = await fetch('https://api.spotify.com/v1/me/playlists', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPlaylists(prev => ({
            ...prev,
            spotify: data.items.map((item: any) => ({
              id: item.id,
              name: item.name,
              imageUrl: item.images?.[0]?.url || '',
              trackCount: item.tracks?.total
            }))
          }));
        } else if (response.status === 401) {
          handleLogout('spotify');
        }
      } else if (platform === 'deezer') {
        // Deezer API might have CORS issues, using a proxy or JSONP is usually needed, but we try standard fetch first
        const response = await fetch(`https://api.deezer.com/user/me/playlists?access_token=${token}`);
        if (response.ok) {
          const data = await response.json();
          if (data.error) {
            if (data.error.code === 300) handleLogout('deezer');
            throw new Error(data.error.message);
          }
          setPlaylists(prev => ({
            ...prev,
            deezer: data.data.map((item: any) => ({
              id: item.id,
              name: item.title,
              imageUrl: item.picture_medium || '',
              trackCount: item.nb_tracks
            }))
          }));
        }
      } else if (platform === 'youtube') {
        const response = await fetch('https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&mine=true&maxResults=50', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setPlaylists(prev => ({
            ...prev,
            youtube: data.items.map((item: any) => ({
              id: item.id,
              name: item.snippet.title,
              imageUrl: item.snippet.thumbnails?.default?.url || '',
              trackCount: item.contentDetails?.itemCount
            }))
          }));
        } else if (response.status === 401) {
          handleLogout('youtube');
        }
      }
    } catch (error) {
      console.error(`Failed to fetch ${platform} playlists:`, error);
    } finally {
      setLoading(false);
    }
  }, [tokens, handleLogout]);

  useEffect(() => {
    if (tokens[activePlatform]) {
      fetchPlaylists(activePlatform);
    }
  }, [tokens, activePlatform, fetchPlaylists]);

  const handleConnect = async (platform: Platform) => {
    try {
      setErrorMsg(null);
      const redirectUri = `${window.location.origin}/auth/${platform}/callback`;
      const response = await fetch(`/api/auth/${platform}/url?redirectUri=${encodeURIComponent(redirectUri)}`);
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to get auth URL');
      }
      
      const { url } = await response.json();
      const authWindow = window.open(url, `${platform}_oauth`, 'width=600,height=700');

      if (!authWindow) {
        setErrorMsg('Veuillez autoriser les popups pour vous connecter.');
      }
    } catch (error: any) {
      console.error('OAuth error:', error);
      setErrorMsg(error.message || 'Erreur de connexion');
    }
  };

  const renderPlayer = () => {
    if (!selectedPlaylist) return null;

    if (activePlatform === 'spotify') {
      return (
        <iframe
          src={`https://open.spotify.com/embed/playlist/${selectedPlaylist}?utm_source=generator&theme=0`}
          width="100%"
          height="152"
          frameBorder="0"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          className="rounded-none"
        ></iframe>
      );
    } else if (activePlatform === 'deezer') {
      return (
        <iframe 
          title="deezer-widget" 
          src={`https://widget.deezer.com/widget/dark/playlist/${selectedPlaylist}`} 
          width="100%" 
          height="152" 
          frameBorder="0" 
          allow="encrypted-media; clipboard-write"
          className="rounded-none"
        ></iframe>
      );
    } else if (activePlatform === 'youtube') {
      return (
        <iframe 
          width="100%" 
          height="152" 
          src={`https://www.youtube.com/embed/videoseries?list=${selectedPlaylist}`} 
          frameBorder="0" 
          allow="autoplay; encrypted-media" 
          allowFullScreen
          className="rounded-none"
        ></iframe>
      );
    }
  };

  const getPlatformColor = (platform: Platform) => {
    switch (platform) {
      case 'spotify': return 'bg-emerald-500 hover:bg-emerald-600';
      case 'deezer': return 'bg-purple-600 hover:bg-purple-700';
      case 'youtube': return 'bg-red-600 hover:bg-red-700';
    }
  };

  const getPlatformTextColor = (platform: Platform) => {
    switch (platform) {
      case 'spotify': return 'text-emerald-500';
      case 'deezer': return 'text-purple-600';
      case 'youtube': return 'text-red-600';
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 text-white rounded-full shadow-lg transition-colors z-40 ${getPlatformColor(activePlatform)}`}
      >
        <Music size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 flex flex-col border-l border-slate-200">
          <div className={`p-4 flex items-center justify-between text-white ${getPlatformColor(activePlatform)}`}>
            <div className="flex items-center gap-2 font-bold">
              <Music size={20} />
              <span className="capitalize">Lecteur {activePlatform}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-black/20 p-1 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="flex border-b border-slate-200 bg-slate-50">
            {(['spotify', 'deezer', 'youtube'] as Platform[]).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setActivePlatform(p);
                  setSelectedPlaylist(null);
                }}
                className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                  activePlatform === p 
                    ? `border-b-2 border-current ${getPlatformTextColor(p)} bg-white` 
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
                {errorMsg}
              </div>
            )}

            {!tokens[activePlatform] ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-2 bg-opacity-10 ${getPlatformTextColor(activePlatform)} ${activePlatform === 'spotify' ? 'bg-emerald-500' : activePlatform === 'deezer' ? 'bg-purple-600' : 'bg-red-600'}`}>
                  {activePlatform === 'youtube' ? <Youtube size={32} /> : <Music size={32} />}
                </div>
                <h3 className="font-bold text-slate-900">Connectez votre musique</h3>
                <p className="text-sm text-slate-500">Écoutez vos playlists {activePlatform} directement pendant que vous travaillez.</p>
                <button
                  onClick={() => handleConnect(activePlatform)}
                  className={`flex items-center gap-2 text-white px-6 py-2 rounded-full font-medium transition-colors ${getPlatformColor(activePlatform)}`}
                >
                  <LogIn size={18} />
                  Connexion <span className="capitalize">{activePlatform}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">Vos Playlists</h3>
                  <button onClick={() => handleLogout(activePlatform)} className="text-xs text-slate-500 hover:text-slate-900 underline">
                    Déconnexion
                  </button>
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${getPlatformTextColor(activePlatform)}`}></div>
                  </div>
                ) : playlists[activePlatform].length > 0 ? (
                  <div className="space-y-2">
                    {playlists[activePlatform].map((playlist) => (
                      <button
                        key={playlist.id}
                        onClick={() => setSelectedPlaylist(playlist.id)}
                        className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors text-left ${
                          selectedPlaylist === playlist.id 
                            ? `bg-opacity-10 border ${activePlatform === 'spotify' ? 'bg-emerald-500 border-emerald-200' : activePlatform === 'deezer' ? 'bg-purple-600 border-purple-200' : 'bg-red-600 border-red-200'}` 
                            : 'hover:bg-slate-100 border border-transparent'
                        }`}
                      >
                        {playlist.imageUrl ? (
                          <img src={playlist.imageUrl} alt={playlist.name} className="w-12 h-12 rounded-md object-cover" />
                        ) : (
                          <div className="w-12 h-12 bg-slate-200 rounded-md flex items-center justify-center text-slate-400">
                            <Music size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate text-sm">{playlist.name}</p>
                          {playlist.trackCount !== undefined && (
                            <p className="text-xs text-slate-500">{playlist.trackCount} titres</p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Aucune playlist trouvée sur votre compte <span className="capitalize">{activePlatform}</span>.
                  </div>
                )}
              </div>
            )}
          </div>

          {selectedPlaylist && (
            <div className="border-t border-slate-200 bg-black h-[152px]">
              {renderPlayer()}
            </div>
          )}
        </div>
      )}
    </>
  );
}
