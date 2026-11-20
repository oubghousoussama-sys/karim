import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  FileText,
  Users,
  Download,
  Printer,
  Plus,
  Trash2,
  Edit2,
  Check,
  Building2,
  Calendar,
  Phone,
  Car,
  IdCard,
  Search,
  RotateCcw,
  Sparkles,
  Eye,
  CheckCircle2,
  Clock,
  Send,
  X,
  Copy,
  ChevronDown,
  ChevronUp,
  UserCheck,
  ShieldCheck,
  MapPin,
  Briefcase
} from "lucide-react";
import { FaxTechnician, FaxInterventionData } from "../../types";
import jsPDF from "jspdf";

const TECHNICIANS_STORAGE_KEY = "toolbox_fax_technicians_db_v1";
const FAX_HISTORY_STORAGE_KEY = "toolbox_fax_history_db_v1";

// Default initial technicians with real Schindler Morocco references
export const INITIAL_TECHNICIANS: FaxTechnician[] = [
  {
    id: "tech-1",
    fullName: "ABDELJALIL AIT BAHMED",
    cin: "PB157995",
    vehiclePlate: "72441B72",
    phone: "+212 6 61 45 88 12",
    role: "Technicien Supérieur Maintenance & Travaux",
    city: "Errachidia / Arfoud",
    isDefault: true
  },
  {
    id: "tech-2",
    fullName: "KARIM BENNANI",
    cin: "CD458921",
    vehiclePlate: "84912A72",
    phone: "+212 6 62 10 99 34",
    role: "Chef d'Équipe Ascensoriste",
    city: "Fès / Meknès",
    isDefault: false
  },
  {
    id: "tech-3",
    fullName: "HICHAM BOUTKHILI",
    cin: "BK319042",
    vehiclePlate: "19842C72",
    phone: "+212 6 61 78 44 20",
    role: "Technicien Spécialiste Dépannage Rapide",
    city: "Oujda / Oriental",
    isDefault: false
  },
  {
    id: "tech-4",
    fullName: "YOUSSEF ALAMI",
    cin: "FL891234",
    vehiclePlate: "56102B72",
    phone: "+212 6 63 90 11 45",
    role: "Électromécanicien Maintenance Préventive",
    city: "Fès",
    isDefault: false
  },
  {
    id: "tech-5",
    fullName: "MEHDI TAZI",
    cin: "D892147",
    vehiclePlate: "34190B72",
    phone: "+212 6 61 33 22 55",
    role: "Technicien Expert Contrôles Réglementaires",
    city: "Casablanca / Rabat",
    isDefault: false
  },
  {
    id: "tech-6",
    fullName: "MOHAMMED GHAFIR",
    cin: "PA210984",
    vehiclePlate: "67201B72",
    phone: "+212 6 64 55 66 77",
    role: "Technicien Maintenance Portes Automatiques",
    city: "Meknès",
    isDefault: false
  },
  {
    id: "tech-7",
    fullName: "OUSSAMA OUBGHOUS",
    cin: "EE548910",
    vehiclePlate: "90184A72",
    phone: "+212 6 61 12 34 56",
    role: "Responsable Technique & Opérations",
    city: "Fès / Région Centre-Sud",
    isDefault: false
  }
];

// Quick presets for royal palaces and key institutions
const PROTOCOL_PRESETS = [
  {
    name: "Palais Royal Arfoud",
    recipientTitle: "A l’Attention de Monsieur le Conservateur du Palais",
    recipientLocation: "ROYAL Arfoud",
    subject: "Objet : Intervention à effectuer au Palais ARFOUD",
    salutation: "Monsieur,",
    department: "Direction Commerciale des I.E.",
    defaultTechNames: ["ABDELJALIL AIT BAHMED"]
  },
  {
    name: "Palais Royal Fès",
    recipientTitle: "A l’Attention de Monsieur le Conservateur du Palais",
    recipientLocation: "ROYAL Fès",
    subject: "Objet : Intervention technique et maintenance préventive au Palais Royal de FÈS",
    salutation: "Monsieur le Conservateur,",
    department: "Direction des Opérations & Maintenance",
    defaultTechNames: ["KARIM BENNANI", "YOUSSEF ALAMI"]
  },
  {
    name: "Palais Royal Rabat",
    recipientTitle: "A l’Attention de Monsieur le Chef du Service Sécurité & Accès",
    recipientLocation: "Palais Royal de Rabat",
    subject: "Objet : Avis d'intervention pour révision périodique des ascenseurs",
    salutation: "Monsieur le Chef de Service,",
    department: "Direction Technique Schindler Maroc",
    defaultTechNames: ["MEHDI TAZI"]
  },
  {
    name: "Banque Centrale Populaire (BCP)",
    recipientTitle: "A l’Attention de Monsieur le Directeur des Moyens Généraux",
    recipientLocation: "Siège Régional BCP",
    subject: "Objet : Demande d'autorisation d'accès pour visite trimestrielle des appareils",
    salutation: "Monsieur le Directeur,",
    department: "Direction Commerciale & Grands Comptes",
    defaultTechNames: ["KARIM BENNANI", "HICHAM BOUTKHILI"]
  },
  {
    name: "CHU Hassan II Fès",
    recipientTitle: "A l’Attention de Monsieur le Responsable des Équipements Biomédicaux & Techniques",
    recipientLocation: "CHU Hassan II - Fès",
    subject: "Objet : Intervention de maintenance et levée des réserves sur le parc élévateur",
    salutation: "Monsieur le Responsable,",
    department: "Direction Technique & SAV",
    defaultTechNames: ["YOUSSEF ALAMI", "MOHAMMED GHAFIR"]
  }
];

