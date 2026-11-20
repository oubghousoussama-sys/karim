import React, { useState, useMemo } from "react";
import { SparePart, PartStatus, PFEquipment } from "../../types";
import {
  Wrench,
  Package,
  Truck,
  CheckCircle2,
  Search,
  Filter,
  Plus,
  Trash2,
  Edit3,
  User,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from "recharts";

interface PartsConsumptionTrackerProps {
  parts: SparePart[];
  equipments: PFEquipment[];
  onAddPart: () => void;
  onEditPart: (part: SparePart) => void;
  onDeletePart: (id: string) => void;
  onUpdatePartStatus: (id: string, status: PartStatus) => void;
}

export const PartsConsumptionTracker: React.FC<PartsConsumptionTrackerProps> = ({
  parts,
  equipments,
  onAddPart,
  onEditPart,
  onDeletePart,
  onUpdatePartStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [pfFilter, setPfFilter] = useState<string>("all");

  const filteredParts = useMemo(() => {
    return parts.filter((p) => {
      const matchSearch =
        p.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.designation.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pfNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.supplier && p.supplier.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (p.technician && p.technician.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchStatus = statusFilter === "all" || p.status === statusFilter;
      const matchPf = pfFilter === "all" || p.pfNumber === pfFilter;

      return matchSearch && matchStatus && matchPf;
    });
  }, [parts, searchTerm, statusFilter, pfFilter]);

  // Financial KPI calculations for spare parts in MAD
  const totalCostHT = parts.reduce((acc, p) => acc + p.totalCostHT, 0);
  const installedParts = parts.filter((p) => p.status === "Consommée / Installée");
  const installedCostHT = installedParts.reduce((acc, p) => acc + p.totalCostHT, 0);

  const orderedParts = parts.filter((p) => p.status === "Commandée");
  const orderedCostHT = orderedParts.reduce((acc, p) => acc + p.totalCostHT, 0);

  const inStockParts = parts.filter((p) => p.status === "Reçue en stock");
  const inStockCostHT = inStockParts.reduce((acc, p) => acc + p.totalCostHT, 0);

  const totalSellingHT = parts.reduce((acc, p) => acc + ((p.sellingPriceHT || 0) * p.quantity), 0);
  const totalMarginHT = totalSellingHT - totalCostHT;
  const marginPct = totalSellingHT > 0 ? (totalMarginHT / totalSellingHT) * 100 : 0;

  // Breakdown of parts cost by PF equipment for chart
  const pfCostChartData = useMemo(() => {
    const map: Record<string, { pfNumber: string; cost: number; count: number; name: string }> = {};

    parts.forEach((p) => {
      if (!map[p.pfNumber]) {
        const eq = equipments.find((e) => e.pfNumber === p.pfNumber);
        map[p.pfNumber] = {
          pfNumber: p.pfNumber,
          cost: 0,
          count: 0,
          name: eq ? eq.name.slice(0, 16) : p.pfNumber,
        };
      }
      map[p.pfNumber].cost += p.totalCostHT;
      map[p.pfNumber].count += p.quantity;
    });

    return Object.values(map).sort((a, b) => b.cost - a.cost);
  }, [parts, equipments]);

  const getStatusBadge = (status: PartStatus) => {
    switch (status) {
      case "Consommée / Installée":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
            <CheckCircle2 className="w-3 h-3" /> Installée
          </span>
        );
      case "Reçue en stock":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-semibold">
            <Package className="w-3 h-3" /> En Stock
          </span>
        );
      case "Commandée":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-semibold">
            <Truck className="w-3 h-3" /> Commandée
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Spare Parts KPI Strip in MAD */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Pièces Commandées
          </span>
          <p className="text-xl font-bold text-slate-100 font-mono my-1">
            {totalCostHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-slate-500">{parts.length} références engagées</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-emerald-500/40 flex flex-col justify-between">
          <span className="text-[11px] text-emerald-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            Consommées / Posées
          </span>
          <p className="text-xl font-bold text-emerald-400 font-mono my-1">
            {installedCostHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-emerald-400/80">{installedParts.length} pièces installées sur site</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Truck className="w-3 h-3" />
            En Cours de Livraison
          </span>
          <p className="text-xl font-bold text-amber-400 font-mono my-1">
            {orderedCostHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-amber-400/80">{orderedParts.length} pièces en commande</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Package className="w-3 h-3" />
            Reçues en Stock Atelier
          </span>
          <p className="text-xl font-bold text-blue-400 font-mono my-1">
            {inStockCostHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-blue-400/80">{inStockParts.length} pièces prêtes à être posées</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-purple-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-purple-300 font-semibold uppercase tracking-wider">
            Refacturation Client
          </span>
          <p className="text-xl font-bold text-purple-400 font-mono my-1">
            {totalSellingHT.toLocaleString("fr-FR")} MAD
          </p>
          <span className="text-[10px] text-purple-400/80">Marge brute : +{totalMarginHT.toLocaleString("fr-FR")} MAD ({marginPct.toFixed(1)}%)</span>
        </div>
      </div>

      {/* Chart: Parts Cost Breakdown by PF Equipment */}
      {pfCostChartData.length > 0 && (
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-100">
                Consommation Financière des Pièces par Appareil (PF)
              </h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Coûts d'achat cumulés en Dirhams (MAD HT)</span>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pfCostChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="pfNumber" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v} DH`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "0.75rem",
                    fontSize: "12px",
                  }}
                  formatter={(val: number) => [`${val.toLocaleString("fr-FR")} MAD HT`, "Coût Pièces"]}
                />
                <Bar dataKey="cost" name="Coût Pièces (MAD HT)" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                  {pfCostChartData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={index === 0 ? "#f43f5e" : index < 3 ? "#f59e0b" : "#3b82f6"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Control Bar & Actions */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 text-xs">
        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par Réf, Désignation, N° PF, Fournisseur..."
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
              <option value="all">Tous Statuts Pièces</option>
              <option value="Commandée">Commandée</option>
              <option value="Reçue en stock">Reçue en stock</option>
              <option value="Consommée / Installée">Consommée / Installée</option>
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
        </div>

        {/* Action Button */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onAddPart}
            className="px-3.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-600/30 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Commander / Ajouter une Pièce</span>
          </button>
        </div>
      </div>

      {/* Parts Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl flex flex-col">
        <div className="max-h-[580px] overflow-y-auto overflow-x-auto custom-scrollbar relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 text-[11px] shadow-xs">
              <tr className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 text-[11px]">
                <th className="p-3">Réf / SKU</th>
                <th className="p-3">Désignation Pièce</th>
                <th className="p-3">Appareil (PF)</th>
                <th className="p-3 text-center">Qté</th>
                <th className="p-3 text-right">Coût Achat HT</th>
                <th className="p-3 text-right">Prix Vente HT</th>
                <th className="p-3 text-center">Fournisseur & Dates</th>
                <th className="p-3 text-center">Statut Pièce</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {filteredParts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    Aucune pièce enregistrée ne correspond à vos filtres.
                  </td>
                </tr>
              ) : (
                filteredParts.map((p) => {
                  return (
                    <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-mono font-bold text-amber-400 whitespace-nowrap">
                        {p.reference}
                        <div className="text-[10px] text-slate-500 font-normal">Cmd : {p.orderDate}</div>
                      </td>

                      <td className="p-3">
                        <div className="font-semibold text-slate-100 max-w-[240px]">
                          {p.designation}
                        </div>
                        {p.technician && (
                          <div className="text-[10px] text-cyan-400/90 flex items-center gap-1 mt-0.5">
                            <User className="w-2.5 h-2.5" />
                            <span>Tech : {p.technician}</span>
                          </div>
                        )}
                      </td>

                      <td className="p-3 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60 font-mono font-semibold text-[10px]">
                          {p.pfNumber}
                        </span>
                        {p.clientName && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px] mt-0.5">
                            {p.clientName}
                          </div>
                        )}
                      </td>

                      <td className="p-3 text-center font-mono font-bold text-slate-200">
                        x{p.quantity}
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                        {p.totalCostHT.toLocaleString("fr-FR")} MAD
                        <div className="text-[10px] text-slate-500 font-normal">
                          ({p.unitCostHT.toLocaleString("fr-FR")} MAD / u)
                        </div>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {p.sellingPriceHT ? `${(p.sellingPriceHT * p.quantity).toLocaleString("fr-FR")} MAD` : "-"}
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="text-slate-300 text-[11px] font-medium">{p.supplier || "Non spécifié"}</div>
                        <div className="text-[10px] text-slate-500">
                          {p.installationDate ? `Posé le ${p.installationDate}` : p.deliveryDate ? `Reçu le ${p.deliveryDate}` : "En commande"}
                        </div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          {getStatusBadge(p.status)}
                          <select
                            value={p.status}
                            onChange={(e) => onUpdatePartStatus(p.id, e.target.value as PartStatus)}
                            className="bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-400 p-0.5 ml-1 cursor-pointer hover:border-slate-600"
                            title="Modifier rapidement le statut de la pièce"
                          >
                            <option value="Commandée">Commandée</option>
                            <option value="Reçue en stock">En stock</option>
                            <option value="Consommée / Installée">Installée</option>
                          </select>
                        </div>
                      </td>

                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => onEditPart(p)}
                            className="px-2 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer transition-colors"
                            title="Modifier les détails de cette pièce"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Modifier</span>
                          </button>
                          <button
                            onClick={() => onDeletePart(p.id)}
                            className="p-1 rounded bg-slate-800 hover:bg-rose-900/80 text-slate-400 hover:text-rose-300 cursor-pointer"
                            title="Supprimer la pièce"
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
      </div>
    </div>
  );
};
