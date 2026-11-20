import React, { useState, useMemo, useEffect, useRef } from "react";
import { Quote, QuoteStatus, PFEquipment, QuoteItem } from "../../types";
import { MONTH_LIST } from "../../data/mockFinanceData";
import { INITIAL_PF_EQUIPMENTS } from "../../data/mockPFData";
import {
  FileText,
  Calendar,
  Check,
  Info,
  Download,
  FileSpreadsheet,
  Calculator,
  Plus,
  Trash2,
  Sliders,
  TrendingUp,
  Percent,
  Layers,
  ArrowRight,
  Sparkles,
  Wrench,
  Package,
  Search,
  Building2,
  MapPin,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
  X,
  SlidersHorizontal,
  CheckCircle2,
  Edit3,
} from "lucide-react";
import { exportSingleQuoteToExcel } from "../../utils/excelExport";

interface SingleQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (quote: Quote) => void;
  initialQuote?: Quote | null;
  equipments: PFEquipment[];
}

// Pre-configured Schindler parts for fast 1-click addition
const SCHINDLER_CATALOG_PRESETS: Array<{
  label: string;
  description: string;
  partReference?: string;
  costPrice: number;
  unitPriceHT: number;
}> = [
  {
    label: "S Peigne 107/199 ALU 1Pce Naturel",
    description: "S PEIGNE 107/199 ALU 1PCE NATUREL",
    partReference: "REF-107199-ALU",
    costPrice: 8343.71,
    unitPriceHT: 22500,
  },
  {
    label: "Contact à clé MSS1 5-PIN",
    description: "CONTACT A CLE MSS1 5-PIN",
    partReference: "REF-MSS1-5P",
    costPrice: 6500.0,
    unitPriceHT: 17500,
  },
  {
    label: "Batterie 12V 7Ah Garniture I10 Coulisseau",
    description: "BATTERIE 12V 7AH GARNITURE DE COULISSEAU I10 BFK16",
    partReference: "REF-BAT-12V7AH",
    costPrice: 2100.0,
    unitPriceHT: 5500,
  },
  {
    label: "Circuit SDIC 51.Q* Schindler",
    description: "CIRCUIT SDIC 51.Q* SCHINDLER",
    partReference: "REF-SDIC-51Q",
    costPrice: 2053.0,
    unitPriceHT: 4106,
  },
  {
    label: "Jeu de 4 Galets de guidage renforcés 150mm",
    description: "JEU DE 4 GALETS DE GUIDAGE RENFORCÉS 150MM",
    partReference: "REF-GAL-150VT",
    costPrice: 2100.0,
    unitPriceHT: 3500,
  },
  {
    label: "Pochette de joints vérin hydraulique HP 80mm",
    description: "POCHETTE DE JOINTS VÉRIN HYDRAULIQUE HP 80MM",
    partReference: "REF-JNT-HP80",
    costPrice: 4800.0,
    unitPriceHT: 8000,
  },
  {
    label: "Huile biodégradable ISO VG 46 (Fût 60L)",
    description: "HUILE BIODÉGRADABLE ISO VG 46 (FÛT 60L)",
    partReference: "REF-OIL-HYD46",
    costPrice: 3200.0,
    unitPriceHT: 6000,
  },
  {
    label: "Câbles de traction 8mm (Jeu complet)",
    description: "CÂBLES DE TRACTION 8MM (JEU COMPLET CABINE)",
    partReference: "REF-CAB-8MM",
    costPrice: 4500.0,
    unitPriceHT: 11000,
  },
  {
    label: "Main d'œuvre & Intervention remplacement",
    description: "MAIN D'ŒUVRE & INTERVENTION TECHNIQUE DE REMPLACEMENT",
    partReference: "MO-TECH-01",
    costPrice: 1500.0,
    unitPriceHT: 3800,
  },
];

