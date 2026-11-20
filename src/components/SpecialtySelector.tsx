import React from "react";
import { SpecialtyId } from "../types";
import { SPECIALTIES } from "../data/specialties";
import {
  Briefcase,
  Cog,
  TrendingUp,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Boxes,
  Layers,
  Sparkles
} from "lucide-react";

interface SpecialtySelectorProps {
  activeSpecialty: SpecialtyId | null;
  onSelectSpecialty: (specialty: SpecialtyId | null) => void;
}

const ICON_MAP: Record<string, any> = {
  Briefcase,
  Cog,
  TrendingUp,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Boxes,
  Layers,
};

export const SpecialtySelector: React.FC<SpecialtySelectorProps> = ({
  activeSpecialty,
  onSelectSpecialty,
}) => {
  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300 uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Sélectionnez votre Spécialité Métier :</span>
        </div>
        {activeSpecialty && (
          <button
            onClick={() => onSelectSpecialty(null)}
            className="text-[11px] text-slate-400 hover:text-cyan-300 transition-colors underline cursor-pointer font-medium"
          >
            Réinitialiser au rôle global
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
        {SPECIALTIES.map((spec) => {
          const IconComp = ICON_MAP[spec.iconName] || Briefcase;
          const isSelected = activeSpecialty === spec.id;

          return (
            <button
              key={spec.id}
              onClick={() => onSelectSpecialty(isSelected ? null : spec.id)}
              className={`p-3 rounded-[18px] border text-left transition-colors duration-100 flex flex-col justify-between group cursor-pointer ${
                isSelected
                  ? "bg-gradient-to-br from-violet-900/60 via-slate-800 to-blue-900/50 border-violet-500 shadow-lg shadow-violet-500/20 ring-1 ring-violet-400/50"
                  : "bg-[#1E293B]/90 border-slate-700/60 hover:border-violet-500/40 hover:bg-slate-800"
              }`}
            >
              <div className="flex items-center justify-between mb-2.5">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-100 ${
                    isSelected
                      ? "bg-gradient-to-tr from-violet-600 to-cyan-500 text-white shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-400 group-hover:text-cyan-400 group-hover:bg-slate-700"
                  }`}
                >
                  <IconComp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <p
                  className={`text-xs font-bold truncate ${
                    isSelected ? "text-white font-extrabold" : "text-slate-200 group-hover:text-white"
                  }`}
                >
                  {spec.shortTitle}
                </p>
                <p className="text-[10px] text-slate-400 line-clamp-1 mt-0.5 font-medium">
                  {spec.roleDescription}
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};


