import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Establishment, Payments } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { 
  CreditCard, 
  Nfc, 
  Banknote, 
  Receipt, 
  Landmark,
  Save,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { format } from 'date-fns';

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
  const { userProfile } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEst, setSelectedEst] = useState<string>('');
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  
  const [paymentsMidi, setPaymentsMidi] = useState<Payments>(INITIAL_PAYMENTS);
  const [paymentsSoir, setPaymentsSoir] = useState<Payments>(INITIAL_PAYMENTS);

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
        if (estData.length > 0) {
          setSelectedEst(estData[0].id);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'establishments');
      }
    };

    fetchEstablishments();
  }, [userProfile]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEst || !userProfile || totalJournee === 0) return;
    
    setLoading(true);
    setSuccess(false);
    
    try {
      const promises = [];
      
      if (isMidiActive && totalMidi > 0) {
        promises.push(addDoc(collection(db, 'revenues'), {
          establishmentId: selectedEst,
          date,
          service: 'midi',
          payments: paymentsMidi,
          total: totalMidi,
          createdBy: userProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }

      if (isSoirActive && totalSoir > 0) {
        promises.push(addDoc(collection(db, 'revenues'), {
          establishmentId: selectedEst,
          date,
          service: 'soir',
          payments: paymentsSoir,
          total: totalSoir,
          createdBy: userProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }));
      }

      await Promise.all(promises);
      
      setSuccess(true);
      setPaymentsMidi(INITIAL_PAYMENTS);
      setPaymentsSoir(INITIAL_PAYMENTS);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'revenues');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Saisie des Recettes</h1>
        <p className="text-slate-500 text-sm mt-1">Enregistrez les encaissements pour les services du midi et du soir.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Header Config */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Établissement</label>
            <select
              value={selectedEst}
              onChange={(e) => setSelectedEst(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            >
              <option value="" disabled>Sélectionnez un établissement</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Date d'exploitation</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section Midi */}
          <ServiceSection 
            title="Service du Midi" 
            icon={<Sun className="text-amber-500" size={24} />}
            payments={paymentsMidi}
            setPayments={setPaymentsMidi}
            activeMethods={activeMethods}
            onToggleMethod={handleToggleMethod}
            total={totalMidi}
            isActive={isMidiActive}
            onToggleActive={() => {
              setIsMidiActive(!isMidiActive);
              if (isMidiActive) setPaymentsMidi(INITIAL_PAYMENTS);
            }}
          />

          {/* Section Soir */}
          <ServiceSection 
            title="Service du Soir" 
            icon={<Moon className="text-indigo-500" size={24} />}
            payments={paymentsSoir}
            setPayments={setPaymentsSoir}
            activeMethods={activeMethods}
            onToggleMethod={handleToggleMethod}
            total={totalSoir}
            isActive={isSoirActive}
            onToggleActive={() => {
              setIsSoirActive(!isSoirActive);
              if (isSoirActive) setPaymentsSoir(INITIAL_PAYMENTS);
            }}
          />
        </div>

        {/* Footer / Submit */}
        <div className="sticky bottom-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-lg shadow-slate-200/50 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
          <div>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-wider">Total Journalier</p>
            <p className="text-3xl font-black text-slate-900">
              {totalJournee.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
            </p>
          </div>
          <div className="flex items-center gap-4 w-full sm:w-auto">
            {success && (
              <span className="flex items-center text-emerald-600 font-semibold text-sm">
                <CheckCircle2 className="mr-1" size={18} /> Enregistré
              </span>
            )}
            <button
              type="submit"
              disabled={loading || totalJournee === 0 || !selectedEst}
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
    </div>
  );
}

function ServiceSection({
  title,
  icon,
  payments,
  setPayments,
  activeMethods,
  onToggleMethod,
  total,
  isActive,
  onToggleActive
}: {
  title: string;
  icon: React.ReactNode;
  payments: Payments;
  setPayments: React.Dispatch<React.SetStateAction<Payments>>;
  activeMethods: Record<keyof Payments, boolean>;
  onToggleMethod: (field: keyof Payments) => void;
  total: number;
  isActive: boolean;
  onToggleActive: () => void;
}) {
  const handleInputChange = (field: keyof Payments, value: string) => {
    if (!activeMethods[field] || !isActive) return;
    const numValue = value === '' ? 0 : parseFloat(value);
    setPayments(prev => ({ ...prev, [field]: isNaN(numValue) ? 0 : numValue }));
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
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 uppercase tracking-wider">
            <CreditCard className="text-blue-600" size={16} /> Cartes Bancaires
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Paiement Carte" 
              value={payments.cb} 
              onChange={(v) => handleInputChange('cb', v)} 
              icon={<CreditCard size={20} />} 
              isActive={activeMethods.cb}
              onToggle={() => onToggleMethod('cb')}
            />
            <PaymentInput 
              label="Carte Sans Contact" 
              value={payments.cbContactless} 
              onChange={(v) => handleInputChange('cbContactless', v)} 
              icon={<Nfc size={20} />} 
              isActive={activeMethods.cbContactless}
              onToggle={() => onToggleMethod('cbContactless')}
            />
          </div>
        </div>

        {/* AMEX */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 uppercase tracking-wider">
            <CreditCard className="text-amber-600" size={16} /> American Express
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Carte AMEX" 
              value={payments.amex} 
              onChange={(v) => handleInputChange('amex', v)} 
              icon={<CreditCard size={20} />} 
              isActive={activeMethods.amex}
              onToggle={() => onToggleMethod('amex')}
            />
            <PaymentInput 
              label="AMEX Sans Contact" 
              value={payments.amexContactless} 
              onChange={(v) => handleInputChange('amexContactless', v)} 
              icon={<Nfc size={20} />} 
              isActive={activeMethods.amexContactless}
              onToggle={() => onToggleMethod('amexContactless')}
            />
          </div>
        </div>

        {/* TR */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2 mb-3 uppercase tracking-wider">
            <Receipt className="text-emerald-600" size={16} /> Titres-Restaurant
          </h3>
          <div className="grid grid-cols-1 gap-4">
            <PaymentInput 
              label="Carte TR" 
              value={payments.tr} 
              onChange={(v) => handleInputChange('tr', v)} 
              icon={<Receipt size={20} />} 
              isActive={activeMethods.tr}
              onToggle={() => onToggleMethod('tr')}
            />
            <PaymentInput 
              label="TR Sans Contact" 
              value={payments.trContactless} 
              onChange={(v) => handleInputChange('trContactless', v)} 
              icon={<Nfc size={20} />} 
              isActive={activeMethods.trContactless}
              onToggle={() => onToggleMethod('trContactless')}
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
              icon={<Banknote size={20} />} 
              isActive={activeMethods.cash}
              onToggle={() => onToggleMethod('cash')}
            />
            <PaymentInput 
              label="Virement Bancaire" 
              value={payments.transfer} 
              onChange={(v) => handleInputChange('transfer', v)} 
              icon={<Landmark size={20} />} 
              isActive={activeMethods.transfer}
              onToggle={() => onToggleMethod('transfer')}
            />
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
  icon, 
  isActive, 
  onToggle 
}: { 
  label: string, 
  value: number, 
  onChange: (v: string) => void, 
  icon: React.ReactNode,
  isActive: boolean,
  onToggle: () => void
}) {
  return (
    <div className={`flex flex-col group ${!isActive ? 'opacity-50' : ''}`}>
      <div className="flex items-center justify-between mb-1.5 ml-1">
        <span className="text-slate-700 text-sm font-semibold">{label}</span>
        <button 
          type="button" 
          onClick={onToggle}
          className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isActive ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
          <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isActive ? 'translate-x-4' : 'translate-x-1'}`} />
        </button>
      </div>
      <div className={`flex w-full items-stretch rounded-xl border-2 ${isActive ? 'border-slate-200 bg-slate-50 focus-within:border-blue-500 focus-within:bg-white' : 'border-slate-200 bg-slate-100'} transition-all shadow-sm overflow-hidden`}>
        <span className="flex items-center pl-4 text-slate-400 font-bold">€</span>
        <input 
          type="number" 
          step="0.01"
          min="0"
          disabled={!isActive}
          value={value === 0 ? '' : value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0.00"
          className="w-full border-none bg-transparent h-12 text-lg font-bold text-slate-900 focus:ring-0 placeholder:text-slate-300 px-2 disabled:text-slate-400"
        />
        <div className="flex items-center px-4 text-slate-400 bg-slate-100/50 border-l border-slate-200">
          {icon}
        </div>
      </div>
    </div>
  );
}
