import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  Target,
  FileText,
  Search,
  CheckCircle2,
  ListOrdered,
  AlertTriangle,
  TrendingUp,
  Star,
  Copy,
  Check,
  Printer,
  Download,
  Share2
} from "lucide-react";

interface FormattedOutputProps {
  content: string;
  isStreaming?: boolean;
}

export const FormattedOutput: React.FC<FormattedOutputProps> = ({
  content,
  isStreaming = false,
}) => {
  const [copied, setCopied] = useState(false);
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/markdown;charset=utf-8" });
    element.href = URL.createObjectURL(file);
    element.download = `TOOLBOX_AI_PRO_Rapport_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const toggleAction = (key: string) => {
    setCheckedActions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Check if content contains structured sections
  const hasSections =
    content.includes("🎯 OBJECTIF") ||
    content.includes("📋 SYNTHÈSE") ||
    content.includes("🔍 ANALYSE") ||
    content.includes("✅ RECOMMANDATION") ||
    content.includes("🛠 PLAN D'ACTION") ||
    content.includes("⚠️ POINTS DE VIGILANCE") ||
    content.includes("📈 IMPACT ATTENDU") ||
    content.includes("⭐ CONSEIL EXPERT") ||
    content.includes("=== DOCUMENT INTÉGRAL ===");

  // Parse structured sections
  const parseSections = (rawText: string) => {
    const sectionTags = [
      { key: "objective", tag: "🎯 OBJECTIF", icon: Target, color: "text-blue-300 border-blue-500/30 bg-blue-950/30" },
      { key: "summary", tag: "📋 SYNTHÈSE", icon: FileText, color: "text-indigo-300 border-indigo-500/30 bg-indigo-950/30" },
      { key: "analysis", tag: "🔍 ANALYSE", icon: Search, color: "text-cyan-300 border-cyan-500/30 bg-cyan-950/30" },
      { key: "recommendation", tag: "✅ RECOMMANDATION", icon: CheckCircle2, color: "text-emerald-300 border-emerald-500/30 bg-emerald-950/30" },
      { key: "action_plan", tag: "🛠 PLAN D'ACTION", icon: ListOrdered, color: "text-amber-300 border-amber-500/30 bg-amber-950/30" },
      { key: "vigilance", tag: "⚠️ POINTS DE VIGILANCE", icon: AlertTriangle, color: "text-rose-300 border-rose-500/30 bg-rose-950/30" },
      { key: "impact", tag: "📈 IMPACT ATTENDU", icon: TrendingUp, color: "text-teal-300 border-teal-500/30 bg-teal-950/30" },
      { key: "expert_tip", tag: "⭐ CONSEIL EXPERT", icon: Star, color: "text-amber-300 border-amber-500/30 bg-amber-950/30" },
      { key: "full_document", tag: "=== DOCUMENT INTÉGRAL ===", icon: FileText, color: "text-purple-300 border-purple-500/30 bg-purple-950/30" }
    ];

    // If text doesn't strictly match or is streaming with partial tags, we can extract matched segments
    const foundSections: Array<{
      key: string;
      tag: string;
      icon: any;
      color: string;
      text: string;
    }> = [];

    let remaining = rawText;
    let preamble = "";

    // Find indices of all tags
    const positions: Array<{ index: number; tagInfo: typeof sectionTags[0] }> = [];
    sectionTags.forEach((s) => {
      const idx = rawText.indexOf(s.tag);
      if (idx !== -1) {
        positions.push({ index: idx, tagInfo: s });
      }
    });

    positions.sort((a, b) => a.index - b.index);

    if (positions.length === 0) {
      return { preamble: rawText, sections: [] };
    }

    preamble = rawText.substring(0, positions[0].index).trim();

    for (let i = 0; i < positions.length; i++) {
      const current = positions[i];
      const startContent = current.index + current.tagInfo.tag.length;
      const endContent = i < positions.length - 1 ? positions[i + 1].index : rawText.length;
      const sectionText = rawText.substring(startContent, endContent).trim();

      foundSections.push({
        key: current.tagInfo.key,
        tag: current.tagInfo.tag,
        icon: current.tagInfo.icon,
        color: current.tagInfo.color,
        text: sectionText,
      });
    }

    return { preamble, sections: foundSections };
  };

  if (!hasSections) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-end gap-2 pb-2 border-b border-slate-800 text-xs text-slate-400">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
            title="Copier la réponse"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copié !" : "Copier"}</span>
          </button>
          <button
            onClick={handleDownloadText}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
            title="Télécharger en Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exporter .md</span>
          </button>
        </div>
        <div className="prose prose-invert max-w-none text-slate-200 text-sm leading-relaxed prose-headings:text-white prose-a:text-cyan-400 prose-table:border-slate-800 prose-th:bg-slate-900 prose-td:border-slate-800 prose-th:p-2 prose-td:p-2 prose-pre:bg-slate-950 prose-pre:text-slate-100">
          <Markdown>{content}</Markdown>
        </div>
      </div>
    );
  }

  const { preamble, sections } = parseSections(content);

  return (
    <div className="space-y-4 text-slate-200">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            Format Standard TOOLBOX AI PRO
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-all cursor-pointer active:scale-95"
            title="Copier le rapport complet"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? "Copié" : "Copier"}</span>
          </button>
          <button
            onClick={handlePrint}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-all cursor-pointer active:scale-95"
            title="Imprimer / Sauvegarder en PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer / PDF</span>
          </button>
          <button
            onClick={handleDownloadText}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 transition-all cursor-pointer active:scale-95"
            title="Télécharger le fichier Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Exporter .md</span>
          </button>
        </div>
      </div>

      {/* Preamble if any */}
      {preamble && (
        <div className="text-slate-300 text-sm italic bg-slate-900/60 p-3.5 rounded-xl border border-slate-800">
          <Markdown>{preamble}</Markdown>
        </div>
      )}

      {/* Structured Cards */}
      <div className="space-y-3.5">
        {sections.map((sec, idx) => {
          const IconComp = sec.icon;

          if (sec.key === "full_document") {
            return (
              <div
                key={idx}
                className="mt-6 rounded-[18px] border border-purple-500/30 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl"
              >
                <div className="bg-purple-950/40 px-4 py-3 border-b border-purple-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-purple-200 font-semibold text-sm">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>DOCUMENT FORMEL COMPLET (Prêt à l'emploi)</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(sec.text);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="text-xs flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-900/50 hover:bg-purple-800/80 text-purple-200 transition-colors cursor-pointer border border-purple-500/40"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    Copier le texte du document
                  </button>
                </div>
                <div className="p-6 bg-slate-950/80 font-sans text-slate-200 text-sm leading-relaxed whitespace-pre-wrap select-text border-t border-slate-900">
                  <Markdown>{sec.text}</Markdown>
                </div>
              </div>
            );
          }

          if (sec.key === "action_plan") {
            const lines = sec.text.split("\n").filter((l) => l.trim().length > 0);

            return (
              <div
                key={idx}
                className="rounded-[18px] border border-amber-500/30 bg-slate-900/80 overflow-hidden shadow-lg hover:border-amber-500/50 transition-colors backdrop-blur-xl"
              >
                <div className="px-4 py-2.5 bg-amber-950/40 border-b border-amber-500/30 flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                  <IconComp className="w-4 h-4 text-amber-400" />
                  <span>{sec.tag}</span>
                </div>
                <div className="p-4 space-y-2.5">
                  {lines.map((line, lineIdx) => {
                    const isNumbered = /^\d+[\.\)]\s*/.test(line.trim());
                    const cleanText = line.replace(/^\d+[\.\)]\s*/, "").replace(/^[-*]\s*/, "");
                    const itemKey = `action_${idx}_${lineIdx}`;
                    const isChecked = !!checkedActions[itemKey];

                    if (!isNumbered && !line.startsWith("-") && !line.startsWith("*")) {
                      return (
                        <div key={lineIdx} className="text-xs text-slate-300 prose prose-invert max-w-none">
                          <Markdown>{line}</Markdown>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={lineIdx}
                        onClick={() => toggleAction(itemKey)}
                        className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                          isChecked
                            ? "bg-slate-900/60 border-slate-800 text-slate-500 line-through opacity-75"
                            : "bg-slate-950/70 border-slate-800 text-slate-200 hover:border-amber-500/40 hover:bg-slate-900/90"
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          <div
                            className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                              isChecked
                                ? "bg-amber-500 border-amber-500 text-slate-950"
                                : "border-slate-600 hover:border-amber-400"
                            }`}
                          >
                            {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                          </div>
                        </div>
                        <div className="text-xs leading-relaxed flex-1 prose prose-invert max-w-none prose-p:my-0">
                          <Markdown>{cleanText}</Markdown>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          }

          // Standard Section Box
          return (
            <div
              key={idx}
              className={`rounded-[18px] border ${sec.color} overflow-hidden shadow-lg backdrop-blur-xl transition-all`}
            >
              <div className="px-4 py-2.5 border-b border-inherit/40 flex items-center gap-2 font-bold text-xs uppercase tracking-wider">
                <IconComp className="w-4 h-4" />
                <span>{sec.tag}</span>
              </div>
              <div className="p-4 text-xs sm:text-sm text-slate-200 leading-relaxed prose prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-table:my-2 prose-th:bg-slate-800/80 prose-th:p-2 prose-td:p-2 prose-td:border-slate-800 prose-th:border-slate-800 prose-pre:bg-slate-950 prose-pre:text-slate-100">
                <Markdown>{sec.text}</Markdown>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
