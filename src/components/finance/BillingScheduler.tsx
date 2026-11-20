import React, { useState, useMemo } from "react";
import { Quote, PFEquipment } from "../../types";
import { MONTH_LIST } from "../../data/mockFinanceData";
import { exportForecastsToExcel } from "../../utils/excelExport";
import {
  Calendar,
  BarChart3,
  CheckCircle2,
  Clock,
  Check,
  ChevronRight,
  ArrowRight,
  Sparkles,
  Info,
  FileSpreadsheet,
  Download,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";

interface BillingSchedulerProps {
  quotes: Quote[];
  equipments: PFEquipment[];
  onUpdateQuote: (quote: Quote) => void;
  selectedQuoteId?: string | null;
}

export const BillingScheduler: React.FC<BillingSchedulerProps> = ({
  quotes,
  equipments,
  onUpdateQuote,
  selectedQuoteId,
}) => {
  const [activeQuoteId, setActiveQuoteId] = useState<string | null>(
    selectedQuoteId || (quotes.length > 0 ? quotes[0].id : null)
  );

  const activeQuote = useMemo(() => {
    return quotes.find((q) => q.id === activeQuoteId) || null;
  }, [quotes, activeQuoteId]);

  // Helper to determine the 100% billing month for any quote
  const getQuoteBillingMonth = (q: Quote): string => {
    if (q.billingMonth) return q.billingMonth;
    // Fallback if legacy billingSchedule exists
    if (q.billingSchedule) {
      const keys = Object.keys(q.billingSchedule);
      if (keys.length > 0) return keys[0];
    }
    return "2026-12"; // Default Décembre
  };

  // Monthly aggregated forecast breakdown (100% per quote in its assigned billing month)
  const monthlyForecastData = useMemo(() => {
    return MONTH_LIST.map((m) => {
      let secured = 0; // Validé / Accepté or Facturé
      let potential = 0; // Envoyé or Brouillon
      const quotesInThisMonth: Quote[] = [];

      quotes.forEach((q) => {
        const quoteMonth = getQuoteBillingMonth(q);
        if (quoteMonth === m.key) {
          quotesInThisMonth.push(q);
          if (q.status === "Validé / Accepté" || q.status === "Facturé") {
            secured += q.amountHT;
          } else if (q.status !== "Refusé") {
            potential += q.amountHT;
          }
        }
      });

      return {
        monthKey: m.key,
        monthLabel: m.label,
        short: m.short,
        securise: secured,
        potentiel: potential,
        total: secured + potential,
        quotesCount: quotesInThisMonth.length,
        quotes: quotesInThisMonth,
      };
    });
  }, [quotes]);

  const totalYearForecast = monthlyForecastData.reduce((acc, m) => acc + m.total, 0);
  const totalYearSecured = monthlyForecastData.reduce((acc, m) => acc + m.securise, 0);
  const totalYearPotential = monthlyForecastData.reduce((acc, m) => acc + m.potentiel, 0);

  // Handler: Assign 100% of quote amount to a specific month
  const handleAssignMonth = (quote: Quote, targetMonthKey: string) => {
    const updated: Quote = {
      ...quote,
      billingMonth: targetMonthKey,
      billingSchedule: { [targetMonthKey]: quote.amountHT }, // Keep 100% sync
    };
    onUpdateQuote(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner KPI for Monthly Billing Forecasts in MAD */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            CA Prévisionnel Total (100% Devis)
          </span>
          <p className="text-2xl font-black text-blue-400 font-mono my-1">
            {totalYearForecast.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[11px] text-slate-500">
            Total des devis programmés sur l'exercice 2026
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-emerald-500/40 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            CA Sécurisé (Validé / Facturé)
          </span>
          <p className="text-2xl font-black text-emerald-400 font-mono my-1">
            {totalYearSecured.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[11px] text-emerald-400/80">
            {totalYearForecast > 0
              ? `${Math.round((totalYearSecured / totalYearForecast) * 100)} % du CA total prévisionnel`
              : "0 %"}
          </span>
        </div>

        <div className="p-4 rounded-xl bg-slate-900/90 border border-amber-500/40 shadow-sm flex flex-col justify-between">
          <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            CA Potentiel (Envoyé / Brouillon)
          </span>
          <p className="text-2xl font-black text-amber-400 font-mono my-1">
            {totalYearPotential.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[11px] text-amber-400/80">
            Devis en négociation ou attente bon de commande
          </span>
        </div>
      </div>

      {/* Principle notice: 100% Billing per Quote */}
      <div className="p-3.5 rounded-xl bg-blue-950/40 border border-blue-800/60 flex items-center justify-between gap-3 text-xs text-blue-200">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400 shrink-0" />
          <span>
            <strong>Règle de facturation 100% :</strong> Chaque devis est facturé intégralement (100% du montant HT) sur un mois cible sélectionné (ex : Décembre, Novembre...). Cliquez simplement sur un mois pour planifier la facturation.
          </span>
        </div>
        <span className="px-2.5 py-1 rounded-md bg-blue-900/80 text-white font-mono font-bold shrink-0 text-[11px]">
          Devise : MAD (Dirhams)
        </span>
      </div>

      {/* Simple Monthly Forecasting Bar Chart */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-400" />
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                Prévisions Mensuelles de Facturation 2026 (100% du Devis)
              </h3>
              <p className="text-[11px] text-slate-400">
                Montant total HT attendu à la facturation pour chaque mois de l'année.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Période d'export 3 Mois :</span>
              <select
                id="forecastStartMonthSelect"
                defaultValue="2026-09"
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 font-semibold"
              >
                {MONTH_LIST.map((m, idx) => {
                  const m1 = m.short;
                  const m2 = MONTH_LIST[(idx + 1) % 12]?.short;
                  const m3 = MONTH_LIST[(idx + 2) % 12]?.short;
                  return (
                    <option key={m.key} value={m.key}>
                      3 Mois : {m.label} ({m1}, {m2}, {m3}) {m.key === "2026-09" ? "★ Mois en cours" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                const selectEl = document.getElementById("forecastStartMonthSelect") as HTMLSelectElement | null;
                const startMonthKey = selectEl?.value || "2026-09";
                const startMonthObj = MONTH_LIST.find((m) => m.key === startMonthKey);
                const fileName = `Previsions_3Mois_${startMonthKey}_Schindler.xlsx`;
                exportForecastsToExcel(quotes, monthlyForecastData, fileName, startMonthKey, 3);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
              title="Télécharger l'export Excel restreint au mois en cours et aux 2 prochains mois (3 mois uniquement)"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
              <span>Télécharger Prévisions (3 Mois Seul.)</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-emerald-800 rounded font-mono font-extrabold text-emerald-100">
                Confid. 3M
              </span>
              <Download className="w-3.5 h-3.5 opacity-90" />
            </button>
          </div>
        </div>

        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyForecastData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="short" stroke="#64748b" fontSize={11} />
              <YAxis
                stroke="#64748b"
                fontSize={11}
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "0.75rem",
                  fontSize: "12px",
                }}
                formatter={(val: number) => [`${val.toLocaleString("fr-FR")} MAD`, ""]}
              />
              <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }} />
              <Bar dataKey="securise" name="CA Sécurisé (Validé / Facturé)" fill="#10b981" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="potentiel" name="CA Potentiel (Envoyé / Brouillon)" fill="#f59e0b" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* QUICK ASSIGNMENT CARD: Focus Quote 100% Billing Month Selection */}
      {activeQuote && (
        <div className="p-5 rounded-2xl bg-slate-900 border border-blue-500/40 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h4 className="text-sm font-bold text-slate-100">
                  Choisir le Mois de Facturation (100%) pour le Devis :{" "}
                  <span className="font-mono text-emerald-400">{activeQuote.quoteNumber}</span>
                </h4>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {activeQuote.title} &bull; Client : <strong className="text-slate-100">{activeQuote.clientName}</strong>
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Changer de devis :</span>
              <select
                value={activeQuote.id}
                onChange={(e) => setActiveQuoteId(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
              >
                {quotes.map((q) => (
                  <option key={q.id} value={q.id}>
                    {q.quoteNumber} - {q.amountHT.toLocaleString("fr-FR")} MAD ({q.clientName.slice(0, 15)})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-3 bg-slate-950/80 rounded-xl border border-slate-800">
            <div>
              <span className="text-xs text-slate-400">Montant à facturer à 100% :</span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {activeQuote.amountHT.toLocaleString("fr-FR")} MAD HT
                <span className="text-xs font-normal text-slate-400 ml-2">
                  ({activeQuote.amountTTC.toLocaleString("fr-FR")} MAD TTC)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-300 font-medium">Mois actuellement programmé :</span>
              <span className="px-3 py-1 rounded-lg bg-blue-600/30 border border-blue-500 text-blue-300 font-bold text-xs font-mono">
                {MONTH_LIST.find((m) => m.key === getQuoteBillingMonth(activeQuote))?.label || getQuoteBillingMonth(activeQuote)}
              </span>
            </div>
          </div>

          {/* Simple 12-Month Button Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
              Sélectionnez le mois où 100% de ce devis sera facturé :
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2 text-xs">
              {MONTH_LIST.map((m) => {
                const isSelected = getQuoteBillingMonth(activeQuote) === m.key;
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => handleAssignMonth(activeQuote, m.key)}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                      isSelected
                        ? "bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-600/30 scale-102 font-bold"
                        : "bg-slate-950/70 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-800/60"
                    }`}
                  >
                    <span className="text-[11px] font-medium">{m.short}</span>
                    <span className="text-[9px] opacity-80">2026</span>
                    {isSelected && (
                      <span className="mt-1 flex items-center gap-0.5 text-[9px] text-emerald-200">
                        <Check className="w-3 h-3" /> 100%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* SIMPLE LIST: Table of All Quotes with Fast Month Switcher */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl space-y-3 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Planning de Facturation 100% des Devis (Simplicité & Clarté)
            </h4>
            <p className="text-[11px] text-slate-400">
              Changez en 1 clic le mois de facturation (100%) de n'importe quel devis ci-dessous.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            {quotes.length} Devis actifs
          </span>
        </div>

        <div className="max-h-[480px] overflow-y-auto overflow-x-auto custom-scrollbar relative border border-slate-800/80 rounded-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 text-[11px] shadow-xs">
              <tr className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 text-[11px]">
                <th className="p-2.5">N° Devis</th>
                <th className="p-2.5">Client & Prestation</th>
                <th className="p-2.5 text-center">Statut</th>
                <th className="p-2.5 text-right">Montant (100% HT)</th>
                <th className="p-2.5 text-center">Mois de Facturation (100%)</th>
                <th className="p-2.5 text-center">Raccourcis Fréquents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {quotes.map((q) => {
                const currentMonth = getQuoteBillingMonth(q);
                const isSelected = activeQuote?.id === q.id;

                return (
                  <tr
                    key={q.id}
                    onClick={() => setActiveQuoteId(q.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-blue-950/40 border-l-4 border-blue-500"
                        : "hover:bg-slate-800/40"
                    }`}
                  >
                    <td className="p-2.5 font-mono font-bold text-emerald-400 whitespace-nowrap">
                      {q.quoteNumber}
                    </td>

                    <td className="p-2.5">
                      <div className="font-semibold text-slate-100">{q.clientName}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
                        {q.title}
                      </div>
                    </td>

                    <td className="p-2 text-center whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          q.status === "Validé / Accepté"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : q.status === "Facturé"
                            ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
                            : q.status === "Envoyé"
                            ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                            : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        {q.status}
                      </span>
                    </td>

                    <td className="p-2.5 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                      {q.amountHT.toLocaleString("fr-FR")} MAD
                    </td>

                    {/* Simple Select Dropdown for 100% Billing Month */}
                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <select
                        value={currentMonth}
                        onChange={(e) => handleAssignMonth(q, e.target.value)}
                        className="bg-slate-950 border border-slate-700 hover:border-blue-500 rounded-lg px-2.5 py-1 text-xs text-blue-300 font-bold cursor-pointer"
                      >
                        {MONTH_LIST.map((m) => (
                          <option key={m.key} value={m.key}>
                            100% en {m.label}
                          </option>
                        ))}
                      </select>
                    </td>

                    {/* Quick 1-click buttons for Oct / Nov / Dec */}
                    <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleAssignMonth(q, "2026-10")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                            currentMonth === "2026-10"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          Oct
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignMonth(q, "2026-11")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                            currentMonth === "2026-11"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          Nov
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAssignMonth(q, "2026-12")}
                          className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-all ${
                            currentMonth === "2026-12"
                              ? "bg-blue-600 text-white"
                              : "bg-slate-800 text-slate-400 hover:text-white"
                          }`}
                        >
                          Déc
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {/* Table Footer with Monthly Totals */}
            <tfoot>
              <tr className="bg-slate-950 font-bold text-slate-200 border-t-2 border-slate-700">
                <td colSpan={3} className="p-3 uppercase text-[11px]">
                  Total Général Prévisionnel 2026 (Tous Devis)
                </td>
                <td className="p-3 text-right font-mono text-emerald-400">
                  {totalYearForecast.toLocaleString("fr-FR")} MAD
                </td>
                <td colSpan={2} className="p-3 text-center text-[11px] text-slate-400">
                  Total Sécurisé : <strong className="text-emerald-400">{totalYearSecured.toLocaleString("fr-FR")} MAD</strong> &bull; En Négociation : <strong className="text-amber-400">{totalYearPotential.toLocaleString("fr-FR")} MAD</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* MONTH-BY-MONTH CONSOLIDATED RECAP CARDS */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Récapitulatif Simple par Mois de Facturation (MAD)
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
          {monthlyForecastData.map((m) => (
            <div
              key={m.monthKey}
              className={`p-3 rounded-xl border flex flex-col justify-between ${
                m.total > 0
                  ? "bg-slate-900 border-slate-700 shadow-sm"
                  : "bg-slate-950/40 border-slate-900 opacity-60"
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>{m.short} 2026</span>
                {m.quotesCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-blue-950 text-blue-300 text-[10px] font-mono">
                    {m.quotesCount} devis
                  </span>
                )}
              </div>
              <div className="my-2">
                <p className="text-sm font-bold font-mono text-blue-400">
                  {m.total.toLocaleString("fr-FR")} MAD
                </p>
                {m.securise > 0 && (
                  <p className="text-[10px] text-emerald-400 font-mono">
                    Sécurisé : {m.securise.toLocaleString("fr-FR")}
                  </p>
                )}
              </div>
              <div className="text-[9px] text-slate-500">
                {m.quotesCount > 0 ? "Facturation 100%" : "Aucun devis"}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
