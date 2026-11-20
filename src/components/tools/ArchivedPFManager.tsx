import React, { useState, useMemo, useRef } from "react";
import {
  Archive,
  Search,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  RefreshCw,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building,
  MapPin,
  User,
  ShieldOff,
  Filter,
  ArrowRightLeft,
  X,
  Sparkles,
  Info,
  Check,
} from "lucide-react";
import { PFEquipment, ArchivedReason } from "../../types";
import { exportToExcel, readExcelFile } from "../../utils/excelExport";

interface ArchivedPFManagerProps {
  archivedEquipments: PFEquipment[];
  activeEquipments: PFEquipment[];
  onSaveArchived: (equipments: PFEquipment[]) => void;
  onRestoreToActive: (equipment: PFEquipment) => void;
  onTransferFromActive: (equipmentId: string, reason: ArchivedReason, exitDate: string, notes?: string) => void;
  onNavigateToTechnicalReport?: (equipment: PFEquipment) => void;
}

const ARCHIVE_REASONS: ArchivedReason[] = [
  "Hors Garantie",
  "Résilié",
  "Contrat Échu",
  "Démantelé",
  "Suspendu",
  "Autre",
];

export const ArchivedPFManager: React.FC<ArchivedPFManagerProps> = ({
  archivedEquipments,
  activeEquipments,
  onSaveArchived,
  onRestoreToActive,
  onTransferFromActive,
  onNavigateToTechnicalReport,
}) => {
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReasonFilter, setSelectedReasonFilter] = useState("all");
  const [selectedCityFilter, setSelectedCityFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<PFEquipment | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [equipmentToDelete, setEquipmentToDelete] = useState<PFEquipment | null>(null);
  const [isPurgeConfirmOpen, setIsPurgeConfirmOpen] = useState(false);

  // Notification state
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "error" | "info";
  }>({ show: false, message: "", type: "info" });

  const showNotification = (message: string, type: "success" | "error" | "info" = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: "", type: "info" });
    }, 4000);
  };

  // Transfer from active state
  const [transferSearch, setTransferSearch] = useState("");
  const [selectedActiveId, setSelectedActiveId] = useState("");
  const [transferReason, setTransferReason] = useState<ArchivedReason>("Hors Garantie");
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [transferNotes, setTransferNotes] = useState("");

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<PFEquipment>>({
    pfNumber: "",
    name: "",
    customer: "",
    customerAccount: "",
    contractNumber: "",
    serviceObject: "Ascenseur",
    type: "Schindler 3300",
    city: "Casablanca",
    street: "",
    assignedTechnician: "",
    archivedReason: "Hors Garantie",
    archivedDate: new Date().toISOString().slice(0, 10),
    archivedNotes: "",
    notes: "",
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cities list from archived items
  const uniqueCities = useMemo(() => {
    const set = new Set<string>();
    archivedEquipments.forEach((e) => {
      if (e.city) set.add(e.city);
    });
    return Array.from(set).sort();
  }, [archivedEquipments]);

  // Filtered archived equipments
  const filteredEquipments = useMemo(() => {
    return archivedEquipments.filter((eq) => {
      // Search
      if (searchTerm.trim()) {
        const t = searchTerm.toLowerCase();
        const matchSearch =
          eq.pfNumber?.toLowerCase().includes(t) ||
          eq.name?.toLowerCase().includes(t) ||
          eq.customer?.toLowerCase().includes(t) ||
          eq.customerAccount?.toLowerCase().includes(t) ||
          eq.city?.toLowerCase().includes(t) ||
          eq.street?.toLowerCase().includes(t) ||
          eq.assignedTechnician?.toLowerCase().includes(t) ||
          eq.archivedReason?.toLowerCase().includes(t) ||
          eq.archivedNotes?.toLowerCase().includes(t) ||
          eq.notes?.toLowerCase().includes(t);
        if (!matchSearch) return false;
      }

      // Reason filter
      if (selectedReasonFilter !== "all" && eq.archivedReason !== selectedReasonFilter) {
        return false;
      }

      // City filter
      if (selectedCityFilter !== "all" && eq.city !== selectedCityFilter) {
        return false;
      }

      return true;
    });
  }, [archivedEquipments, searchTerm, selectedReasonFilter, selectedCityFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = archivedEquipments.length;
    const horsGarantie = archivedEquipments.filter((e) => e.archivedReason === "Hors Garantie").length;
    const resilie = archivedEquipments.filter((e) => e.archivedReason === "Résilié" || e.archivedReason === "Contrat Échu").length;
    const demantele = archivedEquipments.filter((e) => e.archivedReason === "Démantelé").length;
    const citiesCount = uniqueCities.length;

    return { total, horsGarantie, resilie, demantele, citiesCount };
  }, [archivedEquipments, uniqueCities]);

  // Handle Save Form (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pfNumber?.trim() || !formData.name?.trim()) {
      alert("Veuillez renseigner au moins le N° PF et le Nom de l'appareil.");
      return;
    }

    if (editingEquipment) {
      // Update
      const updated = archivedEquipments.map((eq) =>
        eq.id === editingEquipment.id
          ? ({
              ...eq,
              ...formData,
              isArchived: true,
            } as PFEquipment)
          : eq
      );
      onSaveArchived(updated);
      showNotification(`Appareil ${formData.pfNumber} modifié avec succès !`, "success");
    } else {
      // Create
      const newEquipment: PFEquipment = {
        id: "arch-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7),
        pfNumber: formData.pfNumber.trim().toUpperCase(),
        name: formData.name.trim(),
        customer: formData.customer || formData.name,
        customerAccount: formData.customerAccount || "",
        contractNumber: formData.contractNumber || "",
        serviceObject: formData.serviceObject || "Ascenseur",
        type: formData.type || "Schindler 3300",
        city: formData.city || "Casablanca",
        street: formData.street || "",
        assignedTechnician: formData.assignedTechnician || "",
        archivedReason: formData.archivedReason || "Hors Garantie",
        archivedDate: formData.archivedDate || new Date().toISOString().slice(0, 10),
        archivedNotes: formData.archivedNotes || "",
        notes: formData.notes || "",
        isArchived: true,
        visits: {
          v1: false,
          v2: false,
          v3: false,
          v4: false,
          v5: false,
          v6: false,
          v7: false,
          v8: false,
          v9: false,
          v10: false,
          v11: false,
          cpsi: false,
        },
        nonConformities: [],
      };
      onSaveArchived([newEquipment, ...archivedEquipments]);
      showNotification(`Appareil ${newEquipment.pfNumber} ajouté à l'historique !`, "success");
    }

    setIsAddModalOpen(false);
    setEditingEquipment(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (eq: PFEquipment) => {
    setEditingEquipment(eq);
    setFormData({
      pfNumber: eq.pfNumber,
      name: eq.name,
      customer: eq.customer,
      customerAccount: eq.customerAccount,
      contractNumber: eq.contractNumber,
      serviceObject: eq.serviceObject,
      type: eq.type,
      city: eq.city,
      street: eq.street,
      assignedTechnician: eq.assignedTechnician,
      archivedReason: (eq.archivedReason as ArchivedReason) || "Hors Garantie",
      archivedDate: eq.archivedDate || new Date().toISOString().slice(0, 10),
      archivedNotes: eq.archivedNotes || "",
      notes: eq.notes || "",
    });
    setIsAddModalOpen(true);
  };

  // Handle Transfer from active park
  const handleExecuteTransfer = () => {
    if (!selectedActiveId) {
      alert("Veuillez sélectionner un appareil du parc actif à transférer.");
      return;
    }
    onTransferFromActive(selectedActiveId, transferReason, transferDate, transferNotes);
    setIsTransferModalOpen(false);
    setSelectedActiveId("");
    setTransferSearch("");
    setTransferNotes("");
    showNotification("Appareil transféré vers le parc hors garantie / résilié !", "success");
  };

  // Single Delete
  const handleConfirmDelete = () => {
    if (!equipmentToDelete) return;
    const updated = archivedEquipments.filter((e) => e.id !== equipmentToDelete.id);
    onSaveArchived(updated);
    setSelectedIds((prev) => prev.filter((id) => id !== equipmentToDelete.id));
    setEquipmentToDelete(null);
    showNotification("Appareil supprimé de l'historique.", "info");
  };

  // Batch Restore
  const handleBatchRestore = () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Voulez-vous restaurer ces ${selectedIds.length} appareils vers le Parc Actif ?`
      )
    ) {
      return;
    }

    selectedIds.forEach((id) => {
      const eq = archivedEquipments.find((e) => e.id === id);
      if (eq) onRestoreToActive(eq);
    });

    setSelectedIds([]);
    showNotification(`${selectedIds.length} appareils restaurés dans le Parc Actif !`, "success");
  };

  // Batch Delete
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    if (
      !window.confirm(
        `Êtes-vous sûr de vouloir supprimer définitivement ces ${selectedIds.length} appareils de l'historique ?`
      )
    ) {
      return;
    }
    const updated = archivedEquipments.filter((e) => !selectedIds.includes(e.id));
    onSaveArchived(updated);
    setSelectedIds([]);
    showNotification(`${selectedIds.length} appareils supprimés.`, "info");
  };

  // Purge All
  const handlePurgeAll = () => {
    onSaveArchived([]);
    setSelectedIds([]);
    setIsPurgeConfirmOpen(false);
    showNotification("Le registre historique a été purgé.", "info");
  };

  // Export to Excel
  const handleExportExcel = () => {
    const targetEquipments = filteredEquipments;
    if (targetEquipments.length === 0) {
      alert("Aucun appareil à exporter dans l'historique.");
      return;
    }

    const exportRows = targetEquipments.map((eq) => ({
      "N° Appareil (PF)": eq.pfNumber,
      "Nom Appareil / Site": eq.name,
      "Client / Syndic": eq.customer || eq.customerAccount || "",
      "Compte Client": eq.customerAccount || "",
      "N° Contrat d'Origine": eq.contractNumber || "",
      "Type Appareil": eq.type || eq.serviceObject || "",
      "Ville": eq.city || "",
      "Adresse / Rue": eq.street || "",
      "Technicien Référent": eq.assignedTechnician || "",
      "Statut / Motif": eq.archivedReason || "Hors Garantie",
      "Date de Sortie / Fin": eq.archivedDate || "",
      "Remarques Historique": eq.archivedNotes || eq.notes || "",
    }));

    const dateStr = new Date().toISOString().slice(0, 10);
    exportToExcel(
      [{ sheetName: "Parc Historique HG & Résilié", data: exportRows }],
      `Parc_Historique_HorsGarantie_Resilie_${dateStr}.xlsx`
    );
    showNotification(`Export Excel réussi (${targetEquipments.length} appareils)`, "success");
  };

  // Export to CSV
  const handleExportCsv = () => {
    const targetEquipments = filteredEquipments;
    if (targetEquipments.length === 0) {
      alert("Aucun appareil à exporter.");
      return;
    }

    const headers = [
      "N° PF",
      "Nom Appareil",
      "Client",
      "Ville",
      "Adresse",
      "Type",
      "Technicien",
      "Motif",
      "Date Sortie",
      "Remarques",
    ];

    const rows = targetEquipments.map((eq) => [
      `"${eq.pfNumber || ""}"`,
      `"${(eq.name || "").replace(/"/g, '""')}"`,
      `"${(eq.customer || eq.customerAccount || "").replace(/"/g, '""')}"`,
      `"${(eq.city || "").replace(/"/g, '""')}"`,
      `"${(eq.street || "").replace(/"/g, '""')}"`,
      `"${(eq.type || eq.serviceObject || "").replace(/"/g, '""')}"`,
      `"${(eq.assignedTechnician || "").replace(/"/g, '""')}"`,
      `"${(eq.archivedReason || "Hors Garantie").replace(/"/g, '""')}"`,
      `"${eq.archivedDate || ""}"`,
      `"${(eq.archivedNotes || eq.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `Parc_Historique_HorsGarantie_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  };

  // Helper to extract fields flexibly regardless of column naming / casing / accents
  const getField = (row: Record<string, any>, ...patterns: (string | RegExp)[]): any => {
    if (!row) return undefined;
    for (const p of patterns) {
      if (typeof p === "string" && row[p] !== undefined && row[p] !== null && String(row[p]).trim() !== "") {
        return row[p];
      }
    }
    const rowKeys = Object.keys(row);
    for (const p of patterns) {
      for (const key of rowKeys) {
        const val = row[key];
        if (val === undefined || val === null || String(val).trim() === "") continue;
        const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (typeof p === "string") {
          const cleanPattern = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          if (cleanKey === cleanPattern || cleanKey.includes(cleanPattern)) {
            return val;
          }
        } else if (p.test(key) || p.test(cleanKey)) {
          return val;
        }
      }
    }
    return undefined;
  };

  // Import from Excel / CSV
  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed: any = await readExcelFile(file);
      const rows: Record<string, any>[] = Array.isArray(parsed)
        ? parsed
        : parsed?.primaryRows || [];

      if (!rows || rows.length === 0) {
        setNotification({
          show: true,
          message: "Le fichier sélectionné est vide ou aucune ligne de données n'a été détectée.",
          type: "error",
        });
        return;
      }

      const imported: PFEquipment[] = [];
      rows.forEach((row, index) => {
        const pf =
          getField(row, "N° Appareil (PF)", "N° Appareil", "Appareil", "N° PF", "PF", "pfNumber", "Numéro", "Matricule", "Code") ||
          `PF-HG-${Date.now()}-${index + 1}`;

        const name =
          getField(row, "Nom Appareil / Site", "Nom Appareil", "Nom", "Site", "name", "Désignation") ||
          `Appareil ${pf}`;

        const customer =
          getField(row, "Client / Syndic", "Client", "Syndic", "Customer", "customer", "Compte Client") ||
          name;

        const customerAccount =
          getField(row, "Customer Account", "Customer account", "Compte Client", "Code Client", "customerAccount") ||
          "";

        const contractNumber =
          getField(row, "N° Contrat", "Contrat", "N° Contrat Maintenance", "contractNumber") ||
          "";

        const city = getField(row, "Ville", "City", "city", "Secteur") || "Casablanca";
        const street = getField(row, "Adresse / Rue", "Adresse", "Street", "street") || "";
        const type = getField(row, "Type Appareil", "Type", "type", "Service Object") || "Schindler 3300";
        const tech = getField(row, "Technicien Référent", "Technicien", "Technicien Assigné", "assignedTechnician") || "";
        const reason =
          getField(row, "Statut / Motif", "Motif Sortie", "Motif", "Statut", "archivedReason") ||
          "Hors Garantie";
        const exitDate =
          getField(row, "Date de Sortie / Fin", "Date Sortie", "Date", "archivedDate", "Date Résiliation") ||
          new Date().toISOString().slice(0, 10);
        const notes =
          getField(row, "Remarques Historique", "Remarques", "Notes", "notes", "Observations") ||
          "";

        imported.push({
          id: "arch-" + Date.now() + "-" + index,
          pfNumber: String(pf).trim().toUpperCase(),
          name: String(name).trim(),
          customer: String(customer).trim(),
          customerAccount: String(customerAccount).trim(),
          contractNumber: String(contractNumber).trim(),
          city: String(city).trim(),
          street: String(street).trim(),
          type: String(type).trim(),
          serviceObject: "Ascenseur",
          assignedTechnician: String(tech).trim(),
          archivedReason: reason,
          archivedDate: String(exitDate).trim(),
          archivedNotes: String(notes).trim(),
          isArchived: true,
          visits: {
            v1: false,
            v2: false,
            v3: false,
            v4: false,
            v5: false,
            v6: false,
            v7: false,
            v8: false,
            v9: false,
            v10: false,
            v11: false,
            cpsi: false,
          },
          nonConformities: [],
        });
      });

      if (imported.length === 0) {
        setNotification({
          show: true,
          message: "Aucun appareil valide trouvé dans le fichier.",
          type: "error",
        });
        return;
      }

      // Merge avoiding duplicate PF in archive
      const existingPfSet = new Set(archivedEquipments.map((a) => a.pfNumber.toUpperCase()));
      const newItems = imported.filter((item) => !existingPfSet.has(item.pfNumber.toUpperCase()));
      const duplicatesCount = imported.length - newItems.length;

      const merged = [...newItems, ...archivedEquipments];
      onSaveArchived(merged);

      setNotification({
        show: true,
        message: `${newItems.length} appareil(s) importé(s) dans le duplicata hors garantie.${
          duplicatesCount > 0 ? ` (${duplicatesCount} doublons ignorés)` : ""
        }`,
        type: "success",
      });
    } catch (err: any) {
      console.error(err);
      setNotification({
        show: true,
        message: `Erreur lors de l'import : ${err.message || "format invalide"}`,
        type: "error",
      });
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredEquipments.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredEquipments.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Active equipments available for transfer
  const activeEquipmentsForTransfer = useMemo(() => {
    const archivedPfSet = new Set(archivedEquipments.map((e) => e.pfNumber));
    const available = activeEquipments.filter((e) => !archivedPfSet.has(e.pfNumber));
    if (!transferSearch.trim()) return available;
    const t = transferSearch.toLowerCase();
    return available.filter(
      (e) =>
        e.pfNumber?.toLowerCase().includes(t) ||
        e.name?.toLowerCase().includes(t) ||
        e.city?.toLowerCase().includes(t) ||
        e.customer?.toLowerCase().includes(t) ||
        e.assignedTechnician?.toLowerCase().includes(t)
    );
  }, [activeEquipments, archivedEquipments, transferSearch]);

  const getReasonBadge = (reason?: string) => {
    switch (reason) {
      case "Hors Garantie":
        return "bg-amber-500/20 text-amber-300 border-amber-500/40";
      case "Résilié":
        return "bg-rose-500/20 text-rose-300 border-rose-500/40";
      case "Contrat Échu":
        return "bg-orange-500/20 text-orange-300 border-orange-500/40";
      case "Démantelé":
        return "bg-purple-500/20 text-purple-300 border-purple-500/40";
      case "Suspendu":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/40";
      default:
        return "bg-slate-700/50 text-slate-300 border-slate-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {notification.show && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : notification.type === "error"
              ? "bg-rose-950/90 border-rose-500/50 text-rose-200"
              : "bg-slate-900/90 border-slate-700 text-slate-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification({ show: false, message: "", type: "info" })}
            className="text-slate-400 hover:text-white ml-3"
          >
            ✕
          </button>
        </div>
      )}

      {/* Banner & Information */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-amber-950/20 to-slate-900 border border-amber-500/30 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shrink-0">
            <Archive className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Duplicata du Parc PF : Appareils Hors Garantie & Résiliés
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Historique & Rapports
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
              Conservez le duplicata exact des spécifications techniques de tous vos appareils sortis du contrat actif (hors garantie, résiliations, démantèlements).
              <strong className="text-amber-200 ml-1">
                Tous ces appareils restent disponibles et sélectionnables lors de la rédaction de vos Rapports Techniques et devis.
              </strong>
            </p>
          </div>
        </div>

        {/* Quick transfer button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 text-amber-200 border border-amber-500/40 text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-amber-400" />
            <span>Transférer depuis le Parc Actif</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Archivé</p>
            <p className="text-xl font-extrabold text-white mt-0.5 font-mono">{stats.total}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
            <Archive className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-900/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-amber-400 font-medium">Hors Garantie</p>
            <p className="text-xl font-extrabold text-amber-300 mt-0.5 font-mono">{stats.horsGarantie}</p>
          </div>
          <div className="p-2 rounded-lg bg-amber-900/40 text-amber-300">
            <ShieldOff className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-900/30 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-rose-400 font-medium">Résiliés / Échus</p>
            <p className="text-xl font-extrabold text-rose-300 mt-0.5 font-mono">{stats.resilie}</p>
          </div>
          <div className="p-2 rounded-lg bg-rose-900/40 text-rose-300">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Villes Couvertes</p>
            <p className="text-xl font-extrabold text-cyan-300 mt-0.5 font-mono">{stats.citiesCount}</p>
          </div>
          <div className="p-2 rounded-lg bg-cyan-900/40 text-cyan-300">
            <MapPin className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Add equipment */}
          <button
            type="button"
            onClick={() => {
              setEditingEquipment(null);
              setFormData({
                pfNumber: "",
                name: "",
                customer: "",
                customerAccount: "",
                contractNumber: "",
                serviceObject: "Ascenseur",
                type: "Schindler 3300",
                city: "Casablanca",
                street: "",
                assignedTechnician: "",
                archivedReason: "Hors Garantie",
                archivedDate: new Date().toISOString().slice(0, 10),
                archivedNotes: "",
                notes: "",
              });
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter un Appareil</span>
          </button>

          {/* Import Excel */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileImport}
            accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
                fileInputRef.current.click();
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
            title="Importer des appareils hors garantie via fichier Excel ou CSV"
          >
            <Upload className="w-3.5 h-3.5 text-slate-400" />
            <span>Importer Excel</span>
          </button>

          {/* Export Excel */}
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold transition-colors cursor-pointer"
            title="Exporter le registre historique au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exporter Excel (.xlsx)</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>CSV</span>
          </button>

          {/* Purge */}
          {archivedEquipments.length > 0 && (
            <button
              type="button"
              onClick={() => setIsPurgeConfirmOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purger l'Historique</span>
            </button>
          )}
        </div>

        {/* Batch action indicator */}
        {selectedIds.length > 0 && (
          <div className="flex items-center gap-2 bg-amber-950/80 border border-amber-500/50 px-3 py-1.5 rounded-lg text-xs animate-in fade-in">
            <span className="text-amber-200 font-bold">
              {selectedIds.length} sélectionné(s)
            </span>
            <button
              type="button"
              onClick={handleBatchRestore}
              className="px-2 py-0.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restaurer vers Parc Actif</span>
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-2 py-0.5 rounded bg-rose-700 hover:bg-rose-600 text-white text-[11px] font-bold transition-colors cursor-pointer flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Supprimer</span>
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5">
        {/* Full-text search */}
        <div className="md:col-span-6 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par N° PF, Nom appareil, Client, Ville, Technicien, Motif..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
            >
              ✕
            </button>
          )}
        </div>

        {/* Reason Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedReasonFilter}
            onChange={(e) => setSelectedReasonFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
          >
            <option value="all">Tous les Statuts / Motifs ({archivedEquipments.length})</option>
            {ARCHIVE_REASONS.map((r) => (
              <option key={r} value={r}>
                {r} ({archivedEquipments.filter((e) => e.archivedReason === r).length})
              </option>
            ))}
          </select>
        </div>

        {/* City Filter */}
        <div className="md:col-span-3">
          <select
            value={selectedCityFilter}
            onChange={(e) => setSelectedCityFilter(e.target.value)}
            className="w-full py-2 px-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all cursor-pointer"
          >
            <option value="all">Toutes les Villes ({uniqueCities.length})</option>
            {uniqueCities.map((c) => (
              <option key={c} value={c}>
                {c} ({archivedEquipments.filter((e) => e.city === c).length})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-semibold">
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredEquipments.length > 0 &&
                      selectedIds.length === filteredEquipments.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="p-3">N° Appareil (PF)</th>
                <th className="p-3">Nom Appareil / Site</th>
                <th className="p-3">Client / Syndic</th>
                <th className="p-3">Ville & Adresse</th>
                <th className="p-3">Type & Service</th>
                <th className="p-3">Technicien Référent</th>
                <th className="p-3">Statut / Motif</th>
                <th className="p-3">Date Sortie</th>
                <th className="p-3">Remarques</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {filteredEquipments.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-10 text-center">
                    <div className="max-w-md mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mx-auto">
                        <Archive className="w-6 h-6" />
                      </div>
                      <p className="text-sm font-bold text-white">
                        {archivedEquipments.length === 0
                          ? "Le parc historique est actuellement vide"
                          : "Aucun appareil ne correspond à votre recherche"}
                      </p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {archivedEquipments.length === 0
                          ? "Ce duplicata vous permet d'enregistrer les appareils hors garantie, résiliés ou démantelés afin de garder un historique complet pour vos rapports techniques."
                          : "Essayez de modifier vos filtres ou termes de recherche."}
                      </p>

                      {archivedEquipments.length === 0 && (
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => setIsTransferModalOpen(true)}
                            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Transférer depuis le Parc Actif</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEquipment(null);
                              setIsAddModalOpen(true);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5 text-amber-400" />
                            <span>Ajouter Manuellement</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEquipments.map((eq) => {
                  const isSelected = selectedIds.includes(eq.id);
                  return (
                    <tr
                      key={eq.id}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isSelected ? "bg-amber-950/20" : ""
                      }`}
                    >
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectOne(eq.id)}
                          className="rounded border-slate-700 bg-slate-800 text-amber-500 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* PF Number */}
                      <td className="p-3 font-mono font-bold text-white whitespace-nowrap">
                        <span className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-amber-300">
                          {eq.pfNumber}
                        </span>
                      </td>

                      {/* Equipment Name */}
                      <td className="p-3 font-semibold text-slate-200 max-w-[200px] truncate" title={eq.name}>
                        {eq.name}
                      </td>

                      {/* Customer */}
                      <td className="p-3 text-slate-300 max-w-[180px] truncate" title={eq.customer || eq.customerAccount}>
                        {eq.customer || eq.customerAccount || "—"}
                      </td>

                      {/* City & Address */}
                      <td className="p-3 text-slate-400">
                        <div className="font-medium text-slate-300">{eq.city || "—"}</div>
                        {eq.street && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                            {eq.street}
                          </div>
                        )}
                      </td>

                      {/* Type */}
                      <td className="p-3 text-slate-400 whitespace-nowrap">
                        <span className="text-slate-300 font-medium">{eq.type || "Schindler"}</span>
                        <div className="text-[10px] text-slate-500">{eq.serviceObject || "Ascenseur"}</div>
                      </td>

                      {/* Technician */}
                      <td className="p-3 text-slate-300 whitespace-nowrap">
                        {eq.assignedTechnician ? (
                          <div className="flex items-center gap-1.5">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>{eq.assignedTechnician}</span>
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Status / Reason */}
                      <td className="p-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${getReasonBadge(
                            eq.archivedReason
                          )}`}
                        >
                          {eq.archivedReason || "Hors Garantie"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="p-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {eq.archivedDate || "—"}
                      </td>

                      {/* Notes */}
                      <td className="p-3 text-slate-400 max-w-[160px] truncate" title={eq.archivedNotes || eq.notes}>
                        {eq.archivedNotes || eq.notes || "—"}
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Create Tech Report Shortcut */}
                          {onNavigateToTechnicalReport && (
                            <button
                              type="button"
                              onClick={() => onNavigateToTechnicalReport(eq)}
                              className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-300 border border-red-800/40 transition-colors cursor-pointer"
                              title="Rédiger un Rapport Technique avec cet appareil"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Restore to Active */}
                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Restaurer l'appareil ${eq.pfNumber} dans le Parc Actif ?`
                                )
                              ) {
                                onRestoreToActive(eq);
                                showNotification(`Appareil ${eq.pfNumber} réactivé dans le Parc !`, "success");
                              }
                            }}
                            className="p-1.5 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/40 transition-colors cursor-pointer"
                            title="Restaurer cet appareil dans le Parc Actif"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(eq)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors cursor-pointer"
                            title="Modifier les détails"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => setEquipmentToDelete(eq)}
                            className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors cursor-pointer"
                            title="Supprimer définitivement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <div>
            Affichage de <strong className="text-white">{filteredEquipments.length}</strong> sur{" "}
            <strong className="text-white">{archivedEquipments.length}</strong> appareils archivés
          </div>
          <div className="text-[11px] text-slate-500">
            Duplicata synchronisé avec le Générateur de Rapports Techniques
          </div>
        </div>
      </div>

      {/* MODAL: ADD / EDIT EQUIPMENT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    {editingEquipment
                      ? `Modifier l'appareil ${editingEquipment.pfNumber}`
                      : "Ajouter un Appareil Hors Garantie / Résilié"}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Registre historique pour les rapports techniques et devis
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddModalOpen(false);
                  setEditingEquipment(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* PF Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    N° Appareil (PF) <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: PF-78012 ou HG-104"
                    value={formData.pfNumber || ""}
                    onChange={(e) => setFormData({ ...formData, pfNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Nom de l'Appareil / Site <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Résidence Al Firdaous - Asc A"
                    value={formData.name || ""}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Client / Syndic */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Client / Syndic / Compte
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Syndic Al Firdaous"
                    value={formData.customer || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        customer: e.target.value,
                        customerAccount: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Type d'Appareil
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Schindler 3300 (Traction MRL)"
                    value={formData.type || ""}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* City */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Casablanca, Rabat, Marrakech..."
                    value={formData.city || ""}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Street */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adresse / Rue
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 45 Boulevard d'Anfa"
                    value={formData.street || ""}
                    onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Technician */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Technicien Référent (Dernier connu)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Karim Bennani"
                    value={formData.assignedTechnician || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, assignedTechnician: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Contract Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Ancien N° de Contrat
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CTR-2024-889"
                    value={formData.contractNumber || ""}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Statut / Motif d'Archivage <span className="text-amber-400">*</span>
                  </label>
                  <select
                    value={formData.archivedReason || "Hors Garantie"}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        archivedReason: e.target.value as ArchivedReason,
                      })
                    }
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    {ARCHIVE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Exit Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date de Sortie / Fin de Garantie
                  </label>
                  <input
                    type="date"
                    value={formData.archivedDate || ""}
                    onChange={(e) => setFormData({ ...formData, archivedDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarques & Contexte Historique
                </label>
                <textarea
                  rows={3}
                  placeholder="Détails sur la résiliation, motif de non-renouvellement, interventions antérieures, etc."
                  value={formData.archivedNotes || formData.notes || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      archivedNotes: e.target.value,
                      notes: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingEquipment(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingEquipment ? "Mettre à jour" : "Ajouter à l'Historique"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER FROM ACTIVE PARK */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Transférer un Appareil du Parc Actif vers l'Historique
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Déplace l'appareil pour le marquer hors garantie ou résilié
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTransferModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Search Active Equipment */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  1. Sélectionner l'Appareil du Parc Actif
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrer par N° PF, nom, client, ville..."
                    value={transferSearch}
                    onChange={(e) => setTransferSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-800 rounded-xl bg-slate-950 divide-y divide-slate-800/60">
                  {activeEquipmentsForTransfer.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">
                      Aucun appareil disponible dans le parc actif.
                    </div>
                  ) : (
                    activeEquipmentsForTransfer.slice(0, 50).map((eq) => {
                      const isSelected = selectedActiveId === eq.id;
                      return (
                        <button
                          key={eq.id}
                          type="button"
                          onClick={() => setSelectedActiveId(eq.id)}
                          className={`w-full p-2.5 text-left flex items-center justify-between text-xs transition-colors cursor-pointer hover:bg-slate-800/60 ${
                            isSelected ? "bg-amber-950/40 border-l-4 border-l-amber-500" : ""
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-amber-300">
                                {eq.pfNumber}
                              </span>
                              <span className="text-white font-medium truncate max-w-[200px]">
                                {eq.name}
                              </span>
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{eq.city || "Maroc"}</span>
                              <span>•</span>
                              <span>{eq.customer || eq.customerAccount || "Client"}</span>
                              {eq.assignedTechnician && (
                                <>
                                  <span>•</span>
                                  <span>Tech: {eq.assignedTechnician}</span>
                                </>
                              )}
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Transfer Details */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Motif de Transfert
                  </label>
                  <select
                    value={transferReason}
                    onChange={(e) => setTransferReason(e.target.value as ArchivedReason)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none cursor-pointer"
                  >
                    {ARCHIVE_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Date d'Effet
                  </label>
                  <input
                    type="date"
                    value={transferDate}
                    onChange={(e) => setTransferDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Remarque / Motif Détaillé (Optionnel)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Fin de période de garantie de 2 ans / Refus renouvellement contrat"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsTransferModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!selectedActiveId}
                  onClick={handleExecuteTransfer}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <ArrowRightLeft className="w-4 h-4" />
                  <span>Confirmer le Transfert</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE CONFIRMATION */}
      {equipmentToDelete && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Supprimer l'appareil de l'historique ?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Appareil : <strong className="text-white">{equipmentToDelete.pfNumber}</strong> ({equipmentToDelete.name})
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Cette action supprimera définitivement cet appareil du registre historique. Il ne sera plus suggéré dans les rapports techniques.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEquipmentToDelete(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PURGE ALL CONFIRMATION */}
      {isPurgeConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Purger tout le parc historique ?</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  {archivedEquipments.length} appareils seront supprimés du registre.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Attention : Cette opération réinitialisera complètement le registre des appareils hors garantie et résiliés. Le parc actif ne sera pas affecté.
            </p>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPurgeConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handlePurgeAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
