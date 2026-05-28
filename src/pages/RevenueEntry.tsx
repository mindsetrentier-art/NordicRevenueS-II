import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Establishment, Payments, Attachment } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { 
  Zap,
  ZapOff,
  CreditCard, 
  Nfc, 
  Banknote, 
  Receipt, 
  Landmark,
  Save,
  CheckCircle2,
  Sun,
  Moon,
  Calculator as CalculatorIcon,
  Mic,
  MicOff,
  MessageSquare,
  Check,
  X,
  Paperclip,
  Camera,
  FileText,
  AlertCircle,
  MapPin,
  Loader2,
  Sparkles,
  Cloud,
  HelpCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Calculator } from '../components/Calculator';
import { RushMode } from '../components/RushMode';
import { RevenueHistory } from '../components/RevenueHistory';
import { SearchableSelect } from '../components/SearchableSelect';
import { DatePicker } from '../components/DatePicker';
import { POSSyncLogs } from '../components/POSSyncLogs';

const INITIAL_PAYMENTS: Payments = {
  cb: 0,
  cbContactless: 0,
  cash: 0,
  amex: 0,
  amexContactless: 0,
  tr: 0,
  trContactless: 0,
  transfer: 0
};

export function RevenueEntry() {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEst, setSelectedEst] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [paymentsMidi, setPaymentsMidi] = useState<Payments>(INITIAL_PAYMENTS);
  const [paymentsSoir, setPaymentsSoir] = useState<Payments>(INITIAL_PAYMENTS);
  const [notesMidi, setNotesMidi] = useState('');
  const [notesSoir, setNotesSoir] = useState('');
  const [attachmentsMidi, setAttachmentsMidi] = useState<File[]>([]);
  const [attachmentsSoir, setAttachmentsSoir] = useState<File[]>([]);
  const [midiPreviews, setMidiPreviews] = useState<string[]>([]);
  const [soirPreviews, setSoirPreviews] = useState<string[]>([]);

  useEffect(() => {
    const urls = attachmentsMidi.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    setMidiPreviews(urls);
    return () => urls.forEach(url => url && URL.revokeObjectURL(url));
  }, [attachmentsMidi]);

  useEffect(() => {
    const urls = attachmentsSoir.map(file => file.type.startsWith('image/') ? URL.createObjectURL(file) : '');
    setSoirPreviews(urls);
    return () => urls.forEach(url => url && URL.revokeObjectURL(url));
  }, [attachmentsSoir]);

  const [activeMethods, setActiveMethods] = useState<Record<keyof Payments, boolean>>(() => {
    const saved = localStorage.getItem('activePaymentMethods');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      cb: true,
      cbContactless: true,
      cash: true,
      amex: true,
      amexContactless: true,
      tr: true,
      trContactless: true,
      transfer: true
    };
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isMidiActive, setIsMidiActive] = useState(true);
  const [isSoirActive, setIsSoirActive] = useState(true);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [isRushMode, setIsRushMode] = useState(false);
  const [activePaymentField, setActivePaymentField] = useState<{ service: 'midi' | 'soir', field: keyof Payments } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const currentDraftKey = useRef<string>('');

  const [isSmartVoiceActive, setIsSmartVoiceActive] = useState(false);
  const [smartVoiceTranscript, setSmartVoiceTranscript] = useState('');
  const [isProcessingVoice, setIsProcessingVoice] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [posSyncAlertEmailInfo, setPosSyncAlertEmailInfo] = useState<{
    emailAddress: string;
    ruleName: string;
    consecutiveCount: number;
    errorMessage: string;
    timestamp: string;
  } | null>(null);

  const handleSmartSync = async () => {
    if (!userProfile?.posProvider) {
      alert("Veuillez d'abord configurer un POS dans les paramètres.");
      navigate('/settings');
      return;
    }

    setIsSyncing(true);
    setError(null);

    const currentHour = new Date().getHours();
    const serviceType = currentHour < 17 ? 'midi' : 'soir';

    // Simulate POS API Call
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      const hasCredentials = !!(userProfile.posApiKey && userProfile.posClientId);
      
      // If credentials are blank, use a higher failure rate (e.g. 40%) for testing error badges on dashboard.
      // If credentials exist, use a tiny error rate (e.g. 5%) simulating generic network hiccups.
      const failureThreshold = hasCredentials ? 0.05 : 0.40;
      if (Math.random() < failureThreshold) {
        throw new Error(hasCredentials 
          ? "La passerelle API du fournisseur POS a retourné une erreur 503 (Service Temporairement Indisponible)." 
          : "Échec d'authentification API : Identifiants ou clé secrète requis pour établir une liaison stable."
        );
      }

      // Mock Data Generation
      const mockSyncResult: Payments = {
        cb: Math.floor(Math.random() * 2000) + 500,
        cbContactless: Math.floor(Math.random() * 3000) + 1000,
        cash: Math.floor(Math.random() * 500) + 100,
        amex: Math.floor(Math.random() * 800) + 200,
        amexContactless: Math.floor(Math.random() * 400),
        tr: Math.floor(Math.random() * 1000) + 300,
        trContactless: Math.floor(Math.random() * 1500) + 500,
        transfer: 0
      };

      // Populate based on active service
      if (currentHour < 17) {
        setPaymentsMidi(mockSyncResult);
        setIsMidiActive(true);
        setNotesMidi(prev => `${prev}\n[Smart Sync] Importé de ${userProfile.posProvider} à ${format(new Date(), 'HH:mm')}`.trim());
      } else {
        setPaymentsSoir(mockSyncResult);
        setIsSoirActive(true);
        setNotesSoir(prev => `${prev}\n[Smart Sync] Importé de ${userProfile.posProvider} à ${format(new Date(), 'HH:mm')}`.trim());
      }

      // Write Sync Success to Firestore User Profile
      const today = format(new Date(), 'yyyy-MM-dd');
      const time = format(new Date(), 'HH:mm');
      if (userProfile?.uid) {
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
      }

      // Calculate total synced revenue for logging
      const totalSyncedAmt = Object.values(mockSyncResult).reduce((sum, val) => sum + val, 0);

      // Write Sync Success Log
      if (userProfile?.uid) {
        try {
          await addDoc(collection(db, 'pos_sync_logs'), {
            userId: userProfile.uid,
            establishmentId: selectedEst || 'all',
            posProvider: userProfile.posProvider,
            status: 'success',
            service: serviceType,
            totalSynced: totalSyncedAmt,
            timestamp: serverTimestamp()
          });
        } catch (logErr) {
          console.error("Failed to write success sync log:", logErr);
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      const errMsg = err?.message || "Erreur lors de la synchronisation avec le POS.";
      setError(errMsg);

      // Write Sync Failure to Firestore User Profile
      const today = format(new Date(), 'yyyy-MM-dd');
      const time = format(new Date(), 'HH:mm');
      if (userProfile?.uid) {
        try {
          await updateDoc(doc(db, 'users', userProfile.uid), {
            posLastSyncDate: today,
            posLastSyncTime: time,
            posLastSyncStatus: 'failed',
            updatedAt: serverTimestamp()
          });
          updateUserProfile({
            posLastSyncDate: today,
            posLastSyncTime: time,
            posLastSyncStatus: 'failed'
          });
        } catch (dbErr) {
          console.error("Failed to write failure sync status:", dbErr);
        }
      }

      // Write Sync Failure Log
      if (userProfile?.uid && userProfile?.posProvider) {
        try {
          await addDoc(collection(db, 'pos_sync_logs'), {
            userId: userProfile.uid,
            establishmentId: selectedEst || 'all',
            posProvider: userProfile.posProvider,
            status: 'failed',
            errorMessage: errMsg,
            service: serviceType,
            totalSynced: 0,
            timestamp: serverTimestamp()
          });

          // Check for active consecutive failure alert rules and trigger proactively
          try {
            const alertsQuery = query(
              collection(db, 'alerts'),
              where('userId', '==', userProfile.uid),
              where('type', '==', 'pos_consecutive_failures'),
              where('isActive', '==', true)
            );
            const alertsSnap = await getDocs(alertsQuery);
            const activeAlerts = alertsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) }));
            
            if (activeAlerts.length > 0) {
              const logsQuery = query(
                collection(db, 'pos_sync_logs'),
                where('userId', '==', userProfile.uid),
                limit(10)
              );
              const logsSnap = await getDocs(logsQuery);
              let logs = logsSnap.docs.map(doc => doc.data() as any);
              
              logs.sort((a, b) => {
                const timeA = a.timestamp?.toMillis ? a.timestamp.toMillis() : (a.timestamp ? new Date(a.timestamp).getTime() : 0);
                const timeB = b.timestamp?.toMillis ? b.timestamp.toMillis() : (b.timestamp ? new Date(b.timestamp).getTime() : 0);
                return timeB - timeA;
              });

              // Prepend our current attempt which is synchronous and we know it failed
              const currentLog = {
                status: 'failed',
                timestamp: new Date()
              };
              logs = [currentLog, ...logs.filter(l => l.timestamp)];

              for (const alert of activeAlerts) {
                const threshold = alert.threshold || 3;
                let consecutiveFails = 0;
                
                for (const logItem of logs) {
                  if (logItem.status === 'failed') {
                    consecutiveFails++;
                  } else if (logItem.status === 'success') {
                    break;
                  }
                }

                if (consecutiveFails >= threshold) {
                  if (alert.notifyEmail && alert.emailAddress) {
                    setPosSyncAlertEmailInfo({
                      emailAddress: alert.emailAddress,
                      ruleName: alert.name,
                      consecutiveCount: consecutiveFails,
                      errorMessage: errMsg,
                      timestamp: format(new Date(), 'HH:mm:ss')
                    });
                  }
                }
              }
            }
          } catch (alertErr) {
            console.error("Error evaluating POS consecutive failure alerts: ", alertErr);
          }

        } catch (logErr) {
          console.error("Failed to write failure sync log:", logErr);
        }
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const processSmartVoice = async (transcript: string) => {
    setIsProcessingVoice(true);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.warn("Gemini API key missing for Voice processing");
        return;
      }
      const { GoogleGenAI } = await import('@google/genai');
      const ai = new GoogleGenAI({ apiKey });

      const prompt = `
        Tu es un assistant expert en saisie de revenus pour un restaurant. 
        À partir de la transcription vocale suivante, extrais les montants pour chaque service (midi/soir) et chaque mode de paiement.
        
        Modes de paiement disponibles :
        - cb (Carte Bancaire classique)
        - cbContactless (CB Sans Contact)
        - cash (Espèces)
        - amex (American Express)
        - amexContactless (AMEX Sans Contact)
        - tr (Titres Restaurant papier)
        - trContactless (TR Dématérialisé/Carte)
        - transfer (Virement)

        Transcription : "${transcript}"

        Renvoie UNIQUEMENT un objet JSON avec cette structure (ne mets que les champs trouvés) :
        {
          "midi": { "cb": 45.50, "cash": 10 },
          "soir": { "amex": 120.00 }
        }
        
        Si l'utilisateur ne précise pas midi ou soir, suppose que c'est pour le service actif actuel (isMidiActive=${isMidiActive ? 'OUI' : 'NON'}, isSoirActive=${isSoirActive ? 'OUI' : 'NON'}).
        Réponds uniquement en JSON.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{.*\}/s);
      
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        if (data.midi) {
          setPaymentsMidi(prev => ({ ...prev, ...data.midi }));
          if (!isMidiActive) setIsMidiActive(true);
        }
        if (data.soir) {
          setPaymentsSoir(prev => ({ ...prev, ...data.soir }));
          if (!isSoirActive) setIsSoirActive(true);
        }
      }
    } catch (err) {
      console.error("Smart Voice Processing Error:", err);
    } finally {
      setIsProcessingVoice(false);
      setIsSmartVoiceActive(false);
      setSmartVoiceTranscript('');
    }
  };

  const toggleSmartVoice = () => {
    if (isSmartVoiceActive) {
      setIsSmartVoiceActive(false);
      return;
    }

    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsSmartVoiceActive(true);
      setSmartVoiceTranscript('');
    };

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0])
        .map((result) => result.transcript)
        .join('');
      setSmartVoiceTranscript(transcript);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsSmartVoiceActive(false);
    };

    recognition.onend = () => {
      if (smartVoiceTranscript.trim()) {
        processSmartVoice(smartVoiceTranscript);
      } else {
        setIsSmartVoiceActive(false);
      }
    };

    recognition.start();
  };

  useEffect(() => {
    if (!selectedEst || !date) return;
    const newDraftKey = `revenue_draft_${selectedEst}_${date}`;
    
    if (currentDraftKey.current !== newDraftKey) {
      // Load draft when switching establishment or date
      const saved = localStorage.getItem(newDraftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setPaymentsMidi(parsed.paymentsMidi || INITIAL_PAYMENTS);
          setPaymentsSoir(parsed.paymentsSoir || INITIAL_PAYMENTS);
          setNotesMidi(parsed.notesMidi || '');
          setNotesSoir(parsed.notesSoir || '');
          setIsMidiActive(parsed.isMidiActive ?? true);
          setIsSoirActive(parsed.isSoirActive ?? true);
          setLastSaved(new Date(parsed.timestamp));
        } catch (e) {
          console.error("Failed to load draft", e);
        }
      } else {
        setPaymentsMidi(INITIAL_PAYMENTS);
        setPaymentsSoir(INITIAL_PAYMENTS);
        setNotesMidi('');
        setNotesSoir('');
        setIsMidiActive(true);
        setIsSoirActive(true);
        setLastSaved(null);
      }
      currentDraftKey.current = newDraftKey;
    } else {
      // Save draft when values change
      const draft = {
        paymentsMidi,
        paymentsSoir,
        notesMidi,
        notesSoir,
        isMidiActive,
        isSoirActive,
        timestamp: new Date().toISOString()
      };
      
      const isInitial = 
        JSON.stringify(paymentsMidi) === JSON.stringify(INITIAL_PAYMENTS) &&
        JSON.stringify(paymentsSoir) === JSON.stringify(INITIAL_PAYMENTS) &&
        !notesMidi && !notesSoir && isMidiActive && isSoirActive;
        
      if (success) {
        localStorage.removeItem(newDraftKey);
        setLastSaved(null);
      } else if (!isInitial) {
        localStorage.setItem(newDraftKey, JSON.stringify(draft));
        setLastSaved(new Date());
      } else {
        localStorage.removeItem(newDraftKey);
        setLastSaved(null);
      }
    }
  }, [selectedEst, date, paymentsMidi, paymentsSoir, notesMidi, notesSoir, isMidiActive, isSoirActive, success]);

  useEffect(() => {
    localStorage.setItem('activePaymentMethods', JSON.stringify(activeMethods));
  }, [activeMethods]);

  useEffect(() => {
    const fetchEstablishments = async () => {
      if (!userProfile) return;
      try {
        let estData: Establishment[] = [];
        
        if (userProfile.role === 'admin') {
          const estQuery = query(collection(db, 'establishments'));
          const estSnap = await getDocs(estQuery);
          estData = estSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
        } else {
          const createdQuery = query(collection(db, 'establishments'), where('createdBy', '==', userProfile.uid));
          const createdSnap = await getDocs(createdQuery);
          const createdData = createdSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
          
          let assignedData: Establishment[] = [];
          if (userProfile.establishmentIds && userProfile.establishmentIds.length > 0) {
            const assignedQuery = query(collection(db, 'establishments'), where('__name__', 'in', userProfile.establishmentIds));
            const assignedSnap = await getDocs(assignedQuery);
            assignedData = assignedSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
          }
          
          const allData = [...createdData, ...assignedData];
          estData = Array.from(new Map(allData.map(item => [item.id, item])).values());
        }
        
        setEstablishments(estData);
        // Only set selectedEst if it's not already set to avoid resetting user selection on refresh
        setEstablishments(prev => {
          if (estData.length > 0) {
            setSelectedEst(current => current || estData[0].id);
          }
          return estData;
        });
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'establishments');
      }
    };

    fetchEstablishments();

    // Refresh establishments every 5 minutes (300000 ms)
    const intervalId = setInterval(fetchEstablishments, 300000);

    return () => clearInterval(intervalId);
  }, [userProfile]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the earth in km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };

  const deg2rad = (deg: number) => {
    return deg * (Math.PI / 180);
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        if (establishments.length === 0) {
          setIsGeolocating(false);
          return;
        }

        let nearestEst = establishments[0];
        let minDistance = Infinity;

        establishments.forEach(est => {
          if (est.latitude && est.longitude) {
            const dist = calculateDistance(latitude, longitude, est.latitude, est.longitude);
            if (dist < minDistance) {
              minDistance = dist;
              nearestEst = est;
            }
          }
        });

        if (minDistance !== Infinity) {
          setSelectedEst(nearestEst.id);
        } else {
          alert("Aucun établissement n'a de coordonnées enregistrées pour la comparaison.");
        }
        setIsGeolocating(false);
      },
      (error) => {
        console.error("Error geolocating:", error);
        alert("Impossible de vous géolocaliser. Veuillez vérifier vos permissions.");
        setIsGeolocating(false);
      }
    );
  };

  const handleToggleMethod = (field: keyof Payments) => {
    setActiveMethods(prev => {
      const newState = !prev[field];
      if (!newState) {
        setPaymentsMidi(p => ({ ...p, [field]: 0 }));
        setPaymentsSoir(p => ({ ...p, [field]: 0 }));
      }
      return { ...prev, [field]: newState };
    });
  };

  const totalMidi = isMidiActive ? Object.values(paymentsMidi).reduce((sum, val) => sum + val, 0) : 0;
  const totalSoir = isSoirActive ? Object.values(paymentsSoir).reduce((sum, val) => sum + val, 0) : 0;
  const totalJournee = totalMidi + totalSoir;
  const currentEst = establishments.find(e => e.id === selectedEst);
  const dailyGoal = currentEst?.dailyGoal || 5000;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEst) {
      setError("Veuillez sélectionner un établissement.");
      return;
    }
    if (!userProfile) return;
    
    setLoading(true);
    setSuccess(false);
    setError(null);
    
    try {
      const promises = [];
      
      const uploadAttachments = async (files: File[], service: string): Promise<Attachment[]> => {
        const uploaded: Attachment[] = [];
        for (const file of files) {
          const fileRef = ref(storage, `revenues/${selectedEst}/${date}/${service}/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          uploaded.push({
            url,
            name: file.name,
            type: file.type,
            size: file.size
          });
        }
        return uploaded;
      };

      let midiAttachmentsData: Attachment[] = [];
      let soirAttachmentsData: Attachment[] = [];

      if (isMidiActive && attachmentsMidi.length > 0) {
        midiAttachmentsData = await uploadAttachments(attachmentsMidi, 'midi');
      }
      if (isSoirActive && attachmentsSoir.length > 0) {
        soirAttachmentsData = await uploadAttachments(attachmentsSoir, 'soir');
      }
      
      if (isMidiActive) {
        promises.push(addDoc(collection(db, 'revenues'), {
          establishmentId: selectedEst,
          date,
          service: 'midi',
          payments: paymentsMidi,
          total: totalMidi,
          notes: notesMidi.trim(),
          attachments: midiAttachmentsData,
          createdBy: userProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }

      if (isSoirActive) {
        promises.push(addDoc(collection(db, 'revenues'), {
          establishmentId: selectedEst,
          date,
          service: 'soir',
          payments: paymentsSoir,
          total: totalSoir,
          notes: notesSoir.trim(),
          attachments: soirAttachmentsData,
          createdBy: userProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }

      if (promises.length > 0) {
        await Promise.all(promises);
      }
      
      setSuccess(true);
      setPaymentsMidi(INITIAL_PAYMENTS);
      setPaymentsSoir(INITIAL_PAYMENTS);
      setNotesMidi('');
      setNotesSoir('');
      setAttachmentsMidi([]);
      setAttachmentsSoir([]);
      setRefreshTrigger(prev => prev + 1);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving revenue:", err);
      setError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
      handleFirestoreError(err, OperationType.CREATE, 'revenues');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto relative">
      {/* Smart Voice Overlay */}
      {isSmartVoiceActive && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl border border-slate-100 flex flex-col items-center text-center animate-in zoom-in-95 duration-300">
            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6 relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
              <Mic size={40} className="text-blue-600 relative z-10" />
            </div>
            <h2 className="text-2xl font-black text-slate-900 mb-2 italic">Dites les montants...</h2>
            <p className="text-slate-500 font-medium mb-8 leading-relaxed">
              Exemple : "Midi CB 45 euros 20, Espèces 10. Soir AMEX 300 euros".
            </p>
            <div className="w-full min-h-[80px] bg-slate-50 rounded-2xl p-4 border border-slate-100 flex items-center justify-center text-lg font-bold text-slate-700 italic">
              {smartVoiceTranscript || 'Écoute en cours...'}
            </div>
            <button 
              onClick={() => setIsSmartVoiceActive(false)}
              className="mt-8 px-8 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Processing Voice Loader */}
      {isProcessingVoice && (
        <div className="fixed top-24 right-8 z-[90] flex items-center gap-3 bg-white px-4 py-3 rounded-2xl shadow-xl border border-blue-50 animate-in slide-in-from-right-8 duration-500">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 rounded-full animate-ping" />
            <Sparkles size={20} className="text-blue-600 relative z-10" />
          </div>
          <span className="text-sm font-black text-slate-900 italic">Apollo analyse votre voix...</span>
        </div>
      )}

      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saisie des Recettes</h1>
          <p className="text-slate-500 text-sm mt-1">Enregistrez les encaissements pour les services du midi et du soir.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleSmartVoice}
            disabled={isProcessingVoice}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm",
              isSmartVoiceActive 
                ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                : "bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100"
            )}
          >
            {isProcessingVoice ? <Loader2 size={18} className="animate-spin" /> : <Mic size={18} />}
            <span className="hidden sm:inline">Dictée Intelligente</span>
          </button>
          
          <button
            type="button"
            onClick={handleSmartSync}
            disabled={isSyncing}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm",
              userProfile?.posProvider 
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100" 
                : "bg-slate-50 text-slate-400 border border-slate-200 hover:bg-slate-100 hover:text-slate-600"
            )}
          >
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Cloud size={18} />}
            <span className="hidden sm:inline">
              {userProfile?.posProvider ? `Sync ${userProfile.posProvider}` : "Smart Sync (POS)"}
            </span>
          </button>
          
          <button
            type="button"
            onClick={() => setIsRushMode(!isRushMode)}
            className={clsx(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold transition-all active:scale-95 shadow-sm",
              isRushMode 
                ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" 
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            )}
          >
            {isRushMode ? <Zap size={20} className="animate-pulse" /> : <ZapOff size={20} />}
            <span className="hidden sm:inline">{isRushMode ? "Mode Rush Actif" : "Mode Service Intense"}</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCalculatorOpen(!isCalculatorOpen)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-colors shadow-sm ${
              isCalculatorOpen 
                ? 'bg-blue-100 text-blue-700 border-2 border-blue-200' 
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <CalculatorIcon size={20} />
            <span className="hidden sm:inline">Calculatrice</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        )}
        {/* Header Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 relative group">
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
               <Sparkles size={120} className="text-blue-600" />
            </div>
          </div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-semibold text-slate-700">Établissement</label>
              <button
                type="button"
                onClick={handleGeolocate}
                disabled={isGeolocating || establishments.length === 0}
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
              >
                <MapPin size={12} />
                {isGeolocating ? 'Localisation...' : 'Plus proche'}
              </button>
            </div>
            {establishments.length === 0 ? (
              <div className="text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200 text-sm">
                Aucun établissement disponible. Veuillez en créer un dans les paramètres.
              </div>
            ) : (
              <SearchableSelect
                options={establishments.map(est => ({ id: est.id, name: est.name }))}
                value={selectedEst}
                onChange={setSelectedEst}
                placeholder="Sélectionnez un établissement"
              />
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Date d'exploitation</label>
            <DatePicker 
              date={date} 
              onChange={setDate} 
            />
          </div>
          <div className="md:col-span-2 pt-4 border-t border-slate-100 flex items-start gap-4">
             <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                <Sparkles size={16} />
             </div>
             <div className="text-xs text-slate-500 leading-relaxed font-medium">
                <span className="font-bold text-slate-900 leading-none">Astuce Nordic IA : </span>
                Gagnez du temps en prenant une photo de votre "Ticket Z" ou rapport de caisse fin de journée. Notre IA Gemini extraira automatiquement les montants pour chaque mode de paiement.
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Midi */}
          <ServiceSection 
            title="Service du Midi" 
            icon={<Sun className="text-amber-500" size={24} />}
            payments={paymentsMidi}
            setPayments={setPaymentsMidi}
            activePaymentField={activePaymentField}
            setActivePaymentField={(field) => setActivePaymentField({ service: 'midi', field })}
            notes={notesMidi}
            setNotes={setNotesMidi}
            attachments={attachmentsMidi}
            previews={midiPreviews}
            setAttachments={setAttachmentsMidi}
            activeMethods={activeMethods}
            onToggleMethod={handleToggleMethod}
            total={totalMidi}
            isActive={isMidiActive}
            setDate={setDate}
            onToggleActive={() => {
              setIsMidiActive(!isMidiActive);
              if (isMidiActive) {
                setPaymentsMidi(INITIAL_PAYMENTS);
                setNotesMidi('');
                setAttachmentsMidi([]);
              }
            }}
          />

          {/* Section Soir */}
          <ServiceSection 
            title="Service du Soir" 
            icon={<Moon className="text-indigo-500" size={24} />}
            payments={paymentsSoir}
            setPayments={setPaymentsSoir}
            activePaymentField={activePaymentField}
            setActivePaymentField={(field) => setActivePaymentField({ service: 'soir', field })}
            notes={notesSoir}
            setNotes={setNotesSoir}
            attachments={attachmentsSoir}
            previews={soirPreviews}
            setAttachments={setAttachmentsSoir}
            activeMethods={activeMethods}
            onToggleMethod={handleToggleMethod}
            total={totalSoir}
            isActive={isSoirActive}
            setDate={setDate}
            onToggleActive={() => {
              setIsSoirActive(!isSoirActive);
              if (isSoirActive) {
                setPaymentsSoir(INITIAL_PAYMENTS);
                setNotesSoir('');
                setAttachmentsSoir([]);
              }
            }}
          />
        </div>

        {/* Footer / Submit */}
        <div className="sticky bottom-4 bg-white p-6 pb-24 sm:pb-6 sm:pr-24 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-6 z-10">
          <div className="w-full sm:w-auto flex-1 max-w-xs">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-1">Total Journalier</p>
            <p className="text-3xl font-black text-slate-900 mb-3">
              {totalJournee.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
            
            {/* Objectif Progress */}
            <div className="w-full">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1.5">
                <span>Objectif {dailyGoal.toLocaleString()} €</span>
                <span className={clsx(
                  totalJournee >= dailyGoal ? "text-emerald-600" : "text-blue-600"
                )}>
                  {Math.min(100, (totalJournee / dailyGoal) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                <div 
                  className={clsx(
                    "h-full rounded-full transition-all duration-700 ease-out",
                    totalJournee >= dailyGoal 
                      ? "bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" 
                      : "bg-gradient-to-r from-blue-400 to-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
                  )}
                  style={{ width: `${Math.min((totalJournee / dailyGoal) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto mt-2 sm:mt-0">
            {success && (
              <span className="flex items-center text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="mr-1" size={18} /> Enregistré
              </span>
            )}
            {!success && lastSaved && (
              <span className="hidden sm:flex items-center text-slate-400 font-medium text-xs">
                Brouillon sauvegardé à {format(lastSaved, 'HH:mm')}
              </span>
            )}
            <button
              type="submit"
              disabled={loading || !selectedEst || (!isMidiActive && !isSoirActive)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-3 px-8 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-blue-600/20"
            >
              {loading ? 'Enregistrement...' : (
                <>
                  <Save size={20} /> Valider la journée
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {isCalculatorOpen && (
        <Calculator 
          onClose={() => setIsCalculatorOpen(false)} 
          activePaymentType={activePaymentField?.field}
          initialValue={activePaymentField ? (activePaymentField.service === 'midi' ? paymentsMidi[activePaymentField.field] : paymentsSoir[activePaymentField.field]).toString() : '0'}
          onPaymentTypeSelect={(type) => {
            if (activePaymentField) {
              setActivePaymentField({ ...activePaymentField, field: type as keyof Payments });
            } else {
              setActivePaymentField({ service: 'midi', field: type as keyof Payments });
            }
          }}
          onApply={(value) => {
            if (activePaymentField) {
              const { service, field } = activePaymentField;
              if (service === 'midi') {
                setPaymentsMidi(prev => ({ ...prev, [field]: value }));
              } else {
                setPaymentsSoir(prev => ({ ...prev, [field]: value }));
              }
            }
          }}
        />
      )}

      {isRushMode && (
        <RushMode 
          paymentsMidi={paymentsMidi}
          paymentsSoir={paymentsSoir}
          setPaymentsMidi={setPaymentsMidi}
          setPaymentsSoir={setPaymentsSoir}
          onClose={() => setIsRushMode(false)}
        />
      )}

      <RevenueHistory establishmentId={selectedEst} refreshTrigger={refreshTrigger} />

      {userProfile?.posProvider && (
        <div className="mt-8">
          <POSSyncLogs />
        </div>
      )}

      {/* POS Consecutive Failure Alert Notification Modal */}
      {posSyncAlertEmailInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl border border-rose-100 shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-rose-50 border-b border-rose-100 p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-rose-600/25">
                <AlertCircle size={24} />
              </div>
              <div className="flex-1">
                <span className="text-[10px] bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  Alerte Intégration Caisse active
                </span>
                <h3 className="text-xl font-black text-rose-950 mt-1">
                  Échecs consécutifs Smart Sync
                </h3>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                Votre règle d'alerte personnalisée <strong className="text-rose-900">"{posSyncAlertEmailInfo.ruleName}"</strong> vient d'être déclenchée.
              </p>
              
              <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl space-y-2 text-xs font-semibold text-slate-600">
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span>Conditions de déclenchement :</span>
                  <span className="text-rose-700 font-extrabold">{posSyncAlertEmailInfo.consecutiveCount} Échecs consécutifs</span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span>Dernier message d'erreur d'API :</span>
                  <span className="text-slate-800 font-bold truncate max-w-[200px]" title={posSyncAlertEmailInfo.errorMessage}>
                    {posSyncAlertEmailInfo.errorMessage}
                  </span>
                </div>
                <div className="flex justify-between items-center pb-2 border-b border-slate-200/50">
                  <span>Heure de l'alerte :</span>
                  <span className="text-slate-500">{posSyncAlertEmailInfo.timestamp}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Destinataire de la notification :</span>
                  <span className="text-blue-600 font-semibold">{posSyncAlertEmailInfo.emailAddress}</span>
                </div>
              </div>

              <div className="bg-blue-50/60 border border-blue-100/50 p-4 rounded-2xl flex gap-3 text-xs leading-relaxed text-blue-950 font-medium font-sans">
                <div className="text-blue-600 text-base select-none">✉️</div>
                <div>
                  <h4 className="font-bold text-blue-900 mb-0.5">Notification instantanée émise</h4>
                  Un courriel de diagnostic détaillé a été envoyé à <strong className="font-bold">{posSyncAlertEmailInfo.emailAddress}</strong> pour aider votre équipe à diagnostiquer et rétablir la connexion.
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-100 px-6 py-4 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Smart Sync Diagnostics v2</span>
              <button
                type="button"
                onClick={() => setPosSyncAlertEmailInfo(null)}
                className="bg-slate-900 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all duration-150 border border-transparent cursor-pointer"
              >
                Prendre connaissance
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceSection({
  title,
  icon,
  payments,
  setPayments,
  activePaymentField,
  setActivePaymentField,
  notes,
  setNotes,
  attachments,
  previews,
  setAttachments,
  activeMethods,
  onToggleMethod,
  total,
  isActive,
  onToggleActive,
  setDate
}: {
  title: string;
  icon: React.ReactNode;
  payments: Payments;
  setPayments: React.Dispatch<React.SetStateAction<Payments>>;
  activePaymentField: { service: 'midi' | 'soir', field: keyof Payments } | null;
  setActivePaymentField: (field: keyof Payments) => void;
  notes: string;
  setNotes: React.Dispatch<React.SetStateAction<string>>;
  attachments: File[];
  previews: string[];
  setAttachments: React.Dispatch<React.SetStateAction<File[]>>;
  activeMethods: Record<keyof Payments, boolean>;
  onToggleMethod: (field: keyof Payments) => void;
  total: number;
  isActive: boolean;
  onToggleActive: () => void;
  setDate?: React.Dispatch<React.SetStateAction<string>>;
}) {
  const [isListeningNotes, setIsListeningNotes] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const recognitionRef = useRef<any>(null);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files);
    setAttachments(prev => [...prev, ...fileArray]);

    const imageFile = fileArray.find(f => f.type.startsWith('image/'));
    if (imageFile) {
      setIsExtracting(true);
      try {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
          console.warn("Gemini API key missing for Vision extraction");
          return;
        }
        const { GoogleGenAI } = await import('@google/genai');
        const ai = new GoogleGenAI({ apiKey });

        const reader = new FileReader();
        reader.readAsDataURL(imageFile);
        await new Promise(resolve => reader.onload = resolve);
        const base64Data = (reader.result as string).split(',')[1];

        const prompt = `
          Tu es un assistant comptable expert. Analyse ce reçu/facture.
          Extrais les informations suivantes au format JSON strict :
          - "total": le montant total TTC (nombre flottant, ex: 120.50)
          - "vat": le montant de la TVA (nombre flottant, 0 si non trouvé)
          - "date": la date du reçu au format YYYY-MM-DD (chaîne vide si non trouvée)
          - "method": la méthode de paiement probable ("cb", "cash", "tr", ou null)
          
          Ne renvoie QUE le JSON, sans aucun markdown ni texte autour.
        `;

        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: [
            prompt,
            {
              inlineData: {
                data: base64Data,
                mimeType: imageFile.type
              }
            }
          ]
        });

        const text = response.text || '';
        const jsonMatch = text.match(/\{.*\}/s);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          
          let notesAddition = `[IA] Reçu scanné : Total ${data.total}€`;
          if (data.vat) notesAddition += ` (dont TVA ${data.vat}€)`;
          
          setNotes(prev => prev ? `${prev}\n${notesAddition}` : notesAddition);

          if (data.date && setDate) {
            setDate(data.date);
          }

          if (data.total && data.total > 0) {
            const method = data.method && activeMethods[data.method as keyof Payments] ? data.method : 'cb';
            // Only overwrite if current total is 0 to avoid deleting user data
            if (total === 0) {
               setPayments(prev => ({ ...prev, [method]: data.total }));
            }
          }
        }
      } catch (err) {
        console.error("Erreur d'extraction IA:", err);
      } finally {
        setIsExtracting(false);
      }
    }
  };

  const toggleListeningNotes = () => {
    if (!isActive) return;

    if (isListeningNotes) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListeningNotes(false);
      return;
    }
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = 'fr-FR';
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onstart = () => {
      setIsListeningNotes(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        }
      }
      if (finalTranscript) {
        setNotes(prev => prev ? prev.trim() + ' ' + finalTranscript.trim() : finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      setIsListeningNotes(false);
    };

    recognition.onend = () => {
      setIsListeningNotes(false);
    };

    recognition.start();
  };

  const handleInputChange = (field: keyof Payments, value: string) => {
    if (!activeMethods[field] || !isActive) return;
    const numValue = value === '' ? 0 : parseFloat(value);
    if (numValue < 0) return;
    setPayments(prev => ({ ...prev, [field]: isNaN(numValue) ? 0 : numValue }));
  };

  const handleGroupTotalChange = (group: 'cb' | 'amex' | 'tr', totalValue: string) => {
    if (!isActive) return;
    const numTotal = totalValue === '' ? 0 : parseFloat(totalValue);
    if (isNaN(numTotal) || numTotal < 0) return;

    let fields: (keyof Payments)[] = [];
    if (group === 'cb') fields = ['cb', 'cbContactless'];
    else if (group === 'amex') fields = ['amex', 'amexContactless'];
    else if (group === 'tr') fields = ['tr', 'trContactless'];

    const activeFields = fields.filter(f => activeMethods[f]);
    if (activeFields.length === 0) return;

    setPayments(prev => {
      const next = { ...prev };
      const currentGroupSum = activeFields.reduce((sum, f) => sum + prev[f], 0);

      if (currentGroupSum === 0) {
        // Fallback to equal distribution if current values are all zero
        const distributedValue = Number((numTotal / activeFields.length).toFixed(2));
        activeFields.forEach(f => {
          next[f] = distributedValue;
        });
      } else {
        // Proportional distribution
        activeFields.forEach(f => {
          const ratio = prev[f] / currentGroupSum;
          next[f] = Number((numTotal * ratio).toFixed(2));
        });
      }

      // Reset inactive fields in the group
      fields.forEach(f => {
        if (!activeMethods[f]) next[f] = 0;
      });

      // Adjust for rounding errors to ensure the sum matches the entered total
      const newSum = activeFields.reduce((sum, f) => sum + next[f], 0);
      const diff = numTotal - newSum;
      if (Math.abs(diff) > 0.001 && activeFields.length > 0) {
        // Add the difference to the field with the largest value to minimize relative impact
        const fieldToAdjust = activeFields.reduce((prevField, currField) => 
          next[currField] > next[prevField] ? currField : prevField
        , activeFields[0]);
        next[fieldToAdjust] = Number((next[fieldToAdjust] + diff).toFixed(2));
      }

      return next;
    });
  };

  return (
    <div className={`bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full transition-opacity ${!isActive ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={onToggleActive}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
          >
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            {icon} {title}
          </h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Service</p>
          <p className="text-xl font-black text-slate-900">
            {total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>
      </div>

      <div className={`space-y-8 flex-1 ${!isActive ? 'pointer-events-none' : ''}`}>
        {/* CB */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <CreditCard className="text-blue-600" size={16} /> Cartes Bancaires
            </h3>
            <GroupTotalInput 
              label="Total"
              value={payments.cb + payments.cbContactless}
              onChange={(v) => handleGroupTotalChange('cb', v)}
              colorClass="blue"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Paiement Carte" 
              value={payments.cb} 
              onChange={(v) => handleInputChange('cb', v)} 
              onFocus={() => setActivePaymentField('cb')}
              icon={<CreditCard size={20} />} 
              isActive={activeMethods.cb}
              onToggle={() => onToggleMethod('cb')}
              tooltipText="TVA standard par défaut (20% pour la consommation sur place, 10% ou 5,5% pour la vente à emporter). Soumis aux frais réseau bancaires habituels (environ 0,4% à 1,5%)."
            />
            <PaymentInput 
              label="Carte Sans Contact" 
              value={payments.cbContactless} 
              onChange={(v) => handleInputChange('cbContactless', v)} 
              onFocus={() => setActivePaymentField('cbContactless')}
              icon={<Nfc size={20} />} 
              isActive={activeMethods.cbContactless}
              onToggle={() => onToggleMethod('cbContactless')}
              tooltipText="Paiements sans contact par carte. Même taux de TVA collectée (sur place vs à emporter) et frais bancaires identiques qu'un paiement classique inséré."
            />
          </div>
        </div>

        {/* AMEX */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <CreditCard className="text-amber-600" size={16} /> American Express
            </h3>
            <GroupTotalInput 
              label="Total"
              value={payments.amex + payments.amexContactless}
              onChange={(v) => handleGroupTotalChange('amex', v)}
              colorClass="amber"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Carte AMEX" 
              value={payments.amex} 
              onChange={(v) => handleInputChange('amex', v)} 
              onFocus={() => setActivePaymentField('amex')}
              icon={<CreditCard size={20} />} 
              isActive={activeMethods.amex}
              onToggle={() => onToggleMethod('amex')}
              tooltipText="TVA standard de l'établissement. Frais AMEX plus élevés (entre 1,5% et 3,5% HT), facturés sans TVA par l'émetteur et imputés en frais financiers déductibles."
            />
            <PaymentInput 
              label="AMEX Sans Contact" 
              value={payments.amexContactless} 
              onChange={(v) => handleInputChange('amexContactless', v)} 
              onFocus={() => setActivePaymentField('amexContactless')}
              icon={<Nfc size={20} />} 
              isActive={activeMethods.amexContactless}
              onToggle={() => onToggleMethod('amexContactless')}
              tooltipText="Transactions AMEX mobiles ou sans contact physiques. Soumis à la même base fiscale de TVA et aux commissions supérieures du réseau American Express."
            />
          </div>
        </div>

        {/* TR */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <Receipt className="text-emerald-600" size={16} /> Titres-Restaurant
            </h3>
            <GroupTotalInput 
              label="Total"
              value={payments.tr + payments.trContactless}
              onChange={(v) => handleGroupTotalChange('tr', v)}
              colorClass="emerald"
            />
          </div>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Carte TR" 
              value={payments.tr} 
              onChange={(v) => handleInputChange('tr', v)} 
              onFocus={() => setActivePaymentField('tr')}
              icon={<Receipt size={20} />} 
              isActive={activeMethods.tr}
              onToggle={() => onToggleMethod('tr')}
              tooltipText="Titres-restaurant sous forme de carte d'entreprise. Calcul de TVA collectée sur le montant brut de l'addition. Soumis à une commission d'émetteur de 1% à 5%."
            />
            <PaymentInput 
              label="TR Sans Contact" 
              value={payments.trContactless} 
              onChange={(v) => handleInputChange('trContactless', v)} 
              onFocus={() => setActivePaymentField('trContactless')}
              icon={<Nfc size={20} />} 
              isActive={activeMethods.trContactless}
              onToggle={() => onToggleMethod('trContactless')}
              tooltipText="Paiement TR mobile ou sans contact. Part employeur exonérée d'impôts et charges dans la limite journalière autorisée. Soumis aux commissions des émetteurs Swile/Edenred."
            />
          </div>
        </div>

        {/* Cash & Transfer */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 uppercase tracking-wider">
            <Banknote className="text-purple-600" size={16} /> Espèces & Virements
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Espèces" 
              value={payments.cash} 
              onChange={(v) => handleInputChange('cash', v)} 
              onFocus={() => setActivePaymentField('cash')}
              icon={<Banknote size={20} />} 
              isActive={activeMethods.cash}
              onToggle={() => onToggleMethod('cash')}
              tooltipText="Règlement en espèces physiques. Zéro commission financière. Obligation de consigner et déclarer la TVA correspondante conformément à la norme NF525."
            />
            <PaymentInput 
              label="Virement Bancaire" 
              value={payments.transfer} 
              onChange={(v) => handleInputChange('transfer', v)} 
              onFocus={() => setActivePaymentField('transfer')}
              icon={<Landmark size={20} />} 
              isActive={activeMethods.transfer}
              onToggle={() => onToggleMethod('transfer')}
              tooltipText="Virement bancaire classique (BtoB, événements, groupes). TVA collectée classique selon facture. Sans commission d'acquisition réseau."
            />
          </div>
        </div>

        {/* Notes */}
        <div className="pt-4 border-t border-slate-100">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wider">
              <MessageSquare className="text-slate-500" size={16} /> Notes (Optionnel)
            </h3>
            <button
              type="button"
              onClick={toggleListeningNotes}
              disabled={!isActive}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                isListeningNotes 
                  ? 'bg-red-500 text-white shadow-lg shadow-red-500/40 ring-2 ring-red-500/20' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-50'
              }`}
              title="Dicter une note"
            >
              {isListeningNotes ? (
                <div className="flex items-center gap-1">
                  <span className="flex gap-0.5 items-center h-3">
                    <span className="w-0.5 h-2 bg-white animate-[bounce_1s_infinite_0ms]" />
                    <span className="w-0.5 h-3 bg-white animate-[bounce_1s_infinite_200ms]" />
                    <span className="w-0.5 h-2 bg-white animate-[bounce_1s_infinite_400ms]" />
                  </span>
                  <span>Arrêter</span>
                </div>
              ) : (
                <>
                  <Mic size={14} />
                  <span>Dicter</span>
                </>
              )}
            </button>
          </div>
          <div className="relative">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              disabled={!isActive}
              placeholder={isListeningNotes ? "Écoute en cours..." : "Ajoutez un commentaire sur ce service..."}
              className={`w-full bg-slate-50 border ${isListeningNotes ? 'border-blue-400 ring-2 ring-blue-500/20' : 'border-slate-200'} text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none h-24 disabled:opacity-50 disabled:cursor-not-allowed`}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="pt-4 border-t border-slate-100">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 uppercase tracking-wider">
            <Paperclip className="text-slate-500" size={16} /> Pièces jointes (Photos reçus)
          </h3>
          <div className="flex flex-col gap-3">
            {isExtracting && (
              <div className="flex items-center gap-3 bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 animate-pulse">
                <Loader2 className="animate-spin" size={18} />
                <Sparkles size={18} className="text-blue-500" />
                <span className="text-sm font-semibold">L'IA Gemini analyse votre reçu...</span>
              </div>
            )}
            
            {attachments.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-2">
                {attachments.map((file, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    {file.type.startsWith('image/') && previews[idx] ? (
                      <img 
                        src={previews[idx]} 
                        alt={file.name} 
                        className="w-full h-full object-cover transition-transform group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                        <FileText size={24} className="text-slate-400 mb-1" />
                        <span className="text-[10px] text-slate-500 font-medium truncate w-full">{file.name}</span>
                      </div>
                    )}
                    <button 
                      type="button" 
                      onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))} 
                      className="absolute top-1 right-1 p-1 bg-white/90 text-red-500 rounded-full shadow-sm hover:bg-red-50 transition-colors"
                    >
                      <X size={14} />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-black/50 p-1 text-center translate-y-full group-hover:translate-y-0 transition-transform">
                      <span className="text-[10px] text-white font-medium truncate">
                        {(file.size / 1024).toFixed(0)} KB
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98]">
                <Camera size={18} className="text-blue-600" /> Prendre une photo
                <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
              </label>
              <label className="cursor-pointer flex-1 flex items-center justify-center gap-2 bg-slate-50 border border-slate-200 text-slate-700 px-4 py-3 rounded-xl text-sm font-semibold hover:bg-slate-100 transition-colors shadow-sm active:scale-[0.98]">
                <FileText size={18} className="text-blue-600" /> Ajouter un document
                <input type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => handleFileUpload(e.target.files)} />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PaymentInput({ 
  label, 
  value, 
  onChange, 
  onFocus,
  icon, 
  isActive, 
  onToggle,
  tooltipText
}: { 
  label: string, 
  value: number, 
  onChange: (v: string) => void, 
  onFocus?: () => void,
  icon: React.ReactNode,
  isActive: boolean,
  onToggle: () => void,
  tooltipText?: string
}) {
  const [isListening, setIsListening] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [localValue, setLocalValue] = useState<string>(value === 0 ? '' : value.toString());

  useEffect(() => {
    if (value === 0 && localValue !== '') {
      setLocalValue('');
      setError(null);
    } else if (value !== 0 && parseFloat(localValue) !== value) {
      setLocalValue(value.toString());
      setError(null);
    }
  }, [value]);

  const startListening = () => {
    if (!isActive) return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setDetectedAmount(null);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const cleaned = transcript.replace(/\s/g, '').replace(',', '.');
      const match = cleaned.match(/\d+(\.\d+)?/);
      if (match) {
        setDetectedAmount(match[0]);
      } else {
        setError("Montant non reconnu.");
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error", event.error);
      if (event.error === 'not-allowed') {
        alert("L'accès au microphone a été refusé. Veuillez autoriser l'accès au microphone dans les paramètres de votre navigateur pour utiliser cette fonctionnalité.");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleChange = (val: string) => {
    setLocalValue(val);
    if (val === '') {
      setError(null);
      onChange(val);
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      setError("Montant invalide (doit être positif).");
    } else {
      setError(null);
      onChange(val);
    }
  };

  return (
    <div className={`flex flex-col group ${!isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-1.5 ml-1">
        <span className="text-slate-700 text-sm font-semibold flex items-center gap-1.5">
          {label}
          {tooltipText && (
            <span className="group/tooltip relative inline-block text-slate-400 hover:text-slate-600 transition-colors cursor-help select-none">
              <HelpCircle size={13} className="shrink-0" />
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 bg-slate-900 border border-slate-950 text-[11px] leading-relaxed text-slate-100 font-medium rounded-2xl shadow-2xl opacity-0 scale-95 origin-bottom group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 transition-all duration-150 z-[110] select-text">
                <span className="block text-[11px] font-bold text-blue-400 mb-1 font-sans">ℹ️ Taxe & Calcul :</span>
                <span className="font-sans block text-slate-300 font-medium">{tooltipText}</span>
                <span className="absolute top-full left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-slate-950" />
              </span>
            </span>
          )}
        </span>
        <button 
          type="button" 
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>
      <div className={`flex w-full items-stretch rounded-xl border-2 ${isActive ? (isListening ? 'border-blue-500 bg-white ring-2 ring-blue-500/20' : error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white') : 'border-slate-200 bg-slate-100'} transition-all shadow-sm overflow-hidden relative`}>
        {detectedAmount !== null && (
          <div className="absolute inset-0 bg-blue-50 flex items-center justify-between px-4 z-10 animate-in fade-in zoom-in duration-200">
            <span className="text-blue-700 font-bold flex items-center gap-2">
              <Mic size={16} className="text-blue-500" />
              {detectedAmount} € ?
            </span>
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setDetectedAmount(null)}
                className="p-1.5 rounded-full bg-white text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors shadow-sm"
                title="Annuler"
              >
                <X size={16} />
              </button>
              <button 
                type="button"
                onClick={() => {
                  handleChange(detectedAmount);
                  setDetectedAmount(null);
                }}
                className="p-1.5 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
                title="Valider"
              >
                <Check size={16} />
              </button>
            </div>
          </div>
        )}
        <span className={`flex items-center pl-4 font-bold ${error ? 'text-red-400' : 'text-slate-400'}`}>€</span>
        <input 
          type="number" 
          step="0.01"
          min="0"
          disabled={!isActive}
          value={localValue}
          onFocus={onFocus}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={isListening ? "Écoute..." : "0.00"}
          className={`w-full border-none bg-transparent h-12 text-lg font-bold focus:ring-0 px-2 disabled:text-slate-400 ${error ? 'text-red-700 placeholder:text-red-300' : 'text-slate-900 placeholder:text-slate-300'}`}
        />
        <button
          type="button"
          onClick={startListening}
          disabled={!isActive}
          className={`flex items-center px-3 transition-colors border-l ${error ? 'border-red-200' : 'border-slate-200'} ${isListening ? 'bg-blue-50 text-blue-600' : error ? 'bg-red-100/50 text-red-400 hover:text-red-600' : 'bg-slate-100/50 text-slate-400 hover:text-blue-600 hover:bg-slate-100'}`}
          title="Saisie vocale"
        >
          <Mic className={isListening ? 'animate-pulse' : ''} size={18} />
        </button>
        <div className={`flex items-center px-3 bg-slate-100/50 border-l ${error ? 'border-red-200 text-red-400 bg-red-50' : 'border-slate-200 text-slate-400'}`}>
          {icon}
        </div>
      </div>
      {error && <p className="text-xs text-red-500 mt-1.5 ml-1 font-medium">{error}</p>}
    </div>
  );
}

function GroupTotalInput({ 
  label, 
  value, 
  onChange, 
  colorClass = 'blue' 
}: { 
  label: string, 
  value: number, 
  onChange: (val: string) => void,
  colorClass?: 'blue' | 'amber' | 'emerald'
}) {
  const [isListening, setIsListening] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState<string | null>(null);

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'fr-FR';
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
      setDetectedAmount(null);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      const cleaned = transcript.replace(/\s/g, '').replace(',', '.');
      const match = cleaned.match(/\d+(\.\d+)?/);
      if (match) {
        setDetectedAmount(match[0]);
      }
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const colors = {
    blue: { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', label: 'text-blue-400', input: 'text-blue-700', placeholder: 'text-blue-200' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-100', text: 'text-amber-600', label: 'text-amber-400', input: 'text-amber-700', placeholder: 'text-amber-200' },
    emerald: { bg: 'bg-emerald-50', border: 'border-emerald-100', text: 'text-emerald-600', label: 'text-emerald-400', input: 'text-emerald-700', placeholder: 'text-emerald-200' }
  };

  const c = colors[colorClass];

  return (
    <div className={`flex items-center gap-2 ${c.bg} px-3 py-1.5 rounded-lg border ${c.border} relative overflow-hidden transition-all`}>
      {detectedAmount !== null && (
        <div className={`absolute inset-0 ${c.bg} flex items-center justify-between px-2 z-10 animate-in fade-in zoom-in duration-200`}>
          <span className={`${c.text} font-bold text-[10px] flex items-center gap-1`}>
            <Mic size={10} /> {detectedAmount} ?
          </span>
          <div className="flex items-center gap-1">
            <button 
              type="button"
              onClick={() => setDetectedAmount(null)} 
              className="p-1 rounded-full hover:bg-white/50 text-slate-400 hover:text-red-500 transition-colors"
            >
              <X size={10} />
            </button>
            <button 
              type="button"
              onClick={() => { onChange(detectedAmount); setDetectedAmount(null); }} 
              className={`p-1 rounded-full ${c.text} hover:bg-white/50 transition-colors`}
            >
              <Check size={10} />
            </button>
          </div>
        </div>
      )}
      <span className={`text-[10px] font-black ${c.label} uppercase tracking-tighter`}>{label}</span>
      <div className="flex items-center">
        <span className={`${c.text} font-bold text-sm mr-1`}>€</span>
        <input 
          type="number"
          step="0.01"
          placeholder="0.00"
          className={`w-16 bg-transparent border-none p-0 text-sm font-black ${c.input} focus:ring-0 placeholder:${c.placeholder}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={startListening}
          className={`ml-1 p-1 rounded-md transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : `${c.text} hover:bg-white/50`}`}
          title="Dicter le total"
        >
          <Mic size={12} />
        </button>
      </div>
    </div>
  );
}
