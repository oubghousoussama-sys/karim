import { PFEquipment } from "../types";

// Helper to compute deadline (+100 days from detection date)
export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

//Today's date reference for calculations (2026-09-01)
export const CURRENT_DATE_STR = "2026-09-01";
const REF_DATE_MS = new Date(CURRENT_DATE_STR).getTime();

const daysElapsedCache = new Map<string, number>();

export function getDaysElapsed(detectedDate: string, refDateStr = CURRENT_DATE_STR): number {
  const key = `${detectedDate}|${refDateStr}`;
  const cached = daysElapsedCache.get(key);
  if (cached !== undefined) return cached;

  const d1 = new Date(detectedDate).getTime();
  const d2 = refDateStr === CURRENT_DATE_STR ? REF_DATE_MS : new Date(refDateStr).getTime();
  const diffTime = d2 - d1;
  const result = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
  if (daysElapsedCache.size > 5000) daysElapsedCache.clear();
  daysElapsedCache.set(key, result);
  return result;
}

export function getDaysRemaining(detectedDate: string, refDateStr = CURRENT_DATE_STR): number {
  const elapsed = getDaysElapsed(detectedDate, refDateStr);
  return 100 - elapsed;
}

const parseAndFormatCache = new Map<string, { formatted: string; isValid: boolean; isError: boolean }>();

// Comprehensive parser for Excel and user dates: preserves exact dates without shifting, returns "Erreur" on any invalid/corrupted date
export function parseAndFormatDate(val: string | number | undefined | null): { formatted: string; isValid: boolean; isError: boolean } {
  if (val === undefined || val === null) return { formatted: "", isValid: false, isError: false };
  const strVal = String(val).trim();
  if (strVal === "") return { formatted: "", isValid: false, isError: false };

  const cached = parseAndFormatCache.get(strVal);
  if (cached !== undefined) return cached;

  const saveAndReturn = (res: { formatted: string; isValid: boolean; isError: boolean }) => {
    if (parseAndFormatCache.size > 10000) parseAndFormatCache.clear();
    parseAndFormatCache.set(strVal, res);
    return res;
  };

  // Explicit error indicators from Excel or text (#VALUE!, #REF!, #N/A, #NAME?, NaN, Invalid Date, Erreur, etc.)
  if (
    strVal.startsWith("#") ||
    /^(erreur|error|invalide|invalid|nan|null|undefined|\?+)$/i.test(strVal)
  ) {
    return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
  }

  // Excel serial number (e.g. 46233, 46142, 46192, 46162, 46105)
  const num = Number(strVal);
  if (!isNaN(num)) {
    if (num <= 0 || num > 100000) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    // Convert serial date using UTC to avoid local timezone shifting
    const dateObj = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (isNaN(dateObj.getTime())) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    const y = dateObj.getUTCFullYear();
    const m = dateObj.getUTCMonth() + 1;
    const d = dateObj.getUTCDate();
    if (y < 1990 || y > 2100) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    return saveAndReturn({
      formatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
      isValid: true,
      isError: false,
    });
  }

  // Strip trailing time if present (e.g. " 00:00:00", " 14:30:00", "T00:00:00Z")
  const cleanStr = strVal.replace(/[ T]\d{1,2}:\d{2}(:\d{2})?.*$/, "").trim();

  // French format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = cleanStr.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmyMatch) {
    let d = parseInt(dmyMatch[1], 10);
    let m = parseInt(dmyMatch[2], 10);
    let y = parseInt(dmyMatch[3], 10);
    if (y < 100) y = y >= 50 ? 1900 + y : 2000 + y;

    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    const maxDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (d > maxDays) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    return saveAndReturn({
      formatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
      isValid: true,
      isError: false,
    });
  }

  // ISO format: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = cleanStr.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    const y = parseInt(isoMatch[1], 10);
    const m = parseInt(isoMatch[2], 10);
    const d = parseInt(isoMatch[3], 10);
    if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2100) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    const maxDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
    if (d > maxDays) {
      return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
    }
    return saveAndReturn({
      formatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
      isValid: true,
      isError: false,
    });
  }

  // French month names in text (e.g. "30 juillet 2026")
  const frenchMonthNames = [
    "janvier", "fevrier", "février", "mars", "avril", "mai", "juin",
    "juillet", "aout", "août", "septembre", "octobre", "novembre", "decembre", "décembre"
  ];
  const frTextMatch = cleanStr.match(/^(\d{1,2})\s+([a-zA-ZÀ-ÿ]+)\s+(\d{4})$/);
  if (frTextMatch) {
    const d = parseInt(frTextMatch[1], 10);
    const monthWord = frTextMatch[2].toLowerCase();
    const y = parseInt(frTextMatch[3], 10);
    const mIdx = frenchMonthNames.findIndex((w) => w === monthWord);
    if (mIdx !== -1) {
      const monthMap = [1, 2, 2, 3, 4, 5, 6, 7, 8, 8, 9, 10, 11, 12, 12];
      const m = monthMap[mIdx];
      const maxDays = new Date(Date.UTC(y, m, 0)).getUTCDate();
      if (d >= 1 && d <= maxDays && y >= 1990 && y <= 2100) {
        return saveAndReturn({
          formatted: `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`,
          isValid: true,
          isError: false,
        });
      }
    }
  }

  // Unrecognized string with characters -> flag as Erreur
  return saveAndReturn({ formatted: "Erreur", isValid: false, isError: true });
}

