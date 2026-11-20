export type SpecialtyId =
  | "consultant"
  | "operations"
  | "finance"
  | "admin"
  | "excel"
  | "hr_contracts"
  | "stock"
  | "project";

export interface SpecialtyMeta {
  id: SpecialtyId;
  title: string;
  shortTitle: string;
  roleDescription: string;
  iconName: string;
  badgeColor: string;
  accentBg: string;
  examples: string[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  specialty?: SpecialtyId;
  metadata?: {
    toolUsed?: string;
    datasetAttached?: boolean;
    documentType?: string;
  };
}

export interface StockItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  currentStock: number;
  monthlyDemand: number;
  leadTimeDays: number; // délai d'approvisionnement en jours
  unitCost: number; // coût unitaire €
  orderCost: number; // coût de passation de commande €
  holdingRate: number; // taux de possession annuel (ex: 0.15 = 15%)
  safetyStockManual?: number;
}

export interface ContractApparatus {
  id: string;
  appNumber: string; // N° APP (ex: 996336)
  type: string; // TYPE (ex: Ascenseur, Monte-charge, Escalier mécanique)
  clientBuilding: string; // CLIENT / BÂTIMENT (ex: Bâtiment A)
  capacityKg: number; // CHARGE (KG) (ex: 630)
  levels: string; // NIVEAUX (ex: R+5)
  annualVisits: number; // VISITES/AN (ex: 12)
  priceHtAnnual: number; // PRIX HT/AN (ex: 8500)
}

export interface DocumentFormData {
  type: string;
  contractModel: "residentiel" | "simple" | "etendue";
  // Section 1: Informations Générales du Contrat
  projectName: string;
  clientName: string;
  city: string;
  effectiveDate: string;
  contractDuration: string;
  // Section 2: Facturation & Options
  billingMethod: string;
  paymentMethod: string;
  tvaRate: number;
  schindlerRep: string;
  schindlerRepPhone: string;
  schindlerRepEmail: string;
  invoiceDepot: {
    dematerialized: boolean;
    physical: boolean;
  };
  breakdownOptions: {
    h24: boolean;
    under2h: boolean;
  };
  // Section 3: Liste des Appareils
  apparatusList: ContractApparatus[];
  // Legacy / Other Document Fields
  title: string;
  partyA: string;
  partyB: string;
  duration: string;
  remunerationOrAmount: string;
  keyObligations: string;
  confidentialityTerms: string;
  terminationTerms: string;
  specificClauses: string;
  notes: string;
}

export interface ProjectTaskItem {
  id: string;
  title: string;
  priority: "Critique" | "Haute" | "Moyenne" | "Basse";
  status: "À faire" | "En cours" | "En attente" | "Terminé";
  responsible: string;
  accountable: string;
  consulted: string;
  informed: string;
  deadline: string;
  deliverable: string;
}

export interface NonConformity {
  id: string;
  code: string;
  description: string;
  severity: "Faible" | "Moyenne" | "Majeure" | "Critique / Bloquante";
  detectedDate: string; // YYYY-MM-DD
  deadlineDate: string; // detectedDate + 100 days
  status: "Ouverte" | "En cours" | "Attente pièce" | "Levée / Clôturée";
  resolvedDate?: string;
  assignedTechnician?: string;
  actionPlan?: string;
  associatedQuoteNumber?: string; // N° Devis associé (ex: R1009850) if Hors Contrat
  isCoveredByContract?: boolean; // true = Inclus dans le contrat, false = Hors contrat (Devis requis)
  equipmentPfNumber?: string; // N° PF Appareil rattaché (ex: PF-78012)
  estimatedClosureDate?: string; // Date prévisionnelle de clôture (ex: YYYY-MM-DD)
  actionsDone?: string; // Actions faites / réalisées pour chaque NC
}

export type ContractForecastStatus =
  | "Envoyé au client"
  | "Accord verbal client"
  | "Signée"
  | "Refus"
  | "Pertes concurrent"
  | "Marché public";

export interface ContractForecastItem {
  id: string;
  clientName: string;
  contractModel: string;
  annualValueHT: number;
  expectedSignatureDate: string;
  renewalDate: string;
  probability: number;
  status: ContractForecastStatus;
  schindlerRep: string;
  notes: string;
}

