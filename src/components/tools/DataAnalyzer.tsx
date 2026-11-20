import React, { useState, useRef } from "react";
import { FormattedOutput } from "../FormattedOutput";
import { exportToExcel, readExcelFile } from "../../utils/excelExport";
import {
  FileSpreadsheet,
  Upload,
  Sparkles,
  BarChart3,
  Table as TableIcon,
  RotateCcw,
  TrendingUp,
  AlertTriangle,
  FileText,
  Download,
  Trash2
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  LineChart,
  Line
} from "recharts";

const SAMPLE_DATASETS = [
  {
    name: "Performance Ventes & Marges par Région",
    goal: "Identifier les anomalies de marge brute et les zones en sous-performance commerciale",
    csv: `Region,Mois,Chiffre_Affaires_EUR,Cout_Revient_EUR,Marge_Brute_Pct,Nb_Commandes,Taux_Retour_Pct
Nord,Janvier,125000,87500,30.0,420,2.1
Nord,Fevrier,118000,84960,28.0,390,2.4
Nord,Mars,142000,96560,32.0,460,1.8
Sud,Janvier,95000,74100,22.0,310,4.8
Sud,Fevrier,92000,73600,20.0,295,5.2
Sud,Mars,88000,72160,18.0,280,6.1
Est,Janvier,110000,74800,32.0,380,1.9
Est,Fevrier,115000,77050,33.0,395,1.7
Est,Mars,130000,85800,34.0,440,1.5
Ouest,Janvier,85000,61200,28.0,290,3.1
Ouest,Fevrier,89000,63190,29.0,305,2.9
Ouest,Mars,98000,68600,30.0,330,2.6`
  },
  {
    name: "Délais Logistiques & Taux de Service Fournisseurs",
    goal: "Détecter les dérives de délais de livraison (OTIF) et les pénalités associées",
    csv: `Fournisseur,Categorie,Nb_Livraisons,Delai_Moyen_Jours,Taux_Conformite_Pct,Cout_Achat_Total_kEUR,Taux_Retard_Pct
MecaTech SAS,Pieces Mecaniques,45,14.2,96.5,280,3.5
PlastiForm Group,Emballages,120,4.8,98.2,145,1.8
ElecSys International,Electronique,32,24.5,78.0,410,22.0
ChimiePro SARL,Solvants,60,7.1,94.0,95,6.0
LogiTrans Express,Transport,210,2.2,91.5,180,8.5`
  },
  {
    name: "Suivi Budgétaire & Dépenses Frais Généraux",
    goal: "Auditer les dépassements budgétaires par pôle et préconiser un plan d'économies",
    csv: `Poste_Depense,Departement,Budget_Prevu_EUR,Depenses_Reelles_EUR,Ecart_EUR,Ecart_Pct,Responsable
Licences Logiciels,DSI,45000,62500,17500,38.9,Marc D.
Deplacements & Missions,Commercial,30000,41200,11200,37.3,Sophie V.
Fournitures Bureau,Admin,8000,6400,-1600,-20.0,Claire L.
Prestations Conseil,Direction,50000,53000,3000,6.0,Alexandre B.
Recrutement & Jobboards,RH,25000,34800,9800,39.2,Nathalie G.`
  },
  {
    name: "Parc Équipements PF, 11 Visites, CPSI & NC < 100j",
    goal: "Détecter les retards d'inspection (11 visites + CPSI) et les Non-Conformités proches ou au-delà du seuil critique des 100 jours",
    csv: `N_Appareil_PF,Project_ID,Customer_Account,Nom_Appareil,Ville,Technicien,Visites_Faites_Sur_11,Visite_CPSI,Nb_NC_Ouvertes,Jours_Restants_NC_100j
PF-78012,PRJ-9042,ACC-4491,Tour Horizon Defense A,Paris,Karim Bennani,8,Non,1,17
PF-78015,PRJ-9042,ACC-4491,Tour Horizon Defense B,Paris,Karim Bennani,7,Non,1,-6
PF-84022,PRJ-8110,ACC-1904,CC Confluence Escalator Nord,Lyon,Thomas Moreau,9,Oui,0,100
PF-84023,PRJ-8110,ACC-1904,CC Confluence Escalator Sud,Lyon,Thomas Moreau,8,Non,1,73
PF-91304,PRJ-7250,ACC-8832,Hopital Timone Brancard,Marseille,Julien Faure,10,Non,1,39
PF-65219,PRJ-5401,ACC-3120,Campus Bordeaux Chimie,Bordeaux,Alexandre Martin,6,Non,1,-6
PF-54190,PRJ-6320,ACC-5521,Siege Banque Panoramique,Lille,Lucas Lefebvre,8,Non,0,100
PF-54191,PRJ-6320,ACC-5521,Siege Banque Parking,Lille,Lucas Lefebvre,11,Oui,0,100`
  }
];

