import React, { useState } from "react";
import { PointageForm } from "./rh/PointageForm";
import { CongeForm } from "./rh/CongeForm";
import { NoteFraisForm } from "./rh/NoteFraisForm";
import { CalendarCheck, Clock, Receipt } from "lucide-react";

type RHSubTab = "pointage" | "conge" | "notefrais";

export const RHManager: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<RHSubTab>("pointage");
  const [visitedSubTabs, setVisitedSubTabs] = useState<Record<RHSubTab, boolean>>({
    pointage: true,
    conge: false,
    notefrais: false
  });

  const handleSelectSubTab = (tab: RHSubTab) => {
    setActiveSubTab(tab);
    if (!visitedSubTabs[tab]) {
      setVisitedSubTabs((prev) => ({ ...prev, [tab]: true }));
    }
  };

  const subTabs: Array<{
    id: RHSubTab;
    label: string;
    subtitle: string;
    icon: any;
    activeStyle: string;
  }> = [
    {
      id: "pointage",
      label: "Fiche de Pointage",
      subtitle: "Modèle hebdomadaire · Lundi à Dimanche",
      icon: Clock,
      activeStyle: "bg-cyan-950/50 border-cyan-500 text-cyan-200"
    },
    {
      id: "conge",
      label: "Demande de Congé",
      subtitle: "Autorisation de congé & reliquats DRH",
      icon: CalendarCheck,
      activeStyle: "bg-emerald-950/50 border-emerald-500 text-emerald-200"
    },
    {
      id: "notefrais",
      label: "Note de Frais",
      subtitle: "Frais de déplacement & avances (13 col.)",
      icon: Receipt,
      activeStyle: "bg-rose-950/50 border-rose-500 text-rose-200"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Sub-navigation selector */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {subTabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectSubTab(tab.id)}
              className={`p-4 rounded-xl border text-left transition-colors duration-75 cursor-pointer flex items-center gap-3.5 ${
                isActive
                  ? tab.activeStyle
                  : "bg-slate-900/80 border-slate-800 hover:border-slate-700 text-slate-300"
              }`}
            >
              <div
                className={`p-2.5 rounded-lg border ${
                  isActive
                    ? "bg-slate-950/60 border-white/15"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <IconComp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-sm whitespace-nowrap truncate">{tab.label}</div>
                <div className="text-[11px] text-slate-400 truncate mt-0.5">{tab.subtitle}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Sub-tools kept mounted once visited for instant switching */}
      <div className="p-6 rounded-2xl bg-slate-900/85 border border-slate-800 shadow-xl">
        {(visitedSubTabs.pointage || activeSubTab === "pointage") && (
          <div className={activeSubTab === "pointage" ? "block" : "hidden"}>
            <PointageForm />
          </div>
        )}
        {(visitedSubTabs.conge || activeSubTab === "conge") && (
          <div className={activeSubTab === "conge" ? "block" : "hidden"}>
            <CongeForm />
          </div>
        )}
        {(visitedSubTabs.notefrais || activeSubTab === "notefrais") && (
          <div className={activeSubTab === "notefrais" ? "block" : "hidden"}>
            <NoteFraisForm />
          </div>
        )}
      </div>
    </div>
  );
};
