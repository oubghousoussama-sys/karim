import React, { useState, useEffect, useMemo, useRef } from "react";
import jsPDF from "jspdf";
import { toPng } from "html-to-image";
import { PFEquipment, NonConformity } from "../../types";
import { INITIAL_PF_EQUIPMENTS, formatExcelDate } from "../../data/mockPFData";
import { downloadFilledNcDocx } from "../../utils/docxFiller";
import {
  FileText,
  Printer,
  Download,
  CheckCircle2,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  Sparkles,
  RefreshCw,
  Building,
  Wrench,
  Shield,
  Eye,
  Check,
  Edit3,
  Calendar,
  User,
  ArrowRight,
  Loader2
} from "lucide-react";

export interface NcClosureRow {
  id: string;
  refNc: string;
  description: string;
  inspectionDate: string;
  inspectionType: "5Y" | "1Y" | "1Y/5Y" | "Maintenance";
  closureDate: string;
  technician: string;
  signatureText?: string;
}

export interface NcClosureFormData {
  docId: string;
  equipmentNumber: string;
  clientName: string;
  coveredBy: "Schindler" | "Client";
  rows: NcClosureRow[];
  branchManager: string;
  supervisor: string;
  supervisorDate: string;
  showSignatureEmulation: boolean;
}

// 100% Reliable Inline Vector Schindler Logo (crisp on screen and in print)
const SchindlerLogo: React.FC<{ className?: string }> = ({ className = "h-14 w-auto" }) => (
  <svg
    viewBox="0 0 160 110"
    className={className}
    style={{ overflow: "visible" }}
  >
    <defs>
      <radialGradient id="schindlerDiscGrad" cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#E2E3E6" />
        <stop offset="65%" stopColor="#A8AAB0" />
        <stop offset="100%" stopColor="#6C6E74" />
      </radialGradient>
      <linearGradient id="schindlerConeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#4A4C52" />
        <stop offset="50%" stopColor="#8A8C92" />
        <stop offset="100%" stopColor="#2E3035" />
      </linearGradient>
    </defs>
    {/* Metallic Disc */}
    <g transform="translate(80, 42)">
      <circle cx="0" cy="0" r="38" fill="url(#schindlerDiscGrad)" stroke="#6C6E74" strokeWidth="0.8" />
      {/* Inner hole */}
      <circle cx="0" cy="-4" r="18" fill="#FFFFFF" stroke="#8A8C92" strokeWidth="0.8" />
      {/* Wedge / Cone */}
      <polygon points="0,-7 20,30 -20,30" fill="url(#schindlerConeGrad)" stroke="#3E4045" strokeWidth="0.5" />
      <line x1="0" y1="-7" x2="0" y2="30" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="0.8" />
    </g>
    {/* Red Schindler Wordmark */}
    <text
      x="80"
      y="102"
      textAnchor="middle"
      fill="#E2001A"
      fontSize="25"
      fontWeight="900"
      fontFamily="Arial, Helvetica, sans-serif"
      letterSpacing="-0.8px"
    >
      Schindler
    </text>
  </svg>
);

