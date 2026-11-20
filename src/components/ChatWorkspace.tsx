import React, { useState, useRef, useEffect } from "react";
import { ChatMessage, SpecialtyId } from "../types";
import { SPECIALTIES } from "../data/specialties";
import { FormattedOutput } from "./FormattedOutput";
import {
  Send,
  Sparkles,
  Bot,
  User,
  Trash2,
  Paperclip,
  RotateCcw,
  Briefcase,
  Cog,
  TrendingUp,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Boxes,
  Layers,
  ChevronDown
} from "lucide-react";

interface ChatWorkspaceProps {
  activeSpecialty: SpecialtyId | null;
  onSelectSpecialty: (specialty: SpecialtyId | null) => void;
}

const SPECIALTY_ICONS: Record<string, any> = {
  Briefcase,
  Cog,
  TrendingUp,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Boxes,
  Layers,
};

const INITIAL_GREETING: ChatMessage = {
  id: "welcome",
  role: "assistant",
  timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
  content: `🎯 OBJECTIF
Accompagner vos équipes opérationnelles, administratives, financières et managériales pour transformer tout défi métier en résultat immédiatement exploitable.

📋 SYNTHÈSE
Je suis **TOOLBOX AI PRO**, votre assistant expert combinant les compétences d'un Directeur des Opérations, Consultant Senior, Contrôleur de Gestion, Coordinateur Administratif, Expert Excel, Assistant RH/Contrats, Gestionnaire de Stock et Chef de Projet.

🔍 ANALYSE
Toute demande adressée fera l'objet d'une analyse rigoureuse : identification du besoin réel, détection des risques, opportunités d'optimisation et formulation d'un plan d'action chiffré.

✅ RECOMMANDATION
Sélectionnez une spécialité métier dans la barre supérieure ou posez directement votre question ci-dessous (analyse de tableau, calcul de stock, rédaction de contrat, diagnostic opérationnel).

🛠 PLAN D'ACTION
1. Renseignez votre problématique ou collez vos données - Responsable : Vous / Échéance : Immédiat / Livrable : Requête
2. Analyse experte & identification des risques - Responsable : TOOLBOX AI PRO / Échéance : < 3s / Livrable : Diagnostic
3. Validation et mise en oeuvre des recommandations - Responsable : Vos équipes / Échéance : Selon plan / Livrable : Résultat

⚠️ POINTS DE VIGILANCE
Veillez à fournir le contexte métier précis (volumes, contraintes, délais) pour obtenir des préconisations chiffrées au plus près de votre réalité opérationnelle.

📈 IMPACT ATTENDU
Gain de temps immédiat, suppression des risques d'erreur de gestion, conformité juridique et opérationnelle accrue.

⭐ CONSEIL EXPERT
Utilisez les modules dédiés en haut de page pour des calculs spécialisés en temps réel (Stocks Wilson/ROP, Générateur de Contrats, Analyseur de Données, Studio Excel).`
};

