import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, updateDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage, Language } from '../contexts/LanguageContext';
import { User, Establishment } from '../types';
import { handleFirestoreError } from '../utils/errorHandling';
import { OperationType } from '../types';
import { Settings as SettingsIcon, Users, Shield, Building2, Check, X, Trash2, Globe, HelpCircle, ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { POSSyncLogs } from '../components/POSSyncLogs';
import { exportToGoogleSheets } from '../utils/workspaceExport';
import { Revenue } from '../types';

export function Settings() {
  const navigate = useNavigate();
  const { userProfile, updateUserProfile } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'users' | 'integrations'>('profile');
  
  // Edit Profile State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(userProfile?.displayName || '');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  
  // Edit User State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<'admin' | 'manager'>('manager');
  const [editEstIds, setEditEstIds] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmUpdateModalOpen, setIsConfirmUpdateModalOpen] = useState(false);

  // Create User State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'manager'>('manager');
  const [newUserEstIds, setNewUserEstIds] = useState<string[]>([]);
  const [createError, setCreateError] = useState('');

  // POS Smart Sync Configuration State
  const [posApiKey, setPosApiKey] = useState(userProfile?.posApiKey || '');
  const [posClientId, setPosClientId] = useState(userProfile?.posClientId || '');
  const [isSavingPOS, setIsSavingPOS] = useState(false);
  const [posSuccessMsg, setPosSuccessMsg] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  // Workspace Export State
  const { googleAccessToken, login } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile) {
      setPosApiKey(userProfile.posApiKey || '');
      setPosClientId(userProfile.posClientId || '');
    }
  }, [userProfile]);

  useEffect(() => {
    const fetchData = async () => {
      if (!userProfile) return;
      setLoading(true);
      try {
        // Fetch establishments for everyone (managers need to see their names)
        const estQuery = query(collection(db, 'establishments'));
        const estSnap = await getDocs(estQuery);
        const estData = estSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) } as Establishment));
        setEstablishments(estData);

        // Fetch users only if admin
        if (userProfile.role === 'admin') {
          const usersQuery = query(collection(db, 'users'));
          const usersSnap = await getDocs(usersQuery);
          const usersData = usersSnap.docs.map(doc => ({ uid: doc.id, ...(doc.data() as any) } as User));
          setUsers(usersData);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'settings_data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userProfile]);

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditEstIds(user.establishmentIds);
    setIsModalOpen(true);
  };

  const handleUpdateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || userProfile?.role !== 'admin') return;
    setIsConfirmUpdateModalOpen(true);
  };

  const executeUpdateUser = async () => {
    if (!editingUser || userProfile?.role !== 'admin') return;

    try {
      await updateDoc(doc(db, 'users', editingUser.uid), {
        role: editRole,
        establishmentIds: editEstIds,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, role: editRole, establishmentIds: editEstIds } : u));
      setIsConfirmUpdateModalOpen(false);
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${editingUser.uid}`);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (userProfile?.role !== 'admin') return;
    setCreateError('');

    if (!newUserEmail || !newUserEmail.includes('@')) {
      setCreateError('Veuillez entrer une adresse email valide.');
      return;
    }

    if (users.some(u => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
      setCreateError('Un utilisateur avec cet email existe déjà.');
      return;
    }

    try {
      const { setDoc, getDoc } = await import('firebase/firestore');
      const userRef = doc(db, 'users', newUserEmail.toLowerCase());
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setCreateError('Un utilisateur avec cet email existe déjà.');
        return;
      }

      // Create a document with the email as the ID
      // When the user logs in, AuthContext will migrate this to their actual UID
      const newUserDoc = {
        email: newUserEmail.toLowerCase(),
        displayName: '',
        role: newUserRole,
        establishmentIds: newUserRole === 'admin' ? [] : newUserEstIds,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(userRef, newUserDoc);
      
      // Update local state
      setUsers([...users, { uid: newUserEmail.toLowerCase(), ...newUserDoc, createdAt: new Date() } as User]);
      setIsCreateModalOpen(false);
      setNewUserEmail('');
      setNewUserRole('manager');
      setNewUserEstIds([]);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `users/${newUserEmail.toLowerCase()}`);
      setCreateError('Une erreur est survenue lors de la création de l\'utilisateur.');
    }
  };

  const [userToDelete, setUserToDelete] = useState<User | null>(null);

  const handleDeleteUser = async () => {
    if (userProfile?.role !== 'admin' || !userToDelete || userToDelete.uid === userProfile.uid) return;
    
    try {
      const { deleteDoc, collection, query, where, getDocs } = await import('firebase/firestore');
      
      // Delete user's alerts
      const alertsQuery = query(collection(db, 'alerts'), where('userId', '==', userToDelete.uid));
      const alertsSnap = await getDocs(alertsQuery);
      const deleteAlertsPromises = alertsSnap.docs.map(docSnap => deleteDoc(doc(db, 'alerts', docSnap.id)));
      await Promise.all(deleteAlertsPromises);

      // Delete the user
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      
      setUsers(users.filter(u => u.uid !== userToDelete.uid));
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete.uid}`);
    }
  };

  const toggleEstablishment = (estId: string) => {
    setEditEstIds(prev => 
      prev.includes(estId) 
        ? prev.filter(id => id !== estId)
        : [...prev, estId]
    );
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;

    setIsSavingProfile(true);
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        displayName: editDisplayName,
        updatedAt: serverTimestamp()
      });
      
      updateUserProfile({ displayName: editDisplayName });
      setIsEditingProfile(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}`);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleConnectPOS = async (providerName: string) => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        posProvider: providerName,
        updatedAt: serverTimestamp()
      });
      updateUserProfile({ posProvider: providerName });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}/pos`);
    }
  };

  const handleDisconnectPOS = async () => {
    if (!userProfile) return;
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        posProvider: null,
        posApiKey: null,
        posClientId: null,
        updatedAt: serverTimestamp()
      });
      updateUserProfile({ posProvider: undefined, posApiKey: undefined, posClientId: undefined });
      setPosApiKey('');
      setPosClientId('');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}/pos`);
    }
  };

  const handleWorkspaceExport = async () => {
    if (!userProfile) return;

    const confirmed = window.confirm(
      "Êtes-vous sûr de vouloir exporter les données vers Google Sheets via votre compte Google Workspace ?"
    );
    if (!confirmed) return;

    let currentToken = googleAccessToken;
    if (!currentToken) {
      try {
        await login();
        setExportError("Connecté à Google. Veuillez cliquer à nouveau sur Configurer pour exporter.");
        return;
      } catch (err) {
        setExportError("Connexion Google échouée.");
        return;
      }
    }
    
    setIsExporting(true);
    setExportError(null);
    setExportSuccess(null);
    
    try {
        const q = query(
          collection(db, 'revenues'),
          where('user_id', '==', userProfile.uid)
        );
        const querySnapshot = await getDocs(q);
        const revenuesData = querySnapshot.docs.map(docSnap => ({
          ...docSnap.data(),
          id: docSnap.id
        })) as Revenue[];
        
        const sid = await exportToGoogleSheets(currentToken, revenuesData);
        if (sid) {
          setExportSuccess(`Export réussi: Bilans ajoutés au fichier Sheet.`);
        } else {
          setExportError("Erreur pendant l'exportation. Permision refusée ou réseau instable.");
        }
    } catch(err) {
       console.error(err);
       setExportError("Erreur pendant la récupération des bilans.");
    } finally {
       setIsExporting(false);
    }
  };

  const handleSavePOSConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userProfile) return;
    setIsSavingPOS(true);
    setPosSuccessMsg('');
    try {
      await updateDoc(doc(db, 'users', userProfile.uid), {
        posApiKey: posApiKey,
        posClientId: posClientId,
        updatedAt: serverTimestamp()
      });
      updateUserProfile({ posApiKey, posClientId });
      setPosSuccessMsg('Configuration de l\'API POS enregistrée avec succès !');
      setTimeout(() => setPosSuccessMsg(''), 4000);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${userProfile.uid}/pos_config`);
    } finally {
      setIsSavingPOS(false);
    }
  };

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-slate-400">Chargement...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{t('settings.title')}</h1>
        <p className="text-slate-500 text-sm mt-1">{t('settings.subtitle')}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('profile')}
          className={clsx(
            "px-6 py-3 font-semibold text-sm transition-colors border-b-2",
            activeTab === 'profile' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          {t('settings.profile')}
        </button>
        {userProfile?.role === 'admin' && (
          <button
            onClick={() => setActiveTab('users')}
            className={clsx(
              "px-6 py-3 font-semibold text-sm transition-colors border-b-2",
              activeTab === 'users' 
                ? "border-blue-600 text-blue-600" 
                : "border-transparent text-slate-500 hover:text-slate-700"
            )}
          >
            {t('settings.users')}
          </button>
        )}
        <button
          onClick={() => setActiveTab('integrations')}
          className={clsx(
            "px-6 py-3 font-semibold text-sm transition-colors border-b-2",
            activeTab === 'integrations' 
              ? "border-blue-600 text-blue-600" 
              : "border-transparent text-slate-500 hover:text-slate-700"
          )}
        >
          Intégrations
        </button>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
          <div className="flex items-center gap-6 mb-8">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl uppercase shrink-0">
              {userProfile?.displayName?.charAt(0) || userProfile?.email?.charAt(0) || 'U'}
            </div>
            <div className="flex-1">
              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="flex flex-col gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{t('settings.edit_name')}</label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                      placeholder="Votre nom"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {isSavingProfile ? '...' : t('settings.save')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingProfile(false);
                        setEditDisplayName(userProfile?.displayName || '');
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      {t('settings.cancel')}
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold text-slate-900">{userProfile?.displayName || 'Utilisateur'}</h2>
                    <button
                      onClick={() => {
                        setEditDisplayName(userProfile?.displayName || '');
                        setIsEditingProfile(true);
                      }}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                    >
                      {t('settings.edit')}
                    </button>
                  </div>
                  <p className="text-slate-500">{userProfile?.email}</p>
                  <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    <Shield size={14} />
                    {userProfile?.role === 'admin' ? t('settings.admin') : t('settings.manager')}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="space-y-8">
            {/* Language Selector */}
            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                <Globe size={16} className="text-slate-400" /> {t('settings.language')}
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {(['fr', 'en', 'zh'] as Language[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={clsx(
                      "flex items-center justify-between px-4 py-3 rounded-xl border-2 transition-all text-left",
                      language === lang 
                        ? "border-blue-600 bg-blue-50 text-blue-900" 
                        : "border-slate-200 hover:border-slate-300 bg-white text-slate-700"
                    )}
                  >
                    <span className="font-semibold">{t(`settings.language.${lang}`)}</span>
                    {language === lang && <Check size={18} className="text-blue-600 ml-3" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-slate-400" /> {t('settings.my_establishments')}
              </h3>
              {userProfile?.role === 'admin' ? (
                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  En tant qu'administrateur, vous avez accès à <strong>tous les établissements</strong>.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userProfile?.establishmentIds.length === 0 ? (
                    <p className="text-sm text-slate-500 italic">Aucun établissement assigné.</p>
                  ) : (
                    userProfile?.establishmentIds.map(id => {
                      const est = establishments.find(e => e.id === id);
                      return (
                        <span key={id} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-100">
                          {est?.name || 'Établissement inconnu'}
                        </span>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="pt-8 border-t border-slate-100 mt-4">
              <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl shadow-blue-200">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-12 translate-x-12 blur-2xl" />
                <div className="relative z-10 flex flex-col sm:flex-row items-center gap-6">
                  <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shrink-0">
                    <HelpCircle size={32} className="text-white" />
                  </div>
                  <div className="text-center sm:text-left space-y-1 flex-1">
                    <h3 className="text-xl font-bold">Nouveau sur l'application ?</h3>
                    <p className="text-blue-100 text-sm font-medium">Découvrez comment exploiter tout le potentiel de NordicRevenueS avec notre guide interactif.</p>
                  </div>
                  <button 
                    onClick={() => navigate('/guide')}
                    className="px-6 py-3 bg-white text-blue-700 font-black text-sm rounded-xl hover:bg-blue-50 transition-all active:scale-95 flex items-center gap-2 shrink-0"
                  >
                    Voir le Guide <ArrowRight size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Users Tab (Admin Only) */}
      {activeTab === 'users' && userProfile?.role === 'admin' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Users size={20} className="text-blue-600" /> Liste des Utilisateurs
            </h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ajouter un utilisateur
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="px-6 py-4">Utilisateur</th>
                  <th className="px-6 py-4">Rôle</th>
                  <th className="px-6 py-4">Établissements</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map(user => (
                  <tr key={user.uid} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{user.displayName || 'Sans nom'}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={clsx(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold",
                        user.role === 'admin' ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                      )}>
                        {user.role === 'admin' ? 'Admin' : 'Manager'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'admin' ? (
                        <span className="text-slate-500 text-xs italic">Tous</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {user.establishmentIds.slice(0, 2).map(id => {
                            const est = establishments.find(e => e.id === id);
                            return (
                              <span key={id} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs truncate max-w-[120px]">
                                {est?.name || 'Inconnu'}
                              </span>
                            );
                          })}
                          {user.establishmentIds.length > 2 && (
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">
                              +{user.establishmentIds.length - 2}
                            </span>
                          )}
                          {user.establishmentIds.length === 0 && (
                            <span className="text-slate-400 text-xs italic">Aucun</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      {user.uid !== userProfile.uid && (
                        <>
                          <button 
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Gérer
                          </button>
                          <button 
                            onClick={() => setUserToDelete(user)}
                            className="text-red-600 hover:text-red-800 font-medium text-sm"
                          >
                            Supprimer
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Integrations Tab */}
      {activeTab === 'integrations' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden max-w-4xl">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Globe size={20} className="text-blue-600" /> Smart Sync POS
              </h2>
              <p className="text-slate-500 text-sm mt-1">Connectez votre logiciel de caisse pour une synchronisation automatique et nocturne du chiffre d'affaires.</p>
            </div>
            <div className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200">
              Nouveau
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { name: 'Lightspeed', description: 'Synchronisation CA et modes de paiement', icon: '💰', color: 'bg-red-50 text-red-600 border-red-200' },
                { name: 'Zettle', description: 'Import transactionnel journalier', icon: '💳', color: 'bg-emerald-50 text-emerald-600 border-emerald-200' },
                { name: 'Square', description: 'API complète (ventes, tva, paiements) ', icon: '⬛', color: 'bg-slate-100 text-slate-800 border-slate-300' },
                { name: 'Zelty', description: 'Restaurateurs connectés', icon: '🍔', color: 'bg-orange-50 text-orange-600 border-orange-200' },
                { name: 'Popina', description: 'Caisse iPad', icon: '📱', color: 'bg-blue-50 text-blue-600 border-blue-200' },
                { name: 'Addition', description: 'Lien API', icon: '🧾', color: 'bg-purple-50 text-purple-600 border-purple-200' }
              ].map(pos => {
                const isConnected = userProfile?.posProvider === pos.name;
                return (
                  <div key={pos.name} className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:shadow-sm transition-all group">
                    <div className="flex items-center gap-4">
                       <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl border ${pos.color}`}>
                         {pos.icon}
                       </div>
                       <div>
                         <h3 className="font-bold text-slate-900">{pos.name}</h3>
                         <p className="text-xs text-slate-500">{pos.description}</p>
                       </div>
                    </div>
                    <div>
                      {isConnected ? (
                        <button 
                          onClick={handleDisconnectPOS}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-lg border border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                        >
                          <Check size={14} /> Connecté
                        </button>
                      ) : (
                        <button 
                          onClick={() => handleConnectPOS(pos.name)}
                          disabled={!!userProfile?.posProvider}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-slate-600 font-bold text-xs rounded-lg border border-slate-200 hover:border-slate-300 transition-colors disabled:opacity-50"
                        >
                          Connecter
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Note informative */}
              <div className="md:col-span-2 bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-start gap-3 mt-2">
                <Sparkles size={18} className="text-blue-600 mt-1 shrink-0" />
                <div className="text-sm text-blue-800 leading-relaxed">
                  <span className="font-bold">Comment ça marche ?</span> Une fois votre logiciel de caisse connecté, un bouton <span className="font-bold underline">Smart Sync</span> apparaîtra sur votre page de saisie des revenus. En un clic, vous pourrez importer automatiquement les chiffres de la journée, ventilés par mode de paiement.
                </div>
              </div>

              {/* Configuration Panel for Active POS */}
              {userProfile?.posProvider && (
                <div className="md:col-span-2 border border-blue-100 bg-slate-50/50 rounded-2xl p-6 mt-4 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
                        ⚙️
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">Configuration API - {userProfile.posProvider}</h3>
                        <p className="text-xs text-slate-500">Saisissez vos identifiants de connexion Smart Sync</p>
                      </div>
                    </div>
                    <div className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                      Prêt pour Smart Sync
                    </div>
                  </div>

                  <form onSubmit={handleSavePOSConfig} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Client ID / App ID Field */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                          Identifiant Client / Application (Client ID)
                        </label>
                        <input
                          type="text"
                          value={posClientId}
                          onChange={(e) => setPosClientId(e.target.value)}
                          placeholder="ex: prod_client_id_8123h12h"
                          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400"
                        />
                      </div>

                      {/* API Key Field */}
                      <div>
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                          Clé Secrète de l'API (API Key / Token)
                        </label>
                        <div className="relative">
                          <input
                            type={showApiKey ? 'text' : 'password'}
                            value={posApiKey}
                            onChange={(e) => setPosApiKey(e.target.value)}
                            placeholder="••••••••••••••••••••••••••••••••"
                            className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs font-bold text-slate-500 hover:text-slate-800"
                          >
                            {showApiKey ? "Masquer" : "Afficher"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Developer Guide Snippet depending on selected POS */}
                    <div className="bg-white border border-slate-200 p-3.5 rounded-xl text-xs text-slate-600 leading-relaxed font-medium">
                      <span className="font-bold text-slate-800">Instructions d'accès {userProfile.posProvider} : </span>
                      {userProfile.posProvider === 'Zettle' && "Rendez-vous sur le PayPal Developer Portal (section SDKs/Zettle), créez une application API pour obtenir vos identifiants API (OAuth API credentials)."}
                      {userProfile.posProvider === 'Lightspeed' && "Dans votre back-office Lightspeed, accédez à Configuration > Extensions > Développeurs et demandez vos jetons d'accès API de production."}
                      {userProfile.posProvider === 'Square' && "Générez un Application ID et un Personal Access Token (Sandbox ou Production) sur le Square Developer Dashboard."}
                      {userProfile.posProvider === 'Zelty' && "Rendez-vous dans la section Marketplace de votre espace Zelty, configurez une clé d'accès d'intégration API externe."}
                      {userProfile.posProvider === 'Popina' && "Contactez le support technique Popina ou accédez à l'espace d'intégration tiers de votre compte Popina Cloud."}
                      {userProfile.posProvider === 'Addition' && "Votre chargé de clientèle Addition peut vous fournir un Token unique d'interopérabilité API."}
                    </div>

                    {/* Submit Actions */}
                    <div className="flex items-center justify-between pt-2">
                      <div className="text-xs">
                        {posSuccessMsg && (
                          <span className="text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                            <Check size={14} /> {posSuccessMsg}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleDisconnectPOS}
                          className="px-4 py-2 text-xs font-bold text-rose-600 bg-white border border-rose-200 hover:border-rose-300 rounded-xl transition-all"
                        >
                          Déconnecter
                        </button>
                        <button
                          type="submit"
                          disabled={isSavingPOS}
                          className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-95 disabled:opacity-50 rounded-xl transition-all shadow-sm shadow-blue-100"
                        >
                          {isSavingPOS ? "Enregistrement..." : "Sauvegarder les identifiants"}
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Smart Sync Diagnostics Log widget */}
                  <div className="mt-8 pt-6 border-t border-slate-200/60 font-semibold text-slate-700">
                    <POSSyncLogs />
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Google Workspace Integration */}
          <div className="p-6 border-t border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50">
            <div>
              <h3 className="font-bold text-slate-900 text-base mb-1">Export Google Workspace (Drive & Sheets)</h3>
              <p className="text-sm text-slate-500 mb-2">
                Exportez automatiquement vos bilans journaliers vers le Google Drive de votre comptable à minuit.
              </p>
              {exportError && (
                <div className="text-xs bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg border border-rose-100 inline-block font-bold">
                  {exportError}
                </div>
              )}
              {exportSuccess && (
                <div className="text-xs bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg border border-emerald-100 inline-block font-bold mt-1">
                  {exportSuccess}
                </div>
              )}
            </div>
            
            <button 
              onClick={handleWorkspaceExport}
              disabled={isExporting}
              className="px-4 py-2 bg-slate-900 text-white font-bold text-sm rounded-xl hover:bg-slate-800 transition-colors shrink-0 flex items-center justify-center gap-2 w-full md:w-auto disabled:opacity-50"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white" />
              ) : googleAccessToken ? (
                <span>Exporter vers Sheets</span>
              ) : (
                <span>Connecter Google & Exporter</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Gérer l'utilisateur</h2>
                <p className="text-sm text-slate-500 mt-1">{editingUser.email}</p>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleUpdateUser} className="p-6 overflow-y-auto flex-1 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Rôle</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setEditRole('manager')}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      editRole === 'manager' 
                        ? "border-blue-600 bg-blue-50" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      Manager
                      {editRole === 'manager' && <Check size={18} className="text-blue-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Accès limité aux établissements assignés.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditRole('admin')}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      editRole === 'admin' 
                        ? "border-purple-600 bg-purple-50" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      Administrateur
                      {editRole === 'admin' && <Check size={18} className="text-purple-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Accès total à tous les établissements et paramètres.</div>
                  </button>
                </div>
              </div>
              
              {editRole === 'manager' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Établissements assignés</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {establishments.map(est => (
                      <label 
                        key={est.id} 
                        className={clsx(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                          editEstIds.includes(est.id)
                            ? "border-blue-200 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={editEstIds.includes(est.id)}
                          onChange={() => toggleEstablishment(est.id)}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-900 text-sm">{est.name}</span>
                      </label>
                    ))}
                    {establishments.length === 0 && (
                      <p className="text-sm text-slate-500 italic">Aucun établissement disponible.</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Update Modal */}
      {isConfirmUpdateModalOpen && editingUser && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-4 mx-auto">
                <Users size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
                Confirmer les modifications
              </h2>
              <p className="text-slate-500 text-center mb-6">
                Êtes-vous sûr de vouloir appliquer ces modifications à l'utilisateur <strong className="text-slate-900">{editingUser.email}</strong> ?
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setIsConfirmUpdateModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={executeUpdateUser}
                  className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mb-4 mx-auto">
                <Trash2 size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
                Supprimer l'utilisateur
              </h2>
              <p className="text-slate-500 text-center mb-6">
                Êtes-vous sûr de vouloir supprimer l'utilisateur <strong className="text-slate-900">{userToDelete.email}</strong> ? Cette action est irréversible.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="flex-1 bg-red-600 text-white font-bold py-2.5 rounded-xl hover:bg-red-700 transition-colors"
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Ajouter un utilisateur</h2>
                <p className="text-sm text-slate-500 mt-1">L'utilisateur pourra se connecter avec cet email.</p>
              </div>
              <button 
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateUser} className="p-6 overflow-y-auto flex-1 space-y-6">
              {createError && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100">
                  {createError}
                </div>
              )}

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Adresse email</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="email@exemple.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-3">Rôle</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewUserRole('manager')}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      newUserRole === 'manager' 
                        ? "border-blue-600 bg-blue-50" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      Manager
                      {newUserRole === 'manager' && <Check size={18} className="text-blue-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Accès limité aux établissements assignés.</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewUserRole('admin')}
                    className={clsx(
                      "p-4 rounded-xl border-2 text-left transition-all",
                      newUserRole === 'admin' 
                        ? "border-purple-600 bg-purple-50" 
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className="font-bold text-slate-900 flex items-center justify-between">
                      Administrateur
                      {newUserRole === 'admin' && <Check size={18} className="text-purple-600" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Accès total à tous les établissements et paramètres.</div>
                  </button>
                </div>
              </div>
              
              {newUserRole === 'manager' && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">Établissements assignés</label>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {establishments.map(est => (
                      <label 
                        key={est.id} 
                        className={clsx(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors",
                          newUserEstIds.includes(est.id)
                            ? "border-blue-200 bg-blue-50"
                            : "border-slate-200 hover:bg-slate-50"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={newUserEstIds.includes(est.id)}
                          onChange={() => {
                            setNewUserEstIds(prev => 
                              prev.includes(est.id) 
                                ? prev.filter(id => id !== est.id)
                                : [...prev, est.id]
                            );
                          }}
                          className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                        />
                        <span className="font-medium text-slate-900 text-sm">{est.name}</span>
                      </label>
                    ))}
                    {establishments.length === 0 && (
                      <p className="text-sm text-slate-500 italic">Aucun établissement disponible.</p>
                    )}
                  </div>
                </div>
              )}
              
              <div className="pt-4 flex gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
