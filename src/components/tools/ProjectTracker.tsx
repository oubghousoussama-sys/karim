import React, { useState, useRef } from "react";
import { ProjectTaskItem } from "../../types";
import { FormattedOutput } from "../FormattedOutput";
import { exportToExcel, readExcelFile } from "../../utils/excelExport";
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
  Download,
  Upload,
  FileSpreadsheet,
  Users,
  Calendar,
  RotateCcw
} from "lucide-react";

const INITIAL_TASKS: ProjectTaskItem[] = [
  {
    id: "1",
    title: "Cadrage du projet & Validation du budget d'investissement",
    priority: "Critique",
    status: "Terminé",
    responsible: "Directeur des Opérations",
    accountable: "Direction Générale",
    consulted: "Contrôleur de Gestion",
    informed: "Chefs d'équipe",
    deadline: "2026-09-15",
    deliverable: "Note de cadrage & Budget prévisionnel validé",
  },
  {
    id: "2",
    title: "Rédaction des SOP & formation des opérateurs logistiques",
    priority: "Haute",
    status: "En cours",
    responsible: "Coordinateur Administratif",
    accountable: "Responsable Logistique",
    consulted: "Superviseurs terrain",
    informed: "Service RH",
    deadline: "2026-09-30",
    deliverable: "Manuel de procédures SOP version 1.0",
  },
  {
    id: "3",
    title: "Négociation des SLA & signature des contrats transporteurs",
    priority: "Haute",
    status: "À faire",
    responsible: "Responsable Achats / Juridique",
    accountable: "Directeur des Opérations",
    consulted: "Transporteurs partenaires",
    informed: "Équipe Expéditions",
    deadline: "2026-10-10",
    deliverable: "Contrats B2B signés avec pénalités de retard",
  },
  {
    id: "4",
    title: "Mise en place du tableau de bord automatisé sous Excel 365",
    priority: "Moyenne",
    status: "À faire",
    responsible: "Expert Excel & Contrôleur",
    accountable: "DAF",
    consulted: "Utilisateurs métiers",
    informed: "Direction",
    deadline: "2026-10-20",
    deliverable: "Fichier de reporting consolidé PowerQuery",
  }
];

