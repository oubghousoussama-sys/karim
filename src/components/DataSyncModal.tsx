import React, { useState, useEffect } from "react";
import {
  Download,
  Upload,
  Copy,
  Check,
  Database,
  Cloud,
  RefreshCw,
  AlertTriangle,
  FileJson,
  X,
  Sparkles,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import {
  exportFullAppData,
  importFullAppData,
  downloadBackupFile,
  FullAppBackup,
} from "../utils/dataSync";

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DataSyncModal: React.FC<DataSyncModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [copied, setCopied] = useState(false);
  const [jsonString, setJsonString] = useState("");
  const [importInput, setImportInput] = useState("");
  const [importResult, setImportResult] = useState<Record<string, number> | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const data = exportFullAppData();
      setJsonString(JSON.stringify(data, null, 2));
      setErrorMessage(null);
      setImportResult(null);
      setImportInput("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        setImportInput(JSON.stringify(parsed, null, 2));
        setErrorMessage(null);
      } catch {
        setErrorMessage("Le fichier sélectionné n'est pas un JSON valide.");
      }
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    try {
      setErrorMessage(null);
      if (!importInput.trim()) {
        setErrorMessage("Veuillez coller le JSON de sauvegarde ou charger un fichier.");
        return;
      }
      const parsed: FullAppBackup = JSON.parse(importInput);
      const res = importFullAppData(parsed);
      setImportResult(res.counts);
      setTimeout(() => {
        window.location.reload();
      }, 1800);
    } catch (e: any) {
      setErrorMessage(e.message || "Erreur lors de l'importation des données.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                Sauvegarde & Synchronisation des Données
              </h3>
              <p className="text-xs text-slate-400">
                Transférez facilement toutes vos données (Parc PF, Devis, Régie, Stocks) entre les versions.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explain info box */}
        <div className="p-4 bg-blue-950/30 border-b border-blue-900/40 text-xs text-blue-200 flex items-start gap-2.5">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-blue-100">
              Pourquoi la version publiée nécessite une synchronisation ?
            </p>
            <p className="text-slate-300 text-[11px] mt-0.5">
              Les navigateurs séparent strictement le stockage local (<code className="text-cyan-300 font-mono">localStorage</code>) entre l'URL de test/dev et l'URL de prévisualisation publiée. 
              Utilisez cet outil pour <strong>télécharger</strong> ou <strong>copier</strong> vos données d'ici et les <strong>restaurer</strong> en 1 clic dans l'application publiée.
            </p>
          </div>
        </div>

        {/* Tab selection */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 p-1 gap-1 text-xs">
          <button
            onClick={() => setActiveTab("export")}
            className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "export"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            1. Exporter mes données actuelles
          </button>
          <button
            onClick={() => setActiveTab("import")}
            className={`flex-1 py-2 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === "import"
                ? "bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md shadow-blue-500/20"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            2. Restaurer / Importer sur la version publiée
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5 flex-1 overflow-y-auto space-y-4 text-xs">
          {activeTab === "export" ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-slate-300 font-medium">
                  Données prêtes à être exportées :
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={downloadBackupFile}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Télécharger le fichier .json
                  </button>
                  <button
                    onClick={handleCopy}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copié !" : "Copier dans le presse-papier"}
                  </button>
                </div>
              </div>

              <div className="relative">
                <textarea
                  readOnly
                  value={jsonString}
                  rows={10}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-slate-300 focus:outline-hidden resize-none select-all"
                />
              </div>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                  Comment transférer ces données sur votre version publiée :
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1 text-[11px]">
                  <li>Cliquez sur <strong>"Télécharger le fichier .json"</strong> ou <strong>"Copier"</strong> ci-dessus.</li>
                  <li>Ouvrez votre lien d'application publiée.</li>
                  <li>Cliquez sur le bouton <strong>"Sauvegarde & Synchronisation"</strong> en haut.</li>
                  <li>Allez dans l'onglet <strong>"2. Restaurer / Importer"</strong>, collez le contenu ou importez le fichier et validez.</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block font-medium text-slate-300">
                  Collez le texte JSON de sauvegarde OU sélectionnez le fichier téléchargé :
                </label>
                <div className="flex items-center gap-3">
                  <label className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold flex items-center gap-2 cursor-pointer transition-colors">
                    <FileJson className="w-4 h-4 text-cyan-400" />
                    <span>Choisir un fichier .json</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-slate-500">ou collez directement ci-dessous :</span>
                </div>
              </div>

              <textarea
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                placeholder="Collez ici le JSON de sauvegarde..."
                rows={8}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 font-mono text-[11px] text-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none"
              />

              {errorMessage && (
                <div className="p-3 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 flex items-center gap-2 text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {importResult && (
                <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-emerald-300 space-y-1 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-200">
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span>Importation réussie avec succès ! Actualisation en cours...</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-[11px] text-emerald-300/90 pt-1">
                    {Object.entries(importResult).map(([k, v]) => (
                      <div key={k}>
                        • {k} : <span className="font-mono font-bold">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleApplyImport}
                disabled={!importInput.trim()}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Appliquer et Synchroniser les données
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Chiffrement et persistance locale intégrale</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-semibold transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