// Helper to format date cleanly: preserves exact date string or outputs "Erreur" if invalid
export function formatExcelDate(val: string | number | undefined | null): string {
  if (val === undefined || val === null || val === "") return "";
  const parsed = parseAndFormatDate(val);
  if (parsed.isError) return "Erreur";
  if (parsed.isValid) return parsed.formatted;
  return "";
}

export interface ParsedDateParts {
  isValid: boolean;
  isError: boolean;
  year?: number;
  month?: number; // 1 to 12
  day?: number;
  formatted?: string;
  dateObj?: Date;
}

const parseDatePartsCache = new Map<string, ParsedDateParts>();

export function parseDateParts(dateVal: string | number | undefined | null): ParsedDateParts {
  if (dateVal === undefined || dateVal === null || dateVal === "") {
    return { isValid: false, isError: false };
  }
  const strKey = String(dateVal);
  const cached = parseDatePartsCache.get(strKey);
  if (cached !== undefined) return cached;

  if (dateVal === "Erreur" || strKey.toLowerCase().includes("err")) {
    const errRes = { isValid: false, isError: true };
    parseDatePartsCache.set(strKey, errRes);
    return errRes;
  }
  const parsed = parseAndFormatDate(dateVal);
  if (parsed.isError || !parsed.isValid) {
    const errRes = { isValid: false, isError: true };
    parseDatePartsCache.set(strKey, errRes);
    return errRes;
  }
  const parts = parsed.formatted.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    const dateObj = new Date(year, month - 1, day);
    const res: ParsedDateParts = {
      isValid: true,
      isError: false,
      year,
      month,
      day,
      formatted: parsed.formatted,
      dateObj,
    };
    if (parseDatePartsCache.size > 10000) parseDatePartsCache.clear();
    parseDatePartsCache.set(strKey, res);
    return res;
  }
  return { isValid: false, isError: false };
}

// Check if CPSI is considered treated/done (only 2026 dates count as done)
export type CpsiCategory = "ELEVATOR" | "ESCALATOR" | "MOV_WALK" | "EXCLUDED";

const cpsiCategoryCache = new Map<string, CpsiCategory>();

export function getCpsiCategory(eq: { serviceObject?: string; serviceObjectGroup?: string; name?: string }): CpsiCategory {
  const key = `${eq.serviceObject || ""}|${eq.serviceObjectGroup || ""}|${eq.name || ""}`;
  const cached = cpsiCategoryCache.get(key);
  if (cached !== undefined) return cached;

  const text = key.toLowerCase();
  let res: CpsiCategory = "ELEVATOR";
  
  // Excluded categories requested: PLATFORM, DUMBWAITER, SLIROOF, MC
  if (
    text.includes("monte-charge") ||
    text.includes("monte charge") ||
    text.includes("monte-plat") ||
    text.includes("monte plat") ||
    text.includes("plateforme") ||
    text.includes("platform") ||
    text.includes("dumbwaiter") ||
    text.includes("sliroof") ||
    text.includes("monte-voiture") ||
    text.includes("porte automatique") ||
    /\bmc\b/.test(text)
  ) {
    res = "EXCLUDED";
  } else if (text.includes("escalier") || text.includes("escalator")) {
    res = "ESCALATOR";
  } else if (
    text.includes("trottoir") ||
    text.includes("moving walk") ||
    text.includes("mov. walk") ||
    text.includes("mov walk")
  ) {
    res = "MOV_WALK";
  }

  if (cpsiCategoryCache.size > 5000) cpsiCategoryCache.clear();
  cpsiCategoryCache.set(key, res);
  return res;
}