export const NcClosureDocument: React.FC<{
  initialNc?: NonConformity | null;
  initialEquipment?: PFEquipment | null;
}> = ({ initialNc, initialEquipment }) => {
  // Load equipments from localStorage or fallback
  const [equipments, setEquipments] = useState<PFEquipment[]>(() => {
    const saved = localStorage.getItem("toolbox_pf_equipments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_PF_EQUIPMENTS;
  });

  // Extract all NCs across all equipments for quick search and selection
  const allNcsWithEquip = useMemo(() => {
    const list: {
      nc: NonConformity;
      equipment: PFEquipment;
    }[] = [];

    equipments.forEach((eq) => {
      (eq.nonConformities || []).forEach((nc) => {
        list.push({ nc, equipment: eq });
      });
    });

    return list;
  }, [equipments]);

  // Search in NC database
  const [ncSearchTerm, setNcSearchTerm] = useState("");
  const [selectedNcFilter, setSelectedNcFilter] = useState<"all" | "open" | "closed">("all");
  const [showNcSelectorModal, setShowNcSelectorModal] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  // Today's date formatted DD/MM/YYYY
  const getTodayFormatted = () => {
    const d = new Date();
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
  };

  // Form State
  const [formData, setFormData] = useState<NcClosureFormData>(() => {
    // If initial equipment and NC provided
    if (initialNc && initialEquipment) {
      const tech = (initialEquipment.assignedTechnician || initialNc.assignedTechnician || "HICHAM BOUTKHILI").toUpperCase();
      return {
        docId: initialNc.code.replace(/[^0-9]/g, "") || "11127",
        equipmentNumber: initialEquipment.pfNumber || "9911614",
        clientName: (initialEquipment.customer || initialEquipment.name || "BANQUE POPULAIRE REM").toUpperCase(),
        coveredBy: initialNc.isCoveredByContract !== false ? "Schindler" : "Client",
        rows: [
          {
            id: initialNc.id || "row-1",
            refNc: initialNc.code.replace(/[^0-9]/g, "") || initialNc.code || "11127",
            description: initialNc.description || "Il y a des gorges électrique qui protégeaient par une pâte de béton qui passe dessous poulie tenseur en cuvette, il faut gratter pour assurer le jeu correct entre le système et le sole .",
            inspectionDate: formatExcelDate(initialNc.detectedDate) || "5/19/2026",
            inspectionType: "5Y",
            closureDate: initialNc.resolvedDate ? formatExcelDate(initialNc.resolvedDate) : "",
            technician: tech,
            signatureText: ""
          }
        ],
        branchManager: "Chef d'agence :",
        supervisor: "Superviseur :",
        supervisorDate: "",
        showSignatureEmulation: false
      };
    }

    // Default matching exact PDF sample from the user (ID 11127, N°Appareil 9911614, BANQUE POPULAIRE REM, Hicham Boutkhili)
    return {
      docId: "11127",
      equipmentNumber: "9911614",
      clientName: "BANQUE POPULAIRE REM",
      coveredBy: "Schindler",
      rows: [
        {
          id: "row-1",
          refNc: "11127",
          description: "Il y a des gorges électrique qui protégeaient par une pâte de béton qui passe dessous poulie tenseur en cuvette, il faut gratter pour assurer le jeu correct entre le système et le sole .",
          inspectionDate: "5/19/2026",
          inspectionType: "5Y",
          closureDate: "",
          technician: "HICHAM BOUTKHILI",
          signatureText: ""
        }
      ],
      branchManager: "Chef d'agence :",
      supervisor: "Superviseur :",
      supervisorDate: "",
      showSignatureEmulation: false
    };
  });

  // Dynamic Lookup: Find assigned technician from the PF Equipment database based on equipment number
  const getEquipmentTechnician = (eqNum: string, fallbackTech?: string): string => {
    if (!eqNum) return (fallbackTech || "HICHAM BOUTKHILI").toUpperCase();
    const cleanNum = eqNum.trim().toLowerCase();
    const found = equipments.find(
      (e) =>
        e.pfNumber?.trim().toLowerCase() === cleanNum ||
        e.id?.trim().toLowerCase() === cleanNum ||
        (e.pfNumber && e.pfNumber.toLowerCase().includes(cleanNum)) ||
        (cleanNum.length >= 4 && e.pfNumber && cleanNum.includes(e.pfNumber.toLowerCase()))
    );
    if (found && found.assignedTechnician) {
      return found.assignedTechnician.toUpperCase();
    }
    return (fallbackTech || "HICHAM BOUTKHILI").toUpperCase();
  };

  // Filtered NCs for the modal / selector
  const filteredNcs = useMemo(() => {
    return allNcsWithEquip.filter(({ nc, equipment }) => {
      const q = ncSearchTerm.toLowerCase();
      const matchText =
        !ncSearchTerm ||
        nc.code.toLowerCase().includes(q) ||
        nc.description.toLowerCase().includes(q) ||
        (equipment.pfNumber && equipment.pfNumber.toLowerCase().includes(q)) ||
        (equipment.customer && equipment.customer.toLowerCase().includes(q)) ||
        (equipment.name && equipment.name.toLowerCase().includes(q)) ||
        (nc.assignedTechnician && nc.assignedTechnician.toLowerCase().includes(q));

      if (!matchText) return false;

      if (selectedNcFilter === "open" && nc.status === "Levée / Clôturée") return false;
      if (selectedNcFilter === "closed" && nc.status !== "Levée / Clôturée") return false;

      return true;
    });
  }, [allNcsWithEquip, ncSearchTerm, selectedNcFilter]);

  // Load a single NC from database into form
  const handleSelectNc = (nc: NonConformity, equipment: PFEquipment) => {
    const rawCode = nc.code || "";
    const cleanId = rawCode.replace(/[^0-9]/g, "") || String(Math.floor(10000 + Math.random() * 90000));
    const tech = (equipment.assignedTechnician || nc.assignedTechnician || "HICHAM BOUTKHILI").toUpperCase();

    setFormData({
      docId: cleanId,
      equipmentNumber: equipment.pfNumber || "",
      clientName: (equipment.customer || equipment.name || "Client Schindler").toUpperCase(),
      coveredBy: nc.isCoveredByContract !== false ? "Schindler" : "Client",
      rows: [
        {
          id: nc.id || `row-${Date.now()}`,
          refNc: cleanId,
          description: nc.description || "",
          inspectionDate: formatExcelDate(nc.detectedDate) || getTodayFormatted(),
          inspectionType: nc.severity === "Critique / Bloquante" ? "5Y" : "1Y",
          closureDate: nc.resolvedDate ? formatExcelDate(nc.resolvedDate) : "",
          technician: tech,
          signatureText: tech.split(" ")[0]
        }
      ],
      branchManager: formData.branchManager || "Chef d'agence :",
      supervisor: formData.supervisor || "Superviseur :",
      supervisorDate: getTodayFormatted(),
      showSignatureEmulation: formData.showSignatureEmulation
    });

    setShowNcSelectorModal(false);
    setStatusMessage(`✅ Données de la NC [${nc.code}] et de l'appareil [${equipment.pfNumber}] importées avec succès !`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Load all NCs of an equipment into the form (multiline bon)
  const handleSelectEquipmentNcs = (equipment: PFEquipment) => {
    const ncs = equipment.nonConformities || [];
    if (ncs.length === 0) {
      alert("Cet appareil n'a pas de NC enregistrée dans la Tour de Contrôle.");
      return;
    }

    const firstNc = ncs[0];
    const cleanId = firstNc.code.replace(/[^0-9]/g, "") || String(Math.floor(10000 + Math.random() * 90000));
    const tech = (equipment.assignedTechnician || firstNc.assignedTechnician || "HICHAM BOUTKHILI").toUpperCase();

    const rows: NcClosureRow[] = ncs.map((nc, idx) => ({
      id: nc.id || `row-${idx}-${Date.now()}`,
      refNc: nc.code.replace(/[^0-9]/g, "") || nc.code,
      description: nc.description,
      inspectionDate: formatExcelDate(nc.detectedDate) || getTodayFormatted(),
      inspectionType: nc.severity === "Critique / Bloquante" ? "5Y" : "1Y",
      closureDate: nc.resolvedDate ? formatExcelDate(nc.resolvedDate) : "",
      technician: tech,
      signatureText: tech.split(" ")[0]
    }));

    setFormData({
      docId: cleanId,
      equipmentNumber: equipment.pfNumber || "",
      clientName: (equipment.customer || equipment.name || "Client Schindler").toUpperCase(),
      coveredBy: firstNc.isCoveredByContract !== false ? "Schindler" : "Client",
      rows,
      branchManager: formData.branchManager || "Chef d'agence :",
      supervisor: formData.supervisor || "Superviseur :",
      supervisorDate: getTodayFormatted(),
      showSignatureEmulation: formData.showSignatureEmulation
    });

    setShowNcSelectorModal(false);
    setStatusMessage(`✅ ${ncs.length} NC(s) de l'appareil [${equipment.pfNumber}] insérées dans le bon d'intervention !`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  // Add row
  const handleAddRow = () => {
    const newRow: NcClosureRow = {
      id: `row-${Date.now()}`,
      refNc: String(Math.floor(10000 + Math.random() * 90000)),
      description: "Travaux de reprise et mise en conformité",
      inspectionDate: getTodayFormatted(),
      inspectionType: "5Y",
      closureDate: "",
      technician: formData.rows[0]?.technician || "MOHAMMED GHAFIR",
      signatureText: ""
    };
    setFormData((prev) => ({ ...prev, rows: [...prev.rows, newRow] }));
  };

  // Remove row
  const handleRemoveRow = (id: string) => {
    if (formData.rows.length <= 1) return;
    setFormData((prev) => ({ ...prev, rows: prev.rows.filter((r) => r.id !== id) }));
  };

  // Update row field
  const handleRowChange = (id: string, field: keyof NcClosureRow, val: any) => {
    setFormData((prev) => ({
      ...prev,
      rows: prev.rows.map((r) => (r.id === id ? { ...r, [field]: val } : r))
    }));
  };

  // Mark NC as closed in localStorage / NC control tower
  const handleMarkAsClosedInTower = () => {
    let closedCount = 0;
    const refCodesToClose = formData.rows.map((r) => r.refNc.trim().toLowerCase());

    const updated = equipments.map((eq) => {
      if (eq.pfNumber.trim().toLowerCase() === formData.equipmentNumber.trim().toLowerCase()) {
        const newNcs = (eq.nonConformities || []).map((nc) => {
          const codeClean = nc.code.replace(/[^0-9]/g, "").toLowerCase();
          const codeFull = nc.code.trim().toLowerCase();
          if (refCodesToClose.includes(codeClean) || refCodesToClose.includes(codeFull)) {
            closedCount++;
            return {
              ...nc,
              status: "Levée / Clôturée" as const,
              resolvedDate: new Date().toISOString().slice(0, 10),
              actionsDone: `Clôturé via Bon d'intervention N° ${formData.docId}`
            };
          }
          return nc;
        });
        return { ...eq, nonConformities: newNcs };
      }
      return eq;
    });

    setEquipments(updated);
    localStorage.setItem("toolbox_pf_equipments", JSON.stringify(updated));
    setStatusMessage(`🎉 ${closedCount} NC(s) marquée(s) comme "Levée / Clôturée" dans la Tour de Contrôle !`);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Download official Word document (.docx) by filling the exact NC_ID.docx template
  const handleDownloadDocx = async () => {
    setIsExportingDocx(true);
    setStatusMessage("📄 Remplissage automatique du modèle Word officiel (NC_ID.docx)...");

    try {
      const primaryRow = formData.rows[0] || {
        refNc: formData.docId || "11127",
        description: "",
        inspectionDate: "5/19/2026",
        inspectionType: "5Y",
        closureDate: "",
        technician: "HICHAM BOUTKHILI"
      };

      const techName = getEquipmentTechnician(formData.equipmentNumber, primaryRow.technician);

      const formattedRows = formData.rows.map((r) => ({
        refNc: r.refNc || formData.docId || "11127",
        description: r.description || "",
        inspectionDate: r.inspectionDate || "5/19/2026",
        inspectionType: r.inspectionType || "5Y",
        closureDate: r.closureDate || "",
        technician: getEquipmentTechnician(formData.equipmentNumber, r.technician)
      }));

      await downloadFilledNcDocx({
        id: formData.docId || primaryRow.refNc || "11127",
        equipmentNumber: formData.equipmentNumber || "9911614",
        clientName: formData.clientName || "BANQUE POPULAIRE REM",
        description: primaryRow.description || "",
        inspectionType: primaryRow.inspectionType || "5Y",
        technician: techName,
        coveredBy: formData.coveredBy,
        rows: formattedRows
      });

      setStatusMessage("✅ Document Word officiel (.docx) généré et téléchargé avec succès !");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      console.error("Erreur lors de la génération Word (.docx):", error);
      setStatusMessage("❌ Erreur lors de la génération du document Word (.docx).");
    } finally {
      setIsExportingDocx(false);
    }
  };

  // Download direct high-definition PDF matching the exact Word model
  const handleDownloadPdf = async () => {
    const element = document.getElementById("schindler-nc-document-print");
    if (!element) {
      setStatusMessage("⚠️ Impossible de trouver le document à exporter.");
      return;
    }

    setIsExportingPdf(true);
    setStatusMessage("📄 Génération du fichier PDF haute définition (Format A4 exact)...");

    try {
      // Capture element with html-to-image (supports OKLCH and modern CSS natively)
      const dataUrl = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: "#ffffff",
        cacheBust: true,
        fontEmbedCSS: "",
      });

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
        compress: true,
      });

      // Fill exactly A4 (210mm x 297mm) without stretching
      pdf.addImage(dataUrl, "PNG", 0, 0, 210, 297, undefined, "FAST");

      const fileName = "Bon d'ordre d'intervention clôture des NCs(Maintenance & CPSI).pdf";
      pdf.save(fileName);

      setStatusMessage("✅ Document PDF téléchargé avec succès !");
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (error) {
      console.error("Erreur lors de la génération PDF:", error);
      setStatusMessage("❌ Erreur lors de la génération du PDF. Vous pouvez aussi utiliser le bouton Imprimer.");
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Trigger print with isolated iframe to guarantee printing even inside sandboxed preview iframes
  const handlePrint = () => {
    setIsPrinting(true);
    try {
      const printElement = document.getElementById("schindler-nc-document-print");
      if (!printElement) {
        window.print();
        setIsPrinting(false);
        return;
      }

      const originalTitle = document.title;
      document.title = "Bon d'ordre d'intervention clôture des NCs(Maintenance & CPSI)";

      // Remove existing print iframe if any
      const existingIframe = document.getElementById("schindler-isolated-print-frame");
      if (existingIframe) {
        existingIframe.remove();
      }

      // Create isolated print frame
      const iframe = document.createElement("iframe");
      iframe.id = "schindler-isolated-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      iframe.style.visibility = "hidden";
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document;
      if (!frameDoc) {
        window.print();
        document.title = originalTitle;
        setIsPrinting(false);
        return;
      }

      frameDoc.open();
      frameDoc.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Bon d'ordre d'intervention clôture des NCs(Maintenance & CPSI)</title>
            <style>
              @page {
                size: A4 portrait;
                margin: 10mm 12mm;
              }
              * {
                box-sizing: border-box;
                margin: 0;
                padding: 0;
              }
              body {
                font-family: Arial, Helvetica, sans-serif;
                color: #000000;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              table {
                width: 100%;
                border-collapse: collapse;
              }
            </style>
          </head>
          <body>
            <div style="width: 100%; max-width: 820px; margin: 0 auto; background: #fff; color: #000;">
              ${printElement.innerHTML}
            </div>
          </body>
        </html>
      `);
      frameDoc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (err) {
          console.warn("Iframe print error, falling back to window.print():", err);
          window.print();
        } finally {
          setTimeout(() => {
            document.title = originalTitle;
            iframe.remove();
            setIsPrinting(false);
          }, 1500);
        }
      }, 400);
    } catch (err) {
      console.error("Print error:", err);
      window.print();
      setIsPrinting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Data Sync from NC Tower */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border border-purple-500/30 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600/20 border border-purple-500/40 text-purple-300">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-100 text-sm flex items-center gap-2">
              <span>Générateur de Bon d'Ordre d'Intervention Clôture des NCs</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-purple-900/60 text-purple-300 border border-purple-600/40">
                Format Officiel Schindler
              </span>
            </h4>
            <p className="text-xs text-slate-400">
              Modèle conforme Maintenance & CPSI avec injection directe du logo Schindler et synchronisation Tour de Contrôle.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNcSelectorModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-md shadow-purple-950 transition-all cursor-pointer"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Sélectionner depuis la Tour de Contrôle NC ({allNcsWithEquip.length} NCs)</span>
          </button>

          {/* Télécharger Word (.docx) Direct Button using NC_ID.docx template */}
          <button
            type="button"
            onClick={handleDownloadDocx}
            disabled={isExportingDocx}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-950 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExportingDocx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <FileText className="w-3.5 h-3.5" />
            )}
            <span>{isExportingDocx ? "Génération Word..." : "Télécharger Word (.docx)"}</span>
          </button>

          {/* Télécharger PDF Direct Button */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-950 transition-all cursor-pointer disabled:opacity-50"
          >
            {isExportingPdf ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>{isExportingPdf ? "Génération PDF..." : "Télécharger PDF (A4)"}</span>
          </button>

          {/* Imprimer Button */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={isPrinting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-950 transition-all cursor-pointer disabled:opacity-50"
          >
            {isPrinting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Printer className="w-3.5 h-3.5" />
            )}
            <span>{isPrinting ? "Ouverture impression..." : "Imprimer (A4)"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-teal-950/80 border border-teal-500/50 text-teal-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-400" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-teal-400 hover:text-teal-200 text-xs">
            ✕
          </button>
        </div>
      )}

      {/* Grid: Left configuration panel, Right live A4 document preview */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* LEFT CONFIGURATION PANEL (5 Cols) - ONLY "TRAVAUX COUVERT PAR" IS MODIFIABLE */}
        <div className="xl:col-span-5 space-y-4 print:hidden">
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                <span>Configuration du Bon de Clôture</span>
              </span>
              <span className="text-[10px] text-purple-300 bg-purple-950/60 border border-purple-500/30 px-2 py-0.5 rounded-full font-medium">
                Données Officielles Fixes
              </span>
            </div>

            {/* SEUL CHAMP MODIFIABLE : TRAVAUX COUVERT PAR */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/80 via-slate-900 to-purple-950/80 border-2 border-purple-500 shadow-xl ring-2 ring-purple-500/20 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="block text-purple-200 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-400 animate-pulse"></span>
                  <span>TRAVAUX COUVERT PAR :</span>
                </label>
                <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  ✓ Seul champ modifiable
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, coveredBy: "Schindler" })}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    formData.coveredBy === "Schindler"
                      ? "bg-purple-600/30 border-purple-400 text-white shadow-md ring-1 ring-purple-400"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      formData.coveredBy === "Schindler" ? "border-purple-400 bg-purple-600" : "border-slate-600"
                    }`}
                  >
                    {formData.coveredBy === "Schindler" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-100">[X] Schindler</div>
                    <div className="text-[10px] text-purple-300">Sous Contrat de Maintenance</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, coveredBy: "Client" })}
                  className={`p-3 rounded-xl border text-left flex items-center gap-3 transition-all cursor-pointer ${
                    formData.coveredBy === "Client"
                      ? "bg-purple-600/30 border-purple-400 text-white shadow-md ring-1 ring-purple-400"
                      : "bg-slate-950/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      formData.coveredBy === "Client" ? "border-purple-400 bg-purple-600" : "border-slate-600"
                    }`}
                  >
                    {formData.coveredBy === "Client" && <div className="w-2 h-2 rounded-full bg-white"></div>}
                  </div>
                  <div>
                    <div className="font-bold text-xs text-slate-100">[ ] Client</div>
                    <div className="text-[10px] text-amber-300">Hors Contrat (Devis Facturable)</div>
                  </div>
                </button>
              </div>
            </div>

            {/* DONNÉES VERROUILLÉES / INFORMATIONS DU BON (LECTURE SEULE) */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400 pb-1 border-b border-slate-800">
                <span className="font-semibold uppercase tracking-wider text-slate-300">
                  Données officielles du Bon (Verrouillées)
                </span>
                <span className="text-[10px] text-slate-500">Auto-généré</span>
              </div>

              {/* ID Fiche & N° Appareil */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 font-medium">ID FICHE / BON :</span>
                  <span className="font-mono font-bold text-slate-100 text-xs">{formData.docId || "10824"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 font-medium">N° APPAREIL (PF) :</span>
                  <span className="font-mono font-bold text-blue-400 text-xs">{formData.equipmentNumber || "999257"}</span>
                </div>
              </div>

              {/* Client / Syndic */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                <span className="block text-[10px] text-slate-500 font-medium">CLIENT / SYNDIC :</span>
                <span className="font-bold text-slate-100 text-xs uppercase">{formData.clientName || "à remplir"}</span>
              </div>

              {/* Lignes de NC */}
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-medium">LIGNES DE NC ({formData.rows.length}) :</span>
                  <span className="text-[10px] text-purple-400 font-mono font-bold">Réf: {formData.rows[0]?.refNc}</span>
                </div>

                {formData.rows.map((r, idx) => {
                  const assignedTech = getEquipmentTechnician(formData.equipmentNumber, r.technician);
                  return (
                    <div key={r.id} className="text-[11px] text-slate-300 bg-slate-900/60 p-2 rounded border border-slate-800 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-mono text-purple-300 font-bold">#{idx + 1} Réf {r.refNc}</span>
                        <span className="text-slate-400 font-mono">Date: {r.inspectionDate} &bull; Type: {r.inspectionType}</span>
                      </div>
                      <p className="text-slate-200 text-xs leading-relaxed">{r.description}</p>
                      <div className="text-[10px] text-slate-400 pt-0.5 flex items-center justify-between">
                        <span>Technicien (PF) : <strong className="text-emerald-400 uppercase font-bold">{assignedTech}</strong></span>
                        <span className="text-slate-500 italic">Signature : Manuscrite</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Validations & Signatures */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 font-medium">CHEF D'AGENCE :</span>
                  <span className="font-bold text-slate-300 text-[11px]">{formData.branchManager || "Chef d'agence :"}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                  <span className="block text-[10px] text-slate-500 font-medium">SUPERVISEUR :</span>
                  <span className="font-bold text-slate-300 text-[11px]">{formData.supervisor || "Superviseur :"}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
              <button
                type="button"
                onClick={handleMarkAsClosedInTower}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-teal-600/30 hover:bg-teal-600/40 text-teal-200 border border-teal-500/40 font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Clôturer automatiquement cette NC dans la Tour de Contrôle</span>
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT OFFICIAL DOCUMENT PREVIEW (7 Cols) - EXACT SCHINDLER A4 PORTRAIT FORM */}
        <div className="xl:col-span-7">
          <div className="sticky top-6">
            {/* Visual Paper Card Container */}
            <div className="bg-slate-900 p-2 sm:p-3 rounded-2xl border border-slate-800 shadow-2xl">
              <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs text-slate-400 border-b border-slate-800 mb-2 print:hidden">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-purple-400" />
                  <span>Aperçu Réplique Officielle A4 Portrait (210 x 297 mm)</span>
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadDocx}
                    disabled={isExportingDocx}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-indigo-950"
                  >
                    {isExportingDocx ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <FileText className="w-3.5 h-3.5" />
                    )}
                    <span>Télécharger Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadPdf}
                    disabled={isExportingPdf}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-emerald-950"
                  >
                    {isExportingPdf ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>Télécharger PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handlePrint}
                    disabled={isPrinting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shadow-md shadow-blue-950"
                  >
                    {isPrinting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Printer className="w-3.5 h-3.5" />
                    )}
                    <span>Imprimer</span>
                  </button>
                </div>
              </div>

              {/* Printable Document Sheet Container Wrapper (Centré, A4 exact 794px x 1123px) */}
              <div className="w-full overflow-x-auto p-2 sm:p-4 md:p-6 flex justify-center bg-slate-950/70 rounded-2xl border border-slate-800/80 shadow-inner">
                <div
                  id="schindler-nc-document-print"
                  className="bg-white text-black rounded-lg shadow-2xl font-sans select-text relative shrink-0"
                  style={{
                    fontFamily: "Arial, Calibri, sans-serif",
                    color: "#000000",
                    backgroundColor: "#ffffff",
                    width: "794px",
                    minHeight: "1123px",
                    maxWidth: "794px",
                    padding: "44px 44px 40px 44px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    boxSizing: "border-box"
                  }}
                >
                  <div>
                    {/* EN-TÊTE : LOGO (Haut Droit) + TITRE (Centré) + ID (Sous le titre à droite) */}
                    <div className="relative mb-5">
                      {/* LOGO Schindler en haut à droite */}
                      <div className="flex justify-end items-start mb-2">
                        <div className="w-[115px] flex items-center justify-end">
                          <img
                            src="/schindler-logo-docx.jpg"
                            alt="Schindler"
                            className="w-[110px] h-auto object-contain"
                            key="schindler-logo-docx-v3"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.currentTarget as HTMLElement).style.display = "none";
                            }}
                          />
                        </div>
                      </div>

                      {/* TITRE PRINCIPAL (Centré au milieu de la page) */}
                      <div className="pt-2 pb-3 text-center px-4">
                        <h1
                          className="font-bold text-black tracking-tight"
                          style={{
                            fontFamily: "Arial, Calibri, sans-serif",
                            fontSize: "18px",
                            lineHeight: "1.3"
                          }}
                        >
                          Bon d'ordre d'intervention clôture des NCs(Maintenance & CPSI)
                        </h1>
                      </div>

                      {/* ID (En bas à droite sous le titre) */}
                      <div className="flex justify-end pr-2">
                        <span className="text-[13.5px] font-bold text-black tracking-tight">
                          ID : {formData.docId || "11125"}
                        </span>
                      </div>
                    </div>

                    {/* SECTION INFORMATIONS (2 Colonnes: 62% gauche, 38% droite) */}
                    <div className="flex items-start justify-between gap-6 mb-8 pt-1">
                      {/* COLONNE GAUCHE */}
                      <div className="w-[62%] space-y-5">
                        {/* N°Appareil */}
                        <div className="flex items-center gap-4">
                          <span
                            className="font-bold text-black whitespace-nowrap min-w-[85px]"
                            style={{ fontSize: "14px" }}
                          >
                            N°Appareil
                          </span>
                          {/* Rectangle bordure noire */}
                          <div
                            className="border border-black flex items-center justify-center font-normal text-black"
                            style={{
                              width: "150px",
                              height: "38px",
                              fontSize: "14px"
                            }}
                          >
                            {formData.equipmentNumber || "9911614"}
                          </div>
                        </div>

                        {/* Client : */}
                        <div className="flex items-start gap-3">
                          <span
                            className="font-bold text-black whitespace-nowrap min-w-[85px] pt-0.5"
                            style={{ fontSize: "14px" }}
                          >
                            Client :
                          </span>
                          <span
                            className="font-bold text-black uppercase tracking-wide leading-snug flex-1"
                            style={{ fontSize: "13.5px" }}
                          >
                            {formData.clientName || "BANQUE POPULAIRE REM"}
                          </span>
                        </div>
                      </div>

                      {/* COLONNE DROITE */}
                      <div className="w-[38%] flex flex-col items-start space-y-2.5 pl-4">
                        <span
                          className="font-bold text-black mb-0.5"
                          style={{ fontSize: "14px" }}
                        >
                          Travaux Couvert Par :
                        </span>

                        {/* Cases à cocher verticales */}
                        <div className="flex items-center gap-3">
                          <div
                            className="border border-black flex items-center justify-center font-bold leading-none shrink-0"
                            style={{
                              width: "20px",
                              height: "20px",
                              fontSize: "14px"
                            }}
                          >
                            {formData.coveredBy === "Schindler" ? "X" : ""}
                          </div>
                          <span className="text-black font-medium" style={{ fontSize: "13.5px" }}>
                            Schindler
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div
                            className="border border-black flex items-center justify-center font-bold leading-none shrink-0"
                            style={{
                              width: "20px",
                              height: "20px",
                              fontSize: "14px"
                            }}
                          >
                            {formData.coveredBy === "Client" ? "X" : ""}
                          </div>
                          <span className="text-black font-medium" style={{ fontSize: "13.5px" }}>
                            Client
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* TABLEAU PRINCIPAL (Lignes horizontales pures sans délimitation verticale, identique au modèle) */}
                    <div className="w-full mb-8">
                      <table className="w-full text-left border-collapse border-t-2 border-black" style={{ fontSize: "12px" }}>
                        <thead>
                          <tr className="border-b-2 border-black font-bold text-neutral-600">
                            <th className="py-2.5 pr-2 font-bold w-[9%] text-neutral-600 text-[12px]">
                              Réf NC
                            </th>
                            <th className="py-2.5 px-3 font-bold w-[38%] text-neutral-600 text-[12px]">
                              Description NC Remarques
                            </th>
                            <th className="py-2.5 px-2 font-bold w-[14%] text-neutral-600 text-[12px]">
                              Date de l'inspection
                            </th>
                            <th className="py-2.5 px-1 font-bold w-[7%] text-center text-neutral-600 text-[12px]">
                              1Y/5Y
                            </th>
                            <th className="py-2.5 px-2 font-bold w-[12%] text-neutral-600 text-[12px]">
                              Date de clôture
                            </th>
                            <th className="py-2.5 px-2 font-bold w-[13%] text-neutral-600 text-[12px]">
                              Technicien
                            </th>
                            <th className="py-2.5 pl-1 font-bold w-[7%] text-center text-neutral-600 text-[12px]">
                              Signature
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {formData.rows.map((row) => (
                            <tr key={row.id} className="align-top border-b border-neutral-200">
                              <td className="py-3.5 pr-2 font-bold text-black text-[12px]">
                                {row.refNc || "à remplir"}
                              </td>
                              <td className="py-3.5 px-3 text-black leading-relaxed font-normal text-[12px]">
                                {row.description || "à remplir"}
                              </td>
                              <td className="py-3.5 px-2 text-black font-normal whitespace-nowrap text-[12px]">
                                {row.inspectionDate || "à remplir"}
                              </td>
                              <td className="py-3.5 px-1 text-black text-center font-normal text-[12px]">
                                {row.inspectionType || "5Y"}
                              </td>
                              <td className="py-3.5 px-2 text-black font-normal text-[12px]">
                                {row.closureDate || ""}
                              </td>
                              <td className="py-3.5 px-2 text-black font-normal uppercase text-[12px]">
                                {getEquipmentTechnician(formData.equipmentNumber, row.technician)}
                              </td>
                              <td className="py-3.5 pl-1 text-center align-middle">
                                {/* Espace vide pour signature manuelle */}
                                <div className="w-12 h-6 mx-auto"></div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* PARTIE BAS DE PAGE (~80% de la hauteur, Chef d'agence & Superviseur 12pt gras + Grand espace) */}
                  <div className="pt-4 mt-auto pb-2">
                    <div className="grid grid-cols-2 gap-10 items-start text-black">
                      {/* À gauche: Chef d'agence : */}
                      <div className="space-y-3">
                        <span
                          className="font-bold block"
                          style={{ fontSize: "15px" }}
                        >
                          Chef d'agence :
                        </span>
                        {/* Grand espace vide sous le champ pour signature */}
                        <div className="h-24"></div>
                      </div>

                      {/* À droite: Superviseur : */}
                      <div className="space-y-3">
                        <span
                          className="font-bold block"
                          style={{ fontSize: "15px" }}
                        >
                          Superviseur :
                        </span>
                        {/* Grand espace vide sous le champ pour signature */}
                        <div className="h-24"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL / POPUP: Sélection d'une NC depuis la Tour de Contrôle */}
      {showNcSelectorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Wrench className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Tour de Contrôle des Non-Conformités (NC) Schindler
                  </h3>
                  <p className="text-xs text-slate-400">
                    Sélectionnez une NC ou un appareil pour auto-générer instantanément son Bon de Clôture officiel
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowNcSelectorModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/50 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[240px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={ncSearchTerm}
                  onChange={(e) => setNcSearchTerm(e.target.value)}
                  placeholder="Rechercher par N° Appareil (PF), Client, Réf NC ou Technicien..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedNcFilter("all")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    selectedNcFilter === "all" ? "bg-purple-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Toutes ({allNcsWithEquip.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNcFilter("open")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    selectedNcFilter === "open" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  En attente / Ouvertes
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNcFilter("closed")}
                  className={`px-3 py-1 rounded-lg font-medium transition-all ${
                    selectedNcFilter === "closed" ? "bg-teal-600 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Clôturées
                </button>
              </div>
            </div>

            {/* NCs Table List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredNcs.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Aucune non-conformité trouvée avec ces critères.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredNcs.map(({ nc, equipment }) => {
                    const isClosed = nc.status === "Levée / Clôturée";
                    return (
                      <div
                        key={`${equipment.id}-${nc.id}`}
                        className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-purple-500/50 transition-all flex flex-wrap items-center justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1.5 flex-1 min-w-[280px]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                              {nc.code}
                            </span>
                            <span className="font-mono font-semibold text-slate-300">
                              PF: {equipment.pfNumber}
                            </span>
                            <span className="text-slate-400 font-medium">
                              • {equipment.customer || equipment.name}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isClosed
                                  ? "bg-teal-950 text-teal-300 border border-teal-500/40"
                                  : "bg-amber-950 text-amber-300 border border-amber-500/40"
                              }`}
                            >
                              {nc.status}
                            </span>
                          </div>

                          <p className="text-slate-200 text-xs line-clamp-2">{nc.description}</p>

                          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
                            <span>📅 Détection: <b className="text-slate-300">{formatExcelDate(nc.detectedDate) || nc.detectedDate}</b></span>
                            <span>👤 Tech: <b className="text-slate-300">{nc.assignedTechnician || equipment.assignedTechnician || "Non assigné"}</b></span>
                            <span>🛡️ Couverture: <b className="text-slate-300">{nc.isCoveredByContract !== false ? "Schindler (Inclus)" : "Client (Devis)"}</b></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSelectNc(nc, equipment)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow transition-all cursor-pointer"
                          >
                            <span>Générer Bon de Clôture</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>

                          {(equipment.nonConformities || []).length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleSelectEquipmentNcs(equipment)}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-[11px] transition-all cursor-pointer"
                              title="Inclure toutes les NC de cet appareil dans un seul bon"
                            >
                              Toutes les NC du PF ({equipment.nonConformities?.length})
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-slate-800 bg-slate-950 text-right">
              <button
                type="button"
                onClick={() => setShowNcSelectorModal(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
