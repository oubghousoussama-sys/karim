import React, { useState } from "react";
import { RegieRequest, RegieItemRequested, StockItem, Quote, PFEquipment, PartStatus } from "../../types";
import { INITIAL_QUOTES } from "../../data/mockFinanceData";
import { INITIAL_PF_EQUIPMENTS } from "../../data/mockPFData";
import {
  FileText,
  Plus,
  Trash2,
  Edit,
  CheckCircle2,
  Clock,
  XCircle,
  AlertTriangle,
  User,
  Wrench,
  Building,
  MapPin,
  Calendar,
  Sparkles,
  DollarSign,
  Printer,
  BookOpen,
  Send,
  PenTool,
  TrendingUp,
  Boxes
} from "lucide-react";

interface RegieSheetManagerProps {
  stockItems: StockItem[];
  onDeductStock: (deductions: { skuOrId: string; qty: number }[]) => void;
  onRefreshStock?: () => void;
}

const TECHNICIANS = [
  "Karim Bennani",
  "Youssef Alami",
  "Mehdi Tazi",
  "Omar El Fassi",
  "Nabil Chraibi",
  "Tarik Mansouri"
];

const AGENCIES = ["FES", "CASABLANCA", "RABAT", "MARRAKECH", "TANGER", "AGADIR"];

const INITIAL_REGIE_REQUESTS: RegieRequest[] = [
  {
    id: "reg-101",
    requestNumber: "REG-2026-001",
    technician: "Karim Bennani",
    date: "2026-09-02",
    agency: "FES",
    affaireOrPfNumber: "1001999",
    clientName: "NEW CAMPUS COMPANY",
    address: "Campus Universitaire Fès Saïss",
    billingType: "Sous Devis",
    status: "Reçue / Clôturée",
    quoteNumber: "R1009850",
    quoteAmountHT: 15103.64,
    items: [
      {
        id: "item-1",
        stockItemId: "1",
        identificationNumber: "SCH-77119-A",
        designation: "Batterie 12V 7AH Schindler 3300",
        quantity: 1,
        unitCostHT: 350,
        sellingPriceHT: 850
      },
      {
        id: "item-2",
        stockItemId: "2",
        identificationNumber: "SCH-88120-B",
        designation: "Isolant Garniture Coulisseau I10 BFK16",
        quantity: 2,
        unitCostHT: 180,
        sellingPriceHT: 450
      }
    ],
    workNature: "Réparation suite NC",
    observations: "Remplacement préventif suite constat lors de la visite CPSI. Matériel installé et testé avec succès.",
    signatureDataUrl: "signed-tech-karim",
    closedAt: "2026-09-02"
  },
  {
    id: "reg-102",
    requestNumber: "REG-2026-002",
    technician: "Youssef Alami",
    date: "2026-08-28",
    agency: "FES",
    affaireOrPfNumber: "1005217",
    clientName: "SOCIETE DES CENTRES COMMERCIAUX DE FES",
    address: "Boulevard Allal Ben Abdellah, Fès",
    billingType: "Sous Devis",
    status: "En attente",
    quoteNumber: "R1008825",
    quoteAmountHT: 91094.22,
    items: [
      {
        id: "item-3",
        stockItemId: "4",
        identificationNumber: "SCH-99001-C",
        designation: "S MARCHE 1000/R76 Ton Naturel 1PC Escalier",
        quantity: 1,
        unitCostHT: 12000,
        sellingPriceHT: 25000
      }
    ],
    workNature: "Dépannage",
    observations: "Remplacement marche endommagée sur escalier mécanique central."
  },
  {
    id: "reg-103",
    requestNumber: "REG-2026-003",
    technician: "Mehdi Tazi",
    date: "2026-08-22",
    agency: "CASABLANCA",
    affaireOrPfNumber: "1004127",
    clientName: "SYNDIC RESIDENCE CHAIMAE",
    address: "Résidence Chaimae N° 12, Casablanca",
    billingType: "Sous Devis",
    status: "Approuvée",
    quoteNumber: "R1009787",
    quoteAmountHT: 4106.00,
    items: [
      {
        id: "item-4",
        stockItemId: "3",
        identificationNumber: "SCH-5100-Q",
        designation: "Circuit Carte Électronique SDIC 51.Q*",
        quantity: 1,
        unitCostHT: 1800,
        sellingPriceHT: 4106
      }
    ],
    workNature: "Réparation suite NC",
    observations: "Anomalie carte SDIC suite surtension électrique."
  }
];