export const FaxInterventionGenerator: React.FC = () => {
  // Navigation active tab
  const [activeTab, setActiveTab] = useState<"editor" | "technicians" | "history">("editor");

  // Technicians Database state
  const [technicians, setTechnicians] = useState<FaxTechnician[]>(() => {
    try {
      const saved = localStorage.getItem(TECHNICIANS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load technicians:", e);
    }
    return INITIAL_TECHNICIANS;
  });

  // FAX History state
  const [faxHistory, setFaxHistory] = useState<FaxInterventionData[]>(() => {
    try {
      const saved = localStorage.getItem(FAX_HISTORY_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error("Failed to load fax history:", e);
    }
    return [];
  });

  // Current FAX Form state (initialized matching FAX.pdf exactly)
  const [faxData, setFaxData] = useState<FaxInterventionData>({
    id: "fax-" + Date.now(),
    docNumber: "FAX-" + new Date().getFullYear() + "-042",
    date: "20/04/2026",
    department: "Direction Commerciale des I.E.",
    docTitle: "FAX INTERVENTION",
    recipientTitle: "A l’Attention de Monsieur le Conservateur du Palais",
    recipientLocation: "ROYAL Arfoud",
    subject: "Objet : Intervention à effectuer au Palais ARFOUD",
    salutation: "Monsieur,",
    introText: "J’ai le plaisir de vous communiquer la liste des personnes susceptibles d’intervenir pour l’entretien des appareils,",
    technicians: [INITIAL_TECHNICIANS[0]],
    closingText1: "Je reste à votre entière disposition pour tout complément d’information désiré.",
    closingText2: "Veuillez agréer, Monsieur, l’expression de mes salutations distinguées.",
    senderName: "Schindler Maroc",
    senderSignatory: "",
    notes: "",
    status: "Généré"
  });

  // Technician modal for Add/Edit
  const [isTechModalOpen, setIsTechModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<FaxTechnician | null>(null);
  const [techFormData, setTechFormData] = useState<Omit<FaxTechnician, "id">>({
    fullName: "",
    cin: "",
    vehiclePlate: "",
    phone: "",
    role: "Technicien Maintenance",
    city: "Fès",
    isDefault: false
  });

  // Technician search filter
  const [techSearchTerm, setTechSearchTerm] = useState("");
  const [showCopyFeedback, setShowCopyFeedback] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Ref for the printable/exportable preview
  const documentPreviewRef = useRef<HTMLDivElement>(null);

  // Save technicians to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(TECHNICIANS_STORAGE_KEY, JSON.stringify(technicians));
    } catch (e) {
      console.error("Failed to save technicians:", e);
    }
  }, [technicians]);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(FAX_HISTORY_STORAGE_KEY, JSON.stringify(faxHistory));
    } catch (e) {
      console.error("Failed to save fax history:", e);
    }
  }, [faxHistory]);

  // Filtered technicians for the manager list
  const filteredTechnicians = useMemo(() => {
    const term = techSearchTerm.toLowerCase().trim();
    if (!term) return technicians;
    return technicians.filter(
      (t) =>
        t.fullName.toLowerCase().includes(term) ||
        t.cin.toLowerCase().includes(term) ||
        t.vehiclePlate.toLowerCase().includes(term) ||
        (t.city && t.city.toLowerCase().includes(term)) ||
        (t.role && t.role.toLowerCase().includes(term))
    );
  }, [technicians, techSearchTerm]);

  // Open modal to add new technician
  const handleOpenAddTech = () => {
    setEditingTech(null);
    setTechFormData({
      fullName: "",
      cin: "",
      vehiclePlate: "",
      phone: "",
      role: "Technicien Maintenance Ascenseurs",
      city: "Fès",
      isDefault: false
    });
    setIsTechModalOpen(true);
  };

  // Open modal to edit technician
  const handleOpenEditTech = (tech: FaxTechnician) => {
    setEditingTech(tech);
    setTechFormData({
      fullName: tech.fullName,
      cin: tech.cin,
      vehiclePlate: tech.vehiclePlate,
      phone: tech.phone || "",
      role: tech.role || "Technicien Maintenance",
      city: tech.city || "Fès",
      isDefault: tech.isDefault || false
    });
    setIsTechModalOpen(true);
  };

  // Save technician from modal
  const handleSaveTech = (e: React.FormEvent) => {
    e.preventDefault();
    if (!techFormData.fullName.trim() || !techFormData.cin.trim() || !techFormData.vehiclePlate.trim()) {
      alert("Veuillez remplir au moins le Nom/Prénom, le N° CIN et le N° de Véhicule.");
      return;
    }

    if (editingTech) {
      // Update existing
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === editingTech.id
            ? {
                ...t,
                fullName: techFormData.fullName.trim().toUpperCase(),
                cin: techFormData.cin.trim().toUpperCase(),
                vehiclePlate: techFormData.vehiclePlate.trim().toUpperCase(),
                phone: techFormData.phone?.trim() || "",
                role: techFormData.role?.trim() || "",
                city: techFormData.city?.trim() || "",
                isDefault: techFormData.isDefault
              }
            : t
        )
      );

      // Also update within currently active fax if included
      setFaxData((prev) => ({
        ...prev,
        technicians: prev.technicians.map((t) =>
          t.id === editingTech.id
            ? {
                ...t,
                fullName: techFormData.fullName.trim().toUpperCase(),
                cin: techFormData.cin.trim().toUpperCase(),
                vehiclePlate: techFormData.vehiclePlate.trim().toUpperCase(),
                phone: techFormData.phone?.trim() || "",
                role: techFormData.role?.trim() || "",
                city: techFormData.city?.trim() || ""
              }
            : t
        )
      }));
    } else {
      // Add new
      const newTech: FaxTechnician = {
        id: "tech-" + Date.now(),
        fullName: techFormData.fullName.trim().toUpperCase(),
        cin: techFormData.cin.trim().toUpperCase(),
        vehiclePlate: techFormData.vehiclePlate.trim().toUpperCase(),
        phone: techFormData.phone?.trim() || "",
        role: techFormData.role?.trim() || "",
        city: techFormData.city?.trim() || "",
        isDefault: techFormData.isDefault
      };
      setTechnicians((prev) => [...prev, newTech]);
    }

    setIsTechModalOpen(false);
  };

  // Delete technician
  const handleDeleteTech = (techId: string) => {
    if (window.confirm("Êtes-vous sûr de vouloir supprimer ce technicien de la base ?")) {
      setTechnicians((prev) => prev.filter((t) => t.id !== techId));
      setFaxData((prev) => ({
        ...prev,
        technicians: prev.technicians.filter((t) => t.id !== techId)
      }));
    }
  };

  // Reset technicians to default
  const handleResetTechnicians = () => {
    if (window.confirm("Rétablir les 7 techniciens Schindler par défaut ?")) {
      setTechnicians(INITIAL_TECHNICIANS);
    }
  };

  // Toggle technician in current FAX
  const toggleTechInFax = (tech: FaxTechnician) => {
    setFaxData((prev) => {
      const exists = prev.technicians.some((t) => t.id === tech.id);
      if (exists) {
        return {
          ...prev,
          technicians: prev.technicians.filter((t) => t.id !== tech.id)
        };
      } else {
        return {
          ...prev,
          technicians: [...prev.technicians, tech]
        };
      }
    });
  };

  // Apply Protocol Preset
  const handleApplyPreset = (preset: (typeof PROTOCOL_PRESETS)[0]) => {
    const selected = technicians.filter((t) =>
      preset.defaultTechNames.some((n) => t.fullName.includes(n))
    );

    setFaxData((prev) => ({
      ...prev,
      recipientTitle: preset.recipientTitle,
      recipientLocation: preset.recipientLocation,
      subject: preset.subject,
      salutation: preset.salutation,
      department: preset.department,
      technicians: selected.length > 0 ? selected : prev.technicians
    }));
  };

  // Save current FAX to history
  const handleSaveToHistory = () => {
    const newEntry: FaxInterventionData = {
      ...faxData,
      id: "fax-" + Date.now(),
      createdAt: new Date().toISOString(),
      status: "Généré"
    };
    setFaxHistory((prev) => [newEntry, ...prev.slice(0, 49)]);
    alert("FAX d'intervention enregistré dans l'historique !");
  };

  // Print direct
  const handlePrint = () => {
    window.print();
  };

  // Export to high-resolution vector PDF via jsPDF
  const handleExportPDF = () => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      const pageWidth = 210;
      const leftMargin = 22;
      const rightMargin = 22;
      const contentWidth = pageWidth - leftMargin - rightMargin; // 166mm
      const rightX = pageWidth - rightMargin; // 188mm

      // Set black text color
      doc.setTextColor(15, 23, 42);

      // 1. Header: Department on left, Date on right
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.text(faxData.department || "Direction Commerciale des I.E.", leftMargin, 26);
      doc.text(faxData.date || "20/04/2026", rightX, 26, { align: "right" });

      // 2. Title: Centered & Bold with underline
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      const titleText = (faxData.docTitle || "FAX INTERVENTION").toUpperCase();
      const titleY = 46;
      doc.text(titleText, pageWidth / 2, titleY, { align: "center" });
      const titleWidth = doc.getTextWidth(titleText);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.4);
      doc.line((pageWidth - titleWidth) / 2, titleY + 1.8, (pageWidth + titleWidth) / 2, titleY + 1.8);

      // 3. Recipient:
      let currentY = 64;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      if (faxData.recipientTitle) {
        const recipientTitleLines = doc.splitTextToSize(faxData.recipientTitle, contentWidth);
        doc.text(recipientTitleLines, leftMargin, currentY);
        currentY += recipientTitleLines.length * 5.5;
      }
      if (faxData.recipientLocation) {
        doc.setFont("helvetica", "bold");
        doc.text(faxData.recipientLocation.toUpperCase(), leftMargin, currentY);
        currentY += 10;
      } else {
        currentY += 6;
      }

      // 4. Subject:
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      const subjectText = faxData.subject || "Objet : Intervention à effectuer au Palais ARFOUD";
      const subjectLines = doc.splitTextToSize(subjectText, contentWidth);
      doc.text(subjectLines, leftMargin, currentY);
      currentY += subjectLines.length * 6 + 4;

      // 5. Salutation:
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.text(faxData.salutation || "Monsieur,", leftMargin, currentY);
      currentY += 9;

      // 6. Intro text:
      const introText =
        faxData.introText ||
        "J’ai le plaisir de vous communiquer la liste des personnes susceptibles d’intervenir pour l’entretien des appareils,";
      const introLines = doc.splitTextToSize(introText, contentWidth);
      doc.text(introLines, leftMargin, currentY);
      currentY += introLines.length * 5.5 + 8;

      // 7. Technicians Table:
      const col1Width = 84; // NOM et PRENOM
      const col2Width = 41; // CIN
      const col3Width = 41; // N° VEHICULE
      const tableX = leftMargin;
      const col1X = tableX;
      const col2X = col1X + col1Width;
      const col3X = col2X + col2Width;

      const rowHeight = 8;
      const headerHeight = 8.5;

      // Table header background
      doc.setFillColor(242, 244, 246);
      doc.setDrawColor(30, 41, 59);
      doc.setLineWidth(0.35);
      doc.rect(tableX, currentY, contentWidth, headerHeight, "FD");

      // Table header text
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text("NOM et PRENOM", col1X + 3, currentY + 5.7);
      doc.text("CIN", col2X + 3, currentY + 5.7);
      doc.text("N° VEHICULE", col3X + 3, currentY + 5.7);

      // Column vertical borders in header
      doc.line(col2X, currentY, col2X, currentY + headerHeight);
      doc.line(col3X, currentY, col3X, currentY + headerHeight);

      currentY += headerHeight;

      // Data rows
      const techs = faxData.technicians.length > 0 ? faxData.technicians : [];
      if (techs.length === 0) {
        doc.rect(tableX, currentY, contentWidth, rowHeight, "S");
        doc.setFont("helvetica", "italic");
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text("Aucun intervenant spécifié", tableX + contentWidth / 2, currentY + 5.2, {
          align: "center"
        });
        currentY += rowHeight;
      } else {
        techs.forEach((t) => {
          doc.setFillColor(255, 255, 255);
          doc.rect(tableX, currentY, contentWidth, rowHeight, "FD");

          // Column vertical lines
          doc.line(col2X, currentY, col2X, currentY + rowHeight);
          doc.line(col3X, currentY, col3X, currentY + rowHeight);

          // Data Text
          doc.setFont("helvetica", "bold");
          doc.setFontSize(9);
          doc.setTextColor(15, 23, 42);
          doc.text(t.fullName.toUpperCase(), col1X + 3, currentY + 5.3);
          doc.text(t.cin.toUpperCase(), col2X + 3, currentY + 5.3);
          doc.text(t.vehiclePlate.toUpperCase(), col3X + 3, currentY + 5.3);

          currentY += rowHeight;
        });
      }

      currentY += 10;

      // 8. Closing Texts:
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      if (faxData.closingText1) {
        const c1Lines = doc.splitTextToSize(faxData.closingText1, contentWidth);
        doc.text(c1Lines, leftMargin, currentY);
        currentY += c1Lines.length * 5.5 + 4;
      }
      if (faxData.closingText2) {
        const c2Lines = doc.splitTextToSize(faxData.closingText2, contentWidth);
        doc.text(c2Lines, leftMargin, currentY);
        currentY += c2Lines.length * 5.5 + 6;
      }

      // 9. Signature Footer (Pure Schindler Maroc without watermark or stamp)
      const footerY = Math.max(currentY + 14, 240);

      doc.setTextColor(15, 23, 42);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(faxData.senderName || "Schindler Maroc", rightX, footerY, { align: "right" });

      // Save PDF
      const cleanLocation = (faxData.recipientLocation || "SITE").replace(/[^a-zA-Z0-9]/g, "_");
      const cleanDate = (faxData.date || "2026").replace(/[^a-zA-Z0-9]/g, "-");
      const cleanFileName = `FAX_INTERVENTION_${cleanLocation}_${cleanDate}.pdf`;
      doc.save(cleanFileName);

      // Auto-save to history
      handleSaveToHistory();
    } catch (err) {
      console.error("PDF Export error:", err);
      alert("Erreur lors de la génération du PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Copy full FAX text to clipboard
  const handleCopyText = () => {
    const techTableText = faxData.technicians
      .map((t) => `${t.fullName.padEnd(28)} | ${t.cin.padEnd(12)} | ${t.vehiclePlate}`)
      .join("\n");

    const fullText = `${faxData.department.padEnd(45)} ${faxData.date}

${faxData.docTitle}

${faxData.recipientTitle}
${faxData.recipientLocation}

${faxData.subject}

${faxData.salutation}

${faxData.introText}

NOM et PRENOM               | CIN          | N° VEHICULE
------------------------------------------------------------
${techTableText}

${faxData.closingText1}
${faxData.closingText2}

${faxData.senderName}`;

    navigator.clipboard.writeText(fullText);
    setShowCopyFeedback(true);
    setTimeout(() => setShowCopyFeedback(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950/40 border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-bold text-white tracking-tight">
                  Générateur de FAX d'Intervention
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/20 border border-purple-500/30 text-purple-300">
                  Modèle Officiel Schindler
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Générez en un clic les avis d'accès sécurisé et autorisations d'intervention protocolaires
                avec liste nominative des techniciens, N° CIN et immatriculation des véhicules.
              </p>
            </div>
          </div>

          {/* Tab Navigation Buttons */}
          <div className="flex items-center p-1 rounded-xl bg-slate-800/80 border border-slate-700/60 self-start lg:self-center">
            <button
              onClick={() => setActiveTab("editor")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "editor"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Éditeur de FAX</span>
            </button>
            <button
              onClick={() => setActiveTab("technicians")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "technicians"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Base Techniciens ({technicians.length})</span>
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === "history"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-slate-300 hover:text-white hover:bg-slate-700/50"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Historique ({faxHistory.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1 : ÉDITEUR DE FAX & APERÇU LIVE                                      */}
      {/* ========================================================================= */}
      {activeTab === "editor" && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Controls & Form (5 Cols on XL) */}
          <div className="xl:col-span-5 space-y-5">
            {/* Quick Presets for Sites */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  Sites Protocolaires & Modèles Rapides :
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PROTOCOL_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-purple-900/40 border border-slate-700 hover:border-purple-600 text-[11px] text-slate-300 hover:text-white font-medium transition-colors cursor-pointer"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Details Form */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-4 text-xs">
              <h3 className="font-bold text-white text-sm pb-2 border-b border-slate-800 flex items-center justify-between">
                <span>1. En-tête & Destinataire</span>
                <span className="text-[11px] font-normal text-slate-400 font-mono">
                  {faxData.docNumber || "N° AUTO"}
                </span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Direction / Service Émetteur
                  </label>
                  <input
                    type="text"
                    value={faxData.department}
                    onChange={(e) => setFaxData({ ...faxData, department: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Date du FAX (JJ/MM/AAAA)
                  </label>
                  <input
                    type="text"
                    value={faxData.date}
                    onChange={(e) => setFaxData({ ...faxData, date: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Titre Principal du Document
                </label>
                <input
                  type="text"
                  value={faxData.docTitle}
                  onChange={(e) => setFaxData({ ...faxData, docTitle: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold tracking-wide focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-slate-400 font-medium">
                  Destinataire ("À l'Attention de...")
                </label>
                <input
                  type="text"
                  value={faxData.recipientTitle}
                  onChange={(e) => setFaxData({ ...faxData, recipientTitle: e.target.value })}
                  placeholder="Ex: A l’Attention de Monsieur le Conservateur du Palais"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none mb-1.5"
                />
                <input
                  type="text"
                  value={faxData.recipientLocation}
                  onChange={(e) => setFaxData({ ...faxData, recipientLocation: e.target.value })}
                  placeholder="Ex: ROYAL Arfoud"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-purple-300 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Objet de l'intervention
                </label>
                <input
                  type="text"
                  value={faxData.subject}
                  onChange={(e) => setFaxData({ ...faxData, subject: e.target.value })}
                  placeholder="Objet : Intervention à effectuer au Palais ARFOUD"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-slate-400 font-medium mb-1">
                    Formule d'appel
                  </label>
                  <input
                    type="text"
                    value={faxData.salutation}
                    onChange={(e) => setFaxData({ ...faxData, salutation: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-slate-400 font-medium mb-1">
                    Signataire / Société
                  </label>
                  <input
                    type="text"
                    value={faxData.senderName}
                    onChange={(e) => setFaxData({ ...faxData, senderName: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Texte d'introduction
                </label>
                <textarea
                  rows={2}
                  value={faxData.introText}
                  onChange={(e) => setFaxData({ ...faxData, introText: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none text-xs"
                />
              </div>
            </div>

            {/* Technicians Selection Box */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-lg space-y-3.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  <h3 className="font-bold text-white text-sm">
                    2. Techniciens Intervenants ({faxData.technicians.length})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddTech}
                  className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-sm"
                >
                  <Plus className="w-3 h-3" />
                  <span>Nouveau Technicien</span>
                </button>
              </div>

              <p className="text-slate-400 text-[11px]">
                Cochez les techniciens à inclure dans le tableau du FAX d'intervention :
              </p>

              {/* Technician Quick Checkboxes */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {technicians.map((tech) => {
                  const isChecked = faxData.technicians.some((t) => t.id === tech.id);
                  return (
                    <div
                      key={tech.id}
                      onClick={() => toggleTechInFax(tech)}
                      className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                        isChecked
                          ? "bg-purple-950/40 border-purple-500/50 text-white shadow-sm"
                          : "bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                            isChecked
                              ? "bg-purple-600 border-purple-600 text-white"
                              : "border-slate-600 bg-slate-900"
                          }`}
                        >
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-xs truncate">{tech.fullName}</div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono mt-0.5">
                            <span className="text-purple-300">CIN: {tech.cin}</span>
                            <span>•</span>
                            <span className="text-amber-300">Véhicule: {tech.vehiclePlate}</span>
                          </div>
                        </div>
                      </div>

                      {tech.city && (
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                          📍 {tech.city.split("/")[0]}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {faxData.technicians.length === 0 && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-center text-xs">
                  ⚠️ Veuillez sélectionner au moins un technicien intervenant pour le document.
                </div>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPdf}
                className="flex-1 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg transition-all"
              >
                <Download className="w-4 h-4" />
                <span>{isExportingPdf ? "Génération PDF..." : "Télécharger PDF"}</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer</span>
              </button>
              <button
                type="button"
                onClick={handleCopyText}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Copier le texte"
              >
                <Copy className="w-4 h-4" />
                <span>{showCopyFeedback ? "Copié !" : "Copier"}</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Live Document Preview A4 (7 Cols on XL) */}
          <div className="xl:col-span-7 flex flex-col items-center">
            {/* Visual Preview Header Bar */}
            <div className="w-full max-w-2xl mb-2 flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5 font-medium">
                <Eye className="w-3.5 h-3.5 text-purple-400" />
                Aperçu du FAX (Format A4 Officiel)
              </span>
              <span className="text-[11px] text-slate-500">
                Conforme au modèle /public/FAX.pdf
              </span>
            </div>

            {/* A4 PAPER CONTAINER */}
            <div
              ref={documentPreviewRef}
              id="fax-document-printable"
              className="w-full max-w-2xl bg-white text-black p-8 md:p-12 rounded-lg shadow-2xl border border-slate-300 print:shadow-none print:border-none print:p-0 min-h-[780px] flex flex-col justify-between font-sans relative"
              style={{
                fontFamily: "Arial, Helvetica, sans-serif"
              }}
            >
              {/* TOP HEADER ROW: Direction on left, Date on right */}
              <div>
                <div className="flex items-start justify-between text-[13px] text-neutral-900 leading-tight">
                  <div className="font-normal text-left">
                    {faxData.department || "Direction Commerciale des I.E."}
                  </div>
                  <div className="font-normal text-right">
                    {faxData.date || "20/04/2026"}
                  </div>
                </div>

                {/* MAIN TITLE: Centered bold */}
                <div className="text-center my-10">
                  <h1 className="text-xl md:text-2xl font-bold tracking-wide text-neutral-950 uppercase inline-block pb-1 border-b-2 border-neutral-900">
                    {faxData.docTitle || "FAX INTERVENTION"}
                  </h1>
                </div>

                {/* RECIPIENT BLOCK: Left aligned with generous spacing */}
                <div className="space-y-1 my-6 text-[14px] text-neutral-950">
                  <div className="font-normal">
                    {faxData.recipientTitle || "A l’Attention de Monsieur le Conservateur du Palais"}
                  </div>
                  <div className="font-bold uppercase tracking-wide">
                    {faxData.recipientLocation || "ROYAL Arfoud"}
                  </div>
                </div>

                {/* SUBJECT: Bold */}
                <div className="my-6 text-[14px] font-bold text-neutral-950">
                  {faxData.subject || "Objet : Intervention à effectuer au Palais ARFOUD"}
                </div>

                {/* SALUTATION */}
                <div className="my-5 text-[14px] font-normal text-neutral-950">
                  {faxData.salutation || "Monsieur,"}
                </div>

                {/* INTRODUCTORY BODY TEXT */}
                <div className="my-4 text-[14px] leading-relaxed text-neutral-900">
                  {faxData.introText ||
                    "J’ai le plaisir de vous communiquer la liste des personnes susceptibles d’intervenir pour l’entretien des appareils,"}
                </div>

                {/* TECHNICIANS DATA TABLE */}
                <div className="my-6 overflow-hidden">
                  <table className="w-full border-collapse border border-neutral-900 text-[12px] md:text-[13px]">
                    <thead>
                      <tr className="bg-neutral-100 border-b border-neutral-900">
                        <th className="py-2 px-3 text-left font-bold text-neutral-950 border-r border-neutral-900">
                          NOM et PRENOM
                        </th>
                        <th className="py-2 px-3 text-left font-bold text-neutral-950 border-r border-neutral-900 w-36">
                          CIN
                        </th>
                        <th className="py-2 px-3 text-left font-bold text-neutral-950 w-36">
                          N° VEHICULE
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {faxData.technicians.length > 0 ? (
                        faxData.technicians.map((t, idx) => (
                          <tr
                            key={t.id || idx}
                            className="border-b border-neutral-800 last:border-b-0"
                          >
                            <td className="py-2 px-3 font-semibold text-neutral-950 border-r border-neutral-900 uppercase">
                              {t.fullName}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-neutral-950 border-r border-neutral-900 uppercase">
                              {t.cin}
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-neutral-950 uppercase">
                              {t.vehiclePlate}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="py-4 text-center text-neutral-400 italic"
                          >
                            Aucun technicien sélectionné
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* CLOSING REMARKS */}
                <div className="my-6 space-y-3 text-[14px] leading-relaxed text-neutral-900">
                  <p>{faxData.closingText1 || "Je reste à votre entière disposition pour tout complément d’information désiré."}</p>
                  <p>{faxData.closingText2 || "Veuillez agréer, Monsieur, l’expression de mes salutations distinguées."}</p>
                </div>
              </div>

              {/* SIGNATURE & COMPANY FOOTER */}
              <div className="mt-12 flex justify-end">
                <div className="text-right">
                  <div className="text-[15px] font-bold text-neutral-950">
                    {faxData.senderName || "Schindler Maroc"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2 : GESTIONNAIRE DE L'ÉQUIPE TECHNICIENS                               */}
      {/* ========================================================================= */}
      {activeTab === "technicians" && (
        <div className="space-y-5">
          {/* Action & Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={techSearchTerm}
                onChange={(e) => setTechSearchTerm(e.target.value)}
                placeholder="Rechercher un technicien (nom, CIN, plaque, ville)..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetTechnicians}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                title="Rétablir les données par défaut"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Réinitialiser</span>
              </button>

              <button
                type="button"
                onClick={handleOpenAddTech}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter un Technicien</span>
              </button>
            </div>
          </div>

          {/* Technicians Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTechnicians.map((tech) => (
              <div
                key={tech.id}
                className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-purple-500/50 transition-all shadow-lg flex flex-col justify-between group space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-bold text-sm">
                        {tech.fullName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-xs leading-snug">
                          {tech.fullName}
                        </h4>
                        <p className="text-[11px] text-purple-400 font-medium">
                          {tech.role || "Technicien Ascensoriste"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditTech(tech)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Modifier"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTech(tech.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors cursor-pointer"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                      <div className="text-slate-400 flex items-center gap-1 font-medium mb-0.5">
                        <IdCard className="w-3 h-3 text-purple-400" />
                        <span>N° CIN :</span>
                      </div>
                      <div className="font-mono font-bold text-white">{tech.cin}</div>
                    </div>

                    <div className="p-2 rounded-lg bg-slate-950 border border-slate-800/80">
                      <div className="text-slate-400 flex items-center gap-1 font-medium mb-0.5">
                        <Car className="w-3 h-3 text-amber-400" />
                        <span>Véhicule :</span>
                      </div>
                      <div className="font-mono font-bold text-amber-300">{tech.vehiclePlate}</div>
                    </div>
                  </div>

                  <div className="space-y-1 text-[11px] text-slate-400">
                    {tech.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-500" />
                        <span>{tech.phone}</span>
                      </div>
                    )}
                    {tech.city && (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{tech.city}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    ID : {tech.id.slice(0, 10)}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      toggleTechInFax(tech);
                      setActiveTab("editor");
                    }}
                    className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                  >
                    <span>Insérer dans FAX</span>
                    <Send className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3 : HISTORIQUE DES FAX GÉNÉRÉS                                        */}
      {/* ========================================================================= */}
      {activeTab === "history" && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-white text-sm">Registre des FAX & Avis d'Intervention</h3>
              <p className="text-xs text-slate-400">Historique des documents générés et transmis pour suivi protocolaire.</p>
            </div>
            {faxHistory.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm("Effacer tout l'historique des FAX ?")) {
                    setFaxHistory([]);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-red-950/40 border border-red-800 text-red-300 hover:text-red-200 text-xs font-semibold cursor-pointer"
              >
                Vider l'historique
              </button>
            )}
          </div>

          {faxHistory.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-slate-800 space-y-3">
              <Clock className="w-10 h-10 text-slate-600 mx-auto" />
              <div className="text-sm font-semibold text-slate-300">Aucun FAX dans l'historique</div>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Chaque fois que vous téléchargez ou exportez un FAX depuis l'éditeur, il sera automatiquement consigné ici.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800 rounded-2xl bg-slate-900/90 border border-slate-800 overflow-hidden shadow-lg">
              {faxHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-4 hover:bg-slate-800/40 transition-colors flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-xs">{item.recipientLocation}</span>
                      <span className="text-[11px] font-mono text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800">
                        {item.date}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 font-medium">{item.subject}</div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2">
                      <span>Intervenants : {item.technicians.map((t) => t.fullName).join(", ")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-start md:self-center">
                    <button
                      type="button"
                      onClick={() => {
                        setFaxData(item);
                        setActiveTab("editor");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30 text-purple-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      Recharger dans l'Éditeur
                    </button>
                    <button
                      type="button"
                      onClick={() => setFaxHistory((prev) => prev.filter((f) => f.id !== item.id))}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                      title="Supprimer de l'historique"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL : AJOUT / MODIFICATION TECHNICIEN                                    */}
      {/* ========================================================================= */}
      {isTechModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Users className="w-4 h-4 text-purple-400" />
                <span>{editingTech ? "Modifier le Technicien" : "Nouveau Technicien Schindler"}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsTechModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTech} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">
                  Nom et Prénom * (Ex: ABDELJALIL AIT BAHMED)
                </label>
                <input
                  type="text"
                  required
                  value={techFormData.fullName}
                  onChange={(e) => setTechFormData({ ...techFormData, fullName: e.target.value })}
                  placeholder="NOM PRENOM"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    N° CIN * (Ex: PB157995)
                  </label>
                  <input
                    type="text"
                    required
                    value={techFormData.cin}
                    onChange={(e) => setTechFormData({ ...techFormData, cin: e.target.value })}
                    placeholder="CIN"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    N° Véhicule * (Ex: 72441B72)
                  </label>
                  <input
                    type="text"
                    required
                    value={techFormData.vehiclePlate}
                    onChange={(e) => setTechFormData({ ...techFormData, vehiclePlate: e.target.value })}
                    placeholder="Immatriculation"
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-amber-300 font-mono font-bold uppercase focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Téléphone / Mobile
                  </label>
                  <input
                    type="text"
                    value={techFormData.phone}
                    onChange={(e) => setTechFormData({ ...techFormData, phone: e.target.value })}
                    placeholder="+212 6 ..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">
                    Ville / Secteur
                  </label>
                  <input
                    type="text"
                    value={techFormData.city}
                    onChange={(e) => setTechFormData({ ...techFormData, city: e.target.value })}
                    placeholder="Ex: Errachidia, Fès, Meknès..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Fonction / Spécialité
                </label>
                <input
                  type="text"
                  value={techFormData.role}
                  onChange={(e) => setTechFormData({ ...techFormData, role: e.target.value })}
                  placeholder="Ex: Technicien Supérieur Maintenance, Électromécanicien..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTechModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-800 text-slate-300 hover:bg-slate-800 font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold cursor-pointer transition-all shadow-md"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
