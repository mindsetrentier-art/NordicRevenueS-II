import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { AlertRule, Establishment, AlertType, Payments } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { Bell, Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export function Alerts() {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [alertToDelete, setAlertToDelete] = useState<string | null>(null);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AlertType>('revenue_drop');
  const [establishmentId, setEstablishmentId] = useState('all');
  const [threshold, setThreshold] = useState<number | ''>('');
  const [thresholdError, setThresholdError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<keyof Payments>('cb');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isActive, setIsActive] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch establishments
      let estData: Establishment[] = [];
      if (userProfile?.role === 'admin') {
        const estQuery = query(collection(db, 'establishments'));
        const estSnap = await getDocs(estQuery);
        estData = estSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
      } else {
        const createdQuery = query(collection(db, 'establishments'), where('createdBy', '==', userProfile?.uid));
        const createdSnap = await getDocs(createdQuery);
        const createdData = createdSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
        
        let assignedData: Establishment[] = [];
        if (userProfile?.establishmentIds && userProfile.establishmentIds.length > 0) {
          const assignedQuery = query(collection(db, 'establishments'), where('__name__', 'in', userProfile.establishmentIds));
          const assignedSnap = await getDocs(assignedQuery);
          assignedData = assignedSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
        }
        
        const allData = [...createdData, ...assignedData];
        estData = Array.from(new Map(allData.map(item => [item.id, item])).values());
      }
      setEstablishments(estData);

      // Fetch alerts
      const alertsQuery = query(collection(db, 'alerts'), where('userId', '==', userProfile?.uid));
      const alertsSnap = await getDocs(alertsQuery);
      const alertsData = alertsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as AlertRule));
      setAlerts(alertsData);
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'alerts/establishments');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile, fetchData]);

  const openModal = (alert?: AlertRule) => {
    if (alert) {
      setEditingAlert(alert);
      setName(alert.name);
      setType(alert.type);
      setEstablishmentId(alert.establishmentId);
      setThreshold(alert.threshold);
      setPaymentMethod(alert.paymentMethod || 'cb');
      setTimeframe(alert.timeframe);
      setIsActive(alert.isActive);
    } else {
      setEditingAlert(null);
      setName('');
      setType('revenue_drop');
      setEstablishmentId('all');
      setThreshold('');
      setPaymentMethod('cb');
      setTimeframe('daily');
      setIsActive(true);
    }
    setError(null);
    setThresholdError(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAlert(null);
  };

  const handleThresholdChange = (val: string) => {
    if (val === '') {
      setThreshold('');
      setThresholdError('Le seuil est requis.');
      return;
    }
    const num = Number(val);
    if (isNaN(num) || num <= 0) {
      setThresholdError('Le seuil doit être un nombre strictement positif.');
      setThreshold(val as any); // Keep the invalid value in input so user can correct it
    } else {
      setThresholdError(null);
      setThreshold(num);
    }
  };

  const saveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setError(null);

    const numThreshold = Number(threshold);
    if (isNaN(numThreshold) || numThreshold <= 0) {
      setThresholdError("Veuillez entrer un seuil valide et positif.");
      return;
    }

    try {
      const alertData = {
        userId: userProfile.uid,
        name,
        type,
        establishmentId,
        threshold: numThreshold,
        paymentMethod: type === 'payment_method_change' ? paymentMethod : null,
        timeframe,
        isActive,
        updatedAt: serverTimestamp()
      };

      if (editingAlert) {
        await updateDoc(doc(db, 'alerts', editingAlert.id), alertData);
      } else {
        await addDoc(collection(db, 'alerts'), {
          ...alertData,
          createdAt: serverTimestamp()
        });
      }
      
      closeModal();
      fetchData();
    } catch (err) {
      console.error("Error saving alert:", err);
      setError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
      handleFirestoreError(err, editingAlert ? OperationType.UPDATE : OperationType.CREATE, 'alerts');
    }
  };

  const confirmDelete = async () => {
    if (!alertToDelete) return;
    try {
      await deleteDoc(doc(db, 'alerts', alertToDelete));
      setIsDeleteModalOpen(false);
      setAlertToDelete(null);
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `alerts/${alertToDelete}`);
    }
  };

  const handleDeleteClick = (id: string) => {
    setAlertToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const toggleAlertStatus = async (alert: AlertRule) => {
    try {
      await updateDoc(doc(db, 'alerts', alert.id), {
        isActive: !alert.isActive,
        updatedAt: serverTimestamp()
      });
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `alerts/${alert.id}`);
    }
  };

  const paymentMethodLabels: Record<string, string> = {
    cb: 'Carte Bancaire',
    cbContactless: 'CB Sans Contact',
    cash: 'Espèces',
    amex: 'American Express',
    amexContactless: 'AMEX Sans Contact',
    tr: 'Ticket Restaurant',
    trContactless: 'TR Sans Contact',
    transfer: 'Virement'
  };

  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  const sortedAlerts = useMemo(() => {
    let sortableAlerts = [...alerts];
    if (sortConfig !== null) {
      sortableAlerts.sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'name':
            aValue = a.name.toLowerCase();
            bValue = b.name.toLowerCase();
            break;
          case 'type':
            aValue = a.type;
            bValue = b.type;
            break;
          case 'establishment':
            aValue = a.establishmentId === 'all' ? 'Tous les établissements' : establishments.find(e => e.id === a.establishmentId)?.name?.toLowerCase() || '';
            bValue = b.establishmentId === 'all' ? 'Tous les établissements' : establishments.find(e => e.id === b.establishmentId)?.name?.toLowerCase() || '';
            break;
          case 'isActive':
            aValue = a.isActive ? 1 : 0;
            bValue = b.isActive ? 1 : 0;
            break;
          case 'createdAt':
            aValue = (a.createdAt as any)?.toMillis?.() || 0;
            bValue = (b.createdAt as any)?.toMillis?.() || 0;
            break;
          default:
            aValue = 0;
            bValue = 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableAlerts;
  }, [alerts, sortConfig, establishments]);

  const requestSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (columnName: string) => {
    if (!sortConfig || sortConfig.key !== columnName) {
      return <ArrowUpDown size={14} className="text-slate-400" />;
    }
    return sortConfig.direction === 'asc' ? <ArrowUp size={14} className="text-blue-600" /> : <ArrowDown size={14} className="text-blue-600" />;
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Alertes Personnalisées</h1>
          <p className="text-slate-500 text-sm mt-1">Configurez des alertes sur vos revenus et moyens de paiement.</p>
        </div>
        <button 
          onClick={() => openModal()}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
        >
          <Plus size={16} /> Nouvelle Alerte
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">Chargement des alertes...</div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Bell size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Aucune alerte configurée</h3>
          <p className="text-slate-500 max-w-md mx-auto mb-6">
            Créez des alertes pour être notifié lorsque votre chiffre d'affaires baisse ou que l'utilisation d'un moyen de paiement change de manière significative.
          </p>
          <button 
            onClick={() => openModal()}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} /> Créer ma première alerte
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('name')}>
                    <div className="flex items-center gap-2">
                      Nom {getSortIcon('name')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('type')}>
                    <div className="flex items-center gap-2">
                      Type {getSortIcon('type')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('establishment')}>
                    <div className="flex items-center gap-2">
                      Établissement {getSortIcon('establishment')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('isActive')}>
                    <div className="flex items-center gap-2">
                      Statut {getSortIcon('isActive')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => requestSort('createdAt')}>
                    <div className="flex items-center gap-2">
                      Date de création {getSortIcon('createdAt')}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedAlerts.map(alert => (
                  <tr key={alert.id} className={clsx("hover:bg-slate-50 transition-colors", !alert.isActive && "opacity-60")}>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={clsx(
                          "p-2 rounded-xl shrink-0",
                          alert.type === 'revenue_drop' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                        )}>
                          {alert.type === 'revenue_drop' ? <AlertTriangle size={16} /> : <Bell size={16} />}
                        </div>
                        <span className="font-bold text-slate-900">{alert.name}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">
                          {alert.type === 'revenue_drop' ? 'Baisse de CA' : 'Variation Paiement'}
                        </span>
                        <span className="text-xs text-slate-500">
                          {alert.type === 'revenue_drop' ? `< ${alert.threshold} €` : `> ${alert.threshold} %`}
                          {alert.type === 'payment_method_change' && alert.paymentMethod && ` (${paymentMethodLabels[alert.paymentMethod] || alert.paymentMethod})`}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {alert.establishmentId === 'all' 
                        ? 'Tous les établissements' 
                        : establishments.find(e => e.id === alert.establishmentId)?.name || 'Établissement inconnu'}
                    </td>
                    <td className="p-4">
                      <button 
                        onClick={() => toggleAlertStatus(alert)}
                        className={clsx(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-colors border",
                          alert.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100" : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                        )}
                        title={alert.isActive ? "Désactiver" : "Activer"}
                      >
                        {alert.isActive ? (
                          <>
                            <div className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </div>
                            Actif
                          </>
                        ) : (
                          <>
                            <X size={12} className="text-slate-400" /> Inactif
                          </>
                        )}
                      </button>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {alert.createdAt ? new Date((alert.createdAt as any).toMillis ? (alert.createdAt as any).toMillis() : alert.createdAt).toLocaleDateString('fr-FR') : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => openModal(alert)}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Modifier"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteClick(alert.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
                Supprimer l'alerte
              </h2>
              <p className="text-slate-500 text-center mb-6">
                Êtes-vous sûr de vouloir supprimer cette alerte ? Cette action est irréversible.
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setAlertToDelete(null);
                  }}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-900">
                {editingAlert ? 'Modifier l\'alerte' : 'Nouvelle alerte'}
              </h2>
              <button onClick={closeModal} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={saveAlert} className="p-6 overflow-y-auto flex-1 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nom de l'alerte</label>
                <input 
                  type="text" 
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Alerte CA bas"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Établissement</label>
                <select 
                  value={establishmentId}
                  onChange={(e) => setEstablishmentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="all">Tous les établissements</option>
                  {establishments.map(est => (
                    <option key={est.id} value={est.id}>{est.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Type d'alerte</label>
                <select 
                  value={type}
                  onChange={(e) => setType(e.target.value as AlertType)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="revenue_drop">Baisse de chiffre d'affaires</option>
                  <option value="payment_method_change">Variation d'un moyen de paiement</option>
                </select>
              </div>

              {type === 'payment_method_change' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Moyen de paiement</label>
                  <select 
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as keyof Payments)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    {Object.entries(paymentMethodLabels).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  {type === 'revenue_drop' ? 'Seuil d\'alerte (en €)' : 'Variation significative (en %)'}
                </label>
                <div className="relative">
                  <input 
                    type="number" 
                    required
                    min="0.01"
                    step={type === 'revenue_drop' ? "10" : "1"}
                    value={threshold}
                    onChange={(e) => handleThresholdChange(e.target.value)}
                    placeholder={type === 'revenue_drop' ? "Ex: 1000" : "Ex: 20"}
                    className={`w-full bg-slate-50 border ${thresholdError ? 'border-red-300 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} text-slate-900 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:ring-2 outline-none`}
                  />
                  <span className={`absolute right-4 top-1/2 -translate-y-1/2 font-medium ${thresholdError ? 'text-red-400' : 'text-slate-400'}`}>
                    {type === 'revenue_drop' ? '€' : '%'}
                  </span>
                </div>
                {thresholdError ? (
                  <p className="text-xs text-red-500 mt-1.5 font-medium">{thresholdError}</p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    {type === 'revenue_drop' 
                      ? 'Vous serez alerté si le CA est inférieur à ce montant.' 
                      : 'Vous serez alerté si l\'utilisation varie de plus de ce pourcentage (à la hausse ou à la baisse).'}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fréquence d'évaluation</label>
                <select 
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="daily">Quotidienne</option>
                  <option value="weekly">Hebdomadaire</option>
                  <option value="monthly">Mensuelle</option>
                </select>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-slate-700">Alerte active</span>
                </label>
              </div>

              <div className="pt-6 flex gap-3">
                <button 
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Annuler
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  {editingAlert ? 'Enregistrer' : 'Créer l\'alerte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
