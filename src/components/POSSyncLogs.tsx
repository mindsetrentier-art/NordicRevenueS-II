import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  Cloud, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  Euro, 
  Compass, 
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Download,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface POSSyncLog {
  id: string;
  userId: string;
  establishmentId?: string;
  posProvider: string;
  status: 'success' | 'failed';
  errorMessage?: string;
  service?: string;
  totalSynced?: number;
  timestamp: any; // Firestore Timestamp
}

export function POSSyncLogs() {
  const { userProfile, updateUserProfile } = useAuth();
  const [logs, setLogs] = useState<POSSyncLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [retryingLogId, setRetryingLogId] = useState<string | null>(null);
  const [analyzingLogId, setAnalyzingLogId] = useState<string | null>(null);
  const [aiDiagnostics, setAiDiagnostics] = useState<{[logId: string]: string}>({});

  const handleAnalyzeError = async (log: POSSyncLog) => {
    if (analyzingLogId) return;
    setAnalyzingLogId(log.id);
    
    try {
      const response = await fetch('/api/analyze-error', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          errorMessage: log.errorMessage,
          posProvider: log.posProvider || userProfile?.posProvider,
          service: log.service
        })
      });
      const data = await response.json();
      if (data.analysis) {
        setAiDiagnostics(prev => ({
          ...prev,
          [log.id]: data.analysis
        }));
      } else if (data.error) {
        setAiDiagnostics(prev => ({
          ...prev,
          [log.id]: `❌ Erreur : ${data.error}`
        }));
      }
    } catch (error) {
      console.error("AI analysis error:", error);
      setAiDiagnostics(prev => ({
        ...prev,
        [log.id]: "❌ Impossible de se connecter au service d'analyse IA."
      }));
    } finally {
      setAnalyzingLogId(null);
    }
  };

  const handleRetrySync = async (log: POSSyncLog) => {
    if (!userProfile?.uid) return;
    setRetryingLogId(log.id);
    
    try {
      // SImulate POS API Sync Call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const totalAmount = Math.floor(Math.random() * 2500) + 1200;
      
      // Update the firestore log to success
      const logRef = doc(db, 'pos_sync_logs', log.id);
      await updateDoc(logRef, {
        status: 'success',
        totalSynced: totalAmount,
        errorMessage: '',
        timestamp: serverTimestamp()
      });

      // Update the user last sync status to success
      const today = format(new Date(), 'yyyy-MM-dd');
      const time = format(new Date(), 'HH:mm');
      
      await updateDoc(doc(db, 'users', userProfile.uid), {
        posLastSyncDate: today,
        posLastSyncTime: time,
        posLastSyncStatus: 'success',
        updatedAt: serverTimestamp()
      });

      updateUserProfile({
        posLastSyncDate: today,
        posLastSyncTime: time,
        posLastSyncStatus: 'success'
      });

      // Refresh logs
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error("Failed to retry POS synchronization:", err);
    } finally {
      setRetryingLogId(null);
    }
  };

  useEffect(() => {
    const fetchLogs = async () => {
      if (!userProfile?.uid) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'pos_sync_logs'),
          where('userId', '==', userProfile.uid),
          orderBy('timestamp', 'desc'),
          limit(15)
        );
        const querySnapshot = await getDocs(q);
        const logsData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as POSSyncLog[];
        setLogs(logsData);
      } catch (err) {
        console.error("Failed to load POS sync logs:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [userProfile, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const exportToCSV = () => {
    if (logs.length === 0) return;
    
    // Header
    const headers = ['ID', 'Date', 'Fournisseur CA (POS)', 'Service', 'Statut', 'Total synchronisé (EUR)', 'Message Erreur'];
    
    // Rows
    const rows = logs.map(log => {
      const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
      const dateFormatted = format(logDate, 'yyyy-MM-dd HH:mm:ss');
      const escapedError = log.errorMessage ? log.errorMessage.replace(/"/g, '""') : '';
      return [
        log.id,
        dateFormatted,
        log.posProvider || userProfile?.posProvider || '',
        log.service || '',
        log.status === 'success' ? 'Réussite' : 'Échec',
        log.totalSynced !== undefined ? log.totalSynced.toString() : '0',
        `"${escapedError}"`
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `smart_sync_historique_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string) => {
    setExpandedLogId(prev => (prev === id ? null : id));
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case 'Zettle': return '⚡';
      case 'Square': return '⬛';
      case 'Zelty': return '🍔';
      case 'Popina': return '📱';
      case 'Addition': return '🧾';
      case 'Lightspeed': return '💡';
      default: return '☁️';
    }
  };

  const successCount = logs.filter(l => l.status === 'success').length;
  const failureCount = logs.filter(l => l.status === 'failed').length;
  const totalCount = logs.length;
  const successRate = totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 100;

  if (!userProfile?.posProvider) {
    return (
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm text-center">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-3">
          <Cloud size={20} className="text-slate-400" />
        </div>
        <h3 className="text-sm font-black text-slate-800 tracking-tight">Aucun POS connecté</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
          Connectez un fournisseur de caisse enregistreuse Smart Sync dans les paramètres pour enregistrer des journaux d'activité.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">Journal des Synchronisations</h2>
          <p className="text-xs text-slate-500 mt-0.5">Diagnostiquez et analysez les flux d'API Smart Sync</p>
        </div>
        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <button
              onClick={exportToCSV}
              className="p-2 px-3 rounded-xl border border-slate-200 hover:border-slate-300 active:bg-slate-50 text-slate-600 hover:text-slate-900 transition-all select-none flex items-center gap-1.5 text-xs font-bold shadow-sm"
              title="Exporter l'historique en CSV"
            >
              <Download size={13} />
              <span>Exporter CSV</span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 rounded-xl border border-slate-200 hover:border-slate-300 active:bg-slate-50 text-slate-500 hover:text-slate-900 transition-all select-none disabled:opacity-50"
            title="Rafraîchir les logs"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-blue-600" : ""} />
          </button>
        </div>
      </div>

      {/* Aggregate Stats Bar */}
      {totalCount > 0 && (
        <div className="bg-slate-50/50 border-b border-slate-100 px-6 py-3 flex gap-4 items-center justify-between text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Taux de réussite :</span>
            <span className={`px-2 py-0.5 rounded-full text-[11px] font-black ${
              successRate >= 90 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
              successRate >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-100' :
              'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              {successRate}%
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-emerald-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> {successCount} OK
            </span>
            <span className="text-rose-600 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" /> {failureCount} Échecs
            </span>
          </div>
        </div>
      )}

      {/* Logs Table / List */}
      <div className="flex-1 divide-y divide-slate-100 overflow-y-auto max-h-[340px]">
        {loading && logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-blue-500" />
            <span className="text-xs font-bold">Chargement du journal des API...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center mx-auto mb-2 text-slate-300 border border-slate-100">
              ⚡
            </div>
            <p className="text-xs font-bold text-slate-600">Aucune activité enregistrée</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs mx-auto">
              Lancez une synchronisation Smart Sync de vos revenus pour visualiser les diagnostics ici en temps réel.
            </p>
          </div>
        ) : (
          logs.map((log) => {
            const isExpanded = expandedLogId === log.id;
            const logDate = log.timestamp?.toDate ? log.timestamp.toDate() : new Date();
            const logFormatted = format(logDate, 'dd MMMM, HH:mm', { locale: fr });

            return (
              <div 
                key={log.id} 
                className={`transition-colors duration-150 ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}
              >
                {/* Row Summary */}
                <div 
                  onClick={() => toggleExpand(log.id)}
                  className="p-4 flex items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center justify-center text-lg shrink-0">
                      {getProviderIcon(log.posProvider || userProfile.posProvider)}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 text-xs truncate">
                          {log.posProvider || 'Système'}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-black tracking-wider leading-none shrink-0 ${
                          log.service === 'midi' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                          log.service === 'soir' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {log.service || 'Service'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-0.5 font-semibold">
                        <Clock size={10} />
                        <span>{logFormatted}</span>
                      </div>
                    </div>
                  </div>

                  {/* Badges / Status */}
                  <div className="flex items-center gap-3 shrink-0">
                    {log.status === 'success' ? (
                      <div className="text-right">
                        <div className="text-xs font-black text-slate-900 tracking-tight">
                          +{log.totalSynced?.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-emerald-600 mt-0.5">
                          <CheckCircle2 size={10} /> OK
                        </span>
                      </div>
                    ) : (
                      <div className="text-right">
                        <div className="text-xs font-black text-rose-600/90 tracking-tight">
                          Échec API
                        </div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-rose-500 mt-0.5">
                          <XCircle size={10} /> Détails
                        </span>
                      </div>
                    )}
                    <span className="text-slate-300">
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </span>
                  </div>
                </div>

                {/* Expanded Trace Logs */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-slate-100"
                    >
                      <div className="p-4 bg-slate-50 border-b border-slate-100 text-[11px] space-y-2 font-medium leading-relaxed">
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-slate-500">
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">ID de la transaction :</span>
                            <span className="font-mono text-slate-700 font-semibold">{log.id}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 font-bold uppercase text-[9px] tracking-wider block">Date complète :</span>
                            <span className="text-slate-700 font-semibold">
                              {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'eeee d MMMM yyyy, HH:mm:ss', { locale: fr }) : '-'}
                            </span>
                          </div>
                        </div>

                        {log.status === 'failed' ? (
                          <div className="space-y-3">
                            <div className="bg-rose-50 border border-rose-100 text-rose-700 rounded-xl p-3 mt-2 flex gap-2 w-full">
                              <ShieldAlert size={14} className="text-rose-500 shrink-0 mt-0.5" />
                              <div className="flex-1 min-w-0">
                                <span className="font-bold block text-rose-900 uppercase text-[9px] tracking-wider">Erreur diagnostic :</span>
                                <p className="mt-0.5 font-semibold text-[11px] leading-relaxed select-all text-rose-950">
                                  {log.errorMessage || "Aucune description d'erreur technique retournée."}
                                </p>
                                <p className="mt-1 text-[10px] text-rose-500 font-semibold">
                                  Suggestion : Vérifiez si vos identifiants d'API ou jetons d'authentification posés dans les paramètres sont obsolètes ou erronés.
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <button
                                  type="button"
                                  disabled={analyzingLogId !== null}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAnalyzeError(log);
                                  }}
                                  className="bg-purple-100 hover:bg-purple-200 text-purple-800 hover:text-purple-900 active:scale-95 disabled:opacity-50 font-extrabold text-[10px] px-3 py-1.5 rounded-xl flex items-center gap-1.2 transition-all select-none cursor-pointer border border-purple-200/50"
                                >
                                  {analyzingLogId === log.id ? (
                                    <>
                                      <RefreshCw size={11} className="animate-spin text-purple-600" />
                                      <span>Analyse en cours...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Sparkles size={11} className="text-purple-600 shrink-0" />
                                      <span>Dépanner avec l'IA</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              <button
                                type="button"
                                disabled={retryingLogId !== null}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRetrySync(log);
                                }}
                                className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-extrabold text-[10px] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all duration-155 border border-transparent disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                              >
                                {retryingLogId === log.id ? (
                                  <>
                                    <RefreshCw size={11} className="animate-spin text-blue-400" />
                                    <span>Synchronisation...</span>
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw size={10} className="text-slate-200" />
                                    <span>Relancer la synchro</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {aiDiagnostics[log.id] && (
                              <motion.div 
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-purple-50/70 border border-purple-100 rounded-2xl p-3.5 mt-2"
                              >
                                <div className="flex items-center gap-1.2 text-purple-900 font-extrabold text-[9px] uppercase tracking-wider mb-1.5">
                                  <Sparkles size={11} className="text-purple-600 shrink-0" />
                                  <span>Diagnostic Intelligent IA</span>
                                </div>
                                <div className="text-[11px] leading-relaxed text-slate-800 markdown-body font-sans">
                                  <ReactMarkdown>{aiDiagnostics[log.id]}</ReactMarkdown>
                                </div>
                                <div className="flex justify-end mt-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAnalyzeError(log);
                                    }}
                                    disabled={analyzingLogId === log.id}
                                    className="text-purple-600 hover:text-purple-800 font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                                  >
                                    <RefreshCw size={10} className={analyzingLogId === log.id ? "animate-spin" : ""} />
                                    <span>Réanalyser</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </div>
                        ) : (
                          <div className="bg-emerald-50/60 border border-emerald-100 text-emerald-800 rounded-xl p-3 mt-2 flex gap-2 w-full">
                            <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold block text-emerald-900 uppercase text-[9px] tracking-wider">Lien OK :</span>
                              <p className="mt-0.5 text-[11px]">
                                Flux d'entrée correctement authentifié. Les données de vente de caisse ont été parsées et appliquées à votre brouillon avec succès.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