export interface ContractConversionEquipment {
  id: string;
  numAppareil: string; // N° Appareil
  nomClient?: string; // Nom du client
  ville?: string; // Ville
  agence?: string; // Agence
  dateSortieGarantie?: string; // Date sortie garantie
  dateMes?: string; // Date de MES
  montantPpm?: number; // Montant PPM
  dureeGratuite?: string; // Durée de gratuité
  dateDebut?: string; // Date de début
  dateFin?: string; // Date de fin
  commentaire?: string; // Commentaire
  dateLimite?: string; // Date de limite (>9 mois)
  statutAJour?: string; // Statut à jour
  typeClient?: "Syndic" | "Promotion" | "Tertiaire" | "Individuel" | "Industriel";
  statut?: "À convertir" | "En négociation" | "Converti / Signé" | "Relancé" | "Perdu" | "Gratuité en cours" | "Visite effectuée" | "Accord verbal" | string;
  comments?: string; // Comments
  contacts?: string; // Contacts
  prevision?: string; // Prévision
  // Technical specs & conversion forecast fields
  chargeUtileKg?: number;
  vitesseMS?: number;
  nbNiveaux?: number;
  marqueOrigine?: string;
  typeTechnologie?: string;
  dateConversionPrevue?: string;
  statutConversion?: string;
  montantConversionHT?: number;
  notes?: string;
}

export interface InspectionVisits {
  v1: boolean;
  v2: boolean;
  v3: boolean;
  v4: boolean;
  v5: boolean;
  v6: boolean;
  v7: boolean;
  v8: boolean;
  v9: boolean;
  v10: boolean;
  v11: boolean;
  cpsi: boolean; // 12th inspection: Visite CPSI
}

export interface VisitRecord {
  date: string; // YYYY-MM-DD
  technician?: string;
  notes?: string;
  completedAt?: string;
}

export type ArchivedReason =
  | "Hors Garantie"
  | "Résilié"
  | "Contrat Échu"
  | "Démantelé"
  | "Suspendu"
  | "Autre";

export interface PFEquipment {
  id: string;
  pfNumber: string; // N° Appareil (PF)
  projectId?: string; // Project ID
  customerAccount?: string; // Customer account
  name: string; // Name (Nom de l'appareil / du site)
  customer?: string; // Client / Syndic
  numAppareil?: string; // N° Appareil ERP
  cpsiStatus?: string; // CPSI Status
  cpsiDate?: string; // Date CPSI
  contractNumber?: string; // N° Contrat
  type?: string; // Type d'appareil
  lastCpsiDate?: string; // Date dernier CPSI (YYYY-MM-DD or DD/MM/YYYY or Erreur)
  forecastCpsiDate?: string; // Date Prévisionnelle CPSI (DD/MM/YYYY or Erreur)
  contractType?: string; // Type Contrat
  serviceObject?: string; // Service object (ex: Ascenseur, Monte-charge...)
  street?: string; // Street
  city?: string; // City
  serviceObjectGroup?: string; // Service object group
  assignedTechnician?: string; // Assigned Technician
  serviceLeader?: string; // Service Leader
  visits?: InspectionVisits;
  visitDetails?: Partial<Record<keyof InspectionVisits, VisitRecord>>;
  nonConformities?: NonConformity[];
  notes?: string;
  isArchived?: boolean; // True if in the duplicate/historical park
  archivedReason?: ArchivedReason | string; // Reason for exit/archival
  archivedDate?: string; // Date of exit (YYYY-MM-DD)
  archivedNotes?: string; // Additional context
  [key: string]: any;
}

export type QuoteStatus =
  | "Brouillon"
  | "Envoyé"
  | "Validé / Accepté"
  | "Facturé"
  | "Refusé";

export interface QuoteItem {
  id: string;
  description: string;
  partReference?: string; // Référence / Réf pièce détachée
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
  costPrice?: number; // Prix de revient unitaire (MAD)
  totalCostPrice?: number; // Prix de revient total ligne (MAD) = quantity * costPrice
  c1Value?: number; // Marge C1 en valeur (MAD) = totalHT - totalCostPrice
  c1Percent?: number; // Marge C1 en % = (c1Value / totalHT) * 100
}

export interface Quote {
  id: string;
  quoteNumber: string;
  title: string;
  clientName: string;
  customerAccount?: string;
  pfNumber?: string; // Associated PF equipment
  issueDate: string; // YYYY-MM-DD
  validityDate: string;
  billingMonth?: string; // e.g. "2026-09"
  amountHT: number; // Prix de vente Total HT (100% C1 Value)
  costPriceHT?: number; // Prix de revient Total (MAD) (synonyme de estimatedCostHT)
  c1Value?: number; // Marge C1 Valeur (MAD) = amountHT - estimatedCostHT
  c1Percent?: number; // Marge C1 Taux (%) = (c1Value / amountHT) * 100
  tvaRate: number; // e.g. 20
  amountTTC: number;
  estimatedCostHT: number; // Prix de revient HT
  estimatedMarginPct: number; // Taux de Marge C1 (%)
  status: QuoteStatus;
  billingSchedule: Record<string, number>; // e.g. { "2026-09": 2500, "2026-10": 2500 }
  notes?: string;
  items?: QuoteItem[];
}