export function isCpsiEligible(eq: { serviceObject?: string; serviceObjectGroup?: string; name?: string }): boolean {
  return getCpsiCategory(eq) !== "EXCLUDED";
}

export function extractDateYear(dateVal: string | number | undefined | null): number | null {
  if (dateVal === undefined || dateVal === null || dateVal === "") return null;
  const parsed = parseAndFormatDate(dateVal);
  if (parsed.isError || !parsed.isValid) return null;
  const parts = parsed.formatted.split("/");
  if (parts.length === 3) {
    return parseInt(parts[2], 10);
  }
  return null;
}

export function isCpsiDoneIn2026(eq: PFEquipment): boolean {
  if (!isCpsiEligible(eq)) return false;
  if (eq.lastCpsiDate === "Erreur" || String(eq.lastCpsiDate).toLowerCase().includes("err")) return false;

  // 1. If explicit visit details CPSI date exists:
  const detailDate = eq.visitDetails?.cpsi?.date;
  if (detailDate) {
    const yr = extractDateYear(detailDate);
    if (yr === 2026) return true;
    if (yr && yr !== 2026) return false;
  }

  // 2. Check lastCpsiDate
  if (eq.lastCpsiDate) {
    const yr = extractDateYear(eq.lastCpsiDate);
    if (yr === 2026) return true;
  }

  return false;
}

export function checkIsCpsiTreated(dateVal: string | number | undefined | null, explicitDone: boolean = false): boolean {
  if (dateVal === "Erreur" || String(dateVal).toLowerCase().includes("err")) return false;
  if (dateVal) {
    const yr = extractDateYear(dateVal);
    if (yr === 2026) return true;
    if (yr && yr !== 2026) return false;
  }
  return explicitDone === true;
}

export function getForecastCpsiDate(eq: PFEquipment): string {
  const cat = getCpsiCategory(eq);
  if (cat === "EXCLUDED") return "N/A (Exclu CPSI)";

  // If equipment already has an explicit forecast date (from Excel import or input): preserve it exactly
  if (eq.forecastCpsiDate !== undefined && eq.forecastCpsiDate !== null && String(eq.forecastCpsiDate).trim() !== "") {
    const parsedForecast = parseAndFormatDate(eq.forecastCpsiDate);
    if (parsedForecast.isError) return "Erreur";
    if (parsedForecast.isValid) return parsedForecast.formatted;
    return String(eq.forecastCpsiDate).trim();
  }

  // If lastCpsiDate is "Erreur", the forecast is also "Erreur"
  if (eq.lastCpsiDate === "Erreur" || String(eq.lastCpsiDate).toLowerCase().includes("err")) {
    return "Erreur";
  }

  const dateVal = eq.visitDetails?.cpsi?.date || eq.lastCpsiDate;
  if (!dateVal || String(dateVal).trim() === "") {
    return "À planifier";
  }

  const parsed = parseAndFormatDate(dateVal);
  if (parsed.isError || !parsed.isValid) {
    return "Erreur";
  }

  // Periodicity: ESCALATOR & MOV_WALK = 2 years, ELEVATOR = 1 year
  const periodYears = (cat === "ESCALATOR" || cat === "MOV_WALK") ? 2 : 1;
  const [d, m, yStr] = parsed.formatted.split("/");
  const baseYear = parseInt(yStr, 10);
  const isDone2026 = isCpsiDoneIn2026(eq);

  let forecastYear: number;
  if (isDone2026) {
    forecastYear = 2026 + periodYears;
  } else {
    const targetYear = baseYear + periodYears;
    forecastYear = targetYear <= 2026 ? 2026 : targetYear;
  }

  // Exact same day and month, absolutely no shifting
  return `${d}/${m}/${forecastYear}`;
}

