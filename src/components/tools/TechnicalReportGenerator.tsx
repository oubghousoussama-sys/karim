import React, { useState, useEffect, useMemo, useRef } from "react";
import Markdown from "react-markdown";
import {
  FileText,
  Wrench,
  Sparkles,
  Download,
  Printer,
  Copy,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Building2,
  Shield,
  Layers,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Eye,
  Edit3,
  Search,
  Check,
  Zap,
  Info,
  Sliders,
  FileCheck,
  CheckCircle,
  Save,
  X
} from "lucide-react";
import jsPDF from "jspdf";
import {
  TechnicalReportData,
  TechnicalReportAnomaly,
  TechnicalReportPart,
  AnomalyCriticality,
  PFEquipment
} from "../../types";
import { INITIAL_PF_EQUIPMENTS } from "../../data/mockPFData";

const STORAGE_KEY_REPORTS = "toolbox_technical_reports_history_v1";

// Helper to compute a standard generic report number containing the equipment PF number
export function formatGenericReportNumber(
  equipmentNumber: string,
  dateStr?: string,
  sequence: string | number = "01"
): string {
  const cleanPf = (equipmentNumber || "PF-78012")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  const year = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const seq = String(sequence).padStart(2, "0");
  return `RT-${year}-${cleanPf}-${seq}`;
}

// Mock preset technical diagnostics for Schindler Elevators
const PRESET_DIAGNOSTICS = [
  {
    title: "Défaut Variateur VF & Bruit Poulie (Schindler 3300)",
    clientName: "Résidence Al Firdaous",
    equipmentNumber: "PF-78012",
    equipmentType: "Schindler 3300 - Traction MRL",
    locationCity: "Casablanca",
    technicianName: "Abdeljalil Ait Bahmed",
    supervisorName: "Oussama Oubghous",
    siteObservation:
      "Appareil arrêté à l'étage 3 avec code d'erreur FC (Overcurrent / Défaut Variateur VF). Signalement par le syndic de bruits métalliques au niveau de la poulie de traction et d'à-coups lors des démarrages en montée.",
    anomalies: [
      {
        id: "ano-1",
        title: "Surchauffe et déclenchement thermique du Variateur VF11BR",
        organ: "Armoire de manœuvre / Variateur",
        description:
          "Le variateur de fréquence présente une surintensité intermittente lors des accélérations avec ventilation interne encrassée et condensateurs de puissance montrant des signes de vieillissement.",
        causes:
          "Empoussièrement important de l'échangeur thermique du variateur combiné à une tension anormale sur les courroies/câbles STM créant un couple moteur excessif.",
        impact:
          "Arrêt intempestif de l'appareil avec mise en sécurité passagers, perturbation du trafic résidentiel.",
        actionsDone:
          "Dépoussiérage complet du variateur au compresseur sec, contrôle des serrages des borniers puissance, réinitialisation des défauts et test de 10 cycles à vide.",
        temporarySolution:
          "Ajustement temporaire de la rampe d'accélération à 0.6 m/s² pour réduire l'appel de courant crête.",
        definitiveSolution:
          "Remplacement préventif du ventilateur de refroidissement du variateur et recalibrage complet du pesage de charge (Load Weighing Device).",
        requiredParts: "Ventilateur variateur VF11BR (Réf: 59314050), Capteur de pesage LWD.",
        criticality: "Élevé" as AnomalyCriticality,
        preventiveRecommendations:
          "Nettoyage semestriel des filtres d'aération armoire et contrôle de l'équilibrage contrepoids."
      },
      {
        id: "ano-2",
        title: "Usure prononcée des garnitures de gorge de la poulie de traction",
        organ: "Traction / Poulie",
        description:
          "Bruit de frottement métallique continu en cabine et légère vibration ressentie à mi-course.",
        causes: "Frottement asymétrique des câbles STM suite à une perte de tension différentielle.",
        impact: "Risque de dégradation prématurée des médias de traction et inconfort usagers.",
        actionsDone:
          "Mesure de la tension des câbles avec tensiomètre et lubrification contrôlée des guides.",
        temporarySolution: "Réalignement de la tension des brins de suspension sur étriers ressorts.",
        definitiveSolution:
          "Changement des courroies STM et remplacement de la poulie de déviation supérieure.",
        requiredParts: "Courroie STM PV30 (30m) (Réf: 59302144), Poulie de guidage Ø240 (Réf: 59310892).",
        criticality: "Moyen" as AnomalyCriticality,
        preventiveRecommendations: "Contrôle visuel systématique de l'état des STM tous les trimestres."
      }
    ],
    historyAndRecurrence:
      "3 interventions enregistrées au cours des 60 derniers jours pour des blocages fugitifs F5 / FC aux heures de pointe. Tendance à l'échauffement confirmée par les logs de la manœuvre Bionic 5.",
    worksDone:
      "1. Mise en sécurité et consignation électrique de l'appareil.\n2. Diagnostic complet via terminal de service SMLCD (lecture historique erreurs).\n3. Nettoyage des circuits de puissance et ventilation armoire.\n4. Réglage mécanique de la tension des câbles STM.\n5. Essais de surcharge et contrôle du parachute à vitesse d'inspection.",
    replacedOrOrderedParts: [
      {
        id: "part-1",
        designation: "Ventilateur de refroidissement Variateur VF11BR",
        reference: "59314050",
        quantity: "1",
        reason: "Roulement de ventilateur grippé provoquant surchauffe",
        status: "À commander en urgence" as const
      },
      {
        id: "part-2",
        designation: "Jeu de courroies STM PV30-4",
        reference: "59302144",
        quantity: "4",
        reason: "Usure superficielle et perte de flexibilité constatée",
        status: "À chiffrer sur devis" as const
      }
    ],
    technicalRecommendations:
      "1. Prévoir un devis de rénovation des médias de suspension STM sous 30 jours.\n2. Assurer une aération adéquate du local machinerie / gaine supérieure (T° ambiante < 35°C).\n3. Programmation d'un audit de nivellement après 5000 courses.",
    conclusion:
      "L'appareil a été remis en service opérationnel sécurisé avec surveillance active. Les travaux définitifs sur le variateur et les STM sont indispensables pour garantir une disponibilité pérenne 99.5%."
  },
  {
    title: "Blocage Opérateur de Porte Fermator & Sabot (Schindler 5500)",
    clientName: "Centre Commercial Tanger City",
    equipmentNumber: "PF-89410",
    equipmentType: "Schindler 5500 - Forte Fréquentation",
    locationCity: "Tanger",
    technicianName: "Mohamed Benali",
    supervisorName: "Oussama Oubghous",
    siteObservation:
      "Appareil immobilisé au RDC avec portes cabine entrouvertes. L'opérateur de porte patine et la chaîne cinématique est bloquée par un corps étranger dans le seuil palier.",
    anomalies: [
      {
        id: "ano-1",
        title: "Désalignement du sabre d'entraînement et usure galets de suspension",
        organ: "Portes cabine & palières / Opérateur",
        description:
          "Les galets excentriques du chariot de porte présentent un jeu mécanique supérieur à 2.5 mm, provoquant un arc-boutement lors de la fermeture.",
        causes: "Chocs répétés dus au passage de chariots de livraison et manque de lubrification des rails.",
        impact: "Réouvertures intempestives et blocage passagers avec défaut de série de verrouillage.",
        actionsDone:
          "Extraction des débris dans la rainure de seuil, recentrage mécanique du sabre et réglage des fins de course optiques.",
        temporarySolution:
          "Nettoyage et lubrification au PTFE du rail supérieur et réajustement des excentriques.",
        definitiveSolution:
          "Remplacement complet du kit de galets supérieurs et de la courroie crantée d'opérateur.",
        requiredParts: "Kit galets porte V30 (Réf: 59345210), Courroie crantée HTD 5M (Réf: 59388120).",
        criticality: "Élevé" as AnomalyCriticality,
        preventiveRecommendations:
          "Sensibiliser les équipes de nettoyage au brossage quotidien des seuils de porte."
      }
    ],
    historyAndRecurrence:
      "Forte récurrence des appels pour portes lentes ou bloquées le week-end lors des pics d'affluence.",
    worksDone:
      "1. Déblocage mécanique du vantail et nettoyage haute pression du seuil.\n2. Contrôle d'isolement du moteur d'opérateur et de la cellule photo-électrique 2D.\n3. Programmation de l'apprentissage de course (Door Learn Run) sur carte commande porte.\n4. Test de fermeture avec obstacle et mesure de la force cinétique (<150N conforme EN81-20).",
    replacedOrOrderedParts: [
      {
        id: "part-1",
        designation: "Courroie Crantée d'Opérateur de Porte",
        reference: "59388120",
        quantity: "1",
        reason: "Dents effilochées et perte d'adhérence",
        status: "Remplacée sur site" as const
      },
      {
        id: "part-2",
        designation: "Contact de sécurité serrure palier RDC",
        reference: "59124011",
        quantity: "1",
        reason: "Charbonnage des grains de contact argent",
        status: "Remplacée sur site" as const
      }
    ],
    technicalRecommendations:
      "Vérification bimensuelle de l'effort de fermeture et dépoussiérage des rideaux lumineux infrarouges.",
    conclusion:
      "Portes réalignées et testées avec succès sur 25 cycles complets. Installation 100% sécurisée et conforme."
  }
];

