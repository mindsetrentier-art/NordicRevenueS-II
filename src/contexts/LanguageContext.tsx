import React, { createContext, useContext, useState, useEffect } from 'react';

export type Language = 'fr' | 'en' | 'zh';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    'nav.dashboard': 'Tableau de bord',
    'nav.entry': 'Saisie Recettes',
    'nav.reports': 'Rapports',
    'nav.establishments': 'Établissements',
    'nav.alerts': 'Alertes',
    'nav.reviews': 'Avis Clients',
    'nav.settings': 'Paramètres',
    'nav.logout': 'Déconnexion',
    'settings.title': 'Paramètres',
    'settings.subtitle': 'Gérez votre profil et les accès de votre équipe.',
    'settings.profile': 'Mon Profil',
    'settings.users': 'Utilisateurs & Accès',
    'settings.language': 'Langue de l\'interface',
    'settings.language.fr': 'Français',
    'settings.language.en': 'Anglais (English)',
    'settings.language.zh': 'Chinois (中文)',
    'settings.edit_name': 'Nom d\'affichage',
    'settings.save': 'Enregistrer',
    'settings.cancel': 'Annuler',
    'settings.edit': 'Modifier',
    'settings.admin': 'Administrateur',
    'settings.manager': 'Manager',
    'settings.my_establishments': 'Mes Établissements',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.entry': 'Revenue Entry',
    'nav.reports': 'Reports',
    'nav.establishments': 'Establishments',
    'nav.alerts': 'Alerts',
    'nav.reviews': 'Customer Reviews',
    'nav.settings': 'Settings',
    'nav.logout': 'Logout',
    'settings.title': 'Settings',
    'settings.subtitle': 'Manage your profile and team access.',
    'settings.profile': 'My Profile',
    'settings.users': 'Users & Access',
    'settings.language': 'Interface Language',
    'settings.language.fr': 'French (Français)',
    'settings.language.en': 'English',
    'settings.language.zh': 'Chinese (中文)',
    'settings.edit_name': 'Display Name',
    'settings.save': 'Save',
    'settings.cancel': 'Cancel',
    'settings.edit': 'Edit',
    'settings.admin': 'Administrator',
    'settings.manager': 'Manager',
    'settings.my_establishments': 'My Establishments',
  },
  zh: {
    'nav.dashboard': '仪表板',
    'nav.entry': '收入录入',
    'nav.reports': '报告',
    'nav.establishments': '机构',
    'nav.alerts': '警报',
    'nav.reviews': '客户评价',
    'nav.settings': '设置',
    'nav.logout': '登出',
    'settings.title': '设置',
    'settings.subtitle': '管理您的个人资料和团队访问权限。',
    'settings.profile': '我的个人资料',
    'settings.users': '用户与访问',
    'settings.language': '界面语言',
    'settings.language.fr': '法语 (Français)',
    'settings.language.en': '英语 (English)',
    'settings.language.zh': '中文',
    'settings.edit_name': '显示名称',
    'settings.save': '保存',
    'settings.cancel': '取消',
    'settings.edit': '编辑',
    'settings.admin': '管理员',
    'settings.manager': '经理',
    'settings.my_establishments': '我的机构',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'fr' || saved === 'en' || saved === 'zh') ? saved : 'fr';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('app_language', lang);
  };

  const t = (key: string) => {
    return translations[language][key as keyof typeof translations['fr']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
