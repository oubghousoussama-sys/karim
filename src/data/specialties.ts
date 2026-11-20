import { SpecialtyMeta } from "../types";

export const SPECIALTIES: SpecialtyMeta[] = [
  {
    id: "consultant",
    title: "Consultant Senior en Stratégie & Organisation",
    shortTitle: "Consultant Senior",
    roleDescription: "Diagnostic stratégique, résolution de problèmes opérationnels complexes, restructuration et cadrage de haut niveau.",
    iconName: "Briefcase",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/30",
    accentBg: "from-blue-600/20 to-indigo-600/10",
    examples: [
      "Faire un diagnostic opérationnel d'une baisse de productivité de 18% sur le pôle logistique.",
      "Structurer un plan de redressement commercial pour une PME en perte de vitesse.",
      "Définir la méthodologie de transformation digitale pour un service support de 45 personnes.",
      "Auditer l'efficacité d'un processus de facturation client et proposer des optimisations Lean."
    ]
  },
  {
    id: "operations",
    title: "Responsable des Opérations & Supply Chain",
    shortTitle: "Directeur des Opérations",
    roleDescription: "Optimisation des processus, flux logistiques, gestion de la capacité, amélioration continue et réduction des gaspillages.",
    iconName: "Cog",
    badgeColor: "bg-amber-500/10 text-amber-400 border-amber-500/30",
    accentBg: "from-amber-600/20 to-orange-600/10",
    examples: [
      "Optimiser le circuit de préparation de commandes pour réduire le délai d'expédition de 48h à 24h.",
      "Rédiger un plan de continuité d'activité (PCA) face à une panne du système ERP principal.",
      "Identifier et supprimer les goulots d'étranglement sur une ligne d'assemblage / service client.",
      "Mettre en place un accord de niveau de service (SLA) avec nos transporteurs partenaires."
    ]
  },
  {
    id: "finance",
    title: "Contrôleur de Gestion & Performance Financière",
    shortTitle: "Contrôleur de Gestion",
    roleDescription: "Calcul des coûts de revient, seuil de rentabilité, analyse d'écarts budgétaires, KPI financiers et pilotage du BFR.",
    iconName: "TrendingUp",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    accentBg: "from-emerald-600/20 to-teal-600/10",
    examples: [
      "Calculer le point mort et le chiffre d'affaires critique d'une nouvelle offre d'abonnement.",
      "Analyser les causes d'un dépassement budgétaire de 25 000 € sur les frais généraux.",
      "Construire un tableau de bord prévisionnel de trésorerie sur 12 semaines (Rolling Forecast).",
      "Évaluer le ROI et le temps de retour sur investissement d'une machine de 120 000 €."
    ]
  },
  {
    id: "admin",
    title: "Coordinateur Administratif & Conformité",
    shortTitle: "Coordinateur Administratif",
    roleDescription: "Standard Operating Procedures (SOP), organisation documentaire, comptes-rendus de CODIR, conformité réglementaire.",
    iconName: "FileCheck",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/30",
    accentBg: "from-violet-600/20 to-purple-600/10",
    examples: [
      "Rédiger une Procédure Opérationnelle Standard (SOP) pour l'intégration des nouveaux fournisseurs.",
      "Structurer le compte-rendu décisionnel du Comité de Direction avec matrice des engagements.",
      "Créer un mémo interne formel sur la nouvelle politique des notes de frais et déplacements.",
      "Établir la checklist de conformité documentaire obligatoire pour un audit qualité ISO."
    ]
  },
  {
    id: "excel",
    title: "Expert Excel, Power Query & Modélisation",
    shortTitle: "Expert Excel & Reporting",
    roleDescription: "Conception de formules matricielles complexes, automatisation VBA, Power Query M, DAX et tableaux de bord dynamiques.",
    iconName: "FileSpreadsheet",
    badgeColor: "bg-teal-500/10 text-teal-400 border-teal-500/30",
    accentBg: "from-teal-600/20 to-emerald-600/10",
    examples: [
      "Formule RECHERCHEX multicritères avec gestion des doublons et des cellules vides.",
      "Macro VBA pour consolider automatiquement 15 fichiers Excel de reporting mensuel.",
      "Structure de calcul pour calculer des commissions commerciales à paliers progressifs.",
      "Requête Power Query (M) pour nettoyer et fusionner des données ERP et CRM hétérogènes."
    ]
  },
  {
    id: "hr_contracts",
    title: "Assistant RH, Contrats & Juridique Opérationnel",
    shortTitle: "Assistant RH & Contrats",
    roleDescription: "Rédaction de contrats (CDI, CDD, Freelance, Prestataire), accords de confidentialité (NDA), avenants et fiches de poste.",
    iconName: "FileText",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/30",
    accentBg: "from-rose-600/20 to-pink-600/10",
    examples: [
      "Rédiger un contrat de prestation de services B2B avec clause stricte de propriété intellectuelle.",
      "Créer un accord de confidentialité bilatéral (NDA) dans le cadre de négociations commerciales.",
      "Générer un avenant contractuel pour le passage en télétravail partiel et prime de sujétion.",
      "Rédiger une fiche de poste complète et grille d'évaluation pour un Responsable Logistique."
    ]
  },
  {
    id: "stock",
    title: "Gestionnaire de Stock & Approvisionnement",
    shortTitle: "Gestionnaire de Stock",
    roleDescription: "Stock de sécurité, calcul du point de commande (ROP), formule de Wilson (EOQ), classification ABC et rotation.",
    iconName: "Boxes",
    badgeColor: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    accentBg: "from-cyan-600/20 to-blue-600/10",
    examples: [
      "Calculer le stock de sécurité et la quantité économique de commande sur nos 10 top ventes.",
      "Plan d'action d'urgence pour écouler un surstock de 45 000 € générant des coûts d'immobilisation.",
      "Définir les seuils d'alerte et de réapprovisionnement automatique pour éviter les ruptures.",
      "Réaliser une classification ABC / 20-80 sur un catalogue de 150 pièces détachées."
    ]
  },
  {
    id: "project",
    title: "Chef de Projet & Pilotage Opérationnel",
    shortTitle: "Chef de Projet",
    roleDescription: "Matrice RACI, rétroplanning jalonnés, cadrage des priorités (Eisenhower), pilotage des risques et comités de suivi.",
    iconName: "Layers",
    badgeColor: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
    accentBg: "from-indigo-600/20 to-violet-600/10",
    examples: [
      "Construire la matrice RACI détaillée pour le déploiement d'un nouvel outil CRM en 4 mois.",
      "Découper un projet de déménagement d'entrepôt en phases, jalons critiques et livrables.",
      "Établir un registre des risques projet avec matrice Criticité = Probabilité x Impact.",
      "Concevoir le plan de communication et de conduite du changement pour 120 collaborateurs."
    ]
  }
];