export function TechnicalReportGenerator() {
  const [activeSubTab, setActiveSubTab] = useState<"form" | "result" | "history">("form");
  const [resultViewMode, setResultViewMode] = useState<"mirror" | "ai">("mirror");
  const [includeAiInPdf, setIncludeAiInPdf] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [autoFillFeedback, setAutoFillFeedback] = useState<string | null>(null);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Equipment selection and search state
  const [pfSearchTerm, setPfSearchTerm] = useState("");
  const [pfCategoryFilter, setPfCategoryFilter] = useState<"all" | "active" | "archived">("all");
  const [isPfDropdownOpen, setIsPfDropdownOpen] = useState(false);
  const pfDropdownRef = useRef<HTMLDivElement>(null);

  // History search state
  const [historySearchTerm, setHistorySearchTerm] = useState("");
  const [historyStatusFilter, setHistoryStatusFilter] = useState<"all" | "Généré" | "Brouillon">("all");

  // Load equipments list from local storage or mock data (Both Active & Archived/Hors Garantie)
  const availableEquipments = useMemo(() => {
    let activeList: PFEquipment[] = [];
    let archivedList: PFEquipment[] = [];

    // Load active equipments
    try {
      const savedActive =
        localStorage.getItem("toolbox_pf_equipments") ||
        localStorage.getItem("toolbox_pf_equipments_v1");
      if (savedActive) {
        const parsed = JSON.parse(savedActive);
        if (Array.isArray(parsed) && parsed.length > 0) {
          activeList = parsed.map((e: any) => ({ ...e, isArchived: false }));
        }
      }
    } catch (e) {
      console.error("Error reading active equipments for technical reports:", e);
    }

    if (activeList.length === 0) {
      activeList = INITIAL_PF_EQUIPMENTS.map((e) => ({ ...e, isArchived: false }));
    }

    // Load archived / hors garantie / résilié equipments
    try {
      const savedArchived = localStorage.getItem("toolbox_pf_archived_equipments");
      if (savedArchived) {
        const parsed = JSON.parse(savedArchived);
        if (Array.isArray(parsed) && parsed.length > 0) {
          archivedList = parsed.map((e: any) => ({ ...e, isArchived: true }));
        }
      }
    } catch (e) {
      console.error("Error reading archived equipments for technical reports:", e);
    }

    // Combine list: Active first, then Archived
    return [...activeList, ...archivedList];
  }, [isPfDropdownOpen]);

  // Filtered equipments based on search and category (active vs archived)
  const filteredEquipments = useMemo(() => {
    let result = availableEquipments;

    // Category filter
    if (pfCategoryFilter === "active") {
      result = result.filter((eq) => !eq.isArchived);
    } else if (pfCategoryFilter === "archived") {
      result = result.filter((eq) => eq.isArchived);
    }

    // Search term
    if (pfSearchTerm.trim()) {
      const term = pfSearchTerm.toLowerCase();
      result = result.filter(
        (eq) =>
          eq.pfNumber?.toLowerCase().includes(term) ||
          eq.name?.toLowerCase().includes(term) ||
          eq.city?.toLowerCase().includes(term) ||
          eq.assignedTechnician?.toLowerCase().includes(term) ||
          eq.customerAccount?.toLowerCase().includes(term) ||
          eq.archivedReason?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [availableEquipments, pfCategoryFilter, pfSearchTerm]);

  // History state
  const [history, setHistory] = useState<TechnicalReportData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_REPORTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Error loading technical reports history:", e);
    }
    return [];
  });

  // Filtered history based on equipment number (PF), report number, client, technician, city
  const filteredHistory = useMemo(() => {
    let result = history;

    if (historyStatusFilter !== "all") {
      result = result.filter((item) => item.status === historyStatusFilter);
    }

    if (historySearchTerm.trim()) {
      const term = historySearchTerm.toLowerCase().trim();
      result = result.filter(
        (item) =>
          item.equipmentNumber?.toLowerCase().includes(term) ||
          item.reportNumber?.toLowerCase().includes(term) ||
          item.clientName?.toLowerCase().includes(term) ||
          item.technicianName?.toLowerCase().includes(term) ||
          item.supervisorName?.toLowerCase().includes(term) ||
          item.locationCity?.toLowerCase().includes(term) ||
          item.equipmentType?.toLowerCase().includes(term)
      );
    }

    return result;
  }, [history, historySearchTerm, historyStatusFilter]);

  const initialPfNumber = "PF-78012";
  const initialDate = new Date().toISOString().split("T")[0];

  // Current Report Form Data
  const [report, setReport] = useState<TechnicalReportData>({
    id: "rep-" + Date.now(),
    reportNumber: formatGenericReportNumber(initialPfNumber, initialDate, "01"),
    interventionDate: initialDate,
    equipmentNumber: initialPfNumber,
    equipmentType: "Schindler 3300 (Traction MRL)",
    clientName: "Tour Horizon Défense - Ascenseur Principal A",
    locationCity: "Casablanca",
    technicianName: "Karim Bennani",
    supervisorName: "Oussama Oubghous",
    technicianPhone: "+212 6 61 45 88 12",
    siteObservation:
      "Appareil arrêté au palier 3. Défaut variateur thermique FC affiché sur SMLCD. Bruits anormaux signalés par les résidents lors des phases d'accélération.",
    anomalies: [
      {
        id: "ano-1",
        title: "Surchauffe et déclenchement du variateur VF11BR",
        organ: "Armoire de manœuvre / Variateur",
        description:
          "Le variateur de fréquence présente une surintensité intermittente lors des accélérations avec ventilation interne encrassée.",
        causes:
          "Empoussièrement important du dissipateur thermique et fatigue des condensateurs de puissance.",
        impact: "Arrêt immédiat de l'appareil avec mise en sécurité.",
        actionsDone:
          "Dépoussiérage au compresseur sec, resserrage des connexions électriques et réinitialisation des défauts.",
        temporarySolution: "Diminution légère de l'accélération à 0.6 m/s².",
        definitiveSolution:
          "Remplacement du ventilateur de refroidissement et recalibrage du pesage de charge cabine.",
        requiredParts: "Ventilateur variateur VF11BR (Réf: 59314050)",
        criticality: "Élevé",
        preventiveRecommendations: "Nettoyage semestriel des grilles d'aération de l'armoire."
      }
    ],
    historyAndRecurrence:
      "3 coupures relevées ce mois-ci sur le variateur. Pic de fréquence de pannes constaté l'après-midi en période de forte chaleur.",
    worksDone:
      "1. Consignation électrique de l'installation.\n2. Contrôle de la mémoire d'erreurs manœuvre.\n3. Nettoyage approfondi du bloc de puissance et des ventilateurs.\n4. Contrôle de la tension des suspensions STM.\n5. Essais de fonctionnement avec 20 cycles complets.",
    replacedOrOrderedParts: [
      {
        id: "part-1",
        designation: "Ventilateur de refroidissement Variateur VF11BR",
        reference: "59314050",
        quantity: 1,
        reason: "Ventilateur d'origine bruyant et rotation ralentie",
        status: "À commander en urgence"
      }
    ],
    technicalRecommendations:
      "1. Effectuer le remplacement du ventilateur sous 15 jours.\n2. Améliorer la ventilation haute de la gaine.\n3. Programmer une visite d'inspection approfondie des suspensions.",
    conclusion:
      "L'appareil est remis en service avec surveillance active. Les actions préconisées permettront de fiabiliser totalement l'ascenseur.",
    generatedContentMarkdown: "",
    status: "Brouillon"
  });

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pfDropdownRef.current && !pfDropdownRef.current.contains(event.target as Node)) {
        setIsPfDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_REPORTS, JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save report history:", e);
    }
  }, [history]);

  // Handler: Selecting a PF Equipment from the database (auto-fills all fields and updates generic report number)
  const handleSelectEquipment = (eq: PFEquipment) => {
    const pfNum = eq.pfNumber || "PF-78012";
    const client = eq.name || eq.customerAccount || "Client Schindler";
    const type = eq.serviceObject || "Schindler 3300 (Traction MRL)";
    const city = eq.city || "Casablanca";
    const tech = eq.assignedTechnician || report.technicianName || "Karim Bennani";
    const newReportNumber = formatGenericReportNumber(pfNum, report.interventionDate, "01");

    setReport((prev) => ({
      ...prev,
      equipmentNumber: pfNum,
      clientName: client,
      equipmentType: type,
      locationCity: city,
      technicianName: tech,
      reportNumber: newReportNumber
    }));

    setIsPfDropdownOpen(false);
    setPfSearchTerm("");

    // Show visual confirmation
    setAutoFillFeedback(`Données de l'appareil ${pfNum} chargées automatiquement !`);
    setTimeout(() => {
      setAutoFillFeedback(null);
    }, 4000);
  };

  // Handler: Manual change of equipment number -> also keeps the generic report number synchronized
  const handleEquipmentNumberChange = (newPf: string) => {
    const updatedReportNumber = formatGenericReportNumber(newPf, report.interventionDate, "01");
    // Check if newPf matches an existing equipment in the fleet
    const matched = availableEquipments.find(
      (e) => e.pfNumber.toLowerCase() === newPf.trim().toLowerCase()
    );

    if (matched) {
      setReport((prev) => ({
        ...prev,
        equipmentNumber: matched.pfNumber,
        clientName: matched.name || prev.clientName,
        equipmentType: matched.serviceObject || prev.equipmentType,
        locationCity: matched.city || prev.locationCity,
        technicianName: matched.assignedTechnician || prev.technicianName,
        reportNumber: updatedReportNumber
      }));
      setAutoFillFeedback(`Appareil ${matched.pfNumber} reconnu : données associées appliquées.`);
      setTimeout(() => setAutoFillFeedback(null), 3500);
    } else {
      setReport((prev) => ({
        ...prev,
        equipmentNumber: newPf,
        reportNumber: updatedReportNumber
      }));
    }
  };

  // Handler: Change date -> updates report number year
  const handleInterventionDateChange = (newDate: string) => {
    const updatedReportNumber = formatGenericReportNumber(report.equipmentNumber, newDate, "01");
    setReport((prev) => ({
      ...prev,
      interventionDate: newDate,
      reportNumber: updatedReportNumber
    }));
  };

  // Regenerate Report Number with next sequence or random
  const handleRegenerateReportNumber = () => {
    const randomSeq = String(Math.floor(1 + Math.random() * 99)).padStart(2, "0");
    const newNum = formatGenericReportNumber(report.equipmentNumber, report.interventionDate, randomSeq);
    setReport((prev) => ({ ...prev, reportNumber: newNum }));
  };

  // Load Preset
  const handleLoadPreset = (preset: (typeof PRESET_DIAGNOSTICS)[0]) => {
    const newReportNumber = formatGenericReportNumber(preset.equipmentNumber, report.interventionDate, "01");
    setReport((prev) => ({
      ...prev,
      reportNumber: newReportNumber,
      clientName: preset.clientName,
      equipmentNumber: preset.equipmentNumber,
      equipmentType: preset.equipmentType,
      locationCity: preset.locationCity,
      technicianName: preset.technicianName,
      supervisorName: preset.supervisorName,
      siteObservation: preset.siteObservation,
      anomalies: preset.anomalies.map((a) => ({ ...a, id: "ano-" + Date.now() + Math.random() })),
      historyAndRecurrence: preset.historyAndRecurrence,
      worksDone: preset.worksDone,
      replacedOrOrderedParts: preset.replacedOrOrderedParts.map((p) => ({
        ...p,
        id: "part-" + Date.now() + Math.random()
      })),
      technicalRecommendations: preset.technicalRecommendations,
      conclusion: preset.conclusion,
      generatedContentMarkdown: ""
    }));
    setAutoFillFeedback(`Scénario chargé : N° Rapport ${newReportNumber}`);
    setTimeout(() => setAutoFillFeedback(null), 3000);
  };

  // Add Anomaly
  const handleAddAnomaly = () => {
    const newAno: TechnicalReportAnomaly = {
      id: "ano-" + Date.now(),
      title: "Nouvelle anomalie constatée",
      organ: "Traction / Portes / Manœuvre",
      description: "",
      causes: "",
      impact: "",
      actionsDone: "",
      temporarySolution: "",
      definitiveSolution: "",
      requiredParts: "",
      criticality: "Moyen",
      preventiveRecommendations: ""
    };
    setReport((prev) => ({
      ...prev,
      anomalies: [...prev.anomalies, newAno]
    }));
  };

  // Remove Anomaly
  const handleRemoveAnomaly = (id: string) => {
    setReport((prev) => ({
      ...prev,
      anomalies: prev.anomalies.filter((a) => a.id !== id)
    }));
  };

  // Update Anomaly
  const handleUpdateAnomaly = (id: string, updates: Partial<TechnicalReportAnomaly>) => {
    setReport((prev) => ({
      ...prev,
      anomalies: prev.anomalies.map((a) => (a.id === id ? { ...a, ...updates } : a))
    }));
  };

  // Add Part
  const handleAddPart = () => {
    const newPart: TechnicalReportPart = {
      id: "part-" + Date.now(),
      designation: "",
      reference: "",
      quantity: 1,
      reason: "",
      status: "À chiffrer sur devis"
    };
    setReport((prev) => ({
      ...prev,
      replacedOrOrderedParts: [...prev.replacedOrOrderedParts, newPart]
    }));
  };

  // Remove Part
  const handleRemovePart = (id: string) => {
    setReport((prev) => ({
      ...prev,
      replacedOrOrderedParts: prev.replacedOrOrderedParts.filter((p) => p.id !== id)
    }));
  };

  // Update Part
  const handleUpdatePart = (id: string, updates: Partial<TechnicalReportPart>) => {
    setReport((prev) => ({
      ...prev,
      replacedOrOrderedParts: prev.replacedOrOrderedParts.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      )
    }));
  };

  // Generate Report via AI Backend
  const handleGenerateReportAI = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    try {
      const response = await fetch("/api/technical-reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(report)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur serveur ${response.status}`);
      }

      const data = await response.json();
      const generatedMarkdown = data.markdown || "";

      const updatedReport: TechnicalReportData = {
        ...report,
        generatedContentMarkdown: generatedMarkdown,
        status: "Généré",
        createdAt: report.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      setReport(updatedReport);
      // Update in history if exists, or prepend
      setHistory((prev) => {
        const index = prev.findIndex((h) => h.id === updatedReport.id);
        if (index !== -1) {
          const next = [...prev];
          next[index] = updatedReport;
          return next;
        }
        return [updatedReport, ...prev.slice(0, 49)];
      });
      setEditingHistoryId(updatedReport.id);
      setActiveSubTab("result");
      setResultViewMode("ai");
    } catch (err: any) {
      console.error("AI Report generation error:", err);
      setGenerationError(err.message || "Erreur de communication avec le moteur IA.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Copy Markdown to Clipboard
  const handleCopyMarkdown = () => {
    if (!report.generatedContentMarkdown) return;
    navigator.clipboard.writeText(report.generatedContentMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Handler: Edit report loaded from history
  const handleEditHistoryReport = (item: TechnicalReportData) => {
    setReport({ ...item });
    setEditingHistoryId(item.id);
    setActiveSubTab("form");
    setAutoFillFeedback(`Rapport ${item.reportNumber} chargé en mode modification.`);
    setTimeout(() => setAutoFillFeedback(null), 4000);
  };

  // Handler: Save report modifications directly into history
  const handleSaveReportModifications = () => {
    const updatedReport: TechnicalReportData = {
      ...report,
      updatedAt: new Date().toISOString(),
      createdAt: report.createdAt || new Date().toISOString()
    };

    setHistory((prev) => {
      const index = prev.findIndex((h) => h.id === updatedReport.id);
      if (index !== -1) {
        const next = [...prev];
        next[index] = updatedReport;
        return next;
      }
      return [updatedReport, ...prev.slice(0, 49)];
    });

    setReport(updatedReport);
    setEditingHistoryId(updatedReport.id);
    setSaveSuccessMessage(`Rapport ${updatedReport.reportNumber} enregistré avec succès dans l'historique !`);
    setTimeout(() => setSaveSuccessMessage(null), 4000);
  };

  // Handler: Cancel edit mode / Start new draft
  const handleCancelEditMode = () => {
    setEditingHistoryId(null);
  };

  // Handler: Create new empty report draft
  const handleCreateNewDraft = () => {
    const newId = "rep-" + Date.now();
    const newDate = new Date().toISOString().split("T")[0];
    const newReportNum = formatGenericReportNumber(report.equipmentNumber || "PF-78012", newDate, "01");
    setEditingHistoryId(null);
    setReport({
      id: newId,
      reportNumber: newReportNum,
      interventionDate: newDate,
      equipmentNumber: report.equipmentNumber || "PF-78012",
      equipmentType: report.equipmentType || "Schindler 3300",
      clientName: report.clientName || "",
      locationCity: report.locationCity || "Casablanca",
      technicianName: report.technicianName || "Karim Bennani",
      supervisorName: report.supervisorName || "Oussama Oubghous",
      siteObservation: "",
      anomalies: [],
      historyAndRecurrence: "",
      worksDone: "",
      replacedOrOrderedParts: [],
      technicalRecommendations: "",
      conclusion: "",
      generatedContentMarkdown: "",
      status: "Brouillon",
      createdAt: new Date().toISOString()
    });
    setActiveSubTab("form");
    setAutoFillFeedback("Nouveau formulaire vierge prêt pour saisie.");
    setTimeout(() => setAutoFillFeedback(null), 3000);
  };

  // Handler: Delete report from history
  const handleDeleteHistoryReport = (id: string) => {
    if (confirm("Voulez-vous supprimer ce rapport technique de l'historique ?")) {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      if (editingHistoryId === id) {
        setEditingHistoryId(null);
      }
      setAutoFillFeedback("Rapport retiré de l'historique.");
      setTimeout(() => setAutoFillFeedback(null), 3000);
    }
  };

  // Handler: Duplicate report from history
  const handleDuplicateHistoryReport = (item: TechnicalReportData) => {
    const newId = "rep-" + Date.now();
    const newDate = new Date().toISOString().split("T")[0];
    const newReportNum = formatGenericReportNumber(item.equipmentNumber, newDate, "02");
    const copy: TechnicalReportData = {
      ...item,
      id: newId,
      reportNumber: newReportNum,
      interventionDate: newDate,
      createdAt: new Date().toISOString(),
      updatedAt: undefined,
      status: "Brouillon"
    };
    setReport(copy);
    setEditingHistoryId(newId);
    setHistory((prev) => [copy, ...prev.slice(0, 49)]);
    setActiveSubTab("form");
    setAutoFillFeedback(`Rapport dupliqué (${newReportNum}) et ouvert en modification.`);
    setTimeout(() => setAutoFillFeedback(null), 4000);
  };

  // Export Vector PDF via jsPDF with complete UI-parity, dynamic heights and zero overlap
  const handleExportPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const pageWidth = 210;
    const pageHeight = 297;
    const leftMargin = 16;
    const rightMargin = 16;
    const contentWidth = pageWidth - leftMargin - rightMargin; // 178 mm
    const rightX = pageWidth - rightMargin; // 194 mm
    const bottomLimit = pageHeight - 20; // 277 mm

    let y = 16;

    // Helper for drawing running header on each page
    const renderHeader = () => {
      // Top Schindler Red accent bar
      doc.setFillColor(185, 28, 28);
      doc.rect(leftMargin, y, contentWidth, 2.5, "F");
      y += 6;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(185, 28, 28);
      doc.text("SCHINDLER MAROC • EXPERTISE & DIAGNOSTIC TECHNIQUE", leftMargin, y);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(report.reportNumber || "RT-2026", rightX, y, { align: "right" });
      y += 4.5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, y, rightX, y);
      y += 6;
    };

    // Page break checker with automatic header rendering
    const checkPageBreak = (neededHeight: number) => {
      if (y + neededHeight > bottomLimit) {
        doc.addPage();
        y = 16;
        renderHeader();
      }
    };

    // Initial page header
    renderHeader();

    // Main Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14.5);
    doc.setTextColor(15, 23, 42);
    doc.text("RAPPORT TECHNIQUE D'INTERVENTION ET DIAGNOSTIC", pageWidth / 2, y, { align: "center" });
    y += 5;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
      "Direction des Opérations & Service Après-Vente — Fiche d'intervention officielle Schindler",
      pageWidth / 2,
      y,
      { align: "center" }
    );
    y += 7;

    // Helper to render section title banner
    const renderSectionTitle = (title: string) => {
      checkPageBreak(12);
      doc.setFillColor(185, 28, 28);
      doc.rect(leftMargin, y, 2.8, 5, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(title, leftMargin + 5.5, y + 4.2);
      y += 7.5;
    };

    // =========================================================================
    // SECTION 1: INFORMATIONS GÉNÉRALES & ÉQUIPEMENT
    // =========================================================================
    renderSectionTitle("1. INFORMATIONS GÉNÉRALES & APPAREIL");

    const colWidth = (contentWidth - 4) / 2; // 87 mm each
    const leftColX = leftMargin;
    const rightColX = leftMargin + colWidth + 4;

    // Compute text lines for left column
    doc.setFontSize(8.5);
    const clientLines = doc.splitTextToSize(`Client / Site : ${report.clientName || "-"}`, colWidth - 8);
    const cityLines = doc.splitTextToSize(`Ville / Localisation : ${report.locationCity || "-"}`, colWidth - 8);
    const typeLines = doc.splitTextToSize(`Type / Gamme : ${report.equipmentType || "Ascenseur"}`, colWidth - 8);
    const leftHeight = 8 + (clientLines.length + cityLines.length + typeLines.length + 1) * 4.2 + 4;

    // Compute text lines for right column
    const repNumLines = doc.splitTextToSize(`N° Rapport : ${report.reportNumber || "-"}`, colWidth - 8);
    const dateLines = doc.splitTextToSize(`Date d'intervention : ${report.interventionDate || "-"}`, colWidth - 8);
    const techLines = doc.splitTextToSize(`Technicien intervenant : ${report.technicianName || "-"}`, colWidth - 8);
    const respLines = doc.splitTextToSize(`Responsable (Signataire) : ${report.supervisorName || "Direction Technique Schindler"}`, colWidth - 8);
    const rightHeight = 8 + (repNumLines.length + dateLines.length + techLines.length + respLines.length) * 4.2 + 4;

    const boxHeight = Math.max(leftHeight, rightHeight, 28);
    checkPageBreak(boxHeight + 4);

    // Left card box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(leftColX, y, colWidth, boxHeight, 1.5, 1.5, "FD");

    // Header strip left card
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text("DONNÉES APPAREIL & LOCALISATION", leftColX + 3.5, y + 5);

    let curLeftY = y + 9.5;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`N° Appareil (PF) : `, leftColX + 3.5, curLeftY);
    const pfLabelW = doc.getTextWidth("N° Appareil (PF) : ");
    doc.setTextColor(185, 28, 28);
    doc.text(report.equipmentNumber || "PF-00000", leftColX + 3.5 + pfLabelW, curLeftY);
    curLeftY += 4.5;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    clientLines.forEach((line: string) => {
      doc.text(line, leftColX + 3.5, curLeftY);
      curLeftY += 4.2;
    });
    cityLines.forEach((line: string) => {
      doc.text(line, leftColX + 3.5, curLeftY);
      curLeftY += 4.2;
    });
    typeLines.forEach((line: string) => {
      doc.text(line, leftColX + 3.5, curLeftY);
      curLeftY += 4.2;
    });

    // Right card box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(rightColX, y, colWidth, boxHeight, 1.5, 1.5, "FD");

    // Header strip right card
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("INTERVENTION & ENCADREMENT", rightColX + 3.5, y + 5);

    let curRightY = y + 9.5;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(51, 65, 85);
    repNumLines.forEach((line: string) => {
      doc.text(line, rightColX + 3.5, curRightY);
      curRightY += 4.2;
    });
    dateLines.forEach((line: string) => {
      doc.text(line, rightColX + 3.5, curRightY);
      curRightY += 4.2;
    });
    techLines.forEach((line: string) => {
      doc.text(line, rightColX + 3.5, curRightY);
      curRightY += 4.2;
    });
    respLines.forEach((line: string) => {
      doc.text(line, rightColX + 3.5, curRightY);
      curRightY += 4.2;
    });

    y += boxHeight + 5;

    // =========================================================================
    // SECTION 2: CONSTAT SUR LE TERRAIN
    // =========================================================================
    renderSectionTitle("2. CONSTAT SUR LE TERRAIN");

    const siteObsText = report.siteObservation || "Appareil vérifié sur site suite à signalement d'anomalie.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const obsLines = doc.splitTextToSize(siteObsText, contentWidth - 7);
    const obsBoxH = obsLines.length * 4.2 + 6;

    checkPageBreak(obsBoxH + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, y, contentWidth, obsBoxH, 1, 1, "FD");

    doc.setTextColor(30, 41, 59);
    let obsY = y + 4.5;
    obsLines.forEach((line: string) => {
      doc.text(line, leftMargin + 3.5, obsY);
      obsY += 4.2;
    });
    y += obsBoxH + 5;

    // =========================================================================
    // SECTION 3: ANOMALIES CONSTATÉES (All fields from rubric, zero overlap)
    // =========================================================================
    renderSectionTitle(`3. ANOMALIES CONSTATÉES (${report.anomalies.length})`);

    report.anomalies.forEach((ano, idx) => {
      checkPageBreak(25);

      // Header row for anomaly
      const crit = ano.criticality || "Moyen";
      let critBg: [number, number, number] = [254, 243, 199]; // amber
      let critTextCol: [number, number, number] = [180, 83, 9];
      let critBorder: [number, number, number] = [245, 158, 11];

      if (crit === "Élevé" || crit === "Critique") {
        critBg = [254, 226, 226];
        critTextCol = [185, 28, 28];
        critBorder = [239, 68, 68];
      } else if (crit === "Faible") {
        critBg = [209, 250, 229];
        critTextCol = [4, 120, 87];
        critBorder = [16, 185, 129];
      }

      // Card Header
      const headerH = 7.5;
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.roundedRect(leftMargin, y, contentWidth, headerH, 1, 1, "FD");

      // Anomaly Title (clipped to leave space for criticality pill)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      const titlePrefix = `Anomalie N°${idx + 1} : `;
      const maxTitleW = contentWidth - 52;
      const anoTitle = ano.title || "Défaut identifié";
      const titleLines = doc.splitTextToSize(`${titlePrefix}${anoTitle}`, maxTitleW);
      doc.text(titleLines[0], leftMargin + 3, y + 5);

      // Criticality Badge pill on right
      const badgeW = 38;
      const badgeH = 5.2;
      const badgeX = rightX - badgeW - 2;
      const badgeY = y + 1.2;

      doc.setFillColor(...critBg);
      doc.setDrawColor(...critBorder);
      doc.roundedRect(badgeX, badgeY, badgeW, badgeH, 1, 1, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...critTextCol);
      doc.text(`Criticité : ${crit}`, badgeX + badgeW / 2, badgeY + 3.7, { align: "center" });

      y += headerH + 2.5;

      // Anomaly Fields Helper (with label + safe indented text)
      const renderAnomalyField = (label: string, value?: string, isHighlighted?: boolean) => {
        if (!value || !value.trim()) return;

        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(isHighlighted ? 185 : 71, isHighlighted ? 28 : 85, isHighlighted ? 28 : 105);

        const lines = doc.splitTextToSize(value, contentWidth - 10);
        const needed = 3.8 + lines.length * 4.1 + 1.5;
        checkPageBreak(needed);

        doc.text(`• ${label} :`, leftMargin + 3.5, y);
        y += 3.8;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        lines.forEach((l: string) => {
          doc.text(l, leftMargin + 6, y);
          y += 4.1;
        });
        y += 1.5;
      };

      // Print all fields from rubric
      renderAnomalyField("Organe concerné", ano.organ, true);
      renderAnomalyField("1. Description détaillée", ano.description);
      renderAnomalyField("2. Analyse des causes probables", ano.causes);
      renderAnomalyField("3. Impact potentiel sur le service", ano.impact);
      renderAnomalyField("4. Actions correctives déjà réalisées sur site", ano.actionsDone);
      renderAnomalyField("5. Solution préconisée à court terme (palliative)", ano.temporarySolution);
      renderAnomalyField("6. Solution définitive recommandée", ano.definitiveSolution, true);
      renderAnomalyField("7. Pièces de rechange nécessaires", ano.requiredParts);
      renderAnomalyField("8. Recommandations de maintenance préventive", ano.preventiveRecommendations);

      // Light separator between anomalies
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, y, rightX, y);
      y += 4;
    });

    // =========================================================================
    // SECTION 4: HISTORIQUE DES PANNES & RÉCURRENCE
    // =========================================================================
    if (report.historyAndRecurrence && report.historyAndRecurrence.trim()) {
      renderSectionTitle("4. HISTORIQUE DES PANNES & ANALYSE DES RÉCURRENCES");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const histLines = doc.splitTextToSize(report.historyAndRecurrence, contentWidth - 7);
      const histH = histLines.length * 4.2 + 6;

      checkPageBreak(histH + 4);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(leftMargin, y, contentWidth, histH, 1, 1, "FD");

      doc.setTextColor(30, 41, 59);
      let histY = y + 4.5;
      histLines.forEach((l: string) => {
        doc.text(l, leftMargin + 3.5, histY);
        histY += 4.2;
      });
      y += histH + 5;
    }

    // =========================================================================
    // SECTION 5: TRAVAUX RÉALISÉS LORS DE L'INTERVENTION
    // =========================================================================
    renderSectionTitle("5. TRAVAUX RÉALISÉS LORS DE L'INTERVENTION");

    const worksText = report.worksDone || "Contrôles, essais et réglages standards effectués sur site.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const worksLines = doc.splitTextToSize(worksText, contentWidth - 7);
    const worksH = worksLines.length * 4.2 + 6;

    checkPageBreak(worksH + 4);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, y, contentWidth, worksH, 1, 1, "FD");

    doc.setTextColor(30, 41, 59);
    let worksY = y + 4.5;
    worksLines.forEach((l: string) => {
      doc.text(l, leftMargin + 3.5, worksY);
      worksY += 4.2;
    });
    y += worksH + 5;

    // =========================================================================
    // SECTION 6: TABLEAU DES PIÈCES REMPLACÉES OU COMMANDÉES
    // =========================================================================
    if (report.replacedOrOrderedParts && report.replacedOrOrderedParts.length > 0) {
      renderSectionTitle("6. PIÈCES REMPLACÉES OU COMMANDÉES");

      const colWDesig = 56;
      const colWRef = 28;
      const colWQty = 14;
      const colWReason = 46;
      const colWStatus = 34;
      // 56 + 28 + 14 + 46 + 34 = 178 mm (exact contentWidth)

      const headerHeight = 7;
      checkPageBreak(headerHeight + 15);

      // Header row
      doc.setFillColor(226, 232, 240);
      doc.setDrawColor(148, 163, 184);
      doc.rect(leftMargin, y, contentWidth, headerHeight, "FD");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);

      let colX = leftMargin;
      doc.text("Désignation", colX + 2, y + 4.8);
      colX += colWDesig;
      doc.text("Référence", colX + 2, y + 4.8);
      colX += colWRef;
      doc.text("Qté", colX + 2, y + 4.8);
      colX += colWQty;
      doc.text("Motif de remplacement", colX + 2, y + 4.8);
      colX += colWReason;
      doc.text("Statut pièce", colX + 2, y + 4.8);

      y += headerHeight;

      // Data rows with multiline wrap
      report.replacedOrOrderedParts.forEach((part, pIdx) => {
        doc.setFontSize(7.8);
        const linesDesig = doc.splitTextToSize(part.designation || "-", colWDesig - 4);
        const linesRef = doc.splitTextToSize(part.reference || "-", colWRef - 4);
        const linesReason = doc.splitTextToSize(part.reason || "-", colWReason - 4);
        const linesStatus = doc.splitTextToSize(part.status || "À chiffrer", colWStatus - 4);

        const maxLines = Math.max(linesDesig.length, linesRef.length, linesReason.length, linesStatus.length, 1);
        const rowHeight = maxLines * 4.1 + 3.5;

        checkPageBreak(rowHeight);

        // Row background
        if (pIdx % 2 === 0) {
          doc.setFillColor(255, 255, 255);
        } else {
          doc.setFillColor(248, 250, 252);
        }
        doc.setDrawColor(226, 232, 240);
        doc.rect(leftMargin, y, contentWidth, rowHeight, "FD");

        let curX = leftMargin;

        // 1. Designation
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        let textY = y + 4;
        linesDesig.forEach((l: string) => {
          doc.text(l, curX + 2, textY);
          textY += 4.1;
        });

        // 2. Reference
        curX += colWDesig;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(51, 65, 85);
        textY = y + 4;
        linesRef.forEach((l: string) => {
          doc.text(l, curX + 2, textY);
          textY += 4.1;
        });

        // 3. Quantity
        curX += colWRef;
        doc.setFont("helvetica", "bold");
        doc.setTextColor(185, 28, 28);
        doc.text(String(part.quantity || 1), curX + colWQty / 2, y + 4, { align: "center" });

        // 4. Reason
        curX += colWQty;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        textY = y + 4;
        linesReason.forEach((l: string) => {
          doc.text(l, curX + 2, textY);
          textY += 4.1;
        });

        // 5. Status
        curX += colWReason;
        doc.setFont("helvetica", "bold");
        const statusStr = part.status || "À chiffrer";
        if (statusStr.includes("Remplacée")) {
          doc.setTextColor(4, 120, 87);
        } else if (statusStr.includes("urgence")) {
          doc.setTextColor(185, 28, 28);
        } else {
          doc.setTextColor(180, 83, 9);
        }
        textY = y + 4;
        linesStatus.forEach((l: string) => {
          doc.text(l, curX + 2, textY);
          textY += 4.1;
        });

        y += rowHeight;
      });

      y += 5;
    }

    // =========================================================================
    // SECTION 7: RECOMMANDATIONS TECHNIQUES PRÉCONISÉES
    // =========================================================================
    if (report.technicalRecommendations && report.technicalRecommendations.trim()) {
      renderSectionTitle("7. RECOMMANDATIONS TECHNIQUES PRÉCONISÉES");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      const recLines = doc.splitTextToSize(report.technicalRecommendations, contentWidth - 7);
      const recH = recLines.length * 4.2 + 6;

      checkPageBreak(recH + 4);
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(leftMargin, y, contentWidth, recH, 1, 1, "FD");

      doc.setTextColor(30, 41, 59);
      let recY = y + 4.5;
      recLines.forEach((l: string) => {
        doc.text(l, leftMargin + 3.5, recY);
        recY += 4.2;
      });
      y += recH + 5;
    }

    // =========================================================================
    // SECTION 8: CONCLUSION GÉNÉRALE & PLAN D'ACTION
    // =========================================================================
    renderSectionTitle("8. CONCLUSION GÉNÉRALE & PLAN D'ACTION");

    const conclText =
      report.conclusion ||
      "Appareil inspecté et remis en état sous surveillance technique. Respecter scrupuleusement les préconisations.";
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const conclLines = doc.splitTextToSize(conclText, contentWidth - 7);
    const conclH = conclLines.length * 4.2 + 6;

    checkPageBreak(conclH + 4);
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(252, 165, 165);
    doc.roundedRect(leftMargin, y, contentWidth, conclH, 1, 1, "FD");

    doc.setTextColor(153, 27, 27);
    let conclY = y + 4.5;
    conclLines.forEach((l: string) => {
      doc.text(l, leftMargin + 3.5, conclY);
      conclY += 4.2;
    });
    y += conclH + 6;

    // =========================================================================
    // SECTION 9: SYNTHÈSE D'EXPERTISE RÉDIGÉE PAR IA (Si disponible et demandée)
    // =========================================================================
    if (includeAiInPdf && report.generatedContentMarkdown && report.generatedContentMarkdown.trim()) {
      checkPageBreak(25);
      renderSectionTitle("9. ANALYSE DÉVELOPPÉE & SYNTHÈSE D'EXPERTISE (RÉDACTION)");

      const rawLines = report.generatedContentMarkdown.split("\n");
      for (let i = 0; i < rawLines.length; i++) {
        const raw = rawLines[i].trim();
        if (!raw) {
          y += 2.5;
          continue;
        }

        if (raw.startsWith("# ")) {
          // Skip redundant H1 if already printed in header
          continue;
        } else if (raw.startsWith("## ")) {
          checkPageBreak(10);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(185, 28, 28);
          const t = raw.replace(/^##\s+/, "");
          const wrapped = doc.splitTextToSize(t, contentWidth);
          doc.text(wrapped, leftMargin, y);
          y += wrapped.length * 4.8 + 2.5;
        } else if (raw.startsWith("### ")) {
          checkPageBreak(8);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9.5);
          doc.setTextColor(30, 41, 59);
          const t = raw.replace(/^###\s+/, "");
          const wrapped = doc.splitTextToSize(t, contentWidth);
          doc.text(wrapped, leftMargin, y);
          y += wrapped.length * 4.3 + 2;
        } else if (raw.startsWith("- ") || raw.startsWith("* ")) {
          checkPageBreak(6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(51, 65, 85);
          const t = raw.replace(/^[-*]\s+/, "").replace(/\*\*(.*?)\*\*/g, "$1");
          doc.text("•", leftMargin + 2, y);
          const wrapped = doc.splitTextToSize(t, contentWidth - 7);
          doc.text(wrapped, leftMargin + 6, y);
          y += wrapped.length * 4.1 + 1.8;
        } else if (raw.startsWith("|")) {
          // Skip raw markdown table rows if already rendered in Section 6
          continue;
        } else {
          // Standard text paragraph
          checkPageBreak(6);
          doc.setFont("helvetica", "normal");
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          const cleanP = raw.replace(/\*\*(.*?)\*\*/g, "$1");
          const wrapped = doc.splitTextToSize(cleanP, contentWidth);
          doc.text(wrapped, leftMargin, y);
          y += wrapped.length * 4.1 + 2.2;
        }
      }

      y += 5;
    }

    // =========================================================================
    // SECTION 10: CADRE DE VALIDATION & SIGNATURES (Balanced boxes)
    // =========================================================================
    const signBoxH = 30;
    checkPageBreak(signBoxH + 6);

    const signColW = (contentWidth - 6) / 2;
    const sign1X = leftMargin;
    const sign2X = leftMargin + signColW + 6;

    // Box 1: Client
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(sign1X, y, signColW, signBoxH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text("VISA DU CLIENT / SYNDIC DE COPROPRIÉTÉ", sign1X + 3.5, y + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text("Nom du signataire : ___________________________", sign1X + 3.5, y + 11);
    doc.text("Date & Signature :", sign1X + 3.5, y + 17);
    doc.text("Mention « Bon pour accord des travaux »", sign1X + 3.5, y + 26);

    // Box 2: Schindler
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.roundedRect(sign2X, y, signColW, signBoxH, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(185, 28, 28);
    doc.text("VISA & SIGNATURE DIRECTION TECHNIQUE", sign2X + 3.5, y + 5);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`Responsable signataire : ${report.supervisorName || "OUSSAMA OUBGHOUS"}`, sign2X + 3.5, y + 10.5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Technicien intervenant : ${report.technicianName || "Karim Bennani"}`, sign2X + 3.5, y + 15.5);
    doc.text(`Date & Validation : ${report.interventionDate || new Date().toISOString().split("T")[0]}`, sign2X + 3.5, y + 20.5);

    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28);
    doc.text("Signature & Cachet du Responsable Technique", sign2X + 3.5, y + 26);

    y += signBoxH + 4;

    // =========================================================================
    // TWO-PASS RUNNING FOOTERS (Guaranteed no overlap on any page)
    // =========================================================================
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(leftMargin, pageHeight - 12, rightX, pageHeight - 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Schindler Maroc — Diagnostic Technique & Sécurité — Confidentiel — Réf: ${report.reportNumber}`,
        leftMargin,
        pageHeight - 7.5
      );
      doc.setFont("helvetica", "bold");
      doc.text(`Page ${p} sur ${totalPages}`, rightX, pageHeight - 7.5, { align: "right" });
    }

    // Save File
    const cleanFileName = `RAPPORT_TECHNIQUE_${report.equipmentNumber || "PF"}_${report.interventionDate || "DATE"}.pdf`;
    doc.save(cleanFileName);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-red-950/30 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  Rapports Techniques & Diagnostic d'Intervention
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-500/20 border border-red-500/30 text-red-300">
                  Expertise Schindler
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Rédigez des rapports techniques de diagnostic détaillés, professionnels et complets avec
                analyse causale, niveau de criticité, pièces nécessaires et plan d'action préventif.
              </p>
            </div>
          </div>

          {/* Sub-Tabs */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 self-start lg:self-center flex-wrap gap-1">
            <button
              onClick={() => setActiveSubTab("form")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === "form"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Paramétrage & Données Terrain</span>
              {editingHistoryId && (
                <span className="ml-1 px-1.5 py-0.5 text-[9px] font-bold rounded-full bg-amber-400 text-slate-950 uppercase tracking-wider">
                  Édition
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveSubTab("result")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === "result"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <FileCheck className="w-3.5 h-3.5" />
              <span>Rapport Rédigé & Export</span>
            </button>
            <button
              onClick={() => setActiveSubTab("history")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeSubTab === "history"
                  ? "bg-red-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Historique ({history.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: FORM & DATA INPUT                                                  */}
      {/* ========================================================================= */}
      {activeSubTab === "form" && (
        <div className="space-y-6 text-xs">
          {/* Active Editing Mode Notification Banner */}
          {editingHistoryId && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-950/90 via-slate-900 to-indigo-950/90 border border-blue-500/50 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-600/30 border border-blue-500/50 text-blue-300">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-white text-sm">Mode Modification du Rapport :</span>
                    <span className="font-mono font-bold text-blue-300 text-sm">{report.reportNumber}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono">
                      {report.equipmentNumber}
                    </span>
                    <span className="text-slate-400 text-xs">• {report.clientName}</span>
                  </div>
                  <p className="text-xs text-blue-200/80 mt-1">
                    Vous modifiez un rapport existant. Sauvegardez directement dans l'historique ou visualisez/exportez le PDF.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveReportModifications}
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/50 cursor-pointer transition-all"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer dans l'historique</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab("result")}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Voir Fiche / PDF</span>
                </button>
                <button
                  type="button"
                  onClick={handleCancelEditMode}
                  className="px-2.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white font-medium text-xs cursor-pointer transition-colors"
                  title="Fermer le mode édition"
                >
                  Quitter
                </button>
              </div>
            </div>
          )}

          {/* Success message banner */}
          {saveSuccessMessage && (
            <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{saveSuccessMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccessMessage(null)}
                className="text-emerald-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

          {/* Feedback banner for auto-fill */}
          {autoFillFeedback && (
            <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg animate-fade-in">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-semibold">{autoFillFeedback}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono bg-emerald-900/60 px-2 py-0.5 rounded-md">
                Auto-fill Actif
              </span>
            </div>
          )}

          {/* Diagnostic Presets Bar */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-red-400" />
                Charger un Scénario / Diagnostic Réel Prédéfini :
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_DIAGNOSTICS.map((preset) => (
                <button
                  key={preset.title}
                  type="button"
                  onClick={() => handleLoadPreset(preset)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 border border-slate-700 hover:border-red-600 text-[11px] text-slate-300 hover:text-white font-medium transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Wrench className="w-3 h-3 text-red-400" />
                  <span>{preset.title}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section 1: Informations Générales & Choix Appareil PF */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-red-400" />
                  <span>1. Informations Générales & Appareil</span>
                </h3>
                <span className="text-[10px] bg-red-950/80 border border-red-800/60 text-red-300 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Zap className="w-2.5 h-2.5 text-red-400" />
                  Auto-remplissage PF
                </span>
              </div>

              {/* Direct Equipment Search Bar & Autocomplete */}
              <div className="relative" ref={pfDropdownRef}>
                <label className="block text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-red-400" />
                    Rechercher le N° d'Appareil (PF) ou Client
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">
                    {availableEquipments.length} appareils répertoriés
                  </span>
                </label>

                <div className="flex gap-2">
                  {/* Direct Search Input Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      value={pfSearchTerm}
                      onFocus={() => setIsPfDropdownOpen(true)}
                      onChange={(e) => {
                        setPfSearchTerm(e.target.value);
                        setIsPfDropdownOpen(true);
                      }}
                      placeholder={`Rechercher un numéro d'appareil (ex: ${report.equipmentNumber || "PF-78012"}, Résidence, Ville...)`}
                      className="w-full pl-10 pr-24 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-red-500/70 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 text-white text-xs placeholder-slate-400 transition-all focus:outline-none"
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      {pfSearchTerm ? (
                        <button
                          type="button"
                          onClick={() => {
                            setPfSearchTerm("");
                            setIsPfDropdownOpen(true);
                          }}
                          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                          title="Effacer la recherche"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-red-900/60 border border-red-700/50 text-red-300 font-mono font-bold text-[11px]">
                          {report.equipmentNumber || "PF"}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsPfDropdownOpen(!isPfDropdownOpen)}
                        className="p-1 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                        title="Afficher / masquer la liste des appareils"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isPfDropdownOpen ? "rotate-180 text-red-400" : ""}`}
                        />
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    title="Régénérer le numéro de rapport avec cet appareil"
                    onClick={handleRegenerateReportNumber}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all cursor-pointer flex items-center gap-1 shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-slate-400 hover:rotate-180 transition-transform" />
                  </button>
                </div>

                {/* Selected equipment summary pill */}
                <div className="mt-2 px-3 py-1.5 rounded-lg bg-slate-950/90 border border-slate-800/80 flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-slate-400">Appareil actif :</span>
                    <span className="font-mono font-bold text-red-400">{report.equipmentNumber}</span>
                    <span className="text-slate-600">•</span>
                    <span className="text-slate-200 font-medium truncate">{report.clientName}</span>
                  </div>
                  <span className="text-slate-400 shrink-0">{report.locationCity}</span>
                </div>

                {/* Dropdown Menu */}
                {isPfDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden max-h-96 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                    <div className="p-2 border-b border-slate-800 bg-slate-950 flex items-center justify-between gap-2 flex-wrap">
                      {/* Filter category pills */}
                      <div className="flex items-center gap-1.5 text-[11px] overflow-x-auto no-scrollbar">
                        <button
                          type="button"
                          onClick={() => setPfCategoryFilter("all")}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            pfCategoryFilter === "all"
                              ? "bg-slate-700 text-white font-bold"
                              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                          }`}
                        >
                          Tous ({availableEquipments.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPfCategoryFilter("active")}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            pfCategoryFilter === "active"
                              ? "bg-blue-600 text-white font-bold"
                              : "text-blue-400 hover:text-blue-300 hover:bg-slate-800"
                          }`}
                        >
                          Parc Actif ({availableEquipments.filter((e) => !e.isArchived).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPfCategoryFilter("archived")}
                          className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer whitespace-nowrap ${
                            pfCategoryFilter === "archived"
                              ? "bg-amber-600 text-white font-bold"
                              : "text-amber-400 hover:text-amber-300 hover:bg-slate-800"
                          }`}
                        >
                          Hors Garantie / Résilié ({availableEquipments.filter((e) => e.isArchived).length})
                        </button>
                      </div>

                      <span className="text-[10px] text-slate-400 font-mono">
                        {filteredEquipments.length} résultat(s)
                      </span>
                    </div>

                    <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
                      {filteredEquipments.length === 0 ? (
                        <div className="p-4 text-center space-y-2">
                          <p className="text-slate-400 text-xs">
                            Aucun appareil répertorié trouvé pour « <span className="text-white font-mono">{pfSearchTerm}</span> »
                          </p>
                          {pfSearchTerm.trim() && (
                            <button
                              type="button"
                              onClick={() => {
                                handleEquipmentNumberChange(pfSearchTerm.trim().toUpperCase());
                                setIsPfDropdownOpen(false);
                                setPfSearchTerm("");
                              }}
                              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Utiliser le N° d'appareil « {pfSearchTerm.trim().toUpperCase()} »</span>
                            </button>
                          )}
                        </div>
                      ) : (
                        filteredEquipments.map((eq) => {
                          const isSelected = eq.pfNumber === report.equipmentNumber;
                          return (
                            <button
                              key={eq.id || eq.pfNumber}
                              type="button"
                              onClick={() => handleSelectEquipment(eq)}
                              className={`w-full p-2.5 text-left transition-colors flex items-center justify-between cursor-pointer hover:bg-red-950/30 ${
                                isSelected ? "bg-red-950/40 border-l-4 border-l-red-500" : ""
                              }`}
                            >
                              <div className="space-y-0.5 flex-1 pr-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-red-300 text-xs bg-red-950/80 px-1.5 py-0.5 rounded border border-red-800/40">
                                    {eq.pfNumber}
                                  </span>
                                  <span className="font-semibold text-white text-xs">
                                    {eq.name || eq.customerAccount || "Appareil"}
                                  </span>
                                  {eq.isArchived ? (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                      {eq.archivedReason || "Hors Garantie / Résilié"}
                                    </span>
                                  ) : (
                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-medium bg-blue-500/10 text-blue-300 border border-blue-500/30">
                                      Sous Contrat
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-3">
                                  <span>{eq.serviceObject || "Ascenseur"}</span>
                                  <span>•</span>
                                  <span>{eq.city || "Maroc"}</span>
                                  {eq.assignedTechnician && (
                                    <>
                                      <span>•</span>
                                      <span className="text-slate-300 font-medium">Tech: {eq.assignedTechnician}</span>
                                    </>
                                  )}
                                </div>
                              </div>
                              {isSelected && <Check className="w-4 h-4 text-red-400 shrink-0 ml-2" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {/* Quick select chips for rapid apparatus selection */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 no-scrollbar">
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">Accès rapide:</span>
                  {availableEquipments.slice(0, 6).map((eq) => (
                    <button
                      key={eq.id || eq.pfNumber}
                      type="button"
                      onClick={() => handleSelectEquipment(eq)}
                      className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer whitespace-nowrap flex items-center gap-1 ${
                        report.equipmentNumber === eq.pfNumber
                          ? "bg-red-600 text-white font-bold shadow"
                          : eq.isArchived
                          ? "bg-amber-950/60 text-amber-300 hover:bg-amber-900/80 border border-amber-800/50"
                          : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white"
                      }`}
                    >
                      <span>{eq.pfNumber}</span>
                      {eq.isArchived && <span className="text-[8px] opacity-80">(HG)</span>}
                    </button>
                  ))}
                </div>
              </div>

              {/* Detailed Form Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">N° du Rapport</label>
                    <span className="text-[10px] text-red-400 font-mono">Avec N° PF</span>
                  </div>
                  <input
                    type="text"
                    value={report.reportNumber}
                    onChange={(e) => setReport({ ...report, reportNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-xs focus:ring-2 focus:ring-red-500 focus:outline-none"
                    title="Numéro générique incluant le PF de l'appareil"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Date d'Intervention</label>
                  <input
                    type="date"
                    value={report.interventionDate}
                    onChange={(e) => handleInterventionDateChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-slate-400 font-medium">N° Appareil (PF)</label>
                    <span className="text-[10px] text-emerald-400 font-mono">Clé principale</span>
                  </div>
                  <input
                    type="text"
                    value={report.equipmentNumber}
                    onChange={(e) => handleEquipmentNumberChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold text-red-300 focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="ex: PF-78012"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Type / Modèle Ascenseur</label>
                  <input
                    type="text"
                    value={report.equipmentType}
                    onChange={(e) => setReport({ ...report, equipmentType: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="ex: Schindler 3300"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Client / Immeuble</label>
                  <input
                    type="text"
                    value={report.clientName}
                    onChange={(e) => setReport({ ...report, clientName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="ex: Tour Horizon"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Ville</label>
                  <input
                    type="text"
                    value={report.locationCity}
                    onChange={(e) => setReport({ ...report, locationCity: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="ex: Casablanca"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">Technicien Intervenant</label>
                  <input
                    type="text"
                    value={report.technicianName}
                    onChange={(e) => setReport({ ...report, technicianName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="Nom complet du technicien"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Responsable du Technicien (Signataire)
                  </label>
                  <input
                    type="text"
                    value={report.supervisorName || ""}
                    onChange={(e) => setReport({ ...report, supervisorName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-medium focus:ring-2 focus:ring-red-500 focus:outline-none"
                    placeholder="ex: OUSSAMA OUBGHOUS (Responsable Technique)"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Constat sur terrain */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
                  <Eye className="w-4 h-4 text-red-400" />
                  <span>2. Constat sur le Terrain</span>
                </h3>
                <p className="text-slate-400 text-[11px] mt-2 mb-2">
                  Décrivez précisément l'état de l'appareil lors de l'arrivée du technicien sur site :
                </p>
                <textarea
                  rows={4}
                  value={report.siteObservation}
                  onChange={(e) => setReport({ ...report, siteObservation: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none text-xs leading-relaxed"
                  placeholder="Appareil immobilisé, code défaut affiché, bruits, signalements des résidents..."
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  4. Historique des Pannes & Analyse des Récurrences
                </label>
                <textarea
                  rows={2}
                  value={report.historyAndRecurrence}
                  onChange={(e) => setReport({ ...report, historyAndRecurrence: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none text-xs"
                  placeholder="Fréquence des pannes récentes, antécédents similaires..."
                />
              </div>
            </div>
          </div>

          {/* Section 3: Anomalies Constatées (Obligatoires 1 à 10) */}
          <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-5 shadow-lg">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-white text-sm">
                    3. Anomalies Constatées ({report.anomalies.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Chaque anomalie intègre automatiquement l'analyse des causes, impact, actions réalisées,
                    solutions et criticité.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleAddAnomaly}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md shadow-red-950/40"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter une Anomalie</span>
              </button>
            </div>

            {report.anomalies.map((ano, index) => (
              <div
                key={ano.id}
                className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3 relative group hover:border-slate-700 transition-all"
              >
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2 flex-1">
                    <span className="w-6 h-6 rounded-full bg-red-600/20 text-red-400 font-bold text-xs flex items-center justify-center border border-red-500/30">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={ano.title}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { title: e.target.value })}
                      className="font-bold text-white text-sm bg-transparent border-none focus:outline-none focus:ring-0 flex-1"
                      placeholder="Intitulé de l'anomalie..."
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Criticality Selector */}
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 font-medium">Criticité :</span>
                      <select
                        value={ano.criticality}
                        onChange={(e) =>
                          handleUpdateAnomaly(ano.id, {
                            criticality: e.target.value as AnomalyCriticality
                          })
                        }
                        className={`px-2 py-1 rounded-lg text-xs font-bold border focus:outline-none cursor-pointer ${
                          ano.criticality === "Critique" || ano.criticality === "Élevé"
                            ? "bg-red-950/60 border-red-700 text-red-300"
                            : ano.criticality === "Moyen"
                            ? "bg-amber-950/60 border-amber-700 text-amber-300"
                            : "bg-emerald-950/60 border-emerald-700 text-emerald-300"
                        }`}
                      >
                        <option value="Faible">Faible</option>
                        <option value="Moyen">Moyen</option>
                        <option value="Élevé">Élevé</option>
                        <option value="Critique">Critique</option>
                      </select>
                    </div>

                    {report.anomalies.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAnomaly(ano.id)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Supprimer cette anomalie"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="md:col-span-2">
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      Organe / Système concerné
                    </label>
                    <input
                      type="text"
                      value={ano.organ || ""}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { organ: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="ex: Armoire de manœuvre / Variateur, Portes palières, Poulie & câbles..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      1. Description détaillée de l'anomalie
                    </label>
                    <textarea
                      rows={2}
                      value={ano.description}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { description: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="Constat technique..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      2. Analyse des causes probables
                    </label>
                    <textarea
                      rows={2}
                      value={ano.causes}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { causes: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="Origine du défaut (usure, surcharge, échauffement...)"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      3. Impact potentiel sur le fonctionnement
                    </label>
                    <input
                      type="text"
                      value={ano.impact}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { impact: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="ex: Arrêt intempestif, usure des câbles..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      4. Actions correctives déjà réalisées sur site
                    </label>
                    <input
                      type="text"
                      value={ano.actionsDone}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { actionsDone: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="Dépoussiérage, réglages, tests..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      5. Solution préconisée à court terme (palliative)
                    </label>
                    <input
                      type="text"
                      value={ano.temporarySolution}
                      onChange={(e) =>
                        handleUpdateAnomaly(ano.id, { temporarySolution: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      6. Solution définitive recommandée
                    </label>
                    <input
                      type="text"
                      value={ano.definitiveSolution}
                      onChange={(e) =>
                        handleUpdateAnomaly(ano.id, { definitiveSolution: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      7. Pièces de rechange nécessaires (si applicable)
                    </label>
                    <input
                      type="text"
                      value={ano.requiredParts}
                      onChange={(e) => handleUpdateAnomaly(ano.id, { requiredParts: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="Désignations et références..."
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 text-[11px] font-medium mb-1">
                      9. Recommandations de maintenance préventive
                    </label>
                    <input
                      type="text"
                      value={ano.preventiveRecommendations}
                      onChange={(e) =>
                        handleUpdateAnomaly(ano.id, { preventiveRecommendations: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-white focus:ring-1 focus:ring-red-500 focus:outline-none text-xs"
                      placeholder="Points de contrôle périodiques..."
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Section 5 & 6: Travaux & Tableau des pièces */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 5. Travaux réalisés */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg">
              <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-red-400" />
                <span>5. Travaux Réalisés lors de l'Intervention</span>
              </h3>
              <p className="text-slate-400 text-[11px]">
                Listez chronologiquement les actions et contrôles exécutés sur site :
              </p>
              <textarea
                rows={5}
                value={report.worksDone}
                onChange={(e) => setReport({ ...report, worksDone: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none text-xs leading-relaxed"
                placeholder="1. Consignation...\n2. Contrôles...\n3. Essais..."
              />
            </div>

            {/* 6. Pièces remplacées ou commandées */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <h3 className="font-bold text-white text-sm flex items-center gap-2">
                    <Layers className="w-4 h-4 text-red-400" />
                    <span>6. Pièces Remplacées ou Commandées</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleAddPart}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-semibold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter Pièce</span>
                  </button>
                </div>

                <div className="space-y-2 mt-3 max-h-64 overflow-y-auto pr-1">
                  {report.replacedOrOrderedParts.map((part) => (
                    <div
                      key={part.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={part.designation}
                          onChange={(e) => handleUpdatePart(part.id, { designation: e.target.value })}
                          placeholder="Désignation de la pièce"
                          className="flex-1 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs"
                        />
                        <input
                          type="text"
                          value={part.reference}
                          onChange={(e) => handleUpdatePart(part.id, { reference: e.target.value })}
                          placeholder="Réf"
                          className="w-28 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                        />
                        <input
                          type="number"
                          value={part.quantity}
                          onChange={(e) => handleUpdatePart(part.id, { quantity: Number(e.target.value) })}
                          placeholder="Qté"
                          className="w-16 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs text-center"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemovePart(part.id)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Supprimer la pièce"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                        <input
                          type="text"
                          value={part.reason || ""}
                          onChange={(e) => handleUpdatePart(part.id, { reason: e.target.value })}
                          placeholder="Motif de remplacement / besoin"
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs"
                        />
                        <select
                          value={part.status || "À chiffrer sur devis"}
                          onChange={(e) => handleUpdatePart(part.id, { status: e.target.value as any })}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs focus:outline-none"
                        >
                          <option value="À chiffrer sur devis">À chiffrer sur devis</option>
                          <option value="Remplacée sur site">Remplacée sur site</option>
                          <option value="À commander en urgence">À commander en urgence</option>
                          <option value="En stock agence">En stock agence</option>
                        </select>
                      </div>
                    </div>
                  ))}
                  {report.replacedOrOrderedParts.length === 0 && (
                    <p className="text-slate-500 text-center py-4 text-xs italic">
                      Aucune pièce listée pour cette intervention.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    7. Recommandations Techniques Préconisées
                  </label>
                  <textarea
                    rows={2}
                    value={report.technicalRecommendations}
                    onChange={(e) => setReport({ ...report, technicalRecommendations: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Actions préventives, contrôles périodiques, remplacements planifiés..."
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    8. Conclusion Générale sur l'Appareil
                  </label>
                  <textarea
                    rows={2}
                    value={report.conclusion}
                    onChange={(e) => setReport({ ...report, conclusion: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-red-500 focus:outline-none text-xs"
                    placeholder="Conclusion générale sur la sécurité et le suivi de l'appareil..."
                  />
                </div>
              </div>
            </div>
          </div>

          {/* AI Generation Trigger Bar */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-red-950/60 via-slate-900 to-slate-900 border border-red-500/30 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-red-400 animate-pulse" />
                <h4 className="font-bold text-white text-sm">
                  Génération Experte par Intelligence Artificielle
                </h4>
              </div>
              <p className="text-slate-400 text-xs mt-0.5">
                Rédige instantanément le rapport complet selon le prompt officiel de diagnostic Schindler.
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={handleSaveReportModifications}
                className="w-full sm:w-auto px-5 py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition-all cursor-pointer"
                title="Sauvegarder immédiatement ce rapport dans l'historique local"
              >
                <Save className="w-4 h-4" />
                <span>{editingHistoryId ? "Enregistrer les modifications" : "Sauvegarder dans l'historique"}</span>
              </button>

              <button
                type="button"
                disabled={isGenerating}
                onClick={handleGenerateReportAI}
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-900/40 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Rédaction du rapport en cours...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-current" />
                    <span>Générer le Rapport Technique Complet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {generationError && (
            <div className="p-4 rounded-xl bg-red-950/80 border border-red-700 text-red-200 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{generationError}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RESULT VIEW & EXPORTS                                              */}
      {/* ========================================================================= */}
      {activeSubTab === "result" && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="p-4 md:p-5 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                <div>
                  <span className="font-bold text-white text-sm">
                    {report.reportNumber}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">({report.equipmentNumber} — {report.clientName})</span>
                </div>
              </div>

              {/* View Switcher: Mirror vs AI */}
              <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setResultViewMode("mirror")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    resultViewMode === "mirror"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Fiche Technique (Miroir PDF)
                </button>
                <button
                  type="button"
                  onClick={() => setResultViewMode("ai")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
                    resultViewMode === "ai"
                      ? "bg-red-600 text-white shadow-sm"
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Sparkles className="w-3 h-3 text-red-300" />
                  <span>Synthèse Rédigée par IA</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeAiInPdf}
                  onChange={(e) => setIncludeAiInPdf(e.target.checked)}
                  className="rounded border-slate-700 text-red-600 focus:ring-red-500 cursor-pointer"
                />
                <span>Inclure rédaction IA au PDF</span>
              </label>

              <button
                type="button"
                onClick={handleCopyMarkdown}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Copier le texte du rapport"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copié !" : "Copier"}</span>
              </button>

              <button
                type="button"
                onClick={() => window.print()}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditingHistoryId(report.id);
                  setActiveSubTab("form");
                }}
                className="px-3 py-2 rounded-xl bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Modifier les données de ce rapport dans le formulaire"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Modifier ce rapport</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-red-950/60 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Télécharger PDF Officiel</span>
              </button>
            </div>
          </div>

          {/* VIEW MODE 1: FICHE TECHNIQUE COMPLÈTE (MIROIR EXACT DU PDF SANS CHEVAUCHEMENT) */}
          {resultViewMode === "mirror" && (
            <div className="p-6 md:p-8 rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl space-y-6 font-sans">
              {/* Top Schindler Branding Header */}
              <div className="border-b-2 border-red-600 pb-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-8 bg-red-600 rounded-sm" />
                  <div>
                    <h2 className="text-sm font-black tracking-wider text-red-600">
                      SCHINDLER MAROC • EXPERTISE & DIAGNOSTIC TECHNIQUE
                    </h2>
                    <p className="text-[11px] text-slate-500">
                      Direction des Opérations & Service Après-Vente — Conforme aux normes Schindler
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2.5 py-1 rounded border border-slate-300">
                    {report.reportNumber}
                  </div>
                </div>
              </div>

              {/* Title */}
              <div className="text-center py-1">
                <h1 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">
                  Rapport Technique d'Intervention et Diagnostic
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Fiche d'expertise officielle avec traçabilité complète de l'appareil
                </p>
              </div>

              {/* Section 1: Informations Générales & Appareil */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    1. Informations Générales & Appareil
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="text-red-700 font-bold text-[11px] pb-1 border-b border-slate-200 uppercase">
                      Données Appareil & Localisation
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">N° Appareil (PF) :</span>
                      <span className="font-mono font-bold text-red-600 text-sm">{report.equipmentNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Client / Site :</span>
                      <span className="font-medium text-slate-900 text-right">{report.clientName || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Ville / Localisation :</span>
                      <span className="font-medium text-slate-900">{report.locationCity || "-"}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Type / Gamme :</span>
                      <span className="font-medium text-slate-900">{report.equipmentType || "Ascenseur"}</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                    <div className="text-slate-700 font-bold text-[11px] pb-1 border-b border-slate-200 uppercase">
                      Intervention & Encadrement
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">N° Rapport :</span>
                      <span className="font-mono font-bold text-slate-800">{report.reportNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Date d'intervention :</span>
                      <span className="font-medium text-slate-900">{report.interventionDate}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Technicien intervenant :</span>
                      <span className="font-medium text-slate-900">{report.technicianName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Responsable (Signataire) :</span>
                      <span className="font-bold text-red-700">{report.supervisorName || "Direction Technique Schindler"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 2: Constat sur le Terrain */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    2. Constat sur le Terrain
                  </h3>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                  {report.siteObservation || "Aucun constat particulier renseigné."}
                </div>
              </div>

              {/* Section 3: Anomalies Constatées */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    3. Anomalies Constatées ({report.anomalies.length})
                  </h3>
                </div>

                <div className="space-y-3">
                  {report.anomalies.map((ano, idx) => (
                    <div key={ano.id} className="rounded-xl border border-slate-200 overflow-hidden bg-white shadow-sm">
                      {/* Anomaly Header */}
                      <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-900">
                            Anomalie N°{idx + 1} : {ano.title}
                          </span>
                          {ano.organ && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-200 text-slate-700 font-semibold text-[10px]">
                              {ano.organ}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                            ano.criticality === "Critique" || ano.criticality === "Élevé"
                              ? "bg-red-100 text-red-800 border-red-300"
                              : ano.criticality === "Moyen"
                              ? "bg-amber-100 text-amber-800 border-amber-300"
                              : "bg-emerald-100 text-emerald-800 border-emerald-300"
                          }`}
                        >
                          Criticité : {ano.criticality}
                        </span>
                      </div>

                      {/* Anomaly Rubrics */}
                      <div className="p-4 space-y-2.5 text-xs text-slate-800">
                        {ano.organ && (
                          <div>
                            <span className="font-bold text-red-700">• Organe concerné : </span>
                            <span>{ano.organ}</span>
                          </div>
                        )}
                        {ano.description && (
                          <div>
                            <span className="font-bold text-slate-700">• 1. Description détaillée : </span>
                            <span className="text-slate-900">{ano.description}</span>
                          </div>
                        )}
                        {ano.causes && (
                          <div>
                            <span className="font-bold text-slate-700">• 2. Causes probables : </span>
                            <span className="text-slate-900">{ano.causes}</span>
                          </div>
                        )}
                        {ano.impact && (
                          <div>
                            <span className="font-bold text-slate-700">• 3. Impact sur le fonctionnement : </span>
                            <span className="text-slate-900">{ano.impact}</span>
                          </div>
                        )}
                        {ano.actionsDone && (
                          <div>
                            <span className="font-bold text-slate-700">• 4. Actions réalisées sur site : </span>
                            <span className="text-slate-900">{ano.actionsDone}</span>
                          </div>
                        )}
                        {ano.temporarySolution && (
                          <div>
                            <span className="font-bold text-slate-700">• 5. Solution à court terme (palliative) : </span>
                            <span className="text-slate-900">{ano.temporarySolution}</span>
                          </div>
                        )}
                        {ano.definitiveSolution && (
                          <div>
                            <span className="font-bold text-red-700">• 6. Solution définitive recommandée : </span>
                            <span className="text-slate-900 font-medium">{ano.definitiveSolution}</span>
                          </div>
                        )}
                        {ano.requiredParts && (
                          <div>
                            <span className="font-bold text-slate-700">• 7. Pièces requises : </span>
                            <span className="text-slate-900">{ano.requiredParts}</span>
                          </div>
                        )}
                        {ano.preventiveRecommendations && (
                          <div>
                            <span className="font-bold text-slate-700">• 8. Recommandations préventives : </span>
                            <span className="text-slate-900">{ano.preventiveRecommendations}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Historique des Pannes & Récurrence */}
              {report.historyAndRecurrence && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                      4. Historique des Pannes & Analyse des Récurrences
                    </h3>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed">
                    {report.historyAndRecurrence}
                  </div>
                </div>
              )}

              {/* Section 5: Travaux Réalisés */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    5. Travaux Réalisés lors de l'Intervention
                  </h3>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                  {report.worksDone || "Travaux standards de maintenance et contrôles effectués."}
                </div>
              </div>

              {/* Section 6: Pièces Remplacées ou Commandées */}
              {report.replacedOrOrderedParts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                      6. Pièces Remplacées ou Commandées
                    </h3>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-900 font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-2.5">Désignation</th>
                          <th className="p-2.5">Référence</th>
                          <th className="p-2.5 text-center">Qté</th>
                          <th className="p-2.5">Motif</th>
                          <th className="p-2.5">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {report.replacedOrOrderedParts.map((part) => (
                          <tr key={part.id} className="hover:bg-slate-50">
                            <td className="p-2.5 font-bold text-slate-900">{part.designation}</td>
                            <td className="p-2.5 font-mono text-slate-600">{part.reference}</td>
                            <td className="p-2.5 text-center font-bold text-red-600">{part.quantity}</td>
                            <td className="p-2.5 text-slate-600">{part.reason || "-"}</td>
                            <td className="p-2.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  part.status?.includes("Remplacée")
                                    ? "bg-emerald-100 text-emerald-800"
                                    : part.status?.includes("urgence")
                                    ? "bg-red-100 text-red-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {part.status || "À chiffrer"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Section 7: Recommandations Techniques */}
              {report.technicalRecommendations && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                    <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                      7. Recommandations Techniques Préconisées
                    </h3>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 leading-relaxed whitespace-pre-line">
                    {report.technicalRecommendations}
                  </div>
                </div>
              )}

              {/* Section 8: Conclusion Générale & Plan d'Action */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-4 bg-red-600 rounded-full" />
                  <h3 className="font-bold text-xs uppercase tracking-wide text-slate-900">
                    8. Conclusion Générale & Plan d'Action
                  </h3>
                </div>
                <div className="p-4 rounded-xl bg-red-50/70 border border-red-200 text-xs text-red-950 leading-relaxed font-medium">
                  {report.conclusion || "Appareil sous surveillance technique."}
                </div>
              </div>

              {/* Signatures */}
              <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3 text-xs">
                  <div className="font-bold text-slate-700 uppercase tracking-wide text-[11px]">
                    Visa du Client / Syndic de Copropriété
                  </div>
                  <div className="text-slate-400 text-[11px]">Nom du signataire : ___________________________</div>
                  <div className="text-slate-400 text-[11px]">Date & Signature :</div>
                  <div className="h-10 border-b border-dashed border-slate-300" />
                  <div className="text-[10px] text-slate-400 italic">Mention « Bon pour accord des travaux »</div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
                  <div className="font-bold text-red-700 uppercase tracking-wide text-[11px]">
                    Visa & Signature Direction Technique Schindler
                  </div>
                  <div className="text-slate-900 font-bold">
                    Responsable signataire : {report.supervisorName || "OUSSAMA OUBGHOUS"}
                  </div>
                  <div className="text-slate-600 text-[11px]">
                    Technicien intervenant : {report.technicianName}
                  </div>
                  <div className="text-slate-500 text-[11px]">Date de visa : {report.interventionDate}</div>
                  <div className="h-8 border-b border-dashed border-slate-300" />
                  <div className="text-[10px] text-red-600 font-medium italic">Signature & Cachet du Responsable Technique</div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW MODE 2: SYNTHÈSE D'EXPERTISE RÉDIGÉE PAR IA */}
          {resultViewMode === "ai" && (
            <div className="p-8 md:p-10 rounded-2xl bg-slate-900/95 border border-slate-800 shadow-2xl text-slate-200 leading-relaxed font-sans">
              {report.generatedContentMarkdown ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                    <span className="text-xs font-semibold text-red-400 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Rapport rédigé par le moteur d'intelligence Schindler</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleGenerateReportAI}
                      disabled={isGenerating}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${isGenerating ? "animate-spin" : ""}`} />
                      <span>Régénérer</span>
                    </button>
                  </div>

                  <div className="prose prose-invert max-w-none text-xs md:text-sm space-y-4">
                    <div className="markdown-body">
                      <Markdown>{report.generatedContentMarkdown}</Markdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3">
                  <FileText className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="text-slate-400 font-medium">
                    Aucune rédaction rédigée par IA pour le moment.
                  </p>
                  <p className="text-slate-500 text-xs max-w-md mx-auto">
                    Le moteur d'intelligence artificielle va structurer vos rubriques et rédiger un argumentaire technique de niveau ingénieur.
                  </p>
                  <button
                    type="button"
                    onClick={handleGenerateReportAI}
                    disabled={isGenerating}
                    className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Lancer la génération par IA</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: HISTORY                                                            */}
      {/* ========================================================================= */}
      {activeSubTab === "history" && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Clock className="w-4 h-4 text-red-400" />
                <span>Historique des Rapports Techniques ({history.length})</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Recherchez par numéro d'appareil (PF), consultez, modifiez ou dupliquez vos rapports.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreateNewDraft}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-red-950/40 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Nouveau Rapport Vierge</span>
              </button>

              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Voulez-vous effacer l'historique complet des rapports ?")) {
                      setHistory([]);
                      setEditingHistoryId(null);
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 border border-slate-700/60 text-xs transition-colors cursor-pointer"
                >
                  Vider
                </button>
              )}
            </div>
          </div>

          {/* Search Bar for Equipment Number (PF) in History */}
          {history.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950/90 border border-slate-800/80 space-y-2.5">
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-red-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={historySearchTerm}
                    onChange={(e) => setHistorySearchTerm(e.target.value)}
                    placeholder="Rechercher par N° d'Appareil (ex: PF-78012), N° de Rapport, Client, Technicien ou Ville..."
                    className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 focus:border-red-500 focus:ring-2 focus:ring-red-500/30 text-white text-xs placeholder-slate-400 focus:outline-none transition-all"
                  />
                  {historySearchTerm && (
                    <button
                      type="button"
                      onClick={() => setHistorySearchTerm("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Effacer la recherche"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  {(["all", "Généré", "Brouillon"] as const).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setHistoryStatusFilter(st)}
                      className={`px-3 py-2 rounded-xl font-semibold text-xs cursor-pointer transition-all border ${
                        historyStatusFilter === st
                          ? "bg-red-600 text-white border-red-500 shadow"
                          : "bg-slate-900 text-slate-400 hover:text-white border-slate-800"
                      }`}
                    >
                      {st === "all" ? `Tous (${history.length})` : st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick filter chips for distinct PF numbers present in history */}
              {Array.from(new Set(history.map((h) => h.equipmentNumber).filter(Boolean))).length > 0 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar pt-1">
                  <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">
                    Filtrer par N° Appareil :
                  </span>
                  {Array.from(new Set(history.map((h) => h.equipmentNumber).filter(Boolean))).map((pf) => {
                    const isActive = historySearchTerm.toUpperCase() === pf.toUpperCase();
                    return (
                      <button
                        key={pf}
                        type="button"
                        onClick={() => setHistorySearchTerm(isActive ? "" : pf)}
                        className={`text-[10px] px-2 py-0.5 rounded-md font-mono transition-all cursor-pointer whitespace-nowrap border ${
                          isActive
                            ? "bg-red-600 text-white border-red-500 font-bold"
                            : "bg-slate-900 text-red-300 border-slate-800 hover:border-red-500/40"
                        }`}
                      >
                        {pf}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            {filteredHistory.map((item) => {
              const isBeingEdited = editingHistoryId === item.id;
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 ${
                    isBeingEdited
                      ? "bg-blue-950/30 border-blue-500/50 shadow-md shadow-blue-950/30"
                      : "bg-slate-950/80 border-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-xs font-mono">{item.reportNumber}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-300 border border-red-500/30 font-mono">
                        {item.equipmentNumber}
                      </span>
                      <span className="text-[11px] text-slate-300 font-medium">
                        {item.clientName} {item.locationCity ? `(${item.locationCity})` : ""}
                      </span>

                      {isBeingEdited && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-slate-950 uppercase tracking-wider">
                          En cours d'édition
                        </span>
                      )}

                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                        {item.status || "Archivé"}
                      </span>
                    </div>

                    <div className="text-[11px] text-slate-400 flex items-center gap-2 flex-wrap">
                      <span>Date : <strong className="text-slate-200 font-medium">{item.interventionDate}</strong></span>
                      <span>•</span>
                      <span>Technicien : <strong className="text-slate-200 font-medium">{item.technicianName}</strong></span>
                      <span>•</span>
                      <span>
                        Signataire : <strong className="text-red-300 font-medium">{item.supervisorName || "Direction Technique Schindler"}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-slate-400 font-mono">
                        {item.anomalies?.length || 0} anomalie(s)
                      </span>
                      {item.replacedOrOrderedParts?.length > 0 && (
                        <span className="text-slate-400 font-mono">
                          • {item.replacedOrOrderedParts.length} pièce(s)
                        </span>
                      )}
                      {item.updatedAt && (
                        <span className="text-[10px] text-amber-400/90 bg-amber-950/40 px-1.5 py-0.5 rounded border border-amber-800/40">
                          Modifié le {new Date(item.updatedAt).toLocaleDateString("fr-FR")} à {new Date(item.updatedAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap self-end lg:self-center">
                    {/* Modifier Button: Loads into form */}
                    <button
                      type="button"
                      onClick={() => handleEditHistoryReport(item)}
                      className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-sm"
                      title="Modifier les données de ce rapport dans le formulaire"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Modifier</span>
                    </button>

                    {/* Consulter Button: Loads into Result View for PDF export */}
                    <button
                      type="button"
                      onClick={() => {
                        setReport(item);
                        setEditingHistoryId(item.id);
                        setActiveSubTab("result");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer transition-colors"
                      title="Consulter la fiche technique et exporter en PDF"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span>Fiche & PDF</span>
                    </button>

                    {/* Dupliquer Button */}
                    <button
                      type="button"
                      onClick={() => handleDuplicateHistoryReport(item)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition-colors"
                      title="Dupliquer ce rapport sous un nouveau numéro"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>

                    {/* Supprimer Button */}
                    <button
                      type="button"
                      onClick={() => handleDeleteHistoryReport(item.id)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-red-950/60 text-slate-400 hover:text-red-400 border border-slate-800 hover:border-red-800/40 cursor-pointer transition-colors"
                      title="Supprimer définitivement ce rapport de l'historique"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}

            {history.length > 0 && filteredHistory.length === 0 && (
              <div className="text-center py-10 text-slate-400 text-xs space-y-2 bg-slate-950/50 rounded-xl border border-slate-800/60">
                <Search className="w-7 h-7 text-slate-600 mx-auto" />
                <p>
                  Aucun rapport ne correspond à la recherche « <strong className="text-white font-mono">{historySearchTerm}</strong> ».
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setHistorySearchTerm("");
                    setHistoryStatusFilter("all");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  Réinitialiser les filtres
                </button>
              </div>
            )}

            {history.length === 0 && (
              <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                <Clock className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                <p className="italic">Aucun rapport archivé dans l'historique local.</p>
                <button
                  type="button"
                  onClick={handleCreateNewDraft}
                  className="px-3 py-1.5 rounded-lg bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/30 font-medium inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Créer un premier rapport</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
