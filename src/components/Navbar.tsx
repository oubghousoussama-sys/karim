import React from "react";
import { ActiveTab, SpecialtyId } from "../types";
import {
  Wrench,
  Bot,
  Boxes,
  FileText,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Activity,
  Database,
  Users
} from "lucide-react";

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeSpecialty: SpecialtyId | null;
  onSelectSpecialty: (specialty: SpecialtyId | null) => void;
  onOpenSyncModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  onOpenSyncModal,
}) => {
  const tabs: Array<{ id: ActiveTab; label: string; icon: any; badge?: string }> = [
    { id: "workspace", label: "Consultation IA", icon: Bot },
    { id: "pf", label: "PF (Parc & CPSI)", icon: Wrench, badge: "11V + NC" },
    { id: "stock", label: "Stock & Fiches de Régie", icon: Boxes, badge: "Demandes" },
    { id: "documents", label: "Générateur Contrats & Doc", icon: FileText },
    { id: "rh", label: "Gestion RH", icon: Users },
    { id: "finance", label: "Contrôle Financier", icon: TrendingUp },
  ];

  return (
    <header className="sticky top-0 z-50 bg-[#0F172A]/95 border-b border-slate-800/80 shadow-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="relative group">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600 via-blue-600 to-cyan-500 opacity-70 blur-xs"></div>
              <div className="relative w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-white shadow-xl">
                <Wrench className="w-5 h-5 text-cyan-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-extrabold text-base tracking-tight text-white font-sans">
                  TOOLBOX AI <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-blue-400 to-cyan-400">PRO</span>
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30 uppercase tracking-wider shadow-xs">
                  Enterprise B2B
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-[320px] hidden sm:block font-medium">
                Plateforme Décisionnelle • Maintenance, Stock & Finance
              </p>
            </div>
          </div>

          {/* Actions & Live System Status Indicator */}
          <div className="flex items-center gap-2 sm:gap-3">
            {onOpenSyncModal && (
              <button
                onClick={onOpenSyncModal}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/90 to-cyan-600/90 hover:from-blue-500 hover:to-cyan-500 text-white font-semibold text-xs shadow-md shadow-blue-500/20 border border-cyan-400/30 transition-colors duration-100 cursor-pointer"
                title="Sauvegarder et Synchroniser les données entre les versions"
              >
                <Database className="w-3.5 h-3.5 text-cyan-200" />
                <span className="hidden sm:inline">Sauvegarder / Synchroniser</span>
                <span className="sm:hidden">Sync</span>
              </button>
            )}

            <div className="hidden lg:flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/60 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-semibold text-slate-200">Gemini 3.7 Flash</span>
                <span className="text-slate-500">&bull;</span>
                <span className="text-emerald-400 font-medium flex items-center gap-1">
                  <Activity className="w-3 h-3" /> Opérationnel
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-950/40 border border-violet-500/30 text-violet-300 text-xs font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Normes ISO</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2.5 border-t border-slate-800/60 text-xs">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-[12px] font-semibold whitespace-nowrap transition-colors duration-75 cursor-pointer ${
                  isActive
                    ? "bg-gradient-to-r from-violet-600 via-blue-600 to-blue-700 text-white shadow-lg shadow-violet-500/20 border border-violet-400/30"
                    : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/70 border border-transparent"
                }`}
              >
                <IconComp className={`w-4 h-4 ${isActive ? "text-cyan-300" : "text-slate-400"}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-800 text-slate-400 border border-slate-700/60"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};