export const RegieSheetManager: React.FC<RegieSheetManagerProps> = ({
  stockItems,
  onDeductStock,
}) => {
  const [requests, setRequests] = useState<RegieRequest[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_regie_requests_v1");
      return saved ? JSON.parse(saved) : INITIAL_REGIE_REQUESTS;
    } catch {
      return INITIAL_REGIE_REQUESTS;
    }
  });

  const [quotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [equipments] = useState<PFEquipment[]>(INITIAL_PF_EQUIPMENTS);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [techFilter, setTechFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [editingRequest, setEditingRequest] = useState<RegieRequest | null>(null);
  const [viewingRequest, setViewingRequest] = useState<RegieRequest | null>(null);
  const [showCatalogModal, setShowCatalogModal] = useState<boolean>(false);

  // Form State for Creation / Editing
  const [formData, setFormData] = useState<Partial<RegieRequest>>({
    requestNumber: `REG-2026-${Math.floor(100 + Math.random() * 900)}`,
    technician: TECHNICIANS[0],
    date: new Date().toISOString().slice(0, 10),
    agency: "FES",
    affaireOrPfNumber: "",
    clientName: "",
    address: "",
    billingType: "Sous Devis",
    status: "Approuvée",
    quoteNumber: "",
    quoteAmountHT: 0,
    workNature: "Maintenance",
    observations: "",
    items: [
      {
        id: `item-${Date.now()}-1`,
        identificationNumber: "SCH-77119-A",
        designation: "Batterie 12V 7AH Schindler 3300",
        quantity: 1,
        unitCostHT: 350
      }
    ],
    signatureDataUrl: "signed-admin"
  });

  const saveRequests = (newRequests: RegieRequest[]) => {
    setRequests(newRequests);
    try {
      localStorage.setItem("toolbox_regie_requests_v1", JSON.stringify(newRequests));
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize consumed items into Parts Consumption Tracker (Finance)
  const syncToConsumptionTracker = (regie: RegieRequest) => {
    try {
      const existingStr = localStorage.getItem("toolbox_parts_v1");
      const existingParts = existingStr ? JSON.parse(existingStr) : [];

      const newEntries = regie.items.map((item, idx) => ({
        id: `regie-cons-${regie.id}-${idx}`,
        reference: item.identificationNumber || "REF-REGIE",
        designation: item.designation,
        pfNumber: regie.affaireOrPfNumber || "N/A",
        clientName: regie.clientName,
        quantity: item.quantity,
        unitCostHT: item.unitCostHT,
        totalCostHT: item.unitCostHT * item.quantity,
        sellingPriceHT: item.sellingPriceHT || (regie.quoteAmountHT ? regie.quoteAmountHT / regie.items.length : item.unitCostHT * 2),
        orderDate: regie.date,
        deliveryDate: regie.closedAt || new Date().toISOString().slice(0, 10),
        installationDate: regie.closedAt || new Date().toISOString().slice(0, 10),
        supplier: "Stock Interne Schindler",
        status: "Consommée / Installée" as PartStatus,
        technician: regie.technician,
        notes: `Issu de la Fiche de Régie N° ${regie.requestNumber} (${regie.workNature})`
      }));

      // Merge avoiding duplicates by id
      const filteredOld = existingParts.filter(
        (p: any) => !newEntries.some((n) => n.id === p.id)
      );
      const updatedParts = [...newEntries, ...filteredOld];

      localStorage.setItem("toolbox_parts_v1", JSON.stringify(updatedParts));
    } catch (e) {
      console.error("Failed to sync parts consumption:", e);
    }
  };

  // Handle Equipment/PF Selection (Auto-fill client & address)
  const handleSelectEquipment = (pfNum: string) => {
    const eq = equipments.find((e) => e.pfNumber === pfNum);
    const linkedQuote = quotes.find((q) => q.customerAccount === eq?.customerAccount || q.pfNumber === pfNum);

    setFormData((prev) => ({
      ...prev,
      affaireOrPfNumber: pfNum,
      clientName: eq ? eq.name : prev.clientName,
      address: eq ? `${eq.street}, ${eq.city}` : prev.address,
      quoteNumber: linkedQuote ? linkedQuote.quoteNumber : prev.quoteNumber,
      quoteAmountHT: linkedQuote ? linkedQuote.amountHT : prev.quoteAmountHT,
    }));
  };

  // Handle Quote Selection
  const handleSelectQuote = (qNum: string) => {
    const q = quotes.find((item) => item.quoteNumber === qNum);
    if (!q) return;

    setFormData((prev) => ({
      ...prev,
      quoteNumber: q.quoteNumber,
      quoteAmountHT: q.amountHT,
      clientName: q.clientName || prev.clientName,
      affaireOrPfNumber: q.pfNumber || q.customerAccount || prev.affaireOrPfNumber
    }));
  };

  // Add Item to Form
  const handleAddFormItem = () => {
    const newItem: RegieItemRequested = {
      id: `item-${Date.now()}-${Math.random()}`,
      identificationNumber: "SCH-NEW",
      designation: "Nouvelle Pièce",
      quantity: 1,
      unitCostHT: 100
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
  };

  // Select Item from Stock Catalog into Form
  const handlePickStockItem = (stockItem: StockItem) => {
    const newItem: RegieItemRequested = {
      id: `item-${Date.now()}-${Math.random()}`,
      stockItemId: stockItem.id,
      identificationNumber: stockItem.sku,
      designation: stockItem.name,
      quantity: 1,
      unitCostHT: stockItem.unitCost
    };
    setFormData((prev) => ({
      ...prev,
      items: [...(prev.items || []), newItem]
    }));
    setShowCatalogModal(false);
  };

  // Remove Item from Form
  const handleRemoveFormItem = (itemId: string) => {
    setFormData((prev) => ({
      ...prev,
      items: (prev.items || []).filter((i) => i.id !== itemId)
    }));
  };

  // Save / Create Fiche de Régie
  const handleSaveRegie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.technician || !formData.requestNumber) return;

    const reqToSave: RegieRequest = {
      id: editingRequest ? editingRequest.id : `reg-${Date.now()}`,
      requestNumber: formData.requestNumber || `REG-2026-${Math.floor(100 + Math.random() * 900)}`,
      technician: formData.technician || TECHNICIANS[0],
      date: formData.date || new Date().toISOString().slice(0, 10),
      agency: formData.agency || "FES",
      affaireOrPfNumber: formData.affaireOrPfNumber || "A00 9136-006",
      clientName: formData.clientName || "CLIENT SCHINDLER",
      address: formData.address || "ADRESSE CHANTIER",
      billingType: formData.billingType || "Sous Devis",
      status: formData.status || "En attente",
      quoteNumber: formData.quoteNumber,
      quoteAmountHT: formData.quoteAmountHT || 0,
      items: formData.items && formData.items.length > 0 ? formData.items : [],
      workNature: formData.workNature || "Maintenance",
      observations: formData.observations || "",
      signatureDataUrl: formData.signatureDataUrl || "signed-ok",
      closedAt: formData.status === "Reçue / Clôturée" ? new Date().toISOString().slice(0, 10) : undefined
    };

    let updated: RegieRequest[];
    if (editingRequest) {
      updated = requests.map((r) => (r.id === editingRequest.id ? reqToSave : r));
    } else {
      updated = [reqToSave, ...requests];
    }

    saveRequests(updated);

    // If Clôturée, deduct stock & sync consumption
    if (reqToSave.status === "Reçue / Clôturée") {
      const deductions = reqToSave.items.map((it) => ({
        skuOrId: it.stockItemId || it.identificationNumber,
        qty: it.quantity
      }));
      onDeductStock(deductions);
      syncToConsumptionTracker(reqToSave);
    }

    setShowCreateModal(false);
    setEditingRequest(null);
  };

  // Change Status Directly (e.g. Close request)
  const handleChangeStatus = (request: RegieRequest, newStatus: RegieRequest["status"]) => {
    const closedDate = newStatus === "Reçue / Clôturée" ? new Date().toISOString().slice(0, 10) : undefined;
    const updatedReq: RegieRequest = { ...request, status: newStatus, closedAt: closedDate };
    const updated = requests.map((r) => (r.id === request.id ? updatedReq : r));
    saveRequests(updated);

    if (newStatus === "Reçue / Clôturée") {
      const deductions = request.items.map((it) => ({
        skuOrId: it.stockItemId || it.identificationNumber,
        qty: it.quantity
      }));
      onDeductStock(deductions);
      syncToConsumptionTracker(updatedReq);
      alert(`Fiche N° ${request.requestNumber} Clôturée avec succès !\n\n1. Le stock a été automatiquement déduit.\n2. La pièce a été transférée dans la Consommation de Pièces.\n3. Le gain net a été comptabilisé sur le devis.`);
    }
  };

  const handleDeleteRequest = (id: string) => {
    if (confirm("Voulez-vous supprimer cette Fiche de Régie ?")) {
      saveRequests(requests.filter((r) => r.id !== id));
    }
  };

  // Calculations
  const filteredRequests = requests.filter((r) => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchTech = techFilter === "all" || r.technician === techFilter;
    const matchSearch =
      r.requestNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.affaireOrPfNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.quoteNumber && r.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchStatus && matchTech && matchSearch;
  });

  const totalRequests = requests.length;
  const pendingRequests = requests.filter((r) => r.status === "En attente").length;
  const closedRequests = requests.filter((r) => r.status === "Reçue / Clôturée").length;

  const totalPartsCost = requests
    .filter((r) => r.status === "Reçue / Clôturée")
    .reduce((acc, r) => acc + r.items.reduce((sum, item) => sum + item.unitCostHT * item.quantity, 0), 0);

  const totalGainNetOnQuotes = requests
    .filter((r) => r.status === "Reçue / Clôturée" && r.quoteAmountHT && r.quoteAmountHT > 0)
    .reduce((acc, r) => {
      const partsCost = r.items.reduce((sum, item) => sum + item.unitCostHT * item.quantity, 0);
      const gain = (r.quoteAmountHT || 0) - partsCost;
      return acc + (gain > 0 ? gain : 0);
    }, 0);

  return (
    <div className="space-y-6">
      {/* Top Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Total Fiches Régie</p>
            <p className="text-xl font-bold text-slate-100 mt-1 font-mono">{totalRequests}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Dossiers Techniciens</p>
          </div>
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Demandes En Attente</p>
            <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{pendingRequests}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">À valider / préparer</p>
          </div>
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Fiches Clôturées</p>
            <p className="text-xl font-bold text-emerald-400 mt-1 font-mono">{closedRequests}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Stock déduit & livré</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Coût Pièces Stock</p>
            <p className="text-lg font-bold text-cyan-400 mt-1 font-mono">
              {totalPartsCost.toLocaleString("fr-FR")} MAD
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">Valeur consommée</p>
          </div>
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-gradient-to-tr from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/40 flex items-center justify-between shadow-md">
          <div>
            <p className="text-[11px] text-emerald-400 font-bold uppercase tracking-wider">Gain Net / Marge Devis</p>
            <p className="text-lg font-extrabold text-emerald-300 mt-1 font-mono">
              +{totalGainNetOnQuotes.toLocaleString("fr-FR")} MAD
            </p>
            <p className="text-[11px] text-slate-300 mt-0.5">Devis HT - Coût Stock</p>
          </div>
          <div className="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          {/* Create Button */}
          <button
            type="button"
            onClick={() => {
              setEditingRequest(null);
              setFormData({
                requestNumber: `REG-2026-${Math.floor(100 + Math.random() * 900)}`,
                technician: TECHNICIANS[0],
                date: new Date().toISOString().slice(0, 10),
                agency: "FES",
                affaireOrPfNumber: "1001999",
                clientName: "NEW CAMPUS COMPANY",
                address: "Campus Universitaire Fès Saïss",
                billingType: "Sous Devis",
                status: "Approuvée",
                quoteNumber: "R1009850",
                quoteAmountHT: 15103.64,
                workNature: "Maintenance",
                observations: "Création Fiche de Régie Schindler",
                items: [
                  {
                    id: `item-${Date.now()}-1`,
                    identificationNumber: "SCH-77119-A",
                    designation: "Batterie 12V 7AH Schindler 3300",
                    quantity: 1,
                    unitCostHT: 350
                  }
                ],
                signatureDataUrl: "signed-admin"
              });
              setShowCreateModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Créer Fiche de Régie (Admin / Technicien)</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <input
            type="text"
            placeholder="Rechercher (N°, Client, PF, Devis)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500 w-48 sm:w-64"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
          >
            <option value="all">Tous les Statuts</option>
            <option value="En attente">En attente</option>
            <option value="Approuvée">Approuvée</option>
            <option value="Reçue / Clôturée">Reçue / Clôturée</option>
            <option value="Rejetée">Rejetée</option>
          </select>

          <select
            value={techFilter}
            onChange={(e) => setTechFilter(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-200"
          >
            <option value="all">Tous Techniciens</option>
            {TECHNICIANS.map((tech) => (
              <option key={tech} value={tech}>
                {tech}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table of Fiches de Régie */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3">N° Régie & Date</th>
                <th className="p-3">Technicien & Agence</th>
                <th className="p-3">Appareil PF & Client</th>
                <th className="p-3">Pièces Demandées</th>
                <th className="p-3 text-right">Devis Lié & Gain Net</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredRequests.map((req) => {
                const totalReqStockCost = req.items.reduce(
                  (sum, it) => sum + it.unitCostHT * it.quantity,
                  0
                );
                const gainNet = req.quoteAmountHT ? req.quoteAmountHT - totalReqStockCost : null;
                const marginPct = req.quoteAmountHT && req.quoteAmountHT > 0
                  ? ((gainNet! / req.quoteAmountHT) * 100).toFixed(1)
                  : null;

                return (
                  <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 font-medium">
                      <div className="font-mono text-xs font-bold text-rose-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        {req.requestNumber}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5">{req.date}</div>
                    </td>

                    <td className="p-3">
                      <div className="font-semibold text-slate-200">{req.technician}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Building className="w-2.5 h-2.5 text-slate-500" />
                        Agence {req.agency}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="font-mono text-xs font-bold text-blue-400">
                        PF: {req.affaireOrPfNumber}
                      </div>
                      <div className="text-slate-300 font-medium truncate max-w-[180px]" title={req.clientName}>
                        {req.clientName}
                      </div>
                    </td>

                    <td className="p-3">
                      <div className="text-slate-200 font-medium">
                        {req.items.length} référence(s) ({req.items.reduce((s, i) => s + i.quantity, 0)} u)
                      </div>
                      <div className="text-[11px] text-cyan-400 font-mono">
                        Coût stock: {totalReqStockCost.toLocaleString("fr-FR")} MAD
                      </div>
                    </td>

                    <td className="p-3 text-right">
                      {req.quoteNumber ? (
                        <div>
                          <div className="font-mono font-bold text-slate-200">
                            Devis {req.quoteNumber} : {req.quoteAmountHT?.toLocaleString("fr-FR")} MAD
                          </div>
                          {gainNet !== null && (
                            <div className="text-[11px] font-mono text-emerald-400 font-bold">
                              Gain Net: +{gainNet.toLocaleString("fr-FR")} MAD ({marginPct}%)
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">Sans Devis (Régie directe)</span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      {req.status === "En attente" && (
                        <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> En attente
                        </span>
                      )}
                      {req.status === "Approuvée" && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Approuvée
                        </span>
                      )}
                      {req.status === "Reçue / Clôturée" && (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold inline-flex items-center gap-1 shadow-xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Clôturée
                        </span>
                      )}
                      {req.status === "Rejetée" && (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold inline-flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Rejetée
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRequest(req);
                            setFormData({ ...req });
                            setShowCreateModal(true);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                          title="Modifier les détails de cette Fiche de Régie"
                        >
                          <Edit className="w-3 h-3 text-amber-400" />
                          <span>Modifier</span>
                        </button>

                        {/* Direct Close Button if not closed */}
                        {req.status !== "Reçue / Clôturée" && (
                          <button
                            type="button"
                            onClick={() => handleChangeStatus(req, "Reçue / Clôturée")}
                            className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                            title="Clôturer la demande : déduire du stock et transférer en consommation"
                          >
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>Clôturer</span>
                          </button>
                        )}

                        {/* View / Print Button */}
                        <button
                          type="button"
                          onClick={() => setViewingRequest(req)}
                          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                          title="Aperçu de la Fiche de Régie"
                        >
                          <Printer className="w-3.5 h-3.5 text-blue-400" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => handleDeleteRequest(req.id)}
                          className="p-1 text-slate-500 hover:text-rose-400 cursor-pointer"
                          title="Supprimer la fiche"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: CREATE / EDIT FICHE DE RÉGIE SCHINDLER (MATCHING EXACT IMAGE DESIGN) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 overflow-hidden">
          <div className="bg-slate-900 border-2 border-rose-600/60 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-slate-900 border-b border-rose-800/40 p-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center border border-rose-500/40 shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-white tracking-wide uppercase">
                    {editingRequest ? "FICHE DE RÉGIE SCHINDLER — MODIFICATION" : "FICHE DE RÉGIE SCHINDLER — CRÉATION ADMIN / TECHNICIEN"}
                  </h3>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Créez et affectez directement un dossier de pièces sous le même format que les techniciens.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRegie} className="flex-1 flex flex-col overflow-hidden min-h-0 text-xs">
              <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                {/* SECTION 1: AFFECTATION & INFORMATIONS GÉNÉRALES */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <User className="w-4 h-4 text-rose-500" />
                  <span>AFFECTATION & INFORMATIONS GÉNÉRALES</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Affecter au Technicien *</label>
                    <select
                      required
                      value={formData.technician || ""}
                      onChange={(e) => setFormData({ ...formData, technician: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium"
                    >
                      <option value="">-- Choisir un technicien --</option>
                      {TECHNICIANS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.date || ""}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Agence</label>
                    <select
                      value={formData.agency || "FES"}
                      onChange={(e) => setFormData({ ...formData, agency: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                    >
                      {AGENCIES.map((ag) => (
                        <option key={ag} value={ag}>
                          {ag}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">N° Affaire / Appareil (PF)</label>
                    <select
                      value={formData.affaireOrPfNumber || ""}
                      onChange={(e) => handleSelectEquipment(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                    >
                      <option value="">-- Sélectionner un Appareil PF --</option>
                      {equipments.map((eq) => (
                        <option key={eq.id} value={eq.pfNumber}>
                          {eq.pfNumber} - {eq.name} ({eq.city})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Client (Remplissage automatique)</label>
                    <input
                      type="text"
                      placeholder="Nom complet du client"
                      value={formData.clientName || ""}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Adresse (Remplissage automatique)</label>
                    <input
                      type="text"
                      placeholder="Adresse d'installation / intervention"
                      value={formData.address || ""}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Facturation</label>
                    <select
                      value={formData.billingType || "Sous Devis"}
                      onChange={(e) => setFormData({ ...formData, billingType: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium"
                    >
                      <option value="Facturable">Facturable</option>
                      <option value="Garantie">Garantie</option>
                      <option value="Inclus contrat">Inclus contrat</option>
                      <option value="Sous Devis">Sous Devis</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Statut initial de la Demande</label>
                    <select
                      value={formData.status || "Approuvée"}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium"
                    >
                      <option value="En attente">En attente</option>
                      <option value="Approuvée">Approuvée directement (Aucune revue requise)</option>
                      <option value="Reçue / Clôturée">Reçue / Clôturée (Déduire du Stock)</option>
                      <option value="Rejetée">Rejetée</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">N° Devis Associé (Optionnel pour Marge)</label>
                    <select
                      value={formData.quoteNumber || ""}
                      onChange={(e) => handleSelectQuote(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono text-xs"
                    >
                      <option value="">-- Aucun Devis Lié --</option>
                      {quotes.map((q) => (
                        <option key={q.id} value={q.quoteNumber}>
                          {q.quoteNumber} - {q.clientName} ({q.amountHT.toLocaleString("fr-FR")} MAD)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SECTION 2: PIÈCES DEMANDÉES */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Boxes className="w-4 h-4 text-rose-500" />
                    <span>PIÈCES DEMANDÉES</span>
                  </h4>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCatalogModal(true)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1 cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                      <span>📖 Catalogue Stock</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddFormItem}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Ajouter</span>
                    </button>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-2">
                  {(formData.items || []).map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                    >
                      <div className="text-xs font-bold text-slate-400 shrink-0">
                        Pièce {idx + 1}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 flex-1">
                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold">
                            N° D'IDENTIFICATION
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: SCH-77119-A"
                            value={item.identificationNumber}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedItems = (formData.items || []).map((it) =>
                                it.id === item.id ? { ...it, identificationNumber: val } : it
                              );
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold">
                            DÉSIGNATION
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Désignation de la pièce"
                            value={item.designation}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updatedItems = (formData.items || []).map((it) =>
                                it.id === item.id ? { ...it, designation: val } : it
                              );
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold">
                            QUANTITÉ DEMANDÉE
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 1;
                              const updatedItems = (formData.items || []).map((it) =>
                                it.id === item.id ? { ...it, quantity: val } : it
                              );
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 font-mono text-xs"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-400 uppercase font-semibold">
                            COÛT STOCK UNIT. (MAD)
                          </label>
                          <input
                            type="number"
                            min="0"
                            required
                            value={item.unitCostHT}
                            onChange={(e) => {
                              const val = Number(e.target.value) || 0;
                              const updatedItems = (formData.items || []).map((it) =>
                                it.id === item.id ? { ...it, unitCostHT: val } : it
                              );
                              setFormData({ ...formData, items: updatedItems });
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-200 font-mono text-xs"
                          />
                        </div>
                      </div>

                      {/* Remove item button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveFormItem(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer self-center"
                        title="Supprimer la ligne"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION 3: NATURE DES TRAVAUX / OBSERVATIONS */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
                  <Wrench className="w-4 h-4 text-rose-500" />
                  <span>NATURE DES TRAVAUX / OBSERVATIONS</span>
                </h4>

                <div className="grid grid-cols-1 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Nature des Travaux</label>
                    <select
                      value={formData.workNature || "Maintenance"}
                      onChange={(e) => setFormData({ ...formData, workNature: e.target.value as any })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-medium"
                    >
                      <option value="Maintenance">Maintenance</option>
                      <option value="Dépannage">Dépannage</option>
                      <option value="Réparation suite NC">Réparation suite NC</option>
                      <option value="Modernisation">Modernisation</option>
                      <option value="Autre">Autre</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Observations / Remarques Technicien</label>
                    <textarea
                      rows={2}
                      placeholder="Constats d'intervention, détails des pièces à remplacer..."
                      value={formData.observations || ""}
                      onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 4: SIGNATURE */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-rose-500" />
                    <span>SIGNATURE ÉLECTRONIQUE SCHINDLER</span>
                  </h4>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, signatureDataUrl: `signed-${Date.now()}` })}
                      className="px-2.5 py-1 rounded bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3 text-rose-400" />
                      <span>Générer une signature</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, signatureDataUrl: undefined })}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] cursor-pointer"
                    >
                      Effacer
                    </button>
                  </div>
                </div>

                <div className="h-24 bg-slate-900 border border-dashed border-slate-700 rounded-xl flex items-center justify-center p-3 text-slate-400">
                  {formData.signatureDataUrl ? (
                    <div className="text-center">
                      <div className="font-serif italic text-lg text-emerald-400 font-bold">
                        {formData.technician || "Schindler Technicien"} — Validé Electroniquement
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">
                        Signature certifiée Horodatée • {formData.date}
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Cliquez sur "Générer une signature" pour certifier cette Fiche de Régie.
                    </p>
                  )}
                </div>
              </div>
            </div>

              {/* Modal Fixed Footer */}
              <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-800 shrink-0 bg-slate-950/95">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold shadow-lg shadow-rose-600/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Enregistrer & Valider la Fiche de Régie</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK CATALOG PICKER */}
      {showCatalogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-400" />
                Sélectionner une Pièce depuis le Catalogue Stock
              </h3>
              <button
                onClick={() => setShowCatalogModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-2 pr-1">
              {stockItems.map((st) => (
                <div
                  key={st.id}
                  onClick={() => handlePickStockItem(st)}
                  className="p-3 rounded-xl bg-slate-950 hover:bg-slate-850 border border-slate-800 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div>
                    <div className="font-mono text-xs font-bold text-blue-400">{st.sku}</div>
                    <div className="text-xs font-semibold text-slate-200">{st.name}</div>
                    <div className="text-[10px] text-slate-400">Stock disponible: {st.currentStock} u</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-emerald-400">{st.unitCost} MAD</div>
                    <span className="px-2 py-0.5 rounded bg-blue-600 text-white text-[10px] font-bold">
                      + Choisir
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VIEW / PRINT REGIE SHEET */}
      {viewingRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 overflow-hidden">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-5 sm:p-6 shadow-2xl overflow-hidden text-xs animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                <Printer className="w-5 h-5 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Aperçu Fiche de Régie — {viewingRequest.requestNumber}
                </h3>
              </div>
              <button
                onClick={() => setViewingRequest(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Printable Content Block */}
            <div className="flex-1 overflow-y-auto custom-scrollbar my-2 pr-1">
              <div className="bg-slate-950 p-6 rounded-xl border border-slate-800 space-y-4 font-sans text-slate-200">
              <div className="flex justify-between items-start border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-extrabold text-rose-500 uppercase tracking-tight">
                    SCHINDLER — FICHE DE RÉGIE PIÈCES
                  </h2>
                  <p className="text-[11px] text-slate-400">N° {viewingRequest.requestNumber} • Agence {viewingRequest.agency}</p>
                </div>
                <div className="text-right font-mono text-xs">
                  <div className="text-slate-300">Date: {viewingRequest.date}</div>
                  <div className="text-rose-400 font-bold">{viewingRequest.billingType}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-900/60 p-3 rounded-lg">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Technicien</span>
                  <span className="text-slate-100 font-bold">{viewingRequest.technician}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">N° Appareil / PF</span>
                  <span className="text-blue-400 font-mono font-bold">{viewingRequest.affaireOrPfNumber}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Client</span>
                  <span className="text-slate-200">{viewingRequest.clientName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-semibold">Adresse</span>
                  <span className="text-slate-300">{viewingRequest.address}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold text-rose-400 mb-2 uppercase">Pièces Demandées & Consommées</h4>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900 text-slate-400">
                      <tr>
                        <th className="p-2">N° Identification</th>
                        <th className="p-2">Désignation</th>
                        <th className="p-2 text-center">Quantité</th>
                        <th className="p-2 text-right">Coût Stock (MAD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {viewingRequest.items.map((i) => (
                        <tr key={i.id}>
                          <td className="p-2 font-mono text-blue-400">{i.identificationNumber}</td>
                          <td className="p-2">{i.designation}</td>
                          <td className="p-2 text-center font-bold">{i.quantity}</td>
                          <td className="p-2 text-right font-mono">{(i.unitCostHT * i.quantity).toLocaleString("fr-FR")} MAD</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {viewingRequest.observations && (
                <div>
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase">Observations</h4>
                  <p className="p-2.5 rounded bg-slate-900 text-slate-300 text-xs italic">
                    {viewingRequest.observations}
                  </p>
                </div>
              )}

              <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Certification / Signature</span>
                  <span className="font-serif italic text-emerald-400 font-bold text-sm">
                    {viewingRequest.signatureDataUrl ? viewingRequest.technician : "Non signée"}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-slate-400 uppercase block">Statut Actuel</span>
                  <span className="font-bold text-emerald-400 font-mono text-xs">{viewingRequest.status}</span>
                </div>
              </div>
            </div>
            </div>

            {/* Fixed Footer */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800 shrink-0">
              <button
                onClick={() => setViewingRequest(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Fermer
              </button>
              <button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/30"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimer la Fiche</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
