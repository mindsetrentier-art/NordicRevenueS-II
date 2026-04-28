import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Revenue, Establishment, AlertRule, Cost } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { 
  Plus,
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Banknote, 
  Receipt,
  ArrowRight,
  Bell,
  Store,
  Clock,
  ChevronDown,
  HelpCircle,
  Shield,
  X,
  Calendar,
  Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ComposedChart,
  Area,
  Legend,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, isSameDay, differenceInDays, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { AIInsights } from '../components/AIInsights';
import { SearchableSelect } from '../components/SearchableSelect';
import { StaffLeaderboard } from '../components/StaffLeaderboard';
import { EstablishmentLeaderboard } from '../components/EstablishmentLeaderboard';
import { SuccessBadges } from '../components/SuccessBadges';
import { ExportModal } from '../components/ExportModal';
import { FileDown, Cloud, Sparkles, Calculator, Maximize2 } from 'lucide-react';
import { fetchHistoricalWeather, getWeatherIcon, getWeatherLabel } from '../utils/weather';
import { RevenueForecast } from '../components/RevenueForecast';
import { PrimeCostManager } from '../components/PrimeCostManager';
import { BreakEvenGauge } from '../components/BreakEvenGauge';
import { ExecutiveWall } from '../components/ExecutiveWall';
import { EfficiencyBenchmark } from '../components/EfficiencyBenchmark';
import { CostEvolutionChart } from '../components/CostEvolutionChart';
import { WeekdayAverageChart } from '../components/WeekdayAverageChart';
import { DailyReportStrip } from '../components/DailyReportStrip';
import { 
  ScatterChart, 
  Scatter, 
  ZAxis,
  Cell
} from 'recharts';

const TrendBadge = ({ value, isPercentagePoint = false }: { value: number | null, isPercentagePoint?: boolean }) => {
  if (value === null) {
    return (
      <span className="flex items-center text-slate-500 text-sm font-semibold bg-slate-50 px-2 py-1 rounded-lg" title="Période précédente à zéro">
        N/A
      </span>
    );
  }
  
  if (value === 0 || isNaN(value) || !isFinite(value)) {
    return (
      <span className="flex items-center text-slate-500 text-sm font-semibold bg-slate-50 px-2 py-1 rounded-lg">
        Stable
      </span>
    );
  }
  
  const isPositive = value > 0;
  const formattedValue = Math.abs(value).toFixed(1) + (isPercentagePoint ? ' pts' : '%');
  
  return (
    <span className={clsx(
      "flex items-center text-sm font-semibold px-2 py-1 rounded-lg",
      isPositive ? "text-emerald-600 bg-emerald-50" : "text-rose-600 bg-rose-50"
    )}>
      {isPositive ? <TrendingUp size={16} className="mr-1" /> : <TrendingDown size={16} className="mr-1" />}
      {isPositive ? '+' : '-'}{formattedValue}
    </span>
  );
};


export function Dashboard() {
  const { userProfile } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [selectedEst, setSelectedEst] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [prevRevenues, setPrevRevenues] = useState<Revenue[]>([]);
  const [costs, setCosts] = useState<Cost[]>([]);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [weatherData, setWeatherData] = useState<Record<string, { temp: number, code: number }>>({});
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showExecutiveWall, setShowExecutiveWall] = useState(false);
  const [hoveredData, setHoveredData] = useState<any>(null);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const weather = weatherData[data.date];
      
      return (
        <div className="bg-white p-5 border border-slate-200 shadow-2xl rounded-[2rem] min-w-[300px] animate-in fade-in zoom-in duration-200">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                <Calendar size={14} />
              </div>
              <p className="text-xs font-black text-slate-700 uppercase tracking-tight">
                {format(new Date(label), 'EEEE d MMM', { locale: fr })}
              </p>
            </div>
            {weather && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1 rounded-xl">
                {getWeatherIcon(weather.code, 16)}
                <span className="text-[10px] font-black text-slate-700">{Math.round(weather.temp)}°C</span>
              </div>
            )}
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Chiffre d'Affaires</p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900">
                  {data.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                {data.movingAverage && (
                  <p className="text-[10px] font-bold text-indigo-500">
                    Moy. 7j: {data.movingAverage.toLocaleString('fr-FR')} €
                  </p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-50">
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Services</p>
                {data.midi > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Midi</span>
                    <span className="text-[10px] font-black text-amber-600">{data.midi.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
                {data.soir > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Soir</span>
                    <span className="text-[10px] font-black text-indigo-600">{data.soir.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Paiements</p>
                {data.cb > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">CB</span>
                    <span className="text-[10px] font-black text-slate-700">{data.cb.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
                {data.cash > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Espèces</span>
                    <span className="text-[10px] font-black text-slate-700">{data.cash.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
                {data.tr > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">TR</span>
                    <span className="text-[10px] font-black text-slate-700">{data.tr.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
                {data.amex > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500">Amex</span>
                    <span className="text-[10px] font-black text-slate-700">{data.amex.toLocaleString('fr-FR')} €</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const WeatherTick = (props: any) => {
    const { x, y, payload } = props;
    const weather = weatherData[payload.value];
    
    return (
      <g transform={`translate(${x},${y})`}>
        <text
          x={0}
          y={0}
          dy={16}
          textAnchor="middle"
          fill="#94a3b8"
          className="text-[10px] font-bold"
        >
          {format(new Date(payload.value), 'dd MMM', { locale: fr })}
        </text>
        {weather && (
          <>
            <foreignObject x={-10} y={22} width={20} height={20}>
              <div className="flex items-center justify-center text-blue-500 opacity-80">
                {getWeatherIcon(weather.code, 14)}
              </div>
            </foreignObject>
            <text
              x={0}
              y={56}
              textAnchor="middle"
              fill="#64748b"
              className="text-[9px] font-black"
            >
              {Math.round(weather.temp)}°
            </text>
          </>
        )}
      </g>
    );
  };

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!userProfile) return;
      setLoading(true);
      try {
        // Fetch establishments
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

        // Fetch alerts
        const alertsQuery = query(collection(db, 'alerts'), where('userId', '==', userProfile.uid), where('isActive', '==', true));
        const alertsSnap = await getDocs(alertsQuery);
        const alertsData = alertsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AlertRule));
        setAlerts(alertsData);

        // Fetch revenues for the selected date range and previous period
        const daysDiff = differenceInDays(new Date(endDate), new Date(startDate)) + 1;
        const prevEndDate = format(subDays(new Date(startDate), 1), 'yyyy-MM-dd');
        const prevStartDate = format(subDays(new Date(startDate), daysDiff), 'yyyy-MM-dd');
        
        let revData: Revenue[] = [];
        let prevRevData: Revenue[] = [];
        
        if (userProfile.role === 'admin') {
          const revQuery = query(
            collection(db, 'revenues'),
            where('date', '>=', prevStartDate),
            where('date', '<=', endDate)
          );
          const revSnap = await getDocs(revQuery);
          const allData = revSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Revenue));
          
          revData = allData.filter(r => r.date >= startDate && r.date <= endDate);
          prevRevData = allData.filter(r => r.date >= prevStartDate && r.date <= prevEndDate);
        } else {
          const estIds = estData.map(e => e.id);
          if (estIds.length > 0) {
            const promises = estIds
              .filter(id => id !== undefined && id !== null)
              .map(id => 
                getDocs(query(collection(db, 'revenues'), where('establishmentId', '==', id)))
              );
            const snaps = await Promise.all(promises);
            snaps.forEach(snap => {
              snap.docs.forEach(doc => {
                const data = doc.data() as any;
                if (data.date >= prevStartDate && data.date <= endDate) {
                  if (data.date >= startDate) {
                    revData.push({ id: doc.id, ...data });
                  } else {
                    prevRevData.push({ id: doc.id, ...data });
                  }
                }
              });
            });
          }
        }

        // Sort by date ascending
        revData.sort((a, b) => a.date.localeCompare(b.date));
        
        setRevenues(revData);
        setPrevRevenues(prevRevData);

        // Fetch weather data for the current period
        const weatherResponse = await fetchHistoricalWeather(startDate, endDate);
        if (weatherResponse.data) {
          setWeatherData(weatherResponse.data);
        }

        // Fetch costs for the period
        const startMonth = format(parseISO(startDate), 'yyyy-MM');
        const endMonth = format(parseISO(endDate), 'yyyy-MM');
        
        const targetEstId = selectedEst === 'all' ? estData[0]?.id : selectedEst;
        
        if (targetEstId) {
          const costsQuery = query(
            collection(db, 'costs'),
            where('establishmentId', '==', targetEstId),
            where('month', '>=', startMonth),
            where('month', '<=', endMonth)
          );
          
          const costsSnapshot = await getDocs(costsQuery);
          const costsData = costsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Cost));
          setCosts(costsData);
        } else {
          setCosts([]);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revenues');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile, startDate, endDate, selectedEst, selectedService]);

  const filteredRevenues = revenues.filter(r => {
    const matchEst = selectedEst === 'all' || r.establishmentId === selectedEst;
    const matchService = selectedService === 'all' || r.service === selectedService;
    return matchEst && matchService;
  });

  const filteredPrevRevenues = prevRevenues.filter(r => {
    const matchEst = selectedEst === 'all' || r.establishmentId === selectedEst;
    const matchService = selectedService === 'all' || r.service === selectedService;
    return matchEst && matchService;
  });

  // Calculate KPIs
  const totalRevenue = filteredRevenues.reduce((sum, r) => sum + r.total, 0);
  const prevTotalRevenue = filteredPrevRevenues.reduce((sum, r) => sum + r.total, 0);
  
  const revenueChange = prevTotalRevenue > 0 
    ? ((totalRevenue - prevTotalRevenue) / prevTotalRevenue) * 100 
    : (totalRevenue > 0 ? null : 0);
  
  // Group by date for chart
  const groupedData = filteredRevenues.reduce((acc, curr) => {
    const existing = acc.find(item => item.date === curr.date);
    if (existing) {
      existing.total += curr.total;
      if (curr.service === 'midi') existing.midi += curr.total;
      if (curr.service === 'soir') existing.soir += curr.total;
      
      existing.cb += curr.payments.cb + curr.payments.cbContactless;
      existing.cash += curr.payments.cash;
      existing.amex += curr.payments.amex + curr.payments.amexContactless;
      existing.tr += curr.payments.tr + curr.payments.trContactless;
      existing.transfer += curr.payments.transfer;
    } else {
      acc.push({ 
        date: curr.date, 
        total: curr.total,
        midi: curr.service === 'midi' ? curr.total : 0,
        soir: curr.service === 'soir' ? curr.total : 0,
        cb: curr.payments.cb + curr.payments.cbContactless,
        cash: curr.payments.cash,
        amex: curr.payments.amex + curr.payments.amexContactless,
        tr: curr.payments.tr + curr.payments.trContactless,
        transfer: curr.payments.transfer
      });
    }
    return acc;
  }, [] as { date: string, total: number, midi: number, soir: number, cb: number, cash: number, amex: number, tr: number, transfer: number }[]);

  // Sort chart data
  groupedData.sort((a, b) => a.date.localeCompare(b.date));

  // Add 7-day moving average
  const chartData = groupedData.map((d, index, array) => {
    const windowSize = 7;
    const startIdx = Math.max(0, index - windowSize + 1);
    const window = array.slice(startIdx, index + 1);
    const sum = window.reduce((s, curr) => s + curr.total, 0);
    const movingAverage = sum / window.length;
    
    return {
      ...d,
      movingAverage: Math.round(movingAverage)
    };
  });

  // Correlation data for scatter plot
  const correlationData = chartData.map(d => {
    const weather = weatherData[d.date];
    return {
      date: d.date,
      revenue: d.total,
      temp: weather?.temp || 0,
      weatherCode: weather?.code || 0,
      weatherLabel: weather ? getWeatherLabel(weather.code) : 'N/A'
    };
  }).filter(d => d.temp !== 0 || d.weatherCode !== 0);

  // Payment breakdown
  const paymentBreakdown = filteredRevenues.reduce((acc, curr) => {
    acc.cb += curr.payments.cb + curr.payments.cbContactless;
    acc.cash += curr.payments.cash;
    acc.amex += curr.payments.amex + curr.payments.amexContactless;
    acc.tr += curr.payments.tr + curr.payments.trContactless;
    acc.transfer += curr.payments.transfer;
    return acc;
  }, { cb: 0, cash: 0, amex: 0, tr: 0, transfer: 0 });

  const prevPaymentBreakdown = filteredPrevRevenues.reduce((acc, curr) => {
    acc.cb += curr.payments.cb + curr.payments.cbContactless;
    acc.cash += curr.payments.cash;
    acc.amex += curr.payments.amex + curr.payments.amexContactless;
    acc.tr += curr.payments.tr + curr.payments.trContactless;
    acc.transfer += curr.payments.transfer;
    return acc;
  }, { cb: 0, cash: 0, amex: 0, tr: 0, transfer: 0 });

  const totalPayments = (Object.values(paymentBreakdown) as number[]).reduce((a, b) => a + b, 0);
  const prevTotalPayments = (Object.values(prevPaymentBreakdown) as number[]).reduce((a, b) => a + b, 0);

  const cbPercentage = totalPayments > 0 ? (paymentBreakdown.cb / totalPayments) * 100 : 0;
  const prevCbPercentage = prevTotalPayments > 0 ? (prevPaymentBreakdown.cb / prevTotalPayments) * 100 : 0;
  const cbChange = cbPercentage - prevCbPercentage;

  const trPercentage = totalPayments > 0 ? (paymentBreakdown.tr / totalPayments) * 100 : 0;
  const prevTrPercentage = prevTotalPayments > 0 ? (prevPaymentBreakdown.tr / prevTotalPayments) * 100 : 0;
  const trChange = trPercentage - prevTrPercentage;

  const cashPercentage = totalPayments > 0 ? (paymentBreakdown.cash / totalPayments) * 100 : 0;
  const prevCashPercentage = prevTotalPayments > 0 ? (prevPaymentBreakdown.cash / prevTotalPayments) * 100 : 0;
  const cashChange = cashPercentage - prevCashPercentage;

  const uniqueDays = new Set(filteredRevenues.map(r => r.date)).size;
  // Group by establishment for stacked bar chart
  const establishmentBreakdown = establishments.map(est => {
    const estRevenues = revenues.filter(r => r.establishmentId === est.id);
    const midi = estRevenues.filter(r => r.service === 'midi').reduce((sum, r) => sum + r.total, 0);
    const soir = estRevenues.filter(r => r.service === 'soir').reduce((sum, r) => sum + r.total, 0);
    return {
      name: est.name,
      midi,
      soir,
      total: midi + soir
    };
  }).filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total);

  const avgRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;
  const bestDay = chartData.length > 0 
    ? chartData.reduce((max, r) => max.total > r.total ? max : r)
    : null;

  // Calculate total costs for the selected period
  const totalCostsInPeriod = costs.reduce((sum, c) => sum + c.laborCost + c.cogs + (c.otherCosts || 0), 0);
  const periodMonthLabel = costs.length > 0 
    ? costs.length === 1 
      ? format(parseISO(`${costs[0].month}-01`), 'MMMM yyyy', { locale: fr })
      : `${costs.length} mois cumulés`
    : "Coûts non saisis";

  // Evaluate alerts
  const triggeredAlerts = alerts.filter(alert => {
    if (alert.establishmentId !== 'all' && selectedEst !== 'all' && alert.establishmentId !== selectedEst) {
      return false;
    }

    const alertRevenues = alert.establishmentId === 'all' 
      ? filteredRevenues 
      : filteredRevenues.filter(r => r.establishmentId === alert.establishmentId);
    
    const alertPrevRevenues = alert.establishmentId === 'all'
      ? filteredPrevRevenues
      : filteredPrevRevenues.filter(r => r.establishmentId === alert.establishmentId);

    if (alert.type === 'revenue_drop') {
      const alertTotalRevenue = alertRevenues.reduce((sum, r) => sum + r.total, 0);
      return alertTotalRevenue > 0 && alertTotalRevenue < alert.threshold; // Only trigger if there is some revenue but it's below threshold
    } else if (alert.type === 'payment_method_change' && alert.paymentMethod) {
      const getPaymentTotal = (revs: Revenue[]) => revs.reduce((sum, r) => {
        const p = r.payments;
        if (alert.paymentMethod === 'cb') return sum + p.cb + p.cbContactless;
        if (alert.paymentMethod === 'amex') return sum + p.amex + p.amexContactless;
        if (alert.paymentMethod === 'tr') return sum + p.tr + p.trContactless;
        if (alert.paymentMethod === 'cash') return sum + p.cash;
        if (alert.paymentMethod === 'transfer') return sum + p.transfer;
        return sum;
      }, 0);

      const currentTotal = getPaymentTotal(alertRevenues);
      const prevTotal = getPaymentTotal(alertPrevRevenues);
      
      const currentAllPayments = alertRevenues.reduce((sum, r) => sum + r.total, 0);
      const prevAllPayments = alertPrevRevenues.reduce((sum, r) => sum + r.total, 0);

      const currentPct = currentAllPayments > 0 ? (currentTotal / currentAllPayments) * 100 : 0;
      const prevPct = prevAllPayments > 0 ? (prevTotal / prevAllPayments) * 100 : 0;
      
      const change = Math.abs(currentPct - prevPct);
      return prevAllPayments > 0 && change > alert.threshold;
    }
    return false;
  });

  const setQuickRange = (days: number) => {
    setEndDate(format(new Date(), 'yyyy-MM-dd'));
    setStartDate(format(subDays(new Date(), days - 1), 'yyyy-MM-dd'));
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tableau de Bord Global</h1>
          <p className="text-slate-500 text-sm mt-1">Aperçu de vos performances financières</p>
        </div>
        
        <div className="flex flex-col lg:flex-row gap-4 items-end">
          <button
            onClick={() => setShowExecutiveWall(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white border border-slate-200 px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-slate-900/10 transition-all active:scale-95 group"
            title="Activer le mode Executive Wall (TV)"
          >
            <Maximize2 size={20} className="text-white group-hover:scale-110 transition-transform" />
            Executive Wall
          </button>

          <button
            onClick={() => setShowExportModal(true)}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-2.5 rounded-2xl font-bold shadow-sm transition-all active:scale-95"
            title="Exporter le rapport au format PDF"
          >
            <FileDown size={20} className="text-slate-500" />
            Exporter
          </button>

          <button
            onClick={() => window.location.hash = '#/entry'}
            className="w-full lg:w-auto flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl font-bold shadow-lg shadow-blue-600/20 transition-all active:scale-95"
          >
            <Plus size={20} />
            Saisir une recette
          </button>

          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm hover:shadow-md transition-all duration-300 group">
            <Calendar size={18} className="text-blue-500 group-hover:scale-110 transition-transform" />
            <div className="flex items-center gap-2">
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
                className="text-sm font-semibold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
              <span className="text-slate-300 font-bold">/</span>
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
                className="text-sm font-semibold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>
          </div>

          <div className="w-full lg:w-72">
            <SearchableSelect
              options={[
                { id: 'all', name: 'Tous les établissements' },
                ...establishments.map(est => ({ id: est.id, name: est.name }))
              ]}
              value={selectedEst}
              onChange={setSelectedEst}
              placeholder="Établissement"
              icon={<Store size={18} />}
            />
          </div>

          <div className="w-full lg:w-64">
            <SearchableSelect
              options={[
                { id: 'all', name: 'Tous les services' },
                { id: 'midi', name: 'Midi' },
                { id: 'soir', name: 'Soir' }
              ]}
              value={selectedService}
              onChange={setSelectedService}
              placeholder="Service"
              icon={<Clock size={18} />}
            />
          </div>
        </div>
      </div>

      {/* Triggered Alerts */}
      {triggeredAlerts.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="text-rose-600" size={20} />
            <h3 className="font-bold text-rose-900">Alertes déclenchées ({triggeredAlerts.length})</h3>
          </div>
          <div className="space-y-2">
            {triggeredAlerts.map(alert => (
              <div key={alert.id} className="bg-white rounded-xl p-3 border border-rose-100 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{alert.name}</p>
                  <p className="text-sm text-slate-500">
                    {alert.type === 'revenue_drop' 
                      ? `Le chiffre d'affaires est inférieur au seuil de ${alert.threshold} €` 
                      : `L'utilisation du moyen de paiement a varié de plus de ${alert.threshold} %`}
                  </p>
                </div>
                <div className="text-xs font-medium bg-rose-100 text-rose-700 px-2 py-1 rounded-lg">
                  {alert.establishmentId === 'all' ? 'Tous les établissements' : establishments.find(e => e.id === alert.establishmentId)?.name}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6 auto-rows-auto">
        
        {/* Main KPI: Total Revenue */}
        <div id="dashboard-kpis" className="lg:col-span-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Chiffre d'Affaires Total</p>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Banknote size={20} />
                </div>
              </div>
              <p className="text-4xl font-black tracking-tighter text-slate-900">
                {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <div className="mt-6 flex items-center gap-3">
              <TrendBadge value={revenueChange} />
              <p className="text-xs font-medium text-slate-500">vs période précédente</p>
            </div>
          </motion.div>

          {/* Average Revenue */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Moyenne / Jour</p>
              <p className="text-2xl font-black tracking-tight text-slate-900">
                {avgRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
              </p>
            </div>
            <p className="text-xs font-medium text-slate-500 mt-4">Sur {uniqueDays} jours</p>
          </motion.div>

          {/* Best Day */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-1 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group flex flex-col justify-between"
          >
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-4">Record Journée</p>
              <p className="text-2xl font-black tracking-tight text-emerald-600">
                {bestDay?.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) || '-'}
              </p>
            </div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
              {bestDay ? format(new Date(bestDay.date), 'dd MMM yyyy', { locale: fr }) : '-'}
            </p>
          </motion.div>
        </div>

        {/* Cost Evolution Breakdown - Takes more space now */}
        <div id="dashboard-cost-evolution" className="lg:col-span-2 xl:col-span-2">
          <CostEvolutionChart 
            costs={costs}
            establishments={establishments}
            selectedEst={selectedEst}
          />
        </div>

        {/* AI Insights - Tall Card */}
        <div id="dashboard-ai-insights" className="lg:col-span-2 xl:col-span-2 lg:row-span-2">
          <AIInsights 
            revenueData={chartData} 
            paymentData={paymentBreakdown} 
            periodLabel={`Du ${format(new Date(startDate), 'dd MMM yyyy', { locale: fr })} au ${format(new Date(endDate), 'dd MMM yyyy', { locale: fr })}`} 
          />
        </div>

        {/* Main Evolution Chart */}
        <div id="dashboard-charts-evolution" className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Évolution du CA</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Analyse temporelle des performances</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => setQuickRange(7)}
                className={clsx(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all",
                  differenceInDays(new Date(endDate), new Date(startDate)) === 6
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                7J
              </button>
              <button 
                onClick={() => setQuickRange(30)}
                className={clsx(
                  "px-4 py-2 text-xs font-bold rounded-xl transition-all",
                  differenceInDays(new Date(endDate), new Date(startDate)) === 29
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                30J
              </button>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} key={`dashboard-chart-bento`}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  height={70}
                  tick={<WeatherTick />}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 12 }}
                  content={<CustomTooltip />}
                />
                <Bar 
                  dataKey="midi" 
                  stackId="a"
                  fill="#fbbf24" 
                  radius={[0, 0, 0, 0]} 
                  maxBarSize={32}
                  onMouseEnter={(data) => setHoveredData(data)}
                  onMouseLeave={() => setHoveredData(null)}
                />
                <Bar 
                  dataKey="soir" 
                  stackId="a"
                  fill="#6366f1" 
                  radius={[6, 6, 0, 0]} 
                  maxBarSize={32}
                  onMouseEnter={(data) => setHoveredData(data)}
                  onMouseLeave={() => setHoveredData(null)}
                />
                <Line
                  type="monotone"
                  dataKey="movingAverage"
                  stroke="#4f46e5"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 4, fill: '#4f46e5', stroke: '#fff', strokeWidth: 2 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          
          {/* Weather Impact Strip */}
          <div className="mt-8 pt-6 border-t border-slate-50">
            <div className="flex items-center gap-2 mb-4">
              <Cloud size={16} className="text-blue-500" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Contexte Météo</h3>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-2 px-2">
              {chartData.map((d, idx) => {
                const weather = weatherData[d.date];
                const isHovered = hoveredData?.date === d.date;
                return (
                  <motion.div 
                    key={d.date} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={clsx(
                      "flex flex-col items-center min-w-[50px] p-2 rounded-xl transition-all",
                      isHovered ? "bg-blue-50 border border-blue-100 scale-110 z-10 shadow-sm" : "border border-transparent"
                    )}
                  >
                    <span className="text-[9px] font-black text-slate-400 uppercase mb-1.5">
                      {format(new Date(d.date), 'dd MMM', { locale: fr })}
                    </span>
                    {weather ? (
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-blue-600 drop-shadow-sm">
                          {getWeatherIcon(weather.code, 18)}
                        </div>
                        <span className="text-xs font-black text-slate-700">
                          {Math.round(weather.temp)}°
                        </span>
                      </div>
                    ) : (
                      <div className="h-8 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-200 animate-pulse" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Break-even Point Gauge - Relocated and configured for Daily */}
        <div id="dashboard-breakeven" className="lg:col-span-2 xl:col-span-2">
          <BreakEvenGauge 
            currentRevenue={totalRevenue} 
            totalCosts={totalCostsInPeriod} 
            periodLabel={periodMonthLabel}
            daysCount={uniqueDays}
          />
        </div>

        {/* Weekday Performance Average */}
        <div id="dashboard-weekday-average" className="lg:col-span-4 bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <WeekdayAverageChart revenues={filteredRevenues} />
        </div>

        {/* Daily Detailed Report Strip */}
        <div id="dashboard-daily-detailed-report" className="lg:col-span-12">
          <DailyReportStrip chartData={chartData} weatherData={weatherData} />
        </div>

        {/* Weather Correlation Chart */}
        <div id="dashboard-charts-weather" className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">Corrélation Météo</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Impact de la température sur le CA journalier</p>
            </div>
            <div className="bg-slate-50 text-slate-600 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 border border-slate-100 shadow-sm">
              <Cloud size={14} className="text-blue-500" />
              Insights Météorologiques
            </div>
          </div>

          <div className="h-80 w-full relative">
            {correlationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    type="number" 
                    dataKey="temp" 
                    name="Température" 
                    unit="°C" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    domain={['auto', 'auto']}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="revenue" 
                    name="CA" 
                    unit="€" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(value) => `${value}€`}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-4 border border-slate-200 shadow-2xl rounded-2xl min-w-[180px]">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {format(new Date(data.date), 'dd MMMM', { locale: fr })}
                              </span>
                              {getWeatherIcon(data.weatherCode, 16)}
                            </div>
                            <div className="space-y-1">
                              <p className="text-lg font-black text-slate-900">{data.revenue.toLocaleString('fr-FR')} €</p>
                              <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                                <span>{data.temp}°C</span>
                                <span>{data.weatherLabel}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter name="CA vs Temp" data={correlationData}>
                    {correlationData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.temp > 20 ? '#fbbf24' : entry.temp > 10 ? '#3b82f6' : '#6366f1'} 
                        fillOpacity={0.6}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Cloud size={48} className="mb-4 opacity-20" />
                <p className="text-sm font-medium">Données météo en cours de chargement...</p>
              </div>
            )}
            
            {correlationData.length > 0 && (
              <div className="absolute bottom-4 right-4 flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-[10px] font-bold text-slate-400">Chaud (&gt;20°C)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-slate-400">Tempéré</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="text-[10px] font-bold text-slate-400">Frais (&lt;10°C)</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Efficiency Benchmark */}
        <div id="dashboard-efficiency-benchmark" className="lg:col-span-full">
          <EfficiencyBenchmark 
            establishments={establishments} 
            revenues={revenues} 
            periodDays={differenceInDays(parseISO(endDate), parseISO(startDate)) + 1}
          />
        </div>

        {/* AI Revenue Forecast */}
        <div id="dashboard-revenue-forecast" className="lg:col-span-full">
          <RevenueForecast 
            historicalData={chartData}
            establishmentName={selectedEst === 'all' ? 'Tous les établissements' : establishments.find(e => e.id === selectedEst)?.name || 'NordicRevenueS'}
          />
        </div>

        {/* Financial Profitability Management */}
        <div id="dashboard-prime-cost" className="lg:col-span-full">
          <PrimeCostManager 
            establishmentId={selectedEst === 'all' ? (establishments[0]?.id || '') : selectedEst}
            onCostUpdated={() => {
              // Refresh is handled by the useEffect dependency on costs query if needed, 
              // but we can force refresh by updating dashboard data if we want.
              // For now, PrimeCostManager manages its own save state.
            }}
          />
        </div>

        {/* Establishment Breakdown Chart */}
        <div id="dashboard-charts-establishments" className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">CA par Établissement</h2>
              <p className="text-xs text-slate-500 font-medium mt-1">Répartition des revenus par site et service</p>
            </div>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={establishmentBreakdown} 
                layout="vertical"
                margin={{ top: 10, right: 30, left: 40, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  type="number"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                  tickFormatter={(val) => `${(val / 1000).toFixed(1)}k€`}
                />
                <YAxis 
                  dataKey="name" 
                  type="category"
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#475569', fontSize: 12, fontWeight: 700 }}
                  width={100}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc', radius: 12 }}
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} €`, '']}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)' }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" />
                <Bar dataKey="midi" name="Midi" stackId="a" fill="#fbbf24" radius={[0, 0, 0, 0]} barSize={24} />
                <Bar dataKey="soir" name="Soir" stackId="a" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Methods Breakdown */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
          <h2 className="text-lg font-black text-slate-900 mb-8 tracking-tight">Répartition Paiements</h2>
          <div className="space-y-6 flex-1 flex flex-col justify-center">
            {[
              { label: 'Carte Bancaire', value: paymentBreakdown.cb, color: 'bg-blue-600', icon: <CreditCard size={14} /> },
              { label: 'Tickets Resto', value: paymentBreakdown.tr, color: 'bg-amber-500', icon: <Receipt size={14} /> },
              { label: 'Espèces', value: paymentBreakdown.cash, color: 'bg-emerald-500', icon: <Banknote size={14} /> },
              { label: 'AMEX', value: paymentBreakdown.amex, color: 'bg-purple-500', icon: <Landmark size={14} /> },
            ].map((item) => {
              const percentage = totalPayments > 0 ? Math.round((item.value / totalPayments) * 100) : 0;
              return (
                <div key={item.label} className="group">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 group-hover:text-slate-900 transition-colors">{item.icon}</span>
                      <span className="text-slate-600 font-bold tracking-tight">{item.label}</span>
                    </div>
                    <span className="font-black text-slate-900">{percentage}%</span>
                  </div>
                  <div className="w-full h-3 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${percentage}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className={clsx("h-full rounded-full shadow-sm", item.color)} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Small Cards Row */}
        <div className="lg:col-span-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Paiements CB", value: cbPercentage, change: cbChange, icon: <CreditCard size={18} />, color: "text-blue-600", bg: "bg-blue-50" },
            { label: "Tickets Resto", value: trPercentage, change: trChange, icon: <Receipt size={18} />, color: "text-amber-600", bg: "bg-amber-50" },
            { label: "Espèces", value: cashPercentage, change: cashChange, icon: <Banknote size={18} />, color: "text-emerald-600", bg: "bg-emerald-50" },
            { label: "Autres", value: 100 - (cbPercentage + trPercentage + cashPercentage), change: null, icon: <Plus size={18} />, color: "text-slate-600", bg: "bg-slate-50" }
          ].map((card, i) => (
            <div key={card.label} className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center mb-4 shadow-sm", card.bg, card.color)}>
                {card.icon}
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
              <p className="text-xl font-black text-slate-900">{Math.round(card.value)}%</p>
            </div>
          ))}
        </div>

        {/* Staff Leaderboard - Full Width */}
        <div id="dashboard-staff-leaderboard" className="lg:col-span-full">
          <StaffLeaderboard revenues={revenues} />
        </div>

        {/* Performance & Gamification Section */}
        <div className="lg:col-span-full grid grid-cols-1 xl:grid-cols-2 gap-6">
          <EstablishmentLeaderboard revenues={revenues} establishments={establishments} />
          <SuccessBadges revenues={revenues} />
        </div>

      </div>

      {/* Success Badges & More */}
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)} 
        startDate={startDate}
        endDate={endDate}
        establishmentName={selectedEst === 'all' ? 'Tous les établissements' : establishments.find(e => e.id === selectedEst)?.name || 'Établissement'}
      />

      <ExecutiveWall 
        isOpen={showExecutiveWall}
        onClose={() => setShowExecutiveWall(false)}
        totalRevenue={totalRevenue}
        revenueChange={revenueChange}
        avgRevenue={avgRevenue}
        chartData={chartData}
        establishmentName={selectedEst === 'all' ? 'Groupe NordicRevenue' : establishments.find(e => e.id === selectedEst)?.name || ''}
      />

      {/* Footer Legal & Support */}
      <div className="mt-12 border-t border-slate-200 pt-8 pb-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-slate-500">
        <div className="flex items-center gap-6">
          <button onClick={() => setShowHelpModal(true)} className="hover:text-slate-900 transition-colors flex items-center gap-2">
            <HelpCircle size={16} />
            Aide & Support
          </button>
          <button onClick={() => setShowPrivacyModal(true)} className="hover:text-slate-900 transition-colors flex items-center gap-2">
            <Shield size={16} />
            Confidentialité (RGPD)
          </button>
        </div>
        <p>© {new Date().getFullYear()} NordicRevenueS. Tous droits réservés.</p>
      </div>

      {/* Help & Support Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HelpCircle className="text-blue-600" />
                Aide & Support
              </h2>
              <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-slate-600">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Besoin d'assistance ?</h3>
                <p>Notre équipe de support est disponible pour vous aider avec l'utilisation de NordicRevenueS.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <h4 className="font-semibold text-blue-900 mb-1">Contact Email</h4>
                  <p className="text-sm text-blue-700">support@nordicrevenues.fr</p>
                  <p className="text-xs text-blue-600 mt-2">Réponse sous 24h ouvrées</p>
                </div>
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                  <h4 className="font-semibold text-emerald-900 mb-1">Assistance Téléphonique</h4>
                  <p className="text-sm text-emerald-700">+33 (0)1 23 45 67 89</p>
                  <p className="text-xs text-emerald-600 mt-2">Du lundi au vendredi, 9h-18h</p>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">FAQ</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-slate-900">Comment exporter mes données ?</h4>
                    <p className="text-sm mt-1">Rendez-vous dans la section "Rapports" et utilisez les boutons d'export (PDF, CSV) en haut de la page.</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-900">Comment ajouter un nouvel établissement ?</h4>
                    <p className="text-sm mt-1">Seuls les administrateurs peuvent ajouter des établissements depuis la section "Établissements".</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowHelpModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy (RGPD) Modal */}
      {showPrivacyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Shield className="text-emerald-600" />
                Politique de Confidentialité (RGPD)
              </h2>
              <button onClick={() => setShowPrivacyModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6 text-slate-600 text-sm">
              <p>
                Conformément au Règlement Général sur la Protection des Données (RGPD) de l'Union Européenne et à la loi Informatique et Libertés en France, NordicRevenueS s'engage à protéger vos données personnelles.
              </p>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">1. Collecte des données</h3>
                <p>Nous collectons uniquement les données strictement nécessaires au fonctionnement de l'application : adresse email, nom, prénom, et données financières liées à vos établissements. Ces données sont stockées de manière sécurisée.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">2. Utilisation des données</h3>
                <p>Vos données sont utilisées exclusivement pour :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li>L'authentification et la gestion des accès à l'application.</li>
                  <li>Le calcul et l'affichage des statistiques financières de vos établissements.</li>
                  <li>L'envoi d'alertes configurées par vos soins.</li>
                </ul>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">3. Vos droits (Loi Française & Européenne)</h3>
                <p>Conformément à la réglementation en vigueur, vous disposez des droits suivants :</p>
                <ul className="list-disc pl-5 mt-2 space-y-1">
                  <li><strong>Droit d'accès :</strong> Vous pouvez demander à consulter les données que nous possédons sur vous.</li>
                  <li><strong>Droit de rectification :</strong> Vous pouvez demander la modification de données inexactes.</li>
                  <li><strong>Droit à l'effacement (droit à l'oubli) :</strong> Vous pouvez demander la suppression de vos données.</li>
                  <li><strong>Droit à la portabilité :</strong> Vous pouvez récupérer vos données dans un format structuré.</li>
                </ul>
                <p className="mt-2">Pour exercer ces droits, veuillez contacter notre Délégué à la Protection des Données (DPO) à l'adresse : <a href="mailto:dpo@nordicrevenues.fr" className="text-blue-600 hover:underline">dpo@nordicrevenues.fr</a>.</p>
              </div>

              <div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">4. Sécurité et Hébergement</h3>
                <p>Vos données sont hébergées sur des serveurs sécurisés situés au sein de l'Union Européenne (Google Cloud Platform / Firebase), garantissant un niveau de sécurité conforme aux exigences européennes.</p>
              </div>
            </div>
            <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setShowPrivacyModal(false)}
                className="px-6 py-2 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors"
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