export type PartStatus = "Commandée" | "Reçue en stock" | "Consommée / Installée";

export interface MaintenancePartConsumption {
  id: string;
  reference: string;
  designation: string;
  pfNumber: string; // Appareil PF lié
  clientName?: string;
  quantity: number;
  unitCostHT: number;
  totalCostHT: number;
  sellingPriceHT?: number;
  orderDate: string;
  deliveryDate?: string;
  installationDate?: string;
  supplier: string;
  status: PartStatus;
  technician?: string;
  notes?: string;
}

export type SparePart = MaintenancePartConsumption;

// Demande de Pièces de Rechange — Fiche de Régie Schindler
export type RegieStatus = "En attente" | "Approuvée" | "Reçue / Clôturée" | "Rejetée";
export type RegieBillingType = "Facturable" | "Garantie" | "Inclus contrat" | "Sous Devis";
export type RegieWorkType = "Maintenance" | "Dépannage" | "Réparation suite NC" | "Modernisation" | "Autre";

export interface RegieItemRequested {
  id: string;
  stockItemId?: string;
  identificationNumber: string; // Ex: SCH-77119-A
  designation: string;
  quantity: number;
  unitCostHT: number;
  sellingPriceHT?: number;
}

export interface RegieRequest {
  id: string;
  requestNumber: string; // Ex: REG-2026-001
  technician: string; // Affecter au Technicien
  date: string; // YYYY-MM-DD
  agency: string; // Ex: FES, CASABLANCA, RABAT, MARRAKECH
  affaireOrPfNumber: string; // Ex: A00 9136-006 / 1001999
  clientName: string; // Client
  address?: string; // Adresse d'installation
  billingType: RegieBillingType; // Facturable, Garantie, Inclus contrat, Sous Devis
  status: RegieStatus; // Initial status
  quoteNumber?: string; // N° Devis lié pour calcul du gain
  quoteAmountHT?: number; // Montant HT Vente du Devis
  items: RegieItemRequested[];
  workNature: RegieWorkType;
  observations?: string;
  signatureDataUrl?: string; // Base64 signature image or indicator
  closedAt?: string;
}

export type ActiveTab =
  | "workspace"
  | "pf"
  | "stock"
  | "documents"
  | "rh"
  | "data"
  | "excel"
  | "project"
  | "finance";