export const DataAnalyzer: React.FC = () => {
  const [csvText, setCsvText] = useState(SAMPLE_DATASETS[0].csv);
  const [analysisGoal, setAnalysisGoal] = useState(SAMPLE_DATASETS[0].goal);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);

  // Parse CSV for table and chart
  const parseCSV = (text: string) => {
    const lines = text.trim().split("\n").filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [], chartData: [] };

    // Determine separator
    const sep = lines[0].includes(";") ? ";" : ",";
    const headers = lines[0].split(sep).map((h) => h.trim().replace(/^["']|["']$/g, ""));
    const rows = lines.slice(1).map((line) => {
      const vals = line.split(sep).map((v) => v.trim().replace(/^["']|["']$/g, ""));
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        const val = vals[i] || "";
        const num = Number(val.replace(",", "."));
        obj[h] = !isNaN(num) && val !== "" ? num : val;
      });
      return obj;
    });

    return { headers, rows, chartData: rows };
  };

  const parsed = parseCSV(csvText);

  // Identify numeric keys for plotting
  const numericKeys = parsed.headers.filter((h) => {
    return parsed.rows.some((r) => typeof r[h] === "number");
  });
  const labelKey = parsed.headers.find((h) => typeof parsed.rows[0]?.[h] === "string") || parsed.headers[0];
  const primaryMetric = numericKeys[0] || "";
  const secondaryMetric = numericKeys[1] || "";

  const analyzerExcelInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it's an Excel file or CSV
    const isExcel =
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls") ||
      file.name.endsWith(".xlsm") ||
      file.name.endsWith(".xlsb");
    if (isExcel) {
      try {
        const parsedData: any = await readExcelFile(file);
        const rows = Array.isArray(parsedData) ? parsedData : parsedData?.primaryRows || [];
        if (rows.length > 0) {
          const headers = Object.keys(rows[0]);
          const csvLines = [
            headers.join(";"),
            ...rows.map((r: any) =>
              headers.map((h) => (r[h] !== undefined && r[h] !== null ? String(r[h]) : "")).join(";")
            ),
          ];
          setCsvText(csvLines.join("\n"));
        } else {
          alert("Le fichier Excel ne contient aucune ligne de données.");
        }
      } catch (err: any) {
        alert(`Erreur de lecture Excel : ${err.message}`);
      } finally {
        if (analyzerExcelInputRef.current) analyzerExcelInputRef.current.value = "";
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (content) {
          setCsvText(content);
        }
        if (analyzerExcelInputRef.current) analyzerExcelInputRef.current.value = "";
      };
      reader.readAsText(file);
    }
  };

  const handleExportDataExcel = () => {
    if (parsed.rows.length === 0) return;
    exportToExcel(
      [{ sheetName: "Données Analyste", data: parsed.rows }],
      `Analyse_Donnees_${new Date().toISOString().slice(0, 10)}.xlsx`
    );
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/gemini/analyze-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          datasetText: csvText,
          goal: analysisGoal,
          headers: parsed.headers,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAnalysisResult(data.text);
    } catch (err: any) {
      setAnalysisResult(`⚠️ Erreur d'analyse : ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sample Loaders */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
        <p className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center gap-2">
          <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
          <span>Charger un jeu de données d'exemple :</span>
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {SAMPLE_DATASETS.map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setCsvText(sample.csv);
                setAnalysisGoal(sample.goal);
              }}
              className="p-2.5 text-left rounded-lg bg-slate-950/70 border border-slate-800 hover:border-teal-500/40 hover:bg-slate-800/40 transition-all text-xs group cursor-pointer"
            >
              <p className="font-semibold text-slate-200 group-hover:text-teal-300 transition-colors">
                {sample.name}
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-0.5">{sample.goal}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Input / Upload area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5 text-teal-400" />
              Données Tabulaires (Excel .xlsx, .xls ou CSV)
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (analyzerExcelInputRef.current) {
                    analyzerExcelInputRef.current.value = "";
                    analyzerExcelInputRef.current.click();
                  }
                }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs cursor-pointer transition-colors border border-slate-700"
                title="Importer des données depuis un fichier Excel ou CSV"
              >
                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                <span>Importer Excel / CSV</span>
              </button>
              <input
                ref={analyzerExcelInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                onChange={handleFileUpload}
                className="hidden"
              />
              {parsed.rows.length > 0 && (
                <button
                  type="button"
                  onClick={handleExportDataExcel}
                  className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs border border-emerald-500/30 cursor-pointer"
                  title="Exporter ce tableau sous Excel"
                >
                  <Download className="w-3 h-3" />
                  <span>Exporter Excel</span>
                </button>
              )}
              {csvText.trim() && (
                <button
                  type="button"
                  onClick={() => setCsvText("")}
                  className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                  title="Effacer les données"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <textarea
            rows={7}
            value={csvText}
            onChange={(e) => setCsvText(e.target.value)}
            placeholder="Collez ici vos colonnes séparées par des virgules ou points-virgules..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 font-mono text-xs focus:border-teal-500 focus:outline-none"
          />
        </div>

        <div className="space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-teal-400" />
              Objectif d'Analyse Métier
            </label>
            <textarea
              rows={4}
              value={analysisGoal}
              onChange={(e) => setAnalysisGoal(e.target.value)}
              placeholder="Que souhaitez-vous détecter ? (ex: anomalies de marge, rentabilité, dérives...)"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
            />
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={loading || !csvText.trim()}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loading ? "Diagnostic IA en cours..." : "Lancer le Diagnostic Expert & KPI"}</span>
          </button>
        </div>
      </div>

      {/* Live Data Preview & Interactive Chart */}
      {parsed.rows.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Table Preview */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col">
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
              <span className="font-semibold text-slate-300">
                Aperçu des Données ({parsed.rows.length} lignes)
              </span>
              <span className="text-slate-400 font-mono text-[11px]">
                {parsed.headers.length} colonnes détectées
              </span>
            </div>
            <div className="overflow-x-auto max-h-56 overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse font-mono">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 sticky top-0">
                    {parsed.headers.map((h, i) => (
                      <th key={i} className="p-2 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {parsed.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-slate-800/40">
                      {parsed.headers.map((h, cIdx) => (
                        <td key={cIdx} className="p-2 whitespace-nowrap text-slate-300">
                          {typeof row[h] === "number" ? row[h].toLocaleString("fr-FR") : row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Chart Visualization */}
          {primaryMetric && (
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-teal-400" />
                  Visualisation Graphique ({primaryMetric})
                </span>
                {secondaryMetric && (
                  <span className="text-[11px] text-emerald-400 font-mono">
                    + {secondaryMetric}
                  </span>
                )}
              </div>
              <div className="h-52 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={parsed.rows.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis
                      dataKey={labelKey}
                      stroke="#94a3b8"
                      fontSize={10}
                      tickLine={false}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis stroke="#94a3b8" fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey={primaryMetric} fill="#0d9488" radius={[4, 4, 0, 0]} name={primaryMetric} />
                    {secondaryMetric && (
                      <Bar dataKey={secondaryMetric} fill="#3b82f6" radius={[4, 4, 0, 0]} name={secondaryMetric} />
                    )}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analysis Output */}
      {analysisResult && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-teal-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-teal-400" />
              Diagnostic Analytique & Recommandations Stratégiques
            </h3>
          </div>
          <FormattedOutput content={analysisResult} />
        </div>
      )}
    </div>
  );
};
