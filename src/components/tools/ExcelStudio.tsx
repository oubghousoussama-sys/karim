import React, { useState } from "react";
import { FormattedOutput } from "../FormattedOutput";
import {
  FileSpreadsheet,
  Code2,
  Sparkles,
  Zap,
  HelpCircle,
  Copy,
  Check,
  Languages,
  BookOpen
} from "lucide-react";

const EXCEL_PRESETS = [
  {
    title: "RECHERCHEX Multi-Critères",
    software: "Excel 365 / Google Sheets",
    need: "Trouver le prix unitaire d'un article correspondant à la fois à un Code Produit (Col A) et à un Code Fournisseur (Col B) dans la table Tarifs, avec gestion des erreurs si non trouvé.",
    sample: "Col A: CodeProduit, Col B: CodeFournisseur, Col C: PrixUnitaire",
  },
  {
    title: "Commissions Commerciales par Paliers",
    software: "Excel 365 / 2021",
    need: "Calculer une prime avec taux progressif : 0% si CA < 50k€, 5% entre 50k€ et 100k€, 8% au-delà de 100k€, en utilisant une formule fluide sans imbrications complexes de SI.",
    sample: "Cellule B2 = Chiffre d'Affaires réalisé",
  },
  {
    title: "Macro VBA Consolidation Fichiers",
    software: "Excel VBA (Macro)",
    need: "Créer une macro VBA qui boucle sur tous les fichiers .xlsx d'un dossier spécifié, copie l'onglet 'Donnees' et empile les lignes dans un classeur récapitulatif unique.",
    sample: "Dossier cible: C:\\Rapports_Mensuels\\",
  },
  {
    title: "Calcul du Seuil de Rentabilité & Jours",
    software: "Excel / Google Sheets",
    need: "Calculer automatiquement le Chiffre d'affaires critique (Point mort en €), la marge sur coût variable (%) et le jour exact de l'année où le seuil est franchi (Point mort en jours).",
    sample: "CA Annuel, Charges Fixes, Charges Variables",
  }
];

export const ExcelStudio: React.FC = () => {
  const [software, setSoftware] = useState("Excel 365 (Français / Anglais)");
  const [needDescription, setNeedDescription] = useState(
    "Je souhaite rapprocher 2 listes de factures et afficher 'Payée', 'En retard' ou 'Introuvable' selon la date d'échéance et le solde bancaire."
  );
  const [currentFormula, setCurrentFormula] = useState("");
  const [dataSample, setDataSample] = useState("Col A: NumFacture, Col B: DateEcheance, Col C: MontantTTC, Col D: DatePaiement");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const applyPreset = (preset: typeof EXCEL_PRESETS[0]) => {
    setSoftware(preset.software);
    setNeedDescription(preset.need);
    setDataSample(preset.sample);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch("/api/gemini/excel-expert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          needDescription,
          software,
          currentFormula,
          dataSample,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data.text);
    } catch (err: any) {
      setResult(`⚠️ Erreur : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-teal-400" />
          <span>Problématiques Excel Fréquentes (1-Click) :</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {EXCEL_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => applyPreset(preset)}
              className="p-2.5 text-left rounded-lg bg-slate-950/70 border border-slate-800 hover:border-teal-500/40 hover:bg-slate-800/40 transition-all text-xs group cursor-pointer"
            >
              <p className="font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                {preset.title}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{preset.software}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleGenerate} className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4 text-xs">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Expertise Formules, Power Query & Macros VBA
            </h3>
          </div>
          <span className="text-slate-400 text-[11px]">Bilingue FR / EN & optimisation des performances</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-slate-300 font-medium mb-1">Environnement / Logiciel</label>
            <select
              value={software}
              onChange={(e) => setSoftware(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200"
            >
              <option value="Excel 365 (Français et Anglais)">Excel 365 (Français / Anglais)</option>
              <option value="Excel 2021 / 2019 / 2016">Excel 2021 / 2019 / 2016</option>
              <option value="Google Sheets">Google Sheets</option>
              <option value="Excel VBA (Code Macro)">Excel VBA (Macro / Automatisation)</option>
              <option value="Power Query (Langage M)">Power Query (Langage M)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-slate-300 font-medium mb-1">
              Structure de vos colonnes / Cellules
            </label>
            <input
              type="text"
              value={dataSample}
              onChange={(e) => setDataSample(e.target.value)}
              placeholder="ex: Colonne A = ID Client, Colonne B = Date, Colonne C = Montant..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200"
            />
          </div>
        </div>

        <div>
          <label className="block text-slate-300 font-medium mb-1">
            Description détaillée de votre besoin ou du calcul souhaité
          </label>
          <textarea
            rows={3}
            required
            value={needDescription}
            onChange={(e) => setNeedDescription(e.target.value)}
            placeholder="Expliquez ce que vous souhaitez calculer, tester ou automatiser..."
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-slate-200"
          />
        </div>

        <div>
          <label className="block text-slate-400 mb-1">
            Formule actuelle qui ne fonctionne pas ou à optimiser (facultatif)
          </label>
          <input
            type="text"
            value={currentFormula}
            onChange={(e) => setCurrentFormula(e.target.value)}
            placeholder="ex: =SI(A2=... ; RECHERCHEV(...))"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
          />
        </div>

        <div className="pt-3 flex items-center justify-end border-t border-slate-800">
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? "Calcul & Modélisation..." : "Générer la Formule & Solution d'Expert"}</span>
          </button>
        </div>
      </form>

      {/* Result Display */}
      {result && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-teal-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-teal-400" />
              Solution & Formules Validées par l'Expert Excel
            </h3>
          </div>
          <FormattedOutput content={result} />
        </div>
      )}
    </div>
  );
};
