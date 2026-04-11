import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import clsx from 'clsx';

interface Option {
  id: string;
  name: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  icon?: React.ReactNode;
  className?: string;
}

export function SearchableSelect({ 
  options, 
  value, 
  onChange, 
  placeholder = "Sélectionner...", 
  disabled = false, 
  icon,
  className
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const filteredOptions = options.filter(option => 
    option.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  const handleSelect = (optionId: string) => {
    onChange(optionId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div ref={wrapperRef} className={clsx("relative w-full", className)}>
      {/* Trigger */}
      <div 
        className={clsx(
          "group w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2.5 flex items-center justify-between transition-all duration-200 shadow-sm",
          icon ? 'pl-10 pr-4' : 'px-4',
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-blue-400 hover:shadow-md',
          isOpen ? 'ring-2 ring-blue-500/20 border-blue-500 shadow-blue-500/10' : ''
        )}
        onClick={() => {
          if (!disabled) setIsOpen(!isOpen);
        }}
      >
        {icon && (
          <div className={clsx(
            "absolute left-3 top-1/2 -translate-y-1/2 transition-colors duration-200",
            isOpen ? "text-blue-500" : "text-slate-400 group-hover:text-blue-400"
          )}>
            {icon}
          </div>
        )}
        
        <div className="flex flex-col items-start overflow-hidden">
          {selectedOption && (
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest leading-none mb-0.5">
              {placeholder}
            </span>
          )}
          <span className={clsx(
            "truncate transition-colors duration-200",
            selectedOption ? "text-slate-900 font-semibold" : "text-slate-400"
          )}>
            {selectedOption ? selectedOption.name : placeholder}
          </span>
        </div>

        <ChevronDown 
          size={18} 
          className={clsx(
            "text-slate-400 transition-all duration-300 shrink-0 ml-2",
            isOpen ? 'rotate-180 text-blue-500' : 'group-hover:text-blue-400'
          )} 
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="p-3 border-b border-slate-100 bg-slate-50/50">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  className="w-full bg-white border border-slate-200 text-sm rounded-xl pl-9 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
                {searchTerm && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchTerm('');
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5 custom-scrollbar">
              {filteredOptions.length === 0 ? (
                <div className="px-4 py-10 text-sm text-slate-500 text-center">
                  <div className="bg-slate-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Search size={20} className="text-slate-300" />
                  </div>
                  <p className="font-medium">Aucun résultat trouvé</p>
                  <p className="text-xs text-slate-400 mt-1">Essayez un autre terme de recherche</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredOptions.map((option) => {
                    const isSelected = value === option.id;
                    return (
                      <motion.div
                        key={option.id}
                        whileHover={{ x: 4 }}
                        className={clsx(
                          "px-4 py-3 text-sm rounded-xl cursor-pointer flex items-center justify-between transition-all duration-200",
                          isSelected 
                            ? 'bg-blue-50 text-blue-700 font-bold shadow-sm' 
                            : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'
                        )}
                        onClick={() => handleSelect(option.id)}
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className={clsx(
                            "w-2 h-2 rounded-full shrink-0 transition-all duration-300",
                            isSelected ? "bg-blue-500 scale-125" : "bg-slate-200 group-hover:bg-blue-300"
                          )} />
                          <span className="truncate">{option.name}</span>
                        </div>
                        {isSelected && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="bg-blue-600 text-white p-0.5 rounded-full"
                          >
                            <Check size={12} strokeWidth={3} />
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

