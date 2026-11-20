import React, { useState, useRef } from "react";
import { StockItem } from "../../types";
import { FormattedOutput } from "../FormattedOutput";
import { exportToExcel, readExcelFile } from "../../utils/excelExport";
import { RegieSheetManager } from "../stock/RegieSheetManager";
import {
  Boxes,
  Plus,
  Trash2,
  Sparkles,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RotateCcw,
  CheckCircle,
  Download,
  Upload,
  FileSpreadsheet,
  Info,
  FileText,
  Edit
} from "lucide-react";

const INITIAL_STOCK: StockItem[] = [
  {
    id: "1",
    sku: "SCH-77119-A",
    name: "Batterie 12V 7AH Schindler 3300",
    category: "Électrique / Secours",
    currentStock: 45,
    monthlyDemand: 20,
    leadTimeDays: 7,
    unitCost: 350,
    orderCost: 50,
    holdingRate: 0.15,
  },
  {
    id: "2",
    sku: "SCH-88120-B",
    name: "Isolant Garniture Coulisseau I10 BFK16",
    category: "Mécanique / Coulisseau",
    currentStock: 120,
    monthlyDemand: 40,
    leadTimeDays: 10,
    unitCost: 180,
    orderCost: 40,
    holdingRate: 0.12,
  },
  {
    id: "3",
    sku: "SCH-5100-Q",
    name: "Circuit Carte Électronique SDIC 51.Q*",
    category: "Cartes Électroniques",
    currentStock: 12,
    monthlyDemand: 5,
    leadTimeDays: 14,
    unitCost: 1800,
    orderCost: 120,
    holdingRate: 0.2,
  },
  {
    id: "4",
    sku: "SCH-99001-C",
    name: "S MARCHE 1000/R76 Ton Naturel 1PC Escalier",
    category: "Escalier Mécanique",
    currentStock: 8,
    monthlyDemand: 2,
    leadTimeDays: 21,
    unitCost: 12000,
    orderCost: 250,
    holdingRate: 0.15,
  },
  {
    id: "5",
    sku: "SCH-4402-S",
    name: "Système STM 2 Appareils",
    category: "Entraînement / STM",
    currentStock: 10,
    monthlyDemand: 3,
    leadTimeDays: 15,
    unitCost: 4200,
    orderCost: 150,
    holdingRate: 0.15,
  },
  {
    id: "6",
    sku: "SCH-LUB-220",
    name: "Huile Synthétique Engrenages ISO VG 220 5L",
    category: "Consommable",
    currentStock: 30,
    monthlyDemand: 12,
    leadTimeDays: 5,
    unitCost: 450,
    orderCost: 30,
    holdingRate: 0.1,
  }
];