export const ChatWorkspace: React.FC<ChatWorkspaceProps> = ({
  activeSpecialty,
  onSelectSpecialty,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem("toolbox_chat_history");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return [INITIAL_GREETING];
  });

  const [inputPrompt, setInputPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    localStorage.setItem("toolbox_chat_history", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const activeSpecialtyMeta = SPECIALTIES.find((s) => s.id === activeSpecialty);

  const handleSendMessage = async (textToSend?: string) => {
    const messageContent = textToSend || inputPrompt;
    if (!messageContent.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageContent.trim(),
      timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      specialty: activeSpecialty || undefined,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt("");
    setLoading(true);

    try {
      const chatPayload = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatPayload,
          contextSpecialty: activeSpecialtyMeta?.title || "Assistant Métier Global",
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
        specialty: activeSpecialty || undefined,
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `⚠️ Erreur lors de l'exécution de la requête : ${err.message}\n\nVérifiez votre connexion ou les paramètres saisis.`,
        timestamp: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = () => {
    if (window.confirm("Voulez-vous réinitialiser l'historique de la conversation ?")) {
      setMessages([INITIAL_GREETING]);
      localStorage.removeItem("toolbox_chat_history");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] rounded-[18px] bg-[#1E293B]/80 border border-slate-700/60 shadow-2xl backdrop-blur-2xl overflow-hidden">
      {/* Top Chat Bar */}
      <div className="px-5 py-3.5 bg-[#0F172A]/90 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 via-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-violet-500/20">
            <Bot className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white tracking-tight">Consultation AI Décisionnelle</span>
              {activeSpecialtyMeta ? (
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${activeSpecialtyMeta.badgeColor}`}
                >
                  {activeSpecialtyMeta.shortTitle}
                </span>
              ) : (
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-violet-500/10 text-violet-300 border border-violet-500/30 font-bold uppercase tracking-wider">
                  Rôle Global (8 Métiers)
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {activeSpecialtyMeta
                ? activeSpecialtyMeta.roleDescription
                : "Analyse décisionnelle, contrats, gestion de parc & contrôle de gestion"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={clearHistory}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-400 hover:text-rose-400 text-xs border border-slate-700/80 transition-colors cursor-pointer"
            title="Effacer la conversation"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-[#0F172A]/40">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 sm:gap-4 max-w-4xl ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-1 shadow-md ${
                msg.role === "user"
                  ? "bg-gradient-to-tr from-blue-600 to-violet-600 text-white"
                  : "bg-slate-900 border border-slate-700 text-cyan-400 shadow-cyan-500/10"
              }`}
            >
              {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`flex-1 rounded-[18px] p-5 shadow-xl transition-all ${
                msg.role === "user"
                  ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-tr-xs"
                  : "bg-[#0F172A]/90 border border-slate-700/80 text-slate-100 rounded-tl-xs backdrop-blur-xl"
              }`}
            >
              <div className="flex items-center justify-between mb-2.5 text-[11px] opacity-70">
                <span className="font-bold tracking-wider uppercase">
                  {msg.role === "user" ? "Votre Demande" : "TOOLBOX AI PRO"}
                </span>
                <span className="font-mono">{msg.timestamp}</span>
              </div>

              {msg.role === "user" ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium">{msg.content}</p>
              ) : (
                <FormattedOutput content={msg.content} />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-4 rounded-[18px] bg-[#0F172A]/90 border border-slate-700/80 text-slate-300 text-xs flex items-center gap-3 backdrop-blur-xl shadow-xl">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping"></span>
              <span className="font-medium text-slate-200">
                Analyse métier en cours selon la méthodologie TOOLBOX AI PRO...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-5 py-2.5 bg-[#0F172A]/80 border-t border-slate-800/80 overflow-x-auto flex items-center gap-2 no-scrollbar">
        <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider shrink-0 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Suggestions :
        </span>
        {(activeSpecialtyMeta?.examples || SPECIALTIES[0].examples).map((ex, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(ex)}
            className="text-xs px-3.5 py-1.5 rounded-full bg-slate-800/90 hover:bg-violet-900/40 text-slate-300 hover:text-white border border-slate-700/80 hover:border-violet-500/50 whitespace-nowrap transition-all duration-200 cursor-pointer shrink-0 font-medium"
          >
            {ex}
          </button>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-4 bg-[#0F172A] border-t border-slate-800">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-end gap-3 bg-[#1E293B]/90 border border-slate-700/80 rounded-2xl p-2.5 focus-within:border-violet-500 focus-within:ring-2 focus-within:ring-violet-500/20 transition-all shadow-inner"
        >
          <textarea
            ref={textareaRef}
            rows={2}
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              activeSpecialtyMeta
                ? `Interroger l'expert en ${activeSpecialtyMeta.shortTitle}... (Entrée pour envoyer, Maj+Entrée pour saut de ligne)`
                : "Posez votre question opérationnelle, collez des chiffres ou demandez un document..."
            }
            className="flex-1 bg-transparent text-white text-xs sm:text-sm resize-none focus:outline-none placeholder:text-slate-500 px-3 py-1 font-medium"
          />

          <button
            type="submit"
            disabled={loading || !inputPrompt.trim()}
            className="p-3 rounded-xl bg-gradient-to-tr from-violet-600 via-blue-600 to-cyan-500 hover:opacity-90 text-white transition-all active:scale-95 disabled:opacity-40 shrink-0 cursor-pointer shadow-lg shadow-violet-500/20"
            title="Envoyer la demande"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
