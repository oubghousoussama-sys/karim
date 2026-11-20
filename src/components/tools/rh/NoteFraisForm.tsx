import React, { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { RHNoteFraisDocument, RHNoteFraisLine } from "../../../types";
import { exportNoteFraisPDF } from "./rhPdfExport";
import { SignaturePad } from "./SignaturePad";
import {
  Download,
  FileDown,
  FileSpreadsheet,
  History,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload
} from "lucide-react";

const STORAGE_KEY_CURRENT = "rh_ndf_current_v1";
const STORAGE_KEY_HISTORY = "rh_ndf_history_v1";

function createNdfLine(partial?: Partial<RHNoteFraisLine>): RHNoteFraisLine {
  return {
    id: `ndf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    date: new Date().toISOString().slice(0, 10),
    lieu: "",
    montantDevise: 0,
    tauxChange: 1,
    km: 0,
    indemniteKmTaxi: 0,
    forfaitDivers: 0,
    repas: 0,
    hotel: 0,
    parking: 0,
    gasoil: 0,
    autoroute: 0,
    commentaire: "",
    ...partial
  };
}

function getDefaultNdfDoc(): RHNoteFraisDocument {
  return {
    id: `ndfdoc-${Date.now()}`,
    demandeur: "OUSSAMA OUBGHOUS",
    fonction: "SL FES",
    service: "EI",
    objet: "NOTE DE FRAIS",
    responsableHierarchique: "ANAS BAGHDADI",
    fonctionResponsable: "OPERATION MANAGER",
    moisAnnee: "Novembre 2026",
    deviseCode: "EURO",
    tauxChangeDefaut: 1,
    avancesRecues: 0,
    dateSignatureDemandeur: new Date().toISOString().slice(0, 10),
    referenceComptabilite: "",
    bonPourAcquis: true,
    lines: [createNdfLine({ lieu: "FES", gasoil: 200, commentaire: "FIN GASOIL" })]
  };
}

function excelSerialToIso(val: unknown): string {
  if (typeof val === "number" && val > 25000 && val < 70000) {
    const utcDays = Math.floor(val - 25569);
    const d = new Date(utcDays * 86400 * 1000);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }
  }
  if (typeof val === "string") {
    const trimmed = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
    const fr = trimmed.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (fr) return `${fr[3]}-${fr[2]}-${fr[1]}`;
  }
  return new Date().toISOString().slice(0, 10);
}

export const NoteFraisForm: React.FC = () => {
  const [docData, setDocData] = useState<RHNoteFraisDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getDefaultNdfDoc();
  });

  const [history, setHistory] = useState<RHNoteFraisDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const updateDoc = (updater: (prev: RHNoteFraisDocument) => RHNoteFraisDocument) => {
    setDocData((prev) => {
      const next = { ...updater(prev), updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const handleLineChange = (
    lineId: string,
    field: keyof RHNoteFraisLine,
    value: string | number
  ) => {
    updateDoc((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    }));
  };

  const handleAddLine = () => {
    updateDoc((prev) => ({
      ...prev,
      lines: [...prev.lines, createNdfLine({ tauxChange: prev.tauxChangeDefaut || 1 })]
    }));
  };

  const handleRemoveLine = (lineId: string) => {
    updateDoc((prev) => {
      if (prev.lines.length <= 1) return prev;
      return {
        ...prev,
        lines: prev.lines.filter((l) => l.id !== lineId)
      };
    });
  };

  const totals = useMemo(() => {
    const acc = docData.lines.reduce(
      (sum, l) => {
        const dev = Number(l.montantDevise) || 0;
        const taux = Number(l.tauxChange) || 1;
        return {
          montantDevise: sum.montantDevise + dev,
          montantDeviseDhs: sum.montantDeviseDhs + dev * taux,
          km: sum.km + (Number(l.km) || 0),
          indemniteKmTaxi: sum.indemniteKmTaxi + (Number(l.indemniteKmTaxi) || 0),
          forfaitDivers: sum.forfaitDivers + (Number(l.forfaitDivers) || 0),
          repas: sum.repas + (Number(l.repas) || 0),
          hotel: sum.hotel + (Number(l.hotel) || 0),
          parking: sum.parking + (Number(l.parking) || 0),
          gasoil: sum.gasoil + (Number(l.gasoil) || 0),
          autoroute: sum.autoroute + (Number(l.autoroute) || 0)
        };
      },
      {
        montantDevise: 0,
        montantDeviseDhs: 0,
        km: 0,
        indemniteKmTaxi: 0,
        forfaitDivers: 0,
        repas: 0,
        hotel: 0,
        parking: 0,
        gasoil: 0,
        autoroute: 0
      }
    );

    const totalDepenses =
      acc.montantDeviseDhs +
      acc.indemniteKmTaxi +
      acc.forfaitDivers +
      acc.repas +
      acc.hotel +
      acc.parking +
      acc.gasoil +
      acc.autoroute;

    const netAPayer = totalDepenses - (Number(docData.avancesRecues) || 0);
    return { ...acc, totalDepenses, netAPayer };
  }, [docData.lines, docData.avancesRecues]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, defval: "" });

      let demandeur = docData.demandeur;
      let fonction = docData.fonction;
      let service = docData.service;
      let responsable = docData.responsableHierarchique;
      let fonctionResp = docData.fonctionResponsable;
      let headerRowIdx = -1;

      rows.forEach((row, idx) => {
        const joined = row.map((c) => String(c || "").toLowerCase()).join(" ");
        if (joined.includes("demandeur")) {
          const val = row.slice(1).find((c) => String(c || "").trim() && !String(c).toLowerCase().includes("demandeur"));
          if (val) demandeur = String(val).trim();
        }
        if (joined.includes("service :")) {
          const idxSvc = row.findIndex((c) => String(c || "").toLowerCase().includes("service"));
          if (idxSvc >= 0 && row[idxSvc + 1]) service = String(row[idxSvc + 1]).trim();
        }
        if (joined.includes("responsable hi")) {
          const val = row.slice(1).find((c) => String(c || "").trim() && !String(c).toLowerCase().includes("responsable"));
          if (val) responsable = String(val).trim();
        }
        if (idx < 12 && joined.includes("fonction") && !joined.includes("responsable")) {
          const val = row.slice(1).find((c) => String(c || "").trim() && !String(c).toLowerCase().includes("fonction"));
          if (val && idx <= 8) fonction = String(val).trim();
          else if (val && idx > 8) fonctionResp = String(val).trim();
        }
        if (joined.includes("date de la d") && joined.includes("lieu")) {
          headerRowIdx = idx;
        }
      });

      const parsedLines: RHNoteFraisLine[] = [];
      if (headerRowIdx >= 0) {
        for (let r = headerRowIdx + 1; r < rows.length; r++) {
          const row = rows[r];
          const firstCell = String(row[0] || "").trim();
          const rowText = row.map((c) => String(c || "")).join("").trim();
          if (!rowText) continue;
          if (
            firstCell.toLowerCase().includes("total") ||
            firstCell.toLowerCase().includes("avance") ||
            firstCell.toLowerCase().includes("net")
          ) {
            break;
          }
          // Skip formula summary row without date/lieu/comment
          if (!row[0] && !row[1] && !row[12]) continue;

          parsedLines.push(
            createNdfLine({
              date: excelSerialToIso(row[0]),
              lieu: String(row[1] || "").trim(),
              montantDevise: Number(row[2]) || 0,
              tauxChange: Number(row[3]) || 1,
              km: Number(row[4]) || 0,
              indemniteKmTaxi: Number(row[5]) || 0,
              forfaitDivers: Number(row[6]) || 0,
              repas: Number(row[7]) || 0,
              hotel: Number(row[8]) || 0,
              parking: Number(row[9]) || 0,
              gasoil: Number(row[10]) || 0,
              autoroute: Number(row[11]) || 0,
              commentaire: String(row[12] || "").trim()
            })
          );
        }
      }

      updateDoc((prev) => ({
        ...prev,
        demandeur,
        fonction,
        service,
        responsableHierarchique: responsable,
        fonctionResponsable: fonctionResp,
        lines: parsedLines.length > 0 ? parsedLines : prev.lines
      }));

      setStatusMessage(
        `Fichier "${file.name}" importé avec succès (${parsedLines.length} ligne(s) de dépenses).`
      );
      setTimeout(() => setStatusMessage(null), 4500);
    } catch (err: any) {
      alert(`Erreur lors de l'import Excel : ${err?.message || err}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleExportExcel = () => {
    const aoa: any[][] = [
      ["", "", "Note de Frais"],
      [],
      ["Demandeur :", docData.demandeur, "", "", "Objet :", docData.objet],
      ["Fonction :", docData.fonction, "", "", "Mois / Année :", docData.moisAnnee],
      ["Service :", docData.service, "", "", "Devise :", docData.deviseCode],
      ["Responsable hiérarchique :", docData.responsableHierarchique, "", "", "Fonction Resp. :", docData.fonctionResponsable],
      [],
      [
        "Date de la dépense",
        "Lieu de la Dépense",
        `Montant en Devise (${docData.deviseCode})`,
        "Taux de change",
        "km",
        "Taxi / Indemnité km",
        "Forfait / Divers",
        "Repas",
        "Hôtel",
        "PARKING",
        "Gasoil",
        "AUTOROUTE",
        "Commentaire"
      ],
      ...docData.lines.map((l) => [
        l.date,
        l.lieu,
        l.montantDevise || "",
        l.tauxChange || "",
        l.km || "",
        l.indemniteKmTaxi || "",
        l.forfaitDivers || "",
        l.repas || "",
        l.hotel || "",
        l.parking || "",
        l.gasoil || "",
        l.autoroute || "",
        l.commentaire
      ]),
      [],
      [
        "SOUS-TOTAUX",
        "",
        totals.montantDevise,
        "",
        totals.km,
        totals.indemniteKmTaxi,
        totals.forfaitDivers,
        totals.repas,
        totals.hotel,
        totals.parking,
        totals.gasoil,
        totals.autoroute,
        ""
      ],
      ["TOTAL DÉPENSES (MAD)", totals.totalDepenses],
      ["AVANCES SUR NDF REÇUES (MAD)", docData.avancesRecues],
      ["NET À PAYER (MAD)", totals.netAPayer]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    XLSX.utils.book_append_sheet(wb, ws, "Note de Frais");
    const safeName = (docData.demandeur || "Collaborateur").replace(/[^a-zA-Z0-9-_]/g, "_");
    XLSX.writeFile(wb, `Note_De_Frais_${safeName}.xlsx`);
  };

  const handleSaveToHistory = () => {
    const snapshot: RHNoteFraisDocument = {
      ...docData,
      id: docData.id || `ndfdoc-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const nextHistory = [snapshot, ...history.filter((h) => h.id !== snapshot.id)].slice(0, 20);
    setHistory(nextHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory));
    } catch {
      // ignore
    }
    setStatusMessage("Note de frais enregistrée dans votre historique.");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleReset = () => {
    const fresh: RHNoteFraisDocument = {
      ...getDefaultNdfDoc(),
      lines: [createNdfLine()]
    };
    setDocData(fresh);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  };

  const handleGeneratePDF = async () => {
    setIsExportingPdf(true);
    try {
      await exportNoteFraisPDF(docData);
      setStatusMessage("PDF de la Note de Frais généré et téléchargé.");
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsm,.xlsx,.xls"
        onChange={handleImportExcel}
        className="hidden"
      />

      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">
            Note de Frais — Modèle Officiel Schindler Maroc
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            13 colonnes de dépenses (Devise, km, Taxi, Forfait, Repas, Hôtel, Parking, Gasoil, Autoroute), calcul des avances & export PDF A4 Paysage
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/Copie%20de%20Note%20de%20frais.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Modèle original (.pdf)</span>
          </a>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-200 border border-amber-500/30 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5 text-amber-400" />
            <span>Importer (.xlsm/.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Exporter (.xlsx)</span>
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Réinitialiser</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-200 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5 text-rose-400" />
            <span>Sauvegarder</span>
          </button>
          <button
            type="button"
            disabled={isExportingPdf}
            onClick={handleGeneratePDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-orange-600 hover:from-rose-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>{isExportingPdf ? "Génération..." : "Générer PDF Note de Frais"}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-medium">
          {statusMessage}
        </div>
      )}

      {/* Metadata Header Fields */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Demandeur</label>
          <input
            type="text"
            value={docData.demandeur}
            onChange={(e) => updateDoc((p) => ({ ...p, demandeur: e.target.value }))}
            placeholder="ex: OUSSAMA OUBGHOUS"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Fonction</label>
          <input
            type="text"
            value={docData.fonction}
            onChange={(e) => updateDoc((p) => ({ ...p, fonction: e.target.value }))}
            placeholder="ex: SL FES"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Service</label>
          <input
            type="text"
            value={docData.service}
            onChange={(e) => updateDoc((p) => ({ ...p, service: e.target.value }))}
            placeholder="ex: EI"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Objet</label>
          <input
            type="text"
            value={docData.objet}
            onChange={(e) => updateDoc((p) => ({ ...p, objet: e.target.value }))}
            placeholder="ex: NOTE DE FRAIS"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-medium mb-1">Responsable hiérarchique</label>
          <input
            type="text"
            value={docData.responsableHierarchique}
            onChange={(e) => updateDoc((p) => ({ ...p, responsableHierarchique: e.target.value }))}
            placeholder="ex: ANAS BAGHDADI"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Fonction Responsable</label>
          <input
            type="text"
            value={docData.fonctionResponsable}
            onChange={(e) => updateDoc((p) => ({ ...p, fonctionResponsable: e.target.value }))}
            placeholder="ex: OPERATION MANAGER"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Mois / Année</label>
          <input
            type="text"
            value={docData.moisAnnee}
            onChange={(e) => updateDoc((p) => ({ ...p, moisAnnee: e.target.value }))}
            placeholder="ex: Novembre 2026"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-slate-400 font-medium mb-1">Devise</label>
            <select
              value={docData.deviseCode}
              onChange={(e) => updateDoc((p) => ({ ...p, deviseCode: e.target.value }))}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 focus:border-rose-500 focus:outline-none"
            >
              <option value="EURO">EURO</option>
              <option value="TND">TND</option>
              <option value="USD">USD</option>
              <option value="MAD">MAD</option>
            </select>
          </div>
          <div>
            <label className="block text-slate-400 font-medium mb-1">Taux défaut</label>
            <input
              type="number"
              step="0.01"
              value={docData.tauxChangeDefaut}
              onChange={(e) =>
                updateDoc((p) => ({ ...p, tauxChangeDefaut: parseFloat(e.target.value) || 1 }))
              }
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100 font-mono tabular-nums focus:border-rose-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Lignes de Dépenses</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
            {docData.lines.length}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Total Dépenses (DHS)</div>
          <div className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-1">
            {totals.totalDepenses.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <label className="block text-[11px] text-slate-400 font-medium">
            Avances sur NDF Reçues (MAD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={docData.avancesRecues || ""}
            onChange={(e) =>
              updateDoc((p) => ({ ...p, avancesRecues: parseFloat(e.target.value) || 0 }))
            }
            placeholder="0.00"
            className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-base font-bold text-slate-100 font-mono tabular-nums focus:border-rose-500 focus:outline-none"
          />
        </div>
        <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
          <div className="text-[11px] text-rose-300 font-semibold">NET À PAYER (MAD)</div>
          <div className="text-xl font-extrabold text-rose-400 font-mono tabular-nums mt-1">
            {totals.netAPayer.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MAD
          </div>
        </div>
      </div>

      {/* 13-Columns Expense Table */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Détail des Dépenses (13 colonnes du modèle officiel)
          </span>
          <button
            type="button"
            onClick={handleAddLine}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter une dépense</span>
          </button>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px] min-w-[1320px]">
            <thead className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <tr>
                <th className="p-2 border-r border-slate-800 w-32">Date de la dépense</th>
                <th className="p-2 border-r border-slate-800 w-28">Lieu de la Dépense</th>
                <th className="p-2 border-r border-slate-800 w-24 text-right">
                  Montant EN Devise ({docData.deviseCode})
                </th>
                <th className="p-2 border-r border-slate-800 w-16 text-right">Taux de change</th>
                <th className="p-2 border-r border-slate-800 w-16 text-right">km</th>
                <th className="p-2 border-r border-slate-800 w-24 text-right">taxi</th>
                <th className="p-2 border-r border-slate-800 w-24 text-right">Forfait /Divers</th>
                <th className="p-2 border-r border-slate-800 w-20 text-right">Repas</th>
                <th className="p-2 border-r border-slate-800 w-20 text-right">Hôtel</th>
                <th className="p-2 border-r border-slate-800 w-20 text-right">PARKING</th>
                <th className="p-2 border-r border-slate-800 w-20 text-right">Gasoil</th>
                <th className="p-2 border-r border-slate-800 w-20 text-right">AUTOROUTE</th>
                <th className="p-2 border-r border-slate-800 min-w-[200px]">Commentaire</th>
                <th className="p-2 text-center w-12">Suppr.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {docData.lines.map((line) => (
                <tr key={line.id} className="hover:bg-slate-900/50 transition-colors">
                  <td className="p-1.5 border-r border-slate-800">
                    <input
                      type="date"
                      value={line.date}
                      onChange={(e) => handleLineChange(line.id, "date", e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-slate-100"
                    />
                  </td>
                  <td className="p-1.5 border-r border-slate-800">
                    <input
                      type="text"
                      value={line.lieu}
                      onChange={(e) => handleLineChange(line.id, "lieu", e.target.value)}
                      placeholder="FES, CASA..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 uppercase"
                    />
                  </td>
                  {(
                    [
                      "montantDevise",
                      "tauxChange",
                      "km",
                      "indemniteKmTaxi",
                      "forfaitDivers",
                      "repas",
                      "hotel",
                      "parking",
                      "gasoil",
                      "autoroute"
                    ] as const
                  ).map((field) => (
                    <td key={field} className="p-1.5 border-r border-slate-800">
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={line[field] || ""}
                        onChange={(e) =>
                          handleLineChange(line.id, field, parseFloat(e.target.value) || 0)
                        }
                        placeholder="0"
                        className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-right font-mono tabular-nums text-slate-100"
                      />
                    </td>
                  ))}
                  <td className="p-1.5 border-r border-slate-800">
                    <input
                      type="text"
                      value={line.commentaire}
                      onChange={(e) => handleLineChange(line.id, "commentaire", e.target.value)}
                      placeholder="Motif du déplacement / justificatif..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100"
                    />
                  </td>
                  <td className="p-1.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemoveLine(line.id)}
                      disabled={docData.lines.length <= 1}
                      className="p-1 rounded text-rose-400 hover:bg-rose-950/50 disabled:opacity-25 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-900 font-bold text-slate-100 border-t-2 border-slate-700 font-mono tabular-nums">
              <tr>
                <td colSpan={2} className="p-2 border-r border-slate-800 text-right font-sans">
                  SOUS-TOTAUX :
                </td>
                <td className="p-2 border-r border-slate-800 text-right">
                  {totals.montantDevise.toFixed(2)}
                </td>
                <td className="p-2 border-r border-slate-800 text-right">-</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.km}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.indemniteKmTaxi.toFixed(2)}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.forfaitDivers.toFixed(2)}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.repas.toFixed(2)}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.hotel.toFixed(2)}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.parking.toFixed(2)}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.gasoil.toFixed(2)}</td>
                <td className="p-2 border-r border-slate-800 text-right">{totals.autoroute.toFixed(2)}</td>
                <td colSpan={2} className="p-2 text-right font-sans text-rose-300">
                  Total DHS : {totals.totalDepenses.toFixed(2)} MAD
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Validation & Official NB Clauses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Date signature Demandeur
              </label>
              <input
                type="date"
                value={docData.dateSignatureDemandeur}
                onChange={(e) => updateDoc((p) => ({ ...p, dateSignatureDemandeur: e.target.value }))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Référence comptabilité
              </label>
              <input
                type="text"
                value={docData.referenceComptabilite}
                onChange={(e) => updateDoc((p) => ({ ...p, referenceComptabilite: e.target.value }))}
                placeholder="ex: NDF-2026-11-01"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-slate-200 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={docData.bonPourAcquis}
              onChange={(e) => updateDoc((p) => ({ ...p, bonPourAcquis: e.target.checked }))}
              className="w-4 h-4 accent-rose-500 rounded"
            />
            <span>Mention « Bon pour acquis »</span>
          </label>

          <div className="pt-2 text-[11px] text-slate-400 space-y-1 border-t border-slate-800">
            <p className="font-semibold text-slate-300">Règles de gestion (NB du modèle officiel) :</p>
            <p>• Les demandes d'avance doivent être communiquées au maximum 3 jours ouvrables avant le déplacement.</p>
            <p>• Les notes de frais doivent être justifiées et transmises à la comptabilité en M+1.</p>
            <p>• Toute avance non justifiée dans ce délai sera déduite de la paye en M+1.</p>
          </div>
        </div>

        <SignaturePad
          label="Signature du Demandeur (incluse dans le PDF)"
          value={docData.signatureDemandeurDataUrl}
          onChange={(sig) => updateDoc((p) => ({ ...p, signatureDemandeurDataUrl: sig }))}
        />
      </div>

      {/* Saved History */}
      {history.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <History className="w-4 h-4 text-rose-400" />
            <span>Notes de frais sauvegardées ({history.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate">
                    {item.demandeur} · {item.moisAnnee}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.lines.length} dépense(s)
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocData(item)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-medium cursor-pointer"
                  >
                    Charger
                  </button>
                  <button
                    type="button"
                    onClick={() => exportNoteFraisPDF(item)}
                    className="p-1.5 rounded bg-rose-950/60 hover:bg-rose-900/70 text-rose-300 border border-rose-500/30 cursor-pointer"
                    title="Télécharger PDF"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
