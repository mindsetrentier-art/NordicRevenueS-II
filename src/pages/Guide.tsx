import React from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  CircleDollarSign, 
  LineChart, 
  Building2, 
  Camera, 
  Sparkles, 
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  PieChart,
  FileText
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Guide() {
  const navigate = useNavigate();

  const sections = [
    {
      id: 'getting-started',
      title: 'Bienvenue sur NordicRevenueS',
      icon: BookOpen,
      color: 'bg-indigo-500',
      imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=1000',
      description: 'Bienvenue dans votre centre de pilotage. NordicRevenueS a été conçu pour donner aux restaurateurs une vision cristalline de leur rentabilité, transformant les chiffres bruts en décisions stratégiques.',
      steps: [
        'Profil Personnalisé : Accédez à vos paramètres et préférences dès la connexion.',
        'Sélecteur d\'Établissement : Gérez un ou plusieurs points de vente en toute fluidité.',
        'KPIs de Premier Plan : Suivez votre CA, Ticket Moyen et productivité en temps réel.'
      ],
      tips: [
        'La page Dashboard offre une vue d\'ensemble "Flash" idéale pour un point rapide en plein rush.',
        'Configurez vos objectifs dans les paramètres pour voir les barres de progression s\'animer.'
      ]
    },
    {
      id: 'revenue-entry',
      title: 'Saisie de Recettes & IA Apollo',
      icon: CircleDollarSign,
      color: 'bg-emerald-500',
      imageUrl: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?auto=format&fit=crop&q=80&w=1000',
      description: 'L\'enregistrement de vos revenus n\'a jamais été aussi rapide. NordicRevenueS sépare intelligemment vos flux de trésorerie MIDI et SOIR pour une précision chirurgicale.',
      details: [
        { icon: Camera, title: 'IA Apollo Vision', text: 'Scannez vos tickets Z. Notre IA extrait automatiquement les montants CB, Espèces, AMEX et TR sans saisie manuelle.' },
        { icon: Sparkles, title: 'Segmentation MIDI/SOIR', text: 'Analysez la rentabilité de chaque service séparément pour optimiser vos ouvertures.' },
        { icon: ShieldCheck, title: 'Intégrité des Données', text: 'Chaque saisie est horodatée et géolocalisée pour assurer la fiabilité de vos journaux de caisse.' }
      ],
      tips: [
        'Si l\'IA hésite sur un montant, la cellule devient orange : vérifiez la valeur avant de valider.',
        'Ajoutez des photos des factures fournisseurs dans les notes pour centraliser vos justificatifs.'
      ],
      action: { label: 'Ajouter une recette', path: '/entry' }
    },
    {
      id: 'analytics-adv',
      title: 'Analyse Avancée & Recherche',
      icon: FileText,
      color: 'bg-amber-500',
      imageUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000',
      description: 'Ne vous contentez pas de stocker des chiffres. Utilisez notre moteur de recherche et de filtrage pour explorer votre historique avec une précision totale.',
      details: [
        { icon: Sparkles, title: 'Recherche Intelligente', text: 'Filtrez vos transactions par service, établissement, ou même par type de paiement spécifique (ex: toutes les Amex).' },
        { icon: TrendingUp, title: 'Tri Dynamique', text: 'Triez vos tableaux par CA croissant ou décroissant pour identifier instantanément vos meilleurs services.' },
        { icon: FileText, title: 'Formatage Comptable', text: 'Visualisez vos données dans un format structuré, prêt pour l\'export PDF de haute qualité.' }
      ],
      tips: [
        'Utilisez la barre de recherche rapide pour trouver une transaction spécifique en quelques secondes.',
        'Combinez les filtres (ex: "Établissement A" + "Midi") pour isoler des segments de performance.'
      ],
      action: { label: 'Explorer les données', path: '/reports' }
    },
    {
      id: 'comparisons',
      title: 'Comparaisons & Croissance',
      icon: LineChart,
      color: 'bg-violet-500',
      imageUrl: 'https://images.unsplash.com/photo-1543286386-713bdd548da4?auto=format&fit=crop&q=80&w=1000',
      description: 'Mesurez votre succès en comparant vos performances actuelles à vos historiques. NordicRevenueS gère désormais les comparaisons "Custom".',
      steps: [
        'Comparaison N-1 : Visualisez votre progression par rapport à la même semaine l\'année dernière.',
        'Période Précédente : Comparez vos résultats actuels avec la semaine ou le mois juste avant.',
        'Mode Custom : Choisissez deux plages de dates totalement libres pour une analyse sur mesure (ex: Vacances vs Zone scolaire).'
      ],
      tips: [
        'Luttez contre la saisonnalité en utilisant le mode "Année Précédente" (N-1).',
        'Validez toujours votre période personnalisée avec le bouton "Appliquer" pour rafraîchir les calculs.'
      ]
    },
    {
      id: 'prime-cost',
      title: 'Le Coeur du Business : Prime Cost',
      icon: TrendingUp,
      color: 'bg-rose-500',
      imageUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=1000',
      description: 'Contrôlez vos coûts matières et votre masse salariale pour garantir une marge opérationnelle saine.',
      steps: [
        'Saisie COGS : Enregistrez vos achats de matières premières chaque début de mois.',
        'Labor Cost : Gérez la masse salariale brute incluant les extras et charges.',
        'Ratio de Toxicité : L\'app vous alerte si votre Prime Cost dépasse 65%, signalant un danger immédiat.'
      ],
      tips: [
        'Un Prime Cost stable est le signe d\'une gestion de stock rigoureuse.',
        'Utilisez les alertes de seuil pour être prévenu par notification dès qu\'un ratio dérive.'
      ]
    }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 pb-20">
      {/* Hero Section */}
      <section className="text-center space-y-6 py-16 px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border border-blue-100 mb-2"
        >
          <Sparkles size={12} className="animate-pulse" /> Centre d'Excellence Nordic
        </motion.div>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-6xl md:text-7xl font-black text-slate-900 tracking-tighter leading-[0.9]"
        >
          Maîtrisez votre <span className="text-blue-600 block sm:inline">Succès</span>
        </motion.h1>
        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-slate-500 max-w-xl mx-auto font-medium text-lg leading-relaxed"
        >
          Apprenez à utiliser NordicRevenueS pour transformer chaque service en une opportunité de croissance mesurable.
        </motion.p>
      </section>

      {/* Guide Sections */}
      <div className="space-y-24">
        {sections.map((section, idx) => (
          <motion.section
            key={section.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className={`flex flex-col ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'} gap-12 items-start`}
          >
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className={`p-4 ${section.color} text-white rounded-3xl shadow-2xl shadow-${section.color.split('-')[1]}-200/50`}>
                    <section.icon size={28} />
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{section.title}</h2>
                </div>
                <p className="text-xl text-slate-600 leading-relaxed font-semibold">
                  {section.description}
                </p>
              </div>

              {section.steps && (
                <div className="space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest px-2">Étapes Clés</h4>
                  <ul className="space-y-3">
                    {section.steps.map((step, sIdx) => (
                      <li key={sIdx} className="flex items-center gap-4 text-slate-800 bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm hover:border-slate-200 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 shrink-0">
                          {sIdx + 1}
                        </div>
                        <span className="font-bold text-sm">{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {section.details && (
                <div className="grid grid-cols-1 gap-4">
                  {section.details.map((detail, dIdx) => (
                    <div key={dIdx} className="flex gap-5 p-5 bg-slate-50/50 border border-slate-200/50 rounded-[2rem] hover:bg-slate-50 transition-colors">
                      <div className="p-3 bg-white rounded-2xl shadow-sm h-fit shrink-0">
                        <detail.icon size={24} className="text-blue-600" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-black text-slate-900 text-sm">{detail.title}</h4>
                        <p className="text-xs text-slate-500 font-medium leading-normal">{detail.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                <h4 className="text-xs font-black text-blue-600 uppercase tracking-widest px-2 flex items-center gap-2">
                  <Sparkles size={14} /> Conseils Pro
                </h4>
                <div className="bg-blue-50/30 border border-blue-100/50 rounded-[2rem] p-6 space-y-3">
                   {section.tips?.map((tip, tIdx) => (
                     <div key={tIdx} className="flex gap-3 text-sm font-semibold text-blue-900/70">
                       <div className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                       <p>{tip}</p>
                     </div>
                   ))}
                </div>
              </div>

              {section.action && (
                <button
                  onClick={() => navigate(section.action!.path)}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-sm hover:bg-slate-800 hover:gap-5 transition-all shadow-xl shadow-slate-200"
                >
                  {section.action.label} <ArrowRight size={20} />
                </button>
              )}
            </div>

            <div className="flex-1 w-full relative">
              <div className="aspect-[4/5] rounded-[4rem] overflow-hidden border-8 border-white shadow-2xl relative">
                <img 
                  src={section.imageUrl} 
                  alt={section.title}
                  className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-1000 scale-105 hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent opacity-60" />
                <div className="absolute bottom-10 left-10 text-white">
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] mb-2 text-white/70">Nordic Intelligence</p>
                   <p className="text-2xl font-black leading-tight max-w-[200px]">{section.title}</p>
                </div>
              </div>
              {/* Decorative elements */}
              <div className={`absolute -top-6 -right-6 w-32 h-32 ${section.color} rounded-full blur-[80px] opacity-20`} />
              <div className={`absolute -bottom-10 -left-10 w-48 h-48 ${section.color} rounded-full blur-[100px] opacity-10`} />
            </div>
          </motion.section>
        ))}
      </div>

      {/* FAQ Section */}
      <section className="space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Questions Fréquentes</h2>
          <p className="text-slate-500 font-medium mt-2">Tout ce que vous devez savoir pour maîtriser l'outil.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            {
              q: "Comment l'IA calcule-t-elle les montants ?",
              a: "Notre service IA traite l'image de votre ticket Z en utilisant l'OCR (Reconnaissance Optique de Caractères) et un modèle de langage qui identifie la structure des lignes de paiement habituelles (CB, Espèces, etc.)."
            },
            {
              q: "Puis-je modifier une recette déjà enregistrée ?",
              a: "Oui. Dans l'onglet Rapports, vous pouvez cliquer sur une ligne du tableau détaillé pour éditer les montants ou supprimer une entrée erronée."
            },
            {
              q: "Mes données sont-elles exportables ?",
              a: "Absolument. Chaque rapport peut être exporté en PDF haute définition ou en format CSV pour votre comptabilité via le bouton 'Exporter' en haut à droite."
            },
            {
              q: "Pourquoi mes graphiques sont-ils vides ?",
              a: "Assurez-vous d'avoir sélectionné un établissement et une plage de dates où des recettes ont été saisies. Si le problème persiste, vérifiez vos filtres de service."
            }
          ].map((faq, fIdx) => (
            <motion.div 
              key={fIdx}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm hover:shadow-md transition-shadow"
            >
              <h4 className="font-black text-slate-900 mb-2 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                {faq.q}
              </h4>
              <p className="text-sm text-slate-500 font-medium leading-relaxed">{faq.a}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Security Banner */}
      <section className="bg-slate-900 rounded-[3rem] p-8 md:p-12 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10 space-y-6 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full text-[10px] font-bold uppercase tracking-widest border border-white/10">
            <ShieldCheck size={12} className="text-emerald-400" /> Données Sécurisées
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Confidentialité & Sécurité</h2>
          <p className="text-slate-400 font-medium leading-relaxed">
            Vos données financières sont chiffrées et stockées de manière isolée par établissement. Seuls les managers autorisés peuvent accéder aux rapports sensibles.
          </p>
          <div className="flex items-center gap-6 pt-4">
             <div className="flex -space-x-2">
                {[1,2,3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                    {String.fromCharCode(64+i)}
                  </div>
                ))}
             </div>
             <p className="text-xs text-slate-500 font-bold">Rejoint par +50 managers</p>
          </div>
        </div>
      </section>

      {/* Footer Support */}
      <footer className="text-center py-12 border-t border-slate-100">
        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Besoin d'aide supplémentaire ?</p>
        <button className="px-8 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-900 shadow-sm hover:bg-slate-50 active:scale-95 transition-all">
          Contacter le Support Nordic
        </button>
      </footer>
    </div>
  );
}
