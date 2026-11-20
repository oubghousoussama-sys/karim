import React, { useState, useMemo, useRef } from "react";
import * as XLSX from "xlsx";
import { Quote, QuoteItem, QuoteStatus, PFEquipment } from "../../types";
import { MONTH_LIST } from "../../data/mockFinanceData";
import { INITIAL_PF_EQUIPMENTS } from "../../data/mockPFData";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck,
  Calculator,
  Layers,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Table,
  Filter,
  Wrench,
  Package,
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { downloadQuotesExcelTemplate } from "../../utils/excelExport";

interface MassQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportQuotes: (quotes: Quote[], replaceAll?: boolean) => void;
  equipments: PFEquipment[];
}

interface ParsedPartRow {
  quoteNumber: string;
  partReference: string;
  description: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
  costPrice: number;
  totalCostPrice: number;
  c1Value: number;
  c1Percent: number;
}

interface ParsedQuoteRow {
  quoteNumber: string;
  title: string;
  clientName: string;
  customerAccount: string;
  pfNumber?: string;
  amountHT: number;
  costPriceHT: number;
  c1Value: number;
  c1Percent: number;
  tvaRate: number;
  amountTTC: number;
  status: QuoteStatus;
  billingMonth: string;
  issueDate: string;
  validityDate: string;
  notes: string;
  items: QuoteItem[];
  warnings: string[];
}

interface SheetSummary {
  name: string;
  index: number;
  rowCount: number;
  headerRowIdx: number;
  detectedType: "quotes" | "parts" | "other";
  scoreQuotes: number;
  scoreParts: number;
  columnNames: string[];
}

// Clean string for header matching
function normalizeHeader(h: any): string {
  return String(h || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

// Clean quote reference for cross-sheet joining
function cleanQuoteKey(num: any): string {
  return String(num || "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-_/.]/g, "");
}

// Robust financial number parser (handles "15 450,50 MAD", "15.450,50", "15,450.50", "(1200)", etc.)
function parseFinancialNumber(val: any): number {
  if (val === null || val === undefined || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;

  let str = String(val).trim();
  str = str.replace(/[\s\u00A0\u202F\u2007\u200B\uFEFF]/g, "");
  str = str.replace(/(mad|dh|dirham|eur|chf|usd|\$|€)/gi, "");

  let isNegative = false;
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1);
  } else if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1);
  }

  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  if (isNaN(num)) return 0;
  return isNegative ? -num : num;
}

// Excel date / string date parser
function parseDateValue(val: any, defaultDate = "2026-09-01"): string {
  if (!val) return defaultDate;
  if (typeof val === "number" && val > 20000 && val < 60000) {
    const jsDate = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(jsDate.getTime())) {
      return jsDate.toISOString().slice(0, 10);
    }
  }

  const s = String(val).trim();
  const matchIso = s.match(/202[0-9]-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])/);
  if (matchIso) return matchIso[0];

  const matchFr = s.match(/(0[1-9]|[12][0-9]|3[01])[/-](0[1-9]|1[0-2])[/-](202[0-9])/);
  if (matchFr) {
    return `${matchFr[3]}-${matchFr[2]}-${matchFr[1]}`;
  }

  return defaultDate;
}

// Billing month parser
function parseBillingMonth(val: any, issueDateStr?: string): string {
  if (val) {
    const s = String(val).trim();
    const match = s.match(/202[0-9]-(0[1-9]|1[0-2])/);
    if (match) return match[0];

    const lower = s.toLowerCase();
    if (lower.includes("jan")) return "2026-01";
    if (lower.includes("fev") || lower.includes("fév")) return "2026-02";
    if (lower.includes("mar")) return "2026-03";
    if (lower.includes("avr")) return "2026-04";
    if (lower.includes("mai")) return "2026-05";
    if (lower.includes("juin")) return "2026-06";
    if (lower.includes("juil")) return "2026-07";
    if (lower.includes("aou") || lower.includes("aoû")) return "2026-08";
    if (lower.includes("sep")) return "2026-09";
    if (lower.includes("oct")) return "2026-10";
    if (lower.includes("nov")) return "2026-11";
    if (lower.includes("dec") || lower.includes("déc")) return "2026-12";
  }

  if (issueDateStr && issueDateStr.length >= 7) {
    return issueDateStr.slice(0, 7);
  }

  return "2026-12";
}

// Quote Status parser
function parseStatus(val: any): QuoteStatus {
  if (!val) return "Envoyé";
  const s = String(val).toLowerCase().trim();
  if (
    s.includes("valide") ||
    s.includes("accept") ||
    s.includes("sign") ||
    s.includes("gagn") ||
    s.includes("commande")
  ) {
    return "Validé / Accepté";
  }
  if (s.includes("factur") || s.includes("paye") || s.includes("solde")) {
    return "Facturé";
  }
  if (s.includes("refus") || s.includes("perdu") || s.includes("annul") || s.includes("rejete")) {
    return "Refusé";
  }
  if (
    s.includes("brouillon") ||
    s.includes("draft") ||
    s.includes("cours") ||
    s.includes("prepar") ||
    s.includes("etude")
  ) {
    return "Brouillon";
  }
  return "Envoyé";
}

