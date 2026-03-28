import React, { useState, useEffect, useCallback } from 'react';
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Establishment } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { Store, Plus, Edit2, Trash2, X, Check, AlertCircle } from 'lucide-react';

export function Establishments() {
  const { userProfile } = useAuth();
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [estToDelete, setEstToDelete] = useState<Establishment | null>(null);
  const [editingEst, setEditingEst] = useState<Establishment | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');

  const fetchEstablishments = useCallback(async () => {
    if (!userProfile) return;
    setLoading(true);
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
      handleFirestoreError(error, OperationType.GET, 'establishments');
    } finally {
      setLoading(false);
    }
  }, [userProfile]);

  useEffect(() => {
    fetchEstablishments();
  }, [fetchEstablishments]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setError(null);

    try {
      if (editingEst) {
        if (userProfile.role !== 'admin' && editingEst.createdBy !== userProfile.uid) {
          alert("Vous n'êtes pas autorisé à modifier cet établissement.");
          return;
        }
        await updateDoc(doc(db, 'establishments', editingEst.id), {
          name,
          address,
          city,
          postalCode,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'establishments'), {
          name,
          address,
          city,
          postalCode,
          createdBy: userProfile.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      
      setIsModalOpen(false);
      resetForm();
      fetchEstablishments();
    } catch (err) {
      console.error("Error saving establishment:", err);
      setError("Une erreur est survenue lors de l'enregistrement. Veuillez réessayer.");
      handleFirestoreError(err, editingEst ? OperationType.UPDATE : OperationType.CREATE, 'establishments');
    }
  };

  const handleDeleteClick = (est: Establishment) => {
    setEstToDelete(est);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!userProfile || !estToDelete) return;
    
    if (userProfile.role !== 'admin' && estToDelete.createdBy !== userProfile.uid) {
      // Use a custom modal or just return if not authorized
      setIsDeleteModalOpen(false);
      setEstToDelete(null);
      return;
    }
    
    try {
      // Delete associated revenues
      const revenuesQuery = query(collection(db, 'revenues'), where('establishmentId', '==', estToDelete.id));
      const revenuesSnap = await getDocs(revenuesQuery);
      const deleteRevenuesPromises = revenuesSnap.docs.map(docSnap => deleteDoc(doc(db, 'revenues', docSnap.id)));
      await Promise.all(deleteRevenuesPromises);

      // Delete associated alerts
      const alertsQuery = query(collection(db, 'alerts'), where('establishmentId', '==', estToDelete.id));
      const alertsSnap = await getDocs(alertsQuery);
      const deleteAlertsPromises = alertsSnap.docs.map(docSnap => deleteDoc(doc(db, 'alerts', docSnap.id)));
      await Promise.all(deleteAlertsPromises);

      // Remove establishmentId from users
      const usersQuery = query(collection(db, 'users'), where('establishmentIds', 'array-contains', estToDelete.id));
      const usersSnap = await getDocs(usersQuery);
      const updateUsersPromises = usersSnap.docs.map(docSnap => {
        const userData = docSnap.data();
        const updatedEstIds = (userData.establishmentIds || []).filter((id: string) => id !== estToDelete.id);
        return updateDoc(doc(db, 'users', docSnap.id), { establishmentIds: updatedEstIds });
      });
      await Promise.all(updateUsersPromises);

      // Finally delete the establishment
      await deleteDoc(doc(db, 'establishments', estToDelete.id));
      
      setIsDeleteModalOpen(false);
      setEstToDelete(null);
      fetchEstablishments();
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `establishments/${estToDelete.id}`);
    }
  };

  const openEditModal = (est: Establishment) => {
    setEditingEst(est);
    setName(est.name);
    setAddress(est.address || '');
    setCity(est.city || '');
    setPostalCode(est.postalCode || '');
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setEditingEst(null);
    setName('');
    setAddress('');
    setCity('');
    setPostalCode('');
  };

  if (!userProfile) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500">
        <Store size={48} className="mb-4 text-slate-300" />
        <p className="text-lg font-medium">Accès restreint</p>
        <p className="text-sm">Vous devez être connecté pour gérer les établissements.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Établissements</h1>
          <p className="text-slate-500 text-sm mt-1">Gérez la liste de vos points de vente.</p>
        </div>
        
        <button 
          onClick={() => { resetForm(); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm shadow-blue-600/20"
        >
          <Plus size={18} /> Ajouter un établissement
        </button>
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center text-slate-400">Chargement...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {establishments.map(est => (
            <div key={est.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                  <Store size={24} />
                </div>
                <div className="flex gap-2">
                  {(userProfile?.role === 'admin' || est.createdBy === userProfile?.uid) && (
                    <>
                      <button 
                        onClick={() => openEditModal(est)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteClick(est)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-slate-900 mb-1">{est.name}</h3>
              <p className="text-sm text-slate-500 flex-1">
                {est.address ? `${est.address}, ${est.postalCode} ${est.city}` : 'Aucune adresse renseignée'}
              </p>
              
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>ID: {est.id.substring(0, 8)}...</span>
              </div>
            </div>
          ))}
          
          {establishments.length === 0 && (
            <div className="col-span-full bg-white p-12 rounded-2xl border border-slate-200 border-dashed flex flex-col items-center justify-center text-slate-500">
              <Store size={48} className="mb-4 text-slate-300" />
              <p className="text-lg font-medium text-slate-900">Aucun établissement</p>
              <p className="text-sm mt-1 text-center max-w-sm">Commencez par ajouter votre premier établissement pour pouvoir y associer des recettes.</p>
              <button 
                onClick={() => { resetForm(); setIsModalOpen(true); }}
                className="mt-6 text-blue-600 font-semibold hover:underline"
              >
                Ajouter maintenant
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">
                {editingEst ? 'Modifier l\'établissement' : 'Nouvel établissement'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-3">
                  <AlertCircle size={20} />
                  <p className="text-sm">{error}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Nom de l'établissement *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: Brasserie Centrale"
                />
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Ex: 123 Rue de la Paix"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Code Postal</label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: 75000"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Ville</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Paris"
                  />
                </div>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!name.trim()}
                  className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {editingEst ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
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
                Supprimer l'établissement
              </h2>
              <p className="text-slate-500 text-center mb-6">
                Êtes-vous sûr de vouloir supprimer "{estToDelete?.name}" ? Cette action est irréversible et supprimera également toutes les données associées.
              </p>
              
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setEstToDelete(null);
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
    </div>
  );
}
