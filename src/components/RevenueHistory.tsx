import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, deleteDoc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { Revenue, Payments } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { Edit2, Trash2, X, Save, Paperclip, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface RevenueHistoryProps {
  establishmentId: string;
  refreshTrigger: number;
}

export function RevenueHistory({ establishmentId, refreshTrigger }: RevenueHistoryProps) {
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingRevenue, setEditingRevenue] = useState<Revenue | null>(null);
  const [deletingRevenue, setDeletingRevenue] = useState<Revenue | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    const fetchRevenues = async () => {
      if (!establishmentId) return;
      setLoading(true);
      try {
        const q = query(
          collection(db, 'revenues'),
          where('establishmentId', '==', establishmentId),
          orderBy('date', 'desc'),
          limit(30)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Revenue));
        setRevenues(data);
        setCurrentPage(1); // Reset to first page on new data
      } catch (error) {
        handleFirestoreError(error, OperationType.LIST, 'revenues');
      } finally {
        setLoading(false);
      }
    };

    fetchRevenues();
  }, [establishmentId, refreshTrigger]);

  const handleDelete = async () => {
    if (!deletingRevenue) return;
    try {
      await deleteDoc(doc(db, 'revenues', deletingRevenue.id));
      setRevenues(prev => prev.filter(r => r.id !== deletingRevenue.id));
      setDeletingRevenue(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'revenues');
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRevenue) return;
    
    try {
      const total = Object.values(editingRevenue.payments).reduce((sum, val) => sum + (Number(val) || 0), 0);
      
      await updateDoc(doc(db, 'revenues', editingRevenue.id), {
        date: editingRevenue.date,
        service: editingRevenue.service,
        payments: editingRevenue.payments,
        notes: editingRevenue.notes || '',
        total: total,
        updatedAt: new Date()
      });
      
      setRevenues(prev => prev.map(r => r.id === editingRevenue.id ? { ...editingRevenue, total } : r));
      setEditingRevenue(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'revenues');
    }
  };

  const handlePaymentChange = (field: keyof Payments, value: string) => {
    if (!editingRevenue) return;
    const numValue = value === '' ? 0 : parseFloat(value);
    setEditingRevenue({
      ...editingRevenue,
      payments: {
        ...editingRevenue.payments,
        [field]: isNaN(numValue) ? 0 : numValue
      }
    });
  };

  const totalPages = Math.ceil(revenues.length / itemsPerPage);
  const paginatedRevenues = revenues.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  if (!establishmentId) return null;

  return (
    <div className="mt-12 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900 mb-6">Historique récent (30 dernières saisies)</h2>
      
      {loading ? (
        <div className="text-center py-8 text-slate-500">Chargement de l'historique...</div>
      ) : revenues.length === 0 ? (
        <div className="text-center py-8 text-slate-500">Aucune saisie récente trouvée.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50">
              <tr className="border-b border-slate-200 text-sm text-slate-500">
                <th className="py-3 px-4 font-semibold">Date</th>
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Notes</th>
                <th className="py-3 px-4 font-semibold">Pièces jointes</th>
                <th className="py-3 px-4 font-semibold text-right">Total</th>
                <th className="py-3 px-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {paginatedRevenues.map(revenue => (
                <tr key={revenue.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-900">
                    {format(parseISO(revenue.date), 'dd MMM yyyy', { locale: fr })}
                  </td>
                  <td className="py-3 px-4 capitalize text-slate-600">{revenue.service}</td>
                  <td className="py-3 px-4 text-slate-500 max-w-[200px] truncate relative group" title={revenue.notes}>
                    {revenue.notes || '-'}
                    {revenue.notes && revenue.notes.length > 25 && (
                      <div className="absolute left-0 bottom-full mb-2 hidden group-hover:block w-max max-w-xs bg-slate-800 text-white text-xs rounded-lg p-2 z-10 shadow-lg whitespace-normal break-words">
                        {revenue.notes}
                        <div className="absolute left-4 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {revenue.attachments && revenue.attachments.length > 0 ? (
                      <div className="flex -space-x-2">
                        {revenue.attachments.slice(0, 3).map((att) => (
                          <a 
                            key={att.url} 
                            href={att.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:z-10 transition-colors"
                            title={att.name}
                          >
                            <Paperclip size={14} />
                          </a>
                        ))}
                        {revenue.attachments.length > 3 && (
                          <div className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs font-medium text-slate-600">
                            +{revenue.attachments.length - 3}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {revenue.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingRevenue(revenue)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingRevenue(revenue)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
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
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4">
          <div className="text-sm text-slate-500">
            Affichage de <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> à <span className="font-medium">{Math.min(currentPage * itemsPerPage, revenues.length)}</span> sur <span className="font-medium">{revenues.length}</span> saisies
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Page précédente"
            >
              <ChevronLeft size={18} />
            </button>
            <div className="text-sm font-medium text-slate-700 px-2">
              Page {currentPage} sur {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Page suivante"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingRevenue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
                Supprimer la saisie
              </h2>
              <p className="text-slate-500 text-center mb-6">
                Êtes-vous sûr de vouloir supprimer la saisie du <strong>{format(parseISO(deletingRevenue.date), 'dd/MM/yyyy')} ({deletingRevenue.service})</strong> d'un montant de <strong>{deletingRevenue.total.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}</strong> ? Cette action est irréversible.
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingRevenue(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingRevenue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Modifier la saisie</h3>
              <button
                type="button"
                onClick={() => setEditingRevenue(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleUpdate} className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                  <input
                    type="date"
                    value={editingRevenue.date}
                    onChange={(e) => setEditingRevenue({...editingRevenue, date: e.target.value})}
                    required
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Service</label>
                  <select
                    value={editingRevenue.service}
                    onChange={(e) => setEditingRevenue({...editingRevenue, service: e.target.value as 'midi' | 'soir'})}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="midi">Midi</option>
                    <option value="soir">Soir</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 mb-8">
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Cartes Bancaires</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Paiement Carte</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.cb || ''} onChange={(e) => handlePaymentChange('cb', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Carte Sans Contact</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.cbContactless || ''} onChange={(e) => handlePaymentChange('cbContactless', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">American Express</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Carte AMEX</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.amex || ''} onChange={(e) => handlePaymentChange('amex', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">AMEX Sans Contact</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.amexContactless || ''} onChange={(e) => handlePaymentChange('amexContactless', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Titres-Restaurant</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Carte TR</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.tr || ''} onChange={(e) => handlePaymentChange('tr', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">TR Sans Contact</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.trContactless || ''} onChange={(e) => handlePaymentChange('trContactless', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-900 border-b border-slate-100 pb-2">Autres</h4>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Espèces</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.cash || ''} onChange={(e) => handlePaymentChange('cash', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-500 mb-1">Virement Bancaire</label>
                    <input type="number" step="0.01" min="0" value={editingRevenue.payments.transfer || ''} onChange={(e) => handlePaymentChange('transfer', e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2" />
                  </div>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-semibold text-slate-700 mb-2">Notes</label>
                <textarea
                  value={editingRevenue.notes || ''}
                  onChange={(e) => setEditingRevenue({...editingRevenue, notes: e.target.value})}
                  placeholder="Ajoutez un commentaire sur ce service..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-shadow resize-none h-24"
                />
              </div>

              <div className="flex items-center justify-between pt-6 border-t border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-500 uppercase">Nouveau Total</p>
                  <p className="text-2xl font-black text-blue-600">
                    {Object.values(editingRevenue.payments).reduce((sum, val) => sum + (Number(val) || 0), 0).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
                  </p>
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingRevenue(null)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                  >
                    <Save size={16} /> Mettre à jour
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