export const MassQuoteModal: React.FC<MassQuoteModalProps> = ({
  isOpen,
  onClose,
  onImportQuotes,
  equipments,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Workbook & sheet management
  const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [sheetsList, setSheetsList] = useState<SheetSummary[]>([]);
  const [quotesSheetName, setQuotesSheetName] = useState<string>("");
  const [partsSheetName, setPartsSheetName] = useState<string>("");

  // Parsed data
  const [parsedQuotes, setParsedQuotes] = useState<ParsedQuoteRow[]>([]);
  const [parsedParts, setParsedParts] = useState<ParsedPartRow[]>([]);
  const [activeTab, setActiveTab] = useState<"quotes" | "parts" | "diagnostic">("quotes");
  const [previewSearch, setPreviewSearch] = useState<string>("");
  const [importMode, setImportMode] = useState<"append" | "replace">("append");
  const [expandedQuoteIdx, setExpandedQuoteIdx] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Available PF Equipments
  const availableEquipments = useMemo<PFEquipment[]>(() => {
    try {
      const saved =
        localStorage.getItem("toolbox_pf_equipments") ||
        localStorage.getItem("toolbox_pf_equipments_v1");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return equipments && equipments.length > 0 ? equipments : INITIAL_PF_EQUIPMENTS;
  }, [equipments, isOpen]);

  const handleReset = () => {
    setFile(null);
    setFileName("");
    setWorkbook(null);
    setSheetsList([]);
    setQuotesSheetName("");
    setPartsSheetName("");
    setParsedQuotes([]);
    setParsedParts([]);
    setParseError(null);
    setPreviewSearch("");
    setExpandedQuoteIdx(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /**
   * Header detection algorithm for any raw matrix
   */
  const detectHeaderRow = (rawMatrix: any[][]) => {
    let bestHeaderRowIdx = 0;
    let maxHeaderScore = -1;
    const maxScanRows = Math.min(30, rawMatrix.length);

    for (let r = 0; r < maxScanRows; r++) {
      const row = rawMatrix[r] || [];
      let score = 0;
      row.forEach((cell) => {
        const norm = normalizeHeader(cell);
        if (!norm) return;
        if (
          norm.includes("devis") ||
          norm.includes("offre") ||
          norm.includes("commande") ||
          norm === "ref" ||
          norm === "reference" ||
          norm === "code"
        )
          score += 4;
        if (
          norm.includes("client") ||
          norm.includes("syndic") ||
          norm.includes("tiers") ||
          norm.includes("societe") ||
          norm.includes("compte")
        )
          score += 3;
        if (
          norm.includes("montant") ||
          norm.includes("prix") ||
          norm.includes("vente") ||
          norm.includes("cout") ||
          norm.includes("revient") ||
          norm.includes("total")
        )
          score += 4;
        if (
          norm.includes("article") ||
          norm.includes("piece") ||
          norm.includes("designation") ||
          norm.includes("intitule") ||
          norm.includes("prestation") ||
          norm.includes("qte") ||
          norm.includes("quantite")
        )
          score += 3;
        if (
          norm.includes("statut") ||
          norm.includes("mois") ||
          norm.includes("date") ||
          norm.includes("pf") ||
          norm.includes("appareil")
        )
          score += 2;
      });

      if (score > maxHeaderScore) {
        maxHeaderScore = score;
        bestHeaderRowIdx = r;
      }
    }

    return bestHeaderRowIdx;
  };

  /**
   * Analyze Workbook Sheets & Auto-assign Quotes & Parts Sheets
   */
  const analyzeAndProcessWorkbook = (
    wb: XLSX.WorkBook,
    preferredQuotesSheet?: string,
    preferredPartsSheet?: string
  ) => {
    const sheetSummaries: SheetSummary[] = [];

    wb.SheetNames.forEach((sheetName, index) => {
      const ws = wb.Sheets[sheetName];
      const rawMatrix: any[][] = ws
        ? XLSX.utils.sheet_to_json(ws, { header: 1, defval: "", raw: false })
        : [];
      const rowCount = rawMatrix.length;

      if (rowCount === 0) {
        sheetSummaries.push({
          name: sheetName,
          index,
          rowCount: 0,
          headerRowIdx: 0,
          detectedType: "other",
          scoreQuotes: 0,
          scoreParts: 0,
          columnNames: [],
        });
        return;
      }

      const headerRowIdx = detectHeaderRow(rawMatrix);
      const headerRow = (rawMatrix[headerRowIdx] || []).map((c) => String(c || "").trim());

      let scoreQuotes = 0;
      let scoreParts = 0;

      // Analyze sheet name
      const normSheetName = normalizeHeader(sheetName);
      if (
        normSheetName.includes("devis") ||
        normSheetName.includes("ligne") ||
        normSheetName.includes("entete") ||
        normSheetName.includes("offre")
      ) {
        scoreQuotes += 8;
      }
      if (
        normSheetName.includes("piece") ||
        normSheetName.includes("article") ||
        normSheetName.includes("detail") ||
        normSheetName.includes("composant")
      ) {
        scoreParts += 8;
      }

      // Analyze column names
      headerRow.forEach((col) => {
        const norm = normalizeHeader(col);
        if (!norm) return;

        // Quotes indicators
        if (
          norm.includes("client") ||
          norm.includes("syndic") ||
          norm.includes("tiers") ||
          norm.includes("compteclient")
        )
          scoreQuotes += 4;
        if (
          norm.includes("appareil") ||
          norm.includes("pf") ||
          norm.includes("installation")
        )
          scoreQuotes += 4;
        if (
          norm.includes("statut") ||
          norm.includes("moisfacturation") ||
          norm.includes("dateemission")
        )
          scoreQuotes += 3;

        // Parts indicators
        if (
          norm.includes("piece") ||
          norm.includes("refpiece") ||
          norm.includes("article") ||
          norm.includes("sku")
        )
          scoreParts += 5;
        if (
          norm.includes("qte") ||
          norm.includes("quantite") ||
          norm.includes("qtepiece") ||
          norm.includes("nombre")
        )
          scoreParts += 5;
        if (
          norm.includes("pu") ||
          norm.includes("prixunitaire") ||
          norm.includes("coutunitaire") ||
          norm.includes("pucout")
        )
          scoreParts += 4;
      });

      // Classification
      let detectedType: "quotes" | "parts" | "other" = "other";
      if (scoreQuotes >= scoreParts && scoreQuotes >= 4) {
        detectedType = "quotes";
      } else if (scoreParts > scoreQuotes && scoreParts >= 4) {
        detectedType = "parts";
      } else if (index === 0) {
        detectedType = "quotes"; // Default first sheet to quotes
      } else if (index === 1) {
        detectedType = "parts"; // Default second sheet to parts
      }

      sheetSummaries.push({
        name: sheetName,
        index,
        rowCount,
        headerRowIdx,
        detectedType,
        scoreQuotes,
        scoreParts,
        columnNames: headerRow.filter((c) => Boolean(c)),
      });
    });

    setSheetsList(sheetSummaries);

    // Determine target Quote sheet
    let targetQuotesSheet = preferredQuotesSheet;
    if (!targetQuotesSheet) {
      const bestQ = sheetSummaries.find((s) => s.detectedType === "quotes" && s.rowCount > 1);
      targetQuotesSheet = bestQ ? bestQ.name : sheetSummaries[0]?.name || "";
    }

    // Determine target Parts sheet
    let targetPartsSheet = preferredPartsSheet;
    if (!targetPartsSheet) {
      const bestP = sheetSummaries.find(
        (s) => s.name !== targetQuotesSheet && (s.detectedType === "parts" || s.scoreParts >= 4) && s.rowCount > 1
      );
      targetPartsSheet = bestP ? bestP.name : "";
      // If no explicit parts sheet, check if sheet 2 exists and has data
      if (!targetPartsSheet && sheetSummaries.length >= 2 && sheetSummaries[1].name !== targetQuotesSheet) {
        targetPartsSheet = sheetSummaries[1].name;
      }
    }

    setQuotesSheetName(targetQuotesSheet);
    setPartsSheetName(targetPartsSheet);

    // Run deep extraction & relational joining
    runExtraction(wb, targetQuotesSheet, targetPartsSheet, sheetSummaries);
  };

  /**
   * Deep Multi-Sheet Extraction & Relational Linking Engine
   */
  const runExtraction = (
    wb: XLSX.WorkBook,
    qSheetName: string,
    pSheetName: string,
    summaries: SheetSummary[]
  ) => {
    try {
      // 1. EXTRACT PARTS (SHEET 2 / DETAIL PIÈCES) IF PRESENT
      const partsByQuoteMap = new Map<string, ParsedPartRow[]>();
      const extractedPartsList: ParsedPartRow[] = [];

      if (pSheetName && wb.Sheets[pSheetName]) {
        const wsParts = wb.Sheets[pSheetName];
        const rawPartsMatrix: any[][] = XLSX.utils.sheet_to_json(wsParts, {
          header: 1,
          defval: "",
          raw: false,
        });

        if (rawPartsMatrix.length > 0) {
          const pHeaderIdx = detectHeaderRow(rawPartsMatrix);
          const pHeaderRow = (rawPartsMatrix[pHeaderIdx] || []).map((c) => String(c || "").trim());

          const pColMap = {
            quoteNumber: -1,
            partReference: -1,
            description: -1,
            quantity: -1,
            unitPriceHT: -1,
            totalHT: -1,
            costPrice: -1,
            totalCostPrice: -1,
          };

          pHeaderRow.forEach((h, cIdx) => {
            const norm = normalizeHeader(h);
            if (!norm) return;

            if (
              pColMap.quoteNumber === -1 &&
              (norm.includes("devis") ||
                norm.includes("offre") ||
                norm.includes("commande") ||
                norm === "ref" ||
                norm === "reference" ||
                norm === "code" ||
                norm === "affaire")
            ) {
              pColMap.quoteNumber = cIdx;
            } else if (
              pColMap.partReference === -1 &&
              (norm.includes("refpiece") ||
                norm.includes("codearticle") ||
                norm.includes("refarticle") ||
                norm.includes("sku") ||
                norm.includes("partnumber") ||
                (norm.includes("ref") && !norm.includes("devis")) ||
                norm.includes("codepiece"))
            ) {
              pColMap.partReference = cIdx;
            } else if (
              pColMap.description === -1 &&
              (norm.includes("designation") ||
                norm.includes("article") ||
                norm.includes("description") ||
                norm.includes("intitule") ||
                norm.includes("libelle") ||
                norm.includes("piece") ||
                norm.includes("composant") ||
                norm.includes("nom"))
            ) {
              pColMap.description = cIdx;
            } else if (
              pColMap.quantity === -1 &&
              (norm.includes("qte") ||
                norm.includes("quantite") ||
                norm.includes("qty") ||
                norm.includes("nombre") ||
                norm.includes("nb"))
            ) {
              pColMap.quantity = cIdx;
            } else if (
              pColMap.unitPriceHT === -1 &&
              (norm.includes("pu") ||
                norm.includes("prixunitaire") ||
                norm.includes("puvente") ||
                norm.includes("unitprice") ||
                (norm.includes("prix") && norm.includes("unitaire")))
            ) {
              pColMap.unitPriceHT = cIdx;
            } else if (
              pColMap.totalHT === -1 &&
              (norm.includes("totalht") ||
                norm.includes("totalvente") ||
                norm.includes("totalligne") ||
                norm.includes("montantht") ||
                (norm.includes("total") && !norm.includes("cout")))
            ) {
              pColMap.totalHT = cIdx;
            } else if (
              pColMap.costPrice === -1 &&
              (norm.includes("pucout") ||
                norm.includes("coutunitaire") ||
                norm.includes("prixrevientunitaire") ||
                norm.includes("coutrevient") ||
                norm.includes("unitcost") ||
                norm.includes("puachat"))
            ) {
              pColMap.costPrice = cIdx;
            } else if (
              pColMap.totalCostPrice === -1 &&
              (norm.includes("totalcout") ||
                norm.includes("couttotal") ||
                norm.includes("coutrevienttotal") ||
                norm.includes("depensesligne"))
            ) {
              pColMap.totalCostPrice = cIdx;
            }
          });

          // Fallbacks for parts columns
          if (pColMap.quantity === -1) {
            // Find numeric column with integers <= 1000
            for (let c = 0; c < pHeaderRow.length; c++) {
              if (c !== pColMap.quoteNumber && c !== pColMap.partReference && c !== pColMap.description) {
                const sampleVal = parseFinancialNumber(rawPartsMatrix[pHeaderIdx + 1]?.[c]);
                if (sampleVal > 0 && sampleVal <= 1000 && Number.isInteger(sampleVal)) {
                  pColMap.quantity = c;
                  break;
                }
              }
            }
          }

          const partsRows = rawPartsMatrix.slice(pHeaderIdx + 1);

          partsRows.forEach((r, idx) => {
            const isRowEmpty = r.every((c) => c === undefined || c === null || String(c).trim() === "");
            if (isRowEmpty) return;

            const qNum = pColMap.quoteNumber !== -1 ? String(r[pColMap.quoteNumber] || "").trim() : "";
            if (!qNum) return; // Skip rows without quote number

            const partRef = pColMap.partReference !== -1 ? String(r[pColMap.partReference] || "").trim() : `SCH-PART-${idx + 1}`;
            const desc = pColMap.description !== -1 ? String(r[pColMap.description] || "").trim() : `Pièce détachée ${partRef}`;
            const qty = pColMap.quantity !== -1 ? Math.max(1, parseFinancialNumber(r[pColMap.quantity])) : 1;

            let unitPrice = pColMap.unitPriceHT !== -1 ? parseFinancialNumber(r[pColMap.unitPriceHT]) : 0;
            let totalHT = pColMap.totalHT !== -1 ? parseFinancialNumber(r[pColMap.totalHT]) : 0;

            if (totalHT > 0 && unitPrice === 0) {
              unitPrice = totalHT / qty;
            } else if (unitPrice > 0 && totalHT === 0) {
              totalHT = unitPrice * qty;
            }

            let unitCost = pColMap.costPrice !== -1 ? parseFinancialNumber(r[pColMap.costPrice]) : 0;
            let totalCost = pColMap.totalCostPrice !== -1 ? parseFinancialNumber(r[pColMap.totalCostPrice]) : 0;

            if (totalCost > 0 && unitCost === 0) {
              unitCost = totalCost / qty;
            } else if (unitCost > 0 && totalCost === 0) {
              totalCost = unitCost * qty;
            } else if (unitCost === 0 && totalCost === 0 && totalHT > 0) {
              // Default Schindler standard cost (~50% margin)
              unitCost = Math.round(unitPrice * 0.5);
              totalCost = Math.round(totalHT * 0.5);
            }

            const c1Val = totalHT - totalCost;
            const c1Pct = totalHT > 0 ? (c1Val / totalHT) * 100 : 0;

            const partObj: ParsedPartRow = {
              quoteNumber: qNum,
              partReference: partRef,
              description: desc,
              quantity: qty,
              unitPriceHT: unitPrice,
              totalHT,
              costPrice: unitCost,
              totalCostPrice: totalCost,
              c1Value: c1Val,
              c1Percent: Math.round(c1Pct * 10) / 10,
            };

            extractedPartsList.push(partObj);

            const qKey = cleanQuoteKey(qNum);
            if (!partsByQuoteMap.has(qKey)) {
              partsByQuoteMap.set(qKey, []);
            }
            partsByQuoteMap.get(qKey)!.push(partObj);
          });
        }
      }

      setParsedParts(extractedPartsList);

      // 2. EXTRACT QUOTES (SHEET 1 / LIGNES DE DEVIS)
      if (!qSheetName || !wb.Sheets[qSheetName]) {
        throw new Error(`La feuille principale des devis "${qSheetName}" est introuvable.`);
      }

      const wsQuotes = wb.Sheets[qSheetName];
      const rawQuotesMatrix: any[][] = XLSX.utils.sheet_to_json(wsQuotes, {
        header: 1,
        defval: "",
        raw: false,
      });

      if (rawQuotesMatrix.length === 0) {
        throw new Error(`La feuille "${qSheetName}" ne contient aucune ligne.`);
      }

      const qHeaderIdx = detectHeaderRow(rawQuotesMatrix);
      const qHeaderRow = (rawQuotesMatrix[qHeaderIdx] || []).map((c) => String(c || "").trim());

      const qColMap = {
        quoteNumber: -1,
        title: -1,
        clientName: -1,
        customerAccount: -1,
        pfNumber: -1,
        amountHT: -1,
        costPriceHT: -1,
        tvaRate: -1,
        status: -1,
        billingMonth: -1,
        issueDate: -1,
        validityDate: -1,
        notes: -1,
      };

      qHeaderRow.forEach((h, cIdx) => {
        const norm = normalizeHeader(h);
        if (!norm) return;

        if (
          qColMap.quoteNumber === -1 &&
          (norm.includes("devis") ||
            norm.includes("numdevis") ||
            norm.includes("refdevis") ||
            norm.includes("offre") ||
            norm.includes("commande") ||
            norm === "ref" ||
            norm === "reference" ||
            norm === "code" ||
            norm === "affaire")
        ) {
          qColMap.quoteNumber = cIdx;
        } else if (
          qColMap.title === -1 &&
          (norm.includes("intitule") ||
            norm.includes("titre") ||
            norm.includes("objet") ||
            norm.includes("designation") ||
            norm.includes("prestation") ||
            norm.includes("travaux") ||
            norm.includes("description") ||
            norm.includes("libelle") ||
            norm.includes("article"))
        ) {
          qColMap.title = cIdx;
        } else if (
          qColMap.clientName === -1 &&
          (norm.includes("client") ||
            norm.includes("syndic") ||
            norm.includes("tiers") ||
            norm.includes("societe") ||
            norm.includes("destinataire") ||
            norm.includes("immeuble") ||
            norm.includes("residence") ||
            norm.includes("raisonsociale") ||
            norm === "nom")
        ) {
          qColMap.clientName = cIdx;
        } else if (
          qColMap.customerAccount === -1 &&
          (norm.includes("compteclient") ||
            norm.includes("customeraccount") ||
            norm.includes("codeclient") ||
            norm.includes("ncompte") ||
            norm.includes("compteerp") ||
            norm.includes("comptesap") ||
            norm.includes("compte"))
        ) {
          qColMap.customerAccount = cIdx;
        } else if (
          qColMap.pfNumber === -1 &&
          (norm.includes("pf") ||
            norm.includes("numpf") ||
            norm.includes("appareil") ||
            norm.includes("numappareil") ||
            norm.includes("equipement") ||
            norm.includes("installation") ||
            norm.includes("ascenseur") ||
            norm.includes("asset"))
        ) {
          qColMap.pfNumber = cIdx;
        } else if (
          qColMap.amountHT === -1 &&
          (norm.includes("montantht") ||
            norm.includes("prixht") ||
            norm.includes("venteht") ||
            norm.includes("totalht") ||
            norm.includes("caht") ||
            norm.includes("ca") ||
            norm.includes("prixvente") ||
            norm.includes("valeurht") ||
            norm.includes("montant") ||
            norm === "total" ||
            norm === "prix")
        ) {
          qColMap.amountHT = cIdx;
        } else if (
          qColMap.costPriceHT === -1 &&
          (norm.includes("coutrevient") ||
            norm.includes("coutrevientht") ||
            norm.includes("coutht") ||
            norm.includes("prixrevient") ||
            norm.includes("coutreel") ||
            norm.includes("depenses") ||
            norm.includes("achatht") ||
            norm.includes("cost") ||
            norm.includes("coutestime") ||
            norm.includes("chargeht") ||
            norm.includes("debours") ||
            norm === "cout")
        ) {
          qColMap.costPriceHT = cIdx;
        } else if (qColMap.tvaRate === -1 && (norm.includes("tva") || norm.includes("tauxtva"))) {
          qColMap.tvaRate = cIdx;
        } else if (qColMap.status === -1 && (norm.includes("statut") || norm.includes("status") || norm.includes("etat"))) {
          qColMap.status = cIdx;
        } else if (
          qColMap.billingMonth === -1 &&
          (norm.includes("moisfacturation") ||
            norm.includes("mois") ||
            norm.includes("echeance") ||
            norm.includes("periode") ||
            norm.includes("facturation") ||
            norm.includes("moisprevu"))
        ) {
          qColMap.billingMonth = cIdx;
        } else if (
          qColMap.issueDate === -1 &&
          (norm.includes("dateemission") ||
            norm.includes("datedevis") ||
            norm.includes("datecreation") ||
            norm.includes("dateenvoi") ||
            norm === "date")
        ) {
          qColMap.issueDate = cIdx;
        } else if (
          qColMap.validityDate === -1 &&
          (norm.includes("validite") || norm.includes("datevalidite") || norm.includes("echeance"))
        ) {
          qColMap.validityDate = cIdx;
        } else if (
          qColMap.notes === -1 &&
          (norm.includes("notes") ||
            norm.includes("remarques") ||
            norm.includes("conditions") ||
            norm.includes("commentaire") ||
            norm.includes("observation"))
        ) {
          qColMap.notes = cIdx;
        }
      });

      // Extract Quotes data rows
      const dataRows = rawQuotesMatrix.slice(qHeaderIdx + 1);
      const parsedQuoteList: ParsedQuoteRow[] = [];
      const processedQuoteKeys = new Set<string>();

      dataRows.forEach((row, rowIdx) => {
        const isCompletelyEmpty = row.every((c) => c === undefined || c === null || String(c).trim() === "");
        if (isCompletelyEmpty) return;

        const firstFew = row.slice(0, 5).map((c) => String(c || "").toLowerCase().trim()).join(" ");
        if (firstFew.includes("total general") || firstFew.includes("total général") || firstFew.includes("sous-total") || firstFew.includes("recapitulatif")) {
          return;
        }

        const warnings: string[] = [];

        // 1. Quote Number
        let quoteNum = qColMap.quoteNumber !== -1 ? String(row[qColMap.quoteNumber] || "").trim() : "";
        if (!quoteNum) {
          quoteNum = `DEV-2026-${String(1000 + rowIdx + 1).padStart(4, "0")}`;
          warnings.push("N° Devis généré automatiquement");
        }

        const qKey = cleanQuoteKey(quoteNum);
        processedQuoteKeys.add(qKey);

        // 2. Cross-link with parsed parts from Sheet 2
        const matchedParts = partsByQuoteMap.get(qKey) || [];
        const partsSumAmountHT = matchedParts.reduce((acc, p) => acc + p.totalHT, 0);
        const partsSumCostHT = matchedParts.reduce((acc, p) => acc + p.totalCostPrice, 0);

        // 3. Equipment PF Number
        let pfNum = qColMap.pfNumber !== -1 ? String(row[qColMap.pfNumber] || "").trim() : "";
        if (pfNum === "-" || pfNum.toLowerCase() === "global" || pfNum.toLowerCase() === "aucun") {
          pfNum = "";
        }

        // Cross match with PF equipments list
        let matchedEquipment: PFEquipment | undefined;
        if (pfNum) {
          const cleanDigits = pfNum.replace(/[^0-9]/g, "");
          matchedEquipment = availableEquipments.find((eq) => {
            const eqNum = (eq.pfNumber || "").toLowerCase();
            const eqDigits = eqNum.replace(/[^0-9]/g, "");
            return eqNum === pfNum.toLowerCase() || (cleanDigits.length >= 3 && eqDigits === cleanDigits);
          });
        }

        // 4. Client Name
        let clientName = qColMap.clientName !== -1 ? String(row[qColMap.clientName] || "").trim() : "";
        if (!clientName) {
          if (matchedEquipment) {
            clientName =
              matchedEquipment.customer ||
              (matchedEquipment.name.includes(" - ")
                ? matchedEquipment.name.split(" - ")[0].trim()
                : matchedEquipment.name);
          } else {
            clientName = "Client Schindler";
            warnings.push("Client non renseigné (Client Schindler assigné)");
          }
        }

        // 5. Customer Account
        let customerAccount = qColMap.customerAccount !== -1 ? String(row[qColMap.customerAccount] || "").trim() : "";
        if (!customerAccount && matchedEquipment) {
          customerAccount = matchedEquipment.customerAccount || "1001999";
        }
        if (!customerAccount) {
          customerAccount = "ACC-SCH";
        }

        // 6. Title / Description
        let title = qColMap.title !== -1 ? String(row[qColMap.title] || "").trim() : "";
        if (!title) {
          if (matchedParts.length > 0) {
            const partNames = matchedParts.slice(0, 2).map((p) => p.description).join(", ");
            title = `Fourniture & pose : ${partNames}${matchedParts.length > 2 ? ` (+${matchedParts.length - 2} autres)` : ""}`;
          } else if (pfNum) {
            title = `Prestation de maintenance sur appareil ${pfNum}`;
          } else {
            title = "Prestation de maintenance & réparation Schindler";
          }
        }

        // 7. Amount HT
        let amountHT = 0;
        const rawAmount = qColMap.amountHT !== -1 ? row[qColMap.amountHT] : undefined;
        if (rawAmount !== undefined && String(rawAmount).trim() !== "") {
          amountHT = Math.max(0, parseFinancialNumber(rawAmount));
        }
        // If amount HT is 0 but parts detail exist, take parts sum
        if (amountHT === 0 && partsSumAmountHT > 0) {
          amountHT = partsSumAmountHT;
        }

        // 8. Cost Price HT
        let costPriceHT = 0;
        const rawCost = qColMap.costPriceHT !== -1 ? row[qColMap.costPriceHT] : undefined;
        if (rawCost !== undefined && String(rawCost).trim() !== "") {
          costPriceHT = Math.max(0, parseFinancialNumber(rawCost));
        } else if (partsSumCostHT > 0) {
          costPriceHT = partsSumCostHT;
        } else {
          // Standard default 50% margin
          costPriceHT = Math.round(amountHT * 0.5);
        }

        // 9. TVA
        const rawTva = qColMap.tvaRate !== -1 ? row[qColMap.tvaRate] : 20;
        const tvaRate = Math.max(0, parseFinancialNumber(rawTva)) || 20;

        // 10. Margin C1
        const c1Value = amountHT - costPriceHT;
        const c1Percent = amountHT > 0 ? (c1Value / amountHT) * 100 : 0;
        const amountTTC = Math.round(amountHT * (1 + tvaRate / 100));

        // 11. Dates, Status & Notes
        const issueDate = qColMap.issueDate !== -1 ? parseDateValue(row[qColMap.issueDate], "2026-09-01") : "2026-09-01";
        const validityDate = qColMap.validityDate !== -1 ? parseDateValue(row[qColMap.validityDate], "2026-12-31") : "2026-12-31";
        const billingMonth = parseBillingMonth(qColMap.billingMonth !== -1 ? row[qColMap.billingMonth] : undefined, issueDate);
        const status = parseStatus(qColMap.status !== -1 ? row[qColMap.status] : "Envoyé");
        const notes = qColMap.notes !== -1 && row[qColMap.notes]
          ? String(row[qColMap.notes]).trim()
          : matchedParts.length > 0
          ? `${matchedParts.length} article(s) lié(s) depuis la feuille "${pSheetName}".`
          : `Importé depuis la feuille "${qSheetName}".`;

        // Transform matched parts into standard QuoteItem[]
        const items: QuoteItem[] =
          matchedParts.length > 0
            ? matchedParts.map((p, idx) => ({
                id: `item-${Date.now()}-${rowIdx}-${idx}`,
                partReference: p.partReference,
                description: p.description,
                quantity: p.quantity,
                unitPriceHT: p.unitPriceHT,
                totalHT: p.totalHT,
                costPrice: p.costPrice,
                totalCostPrice: p.totalCostPrice,
                c1Value: p.c1Value,
                c1Percent: p.c1Percent,
              }))
            : [
                {
                  id: `item-gen-${Date.now()}-${rowIdx}`,
                  partReference: pfNum ? `SCH-${pfNum.replace(/[^0-9]/g, "") || "GEN"}` : "SCH-FORFAIT",
                  description: title,
                  quantity: 1,
                  unitPriceHT: amountHT,
                  totalHT: amountHT,
                  costPrice: costPriceHT,
                  totalCostPrice: costPriceHT,
                  c1Value,
                  c1Percent: Math.round(c1Percent * 10) / 10,
                },
              ];

        parsedQuoteList.push({
          quoteNumber: quoteNum,
          title,
          clientName,
          customerAccount,
          pfNumber: pfNum || undefined,
          amountHT,
          costPriceHT,
          c1Value,
          c1Percent: Math.round(c1Percent * 10) / 10,
          tvaRate,
          amountTTC,
          status,
          billingMonth,
          issueDate,
          validityDate,
          notes,
          items,
          warnings,
        });
      });

      // 3. CHECK FOR ORPHAN PARTS IN SHEET 2 (quotes that only exist in parts sheet)
      partsByQuoteMap.forEach((partsList, qKey) => {
        if (!processedQuoteKeys.has(qKey)) {
          const firstPart = partsList[0];
          const totalAmount = partsList.reduce((acc, p) => acc + p.totalHT, 0);
          const totalCost = partsList.reduce((acc, p) => acc + p.totalCostPrice, 0);
          const c1Val = totalAmount - totalCost;
          const c1Pct = totalAmount > 0 ? (c1Val / totalAmount) * 100 : 0;
          const partNames = partsList.slice(0, 2).map((p) => p.description).join(", ");

          parsedQuoteList.push({
            quoteNumber: firstPart.quoteNumber,
            title: `Fourniture de pièces : ${partNames}${partsList.length > 2 ? ` (+${partsList.length - 2})` : ""}`,
            clientName: "Client Schindler (Extrait Pièces)",
            customerAccount: "ACC-PIECES",
            amountHT: totalAmount,
            costPriceHT: totalCost,
            c1Value: c1Val,
            c1Percent: Math.round(c1Pct * 10) / 10,
            tvaRate: 20,
            amountTTC: Math.round(totalAmount * 1.2),
            status: "Envoyé",
            billingMonth: "2026-10",
            issueDate: "2026-09-01",
            validityDate: "2026-12-31",
            notes: `Généré à partir de ${partsList.length} ligne(s) d'articles de la feuille "${pSheetName}".`,
            items: partsList.map((p, pIdx) => ({
              id: `item-orphan-${Date.now()}-${pIdx}`,
              partReference: p.partReference,
              description: p.description,
              quantity: p.quantity,
              unitPriceHT: p.unitPriceHT,
              totalHT: p.totalHT,
              costPrice: p.costPrice,
              totalCostPrice: p.totalCostPrice,
              c1Value: p.c1Value,
              c1Percent: p.c1Percent,
            })),
            warnings: ["Devis reconstitué à partir du détail des pièces"],
          });
        }
      });

      if (parsedQuoteList.length === 0) {
        throw new Error(`Aucune ligne de devis exploitable n'a été trouvée dans le classeur.`);
      }

      setParsedQuotes(parsedQuoteList);
    } catch (err: any) {
      console.error(err);
      setParseError(err.message || "Erreur lors de l'extraction des données.");
      setParsedQuotes([]);
      setParsedParts([]);
    }
  };

  /**
   * Process dropped or selected file
   */
  const processFile = (selectedFile: File) => {
    setFile(selectedFile);
    setFileName(selectedFile.name);
    setParseError(null);
    setIsParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });

        if (!wb.SheetNames || wb.SheetNames.length === 0) {
          throw new Error("Le fichier Excel ne contient aucune feuille de calcul.");
        }

        setWorkbook(wb);
        analyzeAndProcessWorkbook(wb);
      } catch (err: any) {
        console.error(err);
        setParseError(err.message || "Erreur lors de la lecture du fichier Excel.");
        setParsedQuotes([]);
        setParsedParts([]);
      } finally {
        setIsParsing(false);
      }
    };

    reader.onerror = () => {
      setParseError("Impossible de lire le fichier sélectionné.");
      setIsParsing(false);
    };

    reader.readAsArrayBuffer(selectedFile);
  };

  const handleQuotesSheetChange = (newQSheet: string) => {
    if (!workbook) return;
    setQuotesSheetName(newQSheet);
    analyzeAndProcessWorkbook(workbook, newQSheet, partsSheetName);
  };

  const handlePartsSheetChange = (newPSheet: string) => {
    if (!workbook) return;
    setPartsSheetName(newPSheet);
    analyzeAndProcessWorkbook(workbook, quotesSheetName, newPSheet);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      processFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (
        droppedFile.name.endsWith(".xlsx") ||
        droppedFile.name.endsWith(".xls") ||
        droppedFile.name.endsWith(".csv")
      ) {
        processFile(droppedFile);
      } else {
        setParseError("Format de fichier non supporté. Déposez un fichier Excel (.xlsx, .xls) ou .csv.");
      }
    }
  };

  const handleApplyImport = () => {
    if (parsedQuotes.length === 0) return;

    const quotesToSave: Quote[] = parsedQuotes.map((r, i) => ({
      id: `quot-xls-${Date.now()}-${i}`,
      quoteNumber: r.quoteNumber,
      title: r.title,
      clientName: r.clientName,
      customerAccount: r.customerAccount,
      pfNumber: r.pfNumber,
      issueDate: r.issueDate,
      validityDate: r.validityDate,
      amountHT: r.amountHT,
      costPriceHT: r.costPriceHT,
      c1Value: r.c1Value,
      c1Percent: r.c1Percent,
      tvaRate: r.tvaRate,
      amountTTC: r.amountTTC,
      estimatedCostHT: r.costPriceHT,
      estimatedMarginPct: r.c1Percent,
      status: r.status,
      billingMonth: r.billingMonth,
      billingSchedule: {
        [r.billingMonth]: r.amountHT,
      },
      notes: r.notes,
      items: r.items,
    }));

    onImportQuotes(quotesToSave, importMode === "replace");
    onClose();
  };

  // Preview filtering for quotes
  const filteredQuotes = useMemo(() => {
    if (!previewSearch.trim()) return parsedQuotes;
    const q = previewSearch.toLowerCase();
    return parsedQuotes.filter(
      (r) =>
        r.quoteNumber.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.clientName.toLowerCase().includes(q) ||
        (r.pfNumber && r.pfNumber.toLowerCase().includes(q)) ||
        r.status.toLowerCase().includes(q)
    );
  }, [parsedQuotes, previewSearch]);

  // Preview filtering for parts
  const filteredParts = useMemo(() => {
    if (!previewSearch.trim()) return parsedParts;
    const q = previewSearch.toLowerCase();
    return parsedParts.filter(
      (p) =>
        p.quoteNumber.toLowerCase().includes(q) ||
        p.partReference.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }, [parsedParts, previewSearch]);

  // KPI calculations
  const stats = useMemo(() => {
    const totalQuotesCount = parsedQuotes.length;
    const totalPartsCount = parsedParts.length;
    const totalCA = parsedQuotes.reduce((acc, r) => acc + r.amountHT, 0);
    const totalCost = parsedQuotes.reduce((acc, r) => acc + r.costPriceHT, 0);
    const totalC1 = totalCA - totalCost;
    const globalC1Pct = totalCA > 0 ? (totalC1 / totalCA) * 100 : 0;
    const quotesWithParts = parsedQuotes.filter((q) => q.items && q.items.length > 0).length;

    return {
      totalQuotesCount,
      totalPartsCount,
      totalCA,
      totalCost,
      totalC1,
      globalC1Pct,
      quotesWithParts,
    };
  }, [parsedQuotes, parsedParts]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-5 overflow-hidden animate-fade-in">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-6xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden text-xs">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/90 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Importation Massive Multi-Feuilles (Devis & Pièces Détachées)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 text-[10px] font-mono border border-emerald-800/60 font-semibold flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  Liaison 3 Feuilles Auto
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Lit automatiquement la feuille 1 (Lignes Devis), la feuille 2 (Détail des Pièces) et remplit l'intégralité des champs financiers et techniques.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={downloadQuotesExcelTemplate}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 font-semibold flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              title="Télécharger le modèle Excel 3 feuilles"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Modèle Excel 3 Feuilles</span>
              <span className="sm:hidden">Modèle .xlsx</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 custom-scrollbar">
          {/* STEP 1: UPLOAD ZONE (when no parsed data yet) */}
          {parsedQuotes.length === 0 && (
            <div className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-3.5 ${
                  isDragging
                    ? "border-emerald-500 bg-emerald-950/30 ring-4 ring-emerald-500/20 scale-[0.99]"
                    : "border-slate-700 hover:border-emerald-500/80 bg-slate-950/60 hover:bg-slate-950/90"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-16 h-16 rounded-2xl bg-emerald-950/90 border border-emerald-600/60 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-950/80">
                  <Upload className="w-8 h-8 animate-bounce-subtle" />
                </div>

                <div className="space-y-1 max-w-lg">
                  <p className="text-sm font-bold text-slate-100">
                    Déposez votre fichier Excel (Classeur à 1, 2 ou 3 feuilles)
                  </p>
                  <p className="text-xs text-slate-400">
                    Glissez-déposez ou parcourez votre fichier <strong className="text-emerald-400 font-mono">.xlsx</strong> avec vos lignes de devis et la nomenclature des pièces.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-2 text-[11px] text-slate-300 w-full max-w-xl">
                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-0.5">
                    <span className="font-bold text-emerald-300 flex items-center gap-1">
                      <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Feuille 1 : Devis
                    </span>
                    <p className="text-[10px] text-slate-400">N° Devis, Client, PF, Montant, Statut, Mois</p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-0.5">
                    <span className="font-bold text-teal-300 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-teal-400" />
                      Feuille 2 : Pièces
                    </span>
                    <p className="text-[10px] text-slate-400">N° Devis, Réf Pièce, Désignation, Qté, Prix, Coût</p>
                  </div>

                  <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-left space-y-0.5">
                    <span className="font-bold text-blue-300 flex items-center gap-1">
                      <Calculator className="w-3.5 h-3.5 text-blue-400" />
                      Jointure Auto
                    </span>
                    <p className="text-[10px] text-slate-400">Agrégation C1 (MAD) & Liaisons Master Data PF</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* PARSE ERROR BANNER */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-950/80 border border-rose-700 text-rose-200 flex items-start gap-3 shadow-lg">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1 flex-1">
                <p className="font-bold text-rose-100 text-xs">Erreur lors de la lecture du fichier :</p>
                <p className="text-xs text-rose-300">{parseError}</p>
              </div>
              <button
                type="button"
                onClick={() => setParseError(null)}
                className="text-rose-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          )}

          {/* STEP 2: PREVIEW & MULTI-SHEET CONTROLS */}
          {parsedQuotes.length > 0 && (
            <div className="space-y-4">
              {/* Sheet Assignment Bar (When multiple sheets exist) */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-slate-200 text-xs">
                      Affectation des Feuilles du Classeur Excel ({sheetsList.length} feuille(s) détectée(s))
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono truncate max-w-xs">
                    Fichier : {fileName}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Select Quotes Sheet */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-emerald-300 font-semibold text-xs flex items-center gap-1.5">
                        <FileCheck className="w-3.5 h-3.5" />
                        1. Feuille des Devis (En-têtes / Lignes principales) :
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                        {parsedQuotes.length} devis extraits
                      </span>
                    </div>

                    <select
                      value={quotesSheetName}
                      onChange={(e) => handleQuotesSheetChange(e.target.value)}
                      className="w-full bg-slate-950 border border-emerald-500/50 rounded-lg p-1.5 text-xs text-emerald-200 font-semibold focus:ring-1 focus:ring-emerald-500"
                    >
                      {sheetsList.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.rowCount} lignes {s.detectedType === "quotes" ? "— Recommandée" : ""})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Parts Sheet */}
                  <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-teal-300 font-semibold text-xs flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        2. Feuille Détail des Pièces & Articles :
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800">
                        {parsedParts.length} pièces reliées
                      </span>
                    </div>

                    <select
                      value={partsSheetName}
                      onChange={(e) => handlePartsSheetChange(e.target.value)}
                      className="w-full bg-slate-950 border border-teal-500/50 rounded-lg p-1.5 text-xs text-teal-200 font-semibold focus:ring-1 focus:ring-teal-500"
                    >
                      <option value="">-- Aucune feuille de pièces (Devis simples) --</option>
                      {sheetsList.map((s) => (
                        <option key={s.name} value={s.name}>
                          {s.name} ({s.rowCount} lignes {s.detectedType === "parts" ? "— Recommandée" : ""})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* KPI Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Total Devis Extraits
                  </span>
                  <div className="flex items-baseline gap-1.5 my-0.5">
                    <span className="text-xl font-bold text-white font-mono">
                      {stats.totalQuotesCount}
                    </span>
                    <span className="text-xs text-emerald-400 font-bold">devis prêts</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {stats.quotesWithParts} devis avec pièces détaillées
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/50 flex flex-col justify-between">
                  <span className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                    Total CA Vente HT
                  </span>
                  <p className="text-lg font-bold text-emerald-400 font-mono my-0.5">
                    {stats.totalCA.toLocaleString("fr-FR")} MAD
                  </p>
                  <span className="text-[10px] text-emerald-400/80">100% C1 Value</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-amber-600/50 flex flex-col justify-between">
                  <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider">
                    Coût de Revient HT
                  </span>
                  <p className="text-lg font-bold text-amber-400 font-mono my-0.5">
                    {stats.totalCost.toLocaleString("fr-FR")} MAD
                  </p>
                  <span className="text-[10px] text-amber-400/80">Charges d'exécution</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-teal-500/50 flex flex-col justify-between">
                  <span className="text-[10px] text-teal-300 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Marge C1 Globale</span>
                    <span className="text-[9px] px-1 rounded bg-teal-950 text-teal-300 font-mono font-bold border border-teal-700/50">
                      {stats.globalC1Pct.toFixed(1)} %
                    </span>
                  </span>
                  <p className="text-lg font-bold text-teal-400 font-mono my-0.5">
                    {stats.totalC1.toLocaleString("fr-FR")} MAD
                  </p>
                  <span className="text-[10px] text-teal-400/80">Marge brute totale</span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-blue-500/40 flex flex-col justify-between">
                  <span className="text-[10px] text-blue-300 font-bold uppercase tracking-wider">
                    Mode d'Importation
                  </span>
                  <div className="my-0.5">
                    <select
                      value={importMode}
                      onChange={(e) => setImportMode(e.target.value as any)}
                      className="w-full bg-slate-900 border border-blue-500/50 rounded-lg p-1 text-blue-200 font-semibold text-xs cursor-pointer"
                    >
                      <option value="append">Ajouter au portefeuille (Fusion)</option>
                      <option value="replace">Remplacer le portefeuille (Écraser)</option>
                    </select>
                  </div>
                  <span className="text-[10px] text-blue-400/80">
                    {importMode === "append" ? "Fusionne sans doublons" : "Remplace tous les devis"}
                  </span>
                </div>
              </div>

              {/* Sub-Navigation Tabs & Search */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/80 p-2 rounded-xl border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("quotes")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      activeTab === "quotes"
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <FileCheck className="w-3.5 h-3.5" />
                    <span>Devis Consolidés ({parsedQuotes.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("parts")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      activeTab === "parts"
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    <span>Détail Pièces ({parsedParts.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab("diagnostic")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      activeTab === "diagnostic"
                        ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                        : "bg-slate-900 text-slate-400 hover:text-white"
                    }`}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Diagnostic Feuilles</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-1 max-w-sm">
                  <div className="relative w-full">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={previewSearch}
                      onChange={(e) => setPreviewSearch(e.target.value)}
                      placeholder="Rechercher (N°, Client, Titre, PF, Réf...)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                    />
                    {previewSearch && (
                      <button
                        type="button"
                        onClick={() => setPreviewSearch("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold flex items-center gap-1 cursor-pointer text-xs whitespace-nowrap"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Changer</span>
                  </button>
                </div>
              </div>

              {/* TAB 1: CONSOLIDATED QUOTES TABLE */}
              {activeTab === "quotes" && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-inner max-h-[44vh] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-slate-300 font-semibold border-b border-slate-800 text-[11px] shadow-xs">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">N° Devis</th>
                        <th className="p-2.5">Intitulé de la Prestation</th>
                        <th className="p-2.5">Client / Syndic</th>
                        <th className="p-2.5">Compte</th>
                        <th className="p-2.5">N° PF</th>
                        <th className="p-2.5 text-center">Articles</th>
                        <th className="p-2.5 text-right">Montant HT</th>
                        <th className="p-2.5 text-right">Coût Revient</th>
                        <th className="p-2.5 text-center">Marge C1</th>
                        <th className="p-2.5">Statut</th>
                        <th className="p-2.5">Mois Facturation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredQuotes.map((row, idx) => {
                        const c1Color =
                          row.c1Percent >= 50
                            ? "text-emerald-400"
                            : row.c1Percent >= 35
                            ? "text-blue-400"
                            : row.c1Percent >= 20
                            ? "text-amber-400"
                            : "text-rose-400";

                        const isExpanded = expandedQuoteIdx === idx;

                        return (
                          <React.Fragment key={idx}>
                            <tr
                              className={`hover:bg-slate-900/50 transition-colors cursor-pointer ${
                                isExpanded ? "bg-slate-900/80" : ""
                              }`}
                              onClick={() => setExpandedQuoteIdx(isExpanded ? null : idx)}
                            >
                              <td className="p-2 text-slate-500 font-mono text-[10px]">
                                {idx + 1}
                              </td>
                              <td className="p-2 font-mono font-bold text-emerald-400 whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  {row.items && row.items.length > 0 ? (
                                    isExpanded ? (
                                      <ChevronDown className="w-3 h-3 text-emerald-400" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-slate-500" />
                                    )
                                  ) : null}
                                  <span>{row.quoteNumber}</span>
                                </div>
                              </td>
                              <td className="p-2 font-medium text-slate-200 max-w-[200px] truncate" title={row.title}>
                                {row.title}
                              </td>
                              <td className="p-2 text-slate-300 max-w-[140px] truncate" title={row.clientName}>
                                {row.clientName}
                              </td>
                              <td className="p-2 font-mono text-[10px] text-slate-400">
                                {row.customerAccount}
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                {row.pfNumber ? (
                                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800/50">
                                    {row.pfNumber}
                                  </span>
                                ) : (
                                  <span className="text-slate-500 text-[10px]">-</span>
                                )}
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-teal-950 text-teal-300 border border-teal-800 text-[10px] font-mono font-semibold">
                                  {row.items?.length || 1} pièce(s)
                                </span>
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                {row.amountHT.toLocaleString("fr-FR")} MAD
                              </td>
                              <td className="p-2 text-right font-mono text-amber-400 whitespace-nowrap">
                                {row.costPriceHT.toLocaleString("fr-FR")} MAD
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                <span className={`font-mono font-bold text-xs ${c1Color}`}>
                                  {row.c1Percent.toFixed(1)} %
                                </span>
                              </td>
                              <td className="p-2 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-medium">
                                  {row.status}
                                </span>
                              </td>
                              <td className="p-2 font-mono text-blue-300 whitespace-nowrap text-[11px]">
                                {row.billingMonth}
                              </td>
                            </tr>

                            {/* Expanded Breakdown of Quote Items */}
                            {isExpanded && row.items && row.items.length > 0 && (
                              <tr className="bg-slate-950/90">
                                <td colSpan={12} className="p-3 border-y border-emerald-500/30">
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                                        <Package className="w-3.5 h-3.5" />
                                        Nomenclature des pièces détachées ({row.quoteNumber}) :
                                      </span>
                                      <span className="text-slate-400 text-[10px]">
                                        Total ligne articles : {row.items.length} pièce(s)
                                      </span>
                                    </div>

                                    <table className="w-full text-[11px] bg-slate-900 rounded-lg overflow-hidden border border-slate-800">
                                      <thead className="bg-slate-800/80 text-slate-400">
                                        <tr>
                                          <th className="p-1.5 text-left">Réf Pièce</th>
                                          <th className="p-1.5 text-left">Désignation</th>
                                          <th className="p-1.5 text-center">Quantité</th>
                                          <th className="p-1.5 text-right">P.U. Vente HT</th>
                                          <th className="p-1.5 text-right">Total Vente HT</th>
                                          <th className="p-1.5 text-right">P.U. Coût</th>
                                          <th className="p-1.5 text-right">Total Coût</th>
                                          <th className="p-1.5 text-center">Marge C1</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800">
                                        {row.items.map((it, iIdx) => (
                                          <tr key={iIdx} className="hover:bg-slate-800/40">
                                            <td className="p-1.5 font-mono text-emerald-400">
                                              {it.partReference || "-"}
                                            </td>
                                            <td className="p-1.5 text-slate-200">{it.description}</td>
                                            <td className="p-1.5 text-center font-mono font-bold">
                                              {it.quantity}
                                            </td>
                                            <td className="p-1.5 text-right font-mono">
                                              {it.unitPriceHT.toLocaleString("fr-FR")} MAD
                                            </td>
                                            <td className="p-1.5 text-right font-mono font-bold text-emerald-400">
                                              {it.totalHT.toLocaleString("fr-FR")} MAD
                                            </td>
                                            <td className="p-1.5 text-right font-mono text-amber-400">
                                              {(it.costPrice || 0).toLocaleString("fr-FR")} MAD
                                            </td>
                                            <td className="p-1.5 text-right font-mono font-bold text-amber-400">
                                              {(it.totalCostPrice || 0).toLocaleString("fr-FR")} MAD
                                            </td>
                                            <td className="p-1.5 text-center font-mono font-bold text-teal-400">
                                              {it.c1Percent !== undefined
                                                ? `${it.c1Percent.toFixed(1)} %`
                                                : "-"}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 2: DETAILED PARTS TABLE */}
              {activeTab === "parts" && (
                <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950 shadow-inner max-h-[44vh] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-900 text-slate-300 font-semibold border-b border-slate-800 text-[11px]">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">N° Devis Associé</th>
                        <th className="p-2.5">Réf Pièce</th>
                        <th className="p-2.5">Désignation / Article</th>
                        <th className="p-2.5 text-center">Quantité</th>
                        <th className="p-2.5 text-right">P.U. Vente HT</th>
                        <th className="p-2.5 text-right">Total Vente HT</th>
                        <th className="p-2.5 text-right">P.U. Coût HT</th>
                        <th className="p-2.5 text-right">Total Coût HT</th>
                        <th className="p-2.5 text-center">Marge C1</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-300">
                      {filteredParts.map((p, pIdx) => (
                        <tr key={pIdx} className="hover:bg-slate-900/50">
                          <td className="p-2 text-slate-500 font-mono text-[10px]">{pIdx + 1}</td>
                          <td className="p-2 font-mono font-bold text-emerald-400">
                            {p.quoteNumber}
                          </td>
                          <td className="p-2 font-mono text-indigo-300">{p.partReference}</td>
                          <td className="p-2 font-medium text-slate-200 max-w-[250px] truncate" title={p.description}>
                            {p.description}
                          </td>
                          <td className="p-2 text-center font-mono font-bold">{p.quantity}</td>
                          <td className="p-2 text-right font-mono">
                            {p.unitPriceHT.toLocaleString("fr-FR")} MAD
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-emerald-400">
                            {p.totalHT.toLocaleString("fr-FR")} MAD
                          </td>
                          <td className="p-2 text-right font-mono text-amber-400">
                            {p.costPrice.toLocaleString("fr-FR")} MAD
                          </td>
                          <td className="p-2 text-right font-mono font-bold text-amber-400">
                            {p.totalCostPrice.toLocaleString("fr-FR")} MAD
                          </td>
                          <td className="p-2 text-center font-mono font-bold text-teal-400">
                            {p.c1Percent.toFixed(1)} %
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* TAB 3: DIAGNOSTIC & COLUMN MAPPING */}
              {activeTab === "diagnostic" && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                  <h4 className="font-bold text-slate-100 text-xs flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Structure Détectée du Classeur Excel :
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {sheetsList.map((s, idx) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-200">{s.name}</span>
                          <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono">
                            Feuille #{idx + 1}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-400 space-y-1">
                          <p>Total lignes : <strong className="text-white">{s.rowCount}</strong></p>
                          <p>Ligne en-tête : <strong className="text-emerald-400">Ligne {s.headerRowIdx + 1}</strong></p>
                          <p>Classification : <strong className="text-teal-400">{s.detectedType}</strong></p>
                        </div>

                        <div className="pt-2 border-t border-slate-800">
                          <span className="text-[10px] text-slate-500 font-bold uppercase block mb-1">
                            Colonnes lues ({s.columnNames.length}) :
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto custom-scrollbar">
                            {s.columnNames.map((c, cIdx) => (
                              <span key={cIdx} className="px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 text-[10px] border border-slate-800">
                                {c}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t border-slate-800 shrink-0 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {parsedQuotes.length > 0 && (
              <span className="text-slate-400 text-xs hidden sm:inline">
                Mode : <strong className="text-white">{importMode === "append" ? "Ajout / Fusion sans doublons" : "Remplacement Total"}</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer text-xs transition-colors"
            >
              Annuler
            </button>

            {parsedQuotes.length > 0 && (
              <button
                type="button"
                onClick={handleApplyImport}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 flex items-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  Importer les {parsedQuotes.length} Devis ({stats.totalPartsCount} pièces liées)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