export const INITIAL_PF_EQUIPMENTS: PFEquipment[] = [
  {
    id: "pf-101",
    pfNumber: "PF-78012",
    projectId: "PRJ-9042",
    customerAccount: "ACC-4491",
    name: "Tour Horizon Défense - Ascenseur Principal A",
    lastCpsiDate: "46233", // 30/07/2026
    contractType: "Complet VIP",
    serviceObject: "Ascenseur Électrique 1000kg",
    street: "12 Avenue des Champs-Élysées",
    city: "Casablanca",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Karim Bennani",
    serviceLeader: "Sophie Renard",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: true,
      v9: false,
      v10: false,
      v11: false,
      cpsi: true, // Auto-checked because 2026 (46233)
    },
    visitDetails: {
      v1: { date: "2026-01-15", technician: "Karim Bennani", notes: "Contrôle parachute et machinerie OK" },
      v2: { date: "2026-02-12", technician: "Karim Bennani", notes: "Graissage câbles et guides OK" },
      v3: { date: "2026-03-18", technician: "Karim Bennani", notes: "Vérification serrures palières" },
      v4: { date: "2026-04-14", technician: "Karim Bennani", notes: "Test téléalarme et éclairage secours" },
      v5: { date: "2026-05-19", technician: "Karim Bennani", notes: "Contrôle frein et limiteur vitesse" },
      v6: { date: "2026-06-10", technician: "Karim Bennani", notes: "Constat NC galets usés niveau 14" },
      v7: { date: "2026-07-08", technician: "Karim Bennani", notes: "Contrôle porte cabine et opérateur" },
      v8: { date: "2026-08-11", technician: "Karim Bennani", notes: "Relevé jeu de pièces pour réparation" },
      cpsi: { date: "30/07/2026", technician: "Karim Bennani", notes: "PV CPSI 2026 conforme" }
    },
    nonConformities: [
      {
        id: "nc-101",
        code: "NC-2026-084",
        description: "Usure anormale des galets de guidage cabine et micro-vibrations au niveau 14.",
        severity: "Majeure",
        detectedDate: "2026-06-10",
        deadlineDate: addDays("2026-06-10", 100),
        status: "Attente pièce",
        assignedTechnician: "Karim Bennani",
        actionPlan: "Remplacement du jeu de 4 galets et recalibrage des guides prévu au passage V9.",
        associatedQuoteNumber: "R1009850",
        equipmentPfNumber: "PF-78012",
      }
    ],
    notes: "Site sensible avec astreinte 24/7.",
  },
  {
    id: "pf-102",
    pfNumber: "PF-78015",
    projectId: "PRJ-9042",
    customerAccount: "ACC-4491",
    name: "Tour Horizon Défense - Ascenseur Service B",
    lastCpsiDate: "46142", // 30/04/2026
    contractType: "Complet VIP",
    serviceObject: "Monte-charge Hydraulique 2000kg",
    street: "12 Avenue des Champs-Élysées",
    city: "Casablanca",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Karim Bennani",
    serviceLeader: "Sophie Renard",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: false,
      v9: false,
      v10: false,
      v11: false,
      cpsi: true, // Auto-checked because 2026 (46142)
    },
    visitDetails: {
      cpsi: { date: "30/04/2026", technician: "Karim Bennani", notes: "PV CPSI 2026 conforme" }
    },
    nonConformities: [
      {
        id: "nc-102",
        code: "NC-2026-061",
        description: "Défaut d'étanchéité du vérin hydraulique secondaire avec suintement d'huile.",
        severity: "Critique / Bloquante",
        detectedDate: "2026-05-24",
        deadlineDate: addDays("2026-05-24", 100),
        status: "En cours",
        assignedTechnician: "Karim Bennani",
        actionPlan: "Changement de joint haute pression et purge du circuit hydraulique impérative.",
        associatedQuoteNumber: "R1009797",
        equipmentPfNumber: "PF-78015",
        estimatedClosureDate: "2026-09-18",
        actionsDone: "Joint HP commandé et reçu en magasin. Purge hydraulique préparée avec le technicien le 28/08/2026.",
      }
    ],
  },
  {
    id: "pf-103",
    pfNumber: "PF-84022",
    projectId: "PRJ-8110",
    customerAccount: "ACC-1904",
    name: "Centre Commercial Marina - Escalator Nord",
    lastCpsiDate: "46192", // 19/06/2026
    contractType: "Maintenance Préventive+",
    serviceObject: "Escalier Mécanique 30°",
    street: "112 Boulevard de la Corniche",
    city: "Casablanca",
    serviceObjectGroup: "Escaliers & Trottoirs Roulants",
    assignedTechnician: "Hicham Boutkhili",
    serviceLeader: "Marc Dubois",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: true,
      v9: true,
      v10: false,
      v11: false,
      cpsi: true, // Visite CPSI déjà réalisée 2026
    },
    visitDetails: {
      cpsi: { date: "19/06/2026", technician: "Hicham Boutkhili", notes: "PV CPSI 2026 conforme" }
    },
    nonConformities: [],
  },
  {
    id: "pf-104",
    pfNumber: "PF-84023",
    projectId: "PRJ-8110",
    customerAccount: "ACC-1904",
    name: "Centre Commercial Marina - Escalator Sud",
    lastCpsiDate: "46162", // 20/05/2026
    contractType: "Maintenance Préventive+",
    serviceObject: "Escalier Mécanique 30°",
    street: "112 Boulevard de la Corniche",
    city: "Casablanca",
    serviceObjectGroup: "Escaliers & Trottoirs Roulants",
    assignedTechnician: "Hicham Boutkhili",
    serviceLeader: "Marc Dubois",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: true,
      v9: false,
      v10: false,
      v11: false,
      cpsi: true, // Auto-checked because 2026 (46162)
    },
    visitDetails: {
      cpsi: { date: "20/05/2026", technician: "Hicham Boutkhili", notes: "PV CPSI 2026 conforme" }
    },
    nonConformities: [],
  },
  {
    id: "pf-105",
    pfNumber: "PF-91304",
    projectId: "PRJ-7250",
    customerAccount: "ACC-8832",
    name: "Clinique Internationale Fès - Ascenseur Brancard B1",
    lastCpsiDate: "46105", // 24/03/2026
    contractType: "Complet 24/7 Santé",
    serviceObject: "Ascenseur Hospitalier 1600kg",
    street: "264 Avenue Hassan II",
    city: "Fès",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Youssef Alami",
    serviceLeader: "David Cohen",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: true,
      v9: true,
      v10: true,
      v11: false,
      cpsi: true, // Auto-checked because 2026 (46105)
    },
    visitDetails: {
      cpsi: { date: "24/03/2026", technician: "Youssef Alami", notes: "PV CPSI 2026 conforme" }
    },
    nonConformities: [
      {
        id: "nc-105",
        code: "NC-2026-095",
        description: "Désynchronisation cellule photoélectrique de détection d'obstacles de porte.",
        severity: "Majeure",
        detectedDate: "2026-07-02", // 61 days ago -> 39 days remaining
        deadlineDate: addDays("2026-07-02", 100),
        status: "En cours",
        assignedTechnician: "Youssef Alami",
        actionPlan: "Nettoyage et réalignement optique du rideau infrarouge sécurisé.",
        associatedQuoteNumber: "R1009787",
        equipmentPfNumber: "PF-91304",
        estimatedClosureDate: "2026-09-25",
        actionsDone: "Nettoyage préliminaire de la cellule optique effectué le 15/08/2026. Réalignement laser en attente de nacelle.",
      }
    ],
  },
  {
    id: "pf-106",
    pfNumber: "PF-65219",
    projectId: "PRJ-5401",
    customerAccount: "ACC-3120",
    name: "Banque Populaire Oujda - Bâtiment Administratif",
    lastCpsiDate: "2025-07-05",
    contractType: "Standard",
    serviceObject: "Porte Automatique Coulissante",
    street: "351 Boulevard Mohammed V",
    city: "Oujda",
    serviceObjectGroup: "Portes & Fermetures Automatiques",
    assignedTechnician: "Mehdi Tazi",
    serviceLeader: "Sophie Renard",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: false,
      v8: false,
      v9: false,
      v10: false,
      v11: false,
      cpsi: false,
    },
    nonConformities: [
      {
        id: "nc-106",
        code: "NC-2026-048",
        description: "Batterie de secours d'ouverture d'urgence antipanique en fin de vie.",
        severity: "Critique / Bloquante",
        detectedDate: "2026-05-18", // 106 days ago -> OVERDUE 6 days!
        deadlineDate: addDays("2026-05-18", 100),
        status: "Ouverte",
        assignedTechnician: "Mehdi Tazi",
        actionPlan: "Remplacement immédiat du pack batterie 24V antipanique homologué.",
        associatedQuoteNumber: "R1008825",
        equipmentPfNumber: "PF-65219",
        estimatedClosureDate: "2026-09-10",
        actionsDone: "Devis R1008825 validé par le client le 20/08/2026. Pack batterie 24V expédié depuis le dépôt de Casablanca.",
      }
    ],
  },
  {
    id: "pf-107",
    pfNumber: "PF-54190",
    projectId: "PRJ-6320",
    customerAccount: "ACC-5521",
    name: "Siège Régional Tanger - Ascenseur Panoramique",
    lastCpsiDate: "2025-12-01",
    contractType: "Complet VIP",
    serviceObject: "Ascenseur Vitré Panoramique",
    street: "45 Avenue Mohammed VI",
    city: "Tanger",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Mohammed Ghafir",
    serviceLeader: "Marc Dubois",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: true,
      v9: false,
      v10: false,
      v11: false,
      cpsi: false,
    },
    nonConformities: [
      {
        id: "nc-107",
        code: "NC-2026-077",
        description: "Affichage digital d'étage clignotant en cabine.",
        severity: "Moyenne",
        detectedDate: "2026-06-25", // 68 days ago -> 32 days remaining
        deadlineDate: addDays("2026-06-25", 100),
        status: "Levée / Clôturée",
        resolvedDate: "2026-08-14",
        assignedTechnician: "Mohammed Ghafir",
        actionPlan: "Remplacement carte afficheur et validation OK.",
        associatedQuoteNumber: "R1009800",
        equipmentPfNumber: "PF-54190",
        estimatedClosureDate: "2026-08-14",
        actionsDone: "Carte afficheur remplacée et tests d'affichage validés en présence du responsable de site.",
      }
    ],
  },
  {
    id: "pf-108",
    pfNumber: "PF-54191",
    projectId: "PRJ-6320",
    customerAccount: "ACC-5521",
    name: "Siège Régional Tanger - Monte-Voiture Parking",
    lastCpsiDate: "2025-10-30",
    contractType: "Complet VIP",
    serviceObject: "Monte-Voiture Hydraulique 3500kg",
    street: "45 Avenue Mohammed VI",
    city: "Tanger",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Mohammed Ghafir",
    serviceLeader: "Marc Dubois",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: true,
      v8: true,
      v9: true,
      v10: true,
      v11: true,
      cpsi: true, // Complet 11/11 + CPSI fait !
    },
    nonConformities: [],
  },
  {
    id: "pf-9911614",
    pfNumber: "9911614",
    projectId: "PRJ-99116",
    customerAccount: "ACC-99116",
    customer: "BANQUE POPULAIRE REM",
    name: "BANQUE POPULAIRE REM - Appareil 9911614",
    lastCpsiDate: "2026-05-19",
    contractType: "Complet VIP",
    serviceObject: "Ascenseur Électrique Schindler",
    street: "Boulevard Hassan II",
    city: "Oujda",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Hicham Boutkhili",
    serviceLeader: "Sophie Renard",
    visits: {
      v1: true,
      v2: true,
      v3: true,
      v4: true,
      v5: true,
      v6: true,
      v7: false,
      v8: false,
      v9: false,
      v10: false,
      v11: false,
      cpsi: true,
    },
    nonConformities: [
      {
        id: "nc-11127",
        code: "11127",
        description: "Il y a des gorges électrique qui protégeaient par une pâte de béton qui passe dessous poulie tenseur en cuvette, il faut gratter pour assurer le jeu correct entre le système et le sole .",
        severity: "Majeure",
        detectedDate: "2026-05-19",
        deadlineDate: addDays("2026-05-19", 100),
        status: "Ouverte",
        assignedTechnician: "Hicham Boutkhili",
        actionPlan: "Gratter la pâte de béton et rétablir le jeu correct entre le système et le sol.",
        associatedQuoteNumber: "R1009912",
        equipmentPfNumber: "9911614",
        isCoveredByContract: true,
      }
    ],
  }
];
