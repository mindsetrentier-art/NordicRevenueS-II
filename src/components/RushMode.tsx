import React, { useState, useEffect } from 'react';
import { 
  X, 
  Check, 
  Delete, 
  Sun, 
  Moon, 
  CreditCard, 
  Nfc, 
  Banknote, 
  Receipt, 
  Landmark,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Payments } from '../types';
import clsx from 'clsx';

interface RushModeProps {
  paymentsMidi: Payments;
  paymentsSoir: Payments;
  setPaymentsMidi: React.Dispatch<React.SetStateAction<Payments>>;
  setPaymentsSoir: React.Dispatch<React.SetStateAction<Payments>>;
  onClose: () => void;
}

const PAYMENT_METHODS = [
  { id: 'cb', label: 'Carte', icon: <CreditCard size={24} />, color: 'text-blue-600', bg: 'bg-blue-50' },
  { id: 'cbContactless', label: 'Sans Contact', icon: <Nfc size={24} />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { id: 'cash', label: 'Espèces', icon: <Banknote size={24} />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { id: 'tr', label: 'Titres Resto', icon: <Receipt size={24} />, color: 'text-amber-600', bg: 'bg-amber-50' },
  { id: 'trContactless', label: 'TR Démat', icon: <Nfc size={24} />, color: 'text-orange-600', bg: 'bg-orange-50' },
  { id: 'amex', label: 'AMEX', icon: <Landmark size={24} />, color: 'text-purple-600', bg: 'bg-purple-50' },
  { id: 'amexContactless', label: 'AMEX Sans C.', icon: <Nfc size={24} />, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
  { id: 'transfer', label: 'Virement', icon: <Landmark size={24} />, color: 'text-slate-600', bg: 'bg-slate-50' },
];

export function RushMode({ 
  paymentsMidi, 
  paymentsSoir, 
  setPaymentsMidi, 
  setPaymentsSoir, 
  onClose 
}: RushModeProps) {
  const [service, setService] = useState<'midi' | 'soir'>('midi');
  const [activeField, setActiveField] = useState<keyof Payments>('cb');
  const [inputValue, setInputValue] = useState('');

  const currentPayments = service === 'midi' ? paymentsMidi : paymentsSoir;
  const setPayments = service === 'midi' ? setPaymentsMidi : setPaymentsSoir;

  useEffect(() => {
    setInputValue(currentPayments[activeField].toString());
  }, [activeField, service]);

  const handleNumber = (num: string) => {
    if (inputValue === '0') {
      setInputValue(num);
    } else {
      setInputValue(inputValue + num);
    }
  };

  const handleDecimal = () => {
    if (!inputValue.includes('.')) {
      setInputValue(inputValue + '.');
    }
  };

  const handleBackspace = () => {
    if (inputValue.length > 1) {
      setInputValue(inputValue.slice(0, -1));
    } else {
      setInputValue('0');
    }
  };

  const handleClear = () => {
    setInputValue('0');
  };

  const handleApply = () => {
    const val = parseFloat(inputValue) || 0;
    setPayments(prev => ({ ...prev, [activeField]: val }));
    
    // Auto-advance to next field if possible
    const currentIndex = PAYMENT_METHODS.findIndex(m => m.id === activeField);
    if (currentIndex < PAYMENT_METHODS.length - 1) {
      setActiveField(PAYMENT_METHODS[currentIndex + 1].id as keyof Payments);
    }
  };

  const activeMethod = PAYMENT_METHODS.find(m => m.id === activeField)!;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[60] flex flex-col text-white font-sans overflow-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between border-b border-white/10 bg-slate-800/50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={28} />
          </button>
          <h2 className="text-xl font-black uppercase tracking-tighter">Mode Service Intense</h2>
        </div>
        
        <div className="flex bg-slate-900 p-1 rounded-2xl border border-white/10">
          <button
            onClick={() => setService('midi')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all",
              service === 'midi' ? "bg-amber-500 text-white shadow-lg" : "text-slate-400"
            )}
          >
            <Sun size={20} /> Midi
          </button>
          <button
            onClick={() => setService('soir')}
            className={clsx(
              "flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all",
              service === 'soir' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400"
            )}
          >
            <Moon size={20} /> Soir
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left: Payment Methods Selection */}
        <div className="w-full lg:w-1/3 p-4 overflow-y-auto bg-slate-900/50 border-r border-white/10">
          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-2">Sélectionnez le type</p>
          <div className="grid grid-cols-2 gap-3">
            {PAYMENT_METHODS.map((method) => (
              <button
                key={method.id}
                onClick={() => setActiveField(method.id as keyof Payments)}
                className={clsx(
                  "flex flex-col items-center justify-center p-4 rounded-3xl transition-all border-2",
                  activeField === method.id 
                    ? "bg-white text-slate-900 border-white scale-105 shadow-2xl" 
                    : "bg-slate-800/50 text-slate-400 border-transparent hover:border-white/20"
                )}
              >
                <div className={clsx("mb-2", activeField === method.id ? "text-slate-900" : method.color)}>
                  {method.icon}
                </div>
                <span className="text-xs font-black uppercase tracking-tight text-center">{method.label}</span>
                <span className="text-sm font-bold mt-1 opacity-60">
                  {currentPayments[method.id as keyof Payments].toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Large Keypad */}
        <div className="flex-1 flex flex-col p-4 lg:p-8 bg-slate-900">
          {/* Active Field Display */}
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-2 bg-white/5 rounded-full border border-white/10 mb-4">
              <span className={activeMethod.color}>{activeMethod.icon}</span>
              <span className="text-sm font-black uppercase tracking-widest">{activeMethod.label}</span>
            </div>
            <div className="text-7xl lg:text-9xl font-black tracking-tighter text-white tabular-nums flex items-center justify-center gap-2">
              {inputValue}
              <span className="text-4xl lg:text-6xl text-slate-500">€</span>
            </div>
          </div>

          {/* Keypad Grid */}
          <div className="flex-1 grid grid-cols-3 gap-4 max-w-2xl mx-auto w-full">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => handleNumber(num.toString())}
                className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-4xl font-black rounded-3xl transition-all border border-white/5 shadow-xl"
              >
                {num}
              </button>
            ))}
            <button
              onClick={handleClear}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 active:scale-95 text-2xl font-black rounded-3xl transition-all border border-red-500/20"
            >
              C
            </button>
            <button
              onClick={() => handleNumber('0')}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-4xl font-black rounded-3xl transition-all border border-white/5 shadow-xl"
            >
              0
            </button>
            <button
              onClick={handleDecimal}
              className="bg-slate-800 hover:bg-slate-700 active:scale-95 text-4xl font-black rounded-3xl transition-all border border-white/5 shadow-xl"
            >
              .
            </button>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-4 mt-8 max-w-2xl mx-auto w-full">
            <button
              onClick={handleBackspace}
              className="bg-slate-700 hover:bg-slate-600 active:scale-95 py-6 rounded-3xl flex items-center justify-center transition-all border border-white/10"
            >
              <Delete size={32} />
            </button>
            <button
              onClick={handleApply}
              className="bg-blue-600 hover:bg-blue-500 active:scale-95 py-6 rounded-3xl flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-600/40"
            >
              <Check size={32} />
              <span className="text-2xl font-black uppercase tracking-tighter">Valider</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Footer */}
      <div className="p-4 bg-slate-800/50 border-t border-white/10 flex items-center justify-between">
        <button 
          onClick={() => {
            const currentIndex = PAYMENT_METHODS.findIndex(m => m.id === activeField);
            if (currentIndex > 0) {
              setActiveField(PAYMENT_METHODS[currentIndex - 1].id as keyof Payments);
            }
          }}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400"
        >
          <ChevronLeft size={24} /> Précédent
        </button>
        
        <div className="flex gap-2">
          {PAYMENT_METHODS.map((m) => (
            <div 
              key={m.id}
              className={clsx(
                "w-2 h-2 rounded-full transition-all",
                activeField === m.id ? "bg-blue-500 w-6" : "bg-slate-700"
              )}
            />
          ))}
        </div>

        <button 
          onClick={() => {
            const currentIndex = PAYMENT_METHODS.findIndex(m => m.id === activeField);
            if (currentIndex < PAYMENT_METHODS.length - 1) {
              setActiveField(PAYMENT_METHODS[currentIndex + 1].id as keyof Payments);
            }
          }}
          className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all text-slate-400"
        >
          Suivant <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
