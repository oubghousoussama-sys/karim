import React, { useState, useEffect } from "react";
import { FormattedOutput } from "../FormattedOutput";
import { Quote, QuoteStatus, MaintenancePartConsumption, PartStatus, PFEquipment } from "../../types";
import { INITIAL_QUOTES, INITIAL_PARTS_CONSUMPTION } from "../../data/mockFinanceData";
import { INITIAL_PF_EQUIPMENTS } from "../../data/mockPFData";
import { QuotesManager } from "../finance/QuotesManager";
import { BillingScheduler } from "../finance/BillingScheduler";
import { PartsConsumptionTracker } from "../finance/PartsConsumptionTracker";
import { SingleQuoteModal } from "../finance/SingleQuoteModal";
import { MassQuoteModal } from "../finance/MassQuoteModal";
import { AddPartModal } from "../finance/AddPartModal";
import {
  TrendingUp,
  DollarSign,
  Calculator,
  Sparkles,
  PieChart as PieIcon,
  FileText,
  Calendar,
  Wrench,
  Layers,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

type FinanceSubTab = "quotes" | "schedule" | "parts" | "profitability";

export const FinanceCalculator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<FinanceSubTab>("quotes");

  // Persisted Quotes
  const [quotes, setQuotes] = useState<Quote[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_quotes_v3");
      return saved ? JSON.parse(saved) : INITIAL_QUOTES;
    } catch {
      return INITIAL_QUOTES;
    }
  });

  // Persisted Spare Parts Consumption
  const [parts, setParts] = useState<MaintenancePartConsumption[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_parts_v1");
      return saved ? JSON.parse(saved) : INITIAL_PARTS_CONSUMPTION;
    } catch {
      return INITIAL_PARTS_CONSUMPTION;
    }
  });

  // Equipments for dropdowns and linking (Parc & CPSI)
  const [equipments, setEquipments] = useState<PFEquipment[]>(() => {
    try {
      const saved = localStorage.getItem("toolbox_pf_equipments") || localStorage.getItem("toolbox_pf_equipments_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_PF_EQUIPMENTS;
    } catch {
      return INITIAL_PF_EQUIPMENTS;
    }
  });

  // Reload latest equipments when opening modals
  const refreshEquipments = () => {
    try {
      const saved = localStorage.getItem("toolbox_pf_equipments") || localStorage.getItem("toolbox_pf_equipments_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setEquipments(parsed);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Modals state
  const [showSingleQuoteModal, setShowSingleQuoteModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState<Quote | null>(null);
  const [showMassQuoteModal, setShowMassQuoteModal] = useState(false);

  const [showAddPartModal, setShowAddPartModal] = useState(false);
  const [editingPart, setEditingPart] = useState<MaintenancePartConsumption | null>(null);

  const [schedulerSelectedQuoteId, setSchedulerSelectedQuoteId] = useState<string | null>(null);

  // Sync to local storage
  const saveQuotes = (newQuotes: Quote[]) => {
    setQuotes(newQuotes);
    try {
      localStorage.setItem("toolbox_quotes_v3", JSON.stringify(newQuotes));
    } catch (e) {
      console.error(e);
    }
  };

  const saveParts = (newParts: MaintenancePartConsumption[]) => {
    setParts(newParts);
    try {
      localStorage.setItem("toolbox_parts_v1", JSON.stringify(newParts));
    } catch (e) {
      console.error(e);
    }
  };

  // Quotes Handlers
  const handleSaveQuote = (quote: Quote) => {
    const existingIndex = quotes.findIndex((q) => q.id === quote.id);
    let updated: Quote[];
    if (existingIndex >= 0) {
      updated = [...quotes];
      updated[existingIndex] = quote;
    } else {
      updated = [quote, ...quotes];
    }
    saveQuotes(updated);
    setEditingQuote(null);
  };

  const handleImportMassQuotes = (importedQuotes: Quote[], replaceAll = false) => {
    if (replaceAll) {
      saveQuotes(importedQuotes);
    } else {
      // Merge by quoteNumber: update existing quotes and prepend new ones
      const existingMap = new Map(quotes.map((q) => [q.quoteNumber?.trim().toUpperCase(), q]));
      const newQuotes: Quote[] = [];
      importedQuotes.forEach((iq) => {
        const key = iq.quoteNumber?.trim().toUpperCase();
        if (key && existingMap.has(key)) {
          existingMap.set(key, iq);
        } else {
          newQuotes.push(iq);
        }
      });
      const updatedList = [...newQuotes, ...Array.from(existingMap.values())];
      saveQuotes(updatedList);
    }
  };

  const handleDeleteQuote = (id: string) => {
    saveQuotes(quotes.filter((q) => q.id !== id));
  };

  const handlePurgeQuotes = () => {
    saveQuotes([]);
  };

  const handleResetQuotes = () => {
    saveQuotes(INITIAL_QUOTES);
  };

  const handleUpdateQuoteStatus = (id: string, status: QuoteStatus) => {
    saveQuotes(
      quotes.map((q) => (q.id === id ? { ...q, status } : q))
    );
  };

  const handleOpenSchedulerForQuote = (quote: Quote) => {
    setSchedulerSelectedQuoteId(quote.id);
    setActiveTab("schedule");
  };

  // Parts Handlers
  const handleSavePart = (part: MaintenancePartConsumption) => {
    const existingIndex = parts.findIndex((p) => p.id === part.id);
    let updated: MaintenancePartConsumption[];
    if (existingIndex >= 0) {
      updated = [...parts];
      updated[existingIndex] = part;
    } else {
      updated = [part, ...parts];
    }
    saveParts(updated);
    setEditingPart(null);
  };

  const handleDeletePart = (id: string) => {
    saveParts(parts.filter((p) => p.id !== id));
  };

  const handleUpdatePartStatus = (id: string, newStatus: PartStatus) => {
    saveParts(
      parts.map((p) => {
        if (p.id === id) {
          const isInstalled = newStatus === "Consommée / Installée";
          return {
            ...p,
            status: newStatus,
            installationDate: isInstalled ? p.installationDate || "2026-09-01" : p.installationDate,
          };
        }
        return p;
      })
    );
  };

  // Profitability Simulator state
  const [ca, setCa] = useState(500000);
  const [chargesVariables, setChargesVariables] = useState(275000);
  const [chargesFixes, setChargesFixes] = useState(150000);
  const [daysInYear] = useState(360);

  const [loadingAi, setLoadingAi] = useState(false);
  const [financeAiResult, setFinanceAiResult] = useState<string | null>(null);

  // Math metrics for Profitability
  const mcv = ca - chargesVariables;
  const tauxMcv = ca > 0 ? mcv / ca : 0;
  const seuilRentabilite = tauxMcv > 0 ? chargesFixes / tauxMcv : 0;
  const pointMortJours = ca > 0 ? Math.round((seuilRentabilite / ca) * daysInYear) : 0;
  const resultatNet = mcv - chargesFixes;
  const margeNettePct = ca > 0 ? (resultatNet / ca) * 100 : 0;
  const margeSecurite = ca - seuilRentabilite;
  const indiceSecurite = ca > 0 ? (margeSecurite / ca) * 100 : 0;

  const chartData = [
    { name: "Chiffre d'Affaires", valeur: ca, fill: "#3b82f6" },
    { name: "Charges Variables", valeur: chargesVariables, fill: "#f59e0b" },
    { name: "Charges Fixes", valeur: chargesFixes, fill: "#ef4444" },
    { name: "Marge s/ Coût Var.", valeur: mcv, fill: "#06b6d4" },
    { name: "Résultat d'Exploitation", valeur: Math.max(0, resultatNet), fill: "#10b981" },
    { name: "Seuil de Rentabilité", valeur: Math.round(seuilRentabilite), fill: "#8b5cf6" },
  ];

  const handleRunFinanceAi = async () => {
    setLoadingAi(true);
    setFinanceAiResult(null);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextSpecialty: "Contrôleur de Gestion & Stratégie Financière",
          messages: [
            {
              role: "user",
              content: `Effectue un audit de rentabilité financière et de seuil de point mort pour ces paramètres (en Dirhams Marocains - MAD) :
- Chiffre d'Affaires prévisionnel / réalisé : ${ca.toLocaleString("fr-FR")} MAD
- Charges Variables totales : ${chargesVariables.toLocaleString("fr-FR")} MAD
- Charges Fixes d'exploitation : ${chargesFixes.toLocaleString("fr-FR")} MAD
- Marge sur Coût Variable : ${mcv.toLocaleString("fr-FR")} MAD (Taux de MCV : ${(tauxMcv * 100).toFixed(1)} %)
- Seuil de Rentabilité (Point Mort) : ${Math.round(seuilRentabilite).toLocaleString("fr-FR")} MAD
- Point Mort en Jours d'activité : ${pointMortJours} jours / ${daysInYear}
- Résultat d'Exploitation estimé : ${resultatNet.toLocaleString("fr-FR")} MAD (Marge nette : ${margeNettePct.toFixed(1)} %)
- Indice de Sécurité : ${indiceSecurite.toFixed(1)} %

Analyse la solidité financière du modèle, les leviers d'action (prix, volumes, renégociation coûts fixes/variables en MAD), et propose un plan d'optimisation d'expert pour sécuriser le résultat.
Respecte scrupuleusement le format TOOLBOX AI PRO (🎯 OBJECTIF, 📋 SYNTHÈSE, 🔍 ANALYSE, ✅ RECOMMANDATION, 🛠 PLAN D'ACTION, ⚠️ POINTS DE VIGILANCE, 📈 IMPACT ATTENDU, ⭐ CONSEIL EXPERT).`,
            },
          ],
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setFinanceAiResult(data.text);
    } catch (err: any) {
      setFinanceAiResult(`⚠️ Erreur : ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("quotes")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "quotes"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Gestion des Devis</span>
            <span className="px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono font-bold">
              {quotes.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("schedule")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "schedule"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Échéancier & Prévisions</span>
          </button>

          <button
            onClick={() => setActiveTab("parts")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "parts"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Consommation Pièces</span>
            <span className="px-1.5 py-0.2 rounded-full bg-amber-950 text-amber-300 text-[10px] font-mono font-bold">
              {parts.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("profitability")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === "profitability"
                ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Point Mort & Rentabilité</span>
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="hidden sm:inline">Module Contrôle Financier & Pilotage Budgétaire</span>
        </div>
      </div>

      {/* TAB 1: QUOTES MANAGEMENT */}
      {activeTab === "quotes" && (
        <QuotesManager
          quotes={quotes}
          equipments={equipments}
          onAddQuote={() => {
            refreshEquipments();
            setEditingQuote(null);
            setShowSingleQuoteModal(true);
          }}
          onMassAddQuotes={() => {
            refreshEquipments();
            setShowMassQuoteModal(true);
          }}
          onEditQuote={(q) => {
            refreshEquipments();
            setEditingQuote(q);
            setShowSingleQuoteModal(true);
          }}
          onDeleteQuote={handleDeleteQuote}
          onUpdateQuoteStatus={handleUpdateQuoteStatus}
          onOpenSchedulerForQuote={handleOpenSchedulerForQuote}
          onPurgeQuotes={handlePurgeQuotes}
          onResetQuotes={handleResetQuotes}
        />
      )}

      {/* TAB 2: BILLING SCHEDULE & FORECASTS */}
      {activeTab === "schedule" && (
        <BillingScheduler
          quotes={quotes}
          equipments={equipments}
          onUpdateQuote={handleSaveQuote}
          selectedQuoteId={schedulerSelectedQuoteId}
        />
      )}

      {/* TAB 3: SPARE PARTS CONSUMPTION TRACKER */}
      {activeTab === "parts" && (
        <PartsConsumptionTracker
          parts={parts}
          equipments={equipments}
          onAddPart={() => {
            setEditingPart(null);
            setShowAddPartModal(true);
          }}
          onEditPart={(p) => {
            setEditingPart(p);
            setShowAddPartModal(true);
          }}
          onDeletePart={handleDeletePart}
          onUpdatePartStatus={handleUpdatePartStatus}
        />
      )}

      {/* TAB 4: PROFITABILITY & BREAK-EVEN SIMULATOR */}
      {activeTab === "profitability" && (
        <div className="space-y-6">
          {/* Parameters & Live Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* Controls */}
            <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 text-xs">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
                <Calculator className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Paramètres Financiers & Modèle Économique
                </h3>
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Chiffre d'Affaires Global HT (MAD)</span>
                  <span className="font-mono text-emerald-400">{ca.toLocaleString("fr-FR")} MAD</span>
                </div>
                <input
                  type="number"
                  min="1000"
                  step="5000"
                  value={ca}
                  onChange={(e) => setCa(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Charges Variables Totales (MAD)</span>
                  <span className="font-mono text-amber-400">{chargesVariables.toLocaleString("fr-FR")} MAD</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="5000"
                  value={chargesVariables}
                  onChange={(e) => setChargesVariables(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <div className="flex justify-between text-slate-300 font-medium mb-1">
                  <span>Charges Fixes Annuelles (MAD)</span>
                  <span className="font-mono text-rose-400">{chargesFixes.toLocaleString("fr-FR")} MAD</span>
                </div>
                <input
                  type="number"
                  min="0"
                  step="2000"
                  value={chargesFixes}
                  onChange={(e) => setChargesFixes(Number(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <button
                onClick={handleRunFinanceAi}
                disabled={loadingAi}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>{loadingAi ? "Analyse financière..." : "Audit Rentabilité & Leviers IA (MAD)"}</span>
              </button>
            </div>

            {/* Live Computed Metrics */}
            <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Marge s/ Coût Var.</p>
                <p className="text-xl font-bold text-cyan-400 font-mono my-1">
                  {mcv.toLocaleString("fr-FR")} MAD
                </p>
                <p className="text-xs text-slate-400">Taux MCV : {(tauxMcv * 100).toFixed(1)} %</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-purple-500/30 flex flex-col justify-between">
                <p className="text-[11px] text-purple-300 font-semibold uppercase tracking-wider">Seuil de Rentabilité</p>
                <p className="text-xl font-bold text-purple-400 font-mono my-1">
                  {Math.round(seuilRentabilite).toLocaleString("fr-FR")} MAD
                </p>
                <p className="text-xs text-slate-400">CA minimum à l'équilibre</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Point Mort (Jours)</p>
                <p className="text-xl font-bold text-blue-400 font-mono my-1">
                  {pointMortJours} jours
                </p>
                <p className="text-xs text-slate-400">sur {daysInYear} jours d'exercice</p>
              </div>

              <div
                className={`p-4 rounded-xl border flex flex-col justify-between ${
                  resultatNet >= 0
                    ? "bg-slate-900/90 border-emerald-500/30 text-emerald-400"
                    : "bg-slate-900/90 border-rose-500/30 text-rose-400"
                }`}
              >
                <p className="text-[11px] font-semibold uppercase tracking-wider">Résultat d'Exploitation</p>
                <p className="text-xl font-bold font-mono my-1">
                  {resultatNet.toLocaleString("fr-FR")} MAD
                </p>
                <p className="text-xs text-slate-400">Marge nette : {margeNettePct.toFixed(1)} %</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Marge de Sécurité</p>
                <p className="text-xl font-bold text-emerald-400 font-mono my-1">
                  {Math.round(margeSecurite).toLocaleString("fr-FR")} MAD
                </p>
                <p className="text-xs text-slate-400">Coussin de sécurité</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
                <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">Indice de Sécurité</p>
                <p className="text-xl font-bold text-teal-400 font-mono my-1">
                  {indiceSecurite.toFixed(1)} %
                </p>
                <p className="text-xs text-slate-400">Baisse max tolérée du CA</p>
              </div>
            </div>
          </div>

          {/* Chart Visualization */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-md">
            <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
              <PieIcon className="w-3.5 h-3.5 text-purple-400" />
              Décomposition du Modèle Économique & Seuil de Rentabilité (MAD)
            </h4>
            <div className="h-56 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#334155",
                      borderRadius: "8px",
                      fontSize: "11px",
                    }}
                    formatter={(val: any) => [`${Number(val).toLocaleString("fr-FR")} MAD`, "Valeur"]}
                  />
                  <Bar dataKey="valeur" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI CFO Recommendation */}
          {financeAiResult && (
            <div className="p-5 rounded-2xl bg-slate-900/95 border border-purple-500/30 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  Audit Financier & Recommandations du Contrôleur de Gestion
                </h3>
              </div>
              <FormattedOutput content={financeAiResult} />
            </div>
          )}
        </div>
      )}

      {/* MODALS */}
      <SingleQuoteModal
        isOpen={showSingleQuoteModal}
        onClose={() => {
          setShowSingleQuoteModal(false);
          setEditingQuote(null);
        }}
        onSave={handleSaveQuote}
        initialQuote={editingQuote}
        equipments={equipments}
      />

      <MassQuoteModal
        isOpen={showMassQuoteModal}
        onClose={() => setShowMassQuoteModal(false)}
        onImportQuotes={handleImportMassQuotes}
        equipments={equipments}
      />

      <AddPartModal
        isOpen={showAddPartModal}
        onClose={() => {
          setShowAddPartModal(false);
          setEditingPart(null);
        }}
        onSave={handleSavePart}
        equipments={equipments}
        initialPart={editingPart}
      />
    </div>
  );
};