export const SingleQuoteModal: React.FC<SingleQuoteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialQuote,
  equipments,
}) => {
  // Quote header fields
  const [quoteNumber, setQuoteNumber] = useState(
    initialQuote?.quoteNumber || `R100${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [title, setTitle] = useState(
    initialQuote?.title || ""
  );
  const [clientName, setClientName] = useState(initialQuote?.clientName || "");
  const [customerAccount, setCustomerAccount] = useState(
    initialQuote?.customerAccount || ""
  );
  const [pfNumber, setPfNumber] = useState(initialQuote?.pfNumber || "");
  const [issueDate, setIssueDate] = useState(initialQuote?.issueDate || "2026-09-01");
  const [validityDate, setValidityDate] = useState(initialQuote?.validityDate || "2026-11-30");

  // Track auto-fill source from PF equipment
  const [autoFillNotice, setAutoFillNotice] = useState<{
    pf: string;
    client: string;
    account: string;
  } | null>(null);

  // Search & Selector State for Field 1 (N° Appareil PF)
  const [isEqPickerOpen, setIsEqPickerOpen] = useState<boolean>(false);
  const [eqSearchQuery, setEqSearchQuery] = useState<string>("");
  const [eqFilterCategory, setEqFilterCategory] = useState<"all" | "cpsi_done" | "cpsi_todo">("all");
  const [isManualPfMode, setIsManualPfMode] = useState<boolean>(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when picker opens
  useEffect(() => {
    if (isEqPickerOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isEqPickerOpen]);

  // Multiple Lines of Pieces & Components (Field 4)
  const [items, setItems] = useState<QuoteItem[]>(() => {
    if (initialQuote?.items && initialQuote.items.length > 0) {
      return initialQuote.items;
    }
    return [
      {
        id: "item-1",
        description: "",
        partReference: "",
        quantity: 1,
        costPrice: 0,
        totalCostPrice: 0,
        unitPriceHT: 0,
        totalHT: 0,
        c1Value: 0,
        c1Percent: 0,
      },
    ];
  });

  // Financial fields
  const [amountHT, setAmountHT] = useState<number>(
    initialQuote?.amountHT !== undefined ? initialQuote.amountHT : 0
  );
  const [estimatedCostHT, setEstimatedCostHT] = useState<number>(
    initialQuote?.costPriceHT !== undefined
      ? initialQuote.costPriceHT
      : initialQuote?.estimatedCostHT !== undefined
      ? initialQuote.estimatedCostHT
      : 0
  );
  const [tvaRate, setTvaRate] = useState<number>(initialQuote?.tvaRate || 20);
  const [status, setStatus] = useState<QuoteStatus>(initialQuote?.status || "Envoyé");
  const [notes, setNotes] = useState(initialQuote?.notes || "");

  // 100% Billing Month
  const [billingMonth, setBillingMonth] = useState<string>(
    initialQuote?.billingMonth ||
      (initialQuote?.billingSchedule ? Object.keys(initialQuote.billingSchedule)[0] : "2026-10")
  );

  // Unit of price (Unité de prix from ERP screenshot)
  const [priceUnit, setPriceUnit] = useState<number>(1.0);

  // Catalog quick add dropdown state
  const [selectedCatalogPreset, setSelectedCatalogPreset] = useState<string>("");

  // SYNCHRONIZATION EFFECT: Reset or populate form whenever modal opens or initialQuote changes
  useEffect(() => {
    if (!isOpen) return;

    if (initialQuote) {
      // EDIT MODE: Populate state with the exact values from the quote being edited
      setQuoteNumber(initialQuote.quoteNumber || "");
      setTitle(initialQuote.title || "");
      setClientName(initialQuote.clientName || "");
      setCustomerAccount(initialQuote.customerAccount || "");
      setPfNumber(initialQuote.pfNumber || "");
      setIssueDate(initialQuote.issueDate || "2026-09-01");
      setValidityDate(initialQuote.validityDate || "2026-11-30");

      const cost =
        initialQuote.costPriceHT !== undefined
          ? initialQuote.costPriceHT
          : initialQuote.estimatedCostHT !== undefined
          ? initialQuote.estimatedCostHT
          : 0;
      const sales = initialQuote.amountHT ?? 0;

      setAmountHT(sales);
      setEstimatedCostHT(cost);
      setTvaRate(initialQuote.tvaRate ?? 20);
      setStatus(initialQuote.status || "Envoyé");
      setNotes(initialQuote.notes || "");
      setBillingMonth(
        initialQuote.billingMonth ||
          (initialQuote.billingSchedule ? Object.keys(initialQuote.billingSchedule)[0] : "2026-10")
      );

      if (initialQuote.items && initialQuote.items.length > 0) {
        setItems(initialQuote.items);
      } else {
        // Synthesize item line from the quote's existing data so lines match the real financial values
        const itemC1 = Math.round((sales - cost) * 100) / 100;
        const itemC1Pct = sales > 0 ? Math.round((itemC1 / sales) * 10000) / 100 : 0;
        setItems([
          {
            id: `it-${Date.now()}`,
            description: initialQuote.title || "Prestation / Fourniture devis",
            partReference: "",
            quantity: 1,
            costPrice: cost,
            totalCostPrice: cost,
            unitPriceHT: sales,
            totalHT: sales,
            c1Value: itemC1,
            c1Percent: itemC1Pct,
          },
        ]);
      }
      setAutoFillNotice(null);
    } else {
      // CREATE MODE: Reset with clean new quote template
      setQuoteNumber(`R100${Math.floor(1000 + Math.random() * 9000)}`);
      setTitle("");
      setClientName("");
      setCustomerAccount("");
      setPfNumber("");
      setIssueDate("2026-09-01");
      setValidityDate("2026-11-30");
      setAmountHT(0);
      setEstimatedCostHT(0);
      setTvaRate(20);
      setStatus("Envoyé");
      setNotes("");
      setBillingMonth("2026-10");
      setItems([
        {
          id: `it-${Date.now()}`,
          description: "",
          partReference: "",
          quantity: 1,
          costPrice: 0,
          totalCostPrice: 0,
          unitPriceHT: 0,
          totalHT: 0,
          c1Value: 0,
          c1Percent: 0,
        },
      ]);
      setAutoFillNotice(null);
    }
  }, [isOpen, initialQuote]);

  // Load all available equipments from localStorage (PFManager imported data) or prop or initial mock
  const availableEquipments = useMemo<PFEquipment[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_pf_equipments") || localStorage.getItem("toolbox_pf_equipments_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return equipments && equipments.length > 0 ? equipments : INITIAL_PF_EQUIPMENTS;
  }, [equipments, isOpen]);

  // Filtered equipment list for quick search
  const filteredEquipments = useMemo(() => {
    const query = eqSearchQuery.trim().toLowerCase();
    const digitsOnly = query.replace(/[^0-9]/g, "");

    return availableEquipments.filter((eq) => {
      // Category filter
      if (eqFilterCategory === "cpsi_done") {
        const isDone = eq.cpsiStatus === "Réalisé" || (eq.cpsiDate && eq.cpsiDate.includes("2026"));
        if (!isDone) return false;
      } else if (eqFilterCategory === "cpsi_todo") {
        const isDone = eq.cpsiStatus === "Réalisé" || (eq.cpsiDate && eq.cpsiDate.includes("2026"));
        if (isDone) return false;
      }

      if (!query) return true;

      const pf = (eq.pfNumber || "").toLowerCase();
      const pfDigits = pf.replace(/[^0-9]/g, "");
      const numApp = (eq.numAppareil || "").toLowerCase();
      const name = (eq.name || "").toLowerCase();
      const account = (eq.customerAccount || "").toLowerCase();
      const client = (eq.customer || "").toLowerCase();
      const city = (eq.city || "").toLowerCase();
      const contract = (eq.contractNumber || "").toLowerCase();
      const type = (eq.type || "").toLowerCase();

      return (
        pf.includes(query) ||
        (digitsOnly.length >= 2 && pfDigits.includes(digitsOnly)) ||
        numApp.includes(query) ||
        name.includes(query) ||
        account.includes(query) ||
        client.includes(query) ||
        city.includes(query) ||
        contract.includes(query) ||
        type.includes(query)
      );
    });
  }, [availableEquipments, eqSearchQuery, eqFilterCategory]);

  // Current matched equipment object
  const selectedEquipmentObj = useMemo(() => {
    if (!pfNumber) return null;
    const cleanSearch = pfNumber.trim().toLowerCase();
    const cleanDigits = cleanSearch.replace(/[^0-9]/g, "");

    return (
      availableEquipments.find((eq) => {
        const eqPf = (eq.pfNumber || "").toLowerCase();
        const eqDigits = eqPf.replace(/[^0-9]/g, "");
        return (
          eqPf === cleanSearch ||
          (cleanDigits.length >= 3 && eqDigits === cleanDigits) ||
          eq.id === pfNumber
        );
      }) || null
    );
  }, [availableEquipments, pfNumber]);

  // Calculate totals dynamically from items
  const computedTotalCostHT = items.reduce(
    (acc, it) => acc + (it.totalCostPrice ?? (it.quantity * (it.costPrice || 0))),
    0
  );
  const computedTotalSalesHT = items.reduce(
    (acc, it) => acc + (it.totalHT ?? (it.quantity * (it.unitPriceHT || 0))),
    0
  );

  // Real-time Financial Calculations
  const c1Value = Math.round((amountHT - estimatedCostHT) * 100) / 100;
  const c1Percent =
    amountHT > 0 ? Math.round((c1Value / amountHT) * 10000) / 100 : 0;
  const costSharePct =
    amountHT > 0 ? Math.round((estimatedCostHT / amountHT) * 10000) / 100 : 0;
  const amountTTC = Math.round(amountHT * (1 + tvaRate / 100) * 100) / 100;
  const totalQuantity = items.reduce((acc, it) => acc + (it.quantity || 1), 0);

  // =========================================================================
  // HANDLERS FOR PF SELECTION (Requirement 1, 2, 3)
  // 1: Appareil PF -> Auto-fills 2 (Compte Client ERP) and 3 (Client / Syndic)
  // =========================================================================
  const handleSelectEquipment = (val: string, directEq?: PFEquipment) => {
    setPfNumber(val);
    setIsEqPickerOpen(false);
    if (!val) {
      setAutoFillNotice(null);
      return;
    }

    // Find equipment by pfNumber or id in availableEquipments
    const cleanSearch = val.trim().toLowerCase();
    const cleanDigits = cleanSearch.replace(/[^0-9]/g, "");

    const matchedEq =
      directEq ||
      availableEquipments.find((eq) => {
        const eqNum = (eq.pfNumber || "").toLowerCase();
        const eqDigits = eqNum.replace(/[^0-9]/g, "");
        return (
          eqNum === cleanSearch ||
          (cleanDigits.length >= 3 && eqDigits === cleanDigits) ||
          eq.id === val
        );
      });

    if (matchedEq) {
      // Auto-fill (2) Compte Client ERP
      const newAccount = matchedEq.customerAccount || "1001999";
      setCustomerAccount(newAccount);

      // Auto-fill (3) Client / Syndic
      const rawName = matchedEq.customer || matchedEq.name || "";
      const extractedClient = rawName.includes(" - ") ? rawName.split(" - ")[0].trim() : rawName;
      setClientName(extractedClient || "Client Schindler");

      setAutoFillNotice({
        pf: matchedEq.pfNumber,
        client: extractedClient || rawName,
        account: newAccount,
      });
    } else {
      setAutoFillNotice(null);
    }
  };

  // =========================================================================
  // HANDLERS FOR MULTIPLE PIECE LINES (Requirement 4)
  // =========================================================================
  const syncTotalsFromItems = (newItems: QuoteItem[]) => {
    const totalCost = newItems.reduce(
      (acc, it) => acc + (it.totalCostPrice ?? (it.quantity * (it.costPrice || 0))),
      0
    );
    const totalSales = newItems.reduce(
      (acc, it) => acc + (it.totalHT ?? (it.quantity * (it.unitPriceHT || 0))),
      0
    );
    setEstimatedCostHT(Math.round(totalCost * 100) / 100);
    setAmountHT(Math.round(totalSales * 100) / 100);
  };

  const handleAddItem = (preset?: Partial<QuoteItem>) => {
    const qty = preset?.quantity || 1;
    const cost = preset?.costPrice || 0;
    const unitPrice = preset?.unitPriceHT || 0;
    const totalCost = Math.round(qty * cost * 100) / 100;
    const totalSales = Math.round(qty * unitPrice * 100) / 100;
    const itemC1 = Math.round((totalSales - totalCost) * 100) / 100;
    const itemC1Pct = totalSales > 0 ? Math.round((itemC1 / totalSales) * 10000) / 100 : 0;

    const newItem: QuoteItem = {
      id: `it-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      description: preset?.description || "",
      partReference: preset?.partReference || "",
      quantity: qty,
      costPrice: cost,
      totalCostPrice: totalCost,
      unitPriceHT: unitPrice,
      totalHT: totalSales,
      c1Value: itemC1,
      c1Percent: itemC1Pct,
    };

    const updated = [...items, newItem];
    setItems(updated);
    syncTotalsFromItems(updated);
  };

  const handleUpdateItem = (
    index: number,
    field: "description" | "partReference" | "quantity" | "costPrice" | "unitPriceHT",
    val: any
  ) => {
    const copy = [...items];
    const item = { ...copy[index], [field]: val };

    const qty = Number(item.quantity) || 1;
    const cost = Number(item.costPrice) || 0;
    const unitPrice = Number(item.unitPriceHT) || 0;

    item.totalCostPrice = Math.round(qty * cost * 100) / 100;
    item.totalHT = Math.round(qty * unitPrice * 100) / 100;
    item.c1Value = Math.round((item.totalHT - item.totalCostPrice) * 100) / 100;
    item.c1Percent =
      item.totalHT > 0
        ? Math.round((item.c1Value / item.totalHT) * 10000) / 100
        : 0;

    copy[index] = item;
    setItems(copy);
    syncTotalsFromItems(copy);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      // Keep at least one line, just reset it
      const reset = [
        {
          id: `it-${Date.now()}`,
          description: "",
          quantity: 1,
          costPrice: 0,
          totalCostPrice: 0,
          unitPriceHT: 0,
          totalHT: 0,
          c1Value: 0,
          c1Percent: 0,
        },
      ];
      setItems(reset);
      syncTotalsFromItems(reset);
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
    syncTotalsFromItems(updated);
  };

  // Add a piece from the Schindler Catalog preset
  const handleAddFromCatalog = (presetLabel: string) => {
    const found = SCHINDLER_CATALOG_PRESETS.find((p) => p.label === presetLabel);
    if (found) {
      handleAddItem(found);
      setSelectedCatalogPreset("");
    }
  };

  // Automatically update the main quote title from piece designations (e.g. PIÈCE 1 // PIÈCE 2)
  const handleSyncTitleWithPieces = () => {
    const names = items
      .map((it) => it.description.trim())
      .filter((d) => d.length > 0);
    if (names.length > 0) {
      setTitle(names.join(" // "));
    }
  };

  // Target C1% adjustment across all lines
  const handleApplyTargetC1 = (targetPct: number) => {
    if (targetPct >= 100) return;
    const factor = 1 / (1 - targetPct / 100);

    const updated = items.map((it) => {
      const cost = Number(it.costPrice) || 0;
      const newUnitPriceHT =
        cost > 0 ? Math.round(cost * factor * 100) / 100 : it.unitPriceHT;
      const qty = Number(it.quantity) || 1;
      const totalCost = Math.round(qty * cost * 100) / 100;
      const totalHT = Math.round(qty * newUnitPriceHT * 100) / 100;
      const c1Val = Math.round((totalHT - totalCost) * 100) / 100;
      const c1Pct =
        totalHT > 0 ? Math.round((c1Val / totalHT) * 10000) / 100 : 0;

      return {
        ...it,
        unitPriceHT: newUnitPriceHT,
        totalCostPrice: totalCost,
        totalHT,
        c1Value: c1Val,
        c1Percent: c1Pct,
      };
    });

    setItems(updated);
    syncTotalsFromItems(updated);
  };

  // Global manual override of amountHT (e.g. if user types 40000 directly)
  const handleAmountHTChange = (newVal: number) => {
    const val = isNaN(newVal) ? 0 : newVal;
    setAmountHT(val);
  };

  // Global manual override of cost
  const handleCostChange = (newCost: number) => {
    const cost = isNaN(newCost) ? 0 : newCost;
    setEstimatedCostHT(cost);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !clientName || amountHT <= 0) return;

    const newQuote: Quote = {
      id: initialQuote?.id || `quot-${Date.now()}`,
      quoteNumber,
      title,
      clientName,
      customerAccount,
      pfNumber: pfNumber || undefined,
      issueDate,
      validityDate,
      amountHT,
      costPriceHT: estimatedCostHT,
      c1Value,
      c1Percent,
      tvaRate,
      amountTTC,
      estimatedCostHT,
      estimatedMarginPct: c1Percent,
      status,
      billingMonth,
      billingSchedule: { [billingMonth]: amountHT },
      notes,
      items,
    };

    onSave(newQuote);
    onClose();
  };

  const selectedMonthObj = MONTH_LIST.find((m) => m.key === billingMonth);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-xs">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 shrink-0 bg-slate-900">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl border ${initialQuote ? "bg-blue-950/80 border-blue-600/40 text-blue-400" : "bg-emerald-950/80 border-emerald-600/40 text-emerald-400"}`}>
              {initialQuote ? <Edit3 className="w-5 h-5" /> : <Calculator className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <span>
                    {initialQuote
                      ? `Modifier le Devis : ${quoteNumber || initialQuote.quoteNumber}`
                      : "Nouveau Devis Schindler & Chiffrage C1"}
                  </span>
                </h3>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold border ${
                  initialQuote
                    ? "bg-blue-950 text-blue-300 border-blue-700/60"
                    : "bg-emerald-950 text-emerald-300 border-emerald-700/60"
                }`}>
                  {initialQuote ? "Mode Modification Devis" : "Nouveau Devis ERP Schindler"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {initialQuote
                  ? `Mise à jour des informations, des pièces, du prix de revient et de la marge C1 pour ${clientName || "le client"}`
                  : "Gestion intégrée du Prix de revient, Marge C1 (Valeur & %) et Prix de Vente HT (MAD)"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 text-sm cursor-pointer transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
            {/* ROW 1: N° Devis & Intitulé */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">N° Devis *</label>
                <input
                  type="text"
                  required
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  placeholder="ex: R1008153"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-emerald-400 font-mono font-bold"
                />
              </div>

              <div className="sm:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-slate-300 font-semibold">
                    Intitulé de la Prestation *
                  </label>
                  <button
                    type="button"
                    onClick={handleSyncTitleWithPieces}
                    className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 cursor-pointer font-medium"
                    title="Générer l'intitulé en concaténant les désignations des pièces avec '//'"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Synchroniser avec les pièces (//)</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="ex: S PEIGNE 107/199 ALU 1PCE NATUREL // CONTACT A CLE MSS1 5-PIN"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            {/* ROW 2: (3) Client / Syndic | (2) Compte Client ERP | (1) Appareil PF Associé */}
            {/* In exact visual correspondence with the user's diagram: 1 triggers 2 and 3 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-800">
              {/* FIELD 3: Client / Syndic */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] flex items-center justify-center font-bold">
                      3
                    </span>
                    <span>Client / Syndic *</span>
                  </label>
                  {autoFillNotice && (
                    <span className="text-[9px] text-emerald-400 font-mono font-semibold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Auto PF
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="ex: Tour Horizon Syndic"
                  className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-200 transition-colors ${
                    autoFillNotice
                      ? "border-emerald-600/70 bg-emerald-950/20 focus:ring-1 focus:ring-emerald-500"
                      : "border-slate-700 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </div>

              {/* FIELD 2: Compte Client ERP */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-semibold flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] flex items-center justify-center font-bold">
                      2
                    </span>
                    <span>Compte Client ERP</span>
                  </label>
                  {autoFillNotice && (
                    <span className="text-[9px] text-emerald-400 font-mono font-semibold flex items-center gap-0.5">
                      <Check className="w-2.5 h-2.5" /> Auto PF
                    </span>
                  )}
                </div>
                <input
                  type="text"
                  value={customerAccount}
                  onChange={(e) => setCustomerAccount(e.target.value)}
                  placeholder="ex: 1001999"
                  className={`w-full bg-slate-950 border rounded-lg p-2 text-slate-200 font-mono transition-colors ${
                    autoFillNotice
                      ? "border-emerald-600/70 bg-emerald-950/20 focus:ring-1 focus:ring-emerald-500"
                      : "border-slate-700 focus:ring-1 focus:ring-blue-500"
                  }`}
                />
              </div>

              {/* FIELD 1: Appareil PF Associé (N° Appareil) avec Recherche & Autocomplétion */}
              <div className="relative">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-200 font-bold flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold shadow-xs">
                      1
                    </span>
                    <span>N° d'Appareil du PF *</span>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-indigo-400 font-medium font-mono hidden sm:inline">
                      → Remplira (2) et (3)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setIsManualPfMode(!isManualPfMode);
                        setIsEqPickerOpen(false);
                      }}
                      className="text-[10px] text-slate-400 hover:text-indigo-300 flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isManualPfMode ? "Mode Recherche" : "Saisie libre"}
                    </button>
                  </div>
                </div>

                {isManualPfMode ? (
                  // MANUAL TEXT INPUT MODE
                  <div className="space-y-1.5">
                    <div className="relative">
                      <input
                        type="text"
                        value={pfNumber}
                        onChange={(e) => handleSelectEquipment(e.target.value)}
                        placeholder="ex: PF-78012 ou 1008153"
                        className="w-full bg-slate-950 border border-indigo-500/70 rounded-lg p-2 text-slate-100 font-mono text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                      {pfNumber && (
                        <button
                          type="button"
                          onClick={() => handleSelectEquipment("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-slate-400">
                      Mode saisie manuelle. Tapez le N° d'appareil de votre choix.
                    </p>
                  </div>
                ) : (
                  // SEARCHABLE COMBOBOX & PICKER MODE
                  <div className="space-y-1.5">
                    {/* Selected Appareil Trigger Button */}
                    <div
                      onClick={() => setIsEqPickerOpen(!isEqPickerOpen)}
                      className={`w-full p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                        isEqPickerOpen
                          ? "bg-slate-900 border-indigo-500 ring-1 ring-indigo-500/50"
                          : pfNumber
                          ? "bg-slate-950 border-indigo-500/60 hover:border-indigo-400"
                          : "bg-slate-950 border-slate-700 hover:border-slate-500"
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <Search className="w-4 h-4 text-indigo-400 shrink-0" />
                        {pfNumber ? (
                          <div className="flex items-center gap-2 truncate">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-700/50 shrink-0">
                              {pfNumber}
                            </span>
                            {selectedEquipmentObj ? (
                              <span className="text-slate-200 text-xs truncate">
                                {selectedEquipmentObj.name}
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs truncate">
                                Appareil sélectionné
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">
                            🔍 Rechercher par N° Appareil (ex: PF-78012, 1008...), Nom de site, Compte ERP...
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {pfNumber && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectEquipment("");
                            }}
                            className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-rose-400 transition-colors"
                            title="Effacer la sélection"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronDown
                          className={`w-4 h-4 text-slate-400 transition-transform ${
                            isEqPickerOpen ? "rotate-180 text-indigo-400" : ""
                          }`}
                        />
                      </div>
                    </div>

                    {/* Popover / Search Dropdown Menu */}
                    {isEqPickerOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-slate-900 border border-indigo-500/80 rounded-xl shadow-2xl p-3 space-y-2.5 backdrop-blur-md animate-fade-in sm:min-w-[420px]">
                        {/* Search Input */}
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-indigo-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                          <input
                            ref={searchInputRef}
                            type="text"
                            value={eqSearchQuery}
                            onChange={(e) => setEqSearchQuery(e.target.value)}
                            placeholder="Rechercher N° Appareil (ex: PF-78012, 78012, 1008153), Immeuble, Client, Ville..."
                            className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                          {eqSearchQuery && (
                            <button
                              type="button"
                              onClick={() => setEqSearchQuery("")}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* Filter Tabs & Total Count */}
                        <div className="flex items-center justify-between gap-1 text-[10px]">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setEqFilterCategory("all")}
                              className={`px-2 py-0.5 rounded-full transition-colors ${
                                eqFilterCategory === "all"
                                  ? "bg-indigo-600 text-white font-bold"
                                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              Tous ({availableEquipments.length})
                            </button>
                            <button
                              type="button"
                              onClick={() => setEqFilterCategory("cpsi_done")}
                              className={`px-2 py-0.5 rounded-full transition-colors ${
                                eqFilterCategory === "cpsi_done"
                                  ? "bg-emerald-600 text-white font-bold"
                                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              CPSI Réalisé
                            </button>
                            <button
                              type="button"
                              onClick={() => setEqFilterCategory("cpsi_todo")}
                              className={`px-2 py-0.5 rounded-full transition-colors ${
                                eqFilterCategory === "cpsi_todo"
                                  ? "bg-amber-600 text-white font-bold"
                                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              CPSI À Faire
                            </button>
                          </div>
                          <span className="text-slate-400 font-mono">
                            {filteredEquipments.length} résultat(s)
                          </span>
                        </div>

                        {/* List of Equipments */}
                        <div className="max-h-56 overflow-y-auto divide-y divide-slate-800/80 rounded-lg border border-slate-800 bg-slate-950/60 custom-scrollbar">
                          {filteredEquipments.length > 0 ? (
                            filteredEquipments.map((eq) => {
                              const isSelected = pfNumber === eq.pfNumber;
                              const isCpsiDone =
                                eq.cpsiStatus === "Réalisé" ||
                                (eq.cpsiDate && eq.cpsiDate.includes("2026"));

                              return (
                                <div
                                  key={eq.id}
                                  onClick={() => handleSelectEquipment(eq.pfNumber, eq)}
                                  className={`p-2 hover:bg-indigo-950/40 cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                                    isSelected ? "bg-indigo-950/70 border-l-2 border-indigo-400" : ""
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                      <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-900/60 px-1.5 py-0.5 rounded border border-indigo-700/50">
                                        {eq.pfNumber}
                                      </span>
                                      <span className="font-semibold text-slate-200 text-xs truncate">
                                        {eq.name}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 flex-wrap">
                                      <span className="text-emerald-400 font-mono">
                                        Compte: {eq.customerAccount || "1001999"}
                                      </span>
                                      <span>•</span>
                                      <span className="text-slate-300 truncate max-w-[140px]">
                                        {eq.customer || "Client Schindler"}
                                      </span>
                                      {eq.city && (
                                        <>
                                          <span>•</span>
                                          <span className="text-slate-400">{eq.city}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span
                                      className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${
                                        isCpsiDone
                                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                                          : "bg-slate-800 text-slate-400 border border-slate-700"
                                      }`}
                                    >
                                      {isCpsiDone ? "CPSI OK" : "CPSI En attente"}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectEquipment(eq.pfNumber, eq);
                                      }}
                                      className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-[10px] shadow-xs cursor-pointer"
                                    >
                                      Choisir
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-slate-400 text-xs">
                                Aucun appareil trouvé pour "{eqSearchQuery}".
                              </p>
                              {eqSearchQuery && (
                                <button
                                  type="button"
                                  onClick={() => handleSelectEquipment(eqSearchQuery)}
                                  className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
                                >
                                  Utiliser "{eqSearchQuery}" comme N° d'Appareil
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer Help */}
                        <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                          <span>
                            Astuce: La sélection auto-remplit immédiatement le Compte Client ERP et le Syndic.
                          </span>
                          <button
                            type="button"
                            onClick={() => setIsEqPickerOpen(false)}
                            className="text-slate-300 hover:text-white underline cursor-pointer"
                          >
                            Fermer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Real-time Feedback Banner for Auto-fill */}
              {autoFillNotice && (
                <div className="sm:col-span-3 p-2 rounded-lg bg-emerald-950/50 border border-emerald-700/60 text-emerald-300 text-[11px] flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      Appareil PF <strong>{autoFillNotice.pf}</strong> sélectionné : <strong>Compte ERP (2: {autoFillNotice.account})</strong> et <strong>Client (3: {autoFillNotice.client})</strong> remplis automatiquement.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAutoFillNotice(null)}
                    className="text-slate-400 hover:text-slate-200 text-xs px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* FIELD 4: DÉTAILS DE LIGNE & PIÈCES DÉTACHÉES (Multi-lignes, désignation incluse) */}
            {/* Exactly circled as 4 in user screenshot */}
            {/* ========================================================================= */}
            <div className="rounded-xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg space-y-0">
              {/* Header of Section 4 */}
              <div className="bg-slate-900 border-b border-slate-800 p-3 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-rose-600 text-white text-[11px] flex items-center justify-center font-bold shadow-xs">
                    4
                  </span>
                  <div>
                    <h4 className="text-slate-200 font-bold text-xs uppercase tracking-wider flex items-center gap-2">
                      <span>Lignes de Pièces & Prestations</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60 lowercase">
                        {items.length} ligne{items.length > 1 ? "s" : ""} • désignation incluse
                      </span>
                    </h4>
                  </div>
                </div>

                {/* Quick Actions for pieces */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Preset catalog picker */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                    <Package className="w-3.5 h-3.5 text-slate-400 ml-1" />
                    <select
                      value={selectedCatalogPreset}
                      onChange={(e) => handleAddFromCatalog(e.target.value)}
                      className="bg-transparent text-slate-300 text-[11px] font-medium border-none focus:outline-none cursor-pointer pr-2"
                    >
                      <option value="">+ Pièce Catalogue Schindler...</option>
                      {SCHINDLER_CATALOG_PRESETS.map((p) => (
                        <option key={p.label} value={p.label}>
                          {p.label} (Revient: {p.costPrice} MAD)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Add blank row button */}
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter une ligne de pièce</span>
                  </button>
                </div>
              </div>

              {/* TABLE OF PIECE LINES (DÉSIGNATION INCLUSE) */}
              <div className="p-3.5 space-y-3 bg-slate-950">
                <div className="max-h-72 overflow-y-auto overflow-x-auto rounded-lg border border-slate-800 bg-slate-900/90 custom-scrollbar">
                  <table className="w-full text-left text-[11px] border-collapse">
                    <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800 sticky top-0 z-10 shadow-xs">
                      <tr>
                        <th className="p-2 w-8 text-center">#</th>
                        <th className="p-2 min-w-[240px]">
                          Désignation de la pièce / composant *
                        </th>
                        <th className="p-2 w-16 text-center">Qté</th>
                        <th className="p-2 w-28 text-right text-amber-400">Revient Unit.</th>
                        <th className="p-2 w-28 text-right text-blue-400">Vente Unit. HT</th>
                        <th className="p-2 w-24 text-right text-amber-300">Total Revient</th>
                        <th className="p-2 w-24 text-right text-blue-300">Total Vente HT</th>
                        <th className="p-2 w-20 text-center text-emerald-400">Marge C1</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70 text-slate-300">
                      {items.map((it, idx) => (
                        <tr key={it.id || idx} className="hover:bg-slate-850/80 transition-colors">
                          <td className="p-2 text-center text-slate-500 font-mono text-[10px]">
                            {idx + 1}
                          </td>

                          {/* DÉSIGNATION DE LA PIÈCE */}
                          <td className="p-2">
                            <input
                              type="text"
                              required
                              value={it.description}
                              onChange={(e) =>
                                handleUpdateItem(idx, "description", e.target.value)
                              }
                              placeholder="ex: S PEIGNE 107/199 ALU 1PCE NATUREL"
                              className="w-full bg-slate-950 border border-slate-700/80 hover:border-slate-600 rounded px-2 py-1 text-slate-200 font-medium placeholder:text-slate-600 focus:ring-1 focus:ring-blue-500"
                            />
                          </td>

                          {/* QUANTITÉ */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="1"
                              value={it.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, "quantity", Number(e.target.value) || 1)
                              }
                              className="w-14 bg-slate-950 border border-slate-700 rounded px-1.5 py-1 text-center font-mono text-slate-100 font-bold"
                            />
                          </td>

                          {/* PRIX DE REVIENT UNITAIRE */}
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.costPrice ?? 0}
                              onChange={(e) =>
                                handleUpdateItem(idx, "costPrice", Number(e.target.value) || 0)
                              }
                              className="w-24 bg-slate-950 border border-amber-600/50 rounded px-1.5 py-1 text-right font-mono text-amber-300 font-semibold focus:ring-1 focus:ring-amber-500"
                            />
                          </td>

                          {/* PRIX DE VENTE UNITAIRE HT */}
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={it.unitPriceHT}
                              onChange={(e) =>
                                handleUpdateItem(idx, "unitPriceHT", Number(e.target.value) || 0)
                              }
                              className="w-24 bg-slate-950 border border-blue-500/50 rounded px-1.5 py-1 text-right font-mono text-blue-300 font-bold focus:ring-1 focus:ring-blue-500"
                            />
                          </td>

                          {/* TOTAL REVIENT LIGNE */}
                          <td className="p-2 text-right font-mono text-amber-300/90 text-xs">
                            {((it.quantity || 1) * (it.costPrice || 0)).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* TOTAL VENTE HT LIGNE */}
                          <td className="p-2 text-right font-mono text-blue-200 font-bold text-xs">
                            {((it.quantity || 1) * (it.unitPriceHT || 0)).toLocaleString("fr-FR", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>

                          {/* MARGE C1 % */}
                          <td className="p-2 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                                (it.c1Percent || 0) >= 50
                                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800/60"
                                  : (it.c1Percent || 0) >= 30
                                  ? "bg-amber-950 text-amber-300 border border-amber-800/60"
                                  : "bg-rose-950 text-rose-300 border border-rose-800/60"
                              }`}
                            >
                              {it.c1Percent !== undefined ? `${it.c1Percent.toFixed(1)}%` : "-"}
                            </span>
                          </td>

                          {/* ACTION DELETE */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
                              title="Supprimer cette ligne"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Sub-strip with "+ Ajouter une ligne" & total recap */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleAddItem()}
                    className="text-[11px] font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter une autre ligne de pièce</span>
                  </button>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3 font-mono">
                    <span>
                      Total Pièces : <strong className="text-slate-200">{totalQuantity}</strong>
                    </span>
                    <span>
                      Revient :{" "}
                      <strong className="text-amber-300">
                        {computedTotalCostHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                      </strong>
                    </span>
                    <span>
                      Vente HT :{" "}
                      <strong className="text-blue-300">
                        {computedTotalSalesHT.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                      </strong>
                    </span>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* EXACT 4-COLUMN SCHINDLER ERP METRIC STRIP (DIRECTLY MIRRORING USER IMAGE) */}
                {/* ========================================================================= */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-slate-200 mt-2">
                  {/* Col 1: QUANTITÉ */}
                  <div className="space-y-1 border-r border-slate-800/80 pr-2">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      QUANTITÉ
                    </div>
                    <div className="text-[11px] text-slate-300">Unité de prix</div>
                    <div className="pt-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        value={priceUnit}
                        onChange={(e) => setPriceUnit(Number(e.target.value) || 1)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono font-bold text-xs"
                      />
                    </div>
                    <div className="text-[10px] text-slate-500 pt-0.5">
                      Coefficient : x{priceUnit} • {totalQuantity} pcs
                    </div>
                  </div>

                  {/* Col 2: COÛT (PRIX DE REVIENT) */}
                  <div className="space-y-1 border-r border-slate-800/80 pr-2">
                    <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                      <span>COÛT</span>
                    </div>
                    <div className="text-[11px] text-slate-300">Prix de revient (MAD) *</div>
                    <div className="pt-1">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={estimatedCostHT}
                        onChange={(e) => handleCostChange(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-amber-600/50 rounded px-2 py-1 text-amber-300 font-mono font-bold text-xs focus:ring-1 focus:ring-amber-500"
                        title="Somme automatique des lignes de pièces (modifiable)"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      Part coût :{" "}
                      <span className="font-mono font-semibold text-amber-300">
                        {costSharePct.toFixed(2)} %
                      </span>
                    </div>
                  </div>

                  {/* Col 3: C1 (MARGE C1) */}
                  <div className="space-y-1 border-r border-slate-800/80 pr-2">
                    <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                      <span>C1</span>
                      <span className="text-[9px] px-1 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/50">
                        MARGE BRUTE
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-300">
                      <span>C1 % :</span>
                      <strong className="font-mono text-emerald-300 text-xs">
                        {c1Percent.toFixed(2)} %
                      </strong>
                    </div>
                    <div className="pt-1">
                      <div className="text-[10px] text-slate-400 mb-0.5">C1 Value (Marge MAD)</div>
                      <div className="px-2 py-1 rounded bg-slate-950 border border-emerald-600/40 text-emerald-400 font-mono font-bold text-xs">
                        {c1Value.toLocaleString("fr-FR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        MAD
                      </div>
                    </div>
                    <div className="text-[10px] text-slate-500 pt-0.5">= Vente HT - Revient</div>
                  </div>

                  {/* Col 4: PRIX DE VENTE HT (100% C1 Value) */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-blue-400 uppercase tracking-wider flex items-center justify-between">
                      <span>PRIX DE VENTE HT</span>
                      <span className="text-[9px] px-1 rounded bg-blue-950 text-blue-300 font-mono font-bold">
                        100.00 %
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">Total HT Facturable *</div>
                    <div className="pt-1">
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={amountHT}
                        onChange={(e) => handleAmountHTChange(Number(e.target.value))}
                        className="w-full bg-slate-950 border border-blue-500/60 rounded px-2 py-1 text-blue-300 font-mono font-bold text-xs focus:ring-1 focus:ring-blue-400"
                        title="Total de vente facturable au client"
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 pt-0.5">
                      C1 Value (100%) :{" "}
                      <span className="font-mono text-blue-200">
                        {amountHT.toLocaleString("fr-FR")} MAD
                      </span>
                    </div>
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="space-y-1.5 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px] font-semibold">
                    <div className="flex items-center gap-1.5 text-amber-300">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                      <span>
                        Prix de revient : {estimatedCostHT.toLocaleString("fr-FR")} MAD (
                        {costSharePct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                      <span>
                        Marge C1 : {c1Value.toLocaleString("fr-FR")} MAD ({c1Percent.toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      style={{ width: `${Math.min(Math.max(costSharePct, 0), 100)}%` }}
                      className="h-full bg-amber-500 transition-all duration-300"
                      title={`Part du coût: ${costSharePct.toFixed(1)}%`}
                    />
                    <div
                      style={{ width: `${Math.min(Math.max(c1Percent, 0), 100)}%` }}
                      className="h-full bg-emerald-500 transition-all duration-300"
                      title={`Marge C1: ${c1Percent.toFixed(1)}%`}
                    />
                  </div>
                </div>

                {/* Target C1 Calculator Presets */}
                <div className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Simulateur & C1 % Cible Schindler :</span>
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Recalcule automatiquement le prix de vente des pièces selon le taux C1
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { label: "62.89 % (Norme ERP)", pct: 62.89, special: true },
                      { label: "50.00 % (Standard)", pct: 50.0, special: false },
                      { label: "45.00 %", pct: 45.0, special: false },
                      { label: "40.00 %", pct: 40.0, special: false },
                      { label: "30.00 %", pct: 30.0, special: false },
                    ].map((target) => (
                      <button
                        key={target.pct}
                        type="button"
                        onClick={() => handleApplyTargetC1(target.pct)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                          Math.abs(c1Percent - target.pct) < 0.2
                            ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                            : target.special
                            ? "bg-emerald-950/70 border-emerald-600/50 text-emerald-300 hover:bg-emerald-900"
                            : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white"
                        }`}
                      >
                        <span>C1 Cible {target.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* TVA, Statut & Financial Recaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <label className="block text-slate-400 mb-1 font-medium">Taux TVA (%)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={tvaRate}
                    onChange={(e) => setTvaRate(Number(e.target.value) || 0)}
                    className="w-24 bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                  <span className="text-[11px] text-slate-400 font-semibold">
                    TTC :{" "}
                    <strong className="text-slate-100 font-mono">
                      {amountTTC.toLocaleString("fr-FR")} MAD
                    </strong>
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1 font-medium">Statut du Devis</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as QuoteStatus)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 font-semibold cursor-pointer"
                >
                  <option value="Brouillon">Brouillon</option>
                  <option value="Envoyé">Envoyé</option>
                  <option value="Validé / Accepté">Validé / Accepté</option>
                  <option value="Facturé">Facturé</option>
                  <option value="Refusé">Refusé</option>
                </select>
              </div>
            </div>

            {/* 100% BILLING MONTH SELECTION */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-blue-500/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  <h4 className="font-bold text-blue-300 text-xs">
                    Mois de Facturation (100% du Devis)
                  </h4>
                </div>
                <span className="text-[11px] text-blue-200 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> 100% ={" "}
                  {amountHT.toLocaleString("fr-FR")} MAD en {selectedMonthObj?.label}
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                {MONTH_LIST.map((m) => {
                  const isSelected = billingMonth === m.key;
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => setBillingMonth(m.key)}
                      className={`p-2 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-400 font-bold shadow-sm scale-102"
                          : "bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800"
                      }`}
                    >
                      <span className="text-xs">{m.short}</span>
                      <span className="text-[9px] opacity-80">2026</span>
                      {isSelected && (
                        <span className="text-[9px] text-emerald-200 font-bold mt-0.5">100%</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Notes & Conditions Spécifiques
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="ex: Règlement à réception de facture, validation bon de commande..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
            </div>
          </div>

          {/* Fixed Modal Actions Footer */}
          <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t border-slate-800 shrink-0 flex items-center justify-between gap-2">
            {initialQuote ? (
              <button
                type="button"
                onClick={() => {
                  exportSingleQuoteToExcel({
                    ...initialQuote,
                    quoteNumber,
                    title,
                    clientName,
                    customerAccount,
                    pfNumber: pfNumber || undefined,
                    issueDate,
                    validityDate,
                    amountHT,
                    costPriceHT: estimatedCostHT,
                    c1Value,
                    c1Percent,
                    tvaRate,
                    amountTTC,
                    estimatedCostHT,
                    estimatedMarginPct: c1Percent,
                    status,
                    billingMonth,
                    notes,
                    items,
                  });
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-emerald-950/80 text-emerald-300 border border-emerald-600/40 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                title="Télécharger la fiche de ce devis avec chiffrage C1 au format Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Exporter ce devis (Excel)</span>
                <Download className="w-3 h-3 text-emerald-400" />
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/30 cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {initialQuote
                    ? `Enregistrer les Modifications (${quoteNumber || initialQuote.quoteNumber})`
                    : "Créer le Devis (Chiffrage C1)"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