export const StockManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<"regie" | "catalog">("regie");

  const [items, setItems] = useState<StockItem[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_stock_items_v2");
      return saved ? JSON.parse(saved) : INITIAL_STOCK;
    } catch {
      return INITIAL_STOCK;
    }
  });

  const [loadingAudit, setLoadingAudit] = useState(false);
  const [auditResult, setAuditResult] = useState<string | null>(null);

  const [newItem, setNewItem] = useState<Partial<StockItem>>({
    sku: "",
    name: "",
    category: "Général",
    currentStock: 50,
    monthlyDemand: 20,
    leadTimeDays: 10,
    unitCost: 200,
    orderCost: 50,
    holdingRate: 0.15,
  });

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingItem, setEditingItem] = useState<StockItem | null>(null);

  const saveItems = (newItems: StockItem[]) => {
    setItems(newItems);
    try {
      localStorage.setItem("toolbox_stock_items_v2", JSON.stringify(newItems));
    } catch (e) {
      console.error(e);
    }
  };

  // Stock deduction callback from RegieSheetManager
  const handleDeductStock = (deductions: { skuOrId: string; qty: number }[]) => {
    const updated = items.map((item) => {
      const match = deductions.find(
        (d) =>
          d.skuOrId === item.id ||
          d.skuOrId.toLowerCase() === item.sku.toLowerCase() ||
          item.name.toLowerCase().includes(d.skuOrId.toLowerCase())
      );
      if (match) {
        return { ...item, currentStock: Math.max(0, item.currentStock - match.qty) };
      }
      return item;
    });
    saveItems(updated);
  };

  // Calculations per item
  const getItemMetrics = (item: StockItem) => {
    const dailyDemand = item.monthlyDemand / 30;
    const annualDemand = item.monthlyDemand * 12;
    const leadTimeDemand = dailyDemand * item.leadTimeDays;
    const safetyStock = item.safetyStockManual ?? Math.ceil(dailyDemand * (item.leadTimeDays * 0.5));
    const reorderPoint = Math.ceil(leadTimeDemand + safetyStock);
    const holdingCostPerUnit = item.unitCost * item.holdingRate;
    const eoq = Math.round(
      Math.sqrt((2 * annualDemand * item.orderCost) / (holdingCostPerUnit || 1))
    );
    const autonomyDays = dailyDemand > 0 ? Math.round(item.currentStock / dailyDemand) : 999;

    let status: "rupture" | "critique" | "normal" | "surstock" = "normal";
    if (item.currentStock <= 0) {
      status = "rupture";
    } else if (item.currentStock <= reorderPoint) {
      status = "critique";
    } else if (autonomyDays > 90) {
      status = "surstock";
    }

    const immobilizedCapital = item.currentStock * item.unitCost;

    return {
      dailyDemand,
      annualDemand,
      safetyStock,
      reorderPoint,
      eoq,
      autonomyDays,
      status,
      immobilizedCapital,
    };
  };

  const totalValue = items.reduce((acc, it) => acc + it.currentStock * it.unitCost, 0);
  const alertCount = items.filter((it) => {
    const m = getItemMetrics(it);
    return m.status === "rupture" || m.status === "critique";
  }).length;
  const overstockCount = items.filter((it) => getItemMetrics(it).status === "surstock").length;

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItem.sku || !newItem.name) return;
    const item: StockItem = {
      id: editingItem ? editingItem.id : Date.now().toString(),
      sku: newItem.sku || "SCH-" + Math.floor(Math.random() * 1000),
      name: newItem.name || "Nouvelle Pièce Schindler",
      category: newItem.category || "Général",
      currentStock: Number(newItem.currentStock) || 0,
      monthlyDemand: Number(newItem.monthlyDemand) || 1,
      leadTimeDays: Number(newItem.leadTimeDays) || 1,
      unitCost: Number(newItem.unitCost) || 1,
      orderCost: Number(newItem.orderCost) || 30,
      holdingRate: Number(newItem.holdingRate) || 0.15,
    };

    let updated: StockItem[];
    if (editingItem) {
      updated = items.map((it) => (it.id === editingItem.id ? item : it));
    } else {
      updated = [...items, item];
    }

    saveItems(updated);
    setShowAddModal(false);
    setEditingItem(null);
    setNewItem({
      sku: "",
      name: "",
      category: "Général",
      currentStock: 50,
      monthlyDemand: 20,
      leadTimeDays: 10,
      unitCost: 200,
      orderCost: 50,
      holdingRate: 0.15,
    });
  };

  const handleDeleteItem = (id: string) => {
    if (confirm("Supprimer cette référence du stock ?")) {
      saveItems(items.filter((it) => it.id !== id));
    }
  };

  const handleRunAiAudit = async () => {
    setLoadingAudit(true);
    setAuditResult(null);

    const itemsPayload = items.map((it) => {
      const m = getItemMetrics(it);
      return {
        sku: it.sku,
        nom: it.name,
        categorie: it.category,
        stockActuel: it.currentStock,
        consoMensuelle: it.monthlyDemand,
        delaiJours: it.leadTimeDays,
        prixUnitaire: `${it.unitCost} MAD`,
        pointDeCommandeTheorique: m.reorderPoint,
        stockSecuriteTheorique: m.safetyStock,
        quantiteEconomiqueWilsonEOQ: m.eoq,
        autonomieJours: m.autonomyDays,
        statutAlerte: m.status,
        capitalImmobilise: `${m.immobilizedCapital.toFixed(2)} MAD`,
      };
    });

    try {
      const res = await fetch("/api/gemini/stock-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: itemsPayload,
          globalParams: {
            valeurTotaleStock: `${totalValue.toFixed(2)} MAD`,
            articlesEnAlerteRupture: alertCount,
            articlesEnSurstock: overstockCount,
          },
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAuditResult(data.text);
    } catch (err: any) {
      setAuditResult(`⚠️ Erreur d'audit : ${err.message}`);
    } finally {
      setLoadingAudit(false);
    }
  };

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const stockExcelInputRef = useRef<HTMLInputElement>(null);

  const exportStockExcel = () => {
    const excelRows = items.map((it) => {
      const m = getItemMetrics(it);
      return {
        "SKU": it.sku,
        "Article": it.name,
        "Catégorie": it.category,
        "Stock Actuel": it.currentStock,
        "Conso Mensuelle": it.monthlyDemand,
        "Délai Réappro (j)": it.leadTimeDays,
        "Prix Unitaire (MAD)": it.unitCost,
        "Coût Commande (MAD)": it.orderCost,
        "Taux Possession": it.holdingRate,
        "Stock Sécurité": m.safetyStock,
        "Point Commande (ROP)": m.reorderPoint,
        "Quantité Économique (Wilson)": m.eoq,
        "Autonomie (j)": m.autonomyDays,
        "Valeur Stock (MAD)": Number(m.immobilizedCapital.toFixed(2)),
        "Statut": m.status,
      };
    });

    exportToExcel(
      [{ sheetName: "Stock & Réappro", data: excelRows }],
      `Stock_Audite_Schindler_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Helper to extract fields flexibly regardless of column naming / casing / accents
  const getFlexibleField = (row: Record<string, any>, ...patterns: (string | RegExp)[]): any => {
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

  const handleImportStockExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed: any = await readExcelFile(file);
      const rawRows: Record<string, any>[] = Array.isArray(parsed)
        ? parsed
        : parsed?.primaryRows || [];

      const rows = rawRows.filter((r) => {
        if (!r || typeof r !== "object") return false;
        return Object.values(r).some((v) => v !== undefined && v !== null && String(v).trim() !== "");
      });

      if (!rows || rows.length === 0) {
        alert("Le fichier sélectionné est vide ou ne contient aucune ligne de données.");
        return;
      }

      const importedItems: StockItem[] = rows.map((row, idx) => {
        const sku =
          getFlexibleField(row, "SKU", "Code", "Reference", "Ref", "Réf", "Matricule", "Numéro") ||
          `SCH-${idx + 1}`;
        const name =
          getFlexibleField(row, "Article", "Nom", "Designation", "Désignation", "Libellé", "Libelle", "Description") ||
          `Pièce ${sku}`;
        const category =
          getFlexibleField(row, "Catégorie", "Categorie", "Groupe", "Famille", "Category") ||
          "Général";
        const currentStock = Number(
          getFlexibleField(row, "Stock Actuel", "Stock", "Quantité", "Quantite", "Qte", "En Stock") || 0
        );
        const monthlyDemand = Number(
          getFlexibleField(row, "Conso Mensuelle", "Consommation", "Demande", "Demand", "Sorties") || 20
        );
        const leadTimeDays = Number(
          getFlexibleField(row, "Délai Réappro (j)", "Délai", "Delai", "Lead Time", "Delai Fournisseur") || 10
        );
        const unitCost = Number(
          getFlexibleField(row, "Prix Unitaire (MAD)", "Prix Unitaire", "Prix", "Cout", "PU HT", "Montant HT") || 100
        );
        const orderCost = Number(
          getFlexibleField(row, "Coût Commande (MAD)", "Coût Commande", "Cout Commande", "Frais Fixes") || 50
        );
        const holdingRate = Number(
          getFlexibleField(row, "Taux Possession", "Taux", "Holding Rate") || 0.15
        );

        return {
          id: `stock-imp-${Date.now()}-${idx}`,
          sku: String(sku).trim(),
          name: String(name).trim(),
          category: String(category).trim(),
          currentStock: isNaN(currentStock) ? 0 : Math.max(0, currentStock),
          monthlyDemand: isNaN(monthlyDemand) ? 20 : Math.max(1, monthlyDemand),
          leadTimeDays: isNaN(leadTimeDays) ? 10 : Math.max(1, leadTimeDays),
          unitCost: isNaN(unitCost) ? 100 : Math.max(0, unitCost),
          orderCost: isNaN(orderCost) ? 50 : Math.max(0, orderCost),
          holdingRate: isNaN(holdingRate) ? 0.15 : Math.max(0.01, holdingRate),
        };
      });

      // Avoid duplicates by SKU
      const existingSkus = new Set(items.map((it) => it.sku.toUpperCase()));
      const newItems = importedItems.filter((it) => !existingSkus.has(it.sku.toUpperCase()));
      const duplicatesCount = importedItems.length - newItems.length;

      saveItems([...newItems, ...items]);
      alert(
        `${newItems.length} article(s) importé(s) avec succès dans le stock !${
          duplicatesCount > 0 ? ` (${duplicatesCount} doublons ignorés)` : ""
        }`
      );
    } catch (err: any) {
      alert(`Erreur d'importation Excel : ${err.message || "format invalide"}`);
    } finally {
      if (stockExcelInputRef.current) stockExcelInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-Tabs Header Navigation Bar */}
      <div className="flex border-b border-slate-800 space-x-2">
        <button
          type="button"
          onClick={() => setActiveSubTab("regie")}
          className={`px-4 py-3 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "regie"
              ? "bg-rose-600 text-white shadow-lg shadow-rose-600/20 border-t-2 border-rose-400"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
          }`}
        >
          <FileText className="w-4 h-4 text-white" />
          <span>Demandes de Pièces de Rechange (Fiches de Régie Schindler)</span>
          <span className="px-2 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-950 text-rose-300 border border-rose-700">
            Fiche Admin
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("catalog")}
          className={`px-4 py-3 font-bold text-xs rounded-t-xl transition-all flex items-center gap-2 cursor-pointer ${
            activeSubTab === "catalog"
              ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border-t-2 border-blue-400"
              : "bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800/80"
          }`}
        >
          <Boxes className="w-4 h-4 text-white" />
          <span>Catalogue Stock & Approvisionnement (ROP / EOQ)</span>
          <span className="px-2 py-0.5 text-[10px] font-mono rounded-full bg-slate-800 text-slate-300">
            {items.length} Réf
          </span>
        </button>
      </div>

      {/* SUB-TAB 1: FICHES DE RÉGIE & DEMANDES DE PIÈCES */}
      {activeSubTab === "regie" && (
        <RegieSheetManager
          stockItems={items}
          onDeductStock={handleDeductStock}
        />
      )}

      {/* SUB-TAB 2: CATALOGUE STOCK & CALCULS APPROVISIONNEMENT */}
      {activeSubTab === "catalog" && (
        <div className="space-y-6">
          {/* Top Metrics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Valeur Totale Stock</p>
                <p className="text-xl font-bold text-slate-100 mt-1 font-mono">
                  {totalValue.toLocaleString("fr-FR")} MAD
                </p>
                <p className="text-xs text-slate-400 mt-0.5">{items.length} références gérées</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <Boxes className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Alertes Réappro / Rupture</p>
                <p className="text-xl font-bold text-rose-400 mt-1 font-mono">{alertCount} article(s)</p>
                <p className="text-xs text-slate-400 mt-0.5">Stock &le; Point de Commande</p>
              </div>
              <div className="p-3 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Articles en Surstock</p>
                <p className="text-xl font-bold text-amber-400 mt-1 font-mono">{overstockCount} article(s)</p>
                <p className="text-xs text-slate-400 mt-0.5">&gt; 90 jours de couverture</p>
              </div>
              <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Moteur Mathématique</p>
                <p className="text-sm font-semibold text-emerald-400 mt-1">Formule Wilson (EOQ) + ROP</p>
                <p className="text-xs text-slate-400 mt-0.5">Calcul en temps réel</p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  setNewItem({
                    sku: "",
                    name: "",
                    category: "Général",
                    currentStock: 50,
                    monthlyDemand: 20,
                    leadTimeDays: 10,
                    unitCost: 200,
                    orderCost: 50,
                    holdingRate: 0.15,
                  });
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Ajouter une référence</span>
              </button>

              <button
                type="button"
                onClick={exportStockExcel}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs border border-emerald-500/40 font-semibold transition-colors cursor-pointer shadow-xs"
                title="Exporter tout le catalogue de stock au format Excel natif (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Exporter Excel (.xlsx)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (stockExcelInputRef.current) {
                    stockExcelInputRef.current.value = "";
                    stockExcelInputRef.current.click();
                  }
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 font-semibold transition-colors cursor-pointer shadow-xs"
                title="Importer des articles depuis un fichier Excel ou CSV (.xlsx, .xls, .csv)"
              >
                <Upload className="w-4 h-4 text-blue-400" />
                <span>Importer Excel</span>
              </button>
              <input
                ref={stockExcelInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleImportStockExcel}
              />

              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs border border-rose-800/60 font-semibold transition-colors cursor-pointer"
                title="Purger l'ensemble du stock"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Purger Tout</span>
              </button>

              <button
                type="button"
                onClick={() => saveItems(INITIAL_STOCK)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/60 transition-colors cursor-pointer"
                title="Réinitialiser le catalogue Schindler"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser Stock</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleRunAiAudit}
              disabled={loadingAudit || items.length === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>{loadingAudit ? "Audit Expert en cours..." : "Lancer l'Audit IA & Recommandations"}</span>
            </button>
          </div>

          {/* Stock Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                    <th className="p-3">SKU & Article</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3 text-right">Stock Actuel</th>
                    <th className="p-3 text-right">Conso/mois</th>
                    <th className="p-3 text-right">Délai (j)</th>
                    <th className="p-3 text-right">Coût Unit. (MAD)</th>
                    <th className="p-3 text-right bg-slate-800/20 text-cyan-400">Stock Sécu</th>
                    <th className="p-3 text-right bg-slate-800/20 text-blue-400">Point Cde (ROP)</th>
                    <th className="p-3 text-right bg-slate-800/20 text-emerald-400">Qte Éco (Wilson)</th>
                    <th className="p-3 text-center">Autonomie</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {items.map((item) => {
                    const metrics = getItemMetrics(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-3 font-medium text-slate-200">
                          <div className="font-mono text-xs text-blue-400">{item.sku}</div>
                          <div className="text-slate-300 text-xs font-normal truncate max-w-[180px]" title={item.name}>
                            {item.name}
                          </div>
                        </td>
                        <td className="p-3 text-slate-400">
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 border border-slate-700">
                            {item.category}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-semibold text-slate-100">
                          {item.currentStock.toLocaleString("fr-FR")} u
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">
                          {item.monthlyDemand.toLocaleString("fr-FR")}
                        </td>
                        <td className="p-3 text-right font-mono text-slate-300">{item.leadTimeDays} j</td>
                        <td className="p-3 text-right font-mono text-slate-300">{item.unitCost.toFixed(2)} MAD</td>
                        <td className="p-3 text-right font-mono text-cyan-300 font-medium bg-slate-800/10">
                          {metrics.safetyStock} u
                        </td>
                        <td className="p-3 text-right font-mono text-blue-300 font-bold bg-slate-800/10">
                          {metrics.reorderPoint} u
                        </td>
                        <td className="p-3 text-right font-mono text-emerald-300 font-bold bg-slate-800/10">
                          {metrics.eoq} u
                        </td>
                        <td className="p-3 text-center font-mono text-xs text-slate-300">
                          <span className={metrics.autonomyDays < 15 ? "text-rose-400 font-bold" : ""}>
                            {metrics.autonomyDays} j
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          {metrics.status === "rupture" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-bold">
                              Rupture
                            </span>
                          )}
                          {metrics.status === "critique" && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-semibold flex items-center justify-center gap-1">
                              <AlertCircle className="w-2.5 h-2.5" /> Réappro
                            </span>
                          )}
                          {metrics.status === "surstock" && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[10px] font-medium">
                              Surstock
                            </span>
                          )}
                          {metrics.status === "normal" && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px]">
                              Optimal
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Edit Button */}
                            <button
                              onClick={() => {
                                setEditingItem(item);
                                setNewItem({ ...item });
                                setShowAddModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
                              title="Modifier cette référence stock"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                              title="Supprimer la référence"
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

          {/* AI Strategic Audit Result */}
          {auditResult && (
            <div className="mt-8 pt-6 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Rapport d'Audit Stratégique - Direction Supply Chain & Stocks
                </h3>
              </div>
              <div className="p-5 rounded-2xl bg-slate-900/90 border border-emerald-500/30 shadow-xl">
                <FormattedOutput content={auditResult} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT STOCK ITEM */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Boxes className="w-4 h-4 text-blue-400" />
                {editingItem ? "Modifier la référence article" : "Ajouter une référence article"}
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Code SKU / N° Identification *</label>
                  <input
                    type="text"
                    required
                    value={newItem.sku}
                    onChange={(e) => setNewItem({ ...newItem, sku: e.target.value })}
                    placeholder="ex: SCH-77119-A"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Catégorie</label>
                  <input
                    type="text"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Électrique, Mécanique, etc."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Désignation de l'article *</label>
                <input
                  type="text"
                  required
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="ex: Batterie 12V 7AH Schindler"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Stock Actuel (u)</label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.currentStock}
                    onChange={(e) => setNewItem({ ...newItem, currentStock: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Conso Mensuelle (u)</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.monthlyDemand}
                    onChange={(e) => setNewItem({ ...newItem, monthlyDemand: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Délai Réappro (j)</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.leadTimeDays}
                    onChange={(e) => setNewItem({ ...newItem, leadTimeDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Coût d'Achat (MAD)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Coût Commande (MAD)</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.orderCost}
                    onChange={(e) => setNewItem({ ...newItem, orderCost: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Taux Possess. (0-1)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1"
                    value={newItem.holdingRate}
                    onChange={(e) => setNewItem({ ...newItem, holdingRate: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs cursor-pointer"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PURGE ALL STOCK CONFIRMATION */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-600/70 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Purger l'intégralité du Stock ?</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Suppression de toutes les {items.length} références
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Voulez-vous réinitialiser à zéro tout le catalogue d'articles ? Vous pourrez importer un nouveau fichier Excel (.xlsx) ou cliquer sur "Réinitialiser Stock" à tout moment.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  saveItems([]);
                  setShowPurgeModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
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
