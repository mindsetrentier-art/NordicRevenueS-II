import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Establishment, Revenue } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subYears, startOfYear, endOfYear } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Mail, Share2, Calendar as CalendarIcon, Filter, Store, TrendingUp, TrendingDown, Minus, Search } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

export function Reports() {
  const { userProfile } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEst, setSelectedEst] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('weekly');
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [comparisons, setComparisons] = useState({
    today: { current: 0, previous: 0, percent: 0 },
    thisMonth: { current: 0, previous: 0, percent: 0 },
    thisYear: { current: 0, previous: 0, percent: 0 }
  });
  const [loading, setLoading] = useState(true);

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
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'establishments');
      }
    };

    fetchEstablishments();
  }, [userProfile]);

  useEffect(() => {
    const fetchRevenues = async () => {
      if (!userProfile) return;
      setLoading(true);
      try {
        let revData: Revenue[] = [];
        
        if (userProfile.role === 'admin') {
          let revQuery = query(collection(db, 'revenues'));
          if (selectedEst !== 'all') {
            revQuery = query(revQuery, where('establishmentId', '==', selectedEst));
          }
          if (selectedService !== 'all') {
            revQuery = query(revQuery, where('service', '==', selectedService));
          }
          const revSnap = await getDocs(revQuery);
          revData = revSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Revenue));
        } else {
          const estIds = establishments.map(e => e.id);
          if (selectedEst !== 'all') {
            // Manager selected a specific establishment
            if (estIds.includes(selectedEst)) {
              let revQuery = query(collection(db, 'revenues'), where('establishmentId', '==', selectedEst));
              if (selectedService !== 'all') {
                revQuery = query(revQuery, where('service', '==', selectedService));
              }
              const revSnap = await getDocs(revQuery);
              revData = revSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Revenue));
            }
          } else if (estIds.length > 0) {
            // Manager selected 'all' establishments they have access to
            const promises = estIds.map(id => {
              let revQuery = query(collection(db, 'revenues'), where('establishmentId', '==', id));
              if (selectedService !== 'all') {
                revQuery = query(revQuery, where('service', '==', selectedService));
              }
              return getDocs(revQuery);
            });
            const snaps = await Promise.all(promises);
            snaps.forEach(snap => {
              snap.docs.forEach(doc => {
                revData.push({ id: doc.id, ...(doc.data() as any) } as Revenue);
              });
            });
          }
        }
        
        // Sort by date descending
        revData.sort((a, b) => b.date.localeCompare(a.date));
        
        // Calculate comparisons
        const today = new Date();
        const todayStr = format(today, 'yyyy-MM-dd');
        const sameDayLastYearStr = format(subYears(today, 1), 'yyyy-MM-dd');

        const startOfThisMonthStr = format(startOfMonth(today), 'yyyy-MM-dd');
        const startOfSameMonthLastYearStr = format(startOfMonth(subYears(today, 1)), 'yyyy-MM-dd');

        const startOfThisYearStr = format(startOfYear(today), 'yyyy-MM-dd');
        const startOfSameYearLastYearStr = format(startOfYear(subYears(today, 1)), 'yyyy-MM-dd');

        const todayTotal = revData.filter(r => r.date === todayStr).reduce((sum, r) => sum + r.total, 0);
        const sameDayLastYearTotal = revData.filter(r => r.date === sameDayLastYearStr).reduce((sum, r) => sum + r.total, 0);

        const thisMonthTotal = revData.filter(r => r.date >= startOfThisMonthStr && r.date <= todayStr).reduce((sum, r) => sum + r.total, 0);
        const sameMonthLastYearTotal = revData.filter(r => r.date >= startOfSameMonthLastYearStr && r.date <= sameDayLastYearStr).reduce((sum, r) => sum + r.total, 0);

        const thisYearTotal = revData.filter(r => r.date >= startOfThisYearStr && r.date <= todayStr).reduce((sum, r) => sum + r.total, 0);
        const sameYearLastYearTotal = revData.filter(r => r.date >= startOfSameYearLastYearStr && r.date <= sameDayLastYearStr).reduce((sum, r) => sum + r.total, 0);

        const calcPercent = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;

        setComparisons({
          today: { current: todayTotal, previous: sameDayLastYearTotal, percent: calcPercent(todayTotal, sameDayLastYearTotal) },
          thisMonth: { current: thisMonthTotal, previous: sameMonthLastYearTotal, percent: calcPercent(thisMonthTotal, sameMonthLastYearTotal) },
          thisYear: { current: thisYearTotal, previous: sameYearLastYearTotal, percent: calcPercent(thisYearTotal, sameYearLastYearTotal) }
        });
        
        // Filter by date range
        const filteredData = revData.filter(rev => {
          return rev.date >= startDate && rev.date <= endDate;
        });

        setRevenues(filteredData.reverse()); // Reverse to have chronological order for charts
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revenues');
      } finally {
        setLoading(false);
      }
    };

    fetchRevenues();
  }, [userProfile, selectedEst, selectedService, startDate, endDate, establishments]);

  const setQuickRange = (days: number) => {
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setStartDate(format(subDays(new Date(), days - 1), 'yyyy-MM-dd'));
  };

  const setThisWeek = () => {
    setStartDate(format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
    setEndDate(format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'));
  };

  const setThisMonth = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
  };

  const setThisYear = () => {
    setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfYear(new Date()), 'yyyy-MM-dd'));
  };

  const generatePDF = async () => {
    const reportElement = document.getElementById('report-content');
    if (!reportElement) return;

    try {
      const canvas = await html2canvas(reportElement, { scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`rapport-recettes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    }
  };

  const exportChartAsImage = async () => {
    const chartElement = document.getElementById('payment-chart-container');
    if (!chartElement) return;

    try {
      const canvas = await html2canvas(chartElement, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = `repartition-paiements-${format(new Date(), 'yyyy-MM-dd')}.png`;
      link.click();
    } catch (error) {
      console.error('Error generating image:', error);
    }
  };

  // Prepare data for charts
  const chartData = revenues.reduce((acc, rev) => {
    const dateStr = format(parseISO(rev.date), 'dd MMM', { locale: fr });
    const existing = acc.find(item => item.date === dateStr);
    
    const cb = rev.payments.cb + rev.payments.cbContactless;
    const cash = rev.payments.cash;
    const tr = rev.payments.tr + rev.payments.trContactless;
    const amex = rev.payments.amex + rev.payments.amexContactless;
    const transfer = rev.payments.transfer;

    if (existing) {
      existing.total += rev.total;
      existing.cb += cb;
      existing.cash += cash;
      existing.tr += tr;
      existing.amex += amex;
      existing.transfer += transfer;
    } else {
      acc.push({
        date: dateStr,
        total: rev.total,
        cb,
        cash,
        tr,
        amex,
        transfer
      });
    }
    return acc;
  }, [] as any[]);

  const totalRevenue = revenues.reduce((sum, rev) => sum + rev.total, 0);
  // Calculate unique days for average
  const uniqueDays = new Set(revenues.map(r => r.date)).size;
  const avgRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;

  const sendByEmail = () => {
    const formatCurrency = (val: number) => val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    
    const subject = encodeURIComponent(`Rapport Financier - ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')}`);
    
    const cbTotal = chartData.reduce((sum, d) => sum + d.cb, 0);
    const cashTotal = chartData.reduce((sum, d) => sum + d.cash, 0);
    const trTotal = chartData.reduce((sum, d) => sum + d.tr, 0);
    const amexTotal = chartData.reduce((sum, d) => sum + d.amex, 0);
    const transferTotal = chartData.reduce((sum, d) => sum + d.transfer, 0);

    const body = encodeURIComponent(`Bonjour,

Voici le résumé financier pour la période du ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')} :

Chiffre d'Affaires Total : ${formatCurrency(totalRevenue)}
Moyenne par Jour : ${formatCurrency(avgRevenue)}

Détail des paiements :
- Cartes Bancaires : ${formatCurrency(cbTotal)}
- Espèces : ${formatCurrency(cashTotal)}
- Titres-Restaurant : ${formatCurrency(trTotal)}
- American Express : ${formatCurrency(amexTotal)}
- Virements : ${formatCurrency(transferTotal)}

Cordialement,
NordicRevenueS`);

    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShare = async () => {
    const formatCurrency = (val: number) => val.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
    
    const title = `Rapport Financier - ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')}`;
    
    const cbTotal = chartData.reduce((sum, d) => sum + d.cb, 0);
    const cashTotal = chartData.reduce((sum, d) => sum + d.cash, 0);
    const trTotal = chartData.reduce((sum, d) => sum + d.tr, 0);
    const amexTotal = chartData.reduce((sum, d) => sum + d.amex, 0);
    const transferTotal = chartData.reduce((sum, d) => sum + d.transfer, 0);

    const text = `Résumé financier du ${format(parseISO(startDate), 'dd/MM/yyyy')} au ${format(parseISO(endDate), 'dd/MM/yyyy')} :

CA Total : ${formatCurrency(totalRevenue)}
Moyenne par Jour : ${formatCurrency(avgRevenue)}

Détail des paiements :
- Cartes Bancaires : ${formatCurrency(cbTotal)}
- Espèces : ${formatCurrency(cashTotal)}
- Titres-Restaurant : ${formatCurrency(trTotal)}
- American Express : ${formatCurrency(amexTotal)}
- Virements : ${formatCurrency(transferTotal)}

Généré par NordicRevenueS`;

    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Erreur lors du partage:', error);
        }
      }
    } else {
      alert('Le partage natif n\'est pas supporté sur ce navigateur.');
    }
  };

  const filteredEstablishments = establishments.filter(est => 
    est.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rapports & Analyses</h1>
          <p className="text-slate-500 text-sm mt-1">Analysez vos performances financières et exportez vos données.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={generatePDF}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Download size={16} /> Exporter PDF
          </button>
          <button 
            onClick={sendByEmail}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Mail size={16} /> Envoyer
          </button>
          <button 
            onClick={handleShare}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <Share2 size={16} /> Partager
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search size={20} className="text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un établissement par nom..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Store size={14} /> Établissement
          </label>
          <select
            value={selectedEst}
            onChange={(e) => setSelectedEst(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tous les établissements</option>
            {filteredEstablishments.map(est => (
              <option key={est.id} value={est.id}>{est.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <Filter size={14} /> Service
          </label>
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="all">Tous les services</option>
            <option value="midi">Midi</option>
            <option value="soir">Soir</option>
          </select>
        </div>
        
        <div className="flex-[2]">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <CalendarIcon size={14} /> Période
          </label>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  const newStartDate = e.target.value;
                  setStartDate(newStartDate);
                  if (newStartDate > endDate) {
                    setEndDate(newStartDate);
                  }
                }}
                className="text-sm text-slate-700 outline-none bg-transparent"
              />
              <span className="text-slate-400">-</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  const newEndDate = e.target.value;
                  setEndDate(newEndDate);
                  if (newEndDate < startDate) {
                    setStartDate(newEndDate);
                  }
                }}
                className="text-sm text-slate-700 outline-none bg-transparent"
              />
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button
                onClick={setThisWeek}
                className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg capitalize transition-colors text-slate-600 hover:text-slate-900 hover:bg-white/50"
              >
                Cette Semaine
              </button>
              <button
                onClick={setThisMonth}
                className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg capitalize transition-colors text-slate-600 hover:text-slate-900 hover:bg-white/50"
              >
                Ce Mois
              </button>
              <button
                onClick={setThisYear}
                className="flex-1 text-xs font-semibold py-1.5 px-3 rounded-lg capitalize transition-colors text-slate-600 hover:text-slate-900 hover:bg-white/50"
              >
                Cette Année
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comparaison des chiffres d'affaires */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Comparaison des chiffres d'affaires</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Ce Jour */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-1">Ce jour vs N-1</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-black text-slate-900">{comparisons.today.current.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                <p className="text-xs text-slate-400 mt-1">N-1: {comparisons.today.previous.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${comparisons.today.percent > 0 ? 'bg-emerald-100 text-emerald-700' : comparisons.today.percent < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                {comparisons.today.percent > 0 ? <TrendingUp size={14} /> : comparisons.today.percent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                {Math.abs(comparisons.today.percent).toFixed(1)}%
              </div>
            </div>
          </div>
          
          {/* Ce Mois */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-1">Ce mois vs N-1</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-black text-slate-900">{comparisons.thisMonth.current.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                <p className="text-xs text-slate-400 mt-1">N-1: {comparisons.thisMonth.previous.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${comparisons.thisMonth.percent > 0 ? 'bg-emerald-100 text-emerald-700' : comparisons.thisMonth.percent < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                {comparisons.thisMonth.percent > 0 ? <TrendingUp size={14} /> : comparisons.thisMonth.percent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                {Math.abs(comparisons.thisMonth.percent).toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Cette Année */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <p className="text-xs font-semibold text-slate-500 mb-1">Cette année vs N-1</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xl font-black text-slate-900">{comparisons.thisYear.current.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
                <p className="text-xs text-slate-400 mt-1">N-1: {comparisons.thisYear.previous.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</p>
              </div>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${comparisons.thisYear.percent > 0 ? 'bg-emerald-100 text-emerald-700' : comparisons.thisYear.percent < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                {comparisons.thisYear.percent > 0 ? <TrendingUp size={14} /> : comparisons.thisYear.percent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                {Math.abs(comparisons.thisYear.percent).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">Chargement des données...</div>
      ) : (
        <div id="report-content" className="space-y-8">
          {/* KPI Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-1">Chiffre d'Affaires Total</p>
              <p className="text-3xl font-black text-slate-900">
                {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-xs text-slate-400 mt-2">Sur la période sélectionnée</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-1">Moyenne par Jour</p>
              <p className="text-3xl font-black text-slate-900">
                {avgRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
              <p className="text-xs text-slate-400 mt-2">Sur {uniqueDays} jours d'activité</p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-1">Meilleure Journée</p>
              <p className="text-3xl font-black text-emerald-600">
                {chartData.length > 0 
                  ? Math.max(...chartData.map(r => r.total)).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })
                  : '0,00 €'}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                {chartData.length > 0 
                  ? chartData.reduce((max, r) => max.total > r.total ? max : r).date
                  : '-'}
              </p>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Évolution du Chiffre d'Affaires</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => [`${value.toFixed(2)} €`, 'Total']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Payment Breakdown Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Répartition par Moyen de Paiement</h3>
              <button
                onClick={exportChartAsImage}
                className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Download size={14} /> Exporter Image
              </button>
            </div>
            <div id="payment-chart-container" className="h-80 w-full bg-white p-2">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="date" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#64748b', fontSize: 12 }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    formatter={(value: number) => `${value.toFixed(2)} €`}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Bar dataKey="cb" name="CB" stackId="a" fill="#3b82f6" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="amex" name="AMEX" stackId="a" fill="#f59e0b" />
                  <Bar dataKey="tr" name="TR" stackId="a" fill="#10b981" />
                  <Bar dataKey="cash" name="Espèces" stackId="a" fill="#8b5cf6" />
                  <Bar dataKey="transfer" name="Virement" stackId="a" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
