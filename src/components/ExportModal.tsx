import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Download, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDate: string;
  endDate: string;
  establishmentName: string;
}

export function ExportModal({ isOpen, onClose, startDate, endDate, establishmentName }: ExportModalProps) {
  const [reportName, setReportName] = useState(`Rapport_Performance_${format(new Date(), 'yyyy-MM-dd')}`);
  const [sections, setSections] = useState({
    kpis: true,
    charts: true,
    forecast: true,
    analysis: true,
    profitability: true,
    efficiency: true,
    costEvolution: true,
    weekdayAverage: true,
    dailyDetailed: true,
    leaderboard: true
  });
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 15;
      let cursorY = 20;

      // Header
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 40, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('NordicRevenueS', margin, 20);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Rapport de Performance - ${establishmentName}`, margin, 30);
      pdf.text(`Période: ${format(new Date(startDate), 'dd/MM/yyyy')} au ${format(new Date(endDate), 'dd/MM/yyyy')}`, pageWidth - margin, 30, { align: 'right' });
      
      cursorY = 55;

      const addSectionToPdf = async (elementId: string, title: string) => {
        const element = document.getElementById(elementId);
        if (!element) return;

        // Add section title
        pdf.setTextColor(15, 23, 42);
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, cursorY);
        cursorY += 10;

        try {
          const dataUrl = await toPng(element, {
            backgroundColor: '#ffffff',
            style: { borderRadius: '0' },
            pixelRatio: 2
          });

          const imgProps = pdf.getImageProperties(dataUrl);
          const pdfWidth = pageWidth - (margin * 2);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

          if (cursorY + pdfHeight > pageHeight - margin) {
            pdf.addPage();
            cursorY = margin + 10;
          }

          pdf.addImage(dataUrl, 'PNG', margin, cursorY, pdfWidth, pdfHeight);
          cursorY += pdfHeight + 15;
        } catch (err) {
          console.error(`Error capturing ${elementId}:`, err);
        }
      };

      if (sections.kpis) {
        await addSectionToPdf('dashboard-kpis', 'Indicateurs Clés (KPIs)');
      }

      if (sections.charts) {
        await addSectionToPdf('dashboard-charts-evolution', 'Évolution du Chiffre d\'Affaires');
        await addSectionToPdf('dashboard-charts-weather', 'Corrélation Météorologique');
        await addSectionToPdf('dashboard-charts-establishments', 'Répartition par Établissement');
      }

      if (sections.forecast) {
        await addSectionToPdf('dashboard-revenue-forecast', 'Prévisions Prédictives (IA)');
      }

      if (sections.analysis) {
        await addSectionToPdf('dashboard-ai-insights', 'Analyse IA & Insights');
      }

      if (sections.profitability) {
        await addSectionToPdf('dashboard-breakeven', 'Seuil de Rentabilité');
        await addSectionToPdf('dashboard-prime-cost', 'Pilotage de la Rentabilité');
      }

      if (sections.efficiency) {
        await addSectionToPdf('dashboard-efficiency-benchmark', 'Benchmark d\'Efficacité Opérationnelle');
      }

      if (sections.costEvolution) {
        await addSectionToPdf('dashboard-cost-evolution', 'Évolution des Coûts');
      }

      if (sections.weekdayAverage) {
        await addSectionToPdf('dashboard-weekday-average', 'Performance Hebdomadaire');
      }

      if (sections.dailyDetailed) {
        await addSectionToPdf('dashboard-daily-detailed-report', 'Rapport Journalier Détaillé');
      }

      if (sections.leaderboard) {
        await addSectionToPdf('dashboard-staff-leaderboard', 'Classement de l\'Équipe');
      }

      // Footer with page numbers
      const pageCount = (pdf as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(150);
        pdf.text(`Généré le ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Page ${i} sur ${pageCount}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }

      pdf.save(`${reportName}.pdf`);
      onClose();
    } catch (err) {
      console.error(err);
      setError('Une erreur est survenue lors de la génération du PDF.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 z-[100]">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200"
          >
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-600/20">
                  <FileText size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">Exporter le Rapport</h2>
                  <p className="text-xs text-slate-500 font-medium">Personnalisez votre export PDF</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-slate-200 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-bold text-slate-700 ml-1">Nom du rapport</span>
                  <input
                    type="text"
                    value={reportName}
                    onChange={(e) => setReportName(e.target.value)}
                    className="mt-2 w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-600/10 focus:border-blue-600 transition-all text-slate-900 font-medium"
                    placeholder="Entrez le nom du fichier..."
                  />
                </label>

                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100/50">
                  <div className="flex items-center gap-3 text-blue-700">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-bold">Période sélectionnée</span>
                  </div>
                  <p className="text-xs text-blue-600/80 mt-1 ml-7 font-medium">
                    Du {format(new Date(startDate), 'dd MMMM', { locale: fr })} au {format(new Date(endDate), 'dd MMMM yyyy', { locale: fr })}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 ml-1">Sections à inclure</h3>
                <div className="grid grid-cols-2 gap-3">
                  {Object.entries(sections).map(([key, value]) => (
                    <button
                      key={key}
                      onClick={() => setSections(prev => ({ ...prev, [key]: !value }))}
                      className={clsx(
                        "flex items-center gap-3 p-4 rounded-2xl border transition-all text-left group",
                        value 
                          ? "bg-white border-blue-600 shadow-lg shadow-blue-600/5" 
                          : "bg-slate-50 border-slate-200 text-slate-400 grayscale"
                      )}
                    >
                      <div className={clsx(
                        "w-5 h-5 rounded-md flex items-center justify-center transition-colors border",
                        value ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                      )}>
                        {value && <CheckCircle2 size={12} className="text-white" />}
                      </div>
                      <span className={clsx(
                        "text-xs font-bold uppercase tracking-wider",
                        value ? "text-slate-900" : "text-slate-400"
                      )}>
                        {key === 'kpis' ? 'KPIs' : 
                         key === 'charts' ? 'Graphiques' : 
                         key === 'forecast' ? 'Prévisions IA' :
                         key === 'analysis' ? 'Analyse IA' : 
                         key === 'profitability' ? 'Rentabilité' : 
                         key === 'efficiency' ? 'Efficacité' : 
                         key === 'costEvolution' ? 'Évolution Coûts' :
                         key === 'weekdayAverage' ? 'Performance Hebdo' :
                         key === 'dailyDetailed' ? 'Rapport Journalier' : 'Classement'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in fade-in slide-in-from-top-2">
                  <AlertCircle size={20} />
                  <p className="text-sm font-medium">{error}</p>
                </div>
              )}
            </div>

            <div className="p-8 bg-slate-50 flex gap-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-4 rounded-2xl font-bold bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all active:scale-95"
              >
                Annuler
              </button>
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="flex-[2] flex items-center justify-center gap-3 px-6 py-4 rounded-2xl font-bold bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isExporting ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Download size={20} />
                    Générer le PDF
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function clsx(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
