import React, { useState, useEffect, useMemo } from "react";
import PizZip from "pizzip";
import {
  FileText,
  Search,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  Circle,
  Building2,
  Calendar,
  MapPin,
  FileCheck2,
  Download,
  Printer,
  ChevronDown,
  ChevronUp,
  X,
  Sparkles,
  RefreshCw,
  User,
  Hash,
  Paperclip,
  Check,
  FileSpreadsheet,
  CheckSquare,
  Square,
  Wrench,
  Layers,
  ArrowRight
} from "lucide-react";
import { GrandCompteAttachment, PFEquipment } from "../../types";
import { INITIAL_PF_EQUIPMENTS } from "../../data/mockPFData";

const STORAGE_KEY = "toolbox_grand_comptes_attachements_v1";

const DEFAULT_GRAND_COMPTES: GrandCompteAttachment[] = [
  {
    id: "gc-1",
    year: 2026,
    representative: "Oussama Oubghous",
    clientName: "BANQUE CENTRALE POPULAIRE COLONIE DE VACANCE",
    address: "BANQUE CENTRALE POPULAIRE COLONIE DE VACANCE",
    contractNumber: "960075",
    city: "IFRANE",
    associatedEquipments: ["992152"],
    validatedMonths: [1, 2, 3], // T1 fully validated (3/3)
    notes: "Site estival colonie de vacances Ifrane - validation trimestrielle auprès de la direction régionale BCP."
  },
  {
    id: "gc-2",
    year: 2026,
    representative: "Oussama Oubghous",
    clientName: "GRAND PALAIS ROYAL",
    address: "FES",
    contractNumber: "6030",
    city: "FES",
    associatedEquipments: ["953002", "953003", "953004", "953005", "953006", "953007"],
    validatedMonths: [1, 2, 3, 4, 5, 6], // T1 and T2 validated
    notes: "Site protocolaire Fès - 6 appareils ascenseurs Schindler."
  },
  {
    id: "gc-3",
    year: 2026,
    representative: "Oussama Oubghous",
    clientName: "PALAIS ROYAL TOITS OUVRANTS",
    address: "FES",
    contractNumber: "6142",
    city: "FES",
    associatedEquipments: ["770397", "770398", "770399", "770400", "770401", "770402"],
    validatedMonths: [7, 8, 9], // T3 validated
    notes: "Attachements toits ouvrants motorisés - contrat d'entretien spécifique."
  }
];

interface TrimesterInfo {
  id: 1 | 2 | 3 | 4;
  label: string;
  shortLabel: string;
  ordinal: string;
  monthsIndices: [number, number, number]; // 1-based [1,2,3]
  monthShortNames: [string, string, string];
  monthFullNames: [string, string, string];
  periodString: (year: number) => string;
}

const TRIMESTERS: TrimesterInfo[] = [
  {
    id: 1,
    label: "1er Trimestre",
    shortLabel: "T1",
    ordinal: "1er",
    monthsIndices: [1, 2, 3],
    monthShortNames: ["Jan", "Fév", "Mar"],
    monthFullNames: ["Janvier", "Février", "Mars"],
    periodString: (y) => `DU 01/01/${y} AU 31/03/${y}`
  },
  {
    id: 2,
    label: "2ème Trimestre",
    shortLabel: "T2",
    ordinal: "2ème",
    monthsIndices: [4, 5, 6],
    monthShortNames: ["Avr", "Mai", "Jui"],
    monthFullNames: ["Avril", "Mai", "Juin"],
    periodString: (y) => `DU 01/04/${y} AU 30/06/${y}`
  },
  {
    id: 3,
    label: "3ème Trimestre",
    shortLabel: "T3",
    ordinal: "3ème",
    monthsIndices: [7, 8, 9],
    monthShortNames: ["Jui", "Aoû", "Sep"],
    monthFullNames: ["Juillet", "Août", "Septembre"],
    periodString: (y) => `DU 01/07/${y} AU 30/09/${y}`
  },
  {
    id: 4,
    label: "4ème Trimestre",
    shortLabel: "T4",
    ordinal: "4ème",
    monthsIndices: [10, 11, 12],
    monthShortNames: ["Oct", "Nov", "Déc"],
    monthFullNames: ["Octobre", "Novembre", "Décembre"],
    periodString: (y) => `DU 01/10/${y} AU 31/12/${y}`
  }
];

