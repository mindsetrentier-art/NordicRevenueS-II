import React, { useState, useEffect, useRef } from 'react';
import { X, Delete, Palette, Check, Mic, Undo2, Redo2 } from 'lucide-react';

interface CalculatorProps {
  onClose: () => void;
  activePaymentType?: string | null;
  onPaymentTypeSelect?: (type: string) => void;
  onApply?: (value: number) => void;
  initialValue?: string;
}

interface CalcState {
  display: string;
  previousValue: number | null;
  operator: string | null;
  waitingForNewValue: boolean;
  history: {equation: string, result: string}[];
  isDirty: boolean;
}

type Theme = 'light' | 'dark' | 'glass' | 'white' | 'black' | 'neonPink' | 'neonGreen' | 'neonBlue' | 'neonYellow' | 'neonOrange' | 'neonCyan' | 'neonPurple';

const themes: Record<Theme, any> = {
  light: {
    container: 'bg-slate-50 border-slate-200 shadow-2xl text-slate-800',
    header: 'bg-slate-100 border-slate-200 text-slate-600',
    display: 'bg-white text-slate-900 border-b border-slate-200',
    keypad: 'bg-slate-50',
    btnNum: 'bg-white text-slate-800 hover:bg-slate-100 shadow-sm border border-slate-200',
    btnOp: 'bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-100',
    btnOpActive: 'bg-blue-600 text-white shadow-inner border-blue-600',
    btnAction: 'bg-slate-200 text-slate-700 hover:bg-slate-300 border border-slate-300',
    btnDanger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100',
    btnEquals: 'bg-blue-600 text-white hover:bg-blue-700 shadow-md border-blue-600',
  },
  dark: {
    container: 'bg-slate-900 border-slate-700 shadow-2xl text-white',
    header: 'bg-slate-800 border-slate-700 text-slate-300',
    display: 'bg-slate-950 text-white border-b border-slate-800',
    keypad: 'bg-slate-900',
    btnNum: 'bg-slate-800 text-white hover:bg-slate-700 border border-slate-700',
    btnOp: 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20',
    btnOpActive: 'bg-amber-500 text-slate-900 shadow-inner border-amber-500',
    btnAction: 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600',
    btnDanger: 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20',
    btnEquals: 'bg-amber-500 text-slate-900 hover:bg-amber-400 shadow-md border-amber-500',
  },
  glass: {
    container: 'bg-slate-900/60 backdrop-blur-2xl border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] text-white',
    header: 'bg-white/5 border-white/10 text-white/80',
    display: 'bg-black/20 text-white border-b border-white/10',
    keypad: 'bg-transparent',
    btnNum: 'bg-white/10 text-white hover:bg-white/20 border border-white/10',
    btnOp: 'bg-fuchsia-500/20 text-fuchsia-300 hover:bg-fuchsia-500/30 border border-fuchsia-500/30',
    btnOpActive: 'bg-fuchsia-500 text-white shadow-inner border-fuchsia-500',
    btnAction: 'bg-white/20 text-white hover:bg-white/30 border border-white/20',
    btnDanger: 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30',
    btnEquals: 'bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white hover:from-fuchsia-400 hover:to-purple-500 shadow-[0_0_15px_rgba(217,70,239,0.4)] border border-fuchsia-400/50',
  },
  white: {
    container: 'bg-white border-slate-200 shadow-2xl text-slate-900',
    header: 'bg-white border-slate-200 text-slate-900',
    display: 'bg-white text-slate-900 border-b border-slate-200',
    keypad: 'bg-white',
    btnNum: 'bg-white text-slate-900 hover:bg-slate-100 border border-slate-200',
    btnOp: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200',
    btnOpActive: 'bg-slate-300 text-slate-900 shadow-inner border-slate-400',
    btnAction: 'bg-slate-100 text-slate-900 hover:bg-slate-200 border border-slate-200',
    btnDanger: 'bg-red-100 text-red-600 hover:bg-red-200 border border-red-200',
    btnEquals: 'bg-slate-900 text-white hover:bg-slate-800 shadow-md border-slate-900',
  },
  black: {
    container: 'bg-black border-slate-800 shadow-2xl text-white',
    header: 'bg-black border-slate-800 text-white',
    display: 'bg-black text-white border-b border-slate-800',
    keypad: 'bg-black',
    btnNum: 'bg-black text-white hover:bg-slate-900 border border-slate-800',
    btnOp: 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-800',
    btnOpActive: 'bg-slate-700 text-white shadow-inner border-slate-600',
    btnAction: 'bg-slate-900 text-white hover:bg-slate-800 border border-slate-800',
    btnDanger: 'bg-red-900/50 text-red-500 hover:bg-red-900/80 border border-red-900/50',
    btnEquals: 'bg-white text-black hover:bg-slate-200 shadow-md border-white',
  },
  neonPink: {
    container: 'bg-slate-950 border-pink-500/50 shadow-[0_0_30px_rgba(236,72,153,0.3)] text-pink-100',
    header: 'bg-slate-950 border-pink-500/30 text-pink-400',
    display: 'bg-slate-950 text-pink-400 border-b border-pink-500/30 shadow-[inset_0_0_20px_rgba(236,72,153,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-pink-100 hover:bg-pink-950 border border-pink-500/30 hover:border-pink-500 hover:shadow-[0_0_15px_rgba(236,72,153,0.5)]',
    btnOp: 'bg-pink-950 text-pink-400 hover:bg-pink-900 border border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.6)]',
    btnOpActive: 'bg-pink-600 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(236,72,153,0.8)] border-pink-400',
    btnAction: 'bg-slate-900 text-pink-300 hover:bg-pink-950 border border-pink-500/30 hover:border-pink-500 hover:shadow-[0_0_15px_rgba(236,72,153,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-pink-600 text-white hover:bg-pink-500 shadow-[0_0_20px_rgba(236,72,153,0.8)] border-pink-400',
  },
  neonGreen: {
    container: 'bg-slate-950 border-green-500/50 shadow-[0_0_30px_rgba(34,197,94,0.3)] text-green-100',
    header: 'bg-slate-950 border-green-500/30 text-green-400',
    display: 'bg-slate-950 text-green-400 border-b border-green-500/30 shadow-[inset_0_0_20px_rgba(34,197,94,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-green-100 hover:bg-green-950 border border-green-500/30 hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]',
    btnOp: 'bg-green-950 text-green-400 hover:bg-green-900 border border-green-500/50 hover:shadow-[0_0_15px_rgba(34,197,94,0.6)]',
    btnOpActive: 'bg-green-600 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(34,197,94,0.8)] border-green-400',
    btnAction: 'bg-slate-900 text-green-300 hover:bg-green-950 border border-green-500/30 hover:border-green-500 hover:shadow-[0_0_15px_rgba(34,197,94,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-green-600 text-white hover:bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)] border-green-400',
  },
  neonBlue: {
    container: 'bg-slate-950 border-blue-500/50 shadow-[0_0_30px_rgba(59,130,246,0.3)] text-blue-100',
    header: 'bg-slate-950 border-blue-500/30 text-blue-400',
    display: 'bg-slate-950 text-blue-400 border-b border-blue-500/30 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-blue-100 hover:bg-blue-950 border border-blue-500/30 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]',
    btnOp: 'bg-blue-950 text-blue-400 hover:bg-blue-900 border border-blue-500/50 hover:shadow-[0_0_15px_rgba(59,130,246,0.6)]',
    btnOpActive: 'bg-blue-600 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(59,130,246,0.8)] border-blue-400',
    btnAction: 'bg-slate-900 text-blue-300 hover:bg-blue-950 border border-blue-500/30 hover:border-blue-500 hover:shadow-[0_0_15px_rgba(59,130,246,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] border-blue-400',
  },
  neonYellow: {
    container: 'bg-slate-950 border-yellow-400/50 shadow-[0_0_30px_rgba(250,204,21,0.3)] text-yellow-100',
    header: 'bg-slate-950 border-yellow-400/30 text-yellow-400',
    display: 'bg-slate-950 text-yellow-400 border-b border-yellow-400/30 shadow-[inset_0_0_20px_rgba(250,204,21,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-yellow-100 hover:bg-yellow-950 border border-yellow-400/30 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.5)]',
    btnOp: 'bg-yellow-950 text-yellow-400 hover:bg-yellow-900 border border-yellow-400/50 hover:shadow-[0_0_15px_rgba(250,204,21,0.6)]',
    btnOpActive: 'bg-yellow-500 text-slate-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(250,204,21,0.8)] border-yellow-300',
    btnAction: 'bg-slate-900 text-yellow-300 hover:bg-yellow-950 border border-yellow-400/30 hover:border-yellow-400 hover:shadow-[0_0_15px_rgba(250,204,21,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-yellow-500 text-slate-900 hover:bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)] border-yellow-300',
  },
  neonOrange: {
    container: 'bg-slate-950 border-orange-500/50 shadow-[0_0_30px_rgba(249,115,22,0.3)] text-orange-100',
    header: 'bg-slate-950 border-orange-500/30 text-orange-400',
    display: 'bg-slate-950 text-orange-400 border-b border-orange-500/30 shadow-[inset_0_0_20px_rgba(249,115,22,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-orange-100 hover:bg-orange-950 border border-orange-500/30 hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]',
    btnOp: 'bg-orange-950 text-orange-400 hover:bg-orange-900 border border-orange-500/50 hover:shadow-[0_0_15px_rgba(249,115,22,0.6)]',
    btnOpActive: 'bg-orange-500 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(249,115,22,0.8)] border-orange-400',
    btnAction: 'bg-slate-900 text-orange-300 hover:bg-orange-950 border border-orange-500/30 hover:border-orange-500 hover:shadow-[0_0_15px_rgba(249,115,22,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-orange-500 text-white hover:bg-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.8)] border-orange-400',
  },
  neonCyan: {
    container: 'bg-slate-950 border-cyan-400/50 shadow-[0_0_30px_rgba(34,211,238,0.3)] text-cyan-100',
    header: 'bg-slate-950 border-cyan-400/30 text-cyan-400',
    display: 'bg-slate-950 text-cyan-400 border-b border-cyan-400/30 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-cyan-100 hover:bg-cyan-950 border border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]',
    btnOp: 'bg-cyan-950 text-cyan-400 hover:bg-cyan-900 border border-cyan-400/50 hover:shadow-[0_0_15px_rgba(34,211,238,0.6)]',
    btnOpActive: 'bg-cyan-400 text-slate-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(34,211,238,0.8)] border-cyan-300',
    btnAction: 'bg-slate-900 text-cyan-300 hover:bg-cyan-950 border border-cyan-400/30 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(34,211,238,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-cyan-400 text-slate-900 hover:bg-cyan-300 shadow-[0_0_20px_rgba(34,211,238,0.8)] border-cyan-300',
  },
  neonPurple: {
    container: 'bg-slate-950 border-purple-500/50 shadow-[0_0_30px_rgba(168,85,247,0.3)] text-purple-100',
    header: 'bg-slate-950 border-purple-500/30 text-purple-400',
    display: 'bg-slate-950 text-purple-400 border-b border-purple-500/30 shadow-[inset_0_0_20px_rgba(168,85,247,0.1)]',
    keypad: 'bg-slate-950',
    btnNum: 'bg-slate-900 text-purple-100 hover:bg-purple-950 border border-purple-500/30 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    btnOp: 'bg-purple-950 text-purple-400 hover:bg-purple-900 border border-purple-500/50 hover:shadow-[0_0_15px_rgba(168,85,247,0.6)]',
    btnOpActive: 'bg-purple-600 text-white shadow-[inset_0_0_10px_rgba(0,0,0,0.5),0_0_20px_rgba(168,85,247,0.8)] border-purple-400',
    btnAction: 'bg-slate-900 text-purple-300 hover:bg-purple-950 border border-purple-500/30 hover:border-purple-500 hover:shadow-[0_0_15px_rgba(168,85,247,0.5)]',
    btnDanger: 'bg-red-950 text-red-400 hover:bg-red-900 border border-red-500/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.6)]',
    btnEquals: 'bg-purple-600 text-white hover:bg-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.8)] border-purple-400',
  }
};

