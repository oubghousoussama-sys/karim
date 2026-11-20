import React, { useMemo, useState } from "react";
import {
  PointageDayName,
  RHPointageDocument,
  RHPointageLine
} from "../../../types";
import {
  exportPointagePDF,
  formatHoursLabel,
  getPointageLineTotalHours
} from "./rhPdfExport";
import { SignaturePad } from "./SignaturePad";
import {
  Calendar,
  Download,
  FileDown,
  History,
  Plus,
  RotateCcw,
  Save,
  Trash2
} from "lucide-react";

const DAYS: PointageDayName[] = [
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE"
];

const STORAGE_KEY_CURRENT = "rh_pointage_current_v1";
const STORAGE_KEY_HISTORY = "rh_pointage_history_v1";

function createLine(day: PointageDayName, partial?: Partial<RHPointageLine>): RHPointageLine {
  return {
    id: `pt-${day}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    day,
    imputation: "",
    entretien: 0,
    reparation: 0,
    permanence: 0,
    depannage: 0,
    horsDecompte: 0,
    formation: 0,
    congesJoursFeries: 0,
    absence: 0,
    maladie: 0,
    indemniteDeplacement: 0,
    indemnitePermanence: 0,
    ...partial
  };
}

function getDefaultPointageDoc(): RHPointageDocument {
  return {
    id: `ptdoc-${Date.now()}`,
    agence: "FES",
    service: "S.A.V",
    nom: "",
    matricule: "",
    dateDebut: "2026-11-16",
    dateFin: "2026-11-22",
    numSemaine: "S47",
    etabliLe: new Date().toISOString().slice(0, 10),
    visaResponsable: "",
    justificationVerso: "",
    lines: DAYS.map((day) => createLine(day))
  };
}

function computeIsoWeekAndEnd(mondayIso: string): { dateFin: string; numSemaine: string } {
  const parts = mondayIso.split("-").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    return { dateFin: "", numSemaine: "" };
  }
  const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
  const end = new Date(d.getTime() + 6 * 86400000);
  const dateFin = end.toISOString().slice(0, 10);

  // ISO week number
  const target = new Date(d.getTime());
  target.setUTCDate(target.getUTCDate() + 4 - (target.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { dateFin, numSemaine: `S${String(weekNo).padStart(2, "0")}` };
}

export const PointageForm: React.FC = () => {
  const [docData, setDocData] = useState<RHPointageDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return getDefaultPointageDoc();
  });

  const [history, setHistory] = useState<RHPointageDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateDoc = (updater: (prev: RHPointageDocument) => RHPointageDocument) => {
    setDocData((prev) => {
      const next = { ...updater(prev), updatedAt: new Date().toISOString() };
      try {
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(next));
      } catch {
        // ignore quota errors
      }
      return next;
    });
  };

  const handleMondayChange = (newMonday: string) => {
    const { dateFin, numSemaine } = computeIsoWeekAndEnd(newMonday);
    updateDoc((prev) => ({
      ...prev,
      dateDebut: newMonday,
      dateFin: dateFin || prev.dateFin,
      numSemaine: numSemaine || prev.numSemaine
    }));
  };

  const handleLineChange = (
    lineId: string,
    field: keyof RHPointageLine,
    value: string | number
  ) => {
    updateDoc((prev) => ({
      ...prev,
      lines: prev.lines.map((l) => (l.id === lineId ? { ...l, [field]: value } : l))
    }));
  };

  const handleAddLineForDay = (day: PointageDayName) => {
    updateDoc((prev) => {
      const lastIdx = prev.lines.reduce((acc, l, idx) => (l.day === day ? idx : acc), -1);
      const nextLines = [...prev.lines];
      const newLine = createLine(day);
      if (lastIdx >= 0) {
        nextLines.splice(lastIdx + 1, 0, newLine);
      } else {
        nextLines.push(newLine);
      }
      return { ...prev, lines: nextLines };
    });
  };

  const handleRemoveLine = (lineId: string, day: PointageDayName) => {
    updateDoc((prev) => {
      const dayLines = prev.lines.filter((l) => l.day === day);
      if (dayLines.length <= 1) return prev;
      return {
        ...prev,
        lines: prev.lines.filter((l) => l.id !== lineId)
      };
    });
  };

  const totals = useMemo(() => {
    return docData.lines.reduce(
      (acc, l) => ({
        entretien: acc.entretien + (Number(l.entretien) || 0),
        reparation: acc.reparation + (Number(l.reparation) || 0),
        permanence: acc.permanence + (Number(l.permanence) || 0),
        depannage: acc.depannage + (Number(l.depannage) || 0),
        horsDecompte: acc.horsDecompte + (Number(l.horsDecompte) || 0),
        formation: acc.formation + (Number(l.formation) || 0),
        congesJoursFeries: acc.congesJoursFeries + (Number(l.congesJoursFeries) || 0),
        heuresPointees: acc.heuresPointees + getPointageLineTotalHours(l),
        absence: acc.absence + (Number(l.absence) || 0),
        maladie: acc.maladie + (Number(l.maladie) || 0),
        indemniteDeplacement: acc.indemniteDeplacement + (Number(l.indemniteDeplacement) || 0),
        indemnitePermanence: acc.indemnitePermanence + (Number(l.indemnitePermanence) || 0)
      }),
      {
        entretien: 0,
        reparation: 0,
        permanence: 0,
        depannage: 0,
        horsDecompte: 0,
        formation: 0,
        congesJoursFeries: 0,
        heuresPointees: 0,
        absence: 0,
        maladie: 0,
        indemniteDeplacement: 0,
        indemnitePermanence: 0
      }
    );
  }, [docData.lines]);

  const handleSaveToHistory = () => {
    const snapshot: RHPointageDocument = {
      ...docData,
      id: docData.id || `ptdoc-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const nextHistory = [snapshot, ...history.filter((h) => h.id !== snapshot.id)].slice(0, 20);
    setHistory(nextHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory));
    } catch {
      // ignore
    }
    setStatusMessage("Fiche de pointage enregistrée dans votre historique.");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleReset = () => {
    const fresh = getDefaultPointageDoc();
    setDocData(fresh);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  };

  const handleGeneratePDF = () => {
    exportPointagePDF(docData);
    setStatusMessage("PDF de la Fiche de Pointage généré et téléchargé.");
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">
            Feuille Hebdomadaire de Pointage — Schindler Maroc
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Saisie des heures de maintenance, heures non affectées, retenues et indemnités · Export PDF fidèle au modèle officiel
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/fiche%20pointage.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition-colors whitespace-nowrap shrink-0"
          >
            <FileDown className="w-3.5 h-3.5 text-slate-400" />
            <span>Modèle original (.pdf)</span>
          </a>
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Nouvelle semaine</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-200 border border-cyan-500/30 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5 text-cyan-400" />
            <span>Sauvegarder</span>
          </button>
          <button
            type="button"
            onClick={handleGeneratePDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-950/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Générer PDF Pointage</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-medium">
          {statusMessage}
        </div>
      )}

      {/* Header Metadata Grid */}
      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
        <div>
          <label className="block text-slate-400 font-medium mb-1">Nom & Prénom</label>
          <input
            type="text"
            value={docData.nom}
            onChange={(e) => updateDoc((p) => ({ ...p, nom: e.target.value }))}
            placeholder="ex: ELBACHRI KARIM"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Matricule</label>
          <input
            type="text"
            value={docData.matricule}
            onChange={(e) => updateDoc((p) => ({ ...p, matricule: e.target.value }))}
            placeholder="ex: 442"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Agence</label>
          <input
            type="text"
            value={docData.agence}
            onChange={(e) => updateDoc((p) => ({ ...p, agence: e.target.value }))}
            placeholder="ex: FES"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Service</label>
          <input
            type="text"
            value={docData.service}
            onChange={(e) => updateDoc((p) => ({ ...p, service: e.target.value }))}
            placeholder="ex: S.A.V"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-medium mb-1 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Du Lundi</span>
          </label>
          <input
            type="date"
            value={docData.dateDebut}
            onChange={(e) => handleMondayChange(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Au Dimanche</label>
          <input
            type="date"
            value={docData.dateFin}
            onChange={(e) => updateDoc((p) => ({ ...p, dateFin: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">N° Semaine</label>
          <input
            type="text"
            value={docData.numSemaine}
            onChange={(e) => updateDoc((p) => ({ ...p, numSemaine: e.target.value }))}
            placeholder="ex: S42"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-slate-400 font-medium mb-1">Établi le</label>
          <input
            type="date"
            value={docData.etabliLe}
            onChange={(e) => updateDoc((p) => ({ ...p, etabliLe: e.target.value }))}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Live Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Total Heures Pointées</div>
          <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
            {formatHoursLabel(totals.heuresPointees) || "0h"}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Maintenance Sous Contrat</div>
          <div className="text-xl font-bold text-cyan-300 font-mono tabular-nums mt-1">
            {formatHoursLabel(totals.entretien + totals.reparation + totals.permanence + totals.depannage) || "0h"}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Indemnités Déplacement</div>
          <div className="text-xl font-bold text-emerald-300 font-mono tabular-nums mt-1">
            {totals.indemniteDeplacement.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
          <div className="text-[11px] text-slate-400 font-medium">Indemnités Permanence</div>
          <div className="text-xl font-bold text-amber-300 font-mono tabular-nums mt-1">
            {totals.indemnitePermanence.toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
          </div>
        </div>
      </div>

      {/* Main Weekly Grid Matching Official Template */}
      <div className="rounded-xl border border-slate-800 bg-slate-950/90 overflow-x-auto">
        <table className="w-full text-left border-collapse text-[11px] min-w-[1160px]">
          <thead>
            <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <th rowSpan={2} className="p-2 border-r border-slate-800 text-center w-24">
                JOURS
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-800 min-w-[170px]">
                IMPUTATION (N° E / Site)
              </th>
              <th colSpan={4} className="p-1.5 border-r border-b border-slate-800 text-center text-cyan-300">
                HEURES MAINTENANCE SOUS CONTRAT
              </th>
              <th colSpan={3} className="p-1.5 border-r border-b border-slate-800 text-center text-indigo-300">
                HEURES NON AFFECTÉES
              </th>
              <th rowSpan={2} className="p-2 border-r border-slate-800 text-center w-20 text-white">
                TOTAUX HEURES
              </th>
              <th colSpan={2} className="p-1.5 border-r border-b border-slate-800 text-center text-rose-300">
                HEURES RETENUES
              </th>
              <th colSpan={2} className="p-1.5 border-r border-b border-slate-800 text-center text-emerald-300">
                INDEMNITÉS (MAD)
              </th>
              <th rowSpan={2} className="p-2 text-center w-16">
                Actions
              </th>
            </tr>
            <tr className="bg-slate-900/70 text-slate-400 border-b border-slate-800 text-[10px]">
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Entretien</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Répar.</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Perm.</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Dépann.</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Hors déc.</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Formation</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Congés/JF</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Absence</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-16">Maladie</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-24">Déplac.</th>
              <th className="p-1.5 border-r border-slate-800 text-center w-24">Perm.</th>
            </tr>
          </thead>

          <tbody>
            {DAYS.map((day, dayIndex) => {
              const dayLines = docData.lines.filter((l) => l.day === day);
              const dayTotalHours = dayLines.reduce((s, l) => s + getPointageLineTotalHours(l), 0);

              let dayDateLabel = "";
              if (docData.dateDebut) {
                const p = docData.dateDebut.split("-").map(Number);
                if (p.length === 3 && !p.some(isNaN)) {
                  const dt = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dayIndex));
                  if (!isNaN(dt.getTime())) {
                    dayDateLabel = `${String(dt.getUTCDate()).padStart(2, "0")}/${String(
                      dt.getUTCMonth() + 1
                    ).padStart(2, "0")}`;
                  }
                }
              }

              return dayLines.map((line, idx) => {
                const isFirstOfDay = idx === 0;
                const isLastOfDay = idx === dayLines.length - 1;

                return (
                  <tr
                    key={line.id}
                    className={`hover:bg-slate-900/60 transition-colors ${
                      dayIndex % 2 === 1 ? "bg-slate-900/20" : ""
                    } ${
                      isLastOfDay ? "border-b-2 border-slate-700/80" : "border-b border-slate-800/60"
                    }`}
                  >
                    {isFirstOfDay && (
                      <td
                        rowSpan={dayLines.length}
                        className="p-2 border-r border-slate-800 bg-slate-900/50 align-middle text-center"
                      >
                        <div className="font-bold text-slate-100 tracking-wide">{day}</div>
                        {dayDateLabel && (
                          <div className="text-[10px] font-mono tabular-nums text-cyan-400/90 mt-0.5">
                            {dayDateLabel}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleAddLineForDay(day)}
                          className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-cyan-900/50 text-cyan-300 border border-slate-700 text-[10px] cursor-pointer"
                          title={`Ajouter une ligne pour ${day}`}
                        >
                          <Plus className="w-2.5 h-2.5" />
                          <span>Ligne</span>
                        </button>
                      </td>
                    )}

                    <td className="p-1.5 border-r border-slate-800">
                      <input
                        type="text"
                        value={line.imputation}
                        onChange={(e) => handleLineChange(line.id, "imputation", e.target.value)}
                        placeholder="N° E / Site / Motif..."
                        className="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-slate-100 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                      />
                    </td>

                    {(
                      [
                        "entretien",
                        "reparation",
                        "permanence",
                        "depannage",
                        "horsDecompte",
                        "formation",
                        "congesJoursFeries"
                      ] as const
                    ).map((field) => (
                      <td key={field} className="p-1 border-r border-slate-800">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={line[field] || ""}
                          onChange={(e) =>
                            handleLineChange(line.id, field, parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded px-1 py-1 text-center font-mono tabular-nums text-slate-100 focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                    ))}

                    {isFirstOfDay && (
                      <td
                        rowSpan={dayLines.length}
                        className="p-2 border-r border-slate-800 text-center align-middle bg-slate-900/30 font-mono font-bold tabular-nums text-cyan-300"
                      >
                        {formatHoursLabel(dayTotalHours) || "0h"}
                      </td>
                    )}

                    {(["absence", "maladie"] as const).map((field) => (
                      <td key={field} className="p-1 border-r border-slate-800">
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          value={line[field] || ""}
                          onChange={(e) =>
                            handleLineChange(line.id, field, parseFloat(e.target.value) || 0)
                          }
                          placeholder="0"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded px-1 py-1 text-center font-mono tabular-nums text-rose-200 focus:border-rose-500 focus:outline-none"
                        />
                      </td>
                    ))}

                    {(["indemniteDeplacement", "indemnitePermanence"] as const).map((field) => (
                      <td key={field} className="p-1 border-r border-slate-800">
                        <input
                          type="number"
                          step="1"
                          min="0"
                          value={line[field] || ""}
                          onChange={(e) =>
                            handleLineChange(line.id, field, parseFloat(e.target.value) || 0)
                          }
                          placeholder="0.00"
                          className="w-full bg-slate-900 border border-slate-700/80 rounded px-1.5 py-1 text-right font-mono tabular-nums text-emerald-200 focus:border-emerald-500 focus:outline-none"
                        />
                      </td>
                    ))}

                    <td className="p-1 text-center">
                      <button
                        type="button"
                        onClick={() => handleRemoveLine(line.id, day)}
                        disabled={dayLines.length <= 1}
                        className="p-1 rounded text-rose-400 hover:bg-rose-950/50 disabled:opacity-25 cursor-pointer"
                        title="Supprimer cette ligne"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              });
            })}
          </tbody>

          <tfoot>
            <tr className="bg-slate-900 font-bold text-slate-100 border-t-2 border-slate-700 font-mono tabular-nums">
              <td colSpan={2} className="p-2.5 border-r border-slate-800 text-right font-sans">
                TOTAUX SEMAINE :
              </td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.entretien) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.reparation) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.permanence) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.depannage) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.horsDecompte) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.formation) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center">{formatHoursLabel(totals.congesJoursFeries) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center text-cyan-300">
                {formatHoursLabel(totals.heuresPointees) || "0h"}
              </td>
              <td className="p-2 border-r border-slate-800 text-center text-rose-300">{formatHoursLabel(totals.absence) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-center text-rose-300">{formatHoursLabel(totals.maladie) || "-"}</td>
              <td className="p-2 border-r border-slate-800 text-right text-emerald-300">
                {totals.indemniteDeplacement.toFixed(2)}
              </td>
              <td className="p-2 border-r border-slate-800 text-right text-amber-300">
                {totals.indemnitePermanence.toFixed(2)}
              </td>
              <td className="p-2 text-center text-[10px] font-sans text-slate-400">
                {(totals.indemniteDeplacement + totals.indemnitePermanence).toFixed(0)} MAD
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Signatures & Justification Verso */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-5 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Visa Responsable / Superviseur
            </label>
            <input
              type="text"
              value={docData.visaResponsable}
              onChange={(e) => updateDoc((p) => ({ ...p, visaResponsable: e.target.value }))}
              placeholder="Nom du responsable signataire"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Justification au verso (optionnel — génère une page 2 si renseigné)
            </label>
            <textarea
              rows={3}
              value={docData.justificationVerso || ""}
              onChange={(e) => updateDoc((p) => ({ ...p, justificationVerso: e.target.value }))}
              placeholder="Précisions sur les déplacements, heures supplémentaires, astreintes..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        <SignaturePad
          label="Signature / Visa manuscrit (optionnel, inclus dans le PDF)"
          value={docData.signatureDataUrl}
          onChange={(sig) => updateDoc((p) => ({ ...p, signatureDataUrl: sig }))}
        />
      </div>

      {/* Saved History */}
      {history.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <History className="w-4 h-4 text-cyan-400" />
            <span>Fiches de pointage sauvegardées ({history.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate">
                    {item.nom || "Collaborateur"} · {item.numSemaine}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.dateDebut} → {item.dateFin}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setDocData(item)}
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 font-medium cursor-pointer"
                  >
                    Charger
                  </button>
                  <button
                    type="button"
                    onClick={() => exportPointagePDF(item)}
                    className="p-1.5 rounded bg-cyan-950/60 hover:bg-cyan-900/70 text-cyan-300 border border-cyan-500/30 cursor-pointer"
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
