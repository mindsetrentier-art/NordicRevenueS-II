import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calculator, 
  X, 
  Plus, 
  Minus, 
  Divide, 
  X as Multiply, 
  Equal,
  Delete,
  CornerDownLeft
} from 'lucide-react';
import clsx from 'clsx';

interface QuickCalculatorProps {
  onClose: () => void;
  onApply: (value: number) => void;
  initialValue?: string;
}

export function QuickCalculator({ onClose, onApply, initialValue = '' }: QuickCalculatorProps) {
  const [display, setDisplay] = useState(initialValue || '0');
  const [equation, setEquation] = useState('');
  const [isNewNumber, setIsNewNumber] = useState(true);

  const handleDigit = (digit: string) => {
    if (isNewNumber) {
      setDisplay(digit);
      setIsNewNumber(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const handleOperator = (op: string) => {
    setEquation(display + ' ' + op + ' ');
    setIsNewNumber(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setEquation('');
    setIsNewNumber(true);
  };

  const calculate = () => {
    try {
      const result = eval((equation + display).replace('×', '*').replace('÷', '/'));
      setDisplay(String(Number(result.toFixed(2))));
      setEquation('');
      setIsNewNumber(true);
    } catch (e) {
      setDisplay('Error');
    }
  };

  const handleApply = () => {
    const val = parseFloat(display);
    if (!isNaN(val)) {
      onApply(val);
      onClose();
    }
  };

  const buttons = [
    { label: 'C', action: handleClear, color: 'text-rose-500 bg-rose-50' },
    { label: '÷', action: () => handleOperator('/'), color: 'text-blue-500 bg-blue-50' },
    { label: '×', action: () => handleOperator('*'), color: 'text-blue-500 bg-blue-50' },
    { label: 'DEL', action: () => setDisplay(display.length > 1 ? display.slice(0, -1) : '0'), color: 'text-slate-500 bg-slate-50' },
    
    { label: '7', action: () => handleDigit('7') },
    { label: '8', action: () => handleDigit('8') },
    { label: '9', action: () => handleDigit('9') },
    { label: '-', action: () => handleOperator('-'), color: 'text-blue-500 bg-blue-50' },
    
    { label: '4', action: () => handleDigit('4') },
    { label: '5', action: () => handleDigit('5') },
    { label: '6', action: () => handleDigit('6') },
    { label: '+', action: () => handleOperator('+'), color: 'text-blue-500 bg-blue-50' },
    
    { label: '1', action: () => handleDigit('1') },
    { label: '2', action: () => handleDigit('2') },
    { label: '3', action: () => handleDigit('3') },
    { label: '=', action: calculate, color: 'bg-indigo-600 text-white row-span-2' },
    
    { label: '0', action: () => handleDigit('0'), className: 'col-span-2' },
    { label: '.', action: () => !display.includes('.') && handleDigit('.') },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      className="bg-white rounded-3xl shadow-2xl border border-slate-200 p-4 w-72 pointer-events-auto"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calculator size={14} className="text-indigo-600" />
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Calculatrice Rapide</span>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg text-slate-400">
          <X size={16} />
        </button>
      </div>

      <div className="bg-slate-50 rounded-2xl p-4 mb-4 text-right overflow-hidden">
        <div className="text-[10px] font-bold text-slate-400 h-4 mb-1">
          {equation}
        </div>
        <div className="text-2xl font-black text-slate-900 truncate">
          {display}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {buttons.map((btn, idx) => (
          <button
            key={idx}
            onClick={btn.action}
            className={clsx(
              "h-12 flex items-center justify-center rounded-xl font-black text-sm transition-all active:scale-95",
              btn.color || "bg-slate-100 text-slate-700 hover:bg-slate-200",
              btn.className,
              btn.label === '=' && "h-26"
            )}
          >
            {btn.label === 'DEL' ? <Delete size={16} /> : btn.label}
          </button>
        ))}
      </div>

      <button
        onClick={handleApply}
        className="w-full mt-4 py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-slate-800 transition-all"
      >
        <CornerDownLeft size={14} />
        Appliquer le montant
      </button>
    </motion.div>
  );
}
