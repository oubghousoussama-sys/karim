import React, { useState, useMemo } from "react";
import { Quote, QuoteStatus, PFEquipment } from "../../types";
import { MONTH_LIST } from "../../data/mockFinanceData";
import {
  FileText,
  Plus,
  Layers,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Send,
  XCircle,
  Calendar,
  DollarSign,
  TrendingUp,
  Percent,
  Trash2,
  Edit3,
  RotateCcw,
  Download,
  FileSpreadsheet,
  ChevronDown,
  Calculator,
  Upload,
} from "lucide-react";
import {
  exportQuotesToExcel,
  exportQuotesToCsv,
  exportSingleQuoteToExcel,
} from "../../utils/excelExport";

interface QuotesManagerProps {
  quotes: Quote[];
  equipments: PFEquipment[];
  onAddQuote: () => void;
  onMassAddQuotes: () => void;
  onEditQuote: (quote: Quote) => void;
  onDeleteQuote: (id: string) => void;
  onUpdateQuoteStatus: (id: string, status: QuoteStatus) => void;
  onOpenSchedulerForQuote?: (quote: Quote) => void;
  onPurgeQuotes?: () => void;
  onResetQuotes?: () => void;
}

export const QuotesManager: React.FC<QuotesManagerProps> = ({
  quotes,
  equipments,
  onAddQuote,
  onMassAddQuotes,
  onEditQuote,
  onDeleteQuote,
  onUpdateQuoteStatus,
  onOpenSchedulerForQuote,
  onPurgeQuotes,
  onResetQuotes,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pfFilter, setPfFilter] = useState<string>("all");
  const [c1Filter, setC1Filter] = useState<string>("all");
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string | null>(null);

  const filteredQuotes = useMemo(() => {
    return quotes.filter((q) => {
      const matchSearch =
        q.quoteNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        q.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (q.pfNumber && q.pfNumber.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === "all" || q.status === statusFilter;
      const matchPf = pfFilter === "all" || q.pfNumber === pfFilter;

      const matchC1 = (() => {
        if (c1Filter === "all") return true;
        const cost = q.costPriceHT ?? q.estimatedCostHT ?? 0;
        const c1Pct =
          q.c1Percent !== undefined
            ? q.c1Percent
            : q.amountHT > 0
            ? ((q.amountHT - cost) / q.amountHT) * 100
            : 0;

        if (c1Filter === "high") return c1Pct >= 50; // ≥ 50% C1
        if (c1Filter === "standard") return c1Pct >= 30 && c1Pct < 50; // 30% - 50% C1
        if (c1Filter === "low") return c1Pct < 30; // < 30% C1
        return true;
      })();

      return matchSearch && matchStatus && matchPf && matchC1;
    });
  }, [quotes, searchTerm, statusFilter, pfFilter, c1Filter]);

  // Export handlers
  const handleExportExcel = (allQuotes = false) => {
    const target = allQuotes ? quotes : filteredQuotes;
    if (target.length === 0) {
      alert("Aucun devis à exporter.");
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const filterDesc = allQuotes
      ? "Tous les devis du portefeuille Schindler"
      : `Filtres actifs : Statut=${statusFilter}, PF=${pfFilter}, Marge C1=${c1Filter}, Recherche=${searchTerm || "aucune"}`;
    const fileName = allQuotes
      ? `Portefeuille_Devis_Complet_${dateStr}.xlsx`
      : `Portefeuille_Devis_Filtres_${dateStr}.xlsx`;

    exportQuotesToExcel(target, fileName, filterDesc);
    setShowExportMenu(false);
    setExportFeedback(`✓ ${target.length} devis exportés au format Excel (${fileName})`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  const handleExportCsv = (allQuotes = false) => {
    const target = allQuotes ? quotes : filteredQuotes;
    if (target.length === 0) {
      alert("Aucun devis à exporter.");
      return;
    }
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = allQuotes
      ? `Devis_Complets_${dateStr}.csv`
      : `Devis_Filtres_${dateStr}.csv`;

    exportQuotesToCsv(target, fileName);
    setShowExportMenu(false);
    setExportFeedback(`✓ ${target.length} devis exportés au format CSV (${fileName})`);
    setTimeout(() => setExportFeedback(null), 4000);
  };

  // Overall Quotes Financial Metrics in MAD including C1 & Prix de revient
  const totalAmountHT = quotes.reduce((acc, q) => acc + q.amountHT, 0);
  const totalCostHT = quotes.reduce(
    (acc, q) => acc + (q.costPriceHT ?? q.estimatedCostHT ?? 0),
    0
  );
  const totalC1Value = totalAmountHT - totalCostHT;
  const globalC1Pct = totalAmountHT > 0 ? (totalC1Value / totalAmountHT) * 100 : 0;
  const costSharePct = totalAmountHT > 0 ? (totalCostHT / totalAmountHT) * 100 : 0;

  const validatedQuotes = quotes.filter(
    (q) => q.status === "Validé / Accepté" || q.status === "Facturé"
  );
  const validatedAmountHT = validatedQuotes.reduce((acc, q) => acc + q.amountHT, 0);
  const pendingAmountHT = quotes.filter((q) => q.status === "Envoyé").reduce((acc, q) => acc + q.amountHT, 0);

  const conversionRate = quotes.length > 0 ? Math.round((validatedQuotes.length / quotes.length) * 100) : 0;
  const avgMarginPct =
    quotes.length > 0
      ? Math.round((quotes.reduce((acc, q) => acc + (q.estimatedMarginPct || 0), 0) / quotes.length) * 10) / 10
      : 0;

  const getStatusBadge = (status: QuoteStatus) => {
    switch (status) {
      case "Validé / Accepté":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Validé
          </span>
        );
      case "Facturé":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold">
            <DollarSign className="w-3 h-3" /> Facturé
          </span>
        );
      case "Envoyé":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
            <Send className="w-3 h-3" /> Envoyé
          </span>
        );
      case "Brouillon":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-medium">
            <Clock className="w-3 h-3" /> Brouillon
          </span>
        );
      case "Refusé":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] font-semibold">
            <XCircle className="w-3 h-3" /> Refusé
          </span>
        );
    }
  };

  const getMonthLabel = (q: Quote) => {
    const key = q.billingMonth || (q.billingSchedule ? Object.keys(q.billingSchedule)[0] : "2026-12");
    const found = MONTH_LIST.find((m) => m.key === key);
    return found ? found.label : key;
  };

  return (
    <div className="space-y-5">
      {/* Top Financial KPI Strip for Quotes in MAD with Schindler C1 & Cost Price */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Total Vente HT (100%)
          </span>
          <p className="text-lg font-bold text-slate-100 font-mono my-1">
            {totalAmountHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-slate-500">{quotes.length} devis au total</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-600/40 flex flex-col justify-between">
          <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1">
            <span>Coût de Revient</span>
          </span>
          <p className="text-lg font-bold text-amber-400 font-mono my-1">
            {totalCostHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-amber-400/80">Part coût : {costSharePct.toFixed(1)} %</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-emerald-500/50 flex flex-col justify-between shadow-xs">
          <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1">
              <Calculator className="w-3 h-3 text-emerald-400" />
              <span>Marge C1 Globale</span>
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-950 text-emerald-300 font-mono font-bold border border-emerald-800/60">
              {globalC1Pct.toFixed(1)} %
            </span>
          </span>
          <p className="text-lg font-bold text-emerald-400 font-mono my-1">
            {totalC1Value.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-emerald-400/80">Taux C1 moyen</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-blue-500/40 flex flex-col justify-between">
          <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            CA Sécurisé
          </span>
          <p className="text-lg font-bold text-blue-400 font-mono my-1">
            {validatedAmountHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-blue-400/80">{validatedQuotes.length} validés / facturés</span>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-purple-500/30 flex flex-col justify-between">
          <span className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">
            Transformation
          </span>
          <p className="text-lg font-bold text-purple-400 font-mono my-1">
            {conversionRate} %
          </p>
          <span className="text-[10px] text-purple-400/80">{pendingAmountHT.toLocaleString("fr-FR")} MAD en cours</span>
        </div>
      </div>

      {/* Control Bar & Actions */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par N° Devis, Client, Titre, N° PF..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 placeholder-slate-500"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300"
            >
              <option value="all">Tous Statuts</option>
              <option value="Validé / Accepté">Validé / Accepté</option>
              <option value="Envoyé">Envoyé</option>
              <option value="Brouillon">Brouillon</option>
              <option value="Facturé">Facturé</option>
              <option value="Refusé">Refusé</option>
            </select>
          </div>

          <div>
            <select
              value={pfFilter}
              onChange={(e) => setPfFilter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-300 font-mono"
            >
              <option value="all">Tous Appareils PF</option>
              {equipments.map((eq) => (
                <option key={eq.id} value={eq.pfNumber}>
                  {eq.pfNumber} ({eq.city})
                </option>
              ))}
            </select>
          </div>

          {/* Marge C1 Filter */}
          <div>
            <select
              value={c1Filter}
              onChange={(e) => setC1Filter(e.target.value)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-300 font-semibold"
              title="Filtrer par seuil de marge C1"
            >
              <option value="all">Toutes Marges C1</option>
              <option value="high">C1 Élevé (≥ 50%)</option>
              <option value="standard">C1 Standard (30% - 50%)</option>
              <option value="low">C1 Modéré (&lt; 30%)</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* EXPORT QUOTES BUTTON WITH DROPDOWN */}
          <div className="relative">
            <div className="flex items-center rounded-lg shadow-md overflow-hidden border border-emerald-600/60 bg-emerald-600">
              <button
                type="button"
                onClick={() => handleExportExcel(false)}
                className="px-3 py-1.5 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer text-xs transition-colors"
                title={`Exporter les ${filteredQuotes.length} devis visibles au format Excel (.xlsx)`}
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                <span>Exporter Devis ({filteredQuotes.length})</span>
                <Download className="w-3 h-3 text-emerald-100" />
              </button>
              <button
                type="button"
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="px-1.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white border-l border-emerald-500/50 cursor-pointer transition-colors"
                title="Options d'exportation (Excel, CSV, Tout le portefeuille)"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showExportMenu ? "rotate-180" : ""}`} />
              </button>
            </div>

            {/* Dropdown Options */}
            {showExportMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-1.5 w-64 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 p-2 text-xs space-y-1 animate-fade-in">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 flex items-center justify-between">
                    <span>Format Excel (.xlsx)</span>
                    <span className="text-emerald-400 font-semibold text-[9px] bg-emerald-950/80 px-1 rounded border border-emerald-500/30">Recommandé</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportExcel(false)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-emerald-950/60 text-slate-200 hover:text-emerald-300 flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-100">Devis affichés / filtrés</div>
                        <div className="text-[10px] text-slate-400">{filteredQuotes.length} devis sélectionnés</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0 opacity-80" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportExcel(true)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-200 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-teal-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-100">Tout le portefeuille</div>
                        <div className="text-[10px] text-slate-400">Total : {quotes.length} devis</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-teal-400 shrink-0 opacity-80" />
                  </button>

                  <div className="px-2 pt-2 pb-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-t border-slate-800 mt-1">
                    Format CSV (.csv)
                  </div>
                  <button
                    type="button"
                    onClick={() => handleExportCsv(false)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-200">Devis affichés (CSV)</div>
                        <div className="text-[10px] text-slate-400">{filteredQuotes.length} devis (UTF-8 avec BOM)</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-amber-400 shrink-0 opacity-80" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCsv(true)}
                    className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-between transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-semibold text-slate-200">Tous les devis (CSV)</div>
                        <div className="text-[10px] text-slate-400">{quotes.length} devis au total</div>
                      </div>
                    </div>
                    <Download className="w-3.5 h-3.5 text-amber-400 shrink-0 opacity-80" />
                  </button>
                </div>
              </>
            )}
          </div>

          {onPurgeQuotes && (
            <button
              type="button"
              onClick={() => setShowPurgeModal(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900/90 text-rose-300 font-semibold border border-rose-800/60 flex items-center gap-1.5 cursor-pointer shadow-xs transition-all text-xs"
              title="Purger l'intégralité du portefeuille de devis"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Purger Devis</span>
            </button>
          )}

          {onResetQuotes && (
            <button
              type="button"
              onClick={onResetQuotes}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium border border-slate-700/60 flex items-center gap-1.5 cursor-pointer transition-all text-xs"
              title="Réinitialiser les devis au portefeuille Schindler d'origine"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}

          <button
            type="button"
            onClick={onMassAddQuotes}
            className="px-3 py-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 text-white font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs border border-emerald-500/40 transition-all text-xs"
            title="Importer des devis par fichier Excel (.xlsx / .xls)"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-200" />
            <span>Importer Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={onAddQuote}
            className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/30 transition-all text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nouveau Devis</span>
          </button>
        </div>
      </div>

      {/* Export Notification Toast */}
      {exportFeedback && (
        <div className="p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-lg animate-fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{exportFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setExportFeedback(null)}
            className="text-emerald-400 hover:text-emerald-100 cursor-pointer font-bold px-2 py-0.5 rounded hover:bg-emerald-900/50 text-xs"
          >
            ✕
          </button>
        </div>
      )}

      {/* Quotes Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl flex flex-col">
        <div className="max-h-[620px] overflow-y-auto overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 text-[11px] shadow-xs">
              <tr>
                <th className="p-3">N° Devis</th>
                <th className="p-3">Objet & Client</th>
                <th className="p-3">Appareil PF</th>
                <th className="p-3 text-right">Prix de Revient</th>
                <th className="p-3 text-right">Marge C1 (MAD & %)</th>
                <th className="p-3 text-right">Prix Vente HT (100%)</th>
                <th className="p-3 text-right">Montant TTC</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-center">Facturation (100%)</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredQuotes.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    Aucun devis ne correspond aux critères de recherche.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((q) => {
                  const billingLabel = getMonthLabel(q);
                  const costPrice = q.costPriceHT ?? q.estimatedCostHT ?? 0;
                  const c1Val =
                    q.c1Value !== undefined
                      ? q.c1Value
                      : (q.amountHT || 0) - costPrice;
                  const c1Pct =
                    q.c1Percent !== undefined
                      ? q.c1Percent
                      : q.amountHT > 0
                      ? (c1Val / q.amountHT) * 100
                      : 0;

                  const c1BadgeColor =
                    c1Pct >= 50
                      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      : c1Pct >= 35
                      ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                      : c1Pct >= 20
                      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                      : "bg-rose-500/20 text-rose-300 border-rose-500/30";

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {q.quoteNumber}
                        <div className="text-[10px] text-slate-500 font-normal">{q.issueDate}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-100 max-w-[240px] truncate">
                          {q.title}
                        </div>
                        <div className="text-slate-400 text-[11px] flex items-center gap-1.5 mt-0.5">
                          <span className="font-medium text-slate-300">{q.clientName}</span>
                          {q.customerAccount && (
                            <span className="text-slate-500 font-mono text-[10px]">({q.customerAccount})</span>
                          )}
                        </div>
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        {q.pfNumber ? (
                          <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 font-mono font-semibold text-[10px]">
                            {q.pfNumber}
                          </span>
                        ) : (
                          <span className="text-slate-600 text-[11px]">Global</span>
                        )}
                      </td>

                      {/* Prix de Revient */}
                      <td className="p-3 text-right font-mono text-amber-300/90 whitespace-nowrap">
                        <div>{costPrice.toLocaleString("fr-FR")} MAD</div>
                        <div className="text-[9px] text-slate-500">
                          {q.amountHT > 0 ? `${((costPrice / q.amountHT) * 100).toFixed(0)}% du total` : "-"}
                        </div>
                      </td>

                      {/* Marge C1 (MAD & %) */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-100">
                          {c1Val.toLocaleString("fr-FR")} MAD
                        </div>
                        <div className="mt-0.5">
                          <span className={`inline-flex items-center text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${c1BadgeColor}`}>
                            C1: {c1Pct.toFixed(1)} %
                          </span>
                        </div>
                      </td>

                      {/* Prix Vente HT (100% C1 Value) */}
                      <td className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        <div>{q.amountHT.toLocaleString("fr-FR")} MAD</div>
                        <div className="text-[9px] text-slate-500 font-normal">100% Vente HT</div>
                      </td>

                      <td className="p-3 text-right font-mono text-slate-400 whitespace-nowrap">
                        {q.amountTTC.toLocaleString("fr-FR")} MAD
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusBadge(q.status)}
                          <select
                            value={q.status}
                            onChange={(e) => onUpdateQuoteStatus(q.id, e.target.value as QuoteStatus)}
                            className="bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 p-0.5 ml-1 cursor-pointer hover:border-slate-600"
                            title="Modifier rapidement le statut"
                          >
                            <option value="Brouillon">Brouillon</option>
                            <option value="Envoyé">Envoyé</option>
                            <option value="Validé / Accepté">Validé</option>
                            <option value="Facturé">Facturé</option>
                            <option value="Refusé">Refusé</option>
                          </select>
                        </div>
                      </td>

                      {/* Simple 100% Billing Month Indicator & Quick Link */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenSchedulerForQuote && onOpenSchedulerForQuote(q)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/60 text-[11px] font-semibold cursor-pointer transition-colors"
                          title="Planifier le mois de facturation à 100%"
                        >
                          <Calendar className="w-3.5 h-3.5 text-blue-400" />
                          <span>100% en {billingLabel}</span>
                        </button>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              exportSingleQuoteToExcel(q);
                              setExportFeedback(`✓ Fiche du devis ${q.quoteNumber} exportée en Excel`);
                              setTimeout(() => setExportFeedback(null), 4000);
                            }}
                            className="p-1 rounded bg-slate-800 hover:bg-emerald-950/70 text-slate-400 hover:text-emerald-300 border border-slate-700/60 cursor-pointer transition-colors"
                            title="Exporter la fiche de ce devis au format Excel (.xlsx)"
                          >
                            <Download className="w-3.5 h-3.5 text-emerald-400" />
                          </button>
                          <button
                            onClick={() => onEditQuote(q)}
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Modifier les détails de ce devis"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => onDeleteQuote(q.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-rose-300 cursor-pointer"
                            title="Supprimer le devis"
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

        {/* Dedicated summary footer for table */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span>
            Affichage de <strong className="text-slate-200">{filteredQuotes.length}</strong> sur {quotes.length} devis au portefeuille
          </span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span>
              Total Revient : <strong className="text-amber-400">{filteredQuotes.reduce((acc, q) => acc + (q.costPriceHT ?? q.estimatedCostHT ?? 0), 0).toLocaleString("fr-FR")} MAD</strong>
            </span>
            <span>
              Marge C1 : <strong className="text-emerald-400">{filteredQuotes.reduce((acc, q) => acc + (q.c1Value ?? ((q.amountHT || 0) - (q.costPriceHT ?? q.estimatedCostHT ?? 0))), 0).toLocaleString("fr-FR")} MAD</strong>
            </span>
            <span>
              Vente HT (100%) : <strong className="text-blue-400">{filteredQuotes.reduce((acc, q) => acc + (q.amountHT || 0), 0).toLocaleString("fr-FR")} MAD</strong>
            </span>
          </div>
        </div>
      </div>

      {/* PURGE CONFIRMATION MODAL */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-rose-800/80 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-950 border border-rose-800/60">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-100">Confirmation de Purge des Devis</h3>
                <p className="text-xs text-rose-300 font-medium">Action irréversible</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
              Êtes-vous absolument certain de vouloir purger la totalité des <strong className="text-rose-400">{quotes.length} devis</strong> ? Toutes les prévisions de facturation et enregistrements associés seront effacés.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onPurgeQuotes) onPurgeQuotes();
                  setShowPurgeModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-600/30 cursor-pointer transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Purge ({quotes.length})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
