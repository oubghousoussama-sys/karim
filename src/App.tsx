import React, { useState } from "react";
import { ActiveTab, SpecialtyId } from "./types";
import { Navbar } from "./components/Navbar";
import { SpecialtySelector } from "./components/SpecialtySelector";
import { ChatWorkspace } from "./components/ChatWorkspace";
import { StockManager } from "./components/tools/StockManager";
import { PFManager } from "./components/tools/PFManager";
import { DocumentGenerator } from "./components/tools/DocumentGenerator";
import { FinanceCalculator } from "./components/tools/FinanceCalculator";
import { RHManager } from "./components/tools/RHManager";
import { DataSyncModal } from "./components/DataSyncModal";
import {
  ShieldCheck,
  Wrench,
  Boxes,
  FileText,
  Users
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("workspace");
  const [visitedTabs, setVisitedTabs] = useState<Partial<Record<ActiveTab, boolean>>>({
    workspace: true,
    pf: false,
    stock: false,
    documents: false,
    rh: false,
    finance: false
  });
  const [activeSpecialty, setActiveSpecialty] = useState<SpecialtyId | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const handleSelectTab = (tab: ActiveTab) => {
    setActiveTab(tab);
    if (!visitedTabs[tab]) {
      setVisitedTabs((prev) => ({ ...prev, [tab]: true }));
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] ambient-bg text-[#F8FAFC] flex flex-col font-sans selection:bg-violet-600 selection:text-white">
      {/* Header & Tabs */}
      <Navbar
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        activeSpecialty={activeSpecialty}
        onSelectSpecialty={setActiveSpecialty}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
      />

      {/* Global Data Backup & Sync Modal */}
      {isSyncModalOpen && (
        <DataSyncModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Workspace Tab */}
        <div className={activeTab === "workspace" ? "space-y-4" : "hidden"}>
          <SpecialtySelector
            activeSpecialty={activeSpecialty}
            onSelectSpecialty={setActiveSpecialty}
          />
          <ChatWorkspace
            activeSpecialty={activeSpecialty}
            onSelectSpecialty={setActiveSpecialty}
          />
        </div>

        {/* Section PF - Parc Équipements, 11 Visites + CPSI & Règle des 100 Jours NC */}
        {(visitedTabs.pf || activeTab === "pf") && (
          <div className={activeTab === "pf" ? "space-y-6" : "hidden"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5 tracking-tight">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <span>Section PF — Gestion du Parc Équipements & Conformité Réglementaire</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Suivi des 11 visites d'inspection périodiques + 12ème Visite CPSI par appareil, et pilotage strict des Non-Conformités (NC à régler obligatoirement sous 100 jours).
                </p>
              </div>
            </div>
            <PFManager />
          </div>
        )}

        {/* Stock & Fiches de Régie Pièces Workbench */}
        {(visitedTabs.stock || activeTab === "stock") && (
          <div className={activeTab === "stock" ? "space-y-6" : "hidden"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5 tracking-tight">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20">
                    <Boxes className="w-5 h-5" />
                  </div>
                  <span>Gestion des Stocks & Demandes de Pièces (Fiches de Régie Schindler)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Gestion intégrée du stock d'ascenseurs, création des fiches de régie techniciens/admin, déduction automatique du stock lors des clôtures et calcul du gain net sur devis.
                </p>
              </div>
            </div>
            <StockManager />
          </div>
        )}

        {/* Legal & Document Generator Studio */}
        {(visitedTabs.documents || activeTab === "documents") && (
          <div className={activeTab === "documents" ? "space-y-6" : "hidden"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5 tracking-tight">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span>Générateur Juridique, Contrats & Procédures (SOP)</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Génération de contrats professionnels complets, accords de confidentialité (NDA), fiches de poste et comptes-rendus de direction.
                </p>
              </div>
            </div>
            <DocumentGenerator />
          </div>
        )}

        {/* Gestion RH (Fiche de Pointage, Demande de Congé, Note de Frais) */}
        {(visitedTabs.rh || activeTab === "rh") && (
          <div className={activeTab === "rh" ? "space-y-6" : "hidden"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5 tracking-tight">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-600 text-white shadow-lg shadow-cyan-500/20">
                    <Users className="w-5 h-5" />
                  </div>
                  <span>Gestion RH — Pointage, Congés & Notes de Frais</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Saisie interactive de la Feuille Hebdomadaire de Pointage, Autorisation de Congé et Note de Frais selon les modèles officiels, avec export PDF instantané.
                </p>
              </div>
            </div>
            <RHManager />
          </div>
        )}

        {/* Financial & Management Control */}
        {(visitedTabs.finance || activeTab === "finance") && (
          <div className={activeTab === "finance" ? "space-y-6" : "hidden"}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2.5 tracking-tight">
                  <div className="p-2 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span>Contrôle de Gestion, Marges & Seuil de Rentabilité</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1 font-medium">
                  Calculateur interactif du point mort (en € et en jours), marge sur coût variable et préconisations de pilotage financier.
                </p>
              </div>
            </div>
            <FinanceCalculator />
          </div>
        )}
      </main>

      {/* Professional Corporate Glass Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0F172A]/95 py-5 text-xs text-slate-400 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="font-extrabold text-white tracking-tight">TOOLBOX AI PRO</span>
            <span className="text-slate-600">&bull;</span>
            <span className="text-slate-400 font-medium">Système d'Aide à la Décision Métier & Opérations B2B</span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-medium">
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              Génération 2026 Enterprise Edition
            </span>
            <span>&bull;</span>
            <span>© {new Date().getFullYear()} TOOLBOX AI PRO</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

