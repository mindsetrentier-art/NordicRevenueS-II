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
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subYears, startOfYear, endOfYear, eachDayOfInterval, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Mail, Share2, Calendar as CalendarIcon, Filter, Store, TrendingUp, TrendingDown, Minus, Search, FileSpreadsheet, Columns, ArrowUpRight, ArrowDownRight } from 'lucide-react';
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
  const [compareMode, setCompareMode] = useState<'none' | 'previous_period' | 'previous_year'>('none');
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [compRevenues, setCompRevenues] = useState<Revenue[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('reportsVisibleColumns');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      cb: true,
      cbContactless: false,
      amex: true,
      amexContactless: false,
      tr: true,
      trContactless: false,
      cash: true,
      transfer: true
    };
  });
  const [exportOptions, setExportOptions] = useState({
    comparison: true,
    kpis: true,
    mainChart: true,
    paymentChart: true,
    dailyTable: true
  });
  const [comparisons, setComparisons] = useState({
    today: { current: 0, previous: 0, percent: 0 },
    thisMonth: { current: 0, previous: 0, percent: 0 },
    thisYear: { current: 0, previous: 0, percent: 0 }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem('reportsVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

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

        let compFilteredData: Revenue[] = [];
        if (compareMode !== 'none') {
          let compStartDate = '';
          let compEndDate = '';
          
          if (compareMode === 'previous_period') {
            const daysDiff = differenceInDays(parseISO(endDate), parseISO(startDate));
            compEndDate = format(subDays(parseISO(startDate), 1), 'yyyy-MM-dd');
            compStartDate = format(subDays(parseISO(compEndDate), daysDiff), 'yyyy-MM-dd');
          } else if (compareMode === 'previous_year') {
            compStartDate = format(subYears(parseISO(startDate), 1), 'yyyy-MM-dd');
            compEndDate = format(subYears(parseISO(endDate), 1), 'yyyy-MM-dd');
          }

          compFilteredData = revData.filter(rev => {
            return rev.date >= compStartDate && rev.date <= compEndDate;
          });
        }

        setRevenues(filteredData.reverse()); // Reverse to have chronological order for charts
        setCompRevenues(compFilteredData.reverse());
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revenues');
      } finally {
        setLoading(false);
      }
    };

    fetchRevenues();
  }, [userProfile, selectedEst, selectedService, startDate, endDate, establishments, compareMode]);

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
    const comparisonEl = document.getElementById('report-comparison');
    const kpisEl = document.getElementById('report-kpis');
    const mainChartEl = document.getElementById('report-main-chart');
    const paymentChartEl = document.getElementById('report-payment-chart');
    const dailyTableEl = document.getElementById('report-daily-table');

    const originalDisplay = {
      comparison: comparisonEl?.style.display,
      kpis: kpisEl?.style.display,
      mainChart: mainChartEl?.style.display,
      paymentChart: paymentChartEl?.style.display,
      dailyTable: dailyTableEl?.style.display
    };

    if (!exportOptions.comparison && comparisonEl) comparisonEl.style.display = 'none';
    if (!exportOptions.kpis && kpisEl) kpisEl.style.display = 'none';
    if (!exportOptions.mainChart && mainChartEl) mainChartEl.style.display = 'none';
    if (!exportOptions.paymentChart && paymentChartEl) paymentChartEl.style.display = 'none';
    if (!exportOptions.dailyTable && dailyTableEl) dailyTableEl.style.display = 'none';

    const reportElement = document.getElementById('pdf-export-content');
    if (!reportElement) {
      if (comparisonEl) comparisonEl.style.display = originalDisplay.comparison || '';
      if (kpisEl) kpisEl.style.display = originalDisplay.kpis || '';
      if (mainChartEl) mainChartEl.style.display = originalDisplay.mainChart || '';
      if (paymentChartEl) paymentChartEl.style.display = originalDisplay.paymentChart || '';
      if (dailyTableEl) dailyTableEl.style.display = originalDisplay.dailyTable || '';
      return;
    }

    try {
      const canvas = await html2canvas(reportElement, { scale: 2, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`rapport-recettes-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      if (comparisonEl) comparisonEl.style.display = originalDisplay.comparison || '';
      if (kpisEl) kpisEl.style.display = originalDisplay.kpis || '';
      if (mainChartEl) mainChartEl.style.display = originalDisplay.mainChart || '';
      if (paymentChartEl) paymentChartEl.style.display = originalDisplay.paymentChart || '';
      if (dailyTableEl) dailyTableEl.style.display = originalDisplay.dailyTable || '';
      
      setShowExportModal(false);
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

  const filteredRevenues = revenues.filter(rev => {
    if (!searchQuery) return true;
    const est = establishments.find(e => e.id === rev.establishmentId);
    return est?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const filteredCompRevenues = compRevenues.filter(rev => {
    if (!searchQuery) return true;
    const est = establishments.find(e => e.id === rev.establishmentId);
    return est?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const exportCSV = () => {
    const headers = ['Période', 'Date', 'Établissement', 'Service', 'Total', 'CB', 'Espèces', 'TR', 'AMEX', 'Virement'];
    
    const generateRows = (data: Revenue[], periodLabel: string) => {
      return data.map(rev => {
        const est = establishments.find(e => e.id === rev.establishmentId);
        const estName = est ? est.name : 'Inconnu';
        const cb = rev.payments.cb + rev.payments.cbContactless;
        const amex = rev.payments.amex + rev.payments.amexContactless;
        const tr = rev.payments.tr + rev.payments.trContactless;
        
        return [
          periodLabel,
          format(parseISO(rev.date), 'dd/MM/yyyy'),
          `"${estName}"`,
          rev.service,
          rev.total,
          cb,
          rev.payments.cash,
          tr,
          amex,
          rev.payments.transfer
        ].join(',');
      });
    };

    let rows = generateRows(filteredRevenues, 'Actuelle');
    
    if (compareMode !== 'none') {
      rows = rows.concat(generateRows(filteredCompRevenues, 'Comparaison'));
    }

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `export-recettes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Prepare data for charts
  const days = eachDayOfInterval({ start: parseISO(startDate), end: parseISO(endDate) });

  const chartData = days.map((day, index) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const displayDate = format(day, 'dd MMM', { locale: fr });
    
    const currentDayRevs = filteredRevenues.filter(r => r.date === dateStr);
    const hasEntries = currentDayRevs.length > 0;
    const total = currentDayRevs.reduce((sum, r) => sum + r.total, 0);
    const cb = currentDayRevs.reduce((sum, r) => sum + r.payments.cb, 0);
    const cbContactless = currentDayRevs.reduce((sum, r) => sum + r.payments.cbContactless, 0);
    const cash = currentDayRevs.reduce((sum, r) => sum + r.payments.cash, 0);
    const tr = currentDayRevs.reduce((sum, r) => sum + r.payments.tr, 0);
    const trContactless = currentDayRevs.reduce((sum, r) => sum + r.payments.trContactless, 0);
    const amex = currentDayRevs.reduce((sum, r) => sum + r.payments.amex, 0);
    const amexContactless = currentDayRevs.reduce((sum, r) => sum + r.payments.amexContactless, 0);
    const transfer = currentDayRevs.reduce((sum, r) => sum + r.payments.transfer, 0);

    let compTotal = undefined;
    let compCb = undefined;
    let compCbContactless = undefined;
    let compCash = undefined;
    let compTr = undefined;
    let compTrContactless = undefined;
    let compAmex = undefined;
    let compAmexContactless = undefined;
    let compTransfer = undefined;
    let compHasEntries = undefined;

    if (compareMode !== 'none') {
      let compDateStr = '';
      if (compareMode === 'previous_period') {
        const daysDiff = differenceInDays(parseISO(endDate), parseISO(startDate));
        const compEndDate = subDays(parseISO(startDate), 1);
        const compStartDate = subDays(compEndDate, daysDiff);
        const compDays = eachDayOfInterval({ start: compStartDate, end: compEndDate });
        if (compDays[index]) {
          compDateStr = format(compDays[index], 'yyyy-MM-dd');
        }
      } else if (compareMode === 'previous_year') {
        compDateStr = format(subYears(day, 1), 'yyyy-MM-dd');
      }
      
      if (compDateStr) {
        const compDayRevs = filteredCompRevenues.filter(r => r.date === compDateStr);
        compHasEntries = compDayRevs.length > 0;
        compTotal = compDayRevs.reduce((sum, r) => sum + r.total, 0);
        compCb = compDayRevs.reduce((sum, r) => sum + r.payments.cb, 0);
        compCbContactless = compDayRevs.reduce((sum, r) => sum + r.payments.cbContactless, 0);
        compCash = compDayRevs.reduce((sum, r) => sum + r.payments.cash, 0);
        compTr = compDayRevs.reduce((sum, r) => sum + r.payments.tr, 0);
        compTrContactless = compDayRevs.reduce((sum, r) => sum + r.payments.trContactless, 0);
        compAmex = compDayRevs.reduce((sum, r) => sum + r.payments.amex, 0);
        compAmexContactless = compDayRevs.reduce((sum, r) => sum + r.payments.amexContactless, 0);
        compTransfer = compDayRevs.reduce((sum, r) => sum + r.payments.transfer, 0);
      }
    }

    return {
      date: displayDate,
      fullDate: dateStr,
      hasEntries,
      total,
      cb,
      cbContactless,
      cash,
      tr,
      trContactless,
      amex,
      amexContactless,
      transfer,
      compHasEntries,
      compTotal,
      compCb,
      compCbContactless,
      compCash,
      compTr,
      compTrContactless,
      compAmex,
      compAmexContactless,
      compTransfer
    };
  });

  const totalRevenue = filteredRevenues.reduce((sum, rev) => sum + rev.total, 0);
  const compTotalRevenue = filteredCompRevenues.reduce((sum, rev) => sum + rev.total, 0);
  
  // Calculate unique days for average
  const uniqueDays = new Set(filteredRevenues.map(r => r.date)).size;
  const avgRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;
  
  const compUniqueDays = new Set(filteredCompRevenues.map(r => r.date)).size;
  const compAvgRevenue = compUniqueDays > 0 ? compTotalRevenue / compUniqueDays : 0;

  const calcPercent = (curr: number, prev: number) => prev === 0 ? (curr > 0 ? 100 : 0) : ((curr - prev) / prev) * 100;
  const periodPercent = calcPercent(totalRevenue, compTotalRevenue);
  const avgPercent = calcPercent(avgRevenue, compAvgRevenue);

  const cbTotal = chartData.reduce((sum, d) => sum + d.cb, 0);
  const cbContactlessTotal = chartData.reduce((sum, d) => sum + d.cbContactless, 0);
  const cashTotal = chartData.reduce((sum, d) => sum + d.cash, 0);
  const trTotal = chartData.reduce((sum, d) => sum + d.tr, 0);
  const trContactlessTotal = chartData.reduce((sum, d) => sum + d.trContactless, 0);
  const amexTotal = chartData.reduce((sum, d) => sum + d.amex, 0);
  const amexContactlessTotal = chartData.reduce((sum, d) => sum + d.amexContactless, 0);
  const transferTotal = chartData.reduce((sum, d) => sum + d.transfer, 0);

  const paymentTotals = [
    { name: 'CB', value: cbTotal, color: '#3b82f6' },
    { name: 'CB SC', value: cbContactlessTotal, color: '#60a5fa' },
    { name: 'AMEX', value: amexTotal, color: '#f59e0b' },
    { name: 'AMEX SC', value: amexContactlessTotal, color: '#fbbf24' },
    { name: 'TR', value: trTotal, color: '#10b981' },
    { name: 'TR SC', value: trContactlessTotal, color: '#34d399' },
    { name: 'Espèces', value: cashTotal, color: '#8b5cf6' },
    { name: 'Virement', value: transferTotal, color: '#64748b' },
  ].filter(item => item.value > 0);

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
            onClick={exportCSV}
            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors shadow-sm"
          >
            <FileSpreadsheet size={16} /> Exporter CSV
          </button>
          <button 
            onClick={() => setShowExportModal(true)}
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

        <div className="flex-1">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
            <TrendingUp size={14} /> Comparer à
          </label>
          <select
            value={compareMode}
            onChange={(e) => setCompareMode(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="none">Aucune comparaison</option>
            <option value="previous_period">Période précédente</option>
            <option value="previous_year">Année précédente</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">Chargement des données...</div>
      ) : (
        <div id="pdf-export-content" className="space-y-8">
          {/* Performances Globales */}
          <div id="report-comparison" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-4 uppercase tracking-wider">Performances Globales (vs N-1)</h3>
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

          {/* KPI Summary */}
          <div id="report-kpis" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-1">Chiffre d'Affaires Total</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-slate-900">
                  {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                {compareMode !== 'none' && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${periodPercent > 0 ? 'bg-emerald-100 text-emerald-700' : periodPercent < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                    {periodPercent > 0 ? <TrendingUp size={14} /> : periodPercent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                    {Math.abs(periodPercent).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {compareMode !== 'none' ? `vs ${compTotalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : 'Sur la période sélectionnée'}
              </p>
            </div>
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <p className="text-sm font-semibold text-slate-500 mb-1">Moyenne par Jour</p>
              <div className="flex items-end justify-between">
                <p className="text-3xl font-black text-slate-900">
                  {avgRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                {compareMode !== 'none' && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${avgPercent > 0 ? 'bg-emerald-100 text-emerald-700' : avgPercent < 0 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                    {avgPercent > 0 ? <TrendingUp size={14} /> : avgPercent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                    {Math.abs(avgPercent).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {compareMode !== 'none' ? `vs ${compAvgRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : `Sur ${uniqueDays} jours d'activité`}
              </p>
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
          <div id="report-main-chart" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Évolution du Chiffre d'Affaires</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    formatter={(value: number, name: string, props: any) => {
                      if (name === 'Période Actuelle' && props.payload.hasEntries === false) {
                        return ['Aucune saisie', name];
                      }
                      if (name === 'Comparaison' && props.payload.compHasEntries === false) {
                        return ['Aucune saisie', name];
                      }
                      if (name === 'compTotal') return [`${value.toFixed(2)} €`, 'Comparaison'];
                      return [`${value.toFixed(2)} €`, name === 'total' ? 'Total' : name];
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                  <Line 
                    type="monotone" 
                    dataKey="total" 
                    name="Période Actuelle"
                    stroke="#2563eb" 
                    strokeWidth={3}
                    dot={(props: any) => {
                      const { cx, cy, payload, value } = props;
                      if (value === undefined || value === null) return null;
                      if (payload.hasEntries === false) {
                        return (
                          <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                        );
                      }
                      return <circle key={`dot-${payload.date}`} cx={cx} cy={cy} r={4} fill="#2563eb" stroke="#fff" strokeWidth={2} />;
                    }}
                    activeDot={{ r: 6 }}
                  />
                  {compareMode !== 'none' && (
                    <Line 
                      type="monotone" 
                      dataKey="compTotal" 
                      name="Comparaison"
                      stroke="#94a3b8" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={(props: any) => {
                        const { cx, cy, payload, value } = props;
                        if (value === undefined || value === null) return null;
                        if (payload.compHasEntries === false) {
                          return (
                            <circle key={`comp-dot-${payload.date}`} cx={cx} cy={cy} r={5} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                          );
                        }
                        return <circle key={`comp-dot-${payload.date}`} cx={cx} cy={cy} r={4} fill="#94a3b8" stroke="#fff" strokeWidth={2} />;
                      }}
                      activeDot={{ r: 6 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Breakdown Pie Chart */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900 mb-6">Part de chaque moyen de paiement</h3>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <PieChart>
                    <Pie
                      data={paymentTotals}
                      cx="50%"
                      cy="50%"
                      innerRadius={80}
                      outerRadius={120}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {paymentTotals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => `${value.toFixed(2)} €`}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Breakdown Chart */}
            <div id="report-payment-chart" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-slate-900">Évolution par Moyen de Paiement</h3>
                <button
                  onClick={exportChartAsImage}
                  className="flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Download size={14} /> Exporter Image
                </button>
              </div>
              <div id="payment-chart-container" className="h-80 w-full bg-white p-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
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
                    <Bar dataKey="cb" name="CB" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="amex" name="AMEX" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tr" name="TR" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="cash" name="Espèces" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="transfer" name="Virement" fill="#64748b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div id="report-daily-table" className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">Détail Journalier des Paiements</h3>
              <div className="relative">
                <button
                  onClick={() => setShowColumnSelector(!showColumnSelector)}
                  className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                >
                  <Columns size={14} /> Colonnes
                </button>
                {showColumnSelector && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowColumnSelector(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 z-20 p-2">
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.cb} onChange={(e) => setVisibleColumns(p => ({...p, cb: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">CB</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer pl-6">
                        <input type="checkbox" checked={visibleColumns.cbContactless} onChange={(e) => setVisibleColumns(p => ({...p, cbContactless: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-600">CB Sans Contact</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.amex} onChange={(e) => setVisibleColumns(p => ({...p, amex: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">AMEX</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer pl-6">
                        <input type="checkbox" checked={visibleColumns.amexContactless} onChange={(e) => setVisibleColumns(p => ({...p, amexContactless: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-600">AMEX Sans Contact</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.tr} onChange={(e) => setVisibleColumns(p => ({...p, tr: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">TR</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer pl-6">
                        <input type="checkbox" checked={visibleColumns.trContactless} onChange={(e) => setVisibleColumns(p => ({...p, trContactless: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-600">TR Sans Contact</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.cash} onChange={(e) => setVisibleColumns(p => ({...p, cash: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Espèces</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                        <input type="checkbox" checked={visibleColumns.transfer} onChange={(e) => setVisibleColumns(p => ({...p, transfer: e.target.checked}))} className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                        <span className="text-sm font-medium text-slate-700">Virement</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-auto max-h-[500px] border border-slate-200 rounded-xl">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr className="border-b border-slate-200 text-sm text-slate-500">
                    <th className="py-3 px-4 font-semibold">Date</th>
                    {visibleColumns.cb && <th className="py-3 px-4 font-semibold text-right">CB</th>}
                    {visibleColumns.cbContactless && <th className="py-3 px-4 font-semibold text-right">CB SC</th>}
                    {visibleColumns.amex && <th className="py-3 px-4 font-semibold text-right">AMEX</th>}
                    {visibleColumns.amexContactless && <th className="py-3 px-4 font-semibold text-right">AMEX SC</th>}
                    {visibleColumns.tr && <th className="py-3 px-4 font-semibold text-right">TR</th>}
                    {visibleColumns.trContactless && <th className="py-3 px-4 font-semibold text-right">TR SC</th>}
                    {visibleColumns.cash && <th className="py-3 px-4 font-semibold text-right">Espèces</th>}
                    {visibleColumns.transfer && <th className="py-3 px-4 font-semibold text-right">Virement</th>}
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {chartData.map((day, idx) => (
                    <tr key={idx} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-slate-900">{day.date}</td>
                      {visibleColumns.cb && <td className="py-3 px-4 text-right text-slate-600">{day.cb.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.cbContactless && <td className="py-3 px-4 text-right text-slate-600">{day.cbContactless.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.amex && <td className="py-3 px-4 text-right text-slate-600">{day.amex.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.amexContactless && <td className="py-3 px-4 text-right text-slate-600">{day.amexContactless.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.tr && <td className="py-3 px-4 text-right text-slate-600">{day.tr.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.trContactless && <td className="py-3 px-4 text-right text-slate-600">{day.trContactless.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.cash && <td className="py-3 px-4 text-right text-slate-600">{day.cash.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      {visibleColumns.transfer && <td className="py-3 px-4 text-right text-slate-600">{day.transfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                      <td className="py-3 px-4 text-right font-bold text-slate-900">{day.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="text-sm font-bold bg-slate-100 sticky bottom-0 z-10 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
                  <tr>
                    <td className="py-4 px-4 text-slate-900 uppercase tracking-wider text-xs">Total Période</td>
                    {visibleColumns.cb && <td className="py-4 px-4 text-right text-slate-900">{cbTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.cbContactless && <td className="py-4 px-4 text-right text-slate-900">{cbContactlessTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.amex && <td className="py-4 px-4 text-right text-slate-900">{amexTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.amexContactless && <td className="py-4 px-4 text-right text-slate-900">{amexContactlessTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.tr && <td className="py-4 px-4 text-right text-slate-900">{trTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.trContactless && <td className="py-4 px-4 text-right text-slate-900">{trContactlessTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.cash && <td className="py-4 px-4 text-right text-slate-900">{cashTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    {visibleColumns.transfer && <td className="py-4 px-4 text-right text-slate-900">{transferTotal.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                    <td className="py-4 px-4 text-right text-blue-600 text-base">{totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                  </tr>
                  {compareMode !== 'none' && (
                    <>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 uppercase tracking-wider text-xs">Total Comparaison</td>
                        {visibleColumns.cb && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compCb || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.cbContactless && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compCbContactless || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.amex && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compAmex || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.amexContactless && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compAmexContactless || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.tr && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compTr || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.trContactless && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compTrContactless || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.cash && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compCash || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        {visibleColumns.transfer && <td className="py-3 px-4 text-right text-slate-500">{chartData.reduce((sum, d) => sum + (d.compTransfer || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                        <td className="py-3 px-4 text-right text-slate-500">{compTotalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                      </tr>
                      <tr className="border-t border-slate-200 bg-slate-50">
                        <td className="py-3 px-4 text-slate-500 uppercase tracking-wider text-xs">Évolution</td>
                        {visibleColumns.cb && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = cbTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compCb || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.cbContactless && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = cbContactlessTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compCbContactless || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.amex && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = amexTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compAmex || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.amexContactless && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = amexContactlessTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compAmexContactless || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.tr && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = trTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compTr || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.trContactless && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = trContactlessTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compTrContactless || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.cash && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = cashTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compCash || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        {visibleColumns.transfer && (
                          <td className="py-3 px-4 text-right">
                            {(() => {
                              const current = transferTotal;
                              const prev = chartData.reduce((sum, d) => sum + (d.compTransfer || 0), 0);
                              const pct = calcPercent(current, prev);
                              return (
                                <span className={`flex items-center justify-end gap-1 ${pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                                  {pct > 0 ? <ArrowUpRight size={14} /> : pct < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                                  {Math.abs(pct).toFixed(1)}%
                                </span>
                              );
                            })()}
                          </td>
                        )}
                        <td className="py-3 px-4 text-right">
                          <span className={`flex items-center justify-end gap-1 font-bold ${periodPercent > 0 ? 'text-emerald-600' : periodPercent < 0 ? 'text-red-600' : 'text-slate-400'}`}>
                            {periodPercent > 0 ? <ArrowUpRight size={14} /> : periodPercent < 0 ? <ArrowDownRight size={14} /> : <Minus size={14} />}
                            {Math.abs(periodPercent).toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    </>
                  )}
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Personnaliser l'export PDF</h3>
            <div className="space-y-3 mb-6">
              {compareMode !== 'none' && (
                <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                  <input 
                    type="checkbox" 
                    checked={exportOptions.comparison}
                    onChange={(e) => setExportOptions({...exportOptions, comparison: e.target.checked})}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Comparaison des chiffres d'affaires</span>
                </label>
              )}
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input 
                  type="checkbox" 
                  checked={exportOptions.kpis}
                  onChange={(e) => setExportOptions({...exportOptions, kpis: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Résumé (KPIs)</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input 
                  type="checkbox" 
                  checked={exportOptions.mainChart}
                  onChange={(e) => setExportOptions({...exportOptions, mainChart: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Graphique d'évolution du CA</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input 
                  type="checkbox" 
                  checked={exportOptions.paymentChart}
                  onChange={(e) => setExportOptions({...exportOptions, paymentChart: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Répartition par moyen de paiement</span>
              </label>
              <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:bg-slate-50">
                <input 
                  type="checkbox" 
                  checked={exportOptions.dailyTable}
                  onChange={(e) => setExportOptions({...exportOptions, dailyTable: e.target.checked})}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-slate-700">Tableau détaillé journalier</span>
              </label>
            </div>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={generatePDF}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                Générer PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