export const ProjectTracker: React.FC = () => {
  const [tasks, setTasks] = useState<ProjectTaskItem[]>(INITIAL_TASKS);
  const [aiGoal, setAiGoal] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiBreakdownResult, setAiBreakdownResult] = useState<string | null>(null);

  const [newTask, setNewTask] = useState<Partial<ProjectTaskItem>>({
    title: "",
    priority: "Haute",
    status: "À faire",
    responsible: "",
    accountable: "",
    consulted: "",
    informed: "",
    deadline: "",
    deliverable: "",
  });
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    const task: ProjectTaskItem = {
      id: Date.now().toString(),
      title: newTask.title || "Nouvelle Tâche",
      priority: (newTask.priority as any) || "Moyenne",
      status: (newTask.status as any) || "À faire",
      responsible: newTask.responsible || "À assigner",
      accountable: newTask.accountable || "Manager",
      consulted: newTask.consulted || "-",
      informed: newTask.informed || "Équipe",
      deadline: newTask.deadline || new Date().toISOString().slice(0, 10),
      deliverable: newTask.deliverable || "Livrable formalisé",
    };
    setTasks((prev) => [...prev, task]);
    setShowAddModal(false);
    setNewTask({
      title: "",
      priority: "Haute",
      status: "À faire",
      responsible: "",
      accountable: "",
      consulted: "",
      informed: "",
      deadline: "",
      deliverable: "",
    });
  };

  const handleStatusChange = (id: string, newStatus: ProjectTaskItem["status"]) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: newStatus } : t))
    );
  };

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleGenerateAiBreakdown = async () => {
    if (!aiGoal.trim()) return;
    setLoadingAi(true);
    setAiBreakdownResult(null);

    try {
      const res = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contextSpecialty: "Chef de Projet & Direction des Opérations",
          messages: [
            {
              role: "user",
              content: `Découpe le projet suivant en un plan d'action exhaustif et une matrice RACI rigoureuse :
PROJET : "${aiGoal}"

Tu dois impérativement fournir :
1. Découpage chronologique par phase et jalon critique (J0, J+15, J+30, J+60).
2. Matrice RACI complète sous forme de tableau Markdown (Tâche, Responsable [R], Approbateur [A], Consulté [C], Informé [I], Échéance, Livrable vérifiable).
3. Les facteurs clés de succès et les risques majeurs à mitiger.

Respecte scrupuleusement la structure standard TOOLBOX AI PRO (🎯 OBJECTIF, 📋 SYNTHÈSE, 🔍 ANALYSE, ✅ RECOMMANDATION, 🛠 PLAN D'ACTION, ⚠️ POINTS DE VIGILANCE, 📈 IMPACT ATTENDU, ⭐ CONSEIL EXPERT).`
            }
          ]
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiBreakdownResult(data.text);
    } catch (err: any) {
      setAiBreakdownResult(`⚠️ Erreur : ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const taskExcelInputRef = useRef<HTMLInputElement>(null);

  const exportTasksExcel = () => {
    const excelRows = tasks.map((t) => ({
      "Tâche": t.title,
      "Priorité": t.priority,
      "Statut": t.status,
      "R (Réalisateur)": t.responsible,
      "A (Approbateur)": t.accountable,
      "C (Consulté)": t.consulted,
      "I (Informé)": t.informed,
      "Échéance": t.deadline,
      "Livrable": t.deliverable,
    }));

    exportToExcel(
      [{ sheetName: "Matrice RACI", data: excelRows }],
      `Matrice_RACI_TOOLBOX_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  // Helper to extract fields flexibly regardless of column naming / casing / accents
  const getFlexibleField = (row: Record<string, any>, ...patterns: (string | RegExp)[]): any => {
    if (!row) return undefined;
    for (const p of patterns) {
      if (typeof p === "string" && row[p] !== undefined && row[p] !== null && String(row[p]).trim() !== "") {
        return row[p];
      }
    }
    const rowKeys = Object.keys(row);
    for (const p of patterns) {
      for (const key of rowKeys) {
        const val = row[key];
        if (val === undefined || val === null || String(val).trim() === "") continue;
        const cleanKey = key.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (typeof p === "string") {
          const cleanPattern = p.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          if (cleanKey === cleanPattern || cleanKey.includes(cleanPattern)) {
            return val;
          }
        } else if (p.test(key) || p.test(cleanKey)) {
          return val;
        }
      }
    }
    return undefined;
  };

  const handleImportTasksExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed: any = await readExcelFile(file);
      const rawRows: Record<string, any>[] = Array.isArray(parsed)
        ? parsed
        : parsed?.primaryRows || [];

      const rows = rawRows.filter((r) => {
        if (!r || typeof r !== "object") return false;
        return Object.values(r).some((v) => v !== undefined && v !== null && String(v).trim() !== "");
      });

      if (!rows || rows.length === 0) {
        alert("Le fichier sélectionné est vide ou ne contient aucune ligne de données.");
        return;
      }

      const importedTasks: ProjectTaskItem[] = rows.map((row, idx) => {
        const title =
          getFlexibleField(row, "Tâche", "Tache", "Title", "Titre", "Nom", "Action", "Description") ||
          `Tâche ${idx + 1}`;
        const priority =
          getFlexibleField(row, "Priorité", "Priorite", "Priority", "Urgence", "Niveau") || "Moyenne";
        const status =
          getFlexibleField(row, "Statut", "Status", "Etat", "État", "Avancement") || "À faire";
        const responsible =
          getFlexibleField(row, "R (Réalisateur)", "R", "Responsable", "Réalisateur", "Realisateur", "Assigné", "Assigned") ||
          "À assigner";
        const accountable =
          getFlexibleField(row, "A (Approbateur)", "A", "Approbateur", "Validateur", "Manager", "Pilote") ||
          "Manager";
        const consulted =
          getFlexibleField(row, "C (Consulté)", "C", "Consulté", "Consulte", "Expert") || "-";
        const informed =
          getFlexibleField(row, "I (Informé)", "I", "Informé", "Informe", "Destinataire") || "Équipe";
        const deadline =
          getFlexibleField(row, "Échéance", "Echeance", "Deadline", "Date", "Fin", "Jalon") ||
          new Date().toISOString().slice(0, 10);
        const deliverable =
          getFlexibleField(row, "Livrable", "Deliverable", "Résultat", "Resultat", "Document") ||
          "Livrable formalisé";

        return {
          id: `task-imp-${Date.now()}-${idx}`,
          title: String(title).trim(),
          priority: (priority as any) || "Moyenne",
          status: (status as any) || "À faire",
          responsible: String(responsible).trim(),
          accountable: String(accountable).trim(),
          consulted: String(consulted).trim(),
          informed: String(informed).trim(),
          deadline: String(deadline).trim(),
          deliverable: String(deliverable).trim(),
        };
      });

      setTasks([...importedTasks, ...tasks]);
      alert(`${importedTasks.length} tâche(s) importée(s) avec succès dans le projet !`);
    } catch (err: any) {
      alert(`Erreur d'importation Excel : ${err.message || "Format de fichier non supporté"}`);
    } finally {
      if (taskExcelInputRef.current) taskExcelInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Quick AI Breakdown Assistant */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-indigo-500/30 shadow-xl space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-slate-100">
            Générateur de Rétroplanning & Matrice RACI par IA
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Entrez un objectif de projet, TOOLBOX AI PRO génère le plan d'action séquencé et les rôles RACI associés.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={aiGoal}
            onChange={(e) => setAiGoal(e.target.value)}
            placeholder="ex: Déploiement d'un nouvel ERP en 6 mois pour 80 utilisateurs..."
            className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={handleGenerateAiBreakdown}
            disabled={loadingAi || !aiGoal.trim()}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingAi ? "Découpage en cours..." : "Générer la Matrice & Jalons"}</span>
          </button>
        </div>
      </div>

      {/* AI Breakdown Result if any */}
      {aiBreakdownResult && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-indigo-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              Cadrage Projet & Matrice RACI Détaillée
            </h3>
          </div>
          <FormattedOutput content={aiBreakdownResult} />
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajouter une tâche</span>
          </button>

          <button
            onClick={exportTasksExcel}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs border border-emerald-500/40 font-semibold transition-colors cursor-pointer shadow-xs"
            title="Exporter le tableau RACI directement au format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Exporter Excel (.xlsx)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (taskExcelInputRef.current) {
                taskExcelInputRef.current.value = "";
                taskExcelInputRef.current.click();
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 font-semibold transition-colors cursor-pointer shadow-xs"
            title="Importer des tâches depuis un fichier Excel ou CSV (.xlsx, .xls, .csv)"
          >
            <Upload className="w-4 h-4 text-indigo-400" />
            <span>Importer Excel</span>
          </button>
          <input
            ref={taskExcelInputRef}
            type="file"
            accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleImportTasksExcel}
          />

          <button
            type="button"
            onClick={() => setShowPurgeModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs border border-rose-800/60 font-semibold transition-colors cursor-pointer"
            title="Purger l'ensemble de la matrice de projet"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Purger Tout</span>
          </button>

          <button
            onClick={() => setTasks(INITIAL_TASKS)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700/60 transition-colors cursor-pointer"
            title="Réinitialiser"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Démo</span>
          </button>
        </div>

        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            {tasks.filter((t) => t.status === "Terminé").length} terminées
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            {tasks.filter((t) => t.status === "En cours").length} en cours
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            {tasks.filter((t) => t.status === "À faire").length} à faire
          </span>
        </div>
      </div>

      {/* Task & RACI Table */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/80 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <th className="p-3">Tâche & Livrable</th>
                <th className="p-3 text-center">Priorité</th>
                <th className="p-3 text-center">Statut</th>
                <th className="p-3 text-cyan-300 font-bold">R (Réalise)</th>
                <th className="p-3 text-purple-300 font-bold">A (Valide)</th>
                <th className="p-3 text-amber-300">C (Consulté)</th>
                <th className="p-3 text-slate-400">I (Informé)</th>
                <th className="p-3">Échéance</th>
                <th className="p-3 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-3">
                    <div className="font-medium text-slate-100">{task.title}</div>
                    <div className="text-slate-400 text-[11px] mt-0.5 flex items-center gap-1">
                      <span className="text-indigo-400 font-mono">Livrable :</span> {task.deliverable}
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    {task.priority === "Critique" && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold text-[10px]">
                        Critique
                      </span>
                    )}
                    {task.priority === "Haute" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-medium text-[10px]">
                        Haute
                      </span>
                    )}
                    {task.priority === "Moyenne" && (
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]">
                        Moyenne
                      </span>
                    )}
                    {task.priority === "Basse" && (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px]">
                        Basse
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-center">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1 text-slate-200 text-xs focus:outline-none"
                    >
                      <option value="À faire">À faire</option>
                      <option value="En cours">En cours</option>
                      <option value="En attente">En attente</option>
                      <option value="Terminé">Terminé</option>
                    </select>
                  </td>
                  <td className="p-3 font-semibold text-cyan-300">{task.responsible}</td>
                  <td className="p-3 font-semibold text-purple-300">{task.accountable}</td>
                  <td className="p-3 text-amber-300/90">{task.consulted}</td>
                  <td className="p-3 text-slate-400">{task.informed}</td>
                  <td className="p-3 font-mono text-slate-300 whitespace-nowrap">{task.deadline}</td>
                  <td className="p-3 text-center">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Ajouter une tâche avec matrice RACI
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1 font-medium">Libellé de la tâche</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="ex: Recette fonctionnelle du module stock..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1 font-medium">Livrable attendu</label>
                <input
                  type="text"
                  required
                  value={newTask.deliverable}
                  onChange={(e) => setNewTask({ ...newTask, deliverable: e.target.value })}
                  placeholder="ex: Procès-verbal de recette signé sans réserve"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Priorité</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Critique">Critique</option>
                    <option value="Haute">Haute</option>
                    <option value="Moyenne">Moyenne</option>
                    <option value="Basse">Basse</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Échéance</label>
                  <input
                    type="date"
                    required
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-cyan-300 mb-1 font-semibold">R (Responsible - Réalise)</label>
                  <input
                    type="text"
                    required
                    value={newTask.responsible}
                    onChange={(e) => setNewTask({ ...newTask, responsible: e.target.value })}
                    placeholder="Nom ou poste"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-purple-300 mb-1 font-semibold">A (Accountable - Valide)</label>
                  <input
                    type="text"
                    required
                    value={newTask.accountable}
                    onChange={(e) => setNewTask({ ...newTask, accountable: e.target.value })}
                    placeholder="Manager / Décideur"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-amber-300 mb-1">C (Consulted - Consulté)</label>
                  <input
                    type="text"
                    value={newTask.consulted}
                    onChange={(e) => setNewTask({ ...newTask, consulted: e.target.value })}
                    placeholder="Experts / Partenaires"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">I (Informed - Informé)</label>
                  <input
                    type="text"
                    value={newTask.informed}
                    onChange={(e) => setNewTask({ ...newTask, informed: e.target.value })}
                    placeholder="Équipe / Direction"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs"
                >
                  Enregistrer la tâche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PURGE ALL CONFIRMATION */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-600/70 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Purger toutes les tâches du Projet ?</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Suppression de l'ensemble des {tasks.length} tâches RACI
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Voulez-vous supprimer toutes les tâches de la matrice RACI ? Vous pourrez charger le jeu de démo ou importer un fichier Excel (.xlsx) à tout moment.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setTasks([]);
                  setShowPurgeModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Purge</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