export function Calculator({ onClose, activePaymentType, onPaymentTypeSelect, onApply, initialValue }: CalculatorProps) {
  const [display, setDisplay] = useState(initialValue || '0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState<{equation: string, result: string}[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [position, setPosition] = useState({ x: window.innerWidth - 450, y: window.innerHeight - 550 });
  const [isDragging, setIsDragging] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [undoStack, setUndoStack] = useState<CalcState[]>([]);

  const [mode, setMode] = useState<'standard' | 'margin'>('standard');
  const [marginSellingPrice, setMarginSellingPrice] = useState<string>('');
  const [marginPrimeCost, setMarginPrimeCost] = useState<string>('');
  const [activeMarginField, setActiveMarginField] = useState<'sellingPrice' | 'primeCost'>('sellingPrice');

  const themeNames: Record<Theme, string> = {
    light: 'Clair',
    dark: 'Sombre',
    glass: 'Verre',
    white: 'Blanc',
    black: 'Noir',
    neonPink: 'Néon Rose',
    neonGreen: 'Néon Vert',
    neonBlue: 'Néon Bleu',
    neonYellow: 'Néon Jaune',
    neonOrange: 'Néon Orange',
    neonCyan: 'Néon Cyan',
    neonPurple: 'Néon Violet'
  };
  const [redoStack, setRedoStack] = useState<CalcState[]>([]);
  const dragRef = useRef<{ startX: number; startY: number; initialX: number; initialY: number } | null>(null);

  const saveState = () => {
    setUndoStack(prev => [...prev, {
      display,
      previousValue,
      operator,
      waitingForNewValue,
      history,
      isDirty
    }]);
    setRedoStack([]);
  };

  const undo = () => {
    if (undoStack.length === 0) return;
    const lastState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, {
      display,
      previousValue,
      operator,
      waitingForNewValue,
      history,
      isDirty
    }]);

    setDisplay(lastState.display);
    setPreviousValue(lastState.previousValue);
    setOperator(lastState.operator);
    setWaitingForNewValue(lastState.waitingForNewValue);
    setHistory(lastState.history);
    setIsDirty(lastState.isDirty);
  };

  const redo = () => {
    if (redoStack.length === 0) return;
    const nextState = redoStack[redoStack.length - 1];
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, {
      display,
      previousValue,
      operator,
      waitingForNewValue,
      history,
      isDirty
    }]);

    setDisplay(nextState.display);
    setPreviousValue(nextState.previousValue);
    setOperator(nextState.operator);
    setWaitingForNewValue(nextState.waitingForNewValue);
    setHistory(nextState.history);
    setIsDirty(nextState.isDirty);
  };

  const paymentMethods = [
    { id: 'cb', label: 'Carte', icon: '💳' },
    { id: 'cbContactless', label: 'Sans Contact', icon: '📶' },
    { id: 'cash', label: 'Espèces', icon: '💵' },
    { id: 'amex', label: 'AMEX', icon: '💎' },
    { id: 'tr', label: 'Titres Resto', icon: '🎫' },
    { id: 'transfer', label: 'Virement', icon: '🏦' },
  ];

  useEffect(() => {
    if (initialValue !== undefined && !isDirty) {
      setDisplay(initialValue);
      setWaitingForNewValue(false);
      setPreviousValue(null);
      setOperator(null);
    }
  }, [initialValue, activePaymentType]);

  // Handle dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || !dragRef.current) return;
      
      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;
      
      setPosition({
        x: Math.max(0, Math.min(window.innerWidth - 320, dragRef.current.initialX + dx)), // 320 is w-80
        y: Math.max(0, Math.min(window.innerHeight - 450, dragRef.current.initialY + dy))
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x,
      initialY: position.y
    };
  };

  const inputDigit = (digit: string) => {
    saveState();
    setIsDirty(true);
    if (mode === 'margin') {
      if (activeMarginField === 'sellingPrice') {
        setMarginSellingPrice(prev => prev === '0' ? digit : prev + digit);
      } else {
        setMarginPrimeCost(prev => prev === '0' ? digit : prev + digit);
      }
      return;
    }
    if (waitingForNewValue) {
      setDisplay(digit);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    saveState();
    setIsDirty(true);
    if (mode === 'margin') {
      if (activeMarginField === 'sellingPrice') {
        setMarginSellingPrice(prev => prev.includes('.') ? prev : (prev || '0') + '.');
      } else {
        setMarginPrimeCost(prev => prev.includes('.') ? prev : (prev || '0') + '.');
      }
      return;
    }
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
      return;
    }
    if (!display.includes('.')) {
      setDisplay(display + '.');
    }
  };

  const clear = () => {
    saveState();
    setIsDirty(true);
    if (mode === 'margin') {
      setMarginSellingPrice('');
      setMarginPrimeCost('');
      return;
    }
    setDisplay('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForNewValue(false);
    setHistory([]);
  };

  const backspace = () => {
    saveState();
    setIsDirty(true);
    if (mode === 'margin') {
      if (activeMarginField === 'sellingPrice') {
        setMarginSellingPrice(prev => prev.slice(0, -1));
      } else {
        setMarginPrimeCost(prev => prev.slice(0, -1));
      }
      return;
    }
    if (waitingForNewValue) return;
    setDisplay(display.length > 1 ? display.slice(0, -1) : '0');
  };

  const performOperation = (nextOperator: string) => {
    saveState();
    setIsDirty(true);
    const inputValue = parseFloat(display);

    if (previousValue == null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const currentValue = previousValue || 0;
      let newValue = currentValue;

      if (operator === '+') newValue = currentValue + inputValue;
      else if (operator === '-') newValue = currentValue - inputValue;
      else if (operator === '*') newValue = currentValue * inputValue;
      else if (operator === '/') newValue = currentValue / inputValue;

      setPreviousValue(newValue);
      setDisplay(String(newValue));

      if (['+', '-', '*', '/'].includes(operator)) {
        const opSymbol = operator === '*' ? '×' : operator === '/' ? '÷' : operator;
        setHistory(prev => [
          { equation: `${currentValue} ${opSymbol} ${inputValue}`, result: String(newValue) },
          ...prev
        ].slice(0, 5));
      }
    }

    if (nextOperator === '=') {
      setWaitingForNewValue(false);
      setOperator(null);
      setPreviousValue(null);
    } else {
      setWaitingForNewValue(true);
      setOperator(nextOperator);
    }
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Undo / Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          redo();
        } else {
          e.preventDefault();
          undo();
        }
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      
      if (e.key >= '0' && e.key <= '9') inputDigit(e.key);
      if (e.key === '.') inputDecimal();
      if (e.key === '=' || e.key === 'Enter') {
        e.preventDefault();
        performOperation('=');
      }
      if (e.key === 'Backspace') backspace();
      if (e.key === 'Escape') clear();
      if (['+', '-', '*', '/'].includes(e.key)) performOperation(e.key);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [display, previousValue, operator, waitingForNewValue, undoStack, redoStack]);

  const [isListening, setIsListening] = useState(false);
  const [detectedAmount, setDetectedAmount] = useState<string | null>(null);

  const startListening = () => {
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Votre navigateur ne supporte pas la reconnaissance vocale.");
      return;
    }

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

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const t = themes[theme];

  const getOpClass = (op: string) => {
    return operator === op && waitingForNewValue ? t.btnOpActive : t.btnOp;
  };

  const calculateGrossMargin = () => {
    const sp = parseFloat(marginSellingPrice) || 0;
    const pc = parseFloat(marginPrimeCost) || 0;
    return (sp - pc).toFixed(2);
  };

  const calculateMarginRate = () => {
    const sp = parseFloat(marginSellingPrice) || 0;
    const pc = parseFloat(marginPrimeCost) || 0;
    if (sp === 0) return '0.00';
    return (((sp - pc) / sp) * 100).toFixed(2);
  };

  return (
    <div 
      className={`fixed w-[420px] rounded-3xl overflow-hidden flex flex-row transition-colors duration-300 border ${t.container}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
    >
      {/* Payment Methods Sidebar */}
      <div className="w-32 border-r border-slate-200/20 bg-black/5 flex flex-col p-2 gap-2">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-2">Paiements</p>
        {paymentMethods.map(method => (
          <button
            key={method.id}
            onClick={() => onPaymentTypeSelect?.(method.id)}
            className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all ${
              activePaymentType === method.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-105 z-10' 
                : 'bg-white/5 text-slate-400 hover:bg-white/10'
            }`}
          >
            <span className="text-lg">{method.icon}</span>
            <span className="text-[8px] font-bold uppercase mt-1 text-center leading-tight">{method.label}</span>
          </button>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div 
          className={`px-4 py-3 border-b flex justify-between items-center cursor-move select-none transition-colors duration-300 ${t.header}`}
          onMouseDown={handleMouseDown}
        >
        <div className="flex items-center gap-2 relative">
          <button 
            onClick={(e) => { e.stopPropagation(); setShowThemeSelector(!showThemeSelector); }}
            className={`p-1.5 rounded-full transition-colors ${showThemeSelector ? 'bg-black/10' : 'hover:bg-black/10'}`}
            title="Changer le thème"
          >
            <Palette size={16} />
          </button>
          
          {showThemeSelector && (
            <div className="absolute top-10 left-0 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 min-w-36 max-h-64 overflow-y-auto w-40 divide-y divide-slate-100 dark:divide-slate-700/50">
              {(Object.keys(themes) as Theme[]).map(t => (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    setTheme(t);
                    setShowThemeSelector(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${theme === t ? 'font-bold text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300 font-medium'}`}
                >
                  {themeNames[t]}
                </button>
              ))}
            </div>
          )}
          
          <div className="h-4 w-px flex-shrink-0 bg-current opacity-20 mx-1"></div>
          
          <button 
            onClick={(e) => { e.stopPropagation(); undo(); }}
            disabled={undoStack.length === 0}
            className={`p-1.5 rounded-full transition-colors ${undoStack.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/10'}`}
            title="Annuler (Ctrl+Z)"
          >
            <Undo2 size={16} />
          </button>

          <button 
            onClick={(e) => { e.stopPropagation(); redo(); }}
            disabled={redoStack.length === 0}
            className={`p-1.5 rounded-full transition-colors ${redoStack.length === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-black/10'}`}
            title="Rétablir (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </button>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onClose(); }} 
          className="p-1.5 rounded-full hover:bg-black/10 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Mode Selector */}
      <div className={`px-4 py-2 flex gap-2 border-b border-current opacity-90 transition-colors duration-300 ${t.header}`}>
        <button 
          onClick={() => setMode('standard')} 
          className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${mode === 'standard' ? 'bg-black/10' : 'opacity-50 hover:bg-black/5'}`}
        >
          Standard
        </button>
        <button 
          onClick={() => setMode('margin')} 
          className={`flex-1 py-1 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors ${mode === 'margin' ? 'bg-black/10' : 'opacity-50 hover:bg-black/5'}`}
        >
          Calcul Marge
        </button>
      </div>

      {/* Display */}
      {mode === 'standard' ? (
      <div className={`relative p-6 text-right text-4xl font-light overflow-hidden text-ellipsis tracking-wider transition-colors duration-300 ${t.display}`}>
        {detectedAmount !== null && (
          <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm flex items-center justify-between px-6 z-20 animate-in fade-in zoom-in duration-200">
            <span className="text-white font-bold flex items-center gap-3 text-2xl">
              <Mic size={24} className="text-blue-200" />
              {detectedAmount} ?
            </span>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setDetectedAmount(null)}
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
              >
                <X size={24} />
              </button>
              <button 
                onClick={() => {
                  setDisplay(detectedAmount);
                  setDetectedAmount(null);
                  setWaitingForNewValue(false);
                }}
                className="p-2 rounded-full bg-white text-blue-600 hover:bg-blue-50 transition-colors shadow-lg"
              >
                <Check size={24} />
              </button>
            </div>
          </div>
        )}
        <div className="flex items-center justify-between">
          <button
            onClick={startListening}
            className={`p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'text-slate-400 hover:text-blue-500 hover:bg-blue-50'}`}
            title="Dicter un montant"
          >
            <Mic size={20} />
          </button>
          <span className="truncate ml-4">{display}</span>
        </div>
      </div>
      ) : (
      <div className={`relative p-4 flex flex-col gap-3 transition-colors duration-300 ${t.display}`}>
        <div 
          onClick={() => setActiveMarginField('sellingPrice')}
          className={`flex flex-col p-3 rounded-xl border-2 transition-colors cursor-text ${activeMarginField === 'sellingPrice' ? 'border-current bg-black/5' : 'border-transparent opacity-70'}`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Prix de Vente</span>
          <span className="text-3xl font-light text-right">{marginSellingPrice || '0'} €</span>
        </div>
        <div 
          onClick={() => setActiveMarginField('primeCost')}
          className={`flex flex-col p-3 rounded-xl border-2 transition-colors cursor-text ${activeMarginField === 'primeCost' ? 'border-current bg-black/5' : 'border-transparent opacity-70'}`}
        >
          <span className="text-xs font-bold uppercase tracking-wider opacity-60 mb-1">Prime Cost</span>
          <span className="text-3xl font-light text-right">{marginPrimeCost || '0'} €</span>
        </div>
        
        <div className="pt-3 mt-1 border-t border-current/20 flex flex-col gap-2">
          <div className="flex justify-between items-center px-3">
             <span className="text-xs font-bold uppercase tracking-wider opacity-80">Marge Brute</span>
             <span className="text-xl font-bold">{calculateGrossMargin()} €</span>
          </div>
          <div className="flex justify-between items-center px-3">
             <span className="text-xs font-bold uppercase tracking-wider opacity-80">Taux de Marge</span>
             <span className="text-xl font-bold shrink-0 text-right">{calculateMarginRate()} %</span>
          </div>
        </div>
      </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className={`px-4 py-2 text-sm flex flex-col gap-1 overflow-y-auto max-h-24 border-b transition-colors duration-300 ${t.header}`}>
          {history.map((item, idx) => (
            <button 
              key={idx}
              onClick={() => {
                setDisplay(item.result);
                setWaitingForNewValue(true);
                setPreviousValue(parseFloat(item.result));
                setOperator(null);
                setIsDirty(true);
              }}
              className="text-right hover:opacity-70 transition-opacity flex justify-between items-center py-1"
              title="Rappeler ce calcul"
            >
              <span className="opacity-50 text-xs">{item.equation} =</span>
              <span className="font-bold">{item.result}</span>
            </button>
          ))}
        </div>
      )}

      {/* Keypad */}
      <div className={`grid grid-cols-4 gap-2 p-4 transition-colors duration-300 ${t.keypad}`}>
        <button onClick={clear} className={`col-span-2 p-4 text-lg font-semibold rounded-2xl transition-all active:scale-95 ${t.btnDanger}`}>C</button>
        <button onClick={backspace} className={`p-4 text-lg font-semibold rounded-2xl flex justify-center items-center transition-all active:scale-95 ${t.btnAction}`}><Delete size={20} /></button>
        <button onClick={() => performOperation('/')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${getOpClass('/')}`}>÷</button>

        <button onClick={() => inputDigit('7')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>7</button>
        <button onClick={() => inputDigit('8')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>8</button>
        <button onClick={() => inputDigit('9')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>9</button>
        <button onClick={() => performOperation('*')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${getOpClass('*')}`}>×</button>

        <button onClick={() => inputDigit('4')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>4</button>
        <button onClick={() => inputDigit('5')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>5</button>
        <button onClick={() => inputDigit('6')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>6</button>
        <button onClick={() => performOperation('-')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${getOpClass('-')}`}>-</button>

        <button onClick={() => inputDigit('1')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>1</button>
        <button onClick={() => inputDigit('2')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>2</button>
        <button onClick={() => inputDigit('3')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>3</button>
        <button onClick={() => performOperation('+')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${getOpClass('+')}`}>+</button>

        <button onClick={() => inputDigit('0')} className={`col-span-2 p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>0</button>
        <button onClick={inputDecimal} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnNum}`}>.</button>
        <button onClick={() => performOperation('=')} className={`p-4 text-xl font-medium rounded-2xl transition-all active:scale-95 ${t.btnEquals}`}>=</button>

        {activePaymentType && (
          <button 
            onClick={() => {
              onApply?.(parseFloat(display));
              setIsDirty(false);
            }}
            className={`col-span-4 mt-2 p-4 text-lg font-bold rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2 ${t.btnEquals}`}
          >
            <Check size={20} /> Appliquer à {paymentMethods.find(m => m.id === activePaymentType)?.label || 'ce champ'}
          </button>
        )}
      </div>
    </div>
  </div>
);
}
