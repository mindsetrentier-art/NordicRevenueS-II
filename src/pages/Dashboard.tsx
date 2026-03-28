import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Revenue, Establishment, AlertRule } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { 
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
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { format, subDays, isSameDay, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import clsx from 'clsx';
import { AIInsights } from '../components/AIInsights';

const TrendBadge = ({ value, isPercentagePoint = false }: { value: number, isPercentagePoint?: boolean }) => {
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
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(true);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

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
            const promises = estIds.map(id => 
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
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revenues');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userProfile, startDate, endDate]);

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
    : (totalRevenue > 0 ? 100 : 0);
  
  // Group by date for chart
  const chartData = filteredRevenues.reduce((acc, curr) => {
    const existing = acc.find(item => item.date === curr.date);
    if (existing) {
      existing.total += curr.total;
    } else {
      acc.push({ date: curr.date, total: curr.total });
    }
    return acc;
  }, [] as { date: string, total: number }[]);

  // Sort chart data
  chartData.sort((a, b) => a.date.localeCompare(b.date));

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
  const avgRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;
  const bestDay = chartData.length > 0 
    ? chartData.reduce((max, r) => max.total > r.total ? max : r)
    : null;

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
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm">
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
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Store size={16} className="text-slate-400" />
            </div>
            <select
              value={selectedEst}
              onChange={(e) => setSelectedEst(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl pl-10 pr-10 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow appearance-none"
            >
              <option value="all">Tous les établissements</option>
              {establishments.map(est => (
                <option key={est.id} value={est.id}>{est.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-slate-400" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Clock size={16} className="text-slate-400" />
            </div>
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 rounded-xl pl-10 pr-10 py-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow appearance-none"
            >
              <option value="all">Tous les services</option>
              <option value="midi">Midi</option>
              <option value="soir">Soir</option>
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <ChevronDown size={16} className="text-slate-400" />
            </div>
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
            {bestDay ? bestDay.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' }) : '0,00 €'}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            {bestDay ? format(new Date(bestDay.date), 'dd MMMM yyyy', { locale: fr }) : '-'}
          </p>
        </div>
      </div>

      {/* Payment Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
              <Banknote size={20} />
            </div>
            <TrendBadge value={revenueChange} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Chiffre d'Affaires</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <CreditCard size={20} />
            </div>
            <TrendBadge value={cbChange} isPercentagePoint={true} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Paiements CB</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {Math.round(cbPercentage)}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-amber-50 text-amber-600 p-2 rounded-xl">
              <Receipt size={20} />
            </div>
            <TrendBadge value={trChange} isPercentagePoint={true} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Tickets Resto</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {Math.round(trPercentage)}%
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-50 text-purple-600 p-2 rounded-xl">
              <Banknote size={20} />
            </div>
            <TrendBadge value={cashChange} isPercentagePoint={true} />
          </div>
          <p className="text-slate-500 text-sm font-medium">Espèces</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">
            {Math.round(cashPercentage)}%
          </p>
        </div>
      </div>

      <AIInsights 
        revenueData={chartData} 
        paymentData={paymentBreakdown} 
        periodLabel={`Du ${format(new Date(startDate), 'dd MMM yyyy', { locale: fr })} au ${format(new Date(endDate), 'dd MMM yyyy', { locale: fr })}`} 
      />

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-slate-900">Évolution du CA</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => setQuickRange(7)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  differenceInDays(new Date(endDate), new Date(startDate)) === 6
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Semaine
              </button>
              <button 
                onClick={() => setQuickRange(30)}
                className={clsx(
                  "px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors",
                  differenceInDays(new Date(endDate), new Date(startDate)) === 29
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Mois
              </button>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => format(new Date(val), 'dd MMM', { locale: fr })}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} €`, 'CA']}
                  labelFormatter={(label) => format(new Date(label), 'dd MMMM yyyy', { locale: fr })}
                />
                <Bar dataKey="total" fill="#2563eb" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Moyens de Paiement</h2>
          <div className="space-y-6">
            {[
              { label: 'Carte Bancaire', value: paymentBreakdown.cb, color: 'bg-blue-600' },
              { label: 'Tickets Resto', value: paymentBreakdown.tr, color: 'bg-amber-500' },
              { label: 'Espèces', value: paymentBreakdown.cash, color: 'bg-emerald-500' },
              { label: 'AMEX', value: paymentBreakdown.amex, color: 'bg-purple-500' },
              { label: 'Virement', value: paymentBreakdown.transfer, color: 'bg-slate-400' },
            ].map((item, index) => {
              const percentage = totalPayments > 0 ? Math.round((item.value / totalPayments) * 100) : 0;
              return (
                <div key={index}>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-slate-600 font-medium">{item.label}</span>
                    <span className="font-bold text-slate-900">{percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={clsx("h-full rounded-full", item.color)} style={{ width: `${percentage}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

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
