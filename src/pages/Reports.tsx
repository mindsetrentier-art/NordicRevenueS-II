import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Establishment, Revenue, AlertRule } from '../types';
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
  Cell,
  Sector
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isWithinInterval, parseISO, subYears, startOfYear, endOfYear, eachDayOfInterval, differenceInDays, eachMonthOfInterval, differenceInMonths, subMonths } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Download, Mail, Share2, Calendar as CalendarIcon, Filter, Store, TrendingUp, TrendingDown, Minus, Search, FileSpreadsheet, Columns, ArrowUpRight, ArrowDownRight, X, FileText, Loader2, CheckCircle2, AlertCircle, Layout, Palette, ChevronDown, Save, Sparkles, ArrowUpDown, AlertTriangle, Clock } from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { Logo } from '../components/Logo';
import { SearchableSelect } from '../components/SearchableSelect';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import { utils, writeFile } from 'xlsx';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const { cx, cy, midAngle, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent, value } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={fill} className="font-bold text-lg">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} textAnchor={textAnchor} fill="#333" className="font-medium">{`${value.toFixed(2)} €`}</text>
      <text x={ex + (cos >= 0 ? 1 : -1) * 12} y={ey} dy={18} textAnchor={textAnchor} fill="#999" className="text-xs">
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

const CustomLineTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const triggeredAlerts = payload[0]?.payload?.triggeredAlerts || [];
    
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[200px]">
        <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2">{label}</p>
        
        {triggeredAlerts.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-[10px] font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1">
              <AlertTriangle size={10} /> Alertes déclenchées
            </p>
            {triggeredAlerts.map((alert: any) => (
              <div key={alert.id} className="bg-rose-50 border border-rose-100 rounded-lg p-2">
                <p className="text-xs font-bold text-rose-900">{alert.name}</p>
                <p className="text-[10px] text-rose-700">
                  {alert.type === 'revenue_drop' 
                    ? `CA < ${alert.threshold} €` 
                    : `Variation ${alert.paymentMethod} > ${alert.threshold} %`}
                </p>
              </div>
            ))}
          </div>
        )}

        {payload.map((entry: any, index: number) => {
          const isNoEntry = entry.name === 'Période Actuelle' ? entry.payload.hasEntries === false : entry.payload.compHasEntries === false;
          
          return (
            <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-sm mt-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-600 font-medium">{entry.name}</span>
              </div>
              <span className={`font-bold ${isNoEntry ? 'text-slate-400 italic' : 'text-slate-900'}`}>
                {isNoEntry ? 'Aucune saisie' : `${Number(entry.value).toFixed(2)} €`}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
    return (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-slate-100 min-w-[220px]">
        <p className="font-bold text-slate-800 mb-3 border-b border-slate-100 pb-2 flex justify-between items-center">
          <span>{label}</span>
          <span className="text-blue-600 text-xs font-black px-2 py-0.5 bg-blue-50 rounded-full">{total.toFixed(2)} €</span>
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => {
            if (!entry.value) return null;
            const percentage = ((entry.value / total) * 100).toFixed(1);
            return (
              <div key={`item-${index}`} className="flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-600 font-medium">{entry.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[10px]">{percentage}%</span>
                  <span className="font-bold text-slate-900">
                    {Number(entry.value).toFixed(2)} €
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  return null;
};

export function Reports() {
  const { userProfile } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEst, setSelectedEst] = useState<string>('all');
  const [selectedService, setSelectedService] = useState<string>('all');
  const [period, setPeriod] = useState<Period>('daily');
  const [showDetailedTable, setShowDetailedTable] = useState(false);
  const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [compareMode, setCompareMode] = useState<'none' | 'previous_period' | 'previous_year'>('none');
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [compRevenues, setCompRevenues] = useState<Revenue[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isExportingData, setIsExportingData] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [activePieIndex, setActivePieIndex] = useState<number>(0);
  const [isEstDropdownOpen, setIsEstDropdownOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('reportsVisibleColumns');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Force cbContactless to be true since we just added it and there is no UI to toggle it yet.
        return { ...parsed, cbContactless: true };
      } catch (e) {}
    }
    return {
      cb: true,
      cbContactless: true,
      amex: true,
      amexContactless: false,
      tr: true,
      trContactless: false,
      cash: true,
      transfer: true
    };
  });
  const [visibleChartPayments, setVisibleChartPayments] = useState({
    cb: true,
    cbContactless: true,
    amex: true,
    amexContactless: true,
    tr: true,
    trContactless: true,
    cash: true,
    transfer: true
  });
  const [paymentColors, setPaymentColors] = useState(() => {
    const saved = localStorage.getItem('reportsPaymentColors');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return {
      cb: '#3b82f6',
      cbContactless: '#60a5fa',
      amex: '#f59e0b',
      amexContactless: '#fbbf24',
      tr: '#10b981',
      trContactless: '#34d399',
      cash: '#8b5cf6',
      transfer: '#64748b'
    };
  });

  useEffect(() => {
    localStorage.setItem('reportsPaymentColors', JSON.stringify(paymentColors));
  }, [paymentColors]);
  const [showChartPaymentSelector, setShowChartPaymentSelector] = useState(false);
  const [exportOptions, setExportOptions] = useState({
    comparison: true,
    kpis: true,
    mainChart: true,
    paymentChart: true,
    trendsChart: true,
    dailyTable: true,
    aiAnalysis: false,
    reportName: `Rapport de Recettes - ${format(new Date(), 'dd/MM/yyyy')}`,
    orientation: 'portrait' as 'portrait' | 'landscape',
    theme: 'corporate' as 'corporate' | 'minimal' | 'bold'
  });
  const [aiAnalysisContent, setAiAnalysisContent] = useState<string | null>(null);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);

  // Reset AI analysis when filters change
  useEffect(() => {
    setAiAnalysisContent(null);
    if (exportOptions.aiAnalysis) {
      setExportOptions(prev => ({ ...prev, aiAnalysis: false }));
    }
  }, [startDate, endDate, selectedEst]);
  const [comparisons, setComparisons] = useState({
    today: { current: 0, previous: 0, percent: 0 },
    thisMonth: { current: 0, previous: 0, percent: 0 },
    thisYear: { current: 0, previous: 0, percent: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [sortBy, setSortBy] = useState<'date' | 'total' | 'establishment'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    localStorage.setItem('reportsVisibleColumns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Reset selected establishment when searching globally
  useEffect(() => {
    if (searchQuery && selectedEst !== 'all') {
      setSelectedEst('all');
    }
  }, [searchQuery]);

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
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des établissements';
        setError(errorMessage);
        handleFirestoreError(error, OperationType.LIST, 'establishments');
      }
    };

    fetchEstablishments();
  }, [userProfile]);

  useEffect(() => {
    const fetchAlerts = async () => {
      if (!userProfile) return;
      try {
        const alertsQuery = query(collection(db, 'alerts'), where('userId', '==', userProfile.uid), where('isActive', '==', true));
        const alertsSnap = await getDocs(alertsQuery);
        const alertsData = alertsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AlertRule));
        setAlerts(alertsData);
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des alertes';
        setError(errorMessage);
        handleFirestoreError(error, OperationType.LIST, 'alerts');
      }
    };

    fetchAlerts();
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
          const estIds = establishments.map(e => e.id).filter(id => id !== undefined && id !== null);
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
        setError(null);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Erreur lors du chargement des revenus';
        setError(errorMessage);
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
    setPeriod('daily');
  };

  const setThisMonth = () => {
    setStartDate(format(startOfMonth(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfMonth(new Date()), 'yyyy-MM-dd'));
    setPeriod('daily');
  };

  const setThisYear = () => {
    setStartDate(format(startOfYear(new Date()), 'yyyy-MM-dd'));
    setEndDate(format(endOfYear(new Date()), 'yyyy-MM-dd'));
    setPeriod('monthly');
  };

  const generatePDF = async () => {
    setIsGeneratingPDF(true);
    const reportElement = document.getElementById('pdf-export-content');
    if (!reportElement) {
      setIsGeneratingPDF(false);
      return;
    }

    // Adjust width based on orientation for better capture
    const originalWidth = reportElement.style.width;
    const originalPadding = reportElement.style.padding;
    
    if (exportOptions.orientation === 'landscape') {
      reportElement.style.width = '1120px'; // A4 Landscape ratio-ish
    } else {
      reportElement.style.width = '794px'; // A4 Portrait ratio-ish
    }
    reportElement.style.padding = '40px';

    const sectionsToCapture = [
      { id: 'report-header', condition: true, display: 'block', forceNewPage: false },
      { id: 'report-comparison', condition: exportOptions.comparison, display: 'block', forceNewPage: false },
      { id: 'report-kpis', condition: exportOptions.kpis, display: 'grid', forceNewPage: false },
      { id: 'report-ai-analysis', condition: exportOptions.aiAnalysis, display: 'block', forceNewPage: true },
      { id: 'report-main-chart', condition: exportOptions.mainChart, display: 'block', forceNewPage: true },
      { id: 'report-payment-section', condition: exportOptions.paymentChart, display: 'grid', forceNewPage: true },
      { id: 'report-trends-section', condition: exportOptions.trendsChart, display: 'grid', forceNewPage: true },
      { id: 'report-daily-table', condition: exportOptions.dailyTable, display: 'block', forceNewPage: true },
      { id: 'report-footer', condition: true, display: 'flex', forceNewPage: false },
    ];

    try {
      const orientation = exportOptions.orientation === 'portrait' ? 'p' : 'l';
      const pdf = new jsPDF(orientation, 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeightLimit = pdf.internal.pageSize.getHeight();
      const margin = 10; // 10mm margin
      const contentWidth = pdfWidth - margin * 2;
      
      let currentY = margin;
      let isFirstPage = true;

      for (const section of sectionsToCapture) {
        if (!section.condition) continue;
        const el = document.getElementById(section.id);
        if (!el) continue;

        const originalDisplay = el.style.display;
        el.style.display = section.display;

        // Give the browser a tiny moment to apply the display style and resize charts
        await new Promise(resolve => setTimeout(resolve, 50));

        const imgData = await toPng(el, { 
          backgroundColor: exportOptions.theme === 'minimal' ? '#ffffff' : '#f8fafc',
          pixelRatio: 2,
          cacheBust: true,
        });

        el.style.display = originalDisplay;

        const img = new Image();
        img.src = imgData;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
        });

        const imgHeight = (img.height * contentWidth) / img.width;

        // Force new page if requested, or if it doesn't fit
        if ((section.forceNewPage || currentY + imgHeight > pdfHeightLimit - margin) && !isFirstPage) {
          pdf.addPage();
          currentY = margin;
        }

        // If the image itself is taller than a page, we might need to split it, 
        // but since we are capturing sections, they should generally fit on a page.
        // For the daily table, it might be very long.
        if (imgHeight > pdfHeightLimit - margin * 2) {
           let heightLeft = imgHeight;
           let position = currentY;
           
           pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
           heightLeft -= (pdfHeightLimit - currentY - margin);
           
           while (heightLeft > 0) {
             position -= (pdfHeightLimit - margin * 2); // Shift up by one page height
             pdf.addPage();
             pdf.addImage(imgData, 'PNG', margin, margin + position, contentWidth, imgHeight);
             heightLeft -= (pdfHeightLimit - margin * 2);
           }
           currentY = pdfHeightLimit - margin; // Force new page for next item
        } else {
          pdf.addImage(imgData, 'PNG', margin, currentY, contentWidth, imgHeight);
          currentY += imgHeight + 10; // Add 10mm spacing between sections
        }
        
        isFirstPage = false;
      }
      
      const fileName = exportOptions.reportName.replace(/[/\\?%*:|"<>]/g, '-') || `rapport-recettes-${format(new Date(), 'yyyy-MM-dd')}`;
      pdf.save(`${fileName}.pdf`);
      
      setExportSuccess(true);
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      // Restore original styles
      if (reportElement) {
        reportElement.style.width = originalWidth;
        reportElement.style.padding = originalPadding;
      }
      
      setIsGeneratingPDF(false);
    }
  };

  const exportChartAsImage = async () => {
    const chartElement = document.getElementById('payment-chart-container');
    if (!chartElement) return;

    try {
      const imgData = await toPng(chartElement, { 
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        cacheBust: true,
      });
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

  const exportJSON = () => {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        exportedBy: userProfile?.email || 'Utilisateur',
        filters: {
          establishment: selectedEst,
          service: selectedService,
          startDate,
          endDate,
          period
        }
      },
      revenues: filteredRevenues,
      establishments: establishments.filter(e => selectedEst === 'all' || e.id === selectedEst)
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-revenus-${format(new Date(), 'yyyy-MM-dd')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    setIsExportingData(true);
    setTimeout(() => {
      const headers = [
        'Période',
        'Date',
        'Établissement',
        'Service',
        'Total (€)',
        'CB (€)',
        'CB Sans Contact (€)',
        'AMEX (€)',
        'AMEX Sans Contact (€)',
        'TR (€)',
        'TR Sans Contact (€)',
        'Espèces (€)',
        'Virement (€)',
        'Notes'
      ];

      const escape = (val: any) => {
        if (val === null || val === undefined) return '';
        const s = String(val);
        if (s.includes(',') || s.includes('"') || s.includes('\n')) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      };
      
      const generateRows = (data: Revenue[], periodLabel: string) => {
        return data.map(rev => {
          const est = establishments.find(e => e.id === rev.establishmentId);
          const estName = est ? est.name : 'Inconnu';
          
          return [
            periodLabel,
            rev.date,
            estName,
            rev.service === 'midi' ? 'Midi' : rev.service === 'soir' ? 'Soir' : '-',
            rev.total.toFixed(2),
            rev.payments.cb.toFixed(2),
            rev.payments.cbContactless.toFixed(2),
            rev.payments.amex.toFixed(2),
            rev.payments.amexContactless.toFixed(2),
            rev.payments.tr.toFixed(2),
            rev.payments.trContactless.toFixed(2),
            rev.payments.cash.toFixed(2),
            rev.payments.transfer.toFixed(2),
            rev.notes || ''
          ].map(escape).join(',');
        });
      };

      let rows = generateRows(filteredRevenues, 'Actuelle');
      
      if (compareMode !== 'none') {
        rows = rows.concat(generateRows(filteredCompRevenues, 'Comparaison'));
      }

      // Add Metadata Header
      const metadataHeader = [
        `"Rapport de Recettes"`,
        `"Généré le: ${format(new Date(), 'dd/MM/yyyy HH:mm')}"`,
        `"Utilisateur: ${userProfile?.email || 'Inconnu'}"`,
        `"Période: ${startDate} au ${endDate}"`,
        `""` // Empty line
      ].join('\n');

      // Add BOM for Excel UTF-8 compatibility
      const csvContent = '\uFEFF' + metadataHeader + '\n' + [headers.join(','), ...rows].join('\n');
      const filename = selectedEst === 'all' 
        ? `export-revenus-tous-etablissements-${format(new Date(), 'yyyy-MM-dd')}.csv`
        : `export-revenus-${establishments.find(e => e.id === selectedEst)?.name.replace(/\s+/g, '-').toLowerCase() || 'etablissement'}-${format(new Date(), 'yyyy-MM-dd')}.csv`;

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
      setIsExportingData(false);
      setExportSuccess(true);
      setShowSaveModal(false);
    }, 800);
  };

  const exportExcel = () => {
    setIsExportingData(true);
    setTimeout(() => {
      const generateData = (data: Revenue[], periodLabel: string) => {
        return data.map(rev => {
          const est = establishments.find(e => e.id === rev.establishmentId);
          const estName = est ? est.name : 'Inconnu';
          
          return {
            'Période': periodLabel,
            'Date': rev.date,
            'Établissement': estName,
            'Service': rev.service === 'midi' ? 'Midi' : rev.service === 'soir' ? 'Soir' : '-',
            'Total (€)': rev.total,
            'CB (€)': rev.payments.cb,
            'CB Sans Contact (€)': rev.payments.cbContactless,
            'AMEX (€)': rev.payments.amex,
            'AMEX Sans Contact (€)': rev.payments.amexContactless,
            'TR (€)': rev.payments.tr,
            'TR Sans Contact (€)': rev.payments.trContactless,
            'Espèces (€)': rev.payments.cash,
            'Virement (€)': rev.payments.transfer,
            'Notes': rev.notes || ''
          };
        });
      };

      let rows = generateData(filteredRevenues, 'Actuelle');
      if (compareMode !== 'none') {
        rows = rows.concat(generateData(filteredCompRevenues, 'Comparaison'));
      }

      const worksheet = utils.json_to_sheet(rows);
      const workbook = utils.book_new();
      utils.book_append_sheet(workbook, worksheet, "Revenus");
      
      const filename = selectedEst === 'all' 
        ? `export-revenus-tous-etablissements-${format(new Date(), 'yyyy-MM-dd')}.xlsx`
        : `export-revenus-${establishments.find(e => e.id === selectedEst)?.name.replace(/\s+/g, '-').toLowerCase() || 'etablissement'}-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;

      writeFile(workbook, filename);
      
      setIsExportingData(false);
      setExportSuccess(true);
      setShowSaveModal(false);
    }, 800);
  };

  // Prepare data for charts
  let timeIntervals: Date[] = [];
  try {
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start <= end) {
      timeIntervals = period === 'monthly' 
        ? eachMonthOfInterval({ start, end })
        : eachDayOfInterval({ start, end });
    }
  } catch (e) {
    console.error("Invalid date interval", e);
  }

  const chartData = timeIntervals.map((intervalDate, index) => {
    let currentPeriodRevs;
    let displayDate;
    let dateStr;
    
    if (period === 'monthly') {
      dateStr = format(intervalDate, 'yyyy-MM');
      displayDate = format(intervalDate, 'MMM yyyy', { locale: fr });
      currentPeriodRevs = filteredRevenues.filter(r => r.date.startsWith(dateStr));
    } else {
      dateStr = format(intervalDate, 'yyyy-MM-dd');
      displayDate = format(intervalDate, 'dd MMM', { locale: fr });
      currentPeriodRevs = filteredRevenues.filter(r => r.date === dateStr);
    }
    
    const hasEntries = currentPeriodRevs.length > 0;
    const total = currentPeriodRevs.reduce((sum, r) => sum + r.total, 0);
    const cb = currentPeriodRevs.reduce((sum, r) => sum + r.payments.cb, 0);
    const cbContactless = currentPeriodRevs.reduce((sum, r) => sum + r.payments.cbContactless, 0);
    const cash = currentPeriodRevs.reduce((sum, r) => sum + r.payments.cash, 0);
    const tr = currentPeriodRevs.reduce((sum, r) => sum + r.payments.tr, 0);
    const trContactless = currentPeriodRevs.reduce((sum, r) => sum + r.payments.trContactless, 0);
    const amex = currentPeriodRevs.reduce((sum, r) => sum + r.payments.amex, 0);
    const amexContactless = currentPeriodRevs.reduce((sum, r) => sum + r.payments.amexContactless, 0);
    const transfer = currentPeriodRevs.reduce((sum, r) => sum + r.payments.transfer, 0);

    let compPeriodRevs: Revenue[] = [];
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
      if (compareMode === 'previous_period') {
        if (period === 'monthly') {
           const monthsDiff = differenceInMonths(parseISO(endDate), parseISO(startDate));
           const compEndDate = subMonths(parseISO(startDate), 1);
           const compStartDate = subMonths(compEndDate, monthsDiff);
           const compMonths = eachMonthOfInterval({ start: compStartDate, end: compEndDate });
           if (compMonths[index]) {
             const compMonthStr = format(compMonths[index], 'yyyy-MM');
             compPeriodRevs = filteredCompRevenues.filter(r => r.date.startsWith(compMonthStr));
           }
        } else {
           const daysDiff = differenceInDays(parseISO(endDate), parseISO(startDate));
           const compEndDate = subDays(parseISO(startDate), 1);
           const compStartDate = subDays(compEndDate, daysDiff);
           const compDays = eachDayOfInterval({ start: compStartDate, end: compEndDate });
           if (compDays[index]) {
             const compDateStr = format(compDays[index], 'yyyy-MM-dd');
             compPeriodRevs = filteredCompRevenues.filter(r => r.date === compDateStr);
           }
        }
      } else if (compareMode === 'previous_year') {
        if (period === 'monthly') {
          const compMonthStr = format(subYears(intervalDate, 1), 'yyyy-MM');
          compPeriodRevs = filteredCompRevenues.filter(r => r.date.startsWith(compMonthStr));
        } else {
          const compDateStr = format(subYears(intervalDate, 1), 'yyyy-MM-dd');
          compPeriodRevs = filteredCompRevenues.filter(r => r.date === compDateStr);
        }
      }
      
      compHasEntries = compPeriodRevs.length > 0;
      compTotal = compPeriodRevs.reduce((sum, r) => sum + r.total, 0);
      compCb = compPeriodRevs.reduce((sum, r) => sum + r.payments.cb, 0);
      compCbContactless = compPeriodRevs.reduce((sum, r) => sum + r.payments.cbContactless, 0);
      compCash = compPeriodRevs.reduce((sum, r) => sum + r.payments.cash, 0);
      compTr = compPeriodRevs.reduce((sum, r) => sum + r.payments.tr, 0);
      compTrContactless = compPeriodRevs.reduce((sum, r) => sum + r.payments.trContactless, 0);
      compAmex = compPeriodRevs.reduce((sum, r) => sum + r.payments.amex, 0);
      compAmexContactless = compPeriodRevs.reduce((sum, r) => sum + r.payments.amexContactless, 0);
      compTransfer = compPeriodRevs.reduce((sum, r) => sum + r.payments.transfer, 0);
    }

    // Evaluate alerts for this day/month
    const triggeredAlerts = alerts.filter(alert => {
      if (alert.establishmentId !== 'all' && selectedEst !== 'all' && alert.establishmentId !== selectedEst) {
        return false;
      }

      const alertRevenues = alert.establishmentId === 'all' 
        ? currentPeriodRevs 
        : currentPeriodRevs.filter(r => r.establishmentId === alert.establishmentId);
      
      if (alert.type === 'revenue_drop') {
        const alertTotalRevenue = alertRevenues.reduce((sum, r) => sum + r.total, 0);
        return alertTotalRevenue > 0 && alertTotalRevenue < alert.threshold;
      } else if (alert.type === 'payment_method_change' && alert.paymentMethod) {
        if (!compHasEntries) return false;
        
        const alertCompRevenues = alert.establishmentId === 'all'
          ? compPeriodRevs
          : compPeriodRevs.filter(r => r.establishmentId === alert.establishmentId);

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
        const prevTotal = getPaymentTotal(alertCompRevenues);
        
        const currentAllPayments = alertRevenues.reduce((sum, r) => sum + r.total, 0);
        const prevAllPayments = alertCompRevenues.reduce((sum, r) => sum + r.total, 0);

        const currentPct = currentAllPayments > 0 ? (currentTotal / currentAllPayments) * 100 : 0;
        const prevPct = prevAllPayments > 0 ? (prevTotal / prevAllPayments) * 100 : 0;
        
        const change = Math.abs(currentPct - prevPct);
        return prevAllPayments > 0 && change > alert.threshold;
      }
      return false;
    });

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
      compTransfer,
      triggeredAlerts
    };
  });

  // Calculate moving average for total revenue (7-day trend)
  const chartDataWithTrends = chartData.map((d, i, arr) => {
    const windowSize = 7;
    const start = Math.max(0, i - windowSize + 1);
    const window = arr.slice(start, i + 1);
    const avg = window.reduce((sum, item) => sum + item.total, 0) / window.length;
    return { ...d, movingAvg: avg };
  });

  // Calculate average revenue by day of week
  const dayOfWeekNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
  const dayOfWeekData = [
    { day: 'Lun', total: 0, count: 0, index: 1 },
    { day: 'Mar', total: 0, count: 0, index: 2 },
    { day: 'Mer', total: 0, count: 0, index: 3 },
    { day: 'Jeu', total: 0, count: 0, index: 4 },
    { day: 'Ven', total: 0, count: 0, index: 5 },
    { day: 'Sam', total: 0, count: 0, index: 6 },
    { day: 'Dim', total: 0, count: 0, index: 0 },
  ];

  filteredRevenues.forEach(rev => {
    const date = parseISO(rev.date);
    if (!isNaN(date.getTime())) {
      const dayIdx = date.getDay();
      const target = dayOfWeekData.find(d => d.index === dayIdx);
      if (target) {
        target.total += rev.total;
        target.count += 1;
      }
    }
  });

  const avgDayOfWeekData = dayOfWeekData.map(d => ({
    day: d.day,
    avg: d.count > 0 ? d.total / d.count : 0
  }));

  const sortedRevenues = [...filteredRevenues].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      comparison = a.date.localeCompare(b.date);
    } else if (sortBy === 'total') {
      comparison = a.total - b.total;
    } else if (sortBy === 'establishment') {
      const estA = establishments.find(e => e.id === a.establishmentId)?.name || '';
      const estB = establishments.find(e => e.id === b.establishmentId)?.name || '';
      comparison = estA.localeCompare(estB);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const sortedChartData = [...chartData].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') {
      // Use fullDate for accurate sorting if available
      const dateA = a.fullDate || a.date;
      const dateB = b.fullDate || b.date;
      comparison = dateA.localeCompare(dateB);
    } else if (sortBy === 'total') {
      comparison = a.total - b.total;
    } else if (sortBy === 'establishment') {
      // Sorting by establishment doesn't make sense for aggregated chartData
      // Default to date
      const dateA = a.fullDate || a.date;
      const dateB = b.fullDate || b.date;
      comparison = dateA.localeCompare(dateB);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
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
    { id: 'cb', name: 'CB', value: cbTotal, color: paymentColors.cb },
    { id: 'cbContactless', name: 'CB SC', value: cbContactlessTotal, color: paymentColors.cbContactless },
    { id: 'amex', name: 'AMEX', value: amexTotal, color: paymentColors.amex },
    { id: 'amexContactless', name: 'AMEX SC', value: amexContactlessTotal, color: paymentColors.amexContactless },
    { id: 'tr', name: 'TR', value: trTotal, color: paymentColors.tr },
    { id: 'trContactless', name: 'TR SC', value: trContactlessTotal, color: paymentColors.trContactless },
    { id: 'cash', name: 'Espèces', value: cashTotal, color: paymentColors.cash },
    { id: 'transfer', name: 'Virement', value: transferTotal, color: paymentColors.transfer },
  ].filter(item => item.value > 0 && visibleChartPayments[item.id as keyof typeof visibleChartPayments]);

  const generateAiAnalysis = async () => {
    setIsGeneratingAnalysis(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey });
      
      const bestDayAmount = chartData.length > 0 ? Math.max(...chartData.map(r => r.total)) : 0;
      
      const paymentStats = paymentTotals.map(p => `${p.name}: ${p.value.toFixed(2)}€`).join(', ');
      
      const dailyDetails = chartData.map(d => 
        `${d.date}: Total ${d.total.toFixed(2)}€ (CB: ${d.cb.toFixed(2)}€, Espèces: ${d.cash.toFixed(2)}€, TR: ${d.tr.toFixed(2)}€, AMEX: ${d.amex.toFixed(2)}€)`
      ).join('\n        ');
      
      const prompt = `
        Tu es un analyste financier expert. Rédige une analyse concise et actionnable pour ce rapport de recettes.
        
        Données de la période :
        - Établissement : ${selectedEst === 'all' ? 'Tous' : establishments.find(e => e.id === selectedEst)?.name}
        - Période : du ${startDate} au ${endDate}
        - Chiffre d'affaires total : ${totalRevenue.toFixed(2)}€ (Période précédente : ${compTotalRevenue.toFixed(2)}€)
        - Moyenne par jour : ${avgRevenue.toFixed(2)}€
        - Meilleure journée : ${bestDayAmount.toFixed(2)}€
        - Répartition par moyen de paiement : ${paymentStats}
        
        Détail journalier :
        ${dailyDetails}
        
        Instructions :
        1. Analyse brièvement les tendances (hausse/baisse, saisonnalité).
        2. Identifie les points forts et les anomalies.
        3. Donne 3 conseils concrets et actionnables pour améliorer les revenus ou optimiser les paiements.
        
        Format : 
        - Sois très concis (maximum 250 mots).
        - Utilise des listes à puces pour les conseils.
        - Ton professionnel et direct.
        - Ne mets pas de titre principal.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });

      setAiAnalysisContent(response.text || "Analyse non disponible.");
    } catch (error) {
      console.error("Error generating AI analysis:", error);
      setAiAnalysisContent("Erreur lors de la génération de l'analyse. Veuillez réessayer.");
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const handleAiAnalysisToggle = (checked: boolean) => {
    setExportOptions({...exportOptions, aiAnalysis: checked});
    if (checked && !aiAnalysisContent) {
      generateAiAnalysis();
    }
  };

  const sendByEmail = () => {
    if (!startDate || !endDate) return;
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
    if (!startDate || !endDate) return;
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Rapports & Analyses</h1>
          <p className="text-slate-500 text-sm mt-1">Analysez vos performances financières et exportez vos données.</p>
          
          {/* Smart Establishment Selector */}
          <div className="mt-6 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 max-w-md">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Store size={12} /> Établissement
                </label>
                <div className="relative">
                  <SearchableSelect
                    options={[
                      { id: 'all', name: 'Tous les établissements' },
                      ...establishments.map(est => ({ id: est.id, name: est.name }))
                    ]}
                    value={selectedEst}
                    onChange={setSelectedEst}
                    placeholder="Sélectionner un établissement"
                    icon={<Store size={16} />}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-4">
          {/* Primary Actions Group */}
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
            <button 
              onClick={() => {
                setExportOptions(prev => ({ ...prev, aiAnalysis: true }));
                generateAiAnalysis();
              }}
              disabled={isGeneratingAnalysis}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition-all active:scale-95 ${
                isGeneratingAnalysis 
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                  : 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:shadow-indigo-300 hover:-translate-y-0.5'
              }`}
            >
              {isGeneratingAnalysis ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} className="animate-pulse" />}
              Analyse IA
            </button>
            <button 
              onClick={() => setShowSaveModal(true)}
              className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 hover:border-blue-200 transition-all shadow-sm active:scale-95 group"
            >
              <Save size={16} className="text-blue-600 group-hover:scale-110 transition-transform" /> 
              <span className="hidden sm:inline">Sauvegarder</span>
            </button>
          </div>

          {/* Export & Communication Group */}
          <div className="flex items-center gap-2 bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200/60 backdrop-blur-sm">
            <button 
              onClick={() => setShowExportModal(true)}
              className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-black hover:bg-black transition-all shadow-lg shadow-slate-200 hover:shadow-slate-300 active:scale-95"
            >
              <FileText size={18} className="text-blue-400" /> 
              <span className="hidden sm:inline">Exporter PDF</span>
              <span className="sm:hidden">PDF</span>
            </button>
            
            <div className="h-8 w-px bg-slate-300 mx-1" />

            <div className="flex items-center gap-1.5">
              <button 
                onClick={sendByEmail}
                className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all shadow-sm active:scale-90 group"
                title="Envoyer par email"
              >
                <Mail size={18} className="group-hover:rotate-12 transition-transform" />
              </button>
              
              <button 
                onClick={handleShare}
                className="p-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all shadow-sm active:scale-90 group"
                title="Partager"
              >
                <Share2 size={18} className="group-hover:scale-110 transition-transform" />
              </button>

              <div className="flex items-center gap-1 bg-white/80 border border-slate-200 rounded-xl p-1 shadow-inner">
                <button 
                  onClick={exportCSV}
                  className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-lg transition-all active:scale-90"
                  title="CSV"
                >
                  <Download size={16} />
                </button>
                <button 
                  onClick={exportExcel}
                  className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all active:scale-90"
                  title="Excel"
                >
                  <FileSpreadsheet size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white/60 backdrop-blur-xl p-6 rounded-[2rem] border border-slate-200/60 shadow-xl shadow-slate-200/20 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Service Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Service
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Layout size={16} />
              </div>
              <select
                value={selectedService}
                onChange={(e) => setSelectedService(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="all">Tous les services</option>
                <option value="midi">Midi</option>
                <option value="soir">Soir</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Display Mode Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Affichage
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <Columns size={16} />
              </div>
              <select
                value={period}
                onChange={(e) => setPeriod(e.target.value as Period)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="daily">Quotidien</option>
                <option value="monthly">Mensuel</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Comparison Mode Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Comparer à
            </label>
            <div className="relative group">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                <ArrowUpDown size={16} />
              </div>
              <select
                value={compareMode}
                onChange={(e) => setCompareMode(e.target.value as any)}
                className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
              >
                <option value="none">Aucune comparaison</option>
                <option value="previous_period">Période précédente</option>
                <option value="previous_year">Année précédente</option>
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Sort Selector */}
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              Trier par
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1 group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors">
                  <ArrowUpDown size={16} />
                </div>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-white border border-slate-200 text-slate-900 rounded-2xl pl-10 pr-4 py-3 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer shadow-sm"
                >
                  <option value="date">Date</option>
                  <option value="total">Montant</option>
                  {showDetailedTable && <option value="establishment">Établissement</option>}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <ChevronDown size={16} />
                </div>
              </div>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 rounded-2xl px-4 py-3 transition-all shadow-sm active:scale-90 flex items-center justify-center"
                title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              >
                {sortOrder === 'asc' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Date Range & Quick Selectors */}
        <div className="flex flex-col xl:flex-row items-center gap-6 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 p-2 rounded-2xl shadow-inner w-full xl:w-auto">
            <div className="flex items-center gap-3 px-3">
              <CalendarIcon size={18} className="text-blue-500" />
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Période du rapport</span>
                <div className="flex items-center gap-3">
                  <input 
                    type="date" 
                    value={startDate} 
                    onChange={(e) => {
                      const newStartDate = e.target.value;
                      setStartDate(newStartDate);
                      if (newStartDate > endDate) setEndDate(newStartDate);
                    }}
                    className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer hover:text-blue-600 transition-colors"
                  />
                  <span className="text-slate-300 font-light">→</span>
                  <input 
                    type="date" 
                    value={endDate} 
                    onChange={(e) => {
                      const newEndDate = e.target.value;
                      setEndDate(newEndDate);
                      if (newEndDate < startDate) setStartDate(newEndDate);
                    }}
                    className="text-sm font-bold text-slate-700 outline-none bg-transparent cursor-pointer hover:text-blue-600 transition-colors"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/50 w-full xl:w-auto">
            {[
              { label: 'Semaine', onClick: setThisWeek },
              { label: 'Mois', onClick: setThisMonth },
              { label: 'Année', onClick: setThisYear }
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={btn.onClick}
                className="flex-1 xl:px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:text-slate-900 hover:bg-white transition-all active:scale-95"
              >
                {btn.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl border border-slate-200 h-[46px] w-full xl:w-auto">
            <button
              onClick={() => setShowDetailedTable(false)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold transition-all ${
                !showDetailedTable 
                  ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Résumé
            </button>
            <button
              onClick={() => setShowDetailedTable(true)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 rounded-xl text-xs font-bold transition-all ${
                showDetailedTable 
                  ? 'bg-white text-blue-600 shadow-md scale-[1.02]' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Détail
            </button>
          </div>

          <div className="flex-1 flex justify-end w-full">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-4 py-2 rounded-full border border-slate-200/60">
              <Clock size={12} className="text-blue-400" />
              Dernière mise à jour: {format(new Date(), 'HH:mm')}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="bg-rose-50 border-2 border-rose-200 rounded-3xl p-8 text-center max-w-2xl mx-auto my-12 shadow-xl shadow-rose-100/50 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle size={40} className="text-rose-600" />
          </div>
          <h2 className="text-2xl font-black text-rose-900 mb-3 tracking-tight">Oups ! Une erreur est survenue</h2>
          <p className="text-rose-700 font-medium mb-8 leading-relaxed">
            Nous n'avons pas pu charger les données de votre rapport. Cela peut être dû à un problème de connexion ou à des restrictions de sécurité.
          </p>
          <div className="bg-white/60 backdrop-blur-sm border border-rose-100 rounded-2xl p-4 mb-8 text-left">
            <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest mb-2">Détails techniques</p>
            <code className="text-xs text-rose-800 break-all font-mono leading-tight block">
              {error}
            </code>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="bg-rose-600 hover:bg-rose-700 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-rose-200 active:scale-95 flex items-center gap-2 mx-auto"
          >
            <ArrowUpDown size={20} />
            Réessayer maintenant
          </button>
        </div>
      ) : loading ? (
        <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-4">
          <Loader2 size={40} className="animate-spin text-blue-500" />
          <p className="font-medium animate-pulse">Chargement des données en cours...</p>
        </div>
      ) : (
        <div id="pdf-export-content" className={`space-y-8 ${exportOptions.theme === 'minimal' ? 'font-sans' : ''}`}>
          {/* PDF Header (Hidden in UI) */}
          <div id="report-header" style={{ display: 'none' }} className={`mb-8 border-b-2 pb-6 ${
            exportOptions.theme === 'bold' ? 'border-blue-600' : 
            exportOptions.theme === 'minimal' ? 'border-slate-900' : 
            'border-slate-200'
          }`}>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16">
                  <Logo />
                </div>
                <div>
                  <h1 className={`text-2xl font-black uppercase tracking-tighter ${
                    exportOptions.theme === 'bold' ? 'text-blue-600' : 
                    exportOptions.theme === 'minimal' ? 'text-slate-900' : 
                    'text-slate-800'
                  }`}>
                    {exportOptions.reportName || 'Rapport de Recettes'}
                  </h1>
                  <p className="text-slate-500 font-medium">NordicRevenues II - Système de Gestion</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${exportOptions.theme === 'minimal' ? 'text-black' : 'text-slate-900'}`}>{format(new Date(), 'dd MMMM yyyy', { locale: fr })}</p>
                <p className="text-xs text-slate-500">Généré à {format(new Date(), 'HH:mm')}</p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-8">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Période du Rapport</p>
                <p className="text-sm font-semibold text-slate-700">
                  Du {startDate && !isNaN(parseISO(startDate).getTime()) ? format(parseISO(startDate), 'dd/MM/yyyy') : '...'} au {endDate && !isNaN(parseISO(endDate).getTime()) ? format(parseISO(endDate), 'dd/MM/yyyy') : '...'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Établissement</p>
                <p className="text-sm font-semibold text-slate-700">
                  {selectedEst === 'all' ? 'Tous les établissements' : establishments.find(e => e.id === selectedEst)?.name}
                </p>
              </div>
            </div>
          </div>

          {/* Performances Globales */}
          <div id="report-comparison" className={`p-8 rounded-[2.5rem] border ${
            exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
            exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
            'bg-white/40 backdrop-blur-md border-slate-200/60 shadow-xl shadow-slate-200/20'
          }`}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${exportOptions.theme === 'bold' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-white'}`}>
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className={`text-lg font-black tracking-tight ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Performances Globales</h3>
                  <p className="text-xs text-slate-500 font-medium">Comparaison en temps réel avec la période précédente</p>
                </div>
              </div>
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200/50">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Données synchronisées</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Ce Jour */}
                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:shadow-lg group ${
                  exportOptions.theme === 'minimal' ? 'bg-white border-slate-200' : 
                  exportOptions.theme === 'bold' ? 'bg-blue-50/30 border-blue-100' : 
                  'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-500/5 rounded-full group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">Ce jour vs N-1</p>
                  <div className="flex items-baseline justify-between relative z-10">
                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                      {comparisons.today.current.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </h4>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${comparisons.today.percent >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                      {comparisons.today.percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(comparisons.today.percent).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Ce Mois */}
                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:shadow-lg group ${
                  exportOptions.theme === 'minimal' ? 'bg-white border-slate-200' : 
                  exportOptions.theme === 'bold' ? 'bg-indigo-50/30 border-indigo-100' : 
                  'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-indigo-500/5 rounded-full group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">Ce mois vs N-1</p>
                  <div className="flex items-baseline justify-between relative z-10">
                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                      {comparisons.thisMonth.current.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </h4>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${comparisons.thisMonth.percent >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                      {comparisons.thisMonth.percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(comparisons.thisMonth.percent).toFixed(1)}%
                    </div>
                  </div>
                </div>

                {/* Cette Année */}
                <div className={`relative overflow-hidden p-6 rounded-3xl border transition-all hover:shadow-lg group ${
                  exportOptions.theme === 'minimal' ? 'bg-white border-slate-200' : 
                  exportOptions.theme === 'bold' ? 'bg-violet-50/30 border-violet-100' : 
                  'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-violet-500/5 rounded-full group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 relative z-10">Cette année vs N-1</p>
                  <div className="flex items-baseline justify-between relative z-10">
                    <h4 className="text-3xl font-black text-slate-900 tracking-tighter">
                      {comparisons.thisYear.current.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                    </h4>
                    <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-black ${comparisons.thisYear.percent >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-rose-600 bg-rose-50'}`}>
                      {comparisons.thisYear.percent >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      {Math.abs(comparisons.thisYear.percent).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>

          {/* KPI Summary */}
          <div id="report-kpis" className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <p className="text-sm font-semibold text-slate-500 mb-1">Chiffre d'Affaires Total</p>
              <div className="flex items-end justify-between">
                <p className={`text-3xl font-black ${exportOptions.theme === 'minimal' ? 'text-black' : 'text-slate-900'}`}>
                  {totalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                {compareMode !== 'none' && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                    periodPercent > 0 ? (exportOptions.theme === 'minimal' ? 'bg-slate-100 text-black' : 'bg-emerald-100 text-emerald-700') : 
                    periodPercent < 0 ? (exportOptions.theme === 'minimal' ? 'bg-slate-100 text-black' : 'bg-red-100 text-red-700') : 
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {periodPercent > 0 ? <TrendingUp size={14} /> : periodPercent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                    {Math.abs(periodPercent).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {compareMode !== 'none' ? `vs ${compTotalRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : 'Sur la période sélectionnée'}
              </p>
            </div>
            <div className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <p className="text-sm font-semibold text-slate-500 mb-1">Moyenne par Jour</p>
              <div className="flex items-end justify-between">
                <p className={`text-3xl font-black ${exportOptions.theme === 'minimal' ? 'text-black' : 'text-slate-900'}`}>
                  {avgRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                </p>
                {compareMode !== 'none' && (
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                    avgPercent > 0 ? (exportOptions.theme === 'minimal' ? 'bg-slate-100 text-black' : 'bg-emerald-100 text-emerald-700') : 
                    avgPercent < 0 ? (exportOptions.theme === 'minimal' ? 'bg-slate-100 text-black' : 'bg-red-100 text-red-700') : 
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {avgPercent > 0 ? <TrendingUp size={14} /> : avgPercent < 0 ? <TrendingDown size={14} /> : <Minus size={14} />}
                    {Math.abs(avgPercent).toFixed(1)}%
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {compareMode !== 'none' ? `vs ${compAvgRevenue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}` : `Sur ${uniqueDays} jours d'activité`}
              </p>
            </div>
            <div className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <p className="text-sm font-semibold text-slate-500 mb-1">Meilleure Journée</p>
              <p className={`text-3xl font-black ${exportOptions.theme === 'minimal' ? 'text-black' : 'text-emerald-600'}`}>
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

          {/* AI Analysis Section */}
          {(exportOptions.aiAnalysis && (aiAnalysisContent || isGeneratingAnalysis)) && (
            <div id="report-ai-analysis" className={`p-8 rounded-3xl ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-indigo-50/30 border-indigo-100 border-2 shadow-xl shadow-indigo-50' : 
              'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-100 border shadow-sm'
            }`}>
              <div className="flex items-center gap-3 mb-6">
                <div className={`p-3 rounded-xl ${
                  exportOptions.theme === 'minimal' ? 'bg-slate-100 text-black' : 
                  exportOptions.theme === 'bold' ? 'bg-indigo-100 text-indigo-600' : 
                  'bg-white text-indigo-600 shadow-sm'
                }`}>
                  <Sparkles size={24} />
                </div>
                <h3 className={`text-xl font-bold ${
                  exportOptions.theme === 'bold' ? 'text-indigo-600' : 'text-slate-900'
                }`}>Analyse Comparative IA</h3>
              </div>
              
              {isGeneratingAnalysis ? (
                <div className="flex items-center gap-3 text-indigo-600 py-8 justify-center">
                  <Loader2 className="animate-spin" size={24} />
                  <span className="font-medium">Génération de l'analyse en cours...</span>
                </div>
              ) : (
                <div className={`text-sm leading-relaxed ${
                  exportOptions.theme === 'minimal' ? 'text-black' : 'text-slate-700'
                }`}>
                  <div className="markdown-body prose prose-slate prose-sm max-w-none">
                    <ReactMarkdown>{aiAnalysisContent || ''}</ReactMarkdown>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Main Chart */}
          <div id="report-main-chart" className={`p-6 rounded-2xl border ${
            exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
            exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
            'bg-white border-slate-200 shadow-sm'
          }`}>
            <h3 className={`text-lg font-bold mb-6 ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Évolution du Chiffre d'Affaires</h3>
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} key={`reports-main-chart-${startDate}-${endDate}-${selectedEst}`}>
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
                  <Tooltip content={<CustomLineTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '5 5' }} />
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
                      
                      if (payload.triggeredAlerts && payload.triggeredAlerts.length > 0) {
                        return (
                          <g key={`alert-dot-${payload.date}`}>
                            <circle cx={cx} cy={cy} r={7} fill="#ef4444" stroke="#fff" strokeWidth={2} />
                            <text x={cx} y={cy + 3} textAnchor="middle" fill="white" fontSize="8px" fontWeight="bold">!</text>
                          </g>
                        );
                      }

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

          <div id="report-payment-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Payment Breakdown Pie Chart */}
            <div id="report-payment-chart" className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Part de chaque moyen de paiement</h3>
                <div className="relative">
                  <button
                    onClick={() => setShowChartPaymentSelector(!showChartPaymentSelector)}
                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
                  >
                    <Filter size={14} /> Filtrer
                  </button>
                  {showChartPaymentSelector && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setShowChartPaymentSelector(false)} />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 z-20 p-3">
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Moyens de paiement</span>
                          <button 
                            onClick={() => setPaymentColors({
                              cb: '#3b82f6',
                              cbContactless: '#60a5fa',
                              amex: '#f59e0b',
                              amexContactless: '#fbbf24',
                              tr: '#10b981',
                              trContactless: '#34d399',
                              cash: '#8b5cf6',
                              transfer: '#64748b'
                            })}
                            className="text-[10px] text-blue-600 hover:underline font-bold"
                          >
                            Réinitialiser
                          </button>
                        </div>
                        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
                          {[
                            { id: 'cb', label: 'CB', colorKey: 'cb' },
                            { id: 'cbContactless', label: 'CB Sans Contact', colorKey: 'cbContactless', indent: true },
                            { id: 'amex', label: 'AMEX', colorKey: 'amex' },
                            { id: 'amexContactless', label: 'AMEX Sans Contact', colorKey: 'amexContactless', indent: true },
                            { id: 'tr', label: 'TR', colorKey: 'tr' },
                            { id: 'trContactless', label: 'TR Sans Contact', colorKey: 'trContactless', indent: true },
                            { id: 'cash', label: 'Espèces', colorKey: 'cash' },
                            { id: 'transfer', label: 'Virement', colorKey: 'transfer' }
                          ].map((item) => (
                            <div key={item.id} className={`flex items-center justify-between p-1.5 hover:bg-slate-50 rounded-lg transition-colors ${item.indent ? 'pl-6' : ''}`}>
                              <label className="flex items-center gap-2 cursor-pointer flex-1">
                                <input 
                                  type="checkbox" 
                                  checked={visibleChartPayments[item.id as keyof typeof visibleChartPayments]} 
                                  onChange={(e) => setVisibleChartPayments(p => ({...p, [item.id]: e.target.checked}))} 
                                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5" 
                                />
                                <span className={`text-xs font-medium ${item.indent ? 'text-slate-500' : 'text-slate-700'}`}>{item.label}</span>
                              </label>
                              <input 
                                type="color" 
                                value={paymentColors[item.colorKey as keyof typeof paymentColors]} 
                                onChange={(e) => setPaymentColors(p => ({...p, [item.colorKey]: e.target.value}))}
                                className="w-5 h-5 rounded cursor-pointer border-none bg-transparent p-0 overflow-hidden"
                                title={`Couleur pour ${item.label}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} key={`reports-payment-pie-${startDate}-${endDate}-${selectedEst}`}>
                  <PieChart>
                    <Pie
                      {...({
                        activeIndex: activePieIndex,
                        activeShape: renderActiveShape,
                        data: paymentTotals,
                        cx: "50%",
                        cy: "50%",
                        innerRadius: 60,
                        outerRadius: 90,
                        paddingAngle: 5,
                        dataKey: "value",
                        onMouseEnter: (_: any, index: number) => setActivePieIndex(index),
                        onClick: (_: any, index: number) => setActivePieIndex(index),
                      } as any)}
                    >
                      {paymentTotals.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="cursor-pointer outline-none" />
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
            <div id="report-payment-evolution" className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className={`text-lg font-bold ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Évolution par Moyen de Paiement</h3>
                <button
                  onClick={exportChartAsImage}
                  className={`flex items-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    exportOptions.theme === 'minimal' ? 'text-black bg-slate-100 hover:bg-slate-200' : 
                    'text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100'
                  }`}
                >
                  <Download size={14} /> Image
                </button>
              </div>
              <div id="payment-chart-container" className="h-80 w-full bg-white p-2">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1} key={`reports-payment-bar-${startDate}-${endDate}-${selectedEst}`}>
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
                    <Tooltip content={<CustomBarTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.4 }} />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {visibleChartPayments.cb && <Bar dataKey="cb" name="CB" fill={paymentColors.cb} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.cbContactless && <Bar dataKey="cbContactless" name="CB SC" fill={paymentColors.cbContactless} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.amex && <Bar dataKey="amex" name="AMEX" fill={paymentColors.amex} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.amexContactless && <Bar dataKey="amexContactless" name="AMEX SC" fill={paymentColors.amexContactless} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.tr && <Bar dataKey="tr" name="TR" fill={paymentColors.tr} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.trContactless && <Bar dataKey="trContactless" name="TR SC" fill={paymentColors.trContactless} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.cash && <Bar dataKey="cash" name="Espèces" fill={paymentColors.cash} stackId="a" radius={[0, 0, 0, 0]} />}
                    {visibleChartPayments.transfer && <Bar dataKey="transfer" name="Virement" fill={paymentColors.transfer} stackId="a" radius={[4, 4, 0, 0]} />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Trends Section */}
          <div id="report-trends-section" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Trends with Moving Average */}
            <div id="report-revenue-trends" className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-bold ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Tendances de Croissance</h3>
                  <p className="text-xs text-slate-500 font-medium">Moyenne mobile sur 7 jours vs CA Réel</p>
                </div>
                <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-blue-600" />
                    <span className="text-slate-600">Réel</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-0.5 bg-emerald-500 border-t border-emerald-500 border-dashed" />
                    <span className="text-slate-600">Tendance</span>
                  </div>
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <LineChart data={chartDataWithTrends} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
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
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value.toFixed(2)} €`]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="total" 
                      name="CA Réel"
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="movingAvg" 
                      name="Tendance (7j)"
                      stroke="#10b981" 
                      strokeWidth={3}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Day of Week Analysis */}
            <div id="report-dow-trends" className={`p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-bold ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Performance par Jour de Semaine</h3>
                  <p className="text-xs text-slate-500 font-medium">Moyenne du CA par jour sur la période</p>
                </div>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                  <BarChart data={avgDayOfWeekData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="day" 
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
                      cursor={{ fill: '#f1f5f9', opacity: 0.4 }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value.toFixed(2)} €`, 'Moyenne']}
                    />
                    <Bar 
                      dataKey="avg" 
                      fill="#6366f1" 
                      radius={[8, 8, 0, 0]}
                      maxBarSize={40}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment Method Trends (Multi-line) */}
            <div id="report-payment-trends-line" className={`lg:col-span-2 p-6 rounded-2xl border ${
              exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
              exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
              'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-lg font-bold ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>Tendances par Moyen de Paiement</h3>
                  <p className="text-xs text-slate-500 font-medium">Évolution temporelle comparative des flux</p>
                </div>
              </div>
              <div className="h-96 w-full">
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
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      formatter={(value: number) => [`${value.toFixed(2)} €`]}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {visibleChartPayments.cb && <Line type="monotone" dataKey="cb" name="CB" stroke={paymentColors.cb} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.cbContactless && <Line type="monotone" dataKey="cbContactless" name="CB SC" stroke={paymentColors.cbContactless} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.amex && <Line type="monotone" dataKey="amex" name="AMEX" stroke={paymentColors.amex} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.amexContactless && <Line type="monotone" dataKey="amexContactless" name="AMEX SC" stroke={paymentColors.amexContactless} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.tr && <Line type="monotone" dataKey="tr" name="TR" stroke={paymentColors.tr} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.trContactless && <Line type="monotone" dataKey="trContactless" name="TR SC" stroke={paymentColors.trContactless} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.cash && <Line type="monotone" dataKey="cash" name="Espèces" stroke={paymentColors.cash} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                    {visibleChartPayments.transfer && <Line type="monotone" dataKey="transfer" name="Virement" stroke={paymentColors.transfer} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Daily Breakdown Table */}
          <div id="report-daily-table" className={`p-6 rounded-2xl border overflow-x-auto ${
            exportOptions.theme === 'minimal' ? 'bg-white border-slate-900 border-2 shadow-none' : 
            exportOptions.theme === 'bold' ? 'bg-white border-blue-600 border-2 shadow-xl shadow-blue-50' : 
            'bg-white border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-lg font-bold ${exportOptions.theme === 'bold' ? 'text-blue-600' : 'text-slate-900'}`}>
                Détail {period === 'monthly' ? 'Mensuel' : 'Journalier'} des Paiements
              </h3>
            </div>
            <div className={`overflow-auto max-h-[500px] border rounded-xl ${
              exportOptions.theme === 'minimal' ? 'border-slate-900' : 
              exportOptions.theme === 'bold' ? 'border-blue-100' : 
              'border-slate-200'
            }`}>
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className={`sticky top-0 z-10 shadow-sm ${
                  exportOptions.theme === 'minimal' ? 'bg-slate-100' : 
                  exportOptions.theme === 'bold' ? 'bg-blue-50' : 
                  'bg-slate-50'
                }`}>
                  <tr className={`border-b text-sm ${
                    exportOptions.theme === 'minimal' ? 'border-slate-900 text-black' : 
                    exportOptions.theme === 'bold' ? 'border-blue-200 text-blue-900' : 
                    'border-slate-200 text-slate-500'
                  }`}>
                    <th className="py-3 px-4 font-semibold text-left">Période</th>
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
                  {showDetailedTable ? (
                    sortedRevenues.map((rev) => {
                      const est = establishments.find(e => e.id === rev.establishmentId);
                      return (
                        <tr key={rev.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900">{rev.date && !isNaN(parseISO(rev.date).getTime()) ? format(parseISO(rev.date), 'dd/MM/yyyy') : rev.date}</div>
                            <div className="text-[10px] text-slate-400 uppercase font-bold tracking-tighter">
                              {est?.name || 'Inconnu'} • {rev.service || '-'}
                            </div>
                          </td>
                          {visibleColumns.cb && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.cb.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.cbContactless && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.cbContactless.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.amex && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.amex.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.amexContactless && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.amexContactless.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.tr && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.tr.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.trContactless && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.trContactless.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.cash && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.cash.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          {visibleColumns.transfer && <td className="py-3 px-4 text-right text-slate-600">{rev.payments.transfer.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>}
                          <td className="py-3 px-4 text-right font-bold text-slate-900">{rev.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</td>
                        </tr>
                      );
                    })
                  ) : (
                    sortedChartData.map((day) => (
                      <tr key={day.date} className="border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors">
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
                    ))
                  )}
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

          {/* PDF Footer (Hidden in UI) */}
          <div id="report-footer" style={{ display: 'none' }} className={`mt-12 pt-6 border-t flex justify-between items-center text-[10px] font-medium ${
            exportOptions.theme === 'minimal' ? 'border-slate-900 text-black' : 
            exportOptions.theme === 'bold' ? 'border-blue-200 text-blue-600' : 
            'border-slate-200 text-slate-400'
          }`}>
            <p>© {new Date().getFullYear()} NordicRevenues II - Document Confidentiel</p>
            <p>Généré par {userProfile?.email || 'Utilisateur'}</p>
            <p>Page 1 sur 1</p>
          </div>
        </div>
      )}
      {/* Export PDF Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-0 max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Exporter en PDF</h3>
                  <p className="text-xs text-slate-500 font-medium">Personnalisez votre rapport professionnel</p>
                </div>
              </div>
              <button 
                onClick={() => !isGeneratingPDF && setShowExportModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {exportSuccess ? (
                <div className="py-8 flex flex-col items-center justify-center text-center animate-in zoom-in duration-500">
                  <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100/50">
                    <CheckCircle2 size={48} />
                  </div>
                  <h4 className="text-2xl font-black text-slate-900 mb-2">Export Réussi !</h4>
                  <p className="text-slate-500 mb-8 max-w-xs">Votre rapport professionnel est prêt et a été téléchargé sur votre appareil.</p>
                  
                  <div className="grid grid-cols-2 gap-3 w-full">
                    <button 
                      onClick={() => {
                        setExportSuccess(false);
                        setShowExportModal(false);
                      }}
                      className="px-6 py-4 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Fermer
                    </button>
                    <button 
                      onClick={() => {
                        setExportSuccess(false);
                      }}
                      className="px-6 py-4 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                      Nouvel Export
                    </button>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-slate-100 w-full">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Actions rapides</p>
                    <div className="flex justify-center gap-6">
                      <button onClick={sendByEmail} className="flex flex-col items-center gap-2 group">
                        <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl transition-all">
                          <Mail size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600">Email</span>
                      </button>
                      <button onClick={handleShare} className="flex flex-col items-center gap-2 group">
                        <div className="p-3 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-xl transition-all">
                          <Share2 size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 group-hover:text-blue-600">Partager</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : isGeneratingPDF ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                      <FileText size={32} />
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-2">Génération en cours...</h4>
                  <p className="text-slate-500 max-w-[280px]">Nous préparons votre document haute résolution. Cela peut prendre quelques secondes.</p>
                </div>
              ) : (
                <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Établissement</p>
                      <select
                        value={selectedEst}
                        onChange={(e) => setSelectedEst(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                      >
                        <option value="all">Tous les établissements</option>
                        {establishments.map(est => (
                          <option key={est.id} value={est.id}>{est.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Période</p>
                      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
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
                          className="text-sm font-semibold text-slate-700 outline-none bg-transparent w-full"
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
                          className="text-sm font-semibold text-slate-700 outline-none bg-transparent w-full"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Nom du rapport</p>
                    <input 
                      type="text"
                      value={exportOptions.reportName}
                      onChange={(e) => setExportOptions({...exportOptions, reportName: e.target.value})}
                      placeholder="Ex: Rapport Mensuel Mars 2024"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Layout size={12} /> Orientation du document
                      </p>
                      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl">
                        <button 
                          onClick={() => setExportOptions({...exportOptions, orientation: 'portrait'})}
                          className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all ${exportOptions.orientation === 'portrait' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                          <div className={`w-8 h-10 border-2 rounded-md flex items-center justify-center ${exportOptions.orientation === 'portrait' ? 'border-blue-200 bg-blue-50' : 'border-slate-300'}`}>
                            <div className="w-4 h-1 bg-current opacity-20 rounded-full mb-1"></div>
                            <div className="w-6 h-1 bg-current opacity-20 rounded-full"></div>
                          </div>
                          <span className="text-[10px] font-bold">Portrait</span>
                        </button>
                        <button 
                          onClick={() => setExportOptions({...exportOptions, orientation: 'landscape'})}
                          className={`flex flex-col items-center gap-2 py-3 px-2 rounded-xl transition-all ${exportOptions.orientation === 'landscape' ? 'bg-white text-blue-600 shadow-md ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}
                        >
                          <div className={`w-10 h-8 border-2 rounded-md flex items-center justify-center ${exportOptions.orientation === 'landscape' ? 'border-blue-200 bg-blue-50' : 'border-slate-300'}`}>
                            <div className="flex flex-col gap-1">
                              <div className="w-6 h-1 bg-current opacity-20 rounded-full"></div>
                              <div className="w-4 h-1 bg-current opacity-20 rounded-full"></div>
                            </div>
                          </div>
                          <span className="text-[10px] font-bold">Paysage</span>
                        </button>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Palette size={12} /> Style visuel
                      </p>
                      <div className="grid grid-cols-1 gap-2">
                        <div className="relative">
                          <select 
                            value={exportOptions.theme}
                            onChange={(e) => setExportOptions({...exportOptions, theme: e.target.value as any})}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none appearance-none transition-all"
                          >
                            <option value="corporate">Corporate (Bleu Professionnel)</option>
                            <option value="minimal">Minimaliste (Noir & Blanc)</option>
                            <option value="bold">Audacieux (Contraste Élevé)</option>
                          </select>
                          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <div className={`w-4 h-4 rounded-full ${exportOptions.theme === 'corporate' ? 'bg-blue-600' : exportOptions.theme === 'minimal' ? 'bg-slate-900' : 'bg-blue-500 shadow-sm shadow-blue-200'}`}></div>
                          </div>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                            <ChevronDown size={16} />
                          </div>
                        </div>
                        <p className="text-[9px] text-slate-400 px-1">
                          {exportOptions.theme === 'corporate' && "Idéal pour les présentations officielles et le partage interne."}
                          {exportOptions.theme === 'minimal' && "Économe en encre, parfait pour l'impression directe."}
                          {exportOptions.theme === 'bold' && "Design moderne avec des accents de couleurs vifs."}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sections à inclure</p>
                    {compareMode !== 'none' && (
                      <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.comparison ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.comparison ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                          {exportOptions.comparison && <CheckCircle2 size={14} className="text-white" />}
                        </div>
                        <input 
                          type="checkbox" 
                          checked={exportOptions.comparison}
                          onChange={(e) => setExportOptions({...exportOptions, comparison: e.target.checked})}
                          className="hidden"
                        />
                        <div className="flex-1">
                          <span className="block text-sm font-bold text-slate-700">Comparaison N-1</span>
                          <span className="text-[10px] text-slate-400 font-medium">Performances globales vs année précédente</span>
                        </div>
                      </label>
                    )}
                    <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.kpis ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.kpis ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {exportOptions.kpis && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.kpis}
                        onChange={(e) => setExportOptions({...exportOptions, kpis: e.target.checked})}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Résumé des KPIs</span>
                        <span className="text-[10px] text-slate-400 font-medium">CA Total, Moyenne, Meilleure journée</span>
                      </div>
                    </label>
                    <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.mainChart ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.mainChart ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {exportOptions.mainChart && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.mainChart}
                        onChange={(e) => setExportOptions({...exportOptions, mainChart: e.target.checked})}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Graphique d'Évolution</span>
                        <span className="text-[10px] text-slate-400 font-medium">Visualisation temporelle du chiffre d'affaires</span>
                      </div>
                    </label>
                    <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.paymentChart ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.paymentChart ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {exportOptions.paymentChart && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.paymentChart}
                        onChange={(e) => setExportOptions({...exportOptions, paymentChart: e.target.checked})}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Moyens de Paiement</span>
                        <span className="text-[10px] text-slate-400 font-medium">Répartition détaillée par type de règlement</span>
                      </div>
                    </label>
                    <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.trendsChart ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.trendsChart ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {exportOptions.trendsChart && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.trendsChart}
                        onChange={(e) => setExportOptions({...exportOptions, trendsChart: e.target.checked})}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Analyses des Tendances</span>
                        <span className="text-[10px] text-slate-400 font-medium">Moyennes mobiles et performance par jour de semaine</span>
                      </div>
                    </label>
                    <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.dailyTable ? 'bg-blue-50/50 border-blue-200 ring-1 ring-blue-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.dailyTable ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                        {exportOptions.dailyTable && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.dailyTable}
                        onChange={(e) => setExportOptions({...exportOptions, dailyTable: e.target.checked})}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Tableau de Données</span>
                        <span className="text-[10px] text-slate-400 font-medium">Liste exhaustive des recettes journalières</span>
                      </div>
                    </label>

                    <label className={`flex items-center gap-4 p-4 border rounded-2xl cursor-pointer transition-all ${exportOptions.aiAnalysis ? 'bg-indigo-50/50 border-indigo-200 ring-1 ring-indigo-200' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}`}>
                      <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${exportOptions.aiAnalysis ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}>
                        {exportOptions.aiAnalysis && <CheckCircle2 size={14} className="text-white" />}
                      </div>
                      <input 
                        type="checkbox" 
                        checked={exportOptions.aiAnalysis}
                        onChange={(e) => handleAiAnalysisToggle(e.target.checked)}
                        className="hidden"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="block text-sm font-bold text-slate-700">Analyse IA Comparative</span>
                          <Sparkles size={14} className="text-indigo-500" />
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">Analyse détaillée par Gemini</span>
                      </div>
                    </label>
                  </div>

                  <div className="pt-4 sticky bottom-0 bg-white border-t border-slate-100 mt-4">
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setShowExportModal(false)}
                        className="flex-1 px-6 py-4 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95"
                      >
                        Annuler
                      </button>
                      <button 
                        onClick={generatePDF}
                        disabled={loading || !Object.values(exportOptions).some(v => typeof v === 'boolean' && v)}
                        className="flex-[2] px-6 py-4 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-2xl transition-all shadow-lg shadow-blue-200 active:scale-95 flex items-center justify-center gap-2"
                      >
                        <Download size={18} />
                        Générer le Rapport
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Save Data Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-0 max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-slate-50 px-8 py-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-xl">
                  <Save size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Sauvegarder les Données</h3>
                  <p className="text-xs text-slate-500 font-medium">Exportez vos données brutes pour archivage</p>
                </div>
              </div>
              <button 
                onClick={() => !isExportingData && setShowSaveModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-all"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8">
              {isExportingData ? (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 border-4 border-slate-100 rounded-full"></div>
                    <div className="absolute inset-0 w-20 h-20 border-4 border-blue-600 rounded-full border-t-transparent animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                      <FileSpreadsheet size={32} />
                    </div>
                  </div>
                  <h4 className="text-xl font-black text-slate-900 mb-2">Préparation de l'export...</h4>
                  <p className="text-slate-500 max-w-[280px]">Nous compilons toutes les données de revenus avec les méthodes de paiement.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                    <p className="text-xs text-blue-700 leading-relaxed">
                      L'exportation inclut toutes les colonnes du tableau : date, établissement, service, total et le détail complet de chaque moyen de paiement.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3">
                    <button 
                      onClick={exportCSV}
                      className="group flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className="p-3 bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 rounded-xl transition-all">
                        <FileSpreadsheet size={24} />
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Format CSV (Excel)</span>
                        <span className="text-[10px] text-slate-400 font-medium">Idéal pour l'analyse dans un tableur</span>
                      </div>
                    </button>

                    <button 
                      onClick={exportJSON}
                      className="group flex items-center gap-4 p-4 border border-slate-200 rounded-2xl hover:border-blue-300 hover:bg-blue-50/30 transition-all text-left"
                    >
                      <div className="p-3 bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600 rounded-xl transition-all">
                        <FileText size={24} />
                      </div>
                      <div className="flex-1">
                        <span className="block text-sm font-bold text-slate-700">Format JSON (Backup)</span>
                        <span className="text-[10px] text-slate-400 font-medium">Format technique pour sauvegarde complète</span>
                      </div>
                    </button>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => setShowSaveModal(false)}
                      className="w-full px-6 py-4 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all active:scale-95"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