export interface GrandCompteAttachment {
  id: string;
  year: number;
  representative: string;
  clientName: string;
  address: string;
  contractNumber: string;
  city: string;
  associatedEquipments: string[];
  validatedMonths: number[]; // array of numbers 1-12 representing months
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface FaxTechnician {
  id: string;
  fullName: string;
  cin: string;
  vehiclePlate: string;
  phone?: string;
  role?: string;
  city?: string;
  isDefault?: boolean;
}

export interface FaxInterventionData {
  id: string;
  docNumber?: string;
  date: string; // DD/MM/YYYY or YYYY-MM-DD
  department: string; // Ex: Direction Commerciale des I.E.
  docTitle: string; // Ex: FAX INTERVENTION
  recipientTitle: string; // Ex: A l’Attention de Monsieur le Conservateur du Palais
  recipientLocation: string; // Ex: ROYAL Arfoud
  subject: string; // Ex: Objet : Intervention à effectuer au Palais ARFOUD
  salutation: string; // Ex: Monsieur,
  introText: string; // Ex: J’ai le plaisir de vous communiquer la liste des personnes susceptibles d’intervenir pour l’entretien des appareils,
  technicians: FaxTechnician[];
  closingText1: string; // Ex: Je reste à votre entière disposition pour tout complément d’information désiré.
  closingText2: string; // Ex: Veuillez agréer, Monsieur, l’expression de mes salutations distinguées.
  senderName: string; // Ex: Schindler Maroc
  senderSignatory?: string; // Ex: Direction Commerciale / Oussama Oubghous
  notes?: string;
  status?: "Brouillon" | "Généré" | "Envoyé" | "Validé";
  createdAt?: string;
}

export type AnomalyCriticality = "Faible" | "Moyen" | "Élevé" | "Critique";

export interface TechnicalReportAnomaly {
  id: string;
  title: string;
  organ?: string; // e.g. Portes, Traction, Manœuvre, Sécurités, Gaine
  description: string;
  causes: string;
  impact: string;
  actionsDone: string;
  temporarySolution: string;
  definitiveSolution: string;
  requiredParts?: string;
  criticality: AnomalyCriticality;
  preventiveRecommendations?: string;
}

export interface TechnicalReportPart {
  id: string;
  designation: string;
  reference: string;
  quantity: number | string;
  reason: string;
  status?: "Remplacée sur site" | "À commander en urgence" | "À chiffrer sur devis" | "En stock agence";
}

export interface TechnicalReportData {
  id: string;
  reportNumber: string; // Ex: RT-2026-0881
  interventionDate: string; // Ex: 2026-09-21
  equipmentNumber: string; // Ex: PF-78012 ou 996501
  equipmentType?: string; // Ex: Schindler 3300 / 5500
  clientName: string; // Ex: Résidence Al Firdaous
  locationCity: string; // Ex: Casablanca
  technicianName: string; // Ex: Abdeljalil Ait Bahmed
  supervisorName?: string; // Responsable du technicien / Superviseur qui signe le document (ex: Oussama Oubghous)
  technicianPhone?: string;
  siteObservation: string; // Constat sur terrain
  anomalies: TechnicalReportAnomaly[];
  historyAndRecurrence: string; // Historique des pannes et analyse des récurrences
  worksDone: string; // Travaux réalisés lors de l'intervention
  replacedOrOrderedParts: TechnicalReportPart[];
  technicalRecommendations: string; // Recommandations techniques & préventives
  conclusion: string; // Conclusion générale
  generatedContentMarkdown?: string; // Full generated AI diagnostic report in markdown
  status?: "Brouillon" | "Généré" | "Transmis Client" | "Clôturé";
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// GESTION RH (Pointage, Congé, Note de Frais)
// ==========================================

export type PointageDayName =
  | "LUNDI"
  | "MARDI"
  | "MERCREDI"
  | "JEUDI"
  | "VENDREDI"
  | "SAMEDI"
  | "DIMANCHE";

export interface RHPointageLine {
  id: string;
  day: PointageDayName;
  imputation: string; // N° E ou libellé (ex: 120784, Route Fes, Agence Fes, Permanence)
  entretien: number;
  reparation: number;
  permanence: number;
  depannage: number;
  horsDecompte: number;
  formation: number;
  congesJoursFeries: number;
  absence: number;
  maladie: number;
  indemniteDeplacement: number;
  indemnitePermanence: number;
}

export interface RHPointageDocument {
  id: string;
  agence: string;
  service: string;
  nom: string;
  matricule: string;
  dateDebut: string; // YYYY-MM-DD (Lundi)
  dateFin: string; // YYYY-MM-DD (Dimanche)
  numSemaine: string; // ex: S42
  etabliLe: string; // YYYY-MM-DD
  visaResponsable: string;
  signatureDataUrl?: string;
  justificationVerso?: string;
  lines: RHPointageLine[];
  updatedAt?: string;
}

export interface RHCongeDocument {
  id: string;
  nomPrenom: string;
  mle: string;
  fonction: string;
  service: string;
  dateDepart: string; // YYYY-MM-DD
  dateRetour: string; // YYYY-MM-DD
  reliquatAnneeNMoins1: number;
  reliquatAnneeN: number;
  joursDemandes: number;
  decision?: "autorise" | "reporte" | "";
  observations: string;
  visaInteresse?: string;
  signatureInteresseDataUrl?: string;
  visaDrh?: string;
  visaResponsable?: string;
  visaDg?: string;
  updatedAt?: string;
}

export interface RHNoteFraisLine {
  id: string;
  date: string; // YYYY-MM-DD
  lieu: string;
  montantDevise: number;
  tauxChange: number;
  km: number;
  indemniteKmTaxi: number;
  forfaitDivers: number;
  repas: number;
  hotel: number;
  parking: number;
  gasoil: number;
  autoroute: number;
  commentaire: string;
}

export interface RHNoteFraisDocument {
  id: string;
  demandeur: string;
  fonction: string;
  service: string;
  objet: string;
  responsableHierarchique: string;
  fonctionResponsable: string;
  moisAnnee: string; // ex: Novembre 2026
  deviseCode: string; // ex: EURO, TND, USD
  tauxChangeDefaut: number;
  avancesRecues: number;
  dateSignatureDemandeur: string;
  referenceComptabilite: string;
  bonPourAcquis: boolean;
  signatureDemandeurDataUrl?: string;
  lines: RHNoteFraisLine[];
  updatedAt?: string;
}



