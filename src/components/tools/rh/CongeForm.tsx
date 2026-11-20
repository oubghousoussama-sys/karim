import React, { useState } from "react";
import { RHCongeDocument } from "../../../types";
import { exportCongePDF } from "./rhPdfExport";
import { SignaturePad } from "./SignaturePad";
import {
  CalendarCheck,
  Download,
  FileDown,
  History,
  Lock,
  RotateCcw,
  Save
} from "lucide-react";

const STORAGE_KEY_CURRENT = "rh_conge_current_v1";
const STORAGE_KEY_HISTORY = "rh_conge_history_v1";

function getDefaultCongeDoc(): RHCongeDocument {
  return {
    id: `cong-${Date.now()}`,
    nomPrenom: "",
    mle: "",
    fonction: "",
    service: "S.A.V",
    dateDepart: new Date().toISOString().slice(0, 10),
    dateRetour: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    reliquatAnneeNMoins1: 0,
    reliquatAnneeN: 18,
    joursDemandes: 6,
    decision: "",
    observations: "",
    visaInteresse: "",
    visaDrh: "",
    visaResponsable: "",
    visaDg: ""
  };
}

function calculateWorkingDays(startIso: string, endIso: string): number {
  const sParts = startIso.split("-").map(Number);
  const eParts = endIso.split("-").map(Number);
  if (sParts.length !== 3 || eParts.length !== 3) return 0;
  const start = new Date(Date.UTC(sParts[0], sParts[1] - 1, sParts[2]));
  const end = new Date(Date.UTC(eParts[0], eParts[1] - 1, eParts[2]));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return 0;

  let count = 0;
  const cursor = new Date(start.getTime());
  // Return date is the day back at work, so count days strictly before end
  while (cursor < end) {
    const day = cursor.getUTCDay();
    if (day !== 0) {
      // Exclude Sundays by default (Mon-Sat 6-day Moroccan leave week or Mon-Fri, editable by user)
      count++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

export const CongeForm: React.FC = () => {
  const [docData, setDocData] = useState<RHCongeDocument>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CURRENT);
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          decision: "",
          visaResponsable: "",
          visaDg: ""
        };
      }
    } catch {
      // ignore
    }
    return getDefaultCongeDoc();
  });

  const [history, setHistory] = useState<RHCongeDocument[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return [];
  });

  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const updateDoc = (updater: (prev: RHCongeDocument) => RHCongeDocument) => {
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

  const handleDateChange = (field: "dateDepart" | "dateRetour", val: string) => {
    updateDoc((prev) => {
      const next = { ...prev, [field]: val };
      const autoDays = calculateWorkingDays(
        field === "dateDepart" ? val : prev.dateDepart,
        field === "dateRetour" ? val : prev.dateRetour
      );
      if (autoDays > 0) {
        next.joursDemandes = autoDays;
      }
      return next;
    });
  };

  const nouveauReliquat =
    (Number(docData.reliquatAnneeNMoins1) || 0) +
    (Number(docData.reliquatAnneeN) || 0) -
    (Number(docData.joursDemandes) || 0);

  const handleSaveToHistory = () => {
    const snapshot: RHCongeDocument = {
      ...docData,
      id: docData.id || `cong-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    const nextHistory = [snapshot, ...history.filter((h) => h.id !== snapshot.id)].slice(0, 20);
    setHistory(nextHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(nextHistory));
    } catch {
      // ignore
    }
    setStatusMessage("Demande de congé enregistrée dans votre historique.");
    setTimeout(() => setStatusMessage(null), 3500);
  };

  const handleReset = () => {
    const fresh = getDefaultCongeDoc();
    setDocData(fresh);
    try {
      localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(fresh));
    } catch {
      // ignore
    }
  };

  const handleGeneratePDF = () => {
    exportCongePDF(docData);
    setStatusMessage("PDF d'Autorisation de Congé généré et téléchargé.");
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <h3 className="text-base font-bold text-white">
            Autorisation & Demande de Congé
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Formulaire conforme au modèle officiel (Demande, Situation Congés Payés DRH & Autorisation Hiérarchique)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/demande%20cong%C3%A9%206%20jours%20.pdf"
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
            <span>Nouvelle demande</span>
          </button>
          <button
            type="button"
            onClick={handleSaveToHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-200 border border-emerald-500/30 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Save className="w-3.5 h-3.5 text-emerald-400" />
            <span>Sauvegarder</span>
          </button>
          <button
            type="button"
            onClick={handleGeneratePDF}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/40 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-4 h-4" />
            <span>Générer PDF Congé</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 rounded-lg bg-emerald-950/70 border border-emerald-500/40 text-emerald-200 text-xs font-medium">
          {statusMessage}
        </div>
      )}

      {/* Main Layout: 2 Columns (Form Left, Live Paper Preview Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left: Form Inputs */}
        <div className="xl:col-span-7 space-y-5">
          {/* Block 1: Demande de Congé */}
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 text-xs">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-2.5">
              <CalendarCheck className="w-4 h-4 text-emerald-400" />
              <span>1. Demande de Congé</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-400 font-medium mb-1">Nom & Prénom</label>
                <input
                  type="text"
                  value={docData.nomPrenom}
                  onChange={(e) => updateDoc((p) => ({ ...p, nomPrenom: e.target.value }))}
                  placeholder="ex: KARIM ELBACHRI"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">MLE (Matricule)</label>
                <input
                  type="text"
                  value={docData.mle}
                  onChange={(e) => updateDoc((p) => ({ ...p, mle: e.target.value }))}
                  placeholder="ex: 442"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Fonction</label>
                <input
                  type="text"
                  value={docData.fonction}
                  onChange={(e) => updateDoc((p) => ({ ...p, fonction: e.target.value }))}
                  placeholder="ex: Technicien Maintenance"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Service</label>
                <input
                  type="text"
                  value={docData.service}
                  onChange={(e) => updateDoc((p) => ({ ...p, service: e.target.value }))}
                  placeholder="ex: S.A.V"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Date de départ</label>
                <input
                  type="date"
                  value={docData.dateDepart}
                  onChange={(e) => handleDateChange("dateDepart", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">Date retour (reprise)</label>
                <input
                  type="date"
                  value={docData.dateRetour}
                  onChange={(e) => handleDateChange("dateRetour", e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <SignaturePad
              label="VISA de l'intéressé (signature manuscrite)"
              value={docData.signatureInteresseDataUrl}
              onChange={(sig) => updateDoc((p) => ({ ...p, signatureInteresseDataUrl: sig }))}
            />
          </div>

          {/* Block 2: Situation Congés Payés (Réservé à la DRH) */}
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 text-xs">
            <h4 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-2.5">
              2. Situation Congés Payés (Réservé à la DRH)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Reliquat dû au titre de l'année N-1 (jours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={docData.reliquatAnneeNMoins1}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, reliquatAnneeNMoins1: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Reliquat dû au titre de l'année N (jours)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={docData.reliquatAnneeN}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, reliquatAnneeN: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nombre de jours de congé demandés
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  value={docData.joursDemandes}
                  onChange={(e) =>
                    updateDoc((p) => ({ ...p, joursDemandes: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-emerald-300 font-bold font-mono tabular-nums focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Nouveau reliquat calculé
                </label>
                <div
                  className={`w-full rounded-lg px-3 py-2 font-mono font-bold tabular-nums border ${
                    nouveauReliquat < 0
                      ? "bg-rose-950/40 border-rose-500/40 text-rose-300"
                      : "bg-slate-950 border-slate-800 text-emerald-300"
                  }`}
                >
                  {nouveauReliquat} jour(s)
                </div>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">VISA DRH (nom ou mention)</label>
              <input
                type="text"
                value={docData.visaDrh || ""}
                onChange={(e) => updateDoc((p) => ({ ...p, visaDrh: e.target.value }))}
                placeholder="Laisser vide si en attente de validation DRH"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Block 3: Autorisation du supérieur Hiérarchique (laissée vide) */}
          <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4 text-xs">
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-400" />
                <span>3. Autorisation du supérieur Hiérarchique</span>
              </h4>
              <span className="text-[11px] font-medium text-slate-400">
                Laissée vide sur le document
              </span>
            </div>

            <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-400 leading-relaxed">
              Les cases <strong className="text-slate-200">Congé Autorisé</strong> /{" "}
              <strong className="text-slate-200">Congé Reporté</strong> ainsi que les zones{" "}
              <strong className="text-slate-200">VISA Responsable Hiérarchique</strong> et{" "}
              <strong className="text-slate-200">VISA DG</strong> restent vierges sur l'aperçu et le PDF généré pour être renseignées et signées par votre direction.
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Observations (optionnel — laisser vide si aucune)
              </label>
              <input
                type="text"
                value={docData.observations}
                onChange={(e) => updateDoc((p) => ({ ...p, observations: e.target.value }))}
                placeholder="Laisser vide ou ajouter une précision..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:border-emerald-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Right: Live Paper A4 Preview */}
        <div className="xl:col-span-5">
          <div className="bg-white text-slate-900 rounded-xl border border-slate-300 shadow-2xl p-7 text-[12px] leading-relaxed">
            <h3 className="text-center font-bold text-base pb-2 border-b border-slate-800">
              Autorisation de Congé
            </h3>

            <div className="pt-4 pb-4 border-b border-slate-800 space-y-2">
              <div className="text-center font-bold text-sm mb-3">Demande de Congé</div>
              <div className="grid grid-cols-[130px_1fr] gap-y-1.5">
                <span className="text-slate-600">Nom & Prénom :</span>
                <span className="font-bold uppercase">{docData.nomPrenom || "—"}</span>
                <span className="text-slate-600">MLE :</span>
                <span className="font-semibold font-mono">{docData.mle || "—"}</span>
                <span className="text-slate-600">Fonction :</span>
                <span className="font-semibold">{docData.fonction || "—"}</span>
                <span className="text-slate-600">Service :</span>
                <span className="font-semibold">{docData.service || "—"}</span>
                <span className="text-slate-600">Date de départ :</span>
                <span className="font-bold font-mono">{docData.dateDepart.split("-").reverse().join("-")}</span>
                <span className="text-slate-600">Date retour :</span>
                <span className="font-bold font-mono">{docData.dateRetour.split("-").reverse().join("-")}</span>
              </div>
              <div className="pt-4 flex justify-end">
                <div className="text-center w-40">
                  <div className="text-[11px] font-medium">VISA de l'intéressé</div>
                  {docData.signatureInteresseDataUrl ? (
                    <img
                      src={docData.signatureInteresseDataUrl}
                      alt="Signature"
                      className="h-12 mx-auto mt-1 object-contain"
                    />
                  ) : (
                    <div className="h-10" />
                  )}
                </div>
              </div>
            </div>

            <div className="pt-4 pb-4 border-b border-slate-800 space-y-2">
              <div className="text-center font-bold text-[13px] mb-2">
                Situation Congés Payés (Réservé à la DRH)
              </div>
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Reliquat des jours dus au titre de l'année N-1</span>
                  <span className="font-mono font-bold">{docData.reliquatAnneeNMoins1} j</span>
                </div>
                <div className="flex justify-between">
                  <span>Reliquat des jours dus au titre de l'année N</span>
                  <span className="font-mono font-bold">{docData.reliquatAnneeN} j</span>
                </div>
                <div className="flex justify-between">
                  <span>Nombre de jours de congé demandés</span>
                  <span className="font-mono font-bold">{docData.joursDemandes} j</span>
                </div>
                <div className="flex justify-between border-t border-slate-200 pt-1">
                  <span className="font-semibold">Nouveau reliquat de jours de congés payés</span>
                  <span className="font-mono font-bold">{nouveauReliquat} j</span>
                </div>
              </div>
              <div className="pt-3 text-right pr-6 text-[11px]">
                <div>VISA DRH</div>
                {docData.visaDrh && <div className="font-bold mt-1">{docData.visaDrh}</div>}
              </div>
            </div>

            <div className="pt-4 pb-4 border-b border-slate-800 space-y-4">
              <div className="text-center font-bold text-[13px]">
                Autorisation du supérieur Hiérarchique
              </div>
              <div className="flex items-center justify-around py-1">
                <div className="flex items-center gap-2">
                  <span>Congé Autorisé</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 border border-slate-800 font-bold text-[11px]" />
                </div>
                <div className="flex items-center gap-2">
                  <span>Congé Reporté</span>
                  <span className="inline-flex items-center justify-center w-4 h-4 border border-slate-800 font-bold text-[11px]" />
                </div>
              </div>
              <div>
                <span className="text-slate-600">Observations : </span>
                <span className="font-semibold">{docData.observations || ""}</span>
              </div>
              <div className="flex justify-between pt-4 pb-6 px-4 text-[11px]">
                <div>
                  <div>VISA Responsable Hiérarchique</div>
                </div>
                <div className="text-center">
                  <div>VISA DG</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved History */}
      {history.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
            <History className="w-4 h-4 text-emerald-400" />
            <span>Demandes de congé sauvegardées ({history.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate">
                    {item.nomPrenom || "Collaborateur"} · {item.joursDemandes} j
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {item.dateDepart} → {item.dateRetour}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setDocData({
                        ...item,
                        decision: "",
                        visaResponsable: "",
                        visaDg: ""
                      })
                    }
                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium cursor-pointer"
                  >
                    Charger
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      exportCongePDF({
                        ...item,
                        decision: "",
                        visaResponsable: "",
                        visaDg: ""
                      })
                    }
                    className="p-1.5 rounded bg-emerald-950/60 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-500/30 cursor-pointer"
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
