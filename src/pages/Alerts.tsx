import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { AlertRule, Establishment, AlertType, Payments } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { Bell, Plus, Edit2, Trash2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import clsx from 'clsx';

export function Alerts() {
  const { userProfile } = useAuth();
  const [alerts, setAlerts] = useState<AlertRule[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAlert, setEditingAlert] = useState<AlertRule | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState<AlertType>('revenue_drop');
  const [establishmentId, setEstablishmentId] = useState('all');
  const [threshold, setThreshold] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<keyof Payments>('cb');
  const [timeframe, setTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (userProfile) {
      fetchData();
    }
  }, [userProfile]);

  const fetchData = async () => {
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
  };

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
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAlert(null);
  };

  const saveAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    try {
      const alertData = {
        userId: userProfile.uid,
        name,
        type,
        establishmentId,
        threshold: Number(threshold),
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
    } catch (error) {
      handleFirestoreError(error, editingAlert ? OperationType.UPDATE : OperationType.CREATE, 'alerts');
    }
  };

  const deleteAlert = async (id: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) return;
    try {
      await deleteDoc(doc(db, 'alerts', id));
      fetchData();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `alerts/${id}`);
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {alerts.map(alert => (
            <div key={alert.id} className={clsx(
              "bg-white rounded-2xl border p-6 shadow-sm transition-all",
              alert.isActive ? "border-slate-200" : "border-slate-200 opacity-60"
            )}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={clsx(
                    "p-2 rounded-xl",
                    alert.type === 'revenue_drop' ? "bg-rose-50 text-rose-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {alert.type === 'revenue_drop' ? <AlertTriangle size={20} /> : <Bell size={20} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{alert.name}</h3>
                    <p className="text-xs text-slate-500">
                      {alert.establishmentId === 'all' 
                        ? 'Tous les établissements' 
                        : establishments.find(e => e.id === alert.establishmentId)?.name || 'Établissement inconnu'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleAlertStatus(alert)}
                  className={clsx(
                    "p-1.5 rounded-lg transition-colors",
                    alert.isActive ? "text-emerald-600 hover:bg-emerald-50" : "text-slate-400 hover:bg-slate-100"
                  )}
                  title={alert.isActive ? "Désactiver" : "Activer"}
                >
                  <CheckCircle2 size={20} />
                </button>
              </div>

              <div className="space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Type</span>
                  <span className="font-medium text-slate-900">
                    {alert.type === 'revenue_drop' ? 'Baisse de CA' : 'Variation Paiement'}
                  </span>
                </div>
                {alert.type === 'payment_method_change' && alert.paymentMethod && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Moyen</span>
                    <span className="font-medium text-slate-900">{paymentMethodLabels[alert.paymentMethod] || alert.paymentMethod}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Seuil</span>
                  <span className="font-medium text-rose-600">
                    {alert.type === 'revenue_drop' ? `< ${alert.threshold} €` : `> ${alert.threshold} %`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Fréquence</span>
                  <span className="font-medium text-slate-900">
                    {alert.timeframe === 'daily' ? 'Quotidienne' : alert.timeframe === 'weekly' ? 'Hebdomadaire' : 'Mensuelle'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button 
                  onClick={() => openModal(alert)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Modifier"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => deleteAlert(alert.id)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Supprimer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
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
                    min="0"
                    step={type === 'revenue_drop' ? "10" : "1"}
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value ? Number(e.target.value) : '')}
                    placeholder={type === 'revenue_drop' ? "Ex: 1000" : "Ex: 20"}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl pl-4 pr-10 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 font-medium">
                    {type === 'revenue_drop' ? '€' : '%'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {type === 'revenue_drop' 
                    ? 'Vous serez alerté si le CA est inférieur à ce montant.' 
                    : 'Vous serez alerté si l\'utilisation varie de plus de ce pourcentage (à la hausse ou à la baisse).'}
                </p>
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
