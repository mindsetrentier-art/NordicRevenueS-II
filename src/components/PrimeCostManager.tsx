import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Calculator, Save, Loader2, AlertCircle, TrendingDown, DollarSign, Users, Briefcase, ChevronLeft, ChevronRight, Info, Plus, Minus, Building, Zap, PiggyBank, Landmark, FileText } from 'lucide-react';
import { format, subMonths, addMonths, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { db, auth } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'firebase/firestore';
import { Cost, OperationType } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { QuickCalculator } from './QuickCalculator';
import { InvoiceScanner } from './InvoiceScanner';
import { Scan } from 'lucide-react';

interface PrimeCostManagerProps {
  establishmentId: string;
  onCostUpdated?: () => void;
}

export function PrimeCostManager({ establishmentId, onCostUpdated }: PrimeCostManagerProps) {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cost, setCost] = useState<Partial<Cost> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [laborCost, setLaborCost] = useState<string>('0');
  const [cogs, setCogs] = useState<string>('0');
  const [otherCosts, setOtherCosts] = useState<string>('0');
  const [rent, setRent] = useState<string>('0');
  const [utilities, setUtilities] = useState<string>('0');
  const [bankLoan, setBankLoan] = useState<string>('0');
  const [taxes, setTaxes] = useState<string>('0');
  const [vat, setVat] = useState<string>('0');

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showScanner, setShowScanner] = useState(false);

  // Calculator states
  const [activeCalculator, setActiveCalculator] = useState<'labor' | 'cogs' | 'other' | 'rent' | 'utilities' | 'bankLoan' | 'taxes' | 'vat' | null>(null);

  const handleScanComplete = (result: any) => {
    if (result.category === 'cogs') {
      setCogs((parseFloat(cogs) + result.totalHT).toString());
      setVat((parseFloat(vat) + result.vat).toString());
    } else if (result.category === 'utilities') {
      setUtilities((parseFloat(utilities) + result.totalHT).toString());
      setVat((parseFloat(vat) + result.vat).toString());
      setShowAdvanced(true);
    } else if (result.category === 'rent') {
      setRent((parseFloat(rent) + result.totalHT).toString());
      setVat((parseFloat(vat) + result.vat).toString());
      setShowAdvanced(true);
    } else if (result.category === 'taxes') {
      setTaxes((parseFloat(taxes) + result.totalHT).toString());
      setVat((parseFloat(vat) + result.vat).toString());
      setShowAdvanced(true);
    } else if (result.category === 'otherCosts') {
      setOtherCosts((parseFloat(otherCosts) + result.totalHT).toString());
      setVat((parseFloat(vat) + result.vat).toString());
      setShowAdvanced(true);
    }
    setShowScanner(false);
  };

  useEffect(() => {
    fetchCost();
  }, [establishmentId, selectedMonth]);

  const fetchCost = async () => {
    if (!establishmentId) return;
    setLoading(true);
    setError(null);
    try {
      const q = query(
        collection(db, 'costs'),
        where('establishmentId', '==', establishmentId),
        where('month', '==', selectedMonth),
        limit(1)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const costData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Cost;
        setCost(costData);
        setLaborCost(costData.laborCost.toString());
        setCogs(costData.cogs.toString());
        setOtherCosts(costData.otherCosts?.toString() || '0');
        setRent(costData.rent?.toString() || '0');
        setUtilities(costData.utilities?.toString() || '0');
        setBankLoan(costData.bankLoan?.toString() || '0');
        setTaxes(costData.taxes?.toString() || '0');
        setVat(costData.vat?.toString() || '0');
      } else {
        setCost(null);
        setLaborCost('0');
        setCogs('0');
        setOtherCosts('0');
        setRent('0');
        setUtilities('0');
        setBankLoan('0');
        setTaxes('0');
        setVat('0');
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, 'costs');
      setError("Impossible de charger les coûts pour ce mois.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser || !establishmentId) return;
    setSaving(true);
    setError(null);

    const costData = {
      establishmentId,
      month: selectedMonth,
      laborCost: parseFloat(laborCost) || 0,
      cogs: parseFloat(cogs) || 0,
      otherCosts: parseFloat(otherCosts) || 0,
      rent: parseFloat(rent) || 0,
      utilities: parseFloat(utilities) || 0,
      bankLoan: parseFloat(bankLoan) || 0,
      taxes: parseFloat(taxes) || 0,
      vat: parseFloat(vat) || 0,
      updatedAt: serverTimestamp(),
    };

    try {
      if (cost?.id) {
        await updateDoc(doc(db, 'costs', cost.id), costData);
      } else {
        await addDoc(collection(db, 'costs'), {
          ...costData,
          createdBy: auth.currentUser.uid,
          createdAt: serverTimestamp(),
        });
      }
      fetchCost();
      if (onCostUpdated) onCostUpdated();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'costs');
      setError("Erreur lors de l'enregistrement des coûts.");
    } finally {
      setSaving(false);
    }
  };

  const changeMonth = (delta: number) => {
    const current = parseISO(`${selectedMonth}-01`);
    const next = delta > 0 ? addMonths(current, 1) : subMonths(current, 1);
    setSelectedMonth(format(next, 'yyyy-MM'));
  };

  const applyCalculatedValue = (value: number) => {
    if (activeCalculator === 'labor') setLaborCost(String(value));
    if (activeCalculator === 'cogs') setCogs(String(value));
    if (activeCalculator === 'other') setOtherCosts(String(value));
    if (activeCalculator === 'rent') setRent(String(value));
    if (activeCalculator === 'utilities') setUtilities(String(value));
    if (activeCalculator === 'bankLoan') setBankLoan(String(value));
    if (activeCalculator === 'taxes') setTaxes(String(value));
    if (activeCalculator === 'vat') setVat(String(value));
    setActiveCalculator(null);
  };

  const getCalculatorInitialValue = () => {
    switch (activeCalculator) {
      case 'labor': return laborCost;
      case 'cogs': return cogs;
      case 'other': return otherCosts;
      case 'rent': return rent;
      case 'utilities': return utilities;
      case 'bankLoan': return bankLoan;
      case 'taxes': return taxes;
      case 'vat': return vat;
      default: return '0';
    }
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
      <AnimatePresence>
        {activeCalculator && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <QuickCalculator 
              onClose={() => setActiveCalculator(null)} 
              onApply={applyCalculatedValue}
              initialValue={getCalculatorInitialValue()}
            />
          </div>
        )}
      </AnimatePresence>

      {showScanner && (
        <InvoiceScanner 
          onClose={() => setShowScanner(false)} 
          onScanComplete={handleScanComplete} 
        />
      )}

      <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-600/20">
            <Calculator size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Prime Cost & Marges</h2>
            <p className="text-xs text-slate-500 font-medium">Pilotez votre rentabilité réelle</p>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => setShowScanner(true)}
            className="flex items-center gap-2 bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-4 py-2.5 rounded-2xl shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all text-sm font-bold"
          >
            <Scan size={18} />
            <span className="hidden sm:inline">Scanner Facture (IA)</span>
            <span className="sm:hidden">IA Scanner</span>
          </button>

          <div className="flex items-center gap-2 bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
            <button 
              onClick={() => changeMonth(-1)}
              className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-indigo-600"
            >
            <ChevronLeft size={20} />
          </button>
          <div className="px-4 py-2 text-sm font-bold text-slate-700 min-w-[140px] text-center uppercase tracking-wider">
            {format(parseISO(`${selectedMonth}-01`), 'MMMM yyyy', { locale: fr })}
          </div>
          <button 
            onClick={() => changeMonth(1)}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400 hover:text-indigo-600"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
      </div>

      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-4">
              <div className="space-y-4">
                <label className="block">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <Users size={16} className="text-indigo-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Main d'œuvre</span>
                    </div>
                    <button 
                      onClick={() => setActiveCalculator('labor')}
                      className="p-1 hover:bg-indigo-50 text-indigo-400 hover:text-indigo-600 rounded-md transition-colors"
                      title="Ouvrir la calculatrice"
                    >
                      <Calculator size={14} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={laborCost}
                      onChange={(e) => setLaborCost(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-black text-slate-900"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                  </div>
                </label>

                <label className="block">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <Briefcase size={16} className="text-amber-500" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Matières (COGS)</span>
                    </div>
                    <button 
                      onClick={() => setActiveCalculator('cogs')}
                      className="p-1 hover:bg-amber-50 text-amber-400 hover:text-amber-600 rounded-md transition-colors"
                      title="Ouvrir la calculatrice"
                    >
                      <Calculator size={14} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={cogs}
                      onChange={(e) => setCogs(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-amber-600/10 focus:border-amber-600 transition-all font-black text-slate-900"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                  </div>
                </label>

                <label className="block">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-slate-400" />
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Autres charges</span>
                    </div>
                    <button 
                      onClick={() => setActiveCalculator('other')}
                      className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
                      title="Ouvrir la calculatrice"
                    >
                      <Calculator size={14} />
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      value={otherCosts}
                      onChange={(e) => setOtherCosts(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-slate-600/10 focus:border-slate-600 transition-all font-black text-slate-900"
                    />
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                  </div>
                </label>

                <div className="pt-2">
                  <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors px-2 py-1 rounded-lg hover:bg-indigo-50 w-full"
                  >
                    {showAdvanced ? <Minus size={16} /> : <Plus size={16} />}
                    {showAdvanced ? 'Masquer les charges détaillées' : 'Ajouter des charges détaillées'}
                  </button>
                </div>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden pt-2"
                    >
                      {/* Loyer */}
                      <label className="block">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <Building size={16} className="text-teal-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Loyer</span>
                          </div>
                          <button onClick={() => setActiveCalculator('rent')} className="p-1 hover:bg-teal-50 text-teal-400 hover:text-teal-600 rounded-md transition-colors">
                            <Calculator size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <input type="number" value={rent} onChange={(e) => setRent(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-teal-600/10 focus:border-teal-600 transition-all font-black text-slate-900" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                        </div>
                      </label>

                      {/* Électricité, gaz, l'eau */}
                      <label className="block">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <Zap size={16} className="text-yellow-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Énergies & Eau</span>
                          </div>
                          <button onClick={() => setActiveCalculator('utilities')} className="p-1 hover:bg-yellow-50 text-yellow-400 hover:text-yellow-600 rounded-md transition-colors">
                            <Calculator size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <input type="number" value={utilities} onChange={(e) => setUtilities(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-yellow-600/10 focus:border-yellow-600 transition-all font-black text-slate-900" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                        </div>
                      </label>

                      {/* Crédit ou emprunt bancaire */}
                      <label className="block">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <Landmark size={16} className="text-emerald-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Emprunt Bancaire</span>
                          </div>
                          <button onClick={() => setActiveCalculator('bankLoan')} className="p-1 hover:bg-emerald-50 text-emerald-400 hover:text-emerald-600 rounded-md transition-colors">
                            <Calculator size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <input type="number" value={bankLoan} onChange={(e) => setBankLoan(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-emerald-600/10 focus:border-emerald-600 transition-all font-black text-slate-900" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                        </div>
                      </label>

                      {/* Taxes */}
                      <label className="block">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-rose-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">Taxes & Impôts</span>
                          </div>
                          <button onClick={() => setActiveCalculator('taxes')} className="p-1 hover:bg-rose-50 text-rose-400 hover:text-rose-600 rounded-md transition-colors">
                            <Calculator size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <input type="number" value={taxes} onChange={(e) => setTaxes(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-rose-600/10 focus:border-rose-600 transition-all font-black text-slate-900" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                        </div>
                      </label>

                      {/* VAT */}
                      <label className="block">
                        <div className="flex items-center justify-between mb-2 px-1">
                          <div className="flex items-center gap-2">
                            <PiggyBank size={16} className="text-purple-500" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest leading-none">TVA</span>
                          </div>
                          <button onClick={() => setActiveCalculator('vat')} className="p-1 hover:bg-purple-50 text-purple-400 hover:text-purple-600 rounded-md transition-colors">
                            <Calculator size={14} />
                          </button>
                        </div>
                        <div className="relative">
                          <input type="number" value={vat} onChange={(e) => setVat(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-4 focus:ring-purple-600/10 focus:border-purple-600 transition-all font-black text-slate-900" />
                          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">€</div>
                        </div>
                      </label>

                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600">
                  <AlertCircle size={18} />
                  <p className="text-xs font-bold">{error}</p>
                </div>
              )}

              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Enregistrer les coûts
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="md:col-span-2 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="p-6 bg-slate-900 rounded-[2rem] text-white">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Prime Cost Total</p>
                <p className="text-3xl font-black tracking-tight">
                  {(parseFloat(laborCost || '0') + parseFloat(cogs || '0')).toLocaleString('fr-FR')} €
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
                  <Info size={14} />
                  <span>Main d'œuvre + Matières premières</span>
                </div>
              </div>

              <div className="p-6 bg-indigo-50 border border-indigo-100 rounded-[2rem]">
                <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-4">Total Toutes Charges</p>
                <p className="text-3xl font-black tracking-tight text-indigo-900">
                  {((parseFloat(laborCost || '0') + parseFloat(cogs || '0') + parseFloat(otherCosts || '0') + parseFloat(rent || '0') + parseFloat(utilities || '0') + parseFloat(bankLoan || '0') + parseFloat(taxes || '0') + parseFloat(vat || '0'))).toLocaleString('fr-FR')} €
                </p>
                <div className="mt-4 flex items-center gap-2 text-xs text-indigo-400 font-medium">
                  <Info size={14} />
                  <span>Prime Cost + Loyer, Taxes, etc.</span>
                </div>
              </div>
            </div>

            <div className="p-8 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-center">
              <div className="p-4 bg-slate-50 text-slate-400 rounded-full mb-4">
                <Calculator size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-900 mb-2">Analyse globale des coûts</h3>
              <p className="text-sm text-slate-500 max-w-sm leading-relaxed">
                Le <strong>Prime Cost</strong> (Idéalement 55%-65% du CA) mesure votre cœur d'activité. Le <strong>Total Toutes Charges</strong> vous permet d'obtenir votre point d'équilibre (Break-Even) exact.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