export const GrandCompteAttachmentManager: React.FC = () => {
  const [items, setItems] = useState<GrandCompteAttachment[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load grand comptes:", e);
    }
    return DEFAULT_GRAND_COMPTES;
  });

  // PF Equipment Database
  const [pfEquipments] = useState<PFEquipment[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_pf_equipments");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("Failed to load PF equipments:", e);
    }
    return INITIAL_PF_EQUIPMENTS;
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [expandedTrimester, setExpandedTrimester] = useState<Record<string, number | null>>({});
  
  // Success message state
  const [successBanner, setSuccessBanner] = useState<{
    clientName: string;
    trimester: number;
    filename: string;
    downloadUrl?: string;
  } | null>(null);

  // Modal States
  const [generatingItem, setGeneratingItem] = useState<{
    item: GrandCompteAttachment;
    trimester: 1 | 2 | 3 | 4;
  } | null>(null);
  
  const [editingItem, setEditingItem] = useState<GrandCompteAttachment | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

  // Form State for Create/Edit
  const [formData, setFormData] = useState({
    clientName: "",
    address: "",
    contractNumber: "",
    city: "FES",
    representative: "Oussama Oubghous",
    year: 2026,
    associatedEquipments: "",
    notes: ""
  });

  // Modal PF Equipment multi-picker state
  const [selectedEquipments, setSelectedEquipments] = useState<string[]>([]);
  const [equipmentSearch, setEquipmentSearch] = useState("");
  const [manualApparatusInput, setManualApparatusInput] = useState("");

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error("Failed to save grand comptes:", e);
    }
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const term = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !term ||
        item.clientName.toLowerCase().includes(term) ||
        item.contractNumber.toLowerCase().includes(term) ||
        item.city.toLowerCase().includes(term) ||
        item.address.toLowerCase().includes(term) ||
        item.associatedEquipments.some((eq) => eq.toLowerCase().includes(term));

      const matchesYear = selectedYear === 0 || item.year === selectedYear;

      return matchesSearch && matchesYear;
    });
  }, [items, searchTerm, selectedYear]);

  // Toggle single month validation
  const toggleMonth = (itemId: string, monthIndex: number) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const exists = it.validatedMonths.includes(monthIndex);
        const newMonths = exists
          ? it.validatedMonths.filter((m) => m !== monthIndex)
          : [...it.validatedMonths, monthIndex].sort((a, b) => a - b);
        return {
          ...it,
          validatedMonths: newMonths,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Toggle all months in a trimester
  const toggleTrimesterAllMonths = (itemId: string, trimester: TrimesterInfo) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== itemId) return it;
        const allChecked = trimester.monthsIndices.every((m) => it.validatedMonths.includes(m));
        let newMonths: number[];
        if (allChecked) {
          // Uncheck all in this trimester
          newMonths = it.validatedMonths.filter((m) => !trimester.monthsIndices.includes(m as any));
        } else {
          // Check all in this trimester
          const set = new Set([...it.validatedMonths, ...trimester.monthsIndices]);
          newMonths = Array.from(set).sort((a, b) => a - b);
        }
        return {
          ...it,
          validatedMonths: newMonths,
          updatedAt: new Date().toISOString()
        };
      })
    );
  };

  // Toggle expansion of trimester
  const toggleTrimesterExpand = (itemId: string, tId: number) => {
    setExpandedTrimester((prev) => ({
      ...prev,
      [itemId]: prev[itemId] === tId ? null : tId
    }));
  };

  // Open modal to generate document
  const handleOpenGenerateModal = (item: GrandCompteAttachment, defaultT: 1 | 2 | 3 | 4 = 3) => {
    setGeneratingItem({ item, trimester: defaultT });
  };

  // Generate .docx Word File
  const handleDownloadDocx = async (item: GrandCompteAttachment, trimesterNum: 1 | 2 | 3 | 4) => {
    setIsGeneratingDocx(true);
    try {
      const payload = {
        clientName: item.clientName,
        city: item.city,
        contractNumber: item.contractNumber,
        installationName: item.clientName,
        apparatusList: item.associatedEquipments,
        year: item.year,
        trimester: trimesterNum,
        representative: item.representative
      };

      // Try server endpoint first
      const res = await fetch("/api/attachements/generate-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        const cleanClient = item.clientName.replace(/[^a-zA-Z0-9-_]/g, "_");
        const filename = `Attachement_${cleanClient}_T${trimesterNum}_${item.year}.docx`;
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setSuccessBanner({
          clientName: item.clientName,
          trimester: trimesterNum,
          filename
        });
        setGeneratingItem(null);
        return;
      }

      // Fallback: Client-side Docx generation with PizZip
      const templateRes = await fetch("/Attachement_PALAIS_ROYAL_TOITS_OUVRANTS_3ème_Trimestre.docx");
      if (!templateRes.ok) {
        throw new Error("Modèle Word /Attachement_PALAIS_ROYAL_TOITS_OUVRANTS_3ème_Trimestre.docx introuvable.");
      }
      const arrayBuffer = await templateRes.arrayBuffer();
      const zip = new PizZip(arrayBuffer);

      const trimesterInfo = TRIMESTERS.find((t) => t.id === trimesterNum) || TRIMESTERS[2];
      const targetOrdinal = trimesterInfo.ordinal;
      const targetPeriod = trimesterInfo.periodString(item.year);
      const targetMonths = trimesterInfo.monthFullNames;

      let docXml = zip.file("word/document.xml")?.asText();
      if (!docXml) throw new Error("Format de document invalide.");

      const clientStr = item.clientName.trim();
      const cityStr = item.city.trim().toUpperCase();
      const contractStr = item.contractNumber.trim();
      const appStr = item.associatedEquipments.join(", ");

      docXml = docXml.replace(/PALAIS ROYAL TOITS OUVRANTS/g, clientStr);
      docXml = docXml.replace(/FES/g, cityStr);
      docXml = docXml.replace(/6142/g, contractStr);
      docXml = docXml.replace(/770397, 770398, 770399, 770400, 770401, 770402/g, appStr);
      docXml = docXml.replace(/DU 01\/07\/2026 AU 30\/09\/2026/g, targetPeriod);
      docXml = docXml.replace(/>3ème</g, `>${targetOrdinal}<`);
      docXml = docXml.replace(/TRIMESTRE 2026/g, `TRIMESTRE ${item.year}`);
      docXml = docXml.replace(/>Juillet</g, `>${targetMonths[0]}<`);
      docXml = docXml.replace(/>Août</g, `>${targetMonths[1]}<`);
      docXml = docXml.replace(/>Septembre</g, `>${targetMonths[2]}<`);

      zip.file("word/document.xml", docXml);
      const outputBlob = zip.generate({
        type: "blob",
        mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      });

      const url = window.URL.createObjectURL(outputBlob);
      const link = document.createElement("a");
      const cleanClient = item.clientName.replace(/[^a-zA-Z0-9-_]/g, "_");
      const filename = `Attachement_${cleanClient}_T${trimesterNum}_${item.year}.docx`;
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setSuccessBanner({
        clientName: item.clientName,
        trimester: trimesterNum,
        filename
      });
      setGeneratingItem(null);
    } catch (err: any) {
      alert(`⚠️ Erreur lors de la génération du document Word : ${err.message}`);
    } finally {
      setIsGeneratingDocx(false);
    }
  };

  // Filter PF equipments based on search term or current client
  const filteredPfEquipments = useMemo(() => {
    const term = equipmentSearch.toLowerCase().trim();
    if (!term) {
      // If no search term but client name is typed, suggest matching client equipments
      if (formData.clientName.trim().length >= 3) {
        const clientTerm = formData.clientName.toLowerCase().trim();
        const clientMatches = pfEquipments.filter(
          (eq) =>
            (eq.customer && eq.customer.toLowerCase().includes(clientTerm)) ||
            (eq.name && eq.name.toLowerCase().includes(clientTerm))
        );
        if (clientMatches.length > 0) return clientMatches;
      }
      return pfEquipments.slice(0, 30);
    }
    return pfEquipments
      .filter((eq) => {
        const num = (eq.pfNumber || eq.numAppareil || eq.id || "").toLowerCase();
        const cust = (eq.customer || "").toLowerCase();
        const name = (eq.name || "").toLowerCase();
        const contract = (eq.contractNumber || "").toLowerCase();
        const city = (eq.city || "").toLowerCase();
        const street = (eq.street || "").toLowerCase();
        return (
          num.includes(term) ||
          cust.includes(term) ||
          name.includes(term) ||
          contract.includes(term) ||
          city.includes(term) ||
          street.includes(term)
        );
      })
      .slice(0, 60);
  }, [pfEquipments, equipmentSearch, formData.clientName]);

  // Toggle single apparatus in selection
  const toggleEquipmentSelection = (eqNumber: string) => {
    const cleanNum = eqNumber.trim();
    if (!cleanNum) return;
    setSelectedEquipments((prev) => {
      if (prev.includes(cleanNum)) {
        return prev.filter((n) => n !== cleanNum);
      } else {
        return [...prev, cleanNum];
      }
    });
  };

  // Remove apparatus
  const removeEquipment = (eqNumber: string) => {
    setSelectedEquipments((prev) => prev.filter((n) => n !== eqNumber));
  };

  // Add manual apparatus numbers (single or comma-separated)
  const handleAddManualEquipments = () => {
    if (!manualApparatusInput.trim()) return;
    const itemsToAdd = manualApparatusInput
      .split(/[,;\s]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    setSelectedEquipments((prev) => {
      const set = new Set([...prev, ...itemsToAdd]);
      return Array.from(set);
    });
    setManualApparatusInput("");
  };

  // Select all apparatuses belonging to a customer / contract
  const handleSelectAllForSite = (clientOrContract: string) => {
    const term = clientOrContract.toLowerCase().trim();
    if (!term) return;
    const matches = pfEquipments.filter(
      (eq) =>
        (eq.customer && eq.customer.toLowerCase().includes(term)) ||
        (eq.name && eq.name.toLowerCase().includes(term)) ||
        (eq.contractNumber && eq.contractNumber.toLowerCase().includes(term))
    );
    const nums = matches.map((eq) => eq.pfNumber || eq.numAppareil || eq.id).filter(Boolean);
    if (nums.length > 0) {
      setSelectedEquipments((prev) => {
        const set = new Set([...prev, ...nums]);
        return Array.from(set);
      });
    }
  };

  // Auto-fill client, contract, city, address from a PF Equipment
  const handleAutoFillFromEquipment = (eq: PFEquipment) => {
    setFormData((prev) => ({
      ...prev,
      clientName: eq.customer || eq.name || prev.clientName,
      contractNumber: eq.contractNumber || prev.contractNumber,
      city: eq.city || prev.city,
      address: eq.street || eq.name || eq.city || prev.address,
      representative: eq.assignedTechnician || prev.representative
    }));
    // Also ensure this apparatus is added to selection
    const num = eq.pfNumber || eq.numAppareil || eq.id;
    if (num && !selectedEquipments.includes(num)) {
      setSelectedEquipments((prev) => [...prev, num]);
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (item: GrandCompteAttachment) => {
    setEditingItem(item);
    setFormData({
      clientName: item.clientName,
      address: item.address,
      contractNumber: item.contractNumber,
      city: item.city,
      representative: item.representative,
      year: item.year,
      associatedEquipments: item.associatedEquipments.join(", "),
      notes: item.notes || ""
    });
    setSelectedEquipments(item.associatedEquipments || []);
    setEquipmentSearch("");
    setManualApparatusInput("");
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      clientName: "",
      address: "",
      contractNumber: "",
      city: "FES",
      representative: "Oussama Oubghous",
      year: 2026,
      associatedEquipments: "",
      notes: ""
    });
    setSelectedEquipments([]);
    setEquipmentSearch("");
    setManualApparatusInput("");
    setIsNewModalOpen(true);
  };

  // Save Item (Create or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName.trim() || !formData.contractNumber.trim()) {
      alert("Veuillez renseigner au moins le nom du client et le n° de contrat.");
      return;
    }

    // Determine final equipment array (prefer selectedEquipments, fallback to parsed text)
    let equipmentsArray: string[] = selectedEquipments;
    if (equipmentsArray.length === 0 && formData.associatedEquipments.trim()) {
      equipmentsArray = formData.associatedEquipments
        .split(/[,;\s]+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);
    }

    if (equipmentsArray.length === 0) {
      alert("Veuillez sélectionner ou ajouter au moins un n° d'appareil pour ce Grand Compte.");
      return;
    }

    if (editingItem) {
      // Update
      setItems((prev) =>
        prev.map((it) =>
          it.id === editingItem.id
            ? {
                ...it,
                clientName: formData.clientName.trim(),
                address: formData.address.trim() || formData.clientName.trim(),
                contractNumber: formData.contractNumber.trim(),
                city: formData.city.trim(),
                representative: formData.representative.trim(),
                year: Number(formData.year) || 2026,
                associatedEquipments: equipmentsArray,
                notes: formData.notes.trim(),
                updatedAt: new Date().toISOString()
              }
            : it
        )
      );
      setEditingItem(null);
    } else {
      // Create
      const newItem: GrandCompteAttachment = {
        id: `gc-${Date.now()}`,
        clientName: formData.clientName.trim(),
        address: formData.address.trim() || formData.clientName.trim(),
        contractNumber: formData.contractNumber.trim(),
        city: formData.city.trim(),
        representative: formData.representative.trim(),
        year: Number(formData.year) || 2026,
        associatedEquipments: equipmentsArray,
        validatedMonths: [],
        notes: formData.notes.trim(),
        createdAt: new Date().toISOString()
      };
      setItems((prev) => [newItem, ...prev]);
      setIsNewModalOpen(false);
    }
  };

  // Delete Item
  const handleDeleteItem = (id: string, name: string) => {
    if (confirm(`Confirmez-vous la suppression du suivi pour "${name}" ?`)) {
      setItems((prev) => prev.filter((it) => it.id !== id));
    }
  };

  // Reset to default data
  const handleResetDefaults = () => {
    if (confirm("Réinitialiser avec les données d'exemple Grands Comptes ?")) {
      setItems(DEFAULT_GRAND_COMPTES);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* Header Container */}
      <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-600 dark:text-red-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white tracking-wide uppercase">
                  REGISTRE DE SUIVI DES DOCUMENTS ENVOYÉS
                </h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Cochez ou décochez les mois de 1 à 12 au fur et à mesure des transmissions validées.
              </p>
            </div>
          </div>

          {/* Search bar & Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative min-w-[260px] sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher par client, n° de contrat..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button
              onClick={handleOpenCreate}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nouveau Grand Compte</span>
            </button>

            <button
              onClick={handleResetDefaults}
              title="Restaurer les données d'exemples"
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 text-xs cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Notification Banner (matches image 2) */}
      {successBanner && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between text-emerald-900 dark:text-emerald-300 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs font-bold">
              Document d'attachement pour {successBanner.clientName} généré avec succès ! ({successBanner.filename})
            </span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grand Compte Cards List */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
            <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-2 opacity-60" />
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Aucun Grand Compte trouvé pour cette recherche.
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Modifiez votre recherche ou ajoutez un nouveau site avec le bouton ci-dessus.
            </p>
          </div>
        ) : (
          filteredItems.map((item) => {
            const currentExpandedT = expandedTrimester[item.id] || null;

            return (
              <div
                key={item.id}
                className="p-5 rounded-2xl bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 transition-all hover:border-slate-300 dark:hover:border-slate-700"
              >
                {/* Top Row: Badges, Title, Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Year badge (red/coral) */}
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                      {item.year}
                    </span>

                    {/* Technician badge */}
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{item.representative || "Oussama Oubghous"}</span>
                    </span>

                    {/* Site / Client Name */}
                    <div className="flex items-center gap-1.5 ml-1">
                      <Building2 className="w-4 h-4 text-red-500 shrink-0" />
                      <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">
                        {item.clientName}
                      </h3>
                    </div>
                  </div>

                  {/* Actions on Top Right */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer"
                    >
                      <Edit className="w-3.5 h-3.5 text-blue-500" />
                      <span>Modifier</span>
                    </button>

                    <button
                      onClick={() => handleOpenGenerateModal(item, 3)}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-900/80 text-red-700 dark:text-red-300 text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <FileText className="w-3.5 h-3.5 text-red-500" />
                      <span>Générer Doc</span>
                    </button>

                    <button
                      onClick={() => handleDeleteItem(item.id, item.clientName)}
                      title="Supprimer ce site"
                      className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Address Line */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                  <span className="font-semibold text-slate-500 dark:text-slate-400">Adresse:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{item.address || item.city}</span>
                </div>

                {/* Pill Info Bar (Contract, City, Appareils) */}
                <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-400" />
                    <span className="text-slate-500 dark:text-slate-400">N° Contrat :</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 italic">{item.contractNumber}</span>
                  </div>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Ville de suivi :</span>
                    <span className="font-bold text-slate-800 dark:text-slate-100 uppercase">{item.city}</span>
                  </div>

                  <span className="text-slate-300 dark:text-slate-700">|</span>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-slate-500 dark:text-slate-400">Appareils associés :</span>
                    <div className="flex flex-wrap gap-1">
                      {item.associatedEquipments.map((eq, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md text-[11px] font-black italic bg-red-50 dark:bg-red-950/70 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50"
                        >
                          {eq}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Suivi des Transmissions Trimestres */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                      <CheckCircle2 className="w-4 h-4 text-red-500" />
                      <span className="uppercase tracking-wide">SUIVI DES TRANSMISSIONS D'ATTACHEMENTS (TRIMESTRES)</span>
                    </div>
                    <span className="text-[11px] text-slate-400 hidden sm:inline">
                      Cliquez sur un trimestre pour l'ouvrir et valider ses mois
                    </span>
                  </div>

                  {/* 4 Trimester Buttons */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {TRIMESTERS.map((t) => {
                      const validCount = t.monthsIndices.filter((m) =>
                        item.validatedMonths.includes(m)
                      ).length;
                      const isComplete = validCount === 3;
                      const isOpened = currentExpandedT === t.id;

                      return (
                        <div key={t.id} className="flex flex-col">
                          <button
                            type="button"
                            onClick={() => toggleTrimesterExpand(item.id, t.id)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                              isComplete
                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-400"
                                : isOpened
                                ? "bg-purple-50 dark:bg-purple-950/30 border-purple-400 dark:border-purple-600"
                                : "bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                            }`}
                          >
                            <div>
                              <p className={`font-black text-xs ${isComplete ? "text-emerald-700 dark:text-emerald-300" : "text-slate-800 dark:text-slate-200"}`}>
                                {t.shortLabel}
                              </p>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                                {t.monthShortNames.join(", ")}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                                  isComplete
                                    ? "bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700"
                                    : validCount > 0
                                    ? "bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800"
                                    : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                                }`}
                              >
                                {validCount}/3
                              </span>
                              {isOpened ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Expanded Month Checkboxes for selected Trimester */}
                  {currentExpandedT && (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-purple-200 dark:border-purple-900/60 space-y-3 animate-in fade-in duration-200">
                      {(() => {
                        const activeT = TRIMESTERS.find((t) => t.id === currentExpandedT)!;
                        const isAllChecked = activeT.monthsIndices.every((m) =>
                          item.validatedMonths.includes(m)
                        );

                        return (
                          <div>
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-purple-700 dark:text-purple-300">
                                  Détail {activeT.label} ({activeT.periodString(item.year)})
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => toggleTrimesterAllMonths(item.id, activeT)}
                                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold cursor-pointer transition-all"
                                >
                                  {isAllChecked ? "Tout décocher" : "Tout valider (3/3)"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenGenerateModal(item, activeT.id)}
                                  className="text-[11px] px-3 py-1 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                                >
                                  <FileText className="w-3 h-3" />
                                  <span>Générer Bon {activeT.shortLabel}</span>
                                </button>
                              </div>
                            </div>

                            {/* 3 Months checklist */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-3">
                              {activeT.monthsIndices.map((monthIdx, i) => {
                                const isChecked = item.validatedMonths.includes(monthIdx);
                                const monthName = activeT.monthFullNames[i];

                                return (
                                  <label
                                    key={monthIdx}
                                    onClick={() => toggleMonth(item.id, monthIdx)}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                                      isChecked
                                        ? "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200"
                                        : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div
                                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                                          isChecked
                                            ? "bg-emerald-600 border-emerald-600 text-white"
                                            : "border-slate-400 dark:border-slate-600"
                                        }`}
                                      >
                                        {isChecked && <Check className="w-3 h-3" />}
                                      </div>
                                      <span className="text-xs font-bold">{monthName}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400">Mois #{monthIdx}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Generate Document (Preview & Download Word) */}
      {generatingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Générateur de Bon d'Attachement Client
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Modèle officiel Schindler prêt à signer & conformité Grand Compte
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGeneratingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              {/* Trimester Selector Tabs */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2 uppercase text-[11px] tracking-wider">
                  Sélectionnez le Trimestre à générer :
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {TRIMESTERS.map((t) => {
                    const isSelected = generatingItem.trimester === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() =>
                          setGeneratingItem({
                            ...generatingItem,
                            trimester: t.id
                          })
                        }
                        className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-red-600 border-red-600 text-white font-bold shadow-md"
                            : "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400"
                        }`}
                      >
                        <p className="font-bold text-xs">{t.shortLabel}</p>
                        <p className="text-[10px] opacity-80">{t.ordinal} Trim.</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Document Preview Box */}
              {(() => {
                const tInfo =
                  TRIMESTERS.find((t) => t.id === generatingItem.trimester) || TRIMESTERS[2];
                const item = generatingItem.item;

                return (
                  <div className="p-5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-3 font-sans">
                    <div className="text-center space-y-1 pb-3 border-b border-slate-200 dark:border-slate-800">
                      <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                        {item.clientName}
                      </p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase">
                        {item.city}
                      </p>
                    </div>

                    <div className="space-y-1.5 text-[11px] text-slate-700 dark:text-slate-300 pt-1">
                      <p>
                        <strong className="text-slate-900 dark:text-white">OBJET :</strong> TRAVAUX D’ENTRETIEN
                        RELATIF AU CONTRAT D’ENTRETIEN N°{" "}
                        <strong className="text-red-600 dark:text-red-400 font-bold">
                          {item.contractNumber}
                        </strong>
                      </p>
                      <p>
                        <strong className="text-slate-900 dark:text-white">INSTALLATION :</strong>{" "}
                        {item.clientName}
                      </p>
                      <p>
                        <strong className="text-slate-900 dark:text-white">APPAREILS :</strong>{" "}
                        {item.associatedEquipments.join(", ")}
                      </p>
                      <p>
                        <strong className="text-slate-900 dark:text-white">
                          ENTRETIEN POUR LA PERIODE {tInfo.periodString(item.year)}
                        </strong>
                      </p>
                      <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase pt-1">
                        {tInfo.ordinal} TRIMESTRE {item.year}
                      </p>
                    </div>

                    {/* Table of Months & Signatures Preview */}
                    <div className="pt-2">
                      <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-center text-xs">
                        <thead>
                          <tr className="bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-bold">
                            <th className="border border-slate-300 dark:border-slate-700 p-2 w-1/3">
                              MOIS
                            </th>
                            <th className="border border-slate-300 dark:border-slate-700 p-2 w-1/3">
                              SIGNATURE AGENT TECHNIQUE
                            </th>
                            <th className="border border-slate-300 dark:border-slate-700 p-2 w-1/3">
                              SIGNATURE CLIENT
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {tInfo.monthFullNames.map((mName, idx) => (
                            <tr key={idx} className="border border-slate-300 dark:border-slate-700">
                              <td className="border border-slate-300 dark:border-slate-700 p-3 font-semibold text-slate-800 dark:text-slate-200">
                                {mName}
                              </td>
                              {idx === 0 && (
                                <>
                                  <td
                                    rowSpan={3}
                                    className="border border-slate-300 dark:border-slate-700 p-2 text-[10px] text-slate-400 italic align-middle bg-white/40 dark:bg-slate-900/40"
                                  >
                                    Cachet & Visa Schindler
                                  </td>
                                  <td
                                    rowSpan={3}
                                    className="border border-slate-300 dark:border-slate-700 p-2 text-[10px] text-slate-400 italic align-middle bg-white/40 dark:bg-slate-900/40"
                                  >
                                    Bon pour accord & Signature Client
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <button
                type="button"
                onClick={() => setGeneratingItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>

              <button
                type="button"
                disabled={isGeneratingDocx}
                onClick={() =>
                  handleDownloadDocx(generatingItem.item, generatingItem.trimester)
                }
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold shadow-lg shadow-red-600/30 transition-all cursor-pointer disabled:opacity-50"
              >
                {isGeneratingDocx ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Télécharger Document Word (.docx)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Create / Edit Grand Compte */}
      {(isNewModalOpen || editingItem) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl max-h-[92vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-purple-500" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {editingItem ? "Modifier le Grand Compte" : "Ajouter un Grand Compte"}
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsNewModalOpen(false);
                  setEditingItem(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveForm} className="p-5 space-y-4 text-xs overflow-y-auto max-h-[calc(92vh-130px)]">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Nom du Client / Site Grand Compte *
                </label>
                <input
                  type="text"
                  required
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  placeholder="Ex: BANQUE CENTRALE POPULAIRE, PALAIS ROYAL..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    N° Contrat *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    placeholder="Ex: 960075, 6142..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Ville de suivi
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="Ex: FES, IFRANE, CASABLANCA..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Année de Suivi
                  </label>
                  <input
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) || 2026 })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                    Responsable Suivi
                  </label>
                  <input
                    type="text"
                    value={formData.representative}
                    onChange={(e) => setFormData({ ...formData, representative: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Adresse de l'installation
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Ex: FES / BANQUE CENTRALE POPULAIRE..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>

              {/* SECTION APPAREILS PF MULTI-SÉLECTION */}
              <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-purple-500" />
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      N° Appareils Associés ({selectedEquipments.length})
                    </span>
                  </div>
                  {selectedEquipments.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedEquipments([])}
                      className="text-[11px] text-red-500 hover:text-red-400 font-semibold cursor-pointer"
                    >
                      Tout effacer ({selectedEquipments.length})
                    </button>
                  )}
                </div>

                {/* Selected Apparatus Badges */}
                {selectedEquipments.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 max-h-24 overflow-y-auto">
                    {selectedEquipments.map((eqNum) => (
                      <span
                        key={eqNum}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-50 dark:bg-purple-950/60 border border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-300 font-mono font-bold text-xs shadow-sm"
                      >
                        <span>{eqNum}</span>
                        <button
                          type="button"
                          onClick={() => removeEquipment(eqNum)}
                          className="hover:text-red-500 rounded-full p-0.5 transition-colors cursor-pointer"
                          title="Retirer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-2 text-slate-400 dark:text-slate-500 text-[11px] italic bg-white/50 dark:bg-slate-900/50 rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                    Aucun appareil sélectionné. Cochez les appareils dans la liste PF ci-dessous ou saisissez un numéro.
                  </div>
                )}

                {/* PF Search Input */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={equipmentSearch}
                      onChange={(e) => setEquipmentSearch(e.target.value)}
                      placeholder="Rechercher dans le Parc PF (n° appareil, client, ville, contrat)..."
                      className="w-full pl-8 pr-8 py-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    {equipmentSearch && (
                      <button
                        type="button"
                        onClick={() => setEquipmentSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  {/* Quick Select All for client if available */}
                  {formData.clientName.trim() && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Appareils de la base PF :</span>
                      <button
                        type="button"
                        onClick={() => handleSelectAllForSite(formData.clientName)}
                        className="text-purple-600 dark:text-purple-400 hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Layers className="w-3 h-3" />
                        Tout cocher pour "{formData.clientName.slice(0, 22)}"
                      </button>
                    </div>
                  )}

                  {/* Scrollable PF List */}
                  <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {filteredPfEquipments.length === 0 ? (
                      <div className="p-3 text-center text-slate-400 text-xs">
                        Aucun appareil PF correspondant. Utilisez l'ajout manuel ci-dessous.
                      </div>
                    ) : (
                      filteredPfEquipments.map((eq) => {
                        const eqNum = eq.pfNumber || eq.numAppareil || eq.id;
                        const isSelected = selectedEquipments.includes(eqNum);
                        return (
                          <div
                            key={eq.id || eqNum}
                            className={`p-2 flex items-center justify-between gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer ${
                              isSelected ? "bg-purple-50/60 dark:bg-purple-950/40" : ""
                            }`}
                            onClick={() => toggleEquipmentSelection(eqNum)}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <button
                                type="button"
                                className="text-purple-600 dark:text-purple-400 flex-shrink-0"
                              >
                                {isSelected ? (
                                  <CheckSquare className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-mono font-bold text-xs text-purple-600 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                                    {eqNum}
                                  </span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate text-xs">
                                    {eq.customer || eq.name}
                                  </span>
                                </div>
                                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 truncate mt-0.5">
                                  {eq.city && <span>📍 {eq.city}</span>}
                                  {eq.contractNumber && <span>📄 Ctr: {eq.contractNumber}</span>}
                                  {eq.street && <span className="truncate">🏠 {eq.street}</span>}
                                </div>
                              </div>
                            </div>

                            {/* Auto-fill Helper Button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAutoFillFromEquipment(eq);
                              }}
                              className="flex-shrink-0 text-[10px] px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-purple-100 dark:hover:bg-purple-900/50 text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-300 font-medium transition-colors flex items-center gap-1 cursor-pointer"
                              title="Remplir Nom Client, Contrat, Ville avec cet appareil"
                            >
                              <ArrowRight className="w-2.5 h-2.5" />
                              <span>Utiliser infos</span>
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Manual Input Addition */}
                  <div className="pt-1 flex items-center gap-2">
                    <input
                      type="text"
                      value={manualApparatusInput}
                      onChange={(e) => setManualApparatusInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddManualEquipments();
                        }
                      }}
                      placeholder="Ou taper un N° spécifique (ex: 953002, 770112)..."
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualEquipments}
                      className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-purple-600 hover:text-white text-slate-800 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Ajouter</span>
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Notes & Remarques
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Consignes de signature ou particularités du contrat..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none resize-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsNewModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold cursor-pointer"
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
