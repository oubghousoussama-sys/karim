import React, { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import {
  DocumentFormData,
  ContractApparatus,
  ContractConversionEquipment,
  ContractForecastItem,
  ContractForecastStatus
} from "../../types";
import { exportToExcel } from "../../utils/excelExport";

export const CONTRACT_FORECAST_STATUSES: { label: ContractForecastStatus; badgeClass: string }[] = [
  { label: "Envoyé au client", badgeClass: "text-blue-300 bg-blue-950/70 border-blue-700/60" },
  { label: "Accord verbal client", badgeClass: "text-amber-300 bg-amber-950/70 border-amber-700/60" },
  { label: "Signée", badgeClass: "text-emerald-300 bg-emerald-950/70 border-emerald-700/60" },
  { label: "Refus", badgeClass: "text-rose-300 bg-rose-950/70 border-rose-700/60" },
  { label: "Pertes concurrent", badgeClass: "text-purple-300 bg-purple-950/70 border-purple-700/60" },
  { label: "Marché public", badgeClass: "text-cyan-300 bg-cyan-950/70 border-cyan-700/60" }
];

export function getThreeMonthsList(refDateStr = "2026-09-02") {
  const parts = refDateStr.split("-");
  const year = parseInt(parts[0], 10) || 2026;
  const month = (parseInt(parts[1], 10) || 9) - 1; // 0-indexed

  const monthNamesFr = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const result = [];
  for (let i = 0; i < 3; i++) {
    const d = new Date(year, month + i, 1);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const key = `${yyyy}-${mm}`;
    const name = monthNamesFr[d.getMonth()];
    const label = i === 0 ? `${name} ${yyyy} (Mois Actuel)` : `${name} ${yyyy} (M+${i})`;
    result.push({ key, label, name: `${name} ${yyyy}`, index: i });
  }
  return result;
}
import { FormattedOutput } from "../FormattedOutput";
import { NcClosureDocument } from "./NcClosureDocument";
import { GrandCompteAttachmentManager } from "./GrandCompteAttachmentManager";
import { FaxInterventionGenerator } from "./FaxInterventionGenerator";
import { TechnicalReportGenerator } from "./TechnicalReportGenerator";
import {
  FileText,
  Sparkles,
  Download,
  Upload,
  Bookmark,
  Shield,
  Plus,
  Trash2,
  Building2,
  UserCheck,
  CreditCard,
  Layers,
  FileCheck2,
  Calculator,
  RefreshCw,
  TrendingUp,
  Wrench,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileSpreadsheet
} from "lucide-react";

const SCHINDLER_REPS = [
  {
    name: "OUSSAMA OUBGHOUS",
    phone: "06 60 42 38 71",
    email: "oussama.oubghous@schindler.com"
  },
  {
    name: "MOHAMED BENALI",
    phone: "06 61 12 34 56",
    email: "mohamed.benali@schindler.com"
  },
  {
    name: "YOUSSEF KHALIL",
    phone: "06 62 88 99 00",
    email: "youssef.khalil@schindler.com"
  }
];

const CONTRACT_MODELS = [
  {
    id: "residentiel" as const,
    name: "Modèle Résidentiel",
    filename: "residentiel (1).docx",
    description: "Contrat de maintenance optimisé pour copropriétés et résidences d'habitation",
    icon: Building2
  },
  {
    id: "simple" as const,
    name: "Modèle Simple",
    filename: "simple (1).docx",
    description: "Contrat standard épuré pour petits ensembles et immeubles tertiaires",
    icon: FileText
  },
  {
    id: "etendue" as const,
    name: "Modèle Étendu",
    filename: "etendue.docx",
    description: "Contrat de prestation premium incluant couverture pièces & interventions prioritaires",
    icon: Shield
  }
];

const DOCUMENT_PRESETS = [
  {
    name: "Bon de Clôture NCs (CPSI)",
    type: "Bon d'Ordre d'Intervention Clôture des NCs",
    description: "Modèle officiel Schindler pour clôture des NCs & levée des réserves (Tour de Contrôle)"
  },
  {
    name: "Contrat de Prestation",
    type: "Contrat de Prestation",
    description: "Modèles officiels Schindler (Résidentiel, Simple, Étendu)"
  },
  {
    name: "Rapports Techniques & Diagnostic",
    type: "Rapport Technique & Diagnostic",
    description: "Expertise Schindler : diagnostic complet, causes, pièces, criticité et plan d'action préventif"
  },
  {
    name: "Attachements Grands Comptes",
    type: "Attachements Grands Comptes",
    description: "Suivi des transmissions trimestrielles & génération des bons d'attachement signés"
  },
  {
    name: "FAX d'Intervention",
    type: "FAX d'Intervention",
    description: "Avis d'accès & autorisations d'intervention avec CIN et véhicules des techniciens"
  }
];

const DEFAULT_CONVERSION_EQUIPMENT: ContractConversionEquipment[] = [
  {
    id: "conv-1",
    numAppareil: "996501",
    dateMes: "2025-05-15",
    nomClient: "RÉSIDENCE LES JARDINS DE L'ORIENTAL",
    statut: "Gratuité en cours",
    ville: "Oujda",
    agence: "Schindler Oujda",
    montantPpm: 14500,
    dureeGratuite: "12 mois",
    dateDebut: "2025-05-15",
    dateFin: "2026-05-15",
    commentaire: "Contact syndic établi, proposition contrat Schindler Excellence en cours",
    dateLimite: "2026-02-15",
    statutAJour: "À convertir",
    typeClient: "Syndic"
  },
  {
    id: "conv-2",
    numAppareil: "996502",
    dateMes: "2025-08-01",
    nomClient: "CENTRE MÉDICAL IBN SINA",
    statut: "En négociation",
    ville: "Nador",
    agence: "Schindler Nador",
    montantPpm: 18000,
    dureeGratuite: "12 mois",
    dateDebut: "2025-08-01",
    dateFin: "2026-08-01",
    commentaire: "Présentation devis contrat Étendu avec astreinte 24/7",
    dateLimite: "2026-05-01",
    statutAJour: "En négociation",
    typeClient: "Tertiaire"
  },
  {
    id: "conv-3",
    numAppareil: "996503",
    dateMes: "2025-10-10",
    nomClient: "HÔTEL ORIENTAL BAY RESORT",
    statut: "Visite effectuée",
    ville: "Saïdia",
    agence: "Schindler Oujda",
    montantPpm: 24000,
    dureeGratuite: "12 mois",
    dateDebut: "2025-10-10",
    dateFin: "2026-10-10",
    commentaire: "2 appareils sous garantie constructeur, contrat 3 ans proposé",
    dateLimite: "2026-07-10",
    statutAJour: "À convertir",
    typeClient: "Tertiaire"
  },
  {
    id: "conv-4",
    numAppareil: "996504",
    dateMes: "2025-11-20",
    nomClient: "RÉSIDENCE AL FIRDAOUS",
    statut: "Accord verbal",
    ville: "Oujda",
    agence: "Schindler Oujda",
    montantPpm: 15500,
    dureeGratuite: "12 mois",
    dateDebut: "2025-11-20",
    dateFin: "2026-11-20",
    commentaire: "Signature prévue lors de la prochaine AG",
    dateLimite: "2026-08-20",
    statutAJour: "Accord verbal",
    typeClient: "Syndic"
  }
];

const DEFAULT_CONTRACT_FORECASTS: ContractForecastItem[] = [
  {
    id: "fct-1",
    clientName: "Résidence Al Firdaous",
    contractModel: "Modèle Résidentiel",
    annualValueHT: 25500,
    expectedSignatureDate: "2026-09-15",
    renewalDate: "2027-09-15",
    probability: 90,
    status: "Accord verbal client",
    schindlerRep: "OUSSAMA OUBGHOUS",
    notes: "Validation par le syndic en AG"
  },
  {
    id: "fct-2",
    clientName: "CHU Ibn Rochd",
    contractModel: "Modèle Étendu",
    annualValueHT: 120000,
    expectedSignatureDate: "2026-09-28",
    renewalDate: "2027-09-28",
    probability: 95,
    status: "Marché public",
    schindlerRep: "MOHAMED BENALI",
    notes: "Appel d'offres annuel ascenseurs CHU"
  },
  {
    id: "fct-3",
    clientName: "Tour Anfa Business",
    contractModel: "Modèle Étendu",
    annualValueHT: 85000,
    expectedSignatureDate: "2026-10-10",
    renewalDate: "2027-10-10",
    probability: 70,
    status: "Envoyé au client",
    schindlerRep: "OUSSAMA OUBGHOUS",
    notes: "Devis transmis à la direction immobilière"
  },
  {
    id: "fct-4",
    clientName: "Résidence Les Palmiers",
    contractModel: "Modèle Simple",
    annualValueHT: 18000,
    expectedSignatureDate: "2026-10-25",
    renewalDate: "2027-10-25",
    probability: 100,
    status: "Signée",
    schindlerRep: "YOUSSEF KHALIL",
    notes: "Contrat renouvelé pour 12 mois signé"
  },
  {
    id: "fct-5",
    clientName: "Mall Marina Casablanca",
    contractModel: "Modèle Étendu",
    annualValueHT: 95000,
    expectedSignatureDate: "2026-11-12",
    renewalDate: "2027-11-12",
    probability: 60,
    status: "Envoyé au client",
    schindlerRep: "OUSSAMA OUBGHOUS",
    notes: "Négociation en concurrence"
  },
  {
    id: "fct-6",
    clientName: "Résidence Gauthier High Tech",
    contractModel: "Modèle Résidentiel",
    annualValueHT: 32000,
    expectedSignatureDate: "2026-11-20",
    renewalDate: "2027-11-20",
    probability: 15,
    status: "Pertes concurrent",
    schindlerRep: "YOUSSEF KHALIL",
    notes: "Client privilégie prestataire bas coût"
  }
];

export const DocumentGenerator: React.FC = () => {
  const [formData, setFormData] = useState<DocumentFormData>({
    type: "Contrat de Prestation",
    contractModel: "residentiel",
    // Section 1: Informations Générales du Contrat
    projectName: "Résidence Al Firdaous",
    clientName: "Syndic Co-propriété Firdaous",
    city: "Casablanca",
    effectiveDate: new Date().toISOString().slice(0, 10),
    contractDuration: "3 ans",
    // Section 2: Facturation & Options
    billingMethod: "Fin de trimestre",
    paymentMethod: "Virement ou chèque",
    tvaRate: 20,
    schindlerRep: "OUSSAMA OUBGHOUS",
    schindlerRepPhone: "06 60 42 38 71",
    schindlerRepEmail: "oussama.oubghous@schindler.com",
    invoiceDepot: {
      dematerialized: true,
      physical: false
    },
    breakdownOptions: {
      h24: false,
      under2h: false
    },
    // Section 3: Liste des Appareils
    apparatusList: [
      {
        id: "app-1",
        appNumber: "996336",
        type: "Ascenseur",
        clientBuilding: "Bâtiment A",
        capacityKg: 630,
        levels: "R+5",
        annualVisits: 12,
        priceHtAnnual: 8500
      }
    ],
    // Legacy / Other Document Fields
    title: "Mission de Prestation de Service & Maintenance",
    partyA: "Schindler Maroc SA",
    partyB: "Syndic Co-propriété Firdaous",
    duration: "12 mois renouvelable par tacite reconduction",
    remunerationOrAmount: "Selon bordereau d'appareils et options souscrites",
    keyObligations: "Réalisation des 12 visites annuelles réglementaires et interventions de dépannage",
    confidentialityTerms: "Confidentialité réciproque sur les conditions tarifaires",
    terminationTerms: "Préavis de 3 mois avant l'échéance annuelle",
    specificClauses: "Visites CPSI réglementaires et traçabilité des interventions sur carnet d'entretien",
    notes: "Validation à la signature du client"
  });

  const [loading, setLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const [visitedDocTypes, setVisitedDocTypes] = useState<Record<string, boolean>>({
    "Contrat de Prestation": true
  });

  const handleSelectDocType = (docType: string) => {
    setFormData((prev) => ({ ...prev, type: docType }));
    if (!visitedDocTypes[docType]) {
      setVisitedDocTypes((prev) => ({ ...prev, [docType]: true }));
    }
  };

  // Conversion Equipment & Contract Forecasts States
  const [conversionEquipmentList, setConversionEquipmentList] = useState<ContractConversionEquipment[]>(DEFAULT_CONVERSION_EQUIPMENT);
  const [contractForecasts, setContractForecasts] = useState<ContractForecastItem[]>(DEFAULT_CONTRACT_FORECASTS);
  const [forecastMonthFilter, setForecastMonthFilter] = useState<string>("all");

  // Conversion Filter & Upload States
  const [conversionSearch, setConversionSearch] = useState<string>("");
  const [conversionStatusFilter, setConversionStatusFilter] = useState<string>("all");
  const [conversionAgencyFilter, setConversionAgencyFilter] = useState<string>("all");
  const [conversionUploadStatus, setConversionUploadStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const conversionFileInputRef = useRef<HTMLInputElement>(null);

  // Devis Type Templates State (Texte pour Devis Type)
  const [devisCategories, setDevisCategories] = useState<{ name: string; files: string[] }[]>([]);
  const [selectedDevisCategory, setSelectedDevisCategory] = useState<string>("Machinerie Mécanique");
  const [selectedDevisTemplate, setSelectedDevisTemplate] = useState<string>("");
  const [devisEquipmentPf, setDevisEquipmentPf] = useState<string>("PF-78012");
  const [devisAmountHT, setDevisAmountHT] = useState<number | string>(18500);
  const [devisExecutionDays, setDevisExecutionDays] = useState<string>("15 jours ouvrés");
  const [devisTechDesc, setDevisTechDesc] = useState<string>("Remplacement des câbles de traction et réglage des gorges de poulies selon recommandations CPSI.");

  useEffect(() => {
    fetch("/api/devis-templates/list")
      .then((res) => res.json())
      .then((data) => {
        if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
          setDevisCategories(data.categories);
          const firstCat = data.categories[0];
          setSelectedDevisCategory(firstCat.name);
          if (firstCat.files && firstCat.files.length > 0) {
            setSelectedDevisTemplate(firstCat.files[0]);
          }
        }
      })
      .catch((err) => console.warn("Devis templates list fetch failed:", err));
  }, []);

  const handleDevisCategorySelect = (catName: string) => {
    setSelectedDevisCategory(catName);
    const catObj = devisCategories.find((c) => c.name === catName);
    if (catObj && catObj.files && catObj.files.length > 0) {
      setSelectedDevisTemplate(catObj.files[0]);
    } else {
      setSelectedDevisTemplate("");
    }
  };

  // Helper date parser for Excel files
  const parseExcelDate = (val: any): string => {
    if (val === undefined || val === null || val === "") return "";
    if (typeof val === "number") {
      // Excel base date Dec 30 1899
      const jsDate = new Date((val - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(jsDate.getTime())) {
        return jsDate.toISOString().slice(0, 10);
      }
    }
    const str = String(val).trim();
    const dmy = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
    if (dmy) {
      const d = dmy[1].padStart(2, "0");
      const m = dmy[2].padStart(2, "0");
      const y = dmy[3];
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
      return str;
    }
    return str;
  };

  // Excel Upload Handler for "Appareils à Convertir"
  const handleUploadConversionExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

        if (!jsonRows || jsonRows.length === 0) {
          setConversionUploadStatus({
            type: "error",
            message: "Le fichier sélectionné est vide ou illisible."
          });
          return;
        }

        const normalize = (str: string) =>
          str
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");

        const mapped: ContractConversionEquipment[] = jsonRows.map((row, idx) => {
          const getVal = (...keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of keys) {
              const normTarget = normalize(k);
              const foundKey = rowKeys.find(
                (rk) => normalize(rk) === normTarget || normalize(rk).includes(normTarget)
              );
              if (foundKey && row[foundKey] !== undefined && row[foundKey] !== "") {
                return row[foundKey];
              }
            }
            return "";
          };

          const numAppareil = String(
            getVal("nappareil", "numappareil", "appareil", "numeroappareil", "equipment", "code") ||
              `${996500 + idx + 1}`
          ).trim();
          const dateMes = parseExcelDate(
            getVal("datedemes", "datemes", "mes", "miseenservice", "date de mes")
          );
          const nomClient = String(
            getVal("nomduclient", "nomclient", "client", "raisonsociale", "nom du client") ||
              "Client à renseigner"
          ).trim();
          const statut = String(getVal("statut", "status", "etat") || "À convertir").trim();
          const ville = String(getVal("ville", "city", "localite", "secteur") || "").trim();
          const agence = String(getVal("agence", "agency", "branch", "succursale") || "").trim();

          const montantPpmRaw = getVal("montantppm", "montant", "ppm", "prixppm", "montant ppm", "valeurppm");
          const montantPpm =
            typeof montantPpmRaw === "number"
              ? montantPpmRaw
              : parseFloat(String(montantPpmRaw).replace(/[^0-9.-]/g, "")) || 0;

          const dureeGratuite = String(
            getVal("dureedegratuite", "dureegratuite", "gratuite", "duree", "duree de gratuite") || "12 mois"
          ).trim();
          const dateDebut = parseExcelDate(
            getVal("datededebut", "datedebut", "debut", "date de debut")
          );
          const dateFin = parseExcelDate(
            getVal("datedefin", "datefin", "fin", "date de fin")
          );
          const commentaire = String(
            getVal("commentaire", "commentaires", "notes", "remarque", "observation") || ""
          ).trim();
          const dateLimite = parseExcelDate(
            getVal("datelimite9mois", "datelimite", "limite", "echeance9mois", "date limite (>9 mois)")
          );
          const statutAJour = String(
            getVal("statutajour", "statutactuel", "statut a jour", "etat actuel", "statut à jour") ||
              statut ||
              "À convertir"
          ).trim();
          const typeClient = String(
            getVal("typeclient", "type client", "type", "categorie") || "Syndic"
          ).trim();

          return {
            id: `conv-up-${Date.now()}-${idx}`,
            numAppareil,
            dateMes,
            nomClient,
            statut: statut as any,
            ville,
            agence,
            montantPpm,
            dureeGratuite,
            dateDebut,
            dateFin,
            commentaire,
            dateLimite,
            statutAJour,
            typeClient: typeClient as any
          };
        });

        setConversionEquipmentList(mapped);
        setConversionUploadStatus({
          type: "success",
          message: `${mapped.length} appareils à convertir importés avec succès depuis "${file.name}" !`
        });
        setTimeout(() => setConversionUploadStatus(null), 8000);
      } catch (err: any) {
        console.error("Erreur lecture Excel:", err);
        setConversionUploadStatus({
          type: "error",
          message: `Erreur lors de la lecture du fichier : ${err?.message || "Format de fichier non reconnu"}`
        });
      } finally {
        if (conversionFileInputRef.current) {
          conversionFileInputRef.current.value = "";
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Conversion Handlers
  const handleAddConversionEquipment = () => {
    const newItem: ContractConversionEquipment = {
      id: `conv-${Date.now()}`,
      numAppareil: `${996500 + conversionEquipmentList.length + 1}`,
      dateMes: new Date().toISOString().slice(0, 10),
      nomClient: "Nouveau Client / Copropriété",
      statut: "Gratuité en cours",
      ville: "Oujda",
      agence: "Schindler Oujda",
      montantPpm: 15000,
      dureeGratuite: "12 mois",
      dateDebut: new Date().toISOString().slice(0, 10),
      dateFin: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      commentaire: "Négociation contrat Schindler",
      dateLimite: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      statutAJour: "À convertir",
      typeClient: "Syndic"
    };
    setConversionEquipmentList((prev) => [...prev, newItem]);
  };

  const handleRemoveConversionEquipment = (id: string) => {
    setConversionEquipmentList((prev) => prev.filter((item) => item.id !== id));
  };

  const handleConversionChange = (id: string, field: keyof ContractConversionEquipment, value: any) => {
    setConversionEquipmentList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDownloadConversionForecasts = () => {
    const data = conversionEquipmentList.map((eq) => ({
      "N° Appareil": eq.numAppareil || "",
      "Date de MES": eq.dateMes || "",
      "Nom du client": eq.nomClient || "",
      "Statut": eq.statut || "",
      "Ville": eq.ville || "",
      "Agence": eq.agence || "",
      "Montant PPM": eq.montantPpm || 0,
      "Durée de gratuité": eq.dureeGratuite || "",
      "Date de début": eq.dateDebut || "",
      "Date de fin": eq.dateFin || "",
      "Commentaire": eq.commentaire || "",
      "Date limite (>9 mois)": eq.dateLimite || "",
      "Statut à jour": eq.statutAJour || "",
      "Type client": eq.typeClient || ""
    }));

    exportToExcel(
      [{ sheetName: "Appareils_A_Convertir", data }],
      `Appareils_A_Convertir_Schindler_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Convert an apparatus directly into Section 5 (3 Months Contract Forecast)
  const handleConvertToForecast = (item: ContractConversionEquipment) => {
    const newForecast: ContractForecastItem = {
      id: `fct-conv-${Date.now()}`,
      clientName: item.nomClient || `Appareil ${item.numAppareil}`,
      contractModel: item.typeClient === "Tertiaire" ? "Modèle Étendu" : "Modèle Résidentiel",
      annualValueHT: item.montantPpm || 18000,
      expectedSignatureDate: item.dateFin || item.dateLimite || new Date().toISOString().slice(0, 10),
      renewalDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      probability: item.statut === "Accord verbal" ? 90 : item.statut === "En négociation" ? 75 : 80,
      status: item.statut === "Accord verbal" ? "Accord verbal client" : "Envoyé au client",
      schindlerRep: "OUSSAMA OUBGHOUS",
      notes: `Conversion appareil ${item.numAppareil} (${item.ville || "Schindler"}) - ${item.commentaire || "Suivi commercial"}`
    };
    setContractForecasts((prev) => [newForecast, ...prev]);
    setConversionUploadStatus({
      type: "success",
      message: `Appareil ${item.numAppareil} (${item.nomClient}) transféré avec succès vers les Prévisions 3 Mois !`
    });
    setTimeout(() => setConversionUploadStatus(null), 6000);
  };

  // Contract Forecast Handlers (3 Months Window)
  const handleAddContractForecast = () => {
    const newItem: ContractForecastItem = {
      id: `fct-${Date.now()}`,
      clientName: "Nouveau Client / Copropriété",
      contractModel: "Modèle Résidentiel",
      annualValueHT: 20000,
      expectedSignatureDate: new Date().toISOString().slice(0, 10),
      renewalDate: new Date().toISOString().slice(0, 10),
      probability: 80,
      status: "Envoyé au client",
      schindlerRep: "OUSSAMA OUBGHOUS",
      notes: "Prévision d'engagement contractuel"
    };
    setContractForecasts((prev) => [...prev, newItem]);
  };

  const handleRemoveContractForecast = (id: string) => {
    setContractForecasts((prev) => prev.filter((item) => item.id !== id));
  };

  const handleContractForecastChange = (id: string, field: keyof ContractForecastItem, value: any) => {
    setContractForecasts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const handleDownloadContractForecasts = () => {
    const months = getThreeMonthsList("2026-09-02");

    // Sheet 1: Detailed 3-Month Forecast List
    const detailData = contractForecasts.map((fct) => {
      const matchedMonth = months.find((m) => fct.expectedSignatureDate.startsWith(m.key));
      const periodName = matchedMonth ? matchedMonth.label : "Autres dates";
      return {
        "Période / Mois Prévu": periodName,
        "Client / Raison Sociale": fct.clientName,
        "Modèle de Contrat": fct.contractModel,
        "Valeur Annuelle HT (MAD)": fct.annualValueHT,
        "Date Signature Prévue": fct.expectedSignatureDate,
        "Date Échéance / Renouvellement": fct.renewalDate,
        "Probabilité (%)": `${fct.probability}%`,
        "Statut Contrat": fct.status,
        "Responsable Schindler": fct.schindlerRep,
        "Notes & Arbitrages": fct.notes || ""
      };
    });

    // Sheet 2: Monthly Summary for 3 Months
    const monthSummaries = months.map((m) => {
      const items = contractForecasts.filter((f) => f.expectedSignatureDate.startsWith(m.key));
      const totalHT = items.reduce((acc, i) => acc + (Number(i.annualValueHT) || 0), 0);
      const totalPondere = items.reduce((acc, i) => acc + (Number(i.annualValueHT) || 0) * ((i.probability || 0) / 100), 0);
      const signedOrVerbal = items
        .filter((i) => i.status === "Signée" || i.status === "Accord verbal client" || i.status === "Marché public")
        .reduce((acc, i) => acc + (Number(i.annualValueHT) || 0), 0);

      return {
        "Période / Mois": m.label,
        "Nombre de Contrats": items.length,
        "Chiffre d'Affaires Total HT (MAD)": totalHT,
        "CA Pondéré Probabilité HT (MAD)": Math.round(totalPondere),
        "CA Signé / Accord Verbal / MP (MAD)": signedOrVerbal
      };
    });

    const globalTotalHT = contractForecasts.reduce((acc, i) => acc + (Number(i.annualValueHT) || 0), 0);
    const globalTotalPondere = contractForecasts.reduce(
      (acc, i) => acc + (Number(i.annualValueHT) || 0) * ((i.probability || 0) / 100),
      0
    );
    const globalSignedOrVerbal = contractForecasts
      .filter((i) => i.status === "Signée" || i.status === "Accord verbal client" || i.status === "Marché public")
      .reduce((acc, i) => acc + (Number(i.annualValueHT) || 0), 0);

    monthSummaries.push({
      "Période / Mois": "TOTAL PRÉVISIONNEL 3 MOIS CUMULÉ",
      "Nombre de Contrats": contractForecasts.length,
      "Chiffre d'Affaires Total HT (MAD)": globalTotalHT,
      "CA Pondéré Probabilité HT (MAD)": Math.round(globalTotalPondere),
      "CA Signé / Accord Verbal / MP (MAD)": globalSignedOrVerbal
    });

    // Sheet 3: Breakdown by Status
    const statusSummaries = CONTRACT_FORECAST_STATUSES.map((st) => {
      const items = contractForecasts.filter((f) => f.status === st.label);
      const totalHT = items.reduce((acc, i) => acc + (Number(i.annualValueHT) || 0), 0);
      return {
        "Statut du Contrat": st.label,
        "Nombre de Contrats": items.length,
        "Chiffre d'Affaires HT (MAD)": totalHT,
        "Part du Total (%)": globalTotalHT > 0 ? `${((totalHT / globalTotalHT) * 100).toFixed(1)} %` : "0 %"
      };
    });

    exportToExcel(
      [
        { sheetName: "Previsions_3Mois_Detail", data: detailData },
        { sheetName: "Synthese_Mensuelle_3M", data: monthSummaries },
        { sheetName: "Repartition_Par_Statut", data: statusSummaries }
      ],
      `Previsions_Contrats_3Mois_Schindler_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Calculate Subtotals & Totals dynamically
  const subtotalApparatus = formData.apparatusList.reduce(
    (acc, curr) => acc + (Number(curr.priceHtAnnual) || 0),
    0
  );

  let optionsTotal = 0;
  if (formData.invoiceDepot.physical) optionsTotal += 600;
  if (formData.breakdownOptions.h24) optionsTotal += 1440;
  if (formData.breakdownOptions.under2h) optionsTotal += 960;

  const totalHT = subtotalApparatus + optionsTotal;
  const tvaAmount = Math.round(totalHT * (formData.tvaRate / 100) * 100) / 100;
  const totalTTC = Math.round((totalHT + tvaAmount) * 100) / 100;

  const handleRepChange = (repName: string) => {
    const found = SCHINDLER_REPS.find((r) => r.name === repName);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        schindlerRep: found.name,
        schindlerRepPhone: found.phone,
        schindlerRepEmail: found.email
      }));
    } else {
      setFormData((prev) => ({ ...prev, schindlerRep: repName }));
    }
  };

  const handleAddApparatus = () => {
    const newApp: ContractApparatus = {
      id: `app-${Date.now()}`,
      appNumber: `${996000 + formData.apparatusList.length + 1}`,
      type: "Ascenseur",
      clientBuilding: `Bâtiment ${String.fromCharCode(65 + formData.apparatusList.length)}`,
      capacityKg: 630,
      levels: "R+4",
      annualVisits: 12,
      priceHtAnnual: 7500
    };
    setFormData((prev) => ({
      ...prev,
      apparatusList: [...prev.apparatusList, newApp]
    }));
  };

  const handleRemoveApparatus = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      apparatusList: prev.apparatusList.filter((a) => a.id !== id)
    }));
  };

  const handleApparatusChange = (id: string, field: keyof ContractApparatus, value: any) => {
    setFormData((prev) => ({
      ...prev,
      apparatusList: prev.apparatusList.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    }));
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setDownloadSuccess(null);

    try {
      const isContract = formData.type === "Contrat de Prestation";

      if (isContract) {
        const payload = {
          contractModel: formData.contractModel,
          projectName: formData.projectName,
          clientName: formData.clientName,
          city: formData.city,
          effectiveDate: formData.effectiveDate,
          contractDuration: formData.contractDuration,
          billingMethod: formData.billingMethod,
          paymentMethod: formData.paymentMethod,
          tvaRate: formData.tvaRate,
          schindlerRep: `${formData.schindlerRep} (Tél: ${formData.schindlerRepPhone}, Email: ${formData.schindlerRepEmail})`,
          invoiceDepot: formData.invoiceDepot,
          breakdownOptions: formData.breakdownOptions,
          apparatusList: formData.apparatusList,
          totals: {
            subtotalApparatus,
            optionsTotal,
            totalHT,
            tvaAmount,
            totalTTC
          }
        };

        const res = await fetch("/api/contracts/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || "Erreur de génération du contrat.");
        }

        // Receive .docx blob and trigger instant download
        const blob = await res.blob();
        const cleanClient = (formData.clientName || formData.projectName || "Client").replace(/[^a-zA-Z0-9-_]/g, "_");
        const filename = `Contrat_Schindler_${cleanClient}_${formData.contractModel || "residentiel"}.docx`;

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setDownloadSuccess(`✅ Contrat "${filename}" rempli et téléchargé avec succès !`);
      } else if (formData.type === "Textes Devis Types") {
        const payload = {
          category: selectedDevisCategory,
          templateFile: selectedDevisTemplate,
          clientName: formData.clientName || formData.partyB || "Client Syndic",
          projectName: formData.projectName || formData.title || "Résidence",
          city: formData.city || "Casablanca",
          equipmentPfNumber: devisEquipmentPf,
          amountHT: devisAmountHT,
          executionDays: devisExecutionDays,
          technicalDescription: devisTechDesc,
          notes: formData.notes
        };

        const res = await fetch("/api/devis-templates/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        const blob = new Blob([data.text], { type: "text/plain;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const cleanTplName = (selectedDevisTemplate || "Devis_Type")
          .replace(/\.[^/.]+$/, "")
          .replace(/[^a-zA-Z0-9-_]/g, "_");
        const filename = `Devis_Type_${cleanTplName}_${devisEquipmentPf}.txt`;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setDownloadSuccess(`✅ Texte de Devis Type "${filename}" généré et téléchargé avec succès !`);
      } else {
        // Fallback AI document generation for other presets
        const payload = {
          documentType: formData.type,
          title: formData.title,
          parties: `Partie A: ${formData.partyA} | Partie B: ${formData.partyB}`,
          keyTerms: `Date d'effet: ${formData.effectiveDate}, Durée: ${formData.duration}, Rémunération/Montant: ${formData.remunerationOrAmount}`,
          clauses: `${formData.specificClauses}. Confidentialité: ${formData.confidentialityTerms}`,
          specificNotes: formData.notes
        };

        const res = await fetch("/api/gemini/generate-document", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (data.error) throw new Error(data.error);

        // Download text blob
        const blob = new Blob([data.text], { type: "text/plain;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${formData.type.replace(/[^a-zA-Z0-9-_]/g, "_")}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setDownloadSuccess(`✅ Document "${formData.type}" généré et téléchargé avec succès !`);
      }
    } catch (err: any) {
      alert(`⚠️ Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const activeModel = CONTRACT_MODELS.find((m) => m.id === formData.contractModel) || CONTRACT_MODELS[0];

  return (
    <div className="space-y-6">
      {/* Presets Header */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold text-slate-300 uppercase tracking-wider">
          <Bookmark className="w-3.5 h-3.5 text-purple-400" />
          <span>Sélection du Type de Document :</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-2.5">
          {DOCUMENT_PRESETS.map((preset, idx) => {
            const isSelected = formData.type === preset.type;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setVisitedDocTypes((prev) => (prev[preset.type] ? prev : { ...prev, [preset.type]: true }));
                  setFormData((prev) => ({ ...prev, type: preset.type }));
                }}
                className={`p-3 text-left rounded-xl border transition-colors duration-75 text-xs cursor-pointer ${
                  isSelected
                    ? "bg-purple-950/40 border-purple-500 shadow-md shadow-purple-950/50"
                    : "bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className={`font-semibold ${isSelected ? "text-purple-300" : "text-slate-200"}`}>
                    {preset.name}
                  </p>
                  {isSelected && <FileCheck2 className="w-4 h-4 text-purple-400" />}
                </div>
                <p className="text-[11px] text-slate-400 leading-tight">{preset.description}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dedicated high-fidelity sub-tools kept mounted once visited for instant switching */}
      {visitedDocTypes["Bon d'Ordre d'Intervention Clôture des NCs"] && (
        <div className={formData.type === "Bon d'Ordre d'Intervention Clôture des NCs" ? "block" : "hidden"}>
          <NcClosureDocument />
        </div>
      )}
      {visitedDocTypes["Attachements Grands Comptes"] && (
        <div className={formData.type === "Attachements Grands Comptes" ? "block" : "hidden"}>
          <GrandCompteAttachmentManager />
        </div>
      )}
      {visitedDocTypes["FAX d'Intervention"] && (
        <div className={formData.type === "FAX d'Intervention" ? "block" : "hidden"}>
          <FaxInterventionGenerator />
        </div>
      )}
      {visitedDocTypes["Rapport Technique & Diagnostic"] && (
        <div className={formData.type === "Rapport Technique & Diagnostic" ? "block" : "hidden"}>
          <TechnicalReportGenerator />
        </div>
      )}

      {/* Main Form */}
      <form
        onSubmit={handleGenerate}
        className={`p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6 text-xs ${
          formData.type !== "Bon d'Ordre d'Intervention Clôture des NCs" &&
          formData.type !== "Attachements Grands Comptes" &&
          formData.type !== "FAX d'Intervention" &&
          formData.type !== "Rapport Technique & Diagnostic"
            ? "block"
            : "hidden"
        }`}
      >
        {/* Document Header Bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-4 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Shield className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {formData.type === "Contrat de Prestation"
                  ? "Générateur de Contrat de Prestation Schindler"
                  : `Paramétrage : ${formData.type}`}
              </h3>
              <p className="text-slate-400 text-[11px]">Remplissage automatique des templates & téléchargement direct du fichier Word (.docx)</p>
            </div>
          </div>
        </div>

        {/* Contract Specific Logic: Contract Model Chooser */}
        {formData.type === "Contrat de Prestation" && (
          <div className="p-4 rounded-xl bg-slate-950/80 border border-purple-500/20 space-y-3">
            <label className="block text-slate-300 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Choix du Modèle de Contrat (Dossier Modèles Contrats) :</span>
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {CONTRACT_MODELS.map((model) => {
                const isCurrent = formData.contractModel === model.id;
                const IconComponent = model.icon;
                return (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, contractModel: model.id }))}
                    className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                      isCurrent
                        ? "bg-purple-900/30 border-purple-400 ring-1 ring-purple-500/40"
                        : "bg-slate-900/90 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-4 h-4 ${isCurrent ? "text-purple-400" : "text-slate-400"}`} />
                        <span className={`font-bold ${isCurrent ? "text-purple-200" : "text-slate-200"}`}>
                          {model.name}
                        </span>
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-mono">
                        .docx
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-normal">{model.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION 1: INFORMATIONS GÉNÉRALES DU CONTRAT */}
        {formData.type === "Contrat de Prestation" ? (
          <>
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800 pb-2">
                <Building2 className="w-4 h-4 text-purple-400" />
                <span className="uppercase tracking-wider text-xs">1. INFORMATIONS GÉNÉRALES DU CONTRAT</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">NOM DU PROJET</label>
                  <input
                    type="text"
                    required
                    value={formData.projectName}
                    onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                    placeholder="ex: Résidence Al Firdaous"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">RAISON SOCIALE / CLIENT</label>
                  <input
                    type="text"
                    required
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    placeholder="ex: Syndic Co-propriété Firdaous"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">VILLE</label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="ex: Casablanca"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">DATE D'EFFET (JJ/MM/AAAA)</label>
                  <input
                    type="date"
                    required
                    value={formData.effectiveDate}
                    onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    DURÉE DU CONTRAT <span className="text-purple-400 font-normal">({activeModel.name})</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contractDuration}
                    onChange={(e) => setFormData({ ...formData, contractDuration: e.target.value })}
                    placeholder="ex: 1 an, 2 ans, 3 ans, 18 mois..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {["1 an", "2 ans", "3 ans", "5 ans", "12 mois"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setFormData({ ...formData, contractDuration: preset })}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold border transition-colors cursor-pointer ${
                          formData.contractDuration === preset
                            ? "bg-purple-600/30 border-purple-400 text-purple-200"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500"
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: FACTURATION & OPTIONS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-2 text-slate-200 font-bold border-b border-slate-800 pb-2">
                <CreditCard className="w-4 h-4 text-purple-400" />
                <span className="uppercase tracking-wider text-xs">2. FACTURATION & OPTIONS</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">MODALITÉ DE FACTURATION</label>
                  <input
                    type="text"
                    value={formData.billingMethod}
                    onChange={(e) => setFormData({ ...formData, billingMethod: e.target.value })}
                    placeholder="ex: Fin de trimestre"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">MOYEN DE PAIEMENT</label>
                  <input
                    type="text"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    placeholder="ex: Virement ou chèque"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">TVA (%)</label>
                  <input
                    type="number"
                    value={formData.tvaRate}
                    onChange={(e) => setFormData({ ...formData, tvaRate: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                {/* Schindler Representative Dropdown */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold text-[11px] flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-purple-400" />
                    <span>RESPONSABLE SCHINDLER</span>
                  </label>
                  <select
                    value={formData.schindlerRep}
                    onChange={(e) => handleRepChange(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-100 text-xs focus:border-purple-500 focus:outline-none"
                  >
                    {SCHINDLER_REPS.map((rep) => (
                      <option key={rep.name} value={rep.name}>
                        {rep.name}
                      </option>
                    ))}
                  </select>
                  <div className="text-[11px] text-slate-400 space-y-0.5 pt-1">
                    <p>📞 Tél: <span className="text-slate-200">{formData.schindlerRepPhone}</span></p>
                    <p>✉️ Email: <span className="text-slate-200 truncate">{formData.schindlerRepEmail}</span></p>
                  </div>
                </div>

                {/* Dépôt des factures */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold text-[11px]">DÉPÔT DES FACTURES</label>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.invoiceDepot.dematerialized}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            invoiceDepot: { ...formData.invoiceDepot, dematerialized: e.target.checked }
                          })
                        }
                        className="w-4 h-4 accent-purple-500 rounded"
                      />
                      <span>Dématerialisé (Gratuit)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.invoiceDepot.physical}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            invoiceDepot: { ...formData.invoiceDepot, physical: e.target.checked }
                          })
                        }
                        className="w-4 h-4 accent-purple-500 rounded"
                      />
                      <span>Physique (+600 MAD)</span>
                    </label>
                  </div>
                </div>

                {/* Options de dépannage */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                  <label className="block text-slate-300 font-bold text-[11px]">OPTIONS DE DÉPANNAGE</label>
                  <div className="space-y-2 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.breakdownOptions.h24}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            breakdownOptions: { ...formData.breakdownOptions, h24: e.target.checked }
                          })
                        }
                        className="w-4 h-4 accent-purple-500 rounded"
                      />
                      <span>Horaires dépannages 24h/24 (+1 440 MAD)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-slate-200">
                      <input
                        type="checkbox"
                        checked={formData.breakdownOptions.under2h}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            breakdownOptions: { ...formData.breakdownOptions, under2h: e.target.checked }
                          })
                        }
                        className="w-4 h-4 accent-purple-500 rounded"
                      />
                      <span>Dépannage en - 2 heures (+960 MAD)</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: LISTE DES APPAREILS */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-slate-200 font-bold">
                  <Calculator className="w-4 h-4 text-purple-400" />
                  <span className="uppercase tracking-wider text-xs">3. LISTE DES APPAREILS</span>
                </div>
                <button
                  type="button"
                  onClick={handleAddApparatus}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-[11px] shadow transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ AJOUTER APPAREIL</span>
                </button>
              </div>

              {/* Apparatus Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                    <tr>
                      <th className="p-2.5">N° APP</th>
                      <th className="p-2.5">TYPE</th>
                      <th className="p-2.5">CLIENT/BÂT</th>
                      <th className="p-2.5 text-center">CHARGE (KG)</th>
                      <th className="p-2.5 text-center">NIVEAUX</th>
                      <th className="p-2.5 text-center">VISITES/AN</th>
                      <th className="p-2.5 text-right">PRIX HT/AN</th>
                      <th className="p-2.5 text-center">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {formData.apparatusList.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-900/40 transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.appNumber}
                            onChange={(e) => handleApparatusChange(item.id, "appNumber", e.target.value)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 font-mono text-[11px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.type}
                            onChange={(e) => handleApparatusChange(item.id, "type", e.target.value)}
                            className="w-28 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={item.clientBuilding}
                            onChange={(e) => handleApparatusChange(item.id, "clientBuilding", e.target.value)}
                            className="w-28 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={item.capacityKg}
                            onChange={(e) => handleApparatusChange(item.id, "capacityKg", Number(e.target.value) || 0)}
                            className="w-20 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center text-[11px]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="text"
                            value={item.levels}
                            onChange={(e) => handleApparatusChange(item.id, "levels", e.target.value)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center text-[11px]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <input
                            type="number"
                            value={item.annualVisits}
                            onChange={(e) => handleApparatusChange(item.id, "annualVisits", Number(e.target.value) || 0)}
                            className="w-16 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center text-[11px]"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            value={item.priceHtAnnual}
                            onChange={(e) => handleApparatusChange(item.id, "priceHtAnnual", Number(e.target.value) || 0)}
                            className="w-24 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-right font-mono font-semibold text-[11px]"
                          />
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveApparatus(item.id)}
                            disabled={formData.apparatusList.length <= 1}
                            className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                            title="Supprimer la ligne"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals Summary Box (Matching Screenshot 2 styling) */}
              <div className="flex justify-end pt-2">
                <div className="w-full sm:w-80 rounded-xl bg-slate-950 border border-slate-800 p-4 space-y-2 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span>Sous-total Appareils :</span>
                    <span className="font-mono text-slate-200 font-semibold">{subtotalApparatus.toLocaleString("fr-FR")} MAD</span>
                  </div>
                  {optionsTotal > 0 && (
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Suppléments Options :</span>
                      <span className="font-mono text-slate-200">{optionsTotal.toLocaleString("fr-FR")} MAD</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-slate-300 font-medium">
                    <span>TOTAL HT :</span>
                    <span className="font-mono font-bold text-slate-100">{totalHT.toLocaleString("fr-FR")} MAD</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-400">
                    <span>TVA ({formData.tvaRate}%) :</span>
                    <span className="font-mono text-slate-300">{tvaAmount.toLocaleString("fr-FR")} MAD</span>
                  </div>

                  {/* Highlighted Total TTC Box */}
                  <div className="mt-3 p-3 rounded-lg bg-rose-950/30 border border-rose-500/40 flex justify-between items-center">
                    <span className="font-bold text-rose-300 text-sm">TOTAL TTC :</span>
                    <span className="font-mono font-extrabold text-rose-400 text-base">
                      {totalTTC.toLocaleString("fr-FR")} MAD
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: APPAREILS À CONVERTIR (TRAME ÉTUDE & CONVERSION) */}
            <div className="space-y-4 pt-4 border-t border-slate-800">
              {/* Hidden Excel File Input for direct upload */}
              <input
                type="file"
                ref={conversionFileInputRef}
                accept=".xlsx,.xls,.csv"
                onChange={handleUploadConversionExcel}
                className="hidden"
              />

              {/* Upload Notification Banner */}
              {conversionUploadStatus && (
                <div
                  className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs animate-in fade-in slide-in-from-top-2 duration-300 ${
                    conversionUploadStatus.type === "success"
                      ? "bg-emerald-950/80 border-emerald-500/50 text-emerald-200"
                      : "bg-rose-950/80 border-rose-500/50 text-rose-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {conversionUploadStatus.type === "success" ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    )}
                    <span className="font-medium">{conversionUploadStatus.message}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setConversionUploadStatus(null)}
                    className="text-slate-400 hover:text-white text-xs font-bold px-1.5 py-0.5 rounded cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* SECTION HEADER & PRIMARY ACTIONS */}
              <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
                <div>
                  <div className="flex items-center gap-2 text-slate-100 font-bold">
                    <RefreshCw className="w-4 h-4 text-cyan-400" />
                    <span className="uppercase tracking-wider text-xs sm:text-sm">
                      4. LISTE DES APPAREILS À CONVERTIR (TRAME ÉTUDE & D'ÉCHÉANCIER)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Importez votre fichier Excel ou saisissez directement les appareils pour suivre les échéances de gratuité et planifier les conversions.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* UPLOAD EXCEL BUTTON */}
                  <button
                    type="button"
                    onClick={() => conversionFileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow transition-all cursor-pointer hover:shadow-cyan-900/30"
                    title="Uploader votre liste Excel d'appareils à convertir (.xlsx, .xls, .csv)"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Uploader Liste Appareils (.xlsx)</span>
                  </button>

                  {/* DOWNLOAD EXCEL BUTTON */}
                  <button
                    type="button"
                    onClick={handleDownloadConversionForecasts}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs shadow transition-all cursor-pointer"
                    title="Télécharger la liste actuelle au format Excel (.xlsx)"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Exporter (.xlsx)</span>
                  </button>

                  {/* ADD ROW BUTTON */}
                  <button
                    type="button"
                    onClick={handleAddConversionEquipment}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs shadow transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ AJOUTER APPAREIL</span>
                  </button>
                </div>
              </div>

              {/* KPI STATS CARDS FOR CONVERSION PORTFOLIO */}
              {(() => {
                const totalAppareils = conversionEquipmentList.length;
                const totalMontantPPM = conversionEquipmentList.reduce(
                  (acc, eq) => acc + (Number(eq.montantPpm) || 0),
                  0
                );
                const enGratuite = conversionEquipmentList.filter(
                  (eq) => eq.statut?.toLowerCase().includes("gratuit") || eq.statutAJour?.toLowerCase().includes("gratuit")
                ).length;
                const enNegociation = conversionEquipmentList.filter(
                  (eq) =>
                    eq.statut?.toLowerCase().includes("négoc") ||
                    eq.statut?.toLowerCase().includes("accord") ||
                    eq.statutAJour?.toLowerCase().includes("négoc")
                ).length;

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                        Total Appareils
                      </div>
                      <div className="text-lg font-bold text-slate-100 mt-1 font-mono">
                        {totalAppareils} <span className="text-xs font-normal text-slate-400">ascenseurs</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-cyan-400">
                        Montant PPM Total
                      </div>
                      <div className="text-lg font-bold text-cyan-300 mt-1 font-mono">
                        {totalMontantPPM.toLocaleString("fr-FR")} <span className="text-xs font-normal text-slate-400">MAD</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-amber-400">
                        Sous Gratuité
                      </div>
                      <div className="text-lg font-bold text-amber-300 mt-1 font-mono">
                        {enGratuite} <span className="text-xs font-normal text-slate-400">contrats</span>
                      </div>
                    </div>
                    <div className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3">
                      <div className="text-[10px] uppercase font-semibold tracking-wider text-emerald-400">
                        En Négociation / Accord
                      </div>
                      <div className="text-lg font-bold text-emerald-300 mt-1 font-mono">
                        {enNegociation} <span className="text-xs font-normal text-slate-400">dossiers</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* SEARCH & FILTERS BAR */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Rechercher par N° Appareil, Client, Ville, Agence..."
                      value={conversionSearch}
                      onChange={(e) => setConversionSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-100 text-xs placeholder:text-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <select
                    value={conversionStatusFilter}
                    onChange={(e) => setConversionStatusFilter(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="all">Tous les Statuts</option>
                    <option value="Gratuité en cours">Gratuité en cours</option>
                    <option value="À convertir">À convertir</option>
                    <option value="En négociation">En négociation</option>
                    <option value="Accord verbal">Accord verbal</option>
                    <option value="Converti / Signé">Converti / Signé</option>
                  </select>
                </div>
                <div className="text-slate-400 text-[11px] font-mono">
                  {(() => {
                    const filtered = conversionEquipmentList.filter((eq) => {
                      const matchSearch =
                        !conversionSearch ||
                        (eq.numAppareil && eq.numAppareil.toLowerCase().includes(conversionSearch.toLowerCase())) ||
                        (eq.nomClient && eq.nomClient.toLowerCase().includes(conversionSearch.toLowerCase())) ||
                        (eq.ville && eq.ville.toLowerCase().includes(conversionSearch.toLowerCase())) ||
                        (eq.agence && eq.agence.toLowerCase().includes(conversionSearch.toLowerCase()));
                      const matchStatus =
                        conversionStatusFilter === "all" ||
                        (eq.statut && eq.statut.toLowerCase().includes(conversionStatusFilter.toLowerCase())) ||
                        (eq.statutAJour && eq.statutAJour.toLowerCase().includes(conversionStatusFilter.toLowerCase()));
                      return matchSearch && matchStatus;
                    });
                    return `${filtered.length} / ${conversionEquipmentList.length} appareil(s) affiché(s)`;
                  })()}
                </div>
              </div>

              {/* 14-COLUMNS DATA TABLE (MATCHING EXACT USER EXCEL BLUEPRINT) */}
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 shadow-2xl">
                <table className="w-full text-left text-[11px] border-collapse min-w-[1400px]">
                  <thead className="bg-[#0092d0] text-white font-bold tracking-tight text-[11.5px] select-none">
                    <tr className="divide-x divide-[#007cb3]">
                      <th className="p-2.5 whitespace-nowrap text-center w-[90px]">N° Appareil</th>
                      <th className="p-2.5 whitespace-nowrap text-center w-[110px]">Date de MES</th>
                      <th className="p-2.5 whitespace-nowrap min-w-[200px]">Nom du client</th>
                      <th className="p-2.5 whitespace-nowrap w-[130px]">Statut</th>
                      <th className="p-2.5 whitespace-nowrap w-[100px]">Ville</th>
                      <th className="p-2.5 whitespace-nowrap w-[120px]">Agence</th>
                      <th className="p-2.5 whitespace-nowrap text-right w-[110px]">Montant PPM</th>
                      <th className="p-2.5 whitespace-nowrap text-center w-[110px]">Durée gratuité</th>
                      <th className="p-2.5 whitespace-nowrap text-center w-[110px]">Date de début</th>
                      <th className="p-2.5 whitespace-nowrap text-center w-[110px]">Date de fin</th>
                      <th className="p-2.5 whitespace-nowrap min-w-[180px]">Commentaire</th>
                      <th className="p-2.5 whitespace-nowrap text-center w-[120px]">Date limite (&gt;9 mois)</th>
                      <th className="p-2.5 whitespace-nowrap w-[120px]">Statut à jour</th>
                      <th className="p-2.5 whitespace-nowrap w-[110px]">Type client</th>
                      <th className="p-2.5 whitespace-nowrap text-center w-[90px] bg-[#007cb3]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {conversionEquipmentList
                      .filter((eq) => {
                        const matchSearch =
                          !conversionSearch ||
                          (eq.numAppareil && eq.numAppareil.toLowerCase().includes(conversionSearch.toLowerCase())) ||
                          (eq.nomClient && eq.nomClient.toLowerCase().includes(conversionSearch.toLowerCase())) ||
                          (eq.ville && eq.ville.toLowerCase().includes(conversionSearch.toLowerCase())) ||
                          (eq.agence && eq.agence.toLowerCase().includes(conversionSearch.toLowerCase()));
                        const matchStatus =
                          conversionStatusFilter === "all" ||
                          (eq.statut && eq.statut.toLowerCase().includes(conversionStatusFilter.toLowerCase())) ||
                          (eq.statutAJour && eq.statutAJour.toLowerCase().includes(conversionStatusFilter.toLowerCase()));
                        return matchSearch && matchStatus;
                      })
                      .map((item) => (
                        <tr key={item.id} className="hover:bg-slate-900/60 transition-colors divide-x divide-slate-800/60">
                          {/* 1. N° Appareil */}
                          <td className="p-1.5 text-center">
                            <input
                              type="text"
                              value={item.numAppareil}
                              onChange={(e) => handleConversionChange(item.id, "numAppareil", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1.5 py-1 text-slate-100 font-mono text-center font-bold text-[11px]"
                            />
                          </td>

                          {/* 2. Date de MES */}
                          <td className="p-1.5 text-center">
                            <input
                              type="date"
                              value={item.dateMes || ""}
                              onChange={(e) => handleConversionChange(item.id, "dateMes", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1 py-1 text-slate-100 text-center text-[10.5px]"
                            />
                          </td>

                          {/* 3. Nom du client */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.nomClient || ""}
                              onChange={(e) => handleConversionChange(item.id, "nomClient", e.target.value)}
                              placeholder="Nom du client / résidence..."
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-2 py-1 text-slate-100 font-medium text-[11px]"
                            />
                          </td>

                          {/* 4. Statut */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.statut || ""}
                              onChange={(e) => handleConversionChange(item.id, "statut", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1.5 py-1 text-slate-100 text-[11px]"
                            />
                          </td>

                          {/* 5. Ville */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.ville || ""}
                              onChange={(e) => handleConversionChange(item.id, "ville", e.target.value)}
                              placeholder="Ville"
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1.5 py-1 text-slate-100 text-[11px]"
                            />
                          </td>

                          {/* 6. Agence */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.agence || ""}
                              onChange={(e) => handleConversionChange(item.id, "agence", e.target.value)}
                              placeholder="Agence"
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1.5 py-1 text-slate-100 text-[11px]"
                            />
                          </td>

                          {/* 7. Montant PPM */}
                          <td className="p-1.5 text-right">
                            <input
                              type="number"
                              value={item.montantPpm || 0}
                              onChange={(e) => handleConversionChange(item.id, "montantPpm", Number(e.target.value) || 0)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1.5 py-1 text-cyan-300 font-mono font-semibold text-right text-[11px]"
                            />
                          </td>

                          {/* 8. Durée de gratuité */}
                          <td className="p-1.5 text-center">
                            <input
                              type="text"
                              value={item.dureeGratuite || "12 mois"}
                              onChange={(e) => handleConversionChange(item.id, "dureeGratuite", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1 py-1 text-slate-100 text-center text-[11px]"
                            />
                          </td>

                          {/* 9. Date de début */}
                          <td className="p-1.5 text-center">
                            <input
                              type="date"
                              value={item.dateDebut || ""}
                              onChange={(e) => handleConversionChange(item.id, "dateDebut", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1 py-1 text-slate-100 text-center text-[10.5px]"
                            />
                          </td>

                          {/* 10. Date de fin */}
                          <td className="p-1.5 text-center">
                            <input
                              type="date"
                              value={item.dateFin || ""}
                              onChange={(e) => handleConversionChange(item.id, "dateFin", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1 py-1 text-slate-100 text-center text-[10.5px]"
                            />
                          </td>

                          {/* 11. Commentaire */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.commentaire || ""}
                              onChange={(e) => handleConversionChange(item.id, "commentaire", e.target.value)}
                              placeholder="Notes & suivi..."
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-2 py-1 text-slate-100 text-[11px]"
                            />
                          </td>

                          {/* 12. Date limite (>9 mois) */}
                          <td className="p-1.5 text-center">
                            <input
                              type="date"
                              value={item.dateLimite || ""}
                              onChange={(e) => handleConversionChange(item.id, "dateLimite", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1 py-1 text-amber-300 font-medium text-center text-[10.5px]"
                            />
                          </td>

                          {/* 13. Statut à jour */}
                          <td className="p-1.5">
                            <input
                              type="text"
                              value={item.statutAJour || item.statut || ""}
                              onChange={(e) => handleConversionChange(item.id, "statutAJour", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1.5 py-1 text-slate-100 text-[11px]"
                            />
                          </td>

                          {/* 14. Type client */}
                          <td className="p-1.5">
                            <select
                              value={item.typeClient || "Syndic"}
                              onChange={(e) => handleConversionChange(item.id, "typeClient", e.target.value)}
                              className="w-full bg-slate-900/80 border border-slate-700/60 rounded px-1 py-1 text-slate-100 text-[11px]"
                            >
                              <option value="Syndic">Syndic</option>
                              <option value="Promotion">Promotion</option>
                              <option value="Tertiaire">Tertiaire</option>
                              <option value="Individuel">Individuel</option>
                              <option value="Industriel">Industriel</option>
                            </select>
                          </td>

                          {/* Actions: Transférer vers Prévision 3 Mois + Supprimer */}
                          <td className="p-1.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleConvertToForecast(item)}
                                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/60 rounded transition-colors cursor-pointer"
                                title="Transférer vers Section 5 (Prévisions 3 Mois)"
                              >
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveConversionEquipment(item.id)}
                                disabled={conversionEquipmentList.length <= 1}
                                className="p-1 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                title="Supprimer la ligne"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* SECTION 5: PRÉVISIONS CONTRACTUELLES & RENOUVELLEMENTS SUR 3 MOIS */}
            {(() => {
              const threeMonths = getThreeMonthsList("2026-09-02");
              const filteredForecasts = forecastMonthFilter === "all"
                ? contractForecasts
                : contractForecasts.filter((f) => f.expectedSignatureDate.startsWith(forecastMonthFilter));

              const total3MHT = contractForecasts.reduce((acc, i) => acc + (Number(i.annualValueHT) || 0), 0);
              const total3MPondere = contractForecasts.reduce(
                (acc, i) => acc + (Number(i.annualValueHT) || 0) * ((i.probability || 0) / 100),
                0
              );

              return (
                <div className="space-y-4 pt-4 border-t border-slate-800">
                  <div className="flex flex-wrap items-center justify-between border-b border-slate-800 pb-3 gap-3">
                    <div>
                      <div className="flex items-center gap-2 text-slate-100 font-bold">
                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                        <span className="uppercase tracking-wider text-xs sm:text-sm">
                          5. PRÉVISIONS CONTRACTUELLES SUR 3 MOIS (Mois Actuel Inclus)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Couverture des engagements : {threeMonths[0].name} (Mois Actuel) à {threeMonths[2].name}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadContractForecasts}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow transition-all cursor-pointer"
                        title="Télécharger les prévisions de 3 mois au format Excel (.xlsx)"
                      >
                        <Download className="w-4 h-4" />
                        <span>Télécharger Prévisions 3 Mois (.xlsx)</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleAddContractForecast}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow transition-all cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>+ AJOUTER PRÉVISION</span>
                      </button>
                    </div>
                  </div>

                  {/* 3 MONTH KPI SUMMARY CARDS */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {threeMonths.map((m, idx) => {
                      const monthItems = contractForecasts.filter((f) => f.expectedSignatureDate.startsWith(m.key));
                      const monthTotal = monthItems.reduce((acc, f) => acc + (Number(f.annualValueHT) || 0), 0);
                      return (
                        <div
                          key={m.key}
                          onClick={() => setForecastMonthFilter(forecastMonthFilter === m.key ? "all" : m.key)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            forecastMonthFilter === m.key
                              ? "bg-purple-950/60 border-purple-500 ring-1 ring-purple-500/50"
                              : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                            <span className="font-semibold">{m.label}</span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono text-[10px]">
                              {monthItems.length} contrat{monthItems.length > 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="text-sm sm:text-base font-extrabold text-emerald-400 font-mono">
                            {monthTotal.toLocaleString("fr-FR")} MAD
                          </p>
                          <p className="text-[10px] text-slate-500 mt-1">
                            {idx === 0 ? "Mois Actuel en cours" : `Échéance à M+${idx}`}
                          </p>
                        </div>
                      );
                    })}

                    <div
                      onClick={() => setForecastMonthFilter("all")}
                      className={`p-3 rounded-xl border transition-all cursor-pointer ${
                        forecastMonthFilter === "all"
                          ? "bg-emerald-950/60 border-emerald-500 ring-1 ring-emerald-500/50"
                          : "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                        <span className="font-semibold text-emerald-300">TOTAL CUMULÉ 3M</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 font-mono text-[10px]">
                          {contractForecasts.length} dossiers
                        </span>
                      </div>
                      <p className="text-sm sm:text-base font-extrabold text-slate-100 font-mono">
                        {total3MHT.toLocaleString("fr-FR")} MAD
                      </p>
                      <p className="text-[10px] text-amber-300/80 mt-1 font-mono">
                        Pondéré ({Math.round(total3MPondere).toLocaleString("fr-FR")} MAD)
                      </p>
                    </div>
                  </div>

                  {/* FILTER BAR */}
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 rounded-lg p-2 text-[11px]">
                    <div className="flex items-center gap-2 text-slate-300 font-medium">
                      <span>Filtrer par mois :</span>
                      <select
                        value={forecastMonthFilter}
                        onChange={(e) => setForecastMonthFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-semibold"
                      >
                        <option value="all">Tous les 3 Mois ({threeMonths[0].name} → {threeMonths[2].name})</option>
                        {threeMonths.map((m) => (
                          <option key={m.key} value={m.key}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {filteredForecasts.length} contrat(s) affiché(s)
                    </span>
                  </div>

                  {/* FORECAST TABLE */}
                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/80">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-slate-900 border-b border-slate-800 text-slate-300 font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="p-2.5">Client / Projet</th>
                          <th className="p-2.5">Modèle</th>
                          <th className="p-2.5 text-right">Valeur Annuelle HT</th>
                          <th className="p-2.5 text-center">Date Signature Prévue</th>
                          <th className="p-2.5 text-center">Renouvellement</th>
                          <th className="p-2.5 text-center">Probabilité</th>
                          <th className="p-2.5">Statut Contrat</th>
                          <th className="p-2.5">Responsable</th>
                          <th className="p-2.5">Notes</th>
                          <th className="p-2.5 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {filteredForecasts.map((fct) => {
                          const matchedStatus = CONTRACT_FORECAST_STATUSES.find((s) => s.label === fct.status);
                          const badgeClass = matchedStatus ? matchedStatus.badgeClass : "text-slate-300 bg-slate-900 border-slate-700";

                          return (
                            <tr key={fct.id} className="hover:bg-slate-900/40 transition-colors">
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={fct.clientName}
                                  onChange={(e) => handleContractForecastChange(fct.id, "clientName", e.target.value)}
                                  className="w-36 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                                />
                              </td>
                              <td className="p-2">
                                <select
                                  value={fct.contractModel}
                                  onChange={(e) => handleContractForecastChange(fct.id, "contractModel", e.target.value)}
                                  className="w-32 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                                >
                                  <option value="Modèle Résidentiel">Modèle Résidentiel</option>
                                  <option value="Modèle Simple">Modèle Simple</option>
                                  <option value="Modèle Étendu">Modèle Étendu</option>
                                </select>
                              </td>
                              <td className="p-2 text-right">
                                <input
                                  type="number"
                                  value={fct.annualValueHT}
                                  onChange={(e) => handleContractForecastChange(fct.id, "annualValueHT", Number(e.target.value) || 0)}
                                  className="w-24 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-right font-mono font-semibold text-[11px]"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="date"
                                  value={fct.expectedSignatureDate}
                                  onChange={(e) => handleContractForecastChange(fct.id, "expectedSignatureDate", e.target.value)}
                                  className="w-28 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <input
                                  type="date"
                                  value={fct.renewalDate}
                                  onChange={(e) => handleContractForecastChange(fct.id, "renewalDate", e.target.value)}
                                  className="w-28 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={fct.probability}
                                    onChange={(e) => handleContractForecastChange(fct.id, "probability", Number(e.target.value) || 0)}
                                    className="w-14 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-center font-bold text-[11px]"
                                  />
                                  <span className="text-slate-400 text-[10px]">%</span>
                                </div>
                              </td>
                              <td className="p-2">
                                <select
                                  value={fct.status}
                                  onChange={(e) => handleContractForecastChange(fct.id, "status", e.target.value as ContractForecastStatus)}
                                  className={`w-40 border rounded p-1.5 text-[11px] font-semibold cursor-pointer ${badgeClass}`}
                                >
                                  {CONTRACT_FORECAST_STATUSES.map((st) => (
                                    <option key={st.label} value={st.label} className="bg-slate-900 text-slate-100 font-normal">
                                      {st.label}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={fct.schindlerRep}
                                  onChange={(e) => handleContractForecastChange(fct.id, "schindlerRep", e.target.value)}
                                  className="w-28 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                                />
                              </td>
                              <td className="p-2">
                                <input
                                  type="text"
                                  value={fct.notes}
                                  onChange={(e) => handleContractForecastChange(fct.id, "notes", e.target.value)}
                                  className="w-32 bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-100 text-[11px]"
                                />
                              </td>
                              <td className="p-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveContractForecast(fct.id)}
                                  disabled={contractForecasts.length <= 1}
                                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/50 rounded transition-colors disabled:opacity-30 cursor-pointer"
                                  title="Supprimer la ligne"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </>
        ) : formData.type === "Textes Devis Types" ? (
          /* Form for Texte pour Devis Type */
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-500/30 space-y-3">
              <div className="flex items-center gap-2 text-purple-300 font-bold text-xs uppercase tracking-wider">
                <FileText className="w-4 h-4 text-purple-400" />
                <span>Choix du Modèle de Devis Type (Dossier "Texte pour Devis Type")</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">CATÉGORIE DE TRAVAUX / ORGANES</label>
                  <select
                    value={selectedDevisCategory}
                    onChange={(e) => handleDevisCategorySelect(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-purple-500 focus:outline-none text-xs"
                  >
                    {devisCategories.map((cat) => (
                      <option key={cat.name} value={cat.name}>
                        📁 {cat.name} ({cat.files.length} modèle(s))
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">MODÈLE DE FICHIER DEVIS</label>
                  <select
                    value={selectedDevisTemplate}
                    onChange={(e) => setSelectedDevisTemplate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:border-purple-500 focus:outline-none text-xs"
                  >
                    {(devisCategories.find((c) => c.name === selectedDevisCategory)?.files || []).map((file) => (
                      <option key={file} value={file}>
                        📄 {file}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">CLIENT / SYNDIC</label>
                <input
                  type="text"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="ex: Syndic Co-propriété Firdaous"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">NOM DU PROJET / IMMEUBLE</label>
                <input
                  type="text"
                  value={formData.projectName}
                  onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
                  placeholder="ex: Résidence Al Firdaous"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">N° APPAREIL (PF)</label>
                <input
                  type="text"
                  value={devisEquipmentPf}
                  onChange={(e) => setDevisEquipmentPf(e.target.value)}
                  placeholder="ex: PF-78012"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">MONTANT HT ESTIMÉ (MAD)</label>
                <input
                  type="number"
                  value={devisAmountHT}
                  onChange={(e) => setDevisAmountHT(e.target.value)}
                  placeholder="ex: 18500"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">DÉLAIS D'EXÉCUTION</label>
                <input
                  type="text"
                  value={devisExecutionDays}
                  onChange={(e) => setDevisExecutionDays(e.target.value)}
                  placeholder="ex: 15 jours ouvrés à compter de la commande"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">VILLE</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="ex: Casablanca"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">SPÉCIFICATIONS TECHNIQUES & FOURNITURES</label>
              <textarea
                rows={3}
                value={devisTechDesc}
                onChange={(e) => setDevisTechDesc(e.target.value)}
                placeholder="Description détaillée des pièces, matériels et prestations à fournir..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-100"
              />
            </div>
          </div>
        ) : (
          /* General Form for Standard Non-Contract Documents */
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Titre / Objet Principal</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                  placeholder="ex: Contrat cadre de prestation informatique..."
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Date d'effet</label>
                <input
                  type="date"
                  value={formData.effectiveDate}
                  onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Partie A (Émetteur / Client)</label>
                <textarea
                  rows={2}
                  value={formData.partyA}
                  onChange={(e) => setFormData({ ...formData, partyA: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Partie B (Bénéficiaire / Prestataire)</label>
                <textarea
                  rows={2}
                  value={formData.partyB}
                  onChange={(e) => setFormData({ ...formData, partyB: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-400 mb-1">Obligations & Livrables Clés</label>
                <textarea
                  rows={2}
                  value={formData.keyObligations}
                  onChange={(e) => setFormData({ ...formData, keyObligations: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
              <div>
                <label className="block text-slate-400 mb-1">Clauses Spécifiques Souhaitées</label>
                <textarea
                  rows={2}
                  value={formData.specificClauses}
                  onChange={(e) => setFormData({ ...formData, specificClauses: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>
          </div>
        )}

        {/* Submit Button Bar */}
        <div className="pt-4 flex flex-wrap items-center justify-end border-t border-slate-800 gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-teal-500 hover:from-purple-500 hover:to-teal-400 text-white font-extrabold text-sm shadow-xl shadow-purple-950/50 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Download className="w-4 h-4 text-purple-200" />
            <span>
              {loading
                ? "Génération en cours..."
                : formData.type === "Contrat de Prestation"
                ? "Générer Contrat (.docx)"
                : formData.type === "Textes Devis Types"
                ? "Générer Texte Devis Type"
                : "Générer Document"}
            </span>
          </button>
        </div>
      </form>

      {/* Success Download Notification */}
      {downloadSuccess && (
        <div className="p-4 rounded-xl bg-teal-950/60 border border-teal-500/40 text-teal-200 flex items-center justify-between text-xs font-semibold animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>{downloadSuccess}</span>
          </div>
          <button
            onClick={() => setDownloadSuccess(null)}
            className="text-teal-400 hover:text-teal-200 font-bold px-2 py-1 rounded bg-teal-900/40 border border-teal-500/30 text-[11px]"
          >
            Fermer
          </button>
        </div>
      )}
    </div>
  );
};
