import React, { useState, useMemo, useRef } from "react";
import { PFEquipment, NonConformity, InspectionVisits } from "../../types";
import { INITIAL_PF_EQUIPMENTS, getDaysElapsed, getDaysRemaining, CURRENT_DATE_STR, addDays, formatExcelDate, parseAndFormatDate, parseDateParts, checkIsCpsiTreated, getCpsiCategory, isCpsiEligible, isCpsiDoneIn2026, getForecastCpsiDate } from "../../data/mockPFData";
import { FormattedOutput } from "../FormattedOutput";
import { CpsiPvScanner } from "./CpsiPvScanner";
import { NcClosureDocument } from "./NcClosureDocument";
import { ArchivedPFManager } from "./ArchivedPFManager";
import { exportToExcel, readExcelFile } from "../../utils/excelExport";
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Edit,
  Download,
  Upload,
  Search,
  Filter,
  Sparkles,
  BarChart3,
  Calendar,
  Layers,
  ShieldAlert,
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  MapPin,
  User,
  Building,
  ArrowUpDown,
  FileSpreadsheet,
  TrendingUp,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Link2,
  FileText,
  Zap,
  RefreshCw,
  UserCheck,
  MessageSquare,
  MessageSquarePlus,
  Archive,
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
  PieChart,
  Pie,
  Cell
} from "recharts";

type PFSubView = "list" | "visits" | "nc_control" | "analytics" | "ai_audit" | "archived";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export const PFManager: React.FC = () => {
  const [equipments, setEquipments] = useState<PFEquipment[]>(() => {
    const saved = localStorage.getItem("toolbox_pf_equipments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return INITIAL_PF_EQUIPMENTS;
  });

  const [archivedEquipments, setArchivedEquipments] = useState<PFEquipment[]>(() => {
    const saved = localStorage.getItem("toolbox_pf_archived_equipments");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // fallback
      }
    }
    return [];
  });

  const saveArchivedEquipments = (newArchived: PFEquipment[]) => {
    setArchivedEquipments(newArchived);
    try {
      localStorage.setItem("toolbox_pf_archived_equipments", JSON.stringify(newArchived));
    } catch (e) {
      console.error("Error saving archived equipments:", e);
    }
  };

  const [activeSubView, setActiveSubView] = useState<PFSubView>("list");
  const [visibleCount, setVisibleCount] = useState<number>(80);
  const [showCpsiScannerInline, setShowCpsiScannerInline] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("all");
  const [selectedTech, setSelectedTech] = useState("all");
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedNcFilter, setSelectedNcFilter] = useState("all"); // all, has_nc, urgent_nc, overdue_nc
  const [selectedCpsiFilter, setSelectedCpsiFilter] = useState("all"); // all, done, pending, eligible_only, excluded_only, error

  // Dedicated Date Filters for Last CPSI and Forecast CPSI
  const [selectedLastCpsiDateFilter, setSelectedLastCpsiDateFilter] = useState("all");
  const [selectedForecastCpsiDateFilter, setSelectedForecastCpsiDateFilter] = useState("all");
  const [customLastCpsiMonth, setCustomLastCpsiMonth] = useState("");
  const [customForecastCpsiMonth, setCustomForecastCpsiMonth] = useState("");

  const resetAllFilters = () => {
    setSearchTerm("");
    setSelectedCity("all");
    setSelectedTech("all");
    setSelectedGroup("all");
    setSelectedNcFilter("all");
    setSelectedCpsiFilter("all");
    setSelectedLastCpsiDateFilter("all");
    setSelectedForecastCpsiDateFilter("all");
    setCustomLastCpsiMonth("");
    setCustomForecastCpsiMonth("");
    setVisibleCount(80);
  };

  const hasAnyActiveFilter =
    searchTerm !== "" ||
    selectedCity !== "all" ||
    selectedTech !== "all" ||
    selectedGroup !== "all" ||
    selectedNcFilter !== "all" ||
    selectedCpsiFilter !== "all" ||
    selectedLastCpsiDateFilter !== "all" ||
    selectedForecastCpsiDateFilter !== "all" ||
    customLastCpsiMonth !== "" ||
    customForecastCpsiMonth !== "";

  const [uploadNotification, setUploadNotification] = useState<{
    show: boolean;
    message: string;
    type: "success" | "warning" | "error";
  } | null>(null);

  // AI Audit State
  const [loadingAi, setLoadingAi] = useState(false);
  const [aiAuditResult, setAiAuditResult] = useState<string | null>(null);

  // Modals & Sub-row States
  const [expandedRowIds, setExpandedRowIds] = useState<Set<string>>(new Set());
  const toggleRowExpanded = (id: string) => {
    setExpandedRowIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const [showAddEquipmentModal, setShowAddEquipmentModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<PFEquipment | null>(null);
  const [showAddNcModal, setShowAddNcModal] = useState(false);
  const [editingNc, setEditingNc] = useState<{ eqId: string; nc: NonConformity } | null>(null);
  const [showImportNcModal, setShowImportNcModal] = useState(false);
  const [ncDocModal, setNcDocModal] = useState<{
    isOpen: boolean;
    nc: NonConformity | null;
    equipment: PFEquipment | null;
  }>({ isOpen: false, nc: null, equipment: null });
  const [targetEquipmentForNc, setTargetEquipmentForNc] = useState<PFEquipment | null>(null);
  const [equipmentToDelete, setEquipmentToDelete] = useState<PFEquipment | null>(null);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [ncToDelete, setNcToDelete] = useState<{ eqId: string; ncId: string; code: string } | null>(null);
  const [archiveTransferModal, setArchiveTransferModal] = useState<{
    isOpen: boolean;
    equipment: PFEquipment | null;
    reason: string;
    exitDate: string;
    notes: string;
  }>({
    isOpen: false,
    equipment: null,
    reason: "Hors Garantie (Échéance)",
    exitDate: CURRENT_DATE_STR,
    notes: "",
  });
  const excelInputRef = useRef<HTMLInputElement>(null);
  const ncFileInputRef = useRef<HTMLInputElement>(null);

  // Visit Date & Execution Modal State
  const [visitModal, setVisitModal] = useState<{
    isOpen: boolean;
    equipment: PFEquipment | null;
    visitKey: keyof InspectionVisits | null;
    visitLabel: string;
    isDone: boolean;
    date: string;
    technician: string;
    notes: string;
  }>({
    isOpen: false,
    equipment: null,
    visitKey: null,
    visitLabel: "",
    isDone: true,
    date: CURRENT_DATE_STR,
    technician: "",
    notes: "",
  });

  // New Equipment Form State
  const [newEqForm, setNewEqForm] = useState<Partial<PFEquipment>>({
    pfNumber: "",
    projectId: "PRJ-",
    customerAccount: "ACC-",
    name: "",
    lastCpsiDate: "2025-10-01",
    contractType: "Complet VIP",
    serviceObject: "Ascenseur Électrique",
    street: "",
    city: "Paris",
    serviceObjectGroup: "Vertical Transportation (VT)",
    assignedTechnician: "Karim Bennani",
    serviceLeader: "Sophie Renard",
  });

  // New NC Form State
  const [newNcForm, setNewNcForm] = useState<Partial<NonConformity>>({
    code: `NC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    description: "",
    severity: "Majeure",
    detectedDate: CURRENT_DATE_STR,
    status: "Ouverte",
    assignedTechnician: "",
    actionPlan: "",
  });

  // NC Control Tower Filter State
  const [ncTourSearch, setNcTourSearch] = useState("");
  const [ncTourTechFilter, setNcTourTechFilter] = useState("all");
  const [ncTourUrgencyFilter, setNcTourUrgencyFilter] = useState<
    "all" | "overdue" | "critical" | "vigilance" | "normal" | "open" | "closed"
  >("all");

  // Save to LocalStorage
  const saveEquipments = (updated: PFEquipment[]) => {
    setEquipments(updated);
    localStorage.setItem("toolbox_pf_equipments", JSON.stringify(updated));
  };

  // Quick Equipment Comment Modal State
  const [quickCommentModalEq, setQuickCommentModalEq] = useState<PFEquipment | null>(null);
  const [equipmentCommentText, setEquipmentCommentText] = useState("");

  const handleOpenCommentModal = (eq: PFEquipment) => {
    setQuickCommentModalEq(eq);
    setEquipmentCommentText(eq.notes || "");
  };

  const handleSaveEquipmentComment = (eqId: string, newNotes: string) => {
    const updated = equipments.map((eq) =>
      eq.id === eqId ? { ...eq, notes: newNotes.trim() } : eq
    );
    saveEquipments(updated);
    setQuickCommentModalEq(null);
  };

  // Distinct Filter Options
  const cities = useMemo(() => Array.from(new Set(equipments.map((e) => e.city))), [equipments]);
  const technicians = useMemo(
    () =>
      Array.from(
        new Set(
          equipments
            .map((e) => (e.assignedTechnician || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b)),
    [equipments]
  );
  const groups = useMemo(
    () => Array.from(new Set(equipments.map((e) => e.serviceObjectGroup))),
    [equipments]
  );

  // List of distinct responsible technicians assigned to equipment in the portfolio
  const responsibleTechnicians = useMemo(() => {
    const fromPortfolio = equipments
      .map((e) => (e.assignedTechnician || "").trim())
      .filter(Boolean);
    return Array.from(new Set(fromPortfolio)).sort((a, b) => a.localeCompare(b));
  }, [equipments]);

  // Master list of all technicians (including Schindler field techs)
  const allKnownTechnicians = useMemo(() => {
    const defaultList = [
      "Karim Bennani",
      "Hicham Boutkhili",
      "Youssef Alami",
      "Mehdi Tazi",
      "Mohammed Ghafir",
      "Omar Berrada",
      "Amine Chraibi",
      "Hamza Ziani",
      "Rachid Idrissi",
    ];
    const fromEquipments = equipments.map((e) => e.assignedTechnician).filter(Boolean);
    const fromNcs = equipments
      .flatMap((e) => e.nonConformities.map((n) => n.assignedTechnician))
      .filter(Boolean);
    return Array.from(new Set([...fromEquipments, ...fromNcs, ...defaultList]))
      .filter((t): t is string => !!t && t.trim().length > 0)
      .sort((a, b) => a.localeCompare(b));
  }, [equipments]);

  // Filtered Equipments
  const filteredEquipments = useMemo(() => {
    return equipments.filter((eq) => {
      // Search
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        eq.pfNumber.toLowerCase().includes(q) ||
        eq.name.toLowerCase().includes(q) ||
        eq.customerAccount.toLowerCase().includes(q) ||
        eq.projectId.toLowerCase().includes(q) ||
        eq.assignedTechnician.toLowerCase().includes(q) ||
        eq.city.toLowerCase().includes(q) ||
        eq.serviceObject.toLowerCase().includes(q) ||
        (eq.notes && eq.notes.toLowerCase().includes(q));

      if (!matchSearch) return false;

      // Dropdown filters
      if (selectedCity !== "all" && eq.city !== selectedCity) return false;
      if (selectedTech !== "all" && eq.assignedTechnician !== selectedTech) return false;
      if (selectedGroup !== "all" && eq.serviceObjectGroup !== selectedGroup) return false;

      // CPSI filter
      const isDone2026 = isCpsiDoneIn2026(eq);
      const isEligible = isCpsiEligible(eq);

      if (selectedCpsiFilter === "done" && (!isEligible || !isDone2026)) return false;
      if (selectedCpsiFilter === "pending" && (!isEligible || isDone2026)) return false;
      if (selectedCpsiFilter === "eligible_only" && !isEligible) return false;
      if (selectedCpsiFilter === "excluded_only" && isEligible) return false;
      if (selectedCpsiFilter === "error" && eq.lastCpsiDate !== "Erreur" && eq.forecastCpsiDate !== "Erreur") return false;

      // Filter by Date Dernier CPSI
      if (selectedLastCpsiDateFilter !== "all") {
        const rawDate = eq.visitDetails?.cpsi?.date || eq.lastCpsiDate;
        const parsed = parseDateParts(rawDate);

        if (selectedLastCpsiDateFilter === "has_date") {
          if (!parsed.isValid) return false;
        } else if (selectedLastCpsiDateFilter === "no_date") {
          if (parsed.isValid || parsed.isError) return false;
        } else if (selectedLastCpsiDateFilter === "error") {
          if (!parsed.isError) return false;
        } else if (selectedLastCpsiDateFilter === "year_before_2024") {
          if (!parsed.isValid || !parsed.year || parsed.year >= 2024) return false;
        } else if (selectedLastCpsiDateFilter.startsWith("year_")) {
          const targetYear = parseInt(selectedLastCpsiDateFilter.replace("year_", ""), 10);
          if (!parsed.isValid || parsed.year !== targetYear) return false;
        }
      }

      // Filter by Custom Month for Last CPSI
      if (customLastCpsiMonth) {
        const [cy, cm] = customLastCpsiMonth.split("-").map((x) => parseInt(x, 10));
        const rawDate = eq.visitDetails?.cpsi?.date || eq.lastCpsiDate;
        const parsed = parseDateParts(rawDate);
        if (!parsed.isValid || parsed.year !== cy || parsed.month !== cm) return false;
      }

      // Filter by Date Prévisionnelle CPSI
      if (selectedForecastCpsiDateFilter !== "all") {
        const forecastStr = getForecastCpsiDate(eq);
        const parsed = parseDateParts(forecastStr);
        const refToday = new Date(CURRENT_DATE_STR);
        refToday.setHours(0, 0, 0, 0);

        if (selectedForecastCpsiDateFilter === "error") {
          if (!parsed.isError && forecastStr !== "Erreur") return false;
        } else if (selectedForecastCpsiDateFilter === "to_plan") {
          if (forecastStr !== "À planifier") return false;
        } else if (selectedForecastCpsiDateFilter === "excluded") {
          if (!forecastStr.includes("Exclu")) return false;
        } else if (selectedForecastCpsiDateFilter === "overdue") {
          if (!parsed.isValid || !parsed.dateObj || parsed.dateObj.getTime() >= refToday.getTime()) return false;
        } else if (selectedForecastCpsiDateFilter === "this_month") {
          if (!parsed.isValid || parsed.year !== refToday.getFullYear() || parsed.month !== (refToday.getMonth() + 1)) return false;
        } else if (selectedForecastCpsiDateFilter === "next_30") {
          if (!parsed.isValid || !parsed.dateObj) return false;
          const diffDays = Math.ceil((parsed.dateObj.getTime() - refToday.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 30) return false;
        } else if (selectedForecastCpsiDateFilter === "next_90") {
          if (!parsed.isValid || !parsed.dateObj) return false;
          const diffDays = Math.ceil((parsed.dateObj.getTime() - refToday.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 0 || diffDays > 90) return false;
        } else if (selectedForecastCpsiDateFilter.startsWith("year_")) {
          const targetYear = parseInt(selectedForecastCpsiDateFilter.replace("year_", ""), 10);
          if (!parsed.isValid || parsed.year !== targetYear) return false;
        }
      }

      // Filter by Custom Month for Forecast CPSI
      if (customForecastCpsiMonth) {
        const [cy, cm] = customForecastCpsiMonth.split("-").map((x) => parseInt(x, 10));
        const forecastStr = getForecastCpsiDate(eq);
        const parsed = parseDateParts(forecastStr);
        if (!parsed.isValid || parsed.year !== cy || parsed.month !== cm) return false;
      }

      // NC Filter
      const openNcs = eq.nonConformities.filter((n) => n.status !== "Levée / Clôturée");
      if (selectedNcFilter === "has_nc" && openNcs.length === 0) return false;
      if (selectedNcFilter === "urgent_nc") {
        const hasUrgent = openNcs.some((n) => {
          const daysRem = getDaysRemaining(n.detectedDate);
          return daysRem < 15 && daysRem >= 0;
        });
        if (!hasUrgent) return false;
      }
      if (selectedNcFilter === "overdue_nc") {
        const hasOverdue = openNcs.some((n) => getDaysRemaining(n.detectedDate) < 0);
        if (!hasOverdue) return false;
      }

      return true;
    });
  }, [
    equipments,
    searchTerm,
    selectedCity,
    selectedTech,
    selectedGroup,
    selectedCpsiFilter,
    selectedNcFilter,
    selectedLastCpsiDateFilter,
    customLastCpsiMonth,
    selectedForecastCpsiDateFilter,
    customForecastCpsiMonth,
  ]);

  const displayedEquipments = useMemo(
    () => filteredEquipments.slice(0, visibleCount),
    [filteredEquipments, visibleCount]
  );

  // Overall Metrics Calculation
  const totalEquipments = equipments.length;

  // 11 Inspections Progress (excluding CPSI)
  const totalInspectionSlots = totalEquipments * 11;
  const completedInspections = useMemo(
    () =>
      equipments.reduce((acc, eq) => {
        let count = 0;
        for (let i = 1; i <= 11; i++) {
          if (eq.visits[`v${i}` as keyof InspectionVisits]) count++;
        }
        return acc + count;
      }, 0),
    [equipments]
  );
  const inspectionProgressPct =
    totalInspectionSlots > 0 ? Math.round((completedInspections / totalInspectionSlots) * 100) : 0;

  // CPSI (12th Visit) Progress (restricted to eligible equipments: ELEVATOR, ESCALATOR, MOV_WALK)
  const eligibleCpsiEquipments = useMemo(() => equipments.filter(isCpsiEligible), [equipments]);
  const totalEligibleCpsi = eligibleCpsiEquipments.length;
  const completedCpsi = useMemo(() => eligibleCpsiEquipments.filter(isCpsiDoneIn2026).length, [eligibleCpsiEquipments]);
  const cpsiProgressPct =
    totalEligibleCpsi > 0 ? Math.round((completedCpsi / totalEligibleCpsi) * 100) : 0;

  const errorCpsiCount = useMemo(
    () =>
      equipments.filter(
        (eq) => eq.lastCpsiDate === "Erreur" || eq.forecastCpsiDate === "Erreur"
      ).length,
    [equipments]
  );

  // Dynamic Year & Metric Stats for Last CPSI Date Filter
  const lastCpsiDateStats = useMemo(() => {
    const yearCounts: Record<number, number> = {};
    let before2024Count = 0;
    let noDateCount = 0;
    let errorCount = 0;
    let totalWithDate = 0;

    equipments.forEach((eq) => {
      const dateVal = eq.visitDetails?.cpsi?.date || eq.lastCpsiDate;
      const parsed = parseDateParts(dateVal);
      if (parsed.isError) {
        errorCount++;
      } else if (parsed.isValid && parsed.year) {
        totalWithDate++;
        yearCounts[parsed.year] = (yearCounts[parsed.year] || 0) + 1;
        if (parsed.year < 2024) {
          before2024Count++;
        }
      } else {
        noDateCount++;
      }
    });

    const sortedYears = Object.keys(yearCounts)
      .map(Number)
      .sort((a, b) => b - a);

    return {
      yearCounts,
      sortedYears,
      before2024Count,
      noDateCount,
      errorCount,
      totalWithDate,
    };
  }, [equipments]);

  // Dynamic Year & Metric Stats for Forecast CPSI Date Filter
  const forecastCpsiDateStats = useMemo(() => {
    const yearCounts: Record<number, number> = {};
    let overdueCount = 0;
    let thisMonthCount = 0;
    let next30Count = 0;
    let next90Count = 0;
    let toPlanCount = 0;
    let excludedCount = 0;
    let errorCount = 0;
    let totalWithDate = 0;

    const refToday = new Date(CURRENT_DATE_STR);
    refToday.setHours(0, 0, 0, 0);

    equipments.forEach((eq) => {
      const forecastStr = getForecastCpsiDate(eq);
      if (forecastStr === "Erreur") {
        errorCount++;
      } else if (forecastStr === "À planifier") {
        toPlanCount++;
      } else if (forecastStr.includes("Exclu")) {
        excludedCount++;
      } else {
        const parsed = parseDateParts(forecastStr);
        if (parsed.isError) {
          errorCount++;
        } else if (parsed.isValid && parsed.year && parsed.dateObj) {
          totalWithDate++;
          yearCounts[parsed.year] = (yearCounts[parsed.year] || 0) + 1;

          const diffDays = Math.ceil(
            (parsed.dateObj.getTime() - refToday.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (diffDays < 0) overdueCount++;
          if (
            parsed.year === refToday.getFullYear() &&
            parsed.month === refToday.getMonth() + 1
          ) {
            thisMonthCount++;
          }
          if (diffDays >= 0 && diffDays <= 30) next30Count++;
          if (diffDays >= 0 && diffDays <= 90) next90Count++;
        }
      }
    });

    const sortedYears = Object.keys(yearCounts)
      .map(Number)
      .sort((a, b) => a - b);

    return {
      yearCounts,
      sortedYears,
      overdueCount,
      thisMonthCount,
      next30Count,
      next90Count,
      toPlanCount,
      excludedCount,
      errorCount,
      totalWithDate,
    };
  }, [equipments]);

  // Non-Conformities Tracking (<100 Days Rule)
  const allNcs = useMemo(() => {
    const list: Array<{ equipment: PFEquipment; nc: NonConformity }> = [];
    equipments.forEach((eq) => {
      eq.nonConformities.forEach((nc) => {
        list.push({ equipment: eq, nc });
      });
    });
    return list;
  }, [equipments]);

  const openNcsList = useMemo(
    () => allNcs.filter((item) => item.nc.status !== "Levée / Clôturée"),
    [allNcs]
  );

  const overdueNcs = openNcsList.filter((item) => getDaysRemaining(item.nc.detectedDate) < 0);
  const criticalNcs = openNcsList.filter((item) => {
    const rem = getDaysRemaining(item.nc.detectedDate);
    return rem >= 0 && rem <= 15;
  });
  const vigilanceNcs = openNcsList.filter((item) => {
    const rem = getDaysRemaining(item.nc.detectedDate);
    return rem > 15 && rem <= 40;
  });

  // Filtered NCs for the Tour de Contrôle des NC
  const filteredTourNcs = useMemo(() => {
    return allNcs.filter(({ equipment, nc }) => {
      const assignedTech = (nc.assignedTechnician || equipment.assignedTechnician || "").trim();

      // Tech filter
      if (ncTourTechFilter !== "all") {
        if (assignedTech.toLowerCase() !== ncTourTechFilter.toLowerCase()) return false;
      }

      // Urgency filter
      const daysRemaining = getDaysRemaining(nc.detectedDate);
      const isResolved = nc.status === "Levée / Clôturée";
      const isOverdue = !isResolved && daysRemaining < 0;
      const isCritical = !isResolved && daysRemaining >= 0 && daysRemaining <= 15;
      const isVigilance = !isResolved && daysRemaining > 15 && daysRemaining <= 40;
      const isNormal = !isResolved && daysRemaining > 40;

      if (ncTourUrgencyFilter === "overdue" && !isOverdue) return false;
      if (ncTourUrgencyFilter === "critical" && !isCritical) return false;
      if (ncTourUrgencyFilter === "vigilance" && !isVigilance) return false;
      if (ncTourUrgencyFilter === "normal" && !isNormal) return false;
      if (ncTourUrgencyFilter === "open" && isResolved) return false;
      if (ncTourUrgencyFilter === "closed" && !isResolved) return false;

      // Search
      if (ncTourSearch.trim()) {
        const q = ncTourSearch.toLowerCase();
        const match =
          nc.code.toLowerCase().includes(q) ||
          nc.description.toLowerCase().includes(q) ||
          equipment.pfNumber.toLowerCase().includes(q) ||
          equipment.name.toLowerCase().includes(q) ||
          equipment.city.toLowerCase().includes(q) ||
          equipment.customerAccount.toLowerCase().includes(q) ||
          assignedTech.toLowerCase().includes(q) ||
          (equipment.notes && equipment.notes.toLowerCase().includes(q)) ||
          (nc.associatedQuoteNumber && nc.associatedQuoteNumber.toLowerCase().includes(q)) ||
          (nc.actionPlan && nc.actionPlan.toLowerCase().includes(q)) ||
          (nc.actionsDone && nc.actionsDone.toLowerCase().includes(q));
        if (!match) return false;
      }

      return true;
    });
  }, [allNcs, ncTourTechFilter, ncTourUrgencyFilter, ncTourSearch]);

  // Quick Change Technician for a specific NC
  const handleQuickChangeNcTechnician = (eqId: string, ncId: string, newTech: string) => {
    const updated = equipments.map((eq) => {
      if (eq.id === eqId) {
        return {
          ...eq,
          nonConformities: eq.nonConformities.map((nc) => {
            if (nc.id === ncId) {
              return { ...nc, assignedTechnician: newTech.trim() };
            }
            return nc;
          }),
        };
      }
      return eq;
    });
    saveEquipments(updated);
  };

  // Harmonize / Sync all NCs to equipment's assigned technician
  const handleSyncAllNcTechniciansWithEquipments = () => {
    let count = 0;
    const updated = equipments.map((eq) => {
      const updatedNcs = eq.nonConformities.map((nc) => {
        count++;
        return {
          ...nc,
          assignedTechnician: eq.assignedTechnician,
          equipmentPfNumber: eq.pfNumber,
        };
      });
      return {
        ...eq,
        nonConformities: updatedNcs,
      };
    });
    saveEquipments(updated);
    alert(`Succès : ${count} Non-Conformité(s) ont été réassignées avec exactitude au bon technicien titulaire de chaque appareil !`);
  };

  // Open Visit Date & Execution Modal
  const handleOpenVisitModal = (eq: PFEquipment, visitKey: keyof InspectionVisits) => {
    const isDone = !!eq.visits[visitKey];
    const existingDetail = eq.visitDetails?.[visitKey];
    const label = visitKey === "cpsi" ? "Visite CPSI (12ème Visite Annuelle)" : `Visite V${visitKey.replace("v", "")}`;
    setVisitModal({
      isOpen: true,
      equipment: eq,
      visitKey,
      visitLabel: label,
      isDone: isDone,
      date: existingDetail?.date || CURRENT_DATE_STR,
      technician: existingDetail?.technician || eq.assignedTechnician || "",
      notes: existingDetail?.notes || "",
    });
  };

  // Save Visit with Date & Details
  const handleSaveVisitModal = (markDone: boolean) => {
    if (!visitModal.equipment || !visitModal.visitKey) return;
    const eqId = visitModal.equipment.id;
    const vKey = visitModal.visitKey;

    const updated = equipments.map((eq) => {
      if (eq.id === eqId) {
        const newVisits = {
          ...eq.visits,
          [vKey]: markDone,
        };
        const newDetails = { ...(eq.visitDetails || {}) };
        if (markDone) {
          newDetails[vKey] = {
            date: visitModal.date || CURRENT_DATE_STR,
            technician: visitModal.technician || eq.assignedTechnician,
            notes: visitModal.notes,
            completedAt: new Date().toISOString(),
          };
        } else {
          delete newDetails[vKey];
        }
        return {
          ...eq,
          visits: newVisits,
          visitDetails: newDetails,
        };
      }
      return eq;
    });

    saveEquipments(updated);
    setVisitModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Bulk / Individual CPSI Injection from AI PV Scanner
  const handleApplyCpsiUpdates = (
    updates: Array<{
      equipmentId: string;
      cpsiDate: string;
      inspector?: string;
      bureau?: string;
      notes?: string;
      newFileName?: string;
    }>
  ) => {
    const updated = equipments.map((eq) => {
      const update = updates.find((u) => u.equipmentId === eq.id);
      if (!update) return eq;

      const newVisits = {
        ...eq.visits,
        cpsi: true,
      };

      const newDetails = {
        ...(eq.visitDetails || {}),
        cpsi: {
          date: update.cpsiDate || CURRENT_DATE_STR,
          technician: update.inspector || update.bureau || eq.assignedTechnician,
          notes: update.notes || `Validé via PV CPSI : ${update.newFileName || "Rapport de contrôle vérifié"}`,
          completedAt: new Date().toISOString(),
        },
      };

      return {
        ...eq,
        lastCpsiDate: update.cpsiDate || eq.lastCpsiDate,
        visits: newVisits,
        visitDetails: newDetails,
      };
    });

    saveEquipments(updated);
  };

  // Toggle Visit Checkbox
  const handleToggleVisit = (eqId: string, visitKey: keyof InspectionVisits) => {
    const targetEq = equipments.find((e) => e.id === eqId);
    if (targetEq) {
      handleOpenVisitModal(targetEq, visitKey);
    }
  };

  // Add Equipment Submit
  const handleCreateEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEqForm.pfNumber || !newEqForm.name) return;

    const newEq: PFEquipment = {
      id: `pf-${Date.now()}`,
      pfNumber: newEqForm.pfNumber,
      projectId: newEqForm.projectId || "PRJ-1000",
      customerAccount: newEqForm.customerAccount || "ACC-1000",
      name: newEqForm.name,
      lastCpsiDate: newEqForm.lastCpsiDate || CURRENT_DATE_STR,
      contractType: newEqForm.contractType || "Complet VIP",
      serviceObject: newEqForm.serviceObject || "Ascenseur Électrique",
      street: newEqForm.street || "Adresse non spécifiée",
      city: newEqForm.city || "Paris",
      serviceObjectGroup: newEqForm.serviceObjectGroup || "Vertical Transportation (VT)",
      assignedTechnician: newEqForm.assignedTechnician || "À assigner",
      serviceLeader: newEqForm.serviceLeader || "Sophie Renard",
      notes: newEqForm.notes || "",
      visits: {
        v1: false,
        v2: false,
        v3: false,
        v4: false,
        v5: false,
        v6: false,
        v7: false,
        v8: false,
        v9: false,
        v10: false,
        v11: false,
        cpsi: false,
      },
      nonConformities: [],
    };

    saveEquipments([newEq, ...equipments]);
    setShowAddEquipmentModal(false);
    setNewEqForm({
      pfNumber: "",
      projectId: "PRJ-",
      customerAccount: "ACC-",
      name: "",
      lastCpsiDate: "2025-10-01",
      contractType: "Complet VIP",
      serviceObject: "Ascenseur Électrique",
      street: "",
      city: "Paris",
      serviceObjectGroup: "Vertical Transportation (VT)",
      assignedTechnician: "Karim Bennani",
      serviceLeader: "Sophie Renard",
      notes: "",
    });
  };

  // Delete Equipment (In-app safe trigger)
  const handleRequestDeleteEquipment = (eq: PFEquipment) => {
    setEquipmentToDelete(eq);
  };

  const handleConfirmDeleteEquipment = () => {
    if (!equipmentToDelete) return;
    const updated = equipments.filter((eq) => eq.id !== equipmentToDelete.id);
    saveEquipments(updated);
    setEquipmentToDelete(null);
  };

  // Direct Delete fallback for instant action
  const handleDirectDeleteEquipment = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = equipments.filter((eq) => eq.id !== id);
    saveEquipments(updated);
  };

  // Purge ALL Equipments
  const handleConfirmPurgeAll = () => {
    saveEquipments([]);
    setShowPurgeModal(false);
  };

  // Archive & Historical Equipment Handlers
  const handleOpenTransferToArchiveModal = (eq: PFEquipment) => {
    setArchiveTransferModal({
      isOpen: true,
      equipment: eq,
      reason: "Hors Garantie (Échéance)",
      exitDate: CURRENT_DATE_STR,
      notes: eq.notes || "",
    });
  };

  const handleConfirmTransferFromModal = () => {
    if (!archiveTransferModal.equipment) return;
    const eq = archiveTransferModal.equipment;
    handleTransferFromActive(
      eq.id,
      archiveTransferModal.reason,
      archiveTransferModal.exitDate,
      archiveTransferModal.notes
    );
    setArchiveTransferModal({
      isOpen: false,
      equipment: null,
      reason: "Hors Garantie (Échéance)",
      exitDate: CURRENT_DATE_STR,
      notes: "",
    });
  };

  const handleTransferFromActive = (
    equipmentId: string,
    reason: string,
    exitDate: string,
    notes?: string
  ) => {
    const target = equipments.find((e) => e.id === equipmentId);
    if (!target) return;

    const archivedItem: PFEquipment = {
      ...target,
      isArchived: true,
      archivedReason: reason,
      archivedDate: exitDate || CURRENT_DATE_STR,
      archivedNotes: notes !== undefined ? notes : (target.notes || ""),
    };

    // Remove from active list
    const updatedActive = equipments.filter((e) => e.id !== equipmentId);
    saveEquipments(updatedActive);

    // Add to archived list
    const updatedArchived = [
      archivedItem,
      ...archivedEquipments.filter((e) => e.id !== equipmentId && e.pfNumber !== target.pfNumber),
    ];
    saveArchivedEquipments(updatedArchived);
  };

  const handleRestoreToActive = (equipment: PFEquipment) => {
    const restoredItem: PFEquipment = {
      ...equipment,
      isArchived: false,
      archivedReason: undefined,
      archivedDate: undefined,
    };

    // Remove from archived list
    const updatedArchived = archivedEquipments.filter((e) => e.id !== equipment.id);
    saveArchivedEquipments(updatedArchived);

    // Add to active list
    const updatedActive = [
      restoredItem,
      ...equipments.filter((e) => e.id !== equipment.id && e.pfNumber !== equipment.pfNumber),
    ];
    saveEquipments(updatedActive);
  };

  // Delete specific Non-Conformity
  const handleRequestDeleteNc = (eqId: string, ncId: string, code: string) => {
    setNcToDelete({ eqId, ncId, code });
  };

  const handleConfirmDeleteNc = () => {
    if (!ncToDelete) return;
    const { eqId, ncId } = ncToDelete;
    const updated = equipments.map((eq) => {
      if (eq.id === eqId) {
        return {
          ...eq,
          nonConformities: eq.nonConformities.filter((n) => n.id !== ncId),
        };
      }
      return eq;
    });
    saveEquipments(updated);
    setNcToDelete(null);
  };

  // Export directly to Excel (.xlsx) format (filtered if filters are applied, all if no filter)
  const handleExportExcel = () => {
    const targetEquipments = filteredEquipments;
    if (targetEquipments.length === 0) {
      alert("Aucun appareil ne correspond aux filtres actuels pour l'export.");
      return;
    }

    const isFiltered = targetEquipments.length !== equipments.length;
    const targetEquipmentIds = new Set(targetEquipments.map((e) => e.id));

    const excelData = targetEquipments.map((eq) => {
      let vCount = 0;
      for (let i = 1; i <= 11; i++) {
        if (eq.visits[`v${i}` as keyof InspectionVisits]) vCount++;
      }
      const openNcs = eq.nonConformities.filter((n) => n.status !== "Levée / Clôturée");
      const minDaysRem =
        openNcs.length > 0
          ? Math.min(...openNcs.map((n) => getDaysRemaining(n.detectedDate)))
          : "N/A";
      let ncStatusText = "Conforme (Aucune NC)";
      if (typeof minDaysRem === "number") {
        if (minDaysRem < 0) ncStatusText = `DÉPASSÉ (+${Math.abs(minDaysRem)} jours de retard)`;
        else if (minDaysRem <= 15) ncStatusText = `ALERTE CRITIQUE (${minDaysRem}j restants)`;
        else ncStatusText = `En cours (${minDaysRem}j restants)`;
      }

      const cpsiCat = getCpsiCategory(eq);
      const isEligible = isCpsiEligible(eq);
      const isDone2026 = isCpsiDoneIn2026(eq);

      return {
        "N° Appareil (PF)": eq.pfNumber,
        "Project ID": eq.projectId,
        "Customer account": eq.customerAccount,
        "Name": eq.name,
        "Catégorie CPSI": cpsiCat,
        "Périodicité CPSI": cpsiCat === "ELEVATOR" ? "1 an" : cpsiCat === "ESCALATOR" || cpsiCat === "MOV_WALK" ? "2 ans" : "Exclu (Visite normale)",
        "Date Dernier CPSI": eq.lastCpsiDate === "Erreur" ? "Erreur" : formatExcelDate(eq.lastCpsiDate),
        "Statut CPSI (2026)": eq.lastCpsiDate === "Erreur" ? "Erreur (Date invalide)" : isDone2026 ? "Réalisée (2026)" : isEligible ? "À Faire (2026)" : "Exclu (12e Visite Normale)",
        "Date Prévisionnelle Traitement CPSI": getForecastCpsiDate(eq),
        "Type Contrat": eq.contractType,
        "Service object": eq.serviceObject,
        "Street": eq.street,
        "City": eq.city,
        "Service object group": eq.serviceObjectGroup,
        "Assigned Technician": eq.assignedTechnician,
        "Service Leader": eq.serviceLeader,
        "Visites Faites (sur 11)": `${vCount}/11`,
        "Date Réalisation CPSI": eq.visitDetails?.cpsi?.date || eq.lastCpsiDate,
        "Nb NC Ouvertes": openNcs.length,
        "Délai NC Min Restant (Jours)": minDaysRem,
        "Statut Conformité NC (<100j)": ncStatusText,
      };
    });

    const targetNcs = allNcs.filter(({ equipment }) => targetEquipmentIds.has(equipment.id));

    const ncData = targetNcs.map(({ equipment, nc }) => ({
      "N° Appareil (PF)": equipment.pfNumber,
      "Nom Appareil": equipment.name,
      "Ville": equipment.city,
      "Code NC": nc.code,
      "Gravité": nc.severity,
      "Date Constat": nc.detectedDate,
      "Date Échéance 100j": nc.deadlineDate,
      "Jours Restants": getDaysRemaining(nc.detectedDate),
      "Statut NC": nc.status,
      "Date Levée": nc.resolvedDate || "",
      "Technicien": nc.assignedTechnician || equipment.assignedTechnician,
      "Description Constat": nc.description,
      "Plan d'Action": nc.actionPlan,
    }));

    const fileName = isFiltered
      ? `Parc_PF_Filtres_${targetEquipments.length}_Equipements_${CURRENT_DATE_STR}.xlsx`
      : `Parc_PF_Equipements_Complet_${CURRENT_DATE_STR}.xlsx`;

    exportToExcel(
      [
        { sheetName: isFiltered ? `Parc PF Filtré (${targetEquipments.length})` : "Parc PF & CPSI", data: excelData },
        { sheetName: "Non-Conformités 100j", data: ncData },
      ],
      fileName
    );

    setUploadNotification({
      show: true,
      message: isFiltered
        ? `✓ Export réussi : ${targetEquipments.length} appareils filtrés exportés (${fileName})`
        : `✓ Export réussi : ${targetEquipments.length} appareils du parc complet exportés (${fileName})`,
      type: "success",
    });
    setTimeout(() => {
      setUploadNotification({ show: false, message: "", type: "success" });
    }, 4000);
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

  // Import directly from Excel (.xlsx, .xls, .xlsm, .csv)
  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed: any = await readExcelFile(file);
      const rows: Record<string, any>[] = Array.isArray(parsed)
        ? parsed
        : parsed?.primaryRows || [];

      const validRows = rows.filter((r) => {
        if (!r || typeof r !== "object") return false;
        return Object.values(r).some((v) => v !== undefined && v !== null && String(v).trim() !== "");
      });

      if (!validRows || validRows.length === 0) {
        setUploadNotification({
          show: true,
          message: "Le fichier Excel sélectionné est vide ou ne contient aucune ligne de données.",
          type: "error",
        });
        return;
      }

      let errorCount = 0;

      const importedEquipments: PFEquipment[] = validRows.map((row, idx) => {
        const pf =
          getFlexibleField(
            row,
            "N° Appareil (PF)",
            "N° Appareil",
            "N° appareil",
            "PF",
            "Appareil",
            "Code PF",
            "Numéro PF",
            "Numero PF",
            "N° PF",
            "pfNumber",
            "Matricule",
            "Equipment Number",
            "Equipment",
            "Installation"
          ) || `PF-IMP-${idx + 1}`;

        const name =
          getFlexibleField(
            row,
            "Name",
            "Nom",
            "Nom Appareil",
            "Nom Appareil / Site",
            "Site",
            "Désignation",
            "Designation",
            "name"
          ) || `Ascenseur ${pf}`;

        const customerAccount =
          getFlexibleField(
            row,
            "Customer account",
            "Customer Account",
            "Compte Client",
            "Client",
            "Customer",
            "customerAccount",
            "Code Client"
          ) || "ACC-9000";

        const projectId =
          getFlexibleField(row, "Project ID", "Project id", "Projet", "Project", "projectId") ||
          "PRJ-9000";

        const city = getFlexibleField(row, "City", "Ville", "city", "Secteur") || "Paris";

        const tech =
          getFlexibleField(
            row,
            "Assigned Technician",
            "Technicien",
            "Tech",
            "Technicien Assigné",
            "Technicien Référent",
            "assignedTechnician"
          ) || "Karim Bennani";

        const contractType =
          getFlexibleField(row, "Type Contrat", "Contrat", "Type de Contrat", "contractType") ||
          "Complet";

        const serviceObject =
          getFlexibleField(row, "Service object", "Service Object", "Type", "Type Appareil", "serviceObject") ||
          "Ascenseur Électrique";

        const street =
          getFlexibleField(row, "Street", "Adresse", "Rue", "street") || "Adresse importée";

        const serviceObjectGroup =
          getFlexibleField(row, "Service object group", "Service Object Group", "Groupe", "serviceObjectGroup") ||
          "Vertical Transportation (VT)";

        const serviceLeader =
          getFlexibleField(row, "Service Leader", "Service leader", "Leader", "serviceLeader") ||
          "Sophie Renard";

        const cpsiRawDate = getFlexibleField(
          row,
          "Date dernier CPSI",
          "Date Dernier CPSI",
          "DATE DERNIER CPSI",
          "Date dernier cpsi",
          "Dernier CPSI",
          "DERNIER CPSI",
          "Date CPSI",
          "DATE CPSI",
          "CPSI",
          "Date dernière visite CPSI",
          "Date de visite CPSI",
          "Date Réalisation CPSI",
          "DATE RÉALISATION CPSI",
          "Last CPSI",
          "Last CPSI Date",
          "Date Visite CPSI"
        );

        const forecastRawDate = getFlexibleField(
          row,
          "Date Prévisionnelle",
          "DATE PRÉVISIONNELLE",
          "Date prévisionnelle",
          "Date Previsionnelle",
          "DATE PREVISIONNELLE",
          "Date Prévisionnelle CPSI",
          "DATE PRÉVISIONNELLE CPSI",
          "Date prévisionnelle CPSI",
          "Date Prévisionnelle Traitement CPSI",
          "DATE PRÉVISIONNELLE TRAITEMENT CPSI",
          "Forecast CPSI Date",
          "Date Prévisionnelle Clôture"
        );

        // Parse CPSI Date: never change the date, flag error as "Erreur"
        const cpsiParsed = parseAndFormatDate(cpsiRawDate || "");
        const cpsiFormatted = cpsiParsed.isError
          ? "Erreur"
          : cpsiParsed.isValid
          ? cpsiParsed.formatted
          : "";
        if (cpsiParsed.isError) errorCount++;

        // Parse Forecast Date if present in Excel: never change the date, flag error as "Erreur"
        let forecastFormatted: string | undefined = undefined;
        if (
          forecastRawDate !== undefined &&
          forecastRawDate !== null &&
          String(forecastRawDate).trim() !== ""
        ) {
          const forecastParsed = parseAndFormatDate(forecastRawDate);
          forecastFormatted = forecastParsed.isError
            ? "Erreur"
            : forecastParsed.isValid
            ? forecastParsed.formatted
            : undefined;
          if (forecastParsed.isError) errorCount++;
        }

        const isCpsiTreated2026 = checkIsCpsiTreated(
          cpsiFormatted,
          String(row["Statut CPSI (2026)"] || row["Statut 12eme Visite CPSI"] || "")
            .toLowerCase()
            .includes("fait") ||
            String(row["Statut CPSI (2026)"] || row["Statut 12eme Visite CPSI"] || "")
              .toLowerCase()
              .includes("réalisée") ||
            String(row["Statut CPSI (2026)"] || row["Statut 12eme Visite CPSI"] || "")
              .toLowerCase()
              .includes("ok")
        );

        // Parse visits count or flags if present in file
        const vCountStr = String(row["Visites Faites (sur 11)"] || row["Visites faites"] || "");
        const vCountMatch = vCountStr.match(/^(\d{1,2})/);
        const vCount = vCountMatch ? parseInt(vCountMatch[1], 10) : 0;

        return {
          id: `pf-import-${Date.now()}-${idx}`,
          pfNumber: String(pf).trim(),
          projectId: String(projectId).trim(),
          customerAccount: String(customerAccount).trim(),
          name: String(name).trim(),
          lastCpsiDate: cpsiFormatted,
          forecastCpsiDate: forecastFormatted,
          contractType: String(contractType).trim(),
          serviceObject: String(serviceObject).trim(),
          street: String(street).trim(),
          city: String(city).trim(),
          serviceObjectGroup: String(serviceObjectGroup).trim(),
          assignedTechnician: String(tech).trim(),
          serviceLeader: String(serviceLeader).trim(),
          visits: {
            v1: Boolean(
              row["V1"] === true ||
                String(row["V1"]).toLowerCase().includes("fait") ||
                String(row["V1"]).toLowerCase().includes("ok") ||
                vCount >= 1
            ),
            v2: Boolean(
              row["V2"] === true ||
                String(row["V2"]).toLowerCase().includes("fait") ||
                String(row["V2"]).toLowerCase().includes("ok") ||
                vCount >= 2
            ),
            v3: Boolean(
              row["V3"] === true ||
                String(row["V3"]).toLowerCase().includes("fait") ||
                String(row["V3"]).toLowerCase().includes("ok") ||
                vCount >= 3
            ),
            v4: Boolean(
              row["V4"] === true ||
                String(row["V4"]).toLowerCase().includes("fait") ||
                String(row["V4"]).toLowerCase().includes("ok") ||
                vCount >= 4
            ),
            v5: Boolean(
              row["V5"] === true ||
                String(row["V5"]).toLowerCase().includes("fait") ||
                String(row["V5"]).toLowerCase().includes("ok") ||
                vCount >= 5
            ),
            v6: Boolean(
              row["V6"] === true ||
                String(row["V6"]).toLowerCase().includes("fait") ||
                String(row["V6"]).toLowerCase().includes("ok") ||
                vCount >= 6
            ),
            v7: Boolean(
              row["V7"] === true ||
                String(row["V7"]).toLowerCase().includes("fait") ||
                String(row["V7"]).toLowerCase().includes("ok") ||
                vCount >= 7
            ),
            v8: Boolean(
              row["V8"] === true ||
                String(row["V8"]).toLowerCase().includes("fait") ||
                String(row["V8"]).toLowerCase().includes("ok") ||
                vCount >= 8
            ),
            v9: Boolean(
              row["V9"] === true ||
                String(row["V9"]).toLowerCase().includes("fait") ||
                String(row["V9"]).toLowerCase().includes("ok") ||
                vCount >= 9
            ),
            v10: Boolean(
              row["V10"] === true ||
                String(row["V10"]).toLowerCase().includes("fait") ||
                String(row["V10"]).toLowerCase().includes("ok") ||
                vCount >= 10
            ),
            v11: Boolean(
              row["V11"] === true ||
                String(row["V11"]).toLowerCase().includes("fait") ||
                String(row["V11"]).toLowerCase().includes("ok") ||
                vCount >= 11
            ),
            cpsi: isCpsiTreated2026,
          },
          nonConformities: [],
        };
      });

      // Replace demo fleet or merge and deduplicate by PF number
      const isCurrentDemo = equipments.length <= 8 && equipments.every((e) => e.id.startsWith("pf-10"));
      let updatedFleet: PFEquipment[];
      if (isCurrentDemo || equipments.length === 0) {
        updatedFleet = importedEquipments;
      } else {
        const importedPfSet = new Set(importedEquipments.map((e) => e.pfNumber));
        const nonDuplicateExisting = equipments.filter((e) => !importedPfSet.has(e.pfNumber));
        updatedFleet = [...importedEquipments, ...nonDuplicateExisting];
      }

      saveEquipments(updatedFleet);
      setUploadNotification({
        show: true,
        message: `Importation réussie : ${importedEquipments.length} appareils chargés dans le parc.${
          errorCount > 0
            ? ` Attention : ${errorCount} date(s) invalide(s) ou corrompue(s) ont été marquées "Erreur" sans modification.`
            : ""
        }`,
        type: errorCount > 0 ? "warning" : "success",
      });
    } catch (err: any) {
      setUploadNotification({
        show: true,
        message: `Erreur de lecture du fichier Excel : ${err.message}`,
        type: "error",
      });
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  // Open Add NC Modal for specific equipment
  const handleOpenAddNc = (eq: PFEquipment) => {
    setTargetEquipmentForNc(eq);
    setNewNcForm({
      code: `NC-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
      description: "",
      severity: "Majeure",
      detectedDate: CURRENT_DATE_STR,
      status: "Ouverte",
      assignedTechnician: eq.assignedTechnician,
      actionPlan: "",
      isCoveredByContract: false,
      associatedQuoteNumber: "",
      estimatedClosureDate: addDays(CURRENT_DATE_STR, 30),
      actionsDone: "",
    });
    setShowAddNcModal(true);
  };

  // Save New NC
  const handleSaveNewNc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEquipmentForNc || !newNcForm.description) return;

    const isCovered = newNcForm.isCoveredByContract ?? false;
    const detected = newNcForm.detectedDate || CURRENT_DATE_STR;
    const createdNc: NonConformity = {
      id: `nc-${Date.now()}`,
      code: newNcForm.code || `NC-${Date.now()}`,
      description: newNcForm.description,
      severity: (newNcForm.severity as any) || "Majeure",
      detectedDate: detected,
      deadlineDate: addDays(detected, 100),
      status: (newNcForm.status as any) || "Ouverte",
      assignedTechnician: newNcForm.assignedTechnician || targetEquipmentForNc.assignedTechnician,
      actionPlan: newNcForm.actionPlan || "Plan de levée à formaliser",
      isCoveredByContract: isCovered,
      associatedQuoteNumber: !isCovered ? newNcForm.associatedQuoteNumber?.trim() || undefined : undefined,
      equipmentPfNumber: targetEquipmentForNc.pfNumber,
      estimatedClosureDate: newNcForm.estimatedClosureDate || addDays(detected, 30),
      actionsDone: newNcForm.actionsDone || "",
    };

    const updated = equipments.map((eq) => {
      if (eq.id === targetEquipmentForNc.id) {
        return {
          ...eq,
          nonConformities: [createdNc, ...eq.nonConformities],
        };
      }
      return eq;
    });

    saveEquipments(updated);
    setShowAddNcModal(false);
    setTargetEquipmentForNc(null);
  };

  // Download NC Forecasts Report in Excel (Filtered if filters applied, all otherwise)
  const handleDownloadNcForecasts = () => {
    const targetEquipments = filteredEquipments;
    const isFiltered = targetEquipments.length !== equipments.length;
    const allNcsData: any[] = [];

    targetEquipments.forEach((eq) => {
      eq.nonConformities.forEach((nc) => {
        const daysRem = getDaysRemaining(nc.detectedDate);
        const isCovered = nc.isCoveredByContract ?? !nc.associatedQuoteNumber;
        allNcsData.push({
          "Code NC": nc.code,
          "N° Appareil (PF)": nc.equipmentPfNumber || eq.pfNumber,
          "Nom Client / Site": eq.name,
          "Compte Client": eq.customerAccount,
          "Ville": eq.city,
          "Gravité": nc.severity,
          "Statut": nc.status,
          "Couverture Maintenance": isCovered ? "Inclus dans Contrat" : "Hors Contrat (Devis Requis)",
          "N° Devis Associé (Hors Contrat)": isCovered ? "N/A (Inclus)" : (nc.associatedQuoteNumber || "En attente de devis"),
          "Date Constat": nc.detectedDate,
          "Échéance 100j": nc.deadlineDate,
          "Jours Restants (100j)": daysRem < 0 ? `DÉPASSÉ (+${Math.abs(daysRem)}j)` : `${daysRem}j`,
          "Date Prévisionnelle Clôture": nc.estimatedClosureDate || "Non définie",
          "Actions Réalisées / Faites": nc.actionsDone || "Aucune action saisie",
          "Plan d'Action Correctif": nc.actionPlan || "",
          "Technicien Assigné": nc.assignedTechnician || eq.assignedTechnician,
          "Date Clôture Effective": nc.resolvedDate || "-",
        });
      });
    });

    if (allNcsData.length === 0) {
      alert(
        isFiltered
          ? "Aucune Non-Conformité trouvée pour les appareils filtrés actuellement."
          : "Aucune Non-Conformité répertoriée dans le parc."
      );
      return;
    }

    const fileName = isFiltered
      ? `Previsions_Cloture_NC_Filtrees_${targetEquipments.length}_Schindler_${CURRENT_DATE_STR}.xlsx`
      : `Previsions_Cloture_NC_Schindler_${CURRENT_DATE_STR}.xlsx`;

    exportToExcel(
      [{ sheetName: isFiltered ? `Prévisions NC (${targetEquipments.length})` : "Previsions_Cloture_NC", data: allNcsData }],
      fileName
    );

    setUploadNotification({
      show: true,
      message: isFiltered
        ? `✓ Export prévisions NC réussi (${allNcsData.length} NC exportées pour ${targetEquipments.length} appareils filtrés)`
        : `✓ Export prévisions NC réussi (${allNcsData.length} NC exportées sur l'ensemble du parc)`,
      type: "success",
    });
    setTimeout(() => {
      setUploadNotification({ show: false, message: "", type: "success" });
    }, 4000);
  };

  // Resolve / Close NC
  const handleResolveNc = (eqId: string, ncId: string) => {
    const updated = equipments.map((eq) => {
      if (eq.id === eqId) {
        return {
          ...eq,
          nonConformities: eq.nonConformities.map((nc) => {
            if (nc.id === ncId) {
              return {
                ...nc,
                status: "Levée / Clôturée" as const,
                resolvedDate: CURRENT_DATE_STR,
              };
            }
            return nc;
          }),
        };
      }
      return eq;
    });
    saveEquipments(updated);
  };

  // Save Equipment Modification
  const handleSaveEditEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipment) return;
    const updated = equipments.map((eq) => (eq.id === editingEquipment.id ? editingEquipment : eq));
    saveEquipments(updated);
    setEditingEquipment(null);
  };

  // Save NC Modification
  const handleSaveEditNc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNc) return;
    const { eqId, nc } = editingNc;
    const updated = equipments.map((eq) => {
      if (eq.id === eqId) {
        return {
          ...eq,
          nonConformities: eq.nonConformities.map((item) => (item.id === nc.id ? nc : item)),
        };
      }
      return eq;
    });
    saveEquipments(updated);
    setEditingNc(null);
  };

  // Download NC Template CSV
  const downloadNcTemplateCsv = () => {
    const csvContent =
      "Code_NC,Num_Appareil_PF,Compte_Client,Client_Syndic,Description_NC,Gravite,Statut,Technicien_Assigne,Num_Devis_Associe,Plan_d_Action\n" +
      "NC-2026-901,1001999,1001999,NEW CAMPUS COMPANY,Batterie 12V 7AH faible et garniture de coulisseau I10 BFK16 usée,Majeure,Ouverte,Karim Bennani,R1009850,Utiliser kit pièces Devis R1009850\n" +
      "NC-2026-902,1005217,1005217,SOCIETE DES CENTRES COMMERCIAUX DE FES,Brosses escalier et contact à clé à remplacer,Mineure,En cours,Youssef Alami,R1008825,Remplacement marche ton naturel 1000/R76 1PC\n" +
      "NC-2026-903,1004127,1004127,SYNDIC RESIDENCE CHAIMAE,Circuit SDIC 51.Q* hors service,Critique / Bloquante,Ouverte,Mehdi Tazi,R1009787,Remplacement carte SDIC 51.Q*\n" +
      "NC-2026-904,1003284,1003284,SOCIETE PALAIS AMANI,STM déréglé pour deux appareils,Majeure,Ouverte,Karim Bennani,R1009800,Système STM 2 appareils à recalibrer\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "Trame_Importation_NC_Schindler.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Auto-Correlate All NCs with PF Equipments & Devis
  const handleAutoCorrelateNcPf = () => {
    let correlatedCount = 0;
    const updated = equipments.map((eq) => {
      const updatedNcs = eq.nonConformities.map((nc) => {
        correlatedCount++;
        return {
          ...nc,
          equipmentPfNumber: nc.equipmentPfNumber || eq.pfNumber,
        };
      });
      return {
        ...eq,
        nonConformities: updatedNcs,
      };
    });
    saveEquipments(updated);
    alert(`Corrélation des Non-Conformités (NC) effectuée avec succès ! ${correlatedCount} NC sont maintenant synchronisées avec les appareils du parc PF.`);
  };

  // Import Coherent NC Demo Data
  const handleImportCoherentNcDemo = () => {
    const demoNcList = [
      {
        pfNumber: "1001999",
        customerAccount: "1001999",
        clientName: "NEW CAMPUS COMPANY",
        quoteNumber: "R1009850",
        ncs: [
          {
            id: "nc-demo-101",
            code: "NC-2026-801",
            description: "Défaut batterie 12V 7AH et usure garniture de coulisseau I10 BFK16",
            severity: "Majeure" as const,
            detectedDate: "2026-08-15",
            deadlineDate: addDays("2026-08-15", 100),
            status: "En cours" as const,
            assignedTechnician: "Karim Bennani",
            actionPlan: "Remplacement avec pièces du Devis R1009850 (Batterie 12V 7AH + Isolant 3300)",
            associatedQuoteNumber: "R1009850",
            equipmentPfNumber: "1001999",
          },
        ],
      },
      {
        pfNumber: "1005217",
        customerAccount: "1005217",
        clientName: "SOCIETE DES CENTRES COMMERCIAUX DE FES",
        quoteNumber: "R1008825",
        ncs: [
          {
            id: "nc-demo-102",
            code: "NC-2026-802",
            description: "S MARCHE 1000/R76 ton naturel endommagée et brosses escalier usées",
            severity: "Majeure" as const,
            detectedDate: "2026-08-10",
            deadlineDate: addDays("2026-08-10", 100),
            status: "Ouverte" as const,
            assignedTechnician: "Youssef Alami",
            actionPlan: "Changement S MARCHE 1000/R76 ton naturel 1PC + Brosses Escalier (Devis R1008825 & R1009798)",
            associatedQuoteNumber: "R1008825",
            equipmentPfNumber: "1005217",
          },
        ],
      },
      {
        pfNumber: "1004127",
        customerAccount: "1004127",
        clientName: "SYNDIC RESIDENCE CHAIMAE",
        quoteNumber: "R1009787",
        ncs: [
          {
            id: "nc-demo-103",
            code: "NC-2026-803",
            description: "Anomalie carte électronique CIRCUIT SDIC 51.Q*",
            severity: "Critique / Bloquante" as const,
            detectedDate: "2026-08-20",
            deadlineDate: addDays("2026-08-20", 100),
            status: "Ouverte" as const,
            assignedTechnician: "Mehdi Tazi",
            actionPlan: "Pose nouveau circuit SDIC 51.Q* (Devis R1009787 - 4.106 MAD)",
            associatedQuoteNumber: "R1009787",
            equipmentPfNumber: "1004127",
          },
        ],
      },
      {
        pfNumber: "1003284",
        customerAccount: "1003284",
        clientName: "SOCIETE PALAIS AMANI",
        quoteNumber: "R1009800",
        ncs: [
          {
            id: "nc-demo-104",
            code: "NC-2026-804",
            description: "Déréglage système STM pour deux appareils ascenseurs",
            severity: "Majeure" as const,
            detectedDate: "2026-08-01",
            deadlineDate: addDays("2026-08-01", 100),
            status: "En cours" as const,
            assignedTechnician: "Karim Bennani",
            actionPlan: "Revisite et recalibrage STM pour 2 appareils (Devis R1009800)",
            associatedQuoteNumber: "R1009800",
            equipmentPfNumber: "1003284",
          },
        ],
      },
      {
        pfNumber: "1004861",
        customerAccount: "1004861",
        clientName: "HYPERMARCHE LV",
        quoteNumber: "R1008153",
        ncs: [
          {
            id: "nc-demo-105",
            code: "NC-2026-805",
            description: "Usure peignes et dysfonctionnement contact à clé serrure",
            severity: "Moyenne" as const,
            detectedDate: "2026-08-25",
            deadlineDate: addDays("2026-08-25", 100),
            status: "Ouverte" as const,
            assignedTechnician: "Youssef Alami",
            actionPlan: "Fourniture et pose PEIGNES + CONTACT A CLE (Devis R1008153)",
            associatedQuoteNumber: "R1008153",
            equipmentPfNumber: "1004861",
          },
        ],
      },
      {
        pfNumber: "1014850",
        customerAccount: "1014850",
        clientName: "SYNDIC RESIDENCE OUMNIA 10",
        quoteNumber: "R1009797",
        ncs: [
          {
            id: "nc-demo-106",
            code: "NC-2026-806",
            description: "Variateur de fréquence en surchauffe intermittente",
            severity: "Critique / Bloquante" as const,
            detectedDate: "2026-08-12",
            deadlineDate: addDays("2026-08-12", 100),
            status: "Ouverte" as const,
            assignedTechnician: "Mehdi Tazi",
            actionPlan: "Remplacement variateur de vitesse (Devis R1009797 - 21.000 MAD)",
            associatedQuoteNumber: "R1009797",
            equipmentPfNumber: "1014850",
          },
        ],
      },
    ];

    let currentEquipments = [...equipments];

    demoNcList.forEach((demoItem, idx) => {
      // Find matching equipment by pfNumber or customerAccount or clientName
      let targetIdx = currentEquipments.findIndex(
        (e) =>
          e.pfNumber === demoItem.pfNumber ||
          e.customerAccount === demoItem.customerAccount ||
          e.name.toLowerCase().includes(demoItem.clientName.toLowerCase())
      );

      // If no equipment matches, use positional equipment or create equipment
      if (targetIdx === -1 && currentEquipments.length > 0) {
        targetIdx = idx % currentEquipments.length;
      }

      if (targetIdx !== -1) {
        const targetEq = currentEquipments[targetIdx];
        const existingCodes = targetEq.nonConformities.map((n) => n.code);
        const newNcs = demoItem.ncs
          .filter((n) => !existingCodes.includes(n.code))
          .map((n) => ({ ...n, equipmentPfNumber: targetEq.pfNumber }));

        currentEquipments[targetIdx] = {
          ...targetEq,
          nonConformities: [...newNcs, ...targetEq.nonConformities],
        };
      }
    });

    saveEquipments(currentEquipments);
    setShowImportNcModal(false);
    alert("Les Non-Conformités (NC) démo avec leurs devis associés ont été rattachées avec succès aux appareils PF !");
  };

  // Import Custom File NC
  const handleImportNcFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await readExcelFile(file);
      if (!parsed.primaryRows || parsed.primaryRows.length === 0) {
        alert("Le fichier de NC ne contient aucune ligne de données.");
        return;
      }

      let importedCount = 0;
      const updatedEquipments = [...equipments];

      parsed.primaryRows.forEach((row, idx) => {
        const pf = String(row["Num_Appareil_PF"] || row["N° Appareil (PF)"] || row["N° Appareil"] || row["PF"] || "").trim();
        const clientAcc = String(row["Compte_Client"] || row["Compte Client"] || row["Customer account"] || "").trim();
        const code = String(row["Code_NC"] || row["Code NC"] || `NC-IMP-${Date.now()}-${idx}`).trim();
        const desc = String(row["Description_NC"] || row["Description NC"] || row["Description"] || "").trim();
        const severityRaw = String(row["Gravite"] || row["Gravité"] || "Majeure").trim();
        const statusRaw = String(row["Statut"] || "Ouverte").trim();
        const tech = String(row["Technicien_Assigne"] || row["Technicien"] || "Karim Bennani").trim();
        const actionPlan = String(row["Plan_d_Action"] || row["Plan d'Action"] || "").trim();
        const detectedDate = formatExcelDate(row["Date_Detection"] || row["Date Constat"] || CURRENT_DATE_STR);

        if (!desc && !code) return;

        // Find target equipment by pfNumber or customerAccount or fallback to first equipment
        let targetEq = updatedEquipments.find(
          (eq) => (pf && eq.pfNumber === pf) || (clientAcc && eq.customerAccount === clientAcc)
        );

        if (!targetEq && updatedEquipments.length > 0) {
          targetEq = updatedEquipments[idx % updatedEquipments.length];
        }

        if (targetEq) {
          const newNc: NonConformity = {
            id: `nc-file-${Date.now()}-${idx}`,
            code,
            description: desc || "Non-conformité importée via fichier",
            severity: (severityRaw as any) || "Majeure",
            detectedDate,
            deadlineDate: addDays(detectedDate, 100),
            status: (statusRaw as any) || "Ouverte",
            assignedTechnician: tech,
            actionPlan: actionPlan || "Plan de levée à définir",
          };

          const eqIdx = updatedEquipments.findIndex((e) => e.id === targetEq!.id);
          if (eqIdx !== -1) {
            updatedEquipments[eqIdx] = {
              ...updatedEquipments[eqIdx],
              nonConformities: [newNc, ...updatedEquipments[eqIdx].nonConformities],
            };
            importedCount++;
          }
        }
      });

      saveEquipments(updatedEquipments);
      setShowImportNcModal(false);
      alert(`${importedCount} Non-Conformités importées et rattachées aux appareils PF avec succès ! (Les devis restent intacts)`);
    } catch (err: any) {
      alert(`Erreur lors de l'importation du fichier NC : ${err.message}`);
    } finally {
      if (ncFileInputRef.current) ncFileInputRef.current.value = "";
    }
  };

  // Run AI Operational Audit
  const handleRunAiAudit = async () => {
    setLoadingAi(true);
    setAiAuditResult(null);

    try {
      const res = await fetch("/api/gemini/pf-audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipments,
          filterSummary: {
            total: equipments.length,
            inspectionsProgress: `${completedInspections}/${totalInspectionSlots} (${inspectionProgressPct}%)`,
            cpsiProgress: `${completedCpsi}/${totalEquipments} (${cpsiProgressPct}%)`,
            overdueNcsCount: overdueNcs.length,
            criticalNcsCount: criticalNcs.length,
            vigilanceNcsCount: vigilanceNcs.length,
          },
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setAiAuditResult(data.text);
      setActiveSubView("ai_audit");
    } catch (err: any) {
      setAiAuditResult(`⚠️ Erreur d'audit IA : ${err.message}`);
    } finally {
      setLoadingAi(false);
    }
  };

  // Export CSV conforming to the exact table schema + visits + NC
  const handleExportCsv = () => {
    const headers = [
      "N° Appareil (PF)",
      "Project ID",
      "Customer account",
      "Name",
      "Date dernier CPSI",
      "Type Contrat",
      "Service object",
      "Street",
      "City",
      "Service object group",
      "Assigned Technician",
      "Service Leader",
      "Visites Faites (sur 11)",
      "Statut 12eme Visite CPSI",
      "Nb NC Ouvertes",
      "Delai NC Min Restant (Jours)",
      "Statut Conformite NC (<100j)",
    ];

    const targetEquipments = filteredEquipments;
    const isFiltered = targetEquipments.length !== equipments.length;

    const rows = targetEquipments.map((eq) => {
      let vCount = 0;
      for (let i = 1; i <= 11; i++) {
        if (eq.visits[`v${i}` as keyof InspectionVisits]) vCount++;
      }
      const openNcs = eq.nonConformities.filter((n) => n.status !== "Levée / Clôturée");
      const minDaysRem =
        openNcs.length > 0
          ? Math.min(...openNcs.map((n) => getDaysRemaining(n.detectedDate)))
          : "N/A";
      let ncStatusText = "Conforme (Aucune NC)";
      if (typeof minDaysRem === "number") {
        if (minDaysRem < 0) ncStatusText = `DÉPASSÉ (+${Math.abs(minDaysRem)} jours de retard)`;
        else if (minDaysRem <= 15) ncStatusText = `ALERTE CRITIQUE (${minDaysRem}j restants)`;
        else ncStatusText = `En cours (${minDaysRem}j restants)`;
      }

      return [
        `"${eq.pfNumber}"`,
        `"${eq.projectId}"`,
        `"${eq.customerAccount}"`,
        `"${eq.name.replace(/"/g, '""')}"`,
        `"${eq.lastCpsiDate}"`,
        `"${eq.contractType}"`,
        `"${eq.serviceObject}"`,
        `"${eq.street.replace(/"/g, '""')}"`,
        `"${eq.city}"`,
        `"${eq.serviceObjectGroup}"`,
        `"${eq.assignedTechnician}"`,
        `"${eq.serviceLeader}"`,
        `${vCount}/11`,
        checkIsCpsiTreated(eq.lastCpsiDate, eq.visits?.cpsi) ? "Réalisée (OK)" : "À Réaliser (En attente)",
        openNcs.length,
        minDaysRem,
        `"${ncStatusText}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    const fileName = isFiltered
      ? `Parc_PF_Filtres_${targetEquipments.length}_Equipements_${CURRENT_DATE_STR}.csv`
      : `Parc_PF_Equipements_CPSI_NC_${CURRENT_DATE_STR}.csv`;
    link.download = fileName;
    link.click();
  };

  // Recharts Data Prep
  const techChartData = useMemo(() => {
    const map: Record<string, { total: number; vSum: number; cpsiSum: number; ncSum: number }> = {};
    equipments.forEach((eq) => {
      const tech = eq.assignedTechnician || "Non assigné";
      if (!map[tech]) map[tech] = { total: 0, vSum: 0, cpsiSum: 0, ncSum: 0 };
      map[tech].total += 1;

      let vCount = 0;
      for (let i = 1; i <= 11; i++) {
        if (eq.visits[`v${i}` as keyof InspectionVisits]) vCount++;
      }
      map[tech].vSum += vCount;
      if (checkIsCpsiTreated(eq.lastCpsiDate, eq.visits?.cpsi)) map[tech].cpsiSum += 1;
      map[tech].ncSum += eq.nonConformities.filter((n) => n.status !== "Levée / Clôturée").length;
    });

    return Object.entries(map).map(([tech, data]) => ({
      name: tech,
      tauxVisites: Math.round((data.vSum / (data.total * 11)) * 100),
      tauxCpsi: Math.round((data.cpsiSum / data.total) * 100),
      appareils: data.total,
      ncOuvertes: data.ncSum,
    }));
  }, [equipments]);

  const ncPieData = useMemo(() => {
    return [
      { name: "Conformes (<40j écoulés)", value: Math.max(1, openNcsList.length - (overdueNcs.length + criticalNcs.length + vigilanceNcs.length)), fill: "#10b981" },
      { name: "Vigilance (60-85j)", value: vigilanceNcs.length, fill: "#f59e0b" },
      { name: "Critique (86-99j)", value: criticalNcs.length, fill: "#ef4444" },
      { name: "DÉPASSÉ (>=100j)", value: overdueNcs.length, fill: "#991b1b" },
    ].filter((d) => d.value > 0);
  }, [openNcsList, overdueNcs, criticalNcs, vigilanceNcs]);

  return (
    <div className="space-y-6">
      {/* Top Banner & 100-Day Regulatory Alert */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900/90 to-blue-950/40 border border-blue-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Wrench className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-100 text-sm">
                Module PF - Parc Équipements, 11 Visites + CPSI & Règle des 100 Jours NC
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 text-[10px] font-bold">
                11 Visites + Visite 12 CPSI
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Règle stricte de conformité : toute Non-Conformité (NC) constatée doit impérativement être résolue avant 100 jours.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handleRunAiAudit}
            disabled={loadingAi}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{loadingAi ? "Audit en cours..." : "Audit IA Parc & Conformité 100j"}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            Total Parc PF
          </span>
          <p className="text-2xl font-bold text-slate-100 font-mono my-1">{totalEquipments}</p>
          <span className="text-[10px] text-slate-500">Appareils sous contrat</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-blue-500/30 flex flex-col justify-between">
          <span className="text-[11px] text-blue-300 font-semibold uppercase tracking-wider">
            11 Visites Régulières
          </span>
          <p className="text-2xl font-bold text-blue-400 font-mono my-1">
            {completedInspections} <span className="text-xs text-slate-400">/ {totalInspectionSlots}</span>
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-blue-500 h-1.5 rounded-full transition-all"
              style={{ width: `${inspectionProgressPct}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-blue-400 mt-1">{inspectionProgressPct}% réalisé</span>
        </div>

        <div
          onClick={() => {
            setActiveSubView("visits");
            setShowCpsiScannerInline(true);
          }}
          className="p-3.5 rounded-xl bg-slate-900/90 hover:bg-slate-900 border border-teal-500/40 hover:border-teal-400 flex flex-col justify-between cursor-pointer transition-all group"
          title="Cliquer pour accéder à la Section CPSI et au Scanner de PV"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-teal-300 font-semibold uppercase tracking-wider">
              12ème Visite CPSI
            </span>
            <span className="text-[10px] bg-teal-500/20 group-hover:bg-teal-500 text-teal-300 group-hover:text-slate-950 px-1.5 py-0.5 rounded font-bold transition-all">
              📂 Scanner PV
            </span>
          </div>
          <p className="text-2xl font-bold text-teal-400 font-mono my-1">
            {completedCpsi} <span className="text-xs text-slate-400">/ {totalEligibleCpsi} éligibles</span>
          </p>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-teal-500 h-1.5 rounded-full transition-all"
              style={{ width: `${cpsiProgressPct}%` }}
            ></div>
          </div>
          <span className="text-[10px] text-teal-400 mt-1">{cpsiProgressPct}% validées 2026 &bull; Exclus: MC, Plateforme, etc.</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
            NC Ouvertes
          </span>
          <p className="text-2xl font-bold text-amber-400 font-mono my-1">{openNcsList.length}</p>
          <span className="text-[10px] text-slate-400">En cours de résolution</span>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-rose-500/40 flex flex-col justify-between">
          <span className="text-[11px] text-rose-300 font-semibold uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3 text-rose-400" />
            Urgence &lt; 15j NC
          </span>
          <p className="text-2xl font-bold text-rose-400 font-mono my-1">{criticalNcs.length}</p>
          <span className="text-[10px] text-rose-400/80">Risque seuil 100 jours</span>
        </div>

        <div
          className={`p-3.5 rounded-xl border flex flex-col justify-between ${
            overdueNcs.length > 0
              ? "bg-rose-950/40 border-rose-600 shadow-lg shadow-rose-950/50 animate-pulse"
              : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <span className="text-[11px] text-rose-400 font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            NC &gt; 100j (DÉPASSÉ)
          </span>
          <p className="text-2xl font-extrabold text-rose-500 font-mono my-1">
            {overdueNcs.length}
          </p>
          <span className="text-[10px] text-rose-400 font-semibold">
            {overdueNcs.length > 0 ? "⚠️ HORS DÉLAI LÉGAL" : "0 retard critique"}
          </span>
        </div>
      </div>

      {/* Upload / Status Notification Banner */}
      {uploadNotification && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
            uploadNotification.type === "error"
              ? "bg-rose-950/70 border-rose-600/50 text-rose-200"
              : uploadNotification.type === "warning"
              ? "bg-amber-950/70 border-amber-600/50 text-amber-200"
              : "bg-emerald-950/70 border-emerald-600/50 text-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {uploadNotification.type === "error" ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : uploadNotification.type === "warning" ? (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{uploadNotification.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadNotification(null)}
            className="text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sub-Navigation Buttons */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubView("list")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubView === "list"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Liste du Parc PF (Trame Complète)</span>
        </button>

        <button
          onClick={() => setActiveSubView("visits")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubView === "visits"
              ? "bg-gradient-to-r from-blue-600 to-teal-600 text-white shadow-md shadow-teal-500/20 ring-1 ring-teal-400/50"
              : "bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 border border-slate-700"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-400" />
          <span>Matrice des 11 Visites & Contrôles CPSI (12e)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 text-[10px] font-bold border border-teal-500/30">
            📂 Scanner PV
          </span>
        </button>

        <button
          onClick={() => setActiveSubView("nc_control")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubView === "nc_control"
              ? "bg-rose-600 text-white shadow-sm"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Tour de Contrôle NC (&lt; 100 Jours)</span>
          {overdueNcs.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
              {overdueNcs.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveSubView("analytics")}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
            activeSubView === "analytics"
              ? "bg-blue-600 text-white shadow-sm"
              : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Analyses & Tableaux de Bord</span>
        </button>

        <button
          onClick={() => setActiveSubView("archived")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
            activeSubView === "archived"
              ? "bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20 ring-1 ring-amber-400/50"
              : "bg-slate-900/80 text-amber-300/90 hover:text-amber-200 hover:bg-slate-800 border border-amber-500/30"
          }`}
        >
          <Archive className="w-4 h-4 text-amber-400" />
          <span>Parc Hors Garantie / Résilié (Duplicata)</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
            {archivedEquipments.length}
          </span>
        </button>

        {aiAuditResult && (
          <button
            onClick={() => setActiveSubView("ai_audit")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
              activeSubView === "ai_audit"
                ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-sm"
                : "bg-slate-900/80 text-indigo-300 hover:bg-slate-800"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Rapport d'Audit IA</span>
          </button>
        )}
      </div>

      {/* VIEW 1: TRULL SCHEMA TABLE (EXACT USER IMAGE HEADERS) */}
      {activeSubView === "list" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3 text-xs shadow-lg">
            {/* Ligne 1 : Recherche principale + Villes + Techniciens + Statut NC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
              {/* Search */}
              <div className="lg:col-span-3 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par N° PF, Nom, Client, Ville, Tech..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-2 text-slate-200 focus:outline-none focus:border-blue-500 placeholder:text-slate-500"
                />
              </div>

              {/* City Filter */}
              <div>
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Toutes les Villes ({cities.length})</option>
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tech Filter */}
              <div>
                <select
                  value={selectedTech}
                  onChange={(e) => setSelectedTech(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Tous les Techniciens</option>
                  {technicians.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              {/* NC Filter */}
              <div>
                <select
                  value={selectedNcFilter}
                  onChange={(e) => setSelectedNcFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="all">Statut NC (Tous)</option>
                  <option value="has_nc">Avec NC Ouverte</option>
                  <option value="urgent_nc">⚠️ NC Urgente (&lt; 15j)</option>
                  <option value="overdue_nc">⛔ NC DÉPASSÉE (&gt; 100j)</option>
                </select>
              </div>
            </div>

            {/* Ligne 2 : Filtres CPSI (Statut global, Date du Dernier CPSI, Date Prévisionnelle CPSI, Mois Précis & Reset) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2.5 border-t border-slate-800/80">
              {/* Statut CPSI Global */}
              <div>
                <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-teal-400" />
                  Visite 12 CPSI (Statut)
                </label>
                <select
                  value={selectedCpsiFilter}
                  onChange={(e) => setSelectedCpsiFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  <option value="all">Visite 12 CPSI (Toutes - {totalEquipments})</option>
                  <option value="done">✅ CPSI Traité 2026 ({completedCpsi})</option>
                  <option value="pending">⏳ CPSI À Traiter 2026 ({totalEligibleCpsi - completedCpsi})</option>
                  <option value="eligible_only">Soumis à CPSI ({totalEligibleCpsi})</option>
                  <option value="excluded_only">Exclus de CPSI ({totalEquipments - totalEligibleCpsi})</option>
                  {errorCpsiCount > 0 && (
                    <option value="error">⚠️ Dates en Erreur ({errorCpsiCount})</option>
                  )}
                </select>
              </div>

              {/* Filtre Date du Dernier CPSI */}
              <div>
                <label className="block text-[10px] text-teal-300 font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-teal-400" />
                    Date Dernier CPSI
                  </span>
                  {selectedLastCpsiDateFilter !== "all" && (
                    <span className="text-[9px] bg-teal-500/20 text-teal-300 px-1 py-0.2 rounded font-mono">
                      Actif
                    </span>
                  )}
                </label>
                <select
                  value={selectedLastCpsiDateFilter}
                  onChange={(e) => setSelectedLastCpsiDateFilter(e.target.value)}
                  className={`w-full bg-slate-950 rounded-lg p-2 text-slate-200 focus:outline-none transition-all ${
                    selectedLastCpsiDateFilter !== "all"
                      ? "border-2 border-teal-500 text-teal-200 font-medium bg-teal-950/20"
                      : "border border-slate-700 hover:border-teal-500/50"
                  }`}
                >
                  <option value="all">Date Dernier CPSI (Toutes - {totalEquipments})</option>
                  {lastCpsiDateStats.sortedYears.map((yr) => (
                    <option key={yr} value={`year_${yr}`}>
                      📅 Réalisé en {yr} ({lastCpsiDateStats.yearCounts[yr]})
                    </option>
                  ))}
                  {lastCpsiDateStats.before2024Count > 0 && (
                    <option value="year_before_2024">
                      📅 Réalisé avant 2024 (&lt; 2024) ({lastCpsiDateStats.before2024Count})
                    </option>
                  )}
                  <option value="has_date">Avec date renseignée ({lastCpsiDateStats.totalWithDate})</option>
                  <option value="no_date">Sans date / Non renseignée ({lastCpsiDateStats.noDateCount})</option>
                  {lastCpsiDateStats.errorCount > 0 && (
                    <option value="error">⚠️ Date en Erreur ({lastCpsiDateStats.errorCount})</option>
                  )}
                </select>
              </div>

              {/* Filtre Date Prévisionnelle CPSI */}
              <div>
                <label className="block text-[10px] text-purple-300 font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-purple-400" />
                    Date Prévisionnelle CPSI
                  </span>
                  {selectedForecastCpsiDateFilter !== "all" && (
                    <span className="text-[9px] bg-purple-500/20 text-purple-300 px-1 py-0.2 rounded font-mono">
                      Actif
                    </span>
                  )}
                </label>
                <select
                  value={selectedForecastCpsiDateFilter}
                  onChange={(e) => setSelectedForecastCpsiDateFilter(e.target.value)}
                  className={`w-full bg-slate-950 rounded-lg p-2 text-slate-200 focus:outline-none transition-all ${
                    selectedForecastCpsiDateFilter !== "all"
                      ? "border-2 border-purple-500 text-purple-200 font-medium bg-purple-950/20"
                      : "border border-slate-700 hover:border-purple-500/50"
                  }`}
                >
                  <option value="all">Date Prévisionnelle (Toutes - {totalEquipments})</option>
                  {forecastCpsiDateStats.overdueCount > 0 && (
                    <option value="overdue">
                      🔴 Échéance Dépassée / En retard ({forecastCpsiDateStats.overdueCount})
                    </option>
                  )}
                  {forecastCpsiDateStats.thisMonthCount > 0 && (
                    <option value="this_month">
                      ⚡ Échéance ce mois-ci ({forecastCpsiDateStats.thisMonthCount})
                    </option>
                  )}
                  <option value="next_30">
                    📅 Prochains 30 jours ({forecastCpsiDateStats.next30Count})
                  </option>
                  <option value="next_90">
                    📅 Prochains 90 jours ({forecastCpsiDateStats.next90Count})
                  </option>
                  {forecastCpsiDateStats.sortedYears.map((yr) => (
                    <option key={yr} value={`year_${yr}`}>
                      📅 Prévision en {yr} ({forecastCpsiDateStats.yearCounts[yr]})
                    </option>
                  ))}
                  <option value="to_plan">
                    ⏳ À planifier ({forecastCpsiDateStats.toPlanCount})
                  </option>
                  {forecastCpsiDateStats.errorCount > 0 && (
                    <option value="error">
                      ⚠️ Date en Erreur ({forecastCpsiDateStats.errorCount})
                    </option>
                  )}
                </select>
              </div>

              {/* Mois Précis (Dernier & Prévisionnel) + Reset */}
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-slate-400 font-semibold mb-1 uppercase tracking-wider flex items-center justify-between">
                    <span>Mois Précis</span>
                    {(customLastCpsiMonth || customForecastCpsiMonth) && (
                      <button
                        type="button"
                        onClick={() => {
                          setCustomLastCpsiMonth("");
                          setCustomForecastCpsiMonth("");
                        }}
                        className="text-[9px] text-rose-400 hover:underline cursor-pointer"
                      >
                        Effacer
                      </button>
                    )}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className="relative" title="Mois précis du Dernier CPSI">
                      <input
                        type="month"
                        value={customLastCpsiMonth}
                        onChange={(e) => setCustomLastCpsiMonth(e.target.value)}
                        className={`w-full bg-slate-950 rounded-lg px-2 py-1.5 text-[11px] text-teal-300 focus:outline-none ${
                          customLastCpsiMonth
                            ? "border-2 border-teal-500 bg-teal-950/20 font-bold"
                            : "border border-slate-700"
                        }`}
                      />
                      <span className="block text-[8px] text-teal-400/80 font-mono text-center truncate">
                        {customLastCpsiMonth ? `Dernier: ${customLastCpsiMonth}` : "Mois Dernier"}
                      </span>
                    </div>
                    <div className="relative" title="Mois précis de la Date Prévisionnelle">
                      <input
                        type="month"
                        value={customForecastCpsiMonth}
                        onChange={(e) => setCustomForecastCpsiMonth(e.target.value)}
                        className={`w-full bg-slate-950 rounded-lg px-2 py-1.5 text-[11px] text-purple-300 focus:outline-none ${
                          customForecastCpsiMonth
                            ? "border-2 border-purple-500 bg-purple-950/20 font-bold"
                            : "border border-slate-700"
                        }`}
                      />
                      <span className="block text-[8px] text-purple-400/80 font-mono text-center truncate">
                        {customForecastCpsiMonth ? `Prévis: ${customForecastCpsiMonth}` : "Mois Prévis."}
                      </span>
                    </div>
                  </div>
                </div>

                {hasAnyActiveFilter && (
                  <button
                    type="button"
                    onClick={resetAllFilters}
                    className="h-9 px-3 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-600/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs shrink-0"
                    title="Réinitialiser tous les filtres"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Quick Filter Badges Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider mr-1">
                Filtres Rapides :
              </span>
              <button
                type="button"
                onClick={() => {
                  setSelectedCpsiFilter("all");
                  setSelectedLastCpsiDateFilter("all");
                  setSelectedForecastCpsiDateFilter("all");
                  setCustomLastCpsiMonth("");
                  setCustomForecastCpsiMonth("");
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedCpsiFilter === "all" &&
                  selectedLastCpsiDateFilter === "all" &&
                  selectedForecastCpsiDateFilter === "all" &&
                  !customLastCpsiMonth &&
                  !customForecastCpsiMonth
                    ? "bg-slate-700 text-white font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                Tous ({totalEquipments})
              </button>
              <button
                type="button"
                onClick={() => setSelectedCpsiFilter(selectedCpsiFilter === "done" ? "all" : "done")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCpsiFilter === "done"
                    ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30"
                    : "bg-teal-950/40 text-teal-300 border border-teal-500/30 hover:bg-teal-900/50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Traités 2026 ({completedCpsi})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCpsiFilter(selectedCpsiFilter === "pending" ? "all" : "pending")}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCpsiFilter === "pending"
                    ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30"
                    : "bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/50"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>À Traiter 2026 ({totalEligibleCpsi - completedCpsi})</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedLastCpsiDateFilter(
                    selectedLastCpsiDateFilter === "year_2026" ? "all" : "year_2026"
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedLastCpsiDateFilter === "year_2026"
                    ? "bg-teal-600 text-white shadow-md shadow-teal-600/30 ring-1 ring-teal-300"
                    : "bg-slate-950 text-teal-300 border border-teal-500/30 hover:bg-teal-950/40"
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Dernier CPSI 2026 ({lastCpsiDateStats.yearCounts[2026] || 0})</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setSelectedForecastCpsiDateFilter(
                    selectedForecastCpsiDateFilter === "year_2027" ? "all" : "year_2027"
                  )
                }
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                  selectedForecastCpsiDateFilter === "year_2027"
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/30 ring-1 ring-purple-300"
                    : "bg-slate-950 text-purple-300 border border-purple-500/30 hover:bg-purple-950/40"
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Prévis. 2027 ({forecastCpsiDateStats.yearCounts[2027] || 0})</span>
              </button>
              {forecastCpsiDateStats.overdueCount > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    setSelectedForecastCpsiDateFilter(
                      selectedForecastCpsiDateFilter === "overdue" ? "all" : "overdue"
                    )
                  }
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                    selectedForecastCpsiDateFilter === "overdue"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/50"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Échéance Dépassée ({forecastCpsiDateStats.overdueCount})</span>
                </button>
              )}
              {errorCpsiCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCpsiFilter("error");
                    setSelectedLastCpsiDateFilter("error");
                    setSelectedForecastCpsiDateFilter("error");
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    selectedCpsiFilter === "error" || selectedLastCpsiDateFilter === "error"
                      ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                      : "bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/50"
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Dates en Erreur ({errorCpsiCount})</span>
                </button>
              )}
            </div>

            <div className="text-[11px] text-slate-400 font-mono">
              Affichage : <span className="text-teal-400 font-bold">{filteredEquipments.length}</span> / {totalEquipments} appareils
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs shadow-md">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddEquipmentModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Ajouter un Appareil (PF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSubView("visits");
                  setShowCpsiScannerInline(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 text-teal-300 border border-teal-500/40 font-semibold transition-colors cursor-pointer"
                title="Accéder à la section CPSI et au Scanner de PV"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                <span>📂 Section CPSI & Scanner PV</span>
              </button>

              {/* NC Import with Template */}
              <button
                type="button"
                onClick={() => setShowImportNcModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600/30 hover:bg-amber-600/40 text-amber-300 border border-amber-500/40 font-semibold transition-colors cursor-pointer shadow-xs"
                title="Importer des Non-Conformités avec trame Excel/CSV cohérente avec les devis et comptes clients"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                <span>Importer NC (avec Trame)</span>
              </button>

              {/* Auto-Correlate Button */}
              <button
                type="button"
                onClick={handleAutoCorrelateNcPf}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 font-semibold transition-colors cursor-pointer shadow-xs"
                title="Synchroniser et corréler automatiquement toutes les NC avec les appareils du parc PF et devis"
              >
                <Zap className="w-3.5 h-3.5 text-indigo-400" />
                <span>Corréler NC & PF</span>
              </button>

              {/* Télécharger Prévisions NC */}
              <button
                type="button"
                onClick={handleDownloadNcForecasts}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/30 hover:bg-rose-600/40 text-rose-300 border border-rose-500/40 font-semibold transition-colors cursor-pointer shadow-xs"
                title={
                  filteredEquipments.length !== equipments.length
                    ? `Télécharger les prévisions NC des ${filteredEquipments.length} appareils filtrés au format Excel (.xlsx)`
                    : "Télécharger les prévisions de clôture des Non-Conformités au format Excel (.xlsx)"
                }
              >
                <Download className="w-3.5 h-3.5 text-rose-400" />
                <span>
                  Prévisions NC (.xlsx)
                  {filteredEquipments.length !== equipments.length && (
                    <span className="ml-1 text-[10px] bg-rose-950/90 text-rose-200 px-1.5 py-0.5 rounded font-mono font-bold">
                      {filteredEquipments.length} filtrés
                    </span>
                  )}
                </span>
              </button>

              {/* Excel Direct Export */}
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold transition-colors cursor-pointer shadow-xs"
                title={
                  filteredEquipments.length !== equipments.length
                    ? `Exporter les ${filteredEquipments.length} appareils filtrés (avec leurs NC) au format Excel (.xlsx)`
                    : `Exporter l'intégralité du parc (${equipments.length} appareils) au format Excel natif (.xlsx)`
                }
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                <span>
                  Exporter Excel (.xlsx)
                  {filteredEquipments.length !== equipments.length ? (
                    <span className="ml-1 text-[10px] bg-emerald-950/90 text-emerald-300 px-1.5 py-0.5 rounded font-mono font-bold">
                      {filteredEquipments.length}/{equipments.length}
                    </span>
                  ) : (
                    <span className="ml-1 text-[10px] text-emerald-400/80 font-mono">
                      (Tout)
                    </span>
                  )}
                </span>
              </button>

              {/* Excel Direct Import */}
              <button
                type="button"
                onClick={() => {
                  if (excelInputRef.current) {
                    excelInputRef.current.value = "";
                    excelInputRef.current.click();
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold transition-colors cursor-pointer shadow-xs"
                title="Importer un fichier Excel ou CSV (.xlsx, .xls, .csv) directement dans le parc"
              >
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Importer Excel</span>
              </button>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                className="hidden"
                onChange={handleImportExcel}
              />

              {/* Purge All Button */}
              <button
                type="button"
                onClick={() => setShowPurgeModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800/60 font-semibold transition-colors cursor-pointer shadow-xs"
                title="Purger l'intégralité du parc d'appareils PF et des NC en un clic"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                <span>Purger Tout le Parc</span>
              </button>

              {/* Reset to Demo */}
              <button
                type="button"
                onClick={() => saveEquipments(INITIAL_PF_EQUIPMENTS)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 transition-colors cursor-pointer"
                title="Restaurer le jeu d'essai standard"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Démo</span>
              </button>
            </div>

            <div className="text-slate-400 text-xs font-mono">
              Affichage de <span className="text-blue-400 font-bold">{filteredEquipments.length}</span> sur{" "}
              <span>{equipments.length}</span> appareils PF
            </div>
          </div>

          {/* Table Container conforming strictly to user header image */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse font-sans">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 font-bold border-b border-slate-800 uppercase text-[11px] tracking-wider whitespace-nowrap">
                    <th className="p-3 text-blue-400">N° Appareil (PF)</th>
                    <th className="p-3">Project ID</th>
                    <th className="p-3">Customer account</th>
                    <th className="p-3">Name</th>
                    <th className="p-3 text-teal-400">Date dernier CPSI</th>
                    <th className="p-3 text-purple-300">Date prévisionnelle CPSI</th>
                    <th className="p-3">Type Contrat</th>
                    <th className="p-3">Service object</th>
                    <th className="p-3">Street</th>
                    <th className="p-3">City</th>
                    <th className="p-3">Service object group</th>
                    <th className="p-3 text-cyan-300">Assigned Technician</th>
                    <th className="p-3 text-indigo-300">Service Leader</th>
                    <th className="p-3 text-center">11 Visites</th>
                    <th className="p-3 text-center text-teal-300">CPSI (2026)</th>
                    <th className="p-3 text-center">NC (&lt;100j)</th>
                    <th className="p-3 text-cyan-300">Commentaires Appareil</th>
                    <th className="p-3 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {displayedEquipments.map((eq) => {
                    let vCount = 0;
                    for (let i = 1; i <= 11; i++) {
                      if (eq.visits[`v${i}` as keyof InspectionVisits]) vCount++;
                    }

                    const openNcs = eq.nonConformities.filter((n) => n.status !== "Levée / Clôturée");
                    const minDaysRem =
                      openNcs.length > 0
                        ? Math.min(...openNcs.map((n) => getDaysRemaining(n.detectedDate)))
                        : null;

                    return (
                      <React.Fragment key={eq.id}>
                        <tr className={`hover:bg-slate-800/40 transition-colors ${expandedRowIds.has(eq.id) ? "bg-slate-800/50" : ""}`}>
                          {/* N° Appareil (PF) */}
                          <td className="p-3 font-mono font-bold text-blue-400 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleRowExpanded(eq.id)}
                              className="inline-flex items-center gap-1.5 hover:text-blue-300 transition-colors cursor-pointer"
                              title="Cliquer pour afficher/masquer les Non-Conformités (NC) rattachées"
                            >
                              {expandedRowIds.has(eq.id) ? (
                                <ChevronDown className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                              )}
                              <span>{eq.pfNumber}</span>
                            </button>
                          </td>

                          {/* Project ID */}
                          <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                            {eq.projectId}
                          </td>

                          {/* Customer account */}
                          <td className="p-3 font-mono text-slate-400 whitespace-nowrap">
                            {eq.customerAccount}
                          </td>

                          {/* Name + Direct NC Badges */}
                          <td className="p-3 font-semibold text-slate-100 min-w-[220px]">
                            <div>{eq.name}</div>
                            {eq.nonConformities.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {eq.nonConformities.map((nc) => (
                                  <button
                                    key={nc.id}
                                    type="button"
                                    onClick={() => toggleRowExpanded(eq.id)}
                                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono cursor-pointer transition-all hover:scale-105 ${
                                      nc.status === "Levée / Clôturée"
                                        ? "bg-slate-800 text-slate-400 border border-slate-700 opacity-75"
                                        : nc.severity === "Critique / Bloquante"
                                        ? "bg-rose-950 text-rose-300 border border-rose-700 font-bold"
                                        : "bg-amber-950/80 text-amber-300 border border-amber-700 font-medium"
                                    }`}
                                    title={`Cliquer pour voir les détails de la NC ${nc.code}`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                    <span>{nc.code}</span>
                                    {nc.associatedQuoteNumber && (
                                      <span className="text-cyan-300 font-sans font-semibold">
                                        (Devis {nc.associatedQuoteNumber})
                                      </span>
                                    )}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>

                          {/* Date dernier CPSI */}
                          <td className="p-3 font-mono text-teal-300 whitespace-nowrap">
                            {eq.lastCpsiDate === "Erreur" || formatExcelDate(eq.lastCpsiDate) === "Erreur" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-600/50 font-bold text-xs">
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                Erreur
                              </span>
                            ) : (
                              formatExcelDate(eq.lastCpsiDate) || (
                                <span className="text-slate-500 italic text-xs">Non renseignée</span>
                              )
                            )}
                          </td>

                          {/* Date prévisionnelle CPSI */}
                          <td className="p-3 font-mono font-bold text-purple-300 whitespace-nowrap bg-purple-950/20">
                            {getForecastCpsiDate(eq) === "Erreur" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-950/70 text-rose-300 border border-rose-600/50 font-bold text-xs">
                                <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                                Erreur
                              </span>
                            ) : (
                              getForecastCpsiDate(eq)
                            )}
                          </td>

                          {/* Type Contrat */}
                          <td className="p-3 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                              {eq.contractType}
                            </span>
                          </td>

                          {/* Service object */}
                          <td className="p-3 whitespace-nowrap text-slate-200">
                            <div>{eq.serviceObject}</div>
                            {(() => {
                              const cat = getCpsiCategory(eq);
                              if (cat === "ELEVATOR") {
                                return (
                                  <span className="text-[9px] text-blue-300 font-bold bg-blue-500/20 px-1.5 py-0.2 rounded border border-blue-500/30 inline-block mt-0.5">
                                    Ascenseur (1 an)
                                  </span>
                                );
                              }
                              if (cat === "ESCALATOR" || cat === "MOV_WALK") {
                                return (
                                  <span className="text-[9px] text-amber-300 font-bold bg-amber-500/20 px-1.5 py-0.2 rounded border border-amber-500/30 inline-block mt-0.5">
                                    Escalier / Trottoir (2 ans)
                                  </span>
                                );
                              }
                              return (
                                <span className="text-[9px] text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded border border-slate-700 inline-block mt-0.5">
                                  Exclu (12e Visite Normale)
                                </span>
                              );
                            })()}
                          </td>

                          {/* Street */}
                          <td className="p-3 text-slate-400 min-w-[180px] truncate max-w-[220px]">
                            {eq.street}
                          </td>

                          {/* City */}
                          <td className="p-3 font-medium text-slate-200 whitespace-nowrap">
                            {eq.city}
                          </td>

                          {/* Service object group */}
                          <td className="p-3 text-slate-400 whitespace-nowrap">
                            {eq.serviceObjectGroup}
                          </td>

                          {/* Assigned Technician */}
                          <td className="p-3 font-semibold text-cyan-300 whitespace-nowrap">
                            {eq.assignedTechnician}
                          </td>

                          {/* Service Leader */}
                          <td className="p-3 font-medium text-indigo-300 whitespace-nowrap">
                            {eq.serviceLeader}
                          </td>

                          {/* 11 Visites progress */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setActiveSubView("visits")}
                              className={`font-mono text-xs font-bold px-2 py-0.5 rounded cursor-pointer transition-transform hover:scale-105 ${
                                vCount === 11
                                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                  : vCount >= 8
                                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                  : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              }`}
                              title="Ouvrir la matrice des 11 visites"
                            >
                              {vCount} / 11
                            </button>
                          </td>

                          {/* 12th Visite CPSI (2026 Rule) */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => handleOpenVisitModal(eq, "cpsi")}
                              className="cursor-pointer transition-transform hover:scale-105"
                              title="Consulter ou saisir la date de la visite CPSI"
                            >
                              {!isCpsiEligible(eq) ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px]">
                                  Exclu (Visite Normale)
                                </span>
                              ) : eq.lastCpsiDate === "Erreur" || eq.forecastCpsiDate === "Erreur" ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/50 font-bold text-[10px] shadow-xs">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" /> Date Erreur
                                </span>
                              ) : isCpsiDoneIn2026(eq) ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold text-[10px] shadow-xs">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-teal-400" /> Traité 2026
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                                  <Clock className="w-3 h-3 text-amber-400" /> À faire 2026
                                </span>
                              )}
                            </button>
                          </td>

                          {/* Non-Conformity Status with 100-Day Rule */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => toggleRowExpanded(eq.id)}
                              className="cursor-pointer transition-transform hover:scale-105 block w-full text-center"
                              title="Cliquer pour afficher/masquer le détail des NC sur cet appareil"
                            >
                              {openNcs.length === 0 ? (
                                <span className="text-[10px] text-emerald-400 inline-flex items-center justify-center gap-1">
                                  <ShieldCheck className="w-3 h-3" /> Conforme
                                </span>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  {minDaysRem !== null && minDaysRem < 0 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] animate-pulse">
                                      ⛔ DÉPASSÉ (+{Math.abs(minDaysRem)}j)
                                    </span>
                                  ) : minDaysRem !== null && minDaysRem <= 15 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 font-bold text-[10px]">
                                      🔴 {minDaysRem}j restants
                                    </span>
                                  ) : minDaysRem !== null && minDaysRem <= 40 ? (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px]">
                                      🟠 {minDaysRem}j restants
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]">
                                      🟡 {minDaysRem}j restants
                                    </span>
                                  )}
                                  <span className="text-[9px] text-slate-400">
                                    {openNcs.length} NC ouverte{openNcs.length > 1 ? "s" : ""}
                                  </span>
                                </div>
                              )}
                            </button>
                          </td>

                          {/* Commentaires sur l'appareil */}
                          <td className="p-3 min-w-[160px] max-w-[220px]">
                            {eq.notes ? (
                              <button
                                type="button"
                                onClick={() => handleOpenCommentModal(eq)}
                                className="text-left group flex items-start gap-1.5 p-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/50 transition-all cursor-pointer w-full shadow-2xs"
                                title="Cliquer pour modifier le commentaire de l'appareil"
                              >
                                <MessageSquare className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                                <span className="text-[11px] text-slate-300 line-clamp-2 leading-tight group-hover:text-cyan-200">
                                  {eq.notes}
                                </span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenCommentModal(eq)}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] text-slate-500 hover:text-cyan-300 hover:bg-slate-800 border border-dashed border-slate-800 hover:border-cyan-500/40 transition-colors cursor-pointer"
                                title="Ajouter un commentaire pour cet appareil"
                              >
                                <Plus className="w-3 h-3 text-cyan-400" />
                                <span>+ Commentaire</span>
                              </button>
                            )}
                          </td>

                          {/* Action buttons */}
                          <td className="p-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditingEquipment(eq)}
                                className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                                title="Modifier les détails de cet appareil PF"
                              >
                                <Edit className="w-3 h-3 text-blue-400" />
                                <span>Modifier</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenAddNc(eq)}
                                className="px-2 py-1 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 text-[10px] font-medium border border-rose-800/60 transition-colors cursor-pointer"
                                title="Déclarer une Non-Conformité (NC)"
                              >
                                + NC
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenTransferToArchiveModal(eq)}
                                className="px-2 py-1 rounded bg-amber-950/60 hover:bg-amber-900 text-amber-300 text-[10px] font-medium border border-amber-800/60 transition-colors cursor-pointer flex items-center gap-1"
                                title="Transférer cet appareil vers le Parc Hors Garantie / Résilié"
                              >
                                <Archive className="w-3 h-3 text-amber-400" />
                                <span>HG/Résilié</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRequestDeleteEquipment(eq)}
                                className="p-1.5 rounded-md hover:bg-rose-950/50 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                                title="Supprimer cet appareil"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED NC DETAILS SUB-ROW */}
                        {expandedRowIds.has(eq.id) && (
                          <tr className="bg-slate-950/90 border-t border-b border-rose-900/40">
                            <td colSpan={17} className="p-4">
                              <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 space-y-3 shadow-inner">
                                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4 text-rose-400" />
                                    <h4 className="font-bold text-sm text-slate-100">
                                      Non-Conformités (NC) rattachées à l'appareil PF <span className="font-mono text-blue-400">{eq.pfNumber}</span> ({eq.name})
                                    </h4>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleOpenAddNc(eq)}
                                    className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-1 cursor-pointer transition-colors"
                                  >
                                    <Plus className="w-3.5 h-3.5" />
                                    <span>Déclarer une NC pour cet appareil</span>
                                  </button>
                                </div>

                                {eq.nonConformities.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic py-2">
                                    Aucune Non-Conformité déclarée sur cet appareil PF pour le moment.
                                  </p>
                                ) : (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {eq.nonConformities.map((nc) => {
                                      const daysRemaining = getDaysRemaining(nc.detectedDate);
                                      const isResolved = nc.status === "Levée / Clôturée";

                                      return (
                                        <div
                                          key={nc.id}
                                          className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
                                            isResolved
                                              ? "bg-slate-950/60 border-slate-800 text-slate-400 opacity-80"
                                              : nc.severity === "Critique / Bloquante"
                                              ? "bg-rose-950/40 border-rose-700/80 text-rose-200"
                                              : "bg-slate-850/80 border-slate-700 text-slate-200"
                                          }`}
                                        >
                                          <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                              <span className="font-mono font-bold text-xs text-blue-400">{nc.code}</span>
                                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                                                {nc.severity}
                                              </span>
                                            </div>
                                            {isResolved ? (
                                              <span className="text-emerald-400 font-bold text-[11px] flex items-center gap-1">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Clôturée le {nc.resolvedDate}
                                              </span>
                                            ) : (
                                              <span
                                                className={`font-bold text-[11px] ${
                                                  daysRemaining < 0
                                                    ? "text-rose-400 font-mono animate-pulse"
                                                    : daysRemaining <= 15
                                                    ? "text-rose-300"
                                                    : "text-amber-300"
                                                }`}
                                              >
                                                {daysRemaining < 0
                                                  ? `⛔ Retard : +${Math.abs(daysRemaining)}j`
                                                  : `⏳ ${daysRemaining}j restants (<100j)`}
                                              </span>
                                            )}
                                          </div>

                                          <p className="text-xs text-slate-200 font-medium leading-relaxed">{nc.description}</p>

                                          {nc.isCoveredByContract === true && !nc.associatedQuoteNumber ? (
                                            <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-medium bg-emerald-950/40 border border-emerald-800/50 p-2 rounded-lg">
                                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                              <span><strong>Prise en charge :</strong> Inclus dans le Contrat de Maintenance</span>
                                            </div>
                                          ) : (
                                            <div className="flex items-center gap-1.5 text-amber-300 text-[11px] font-medium bg-amber-950/40 border border-amber-800/50 p-2 rounded-lg">
                                              <FileText className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                              <span><strong>Hors Contrat (Facturable)</strong> &bull; Devis Associé : <strong className="font-mono font-bold text-amber-200">{nc.associatedQuoteNumber || "En attente de devis"}</strong></span>
                                            </div>
                                          )}

                                          <div className="flex items-center gap-1.5 text-[11px] bg-indigo-950/40 p-2 rounded-lg border border-indigo-800/50 text-indigo-300">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                            <span>Date prévisionnelle de clôture : <strong className="font-mono text-indigo-200">{nc.estimatedClosureDate || "À planifier"}</strong></span>
                                          </div>

                                          {nc.actionsDone && (
                                            <div className="text-[11px] text-emerald-300 bg-emerald-950/30 p-2 rounded-lg border border-emerald-800/40">
                                              🛠️ <strong>Actions réalisées :</strong> {nc.actionsDone}
                                            </div>
                                          )}

                                          {nc.actionPlan && (
                                            <p className="text-[11px] text-slate-400 italic bg-slate-950/50 p-2 rounded-lg border border-slate-800">
                                              💡 <strong>Plan d'action :</strong> {nc.actionPlan}
                                            </p>
                                          )}

                                          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400">
                                            <span>Constaté le : <strong className="font-mono text-slate-300">{nc.detectedDate}</strong></span>
                                            <div className="flex items-center gap-1.5">
                                              {!isResolved && (
                                                <button
                                                  type="button"
                                                  onClick={() => handleResolveNc(eq.id, nc.id)}
                                                  className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-colors"
                                                >
                                                  Lever NC
                                                </button>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => setEditingNc({ eqId: eq.id, nc })}
                                                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 cursor-pointer transition-colors"
                                              >
                                                Modifier
                                              </button>
                                              <button
                                                type="button"
                                                onClick={() => setNcToDelete({ eqId: eq.id, ncId: nc.id, code: nc.code })}
                                                className="p-1 rounded hover:bg-rose-950 text-slate-400 hover:text-rose-400 cursor-pointer transition-colors"
                                                title="Supprimer cette NC"
                                              >
                                                <Trash2 className="w-3 h-3" />
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
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
            {filteredEquipments.length > visibleCount && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-400 font-mono">
                  Affichage optimisé : <strong className="text-blue-400">{displayedEquipments.length}</strong> sur{" "}
                  <strong className="text-slate-200">{filteredEquipments.length}</strong> appareils
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 100)}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold cursor-pointer transition-colors"
                  >
                    Afficher +100 appareils
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filteredEquipments.length)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold cursor-pointer transition-colors"
                  >
                    Tout afficher ({filteredEquipments.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 2: 11 INSPECTIONS + CPSI SECTION & MATRIX GRID */}
      {activeSubView === "visits" && (
        <div className="space-y-5">
          {/* CPSI PV SCANNER SECTION DIRECTLY EMBEDDED IN CPSI VIEW */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/60 via-slate-900 to-slate-900 border-2 border-teal-500/50 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-teal-500/20 pb-3.5">
              <div className="flex items-start sm:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-slate-100 text-sm sm:text-base">
                      Section CPSI : Scanner & Injection Automatique des Procès-Verbaux (IA)
                    </h3>
                    <span className="px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                      12ème Visite Annuelle
                    </span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">
                    Déposez vos fichiers PDF ou images de PV de contrôle CPSI : l'IA extrait automatiquement le N° d'appareil (PF), injecte la date d'inspection dans la colonne CPSI ci-dessous et renomme vos fichiers pour téléchargement unitaire ou en archive ZIP.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCpsiScannerInline(!showCpsiScannerInline)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto ${
                  showCpsiScannerInline
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                    : "bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold shadow-teal-500/20"
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{showCpsiScannerInline ? "Masquer la Zone de Scan" : "📂 Déployer le Scanner de PV CPSI"}</span>
              </button>
            </div>

            {showCpsiScannerInline && (
              <div className="pt-2">
                <CpsiPvScanner
                  equipments={equipments}
                  onApplyCpsiValidation={handleApplyCpsiUpdates}
                />
              </div>
            )}
          </div>

          {/* MATRICE HEADER & CONTROLS */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col gap-3 text-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-bold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" />
                  Matrice Interactive des Visites : 11 Visites d'Inspection Périodiques + 12ème CPSI
                </h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Pointez et validez en 1-clic chaque passage technicien (V1 à V11) ou cliquez sur une case CPSI pour voir/insérer la date issue du PV.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setShowCpsiScannerInline(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-xs border border-teal-500/40 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Scanner des PV CPSI</span>
                </button>

                <div className="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block"></span> V1 à V11 (Inspections)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded bg-teal-400 inline-block"></span> CPSI (Visite 12)
                  </span>
                </div>
              </div>
            </div>

            {/* Quick CPSI Filter Bar in Matrice View */}
            <div className="space-y-2 pt-2 border-t border-slate-800/80">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-slate-400 font-semibold text-[11px] uppercase tracking-wider mr-1">
                    Filtrer Matrice :
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCpsiFilter("all");
                      setSelectedLastCpsiDateFilter("all");
                      setSelectedForecastCpsiDateFilter("all");
                      setCustomLastCpsiMonth("");
                      setCustomForecastCpsiMonth("");
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCpsiFilter === "all" &&
                      selectedLastCpsiDateFilter === "all" &&
                      selectedForecastCpsiDateFilter === "all" &&
                      !customLastCpsiMonth &&
                      !customForecastCpsiMonth
                        ? "bg-slate-700 text-white font-bold"
                        : "bg-slate-950 text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Tous ({totalEquipments})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCpsiFilter(selectedCpsiFilter === "done" ? "all" : "done")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCpsiFilter === "done"
                        ? "bg-teal-500 text-slate-950 shadow-md shadow-teal-500/30 font-extrabold"
                        : "bg-teal-950/40 text-teal-300 border border-teal-500/30 hover:bg-teal-900/50"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Traités 2026 ({completedCpsi})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCpsiFilter(selectedCpsiFilter === "pending" ? "all" : "pending")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      selectedCpsiFilter === "pending"
                        ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30 font-extrabold"
                        : "bg-amber-950/40 text-amber-300 border border-amber-500/30 hover:bg-amber-900/50"
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>À Traiter 2026 ({totalEligibleCpsi - completedCpsi})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedLastCpsiDateFilter(
                        selectedLastCpsiDateFilter === "year_2026" ? "all" : "year_2026"
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      selectedLastCpsiDateFilter === "year_2026"
                        ? "bg-teal-600 text-white shadow-md shadow-teal-600/30"
                        : "bg-slate-950 text-teal-300 border border-teal-500/30 hover:bg-teal-950/40"
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>Dernier 2026 ({lastCpsiDateStats.yearCounts[2026] || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedForecastCpsiDateFilter(
                        selectedForecastCpsiDateFilter === "year_2027" ? "all" : "year_2027"
                      )
                    }
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      selectedForecastCpsiDateFilter === "year_2027"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                        : "bg-slate-950 text-purple-300 border border-purple-500/30 hover:bg-purple-950/40"
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>Prévis. 2027 ({forecastCpsiDateStats.yearCounts[2027] || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedCpsiFilter(selectedCpsiFilter === "excluded_only" ? "all" : "excluded_only")}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      selectedCpsiFilter === "excluded_only"
                        ? "bg-slate-600 text-white font-bold"
                        : "bg-slate-950 text-slate-500 hover:text-slate-300"
                    }`}
                  >
                    Exclus ({totalEquipments - totalEligibleCpsi})
                  </button>
                  {errorCpsiCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCpsiFilter("error");
                        setSelectedLastCpsiDateFilter("error");
                        setSelectedForecastCpsiDateFilter("error");
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        selectedCpsiFilter === "error" || selectedLastCpsiDateFilter === "error"
                          ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                          : "bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-900/50"
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Dates en Erreur ({errorCpsiCount})</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  {hasAnyActiveFilter && (
                    <button
                      type="button"
                      onClick={resetAllFilters}
                      className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-950 border border-slate-700 hover:border-rose-600/50 text-slate-300 hover:text-rose-200 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-xs"
                      title="Réinitialiser tous les filtres"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset</span>
                    </button>
                  )}
                  <div className="text-[11px] text-slate-400 font-mono">
                    Affichage : <span className="text-teal-400 font-bold">{filteredEquipments.length}</span> / {totalEquipments} appareils
                  </div>
                </div>
              </div>

              {/* Dropdown filters for Matrice */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1 text-xs">
                <div>
                  <select
                    value={selectedLastCpsiDateFilter}
                    onChange={(e) => setSelectedLastCpsiDateFilter(e.target.value)}
                    className={`w-full bg-slate-950 rounded-lg p-1.5 text-slate-200 focus:outline-none transition-all ${
                      selectedLastCpsiDateFilter !== "all"
                        ? "border-2 border-teal-500 text-teal-200 font-medium bg-teal-950/20"
                        : "border border-slate-800 hover:border-teal-500/50"
                    }`}
                  >
                    <option value="all">Date Dernier CPSI (Toutes)</option>
                    {lastCpsiDateStats.sortedYears.map((yr) => (
                      <option key={yr} value={`year_${yr}`}>
                        📅 Réalisé en {yr} ({lastCpsiDateStats.yearCounts[yr]})
                      </option>
                    ))}
                    {lastCpsiDateStats.before2024Count > 0 && (
                      <option value="year_before_2024">
                        📅 Avant 2024 ({lastCpsiDateStats.before2024Count})
                      </option>
                    )}
                    <option value="has_date">Avec date ({lastCpsiDateStats.totalWithDate})</option>
                    <option value="no_date">Sans date ({lastCpsiDateStats.noDateCount})</option>
                    {lastCpsiDateStats.errorCount > 0 && (
                      <option value="error">⚠️ Date en Erreur ({lastCpsiDateStats.errorCount})</option>
                    )}
                  </select>
                </div>

                <div>
                  <select
                    value={selectedForecastCpsiDateFilter}
                    onChange={(e) => setSelectedForecastCpsiDateFilter(e.target.value)}
                    className={`w-full bg-slate-950 rounded-lg p-1.5 text-slate-200 focus:outline-none transition-all ${
                      selectedForecastCpsiDateFilter !== "all"
                        ? "border-2 border-purple-500 text-purple-200 font-medium bg-purple-950/20"
                        : "border border-slate-800 hover:border-purple-500/50"
                    }`}
                  >
                    <option value="all">Date Prévisionnelle (Toutes)</option>
                    {forecastCpsiDateStats.overdueCount > 0 && (
                      <option value="overdue">
                        🔴 Échéance Dépassée ({forecastCpsiDateStats.overdueCount})
                      </option>
                    )}
                    {forecastCpsiDateStats.thisMonthCount > 0 && (
                      <option value="this_month">
                        ⚡ Ce mois-ci ({forecastCpsiDateStats.thisMonthCount})
                      </option>
                    )}
                    <option value="next_30">
                      📅 Prochains 30 jours ({forecastCpsiDateStats.next30Count})
                    </option>
                    <option value="next_90">
                      📅 Prochains 90 jours ({forecastCpsiDateStats.next90Count})
                    </option>
                    {forecastCpsiDateStats.sortedYears.map((yr) => (
                      <option key={yr} value={`year_${yr}`}>
                        📅 Prévision en {yr} ({forecastCpsiDateStats.yearCounts[yr]})
                      </option>
                    ))}
                    <option value="to_plan">
                      ⏳ À planifier ({forecastCpsiDateStats.toPlanCount})
                    </option>
                    {forecastCpsiDateStats.errorCount > 0 && (
                      <option value="error">
                        ⚠️ Date en Erreur ({forecastCpsiDateStats.errorCount})
                      </option>
                    )}
                  </select>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    type="month"
                    value={customLastCpsiMonth}
                    onChange={(e) => setCustomLastCpsiMonth(e.target.value)}
                    placeholder="Mois Dernier"
                    title="Mois précis du Dernier CPSI"
                    className={`w-1/2 bg-slate-950 rounded-lg px-2 py-1 text-[11px] text-teal-300 focus:outline-none ${
                      customLastCpsiMonth
                        ? "border-2 border-teal-500 bg-teal-950/20 font-bold"
                        : "border border-slate-800"
                    }`}
                  />
                  <input
                    type="month"
                    value={customForecastCpsiMonth}
                    onChange={(e) => setCustomForecastCpsiMonth(e.target.value)}
                    placeholder="Mois Prévis."
                    title="Mois précis de la Date Prévisionnelle"
                    className={`w-1/2 bg-slate-950 rounded-lg px-2 py-1 text-[11px] text-purple-300 focus:outline-none ${
                      customForecastCpsiMonth
                        ? "border-2 border-purple-500 bg-purple-950/20 font-bold"
                        : "border border-slate-800"
                    }`}
                  />
                </div>

                <div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Filtrer par PF, Nom, Ville..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-950 text-slate-300 font-semibold border-b border-slate-800 text-[11px]">
                    <th className="p-3">Appareil & Site</th>
                    <th className="p-3">Technicien</th>
                    {Array.from({ length: 11 }, (_, i) => (
                      <th key={i} className="p-2 text-center text-blue-300 font-mono">
                        V{i + 1}
                      </th>
                    ))}
                    <th className="p-2 text-center text-teal-400 font-bold bg-teal-950/60 border-l border-r border-teal-500/40">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>CPSI (2026)</span>
                        <span className="text-[8px] font-mono text-teal-300/80">Contrôle 12e</span>
                      </div>
                    </th>
                    <th className="p-2 text-center text-purple-300 font-bold bg-purple-950/40 border-r border-purple-500/30">
                      <div className="flex flex-col items-center gap-0.5">
                        <span>Date Prévisionnelle</span>
                        <span className="text-[8px] font-mono text-purple-300/80">Traitement CPSI</span>
                      </div>
                    </th>
                    <th className="p-3 text-center">Progression</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {displayedEquipments.map((eq) => {
                    let vCount = 0;
                    for (let i = 1; i <= 11; i++) {
                      if (eq.visits[`v${i}` as keyof InspectionVisits]) vCount++;
                    }

                    return (
                      <tr key={eq.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-400 font-mono">{eq.pfNumber}</span>
                            {(() => {
                              const cat = getCpsiCategory(eq);
                              if (cat === "ELEVATOR") {
                                return (
                                  <span className="px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[9px] font-bold">
                                    Ascenseur (1 an)
                                  </span>
                                );
                              }
                              if (cat === "ESCALATOR" || cat === "MOV_WALK") {
                                return (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[9px] font-bold">
                                    Escalier / Trottoir (2 ans)
                                  </span>
                                );
                              }
                              return (
                                <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[9px]">
                                  Exclu (12e Visite Normale)
                                </span>
                              );
                            })()}
                          </div>
                          <div className="text-slate-300 text-[11px] truncate max-w-[200px] mt-0.5">{eq.name}</div>
                          <div className="text-slate-500 text-[10px]">{eq.city} &bull; {eq.serviceObject}</div>
                        </td>

                        <td className="p-3 text-cyan-300 font-medium whitespace-nowrap">
                          {eq.assignedTechnician}
                        </td>

                        {/* 11 Visit Checkboxes with Date display */}
                        {Array.from({ length: 11 }, (_, i) => {
                          const vKey = `v${i + 1}` as keyof InspectionVisits;
                          const isDone = eq.visits[vKey];
                          const detail = eq.visitDetails?.[vKey];
                          return (
                            <td key={i} className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleOpenVisitModal(eq, vKey)}
                                className={`w-8 h-8 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer mx-auto group ${
                                  isDone
                                    ? "bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-xs scale-105"
                                    : "bg-slate-950 border border-slate-700 text-slate-500 hover:border-blue-400 hover:text-blue-300"
                                }`}
                                title={`Visite V${i + 1} : ${isDone ? `Réalisée le ${detail?.date || "validée"}` : "Cliquer pour saisir la date et valider"}`}
                              >
                                {isDone ? (
                                  <>
                                    <Check className="w-3.5 h-3.5" />
                                    {detail?.date ? (
                                      <span className="text-[7.5px] font-mono leading-none opacity-90">
                                        {detail.date.slice(5).replace("-", "/")}
                                      </span>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="text-[10px] font-mono">{i + 1}</span>
                                )}
                              </button>
                            </td>
                          );
                        })}

                        {/* 12th CPSI Visit Checkbox (2026 Rule) */}
                        <td className="p-1.5 text-center bg-teal-950/30 border-l border-r border-teal-500/30">
                          {(() => {
                            const isEligible = isCpsiEligible(eq);
                            if (!isEligible) {
                              return (
                                <span className="text-[10px] text-slate-500 italic block py-1">
                                  Exclu
                                </span>
                              );
                            }

                            const cpsiDetail = eq.visitDetails?.cpsi;
                            const isDone2026 = isCpsiDoneIn2026(eq);
                            const formattedDate = formatExcelDate(cpsiDetail?.date || eq.lastCpsiDate);
                            const isDateError = eq.lastCpsiDate === "Erreur" || formattedDate === "Erreur";
                            return (
                              <button
                                type="button"
                                onClick={() => handleOpenVisitModal(eq, "cpsi")}
                                className={`w-10 h-8 rounded-lg flex flex-col items-center justify-center transition-all cursor-pointer mx-auto ${
                                  isDateError
                                    ? "bg-rose-950 border-2 border-rose-500/80 text-rose-300 hover:bg-rose-900/60 shadow-xs"
                                    : isDone2026
                                    ? "bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold shadow-md shadow-teal-500/20 scale-105"
                                    : "bg-slate-950 border-2 border-amber-500/60 text-amber-400 hover:bg-amber-950/60"
                                }`}
                                title={`12ème Visite CPSI : ${
                                  isDateError
                                    ? "Date en Erreur (Cliquer pour corriger)"
                                    : isDone2026
                                    ? `Réalisée en 2026 (${formattedDate})`
                                    : "À faire en 2026 (Cliquer pour saisir)"
                                }`}
                              >
                                {isDateError ? (
                                  <>
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                                    <span className="text-[7px] font-bold text-rose-300 leading-none">
                                      Erreur
                                    </span>
                                  </>
                                ) : isDone2026 ? (
                                  <>
                                    <ShieldCheck className="w-3.5 h-3.5" />
                                    <span className="text-[7.5px] font-mono font-bold leading-none">
                                      {formattedDate ? formattedDate.slice(0, 5) : "2026"}
                                    </span>
                                  </>
                                ) : (
                                  <span className="text-[8.5px] font-bold">À faire</span>
                                )}
                              </button>
                            );
                          })()}
                        </td>

                        {/* Date Prévisionnelle CPSI Cell */}
                        <td className="p-2 text-center bg-purple-950/20 border-r border-purple-500/30 whitespace-nowrap">
                          {getForecastCpsiDate(eq) === "Erreur" ? (
                            <span className="font-mono text-xs font-bold text-rose-300 bg-rose-950/60 border border-rose-500/40 px-2 py-1 rounded-md inline-flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Erreur
                            </span>
                          ) : (
                            <span className="font-mono text-xs font-bold text-purple-300 bg-purple-900/40 border border-purple-500/30 px-2 py-1 rounded-md inline-block">
                              {getForecastCpsiDate(eq)}
                            </span>
                          )}
                        </td>

                        {/* Progression */}
                        <td className="p-3 text-center whitespace-nowrap">
                          {(() => {
                            const isDone2026 = isCpsiDoneIn2026(eq);
                            const isEligible = isCpsiEligible(eq);
                            return (
                              <div className="flex flex-col items-center">
                                <span className="font-mono text-xs font-bold text-slate-200">
                                  {vCount}/11 {isDone2026 ? "+ CPSI" : isEligible ? "" : "(12e N)"}
                                </span>
                                <div className="w-16 bg-slate-800 rounded-full h-1.5 mt-1 overflow-hidden">
                                  <div
                                    className={`h-1.5 rounded-full ${
                                      vCount === 11 && isDone2026 ? "bg-teal-400" : "bg-blue-500"
                                    }`}
                                    style={{ width: `${Math.round(((vCount + (isDone2026 ? 1 : 0)) / 12) * 100)}%` }}
                                  ></div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filteredEquipments.length > visibleCount && (
              <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <span className="text-slate-400 font-mono">
                  Affichage optimisé : <strong className="text-teal-400">{displayedEquipments.length}</strong> sur{" "}
                  <strong className="text-slate-200">{filteredEquipments.length}</strong> appareils
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((prev) => prev + 100)}
                    className="px-3.5 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-bold cursor-pointer transition-colors"
                  >
                    Afficher +100 appareils
                  </button>
                  <button
                    type="button"
                    onClick={() => setVisibleCount(filteredEquipments.length)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 font-semibold cursor-pointer transition-colors"
                  >
                    Tout afficher ({filteredEquipments.length})
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW 3: NON-CONFORMITY 100-DAY CONTROL TOWER */}
      {activeSubView === "nc_control" && (
        <div className="space-y-5">
          {/* Summary & Global Actions Box */}
          <div className="p-4 rounded-xl bg-slate-900/90 border border-rose-500/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0 shadow-inner">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm">
                  Tour de Contrôle des Non-Conformités (NC) & Règle des 100 Jours
                </h4>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Suivi rigoureux par technicien & par appareil. Chaque anomalie constatée lors des 11 visites ou du CPSI enclenche un compte à rebours de 100 jours.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncAllNcTechniciansWithEquipments}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 font-semibold text-xs transition-all cursor-pointer shadow-xs active:scale-95"
                title="Attribuer automatiquement chaque NC au technicien titulaire de l'appareil"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                <span>Harmoniser Techniciens</span>
              </button>

              <button
                type="button"
                onClick={() => setNcDocModal({ isOpen: true, nc: null, equipment: null })}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-md shadow-purple-950 transition-all cursor-pointer active:scale-95"
                title="Ouvrir le générateur de bon d'ordre d'intervention de clôture des NC"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Générateur Bons NC (PDF)</span>
              </button>

              <span className="px-2.5 py-1 rounded-lg bg-rose-950/80 border border-rose-700 text-rose-300 font-mono text-[11px] font-semibold">
                {overdueNcs.length} Dépassé(s) | {criticalNcs.length} Critique(s) &lt; 15j
              </span>
            </div>
          </div>

          {/* Dedicated NC Tower Filters Bar */}
          <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-[280px]">
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ncTourSearch}
                  onChange={(e) => setNcTourSearch(e.target.value)}
                  placeholder="Rechercher Code NC, Appareil, Technicien, Devis, Commentaires..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                {ncTourSearch && (
                  <button
                    type="button"
                    onClick={() => setNcTourSearch("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter by Technician */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium whitespace-nowrap text-[11px]">Technicien :</span>
                <select
                  value={ncTourTechFilter}
                  onChange={(e) => setNcTourTechFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer max-w-[280px]"
                >
                  <option value="all">
                    Tous les techniciens responsables ({(responsibleTechnicians.length > 0 ? responsibleTechnicians : allKnownTechnicians).length} techniciens • {allNcs.length} NC)
                  </option>
                  {(responsibleTechnicians.length > 0 ? responsibleTechnicians : allKnownTechnicians).map((tech) => {
                    const techNcs = allNcs.filter(
                      (item) =>
                        (item.equipment.assignedTechnician || item.nc.assignedTechnician || "").trim().toLowerCase() === tech.toLowerCase()
                    );
                    const techEqs = equipments.filter(
                      (e) => (e.assignedTechnician || "").trim().toLowerCase() === tech.toLowerCase()
                    );
                    if (techNcs.length === 0 && techEqs.length === 0 && ncTourTechFilter !== tech) return null;
                    return (
                      <option key={tech} value={tech}>
                        {tech} ({techNcs.length} NC • {techEqs.length} appareil{techEqs.length > 1 ? "s" : ""})
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Filter by Urgency */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-medium whitespace-nowrap text-[11px]">Délai / Statut :</span>
                <select
                  value={ncTourUrgencyFilter}
                  onChange={(e) => setNcTourUrgencyFilter(e.target.value as any)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-200 text-xs font-semibold focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="all">Toutes les NC ({allNcs.length})</option>
                  <option value="open">NC Ouvertes / En cours ({openNcsList.length})</option>
                  <option value="overdue">⛔ Dépassé (&gt; 100 jours) ({overdueNcs.length})</option>
                  <option value="critical">🔴 Critique (&lt;= 15 jours) ({criticalNcs.length})</option>
                  <option value="vigilance">🟡 Vigilance (15 à 40 jours) ({vigilanceNcs.length})</option>
                  <option value="normal">🟢 Normal (&gt; 40 jours)</option>
                  <option value="closed">
                    ✅ Clôturées ({allNcs.filter((n) => n.nc.status === "Levée / Clôturée").length})
                  </option>
                </select>
              </div>
            </div>

            {/* Results Count & Clear */}
            <div className="flex items-center gap-2 text-slate-400 text-[11px] font-mono">
              <span>{filteredTourNcs.length} NC affichée(s)</span>
              {(ncTourSearch || ncTourTechFilter !== "all" || ncTourUrgencyFilter !== "all") && (
                <button
                  type="button"
                  onClick={() => {
                    setNcTourSearch("");
                    setNcTourTechFilter("all");
                    setNcTourUrgencyFilter("all");
                  }}
                  className="text-blue-400 hover:text-blue-300 underline text-xs cursor-pointer ml-1"
                >
                  Réinitialiser filtres
                </button>
              )}
            </div>
          </div>

          {/* NC Cards Grid */}
          {filteredTourNcs.length === 0 ? (
            <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="font-semibold text-slate-300">Aucune Non-Conformité ne correspond aux critères sélectionnés.</p>
              <p className="text-xs text-slate-500">Modifiez la recherche ou le filtre de technicien pour afficher d'autres NC.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTourNcs.map(({ equipment, nc }) => {
                const daysElapsed = getDaysElapsed(nc.detectedDate);
                const daysRemaining = getDaysRemaining(nc.detectedDate);
                const isResolved = nc.status === "Levée / Clôturée";
                const isOverdue = !isResolved && daysRemaining < 0;
                const isCritical = !isResolved && daysRemaining >= 0 && daysRemaining <= 15;
                const isVigilance = !isResolved && daysRemaining > 15 && daysRemaining <= 40;
                const assignedTechnician = equipment.assignedTechnician || nc.assignedTechnician || "Non assigné";

                return (
                  <div
                    key={nc.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col justify-between space-y-3 ${
                      isResolved
                        ? "bg-slate-950/60 border-slate-800/80 opacity-75"
                        : isOverdue
                        ? "bg-rose-950/30 border-rose-500 ring-1 ring-rose-500 shadow-xl shadow-rose-950/50"
                        : isCritical
                        ? "bg-slate-900 border-rose-500/60 shadow-lg"
                        : isVigilance
                        ? "bg-slate-900 border-amber-500/40"
                        : "bg-slate-900/90 border-slate-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-400">{nc.code}</span>
                          <span className="text-[11px] font-mono text-slate-400">({equipment.pfNumber})</span>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                              nc.severity === "Critique / Bloquante"
                                ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                                : nc.severity === "Majeure"
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                            }`}
                          >
                            {nc.severity}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-200 mt-1">{equipment.name}</p>
                        <p className="text-[11px] text-slate-400">
                          {equipment.city} &bull; Compte : {equipment.customerAccount}
                        </p>
                      </div>

                      {/* Countdown Badge */}
                      <div className="text-right shrink-0">
                        {isResolved ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Clôturée le {nc.resolvedDate}
                          </span>
                        ) : isOverdue ? (
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-1 rounded-full bg-rose-600 text-white font-extrabold text-[11px] animate-pulse">
                              ⛔ RETARD : +{Math.abs(daysRemaining)} Jours
                            </span>
                            <p className="text-[10px] text-rose-400 mt-0.5 font-mono">
                              {daysElapsed}j écoulés / 100j max
                            </p>
                          </div>
                        ) : isCritical ? (
                          <div className="text-right">
                            <span className="inline-block px-2.5 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/50 font-bold text-[11px]">
                              🔴 J-{daysRemaining} avant 100j !
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {daysElapsed}j écoulés / 100j
                            </p>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                              ⏳ J-{daysRemaining} restants
                            </span>
                            <p className="text-[10px] text-slate-400 mt-0.5 font-mono">
                              {daysElapsed}j écoulés
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Technicien Responsable de l'appareil & Commentaires Appareil */}
                    <div className="space-y-2">
                      <div className="px-3 py-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span className="text-[11px] font-semibold text-slate-400">Technicien responsable :</span>
                          <span className="text-xs font-bold text-blue-300 uppercase tracking-wide">
                            {assignedTechnician}
                          </span>
                        </div>
                        <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Portefeuille Appareil</span>
                        </span>
                      </div>

                      {/* Commentaires / Remarques sur l'appareil */}
                      <div className="px-3 py-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-300">
                            <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Commentaires sur l'appareil ({equipment.pfNumber}) :</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleOpenCommentModal(equipment)}
                            className="text-[10px] text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                            title="Ajouter ou modifier un commentaire pour cet appareil"
                          >
                            <Edit className="w-3 h-3" />
                            <span>{equipment.notes ? "Modifier" : "+ Ajouter un commentaire"}</span>
                          </button>
                        </div>
                        {equipment.notes ? (
                          <p className="text-[11px] text-slate-200 bg-slate-900/80 p-2 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-wrap">
                            {equipment.notes}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-500 italic">
                            Aucun commentaire spécifique consigné sur cet appareil. Cliquez sur "+ Ajouter un commentaire" pour en saisir un.
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Description & Action Plan */}
                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Constat & Anomalie :
                        </span>
                        <p className="text-slate-200 mt-0.5 leading-relaxed bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                          {nc.description}
                        </p>
                      </div>

                      <div>
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          Couverture Maintenance & N° Devis :
                        </span>
                        {nc.isCoveredByContract === true && !nc.associatedQuoteNumber ? (
                          <p className="text-emerald-300 mt-0.5 text-[11px] bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/50 flex items-center gap-1.5 font-medium">
                            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Inclus dans le contrat de maintenance (Travaux pris en charge)</span>
                          </p>
                        ) : (
                          <p className="text-amber-300 mt-0.5 text-[11px] bg-amber-950/40 p-2 rounded-lg border border-amber-800/50 flex items-center gap-1.5 font-medium">
                            <FileText className="w-4 h-4 text-amber-400 shrink-0" />
                            <span>
                              Travaux Hors Contrat (Facturable) &bull; N° Devis :{" "}
                              <strong className="font-mono text-amber-100 font-bold">
                                {nc.associatedQuoteNumber || "En attente de devis"}
                              </strong>
                            </span>
                          </p>
                        )}
                      </div>

                      {nc.actionPlan && (
                        <div>
                          <span className="text-[11px] font-semibold text-blue-300 uppercase tracking-wider">
                            Plan de Levée & Pièces Requises :
                          </span>
                          <p className="text-slate-300 mt-0.5 text-[11px] bg-blue-950/20 p-2 rounded-lg border border-blue-900/40">
                            {nc.actionPlan}
                          </p>
                        </div>
                      )}

                      {nc.estimatedClosureDate && (
                        <div>
                          <span className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
                            Date Prévisionnelle de Clôture :
                          </span>
                          <p className="text-indigo-200 mt-0.5 text-[11px] font-mono bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/40">
                            {nc.estimatedClosureDate}
                          </p>
                        </div>
                      )}

                      {nc.actionsDone && (
                        <div>
                          <span className="text-[11px] font-semibold text-emerald-300 uppercase tracking-wider">
                            Actions Réalisées / Fait :
                          </span>
                          <p className="text-emerald-200 mt-0.5 text-[11px] bg-emerald-950/30 p-2 rounded-lg border border-emerald-900/40">
                            {nc.actionsDone}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Dates & Resolution Button */}
                    <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="text-[10px] text-slate-400 font-mono">
                        <span>Constaté le : {nc.detectedDate}</span> &bull;{" "}
                        <span className="text-rose-400">Échéance 100j : {nc.deadlineDate}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setNcDocModal({ isOpen: true, nc, equipment })}
                          className="px-2.5 py-1.5 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 text-purple-300 border border-purple-500/40 text-[11px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                          title="Générer le Bon d'Ordre d'Intervention de Clôture officiel pour cette NC"
                        >
                          <FileText className="w-3.5 h-3.5 text-purple-400" />
                          <span>Bon de Clôture</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingNc({ eqId: equipment.id, nc })}
                          className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                          title="Modifier cette Non-Conformité"
                        >
                          <Edit className="w-3.5 h-3.5 text-amber-400" />
                          <span>Modifier</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRequestDeleteNc(equipment.id, nc.id, nc.code)}
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/80 text-slate-400 hover:text-rose-300 border border-rose-900/40 transition-colors cursor-pointer"
                          title="Supprimer cette Non-Conformité"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>

                        {!isResolved && (
                          <button
                            type="button"
                            onClick={() => handleResolveNc(equipment.id, nc.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] shadow-sm transition-all active:scale-95 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Valider la Levée de NC</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VIEW 4: ANALYTICS & RECHARTS */}
      {activeSubView === "analytics" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Tech Performance Chart */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
                  Taux de Réalisation des Visites par Technicien (%)
                </span>
                <span className="text-slate-400 font-mono text-[11px]">11 Visites vs CPSI</span>
              </div>
              <div className="h-60 w-full text-xs">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={techChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                      formatter={(val: any) => [`${val}%`, "Taux"]}
                    />
                    <Legend wrapperStyle={{ fontSize: "11px" }} />
                    <Bar dataKey="tauxVisites" fill="#3b82f6" name="Taux 11 Visites (%)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="tauxCpsi" fill="#14b8a6" name="Taux CPSI (%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Non-Conformity Status Pie Chart */}
            <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 shadow-md flex flex-col">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-xs">
                <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Répartition des NC par Tranches du Délai 100 Jours
                </span>
                <span className="text-slate-400 font-mono text-[11px]">{openNcsList.length} NC Actives</span>
              </div>
              <div className="h-60 w-full text-xs flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ncPieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, value }) => `${name} : ${value}`}
                    >
                      {ncPieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "8px",
                        fontSize: "11px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 5: AI AUDIT REPORT */}
      {activeSubView === "ai_audit" && aiAuditResult && (
        <div className="p-5 rounded-2xl bg-slate-900/95 border border-blue-500/30 shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-400" />
              Audit Réglementaire & Opérationnel du Parc PF (11 Visites, CPSI & NC 100 Jours)
            </h3>
          </div>
          <FormattedOutput content={aiAuditResult} />
        </div>
      )}

      {/* VIEW 6: DUPLICATE PF (HORS GARANTIE / RÉSILIÉ / HISTORIQUE) */}
      {activeSubView === "archived" && (
        <ArchivedPFManager
          archivedEquipments={archivedEquipments}
          activeEquipments={equipments}
          onSaveArchived={saveArchivedEquipments}
          onRestoreToActive={handleRestoreToActive}
          onTransferFromActive={handleTransferFromActive}
        />
      )}

      {/* MODAL: ADD EQUIPMENT PF */}
      {showAddEquipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-400" />
                Ajouter un Équipement au Parc PF
              </h3>
              <button
                onClick={() => setShowAddEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateEquipment} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">N° Appareil (PF) *</label>
                  <input
                    type="text"
                    required
                    value={newEqForm.pfNumber}
                    onChange={(e) => setNewEqForm({ ...newEqForm, pfNumber: e.target.value })}
                    placeholder="ex: PF-89012"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Project ID</label>
                  <input
                    type="text"
                    value={newEqForm.projectId}
                    onChange={(e) => setNewEqForm({ ...newEqForm, projectId: e.target.value })}
                    placeholder="ex: PRJ-9042"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Account</label>
                  <input
                    type="text"
                    value={newEqForm.customerAccount}
                    onChange={(e) => setNewEqForm({ ...newEqForm, customerAccount: e.target.value })}
                    placeholder="ex: ACC-4491"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Name (Nom de l'appareil / du site) *</label>
                <input
                  type="text"
                  required
                  value={newEqForm.name}
                  onChange={(e) => setNewEqForm({ ...newEqForm, name: e.target.value })}
                  placeholder="ex: Tour Montparnasse - Ascenseur Haute Vitesse C"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service Object</label>
                  <input
                    type="text"
                    value={newEqForm.serviceObject}
                    onChange={(e) => setNewEqForm({ ...newEqForm, serviceObject: e.target.value })}
                    placeholder="ex: Ascenseur Électrique 1000kg"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service Object Group</label>
                  <select
                    value={newEqForm.serviceObjectGroup}
                    onChange={(e) => setNewEqForm({ ...newEqForm, serviceObjectGroup: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Vertical Transportation (VT)">Vertical Transportation (VT)</option>
                    <option value="Escaliers & Trottoirs Roulants">Escaliers & Trottoirs Roulants</option>
                    <option value="Portes & Fermetures Automatiques">Portes & Fermetures Automatiques</option>
                    <option value="Monte-charges Spécifiques">Monte-charges Spécifiques</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Type Contrat</label>
                  <select
                    value={newEqForm.contractType}
                    onChange={(e) => setNewEqForm({ ...newEqForm, contractType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Complet VIP">Complet VIP</option>
                    <option value="Maintenance Préventive+">Maintenance Préventive+</option>
                    <option value="Standard">Standard</option>
                    <option value="Complet 24/7 Santé">Complet 24/7 Santé</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Street (Adresse)</label>
                  <input
                    type="text"
                    value={newEqForm.street}
                    onChange={(e) => setNewEqForm({ ...newEqForm, street: e.target.value })}
                    placeholder="ex: 33 Avenue du Maine"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">City (Ville)</label>
                  <input
                    type="text"
                    value={newEqForm.city}
                    onChange={(e) => setNewEqForm({ ...newEqForm, city: e.target.value })}
                    placeholder="ex: Paris, Lyon, Marseille..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date Dernier CPSI</label>
                  <input
                    type="date"
                    value={newEqForm.lastCpsiDate}
                    onChange={(e) => setNewEqForm({ ...newEqForm, lastCpsiDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Assigned Technician</label>
                  <input
                    type="text"
                    value={newEqForm.assignedTechnician}
                    onChange={(e) => setNewEqForm({ ...newEqForm, assignedTechnician: e.target.value })}
                    placeholder="Nom du technicien"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Service Leader</label>
                  <input
                    type="text"
                    value={newEqForm.serviceLeader}
                    onChange={(e) => setNewEqForm({ ...newEqForm, serviceLeader: e.target.value })}
                    placeholder="Responsable de service"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Commentaires / Remarques sur l'appareil (Consignes, accès, devis...)</span>
                </label>
                <textarea
                  rows={3}
                  value={newEqForm.notes || ""}
                  onChange={(e) => setNewEqForm({ ...newEqForm, notes: e.target.value })}
                  placeholder="ex: Accès par la loge gardien, passage recommandé le matin, devis en attente..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddEquipmentModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md"
                >
                  Enregistrer l'Appareil PF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD NON-CONFORMITY (NC) */}
      {showAddNcModal && targetEquipmentForNc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Déclarer une Non-Conformité (NC) - Règle des 100 Jours
                </h3>
              </div>
              <button
                onClick={() => setShowAddNcModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 text-xs text-slate-300 border border-slate-800 flex items-center justify-between">
              <span>Appareil : <strong className="text-blue-400 font-mono">{targetEquipmentForNc.pfNumber}</strong></span>
              <span className="text-slate-400 truncate max-w-[200px]">{targetEquipmentForNc.name}</span>
            </div>

            <form onSubmit={handleSaveNewNc} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Code NC</label>
                  <input
                    type="text"
                    required
                    value={newNcForm.code}
                    onChange={(e) => setNewNcForm({ ...newNcForm, code: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Gravité</label>
                  <select
                    value={newNcForm.severity}
                    onChange={(e) => setNewNcForm({ ...newNcForm, severity: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Faible">Faible (Confort / Esthétique)</option>
                    <option value="Moyenne">Moyenne (Usure prématurée)</option>
                    <option value="Majeure">Majeure (Sécurité partielle)</option>
                    <option value="Critique / Bloquante">Critique / Bloquante (Arrêt d'urgence)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Description détaillée de l'anomalie / non-conformité *
                </label>
                <textarea
                  rows={3}
                  required
                  value={newNcForm.description}
                  onChange={(e) => setNewNcForm({ ...newNcForm, description: e.target.value })}
                  placeholder="ex: Défaillance du frein de secours ou jeu excessif sur les câbles de suspension..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Plan d'Action Correctif & Pièces à Commander
                </label>
                <input
                  type="text"
                  value={newNcForm.actionPlan}
                  onChange={(e) => setNewNcForm({ ...newNcForm, actionPlan: e.target.value })}
                  placeholder="ex: Commande référence SKU-4902 et remplacement sous 15 jours"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              {/* Couverture & N° Devis Associé */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-200 font-semibold mb-1.5 text-xs uppercase tracking-wider">
                    Prise en charge des travaux de remise en conformité *
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setNewNcForm({ ...newNcForm, isCoveredByContract: false })}
                      className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        newNcForm.isCoveredByContract === false
                          ? "bg-amber-950/60 border-amber-500 text-amber-200 font-bold shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-amber-400 font-bold text-sm shrink-0">🟠</span>
                      <div>
                        <div className="font-semibold text-slate-100">Hors Contrat de Maintenance</div>
                        <div className="text-[10px] text-amber-300/80 font-normal mt-0.5">Travaux non couverts (Devis requis)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewNcForm({ ...newNcForm, isCoveredByContract: true, associatedQuoteNumber: "" })}
                      className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        newNcForm.isCoveredByContract === true
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-emerald-400 font-bold text-sm shrink-0">🟢</span>
                      <div>
                        <div className="font-semibold text-slate-100">Inclus dans le Contrat</div>
                        <div className="text-[10px] text-emerald-300/80 font-normal mt-0.5">Travaux couverts par la maintenance</div>
                      </div>
                    </button>
                  </div>
                </div>

                {newNcForm.isCoveredByContract === false && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-amber-300 font-semibold mb-1 text-xs">
                      N° Devis Associé (Si travaux Hors Contrat de maintenance) *
                    </label>
                    <input
                      type="text"
                      value={newNcForm.associatedQuoteNumber || ""}
                      onChange={(e) => setNewNcForm({ ...newNcForm, associatedQuoteNumber: e.target.value })}
                      placeholder="ex: R1009850"
                      className="w-full bg-slate-950 border border-amber-600/50 rounded-lg p-2 text-amber-100 font-mono text-sm focus:border-amber-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Indiquer le numéro de devis envoyé au client si les réparations ne sont pas prises en charge par le contrat de maintenance.
                    </p>
                  </div>
                )}

                {newNcForm.isCoveredByContract === true && (
                  <div className="p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Les travaux sont intégralement couverts par le contrat de maintenance. Aucun devis facturable requis.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-indigo-300 font-semibold mb-1">Date Prévisionnelle de Clôture</label>
                  <input
                    type="date"
                    value={newNcForm.estimatedClosureDate || ""}
                    onChange={(e) => setNewNcForm({ ...newNcForm, estimatedClosureDate: e.target.value })}
                    className="w-full bg-slate-950 border border-indigo-700/60 rounded-lg p-2 text-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Actions Réalisées / Faites</label>
                  <input
                    type="text"
                    value={newNcForm.actionsDone || ""}
                    onChange={(e) => setNewNcForm({ ...newNcForm, actionsDone: e.target.value })}
                    placeholder="ex: Remplacement galets effectué le 02/09"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date de Constat</label>
                  <input
                    type="date"
                    required
                    value={newNcForm.detectedDate}
                    onChange={(e) => setNewNcForm({ ...newNcForm, detectedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Technicien Assigné</label>
                  <select
                    value={newNcForm.assignedTechnician || targetEquipmentForNc.assignedTechnician}
                    onChange={(e) => setNewNcForm({ ...newNcForm, assignedTechnician: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 cursor-pointer"
                  >
                    {allKnownTechnicians.map((tech) => (
                      <option key={tech} value={tech}>
                        {tech} {tech === targetEquipmentForNc.assignedTechnician ? "(Titulaire Appareil)" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-rose-400 font-semibold mb-1">Échéance Impérative (100j)</label>
                <div className="p-2 rounded-lg bg-rose-950/40 border border-rose-800/60 font-mono text-rose-300 text-xs">
                  {addDays(newNcForm.detectedDate || CURRENT_DATE_STR, 100)}
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddNcModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-md"
                >
                  Créer et Enclencher les 100 Jours
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VISIT DATE & EXECUTION VALIDATION */}
      {visitModal.isOpen && visitModal.equipment && visitModal.visitKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  {visitModal.visitLabel}
                </h3>
              </div>
              <button
                onClick={() => setVisitModal((prev) => ({ ...prev, isOpen: false }))}
                className="text-slate-400 hover:text-slate-200 text-sm"
              >
                ✕
              </button>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 text-xs text-slate-300 border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">N° Appareil (PF) :</span>
                <strong className="font-mono text-blue-400">{visitModal.equipment.pfNumber}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Site / Nom :</span>
                <span className="text-slate-200 truncate max-w-[220px] font-medium">{visitModal.equipment.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Ville :</span>
                <span className="text-slate-200">{visitModal.equipment.city}</span>
              </div>
            </div>

            {/* SPECIAL CPSI PV SCANNER IN MODAL */}
            {visitModal.visitKey === "cpsi" && (
              <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-500/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-teal-300 flex items-center gap-1.5 text-xs">
                    <ShieldCheck className="w-4 h-4 text-teal-400" />
                    Scanner ou Importer le PV CPSI de cet appareil
                  </span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-teal-500/20 text-teal-300 font-bold">
                    IA Auto-Fill
                  </span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Déposez le rapport ou PV pour pré-remplir la date d'inspection, le bureau et générer le fichier normalisé pour le téléchargement.
                </p>
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center justify-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-dashed border-teal-500/50 hover:border-teal-400 text-teal-300 text-xs font-semibold cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choisir / Glisser un PV (PDF/Image)</span>
                    <input
                      type="file"
                      accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const today = CURRENT_DATE_STR;
                          const standardName = `PV_CPSI_${visitModal.equipment?.pfNumber || "EQUIP"}_${today}.pdf`;
                          setVisitModal((prev) => ({
                            ...prev,
                            date: today,
                            technician: prev.technician || "Bureau de Contrôle Agréé (Apave / Dekra)",
                            notes: `Validé via PV CPSI : ${file.name} ➔ ${standardName}`,
                          }));
                        }
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const today = CURRENT_DATE_STR;
                      const standardName = `PV_CPSI_${visitModal.equipment?.pfNumber || "EQUIP"}_${today}.pdf`;
                      setVisitModal((prev) => ({
                        ...prev,
                        date: today,
                        technician: "Apave Inspection / M. Bernard",
                        notes: `Conforme - PV CPSI annuel validé (${standardName})`,
                      }));
                    }}
                    className="px-2.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-slate-950 font-bold text-[11px] cursor-pointer whitespace-nowrap transition-colors"
                  >
                    ⚡ Test Auto
                  </button>
                </div>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveVisitModal(true);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block text-slate-200 font-semibold mb-1">
                  Date Réelle de Réalisation de la Visite *
                </label>
                <input
                  type="date"
                  required
                  value={visitModal.date}
                  onChange={(e) => setVisitModal({ ...visitModal, date: e.target.value })}
                  className="w-full bg-slate-950 border border-blue-500/50 focus:border-blue-400 rounded-lg p-2.5 text-slate-100 font-mono font-medium shadow-inner"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Technicien Ayant Réalisé le Passage
                </label>
                <input
                  type="text"
                  value={visitModal.technician}
                  onChange={(e) => setVisitModal({ ...visitModal, technician: e.target.value })}
                  placeholder="ex: Karim Bennani"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Observations / Compte-rendu d'intervention (Optionnel)
                </label>
                <textarea
                  rows={2}
                  value={visitModal.notes}
                  onChange={(e) => setVisitModal({ ...visitModal, notes: e.target.value })}
                  placeholder="ex: Contrôle serrure palière et graissage câbles OK, RAS..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-800">
                {visitModal.isDone ? (
                  <button
                    type="button"
                    onClick={() => handleSaveVisitModal(false)}
                    className="px-3 py-2 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-800/60 text-rose-300 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    Décocher / Non Réalisée
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setVisitModal((prev) => ({ ...prev, isOpen: false }))}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                  >
                    Annuler
                  </button>
                )}

                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Valider & Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TRANSFER TO ARCHIVE / HORS GARANTIE / RÉSILIÉ */}
      {archiveTransferModal.isOpen && archiveTransferModal.equipment && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                <Archive className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Transférer vers Hors Garantie / Résilié</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Appareil : <strong className="text-amber-400 font-mono">{archiveTransferModal.equipment.pfNumber}</strong> - {archiveTransferModal.equipment.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Cet appareil sera déplacé dans le registre historique <strong>"Parc Hors Garantie / Résilié (Duplicata)"</strong>. Son historique sera conservé et il restera sélectionnable lors de la rédaction des rapports techniques.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Motif du transfert *</label>
                <select
                  value={archiveTransferModal.reason}
                  onChange={(e) => setArchiveTransferModal((prev) => ({ ...prev, reason: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                >
                  <option value="Hors Garantie (Échéance)">Hors Garantie (Échéance normale)</option>
                  <option value="Résilié (Client parti)">Résilié (Client parti)</option>
                  <option value="Contrat Suspendu">Contrat Suspendu</option>
                  <option value="Équipement Remplacé / Modernisé">Équipement Remplacé / Modernisé</option>
                  <option value="Autre Historique">Autre Historique</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Date de sortie / cessation *</label>
                <input
                  type="date"
                  value={archiveTransferModal.exitDate}
                  onChange={(e) => setArchiveTransferModal((prev) => ({ ...prev, exitDate: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes / Raison détaillée</label>
                <textarea
                  rows={2}
                  value={archiveTransferModal.notes}
                  onChange={(e) => setArchiveTransferModal((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="ex: Fin de contrat au 31/12, pas de renouvellement..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setArchiveTransferModal((prev) => ({ ...prev, isOpen: false, equipment: null }))}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmTransferFromModal}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-600/30"
              >
                <Archive className="w-3.5 h-3.5" />
                <span>Confirmer le Transfert</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE EQUIPMENT CONFIRMATION */}
      {equipmentToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Supprimer cet appareil (PF) ?</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Appareil : <strong className="text-rose-400 font-mono">{equipmentToDelete.pfNumber}</strong> - {equipmentToDelete.name}
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Êtes-vous sûr de vouloir supprimer cet appareil ? Toutes ses visites (11 visites + CPSI) et ses non-conformités associées seront retirées du parc.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setEquipmentToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteEquipment}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Confirmer la Suppression</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PURGE ALL CONFIRMATION */}
      {showPurgeModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border-2 border-rose-600 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/40">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-base">Purger l'intégralité du Parc PF</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Action irréversible &bull; Suppression de tous les enregistrements
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-700/50 space-y-2 text-xs text-rose-200 leading-relaxed">
              <p className="font-bold text-rose-300">⚠️ Attention :</p>
              <p>
                Vous allez supprimer l'ensemble des <strong>{equipments.length} appareils</strong>, l'historique complet des <strong>11 visites</strong>, les <strong>visites CPSI</strong> ainsi que toutes les <strong>Non-Conformités (NC)</strong>.
              </p>
              <p className="text-[11px] text-slate-400">
                💡 Astuce : Vous pourrez à tout moment réimporter votre fichier Excel (.xlsx) ou cliquer sur "Démo" pour charger le jeu d'exemple standard.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setShowPurgeModal(false)}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmPurgeAll}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-600/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Oui, Purger Tout le Parc</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE NC CONFIRMATION */}
      {ncToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-100 text-sm">Supprimer la Non-Conformité ?</h3>
                <p className="text-slate-400 text-xs mt-0.5">
                  Code NC : <strong className="text-rose-400 font-mono">{ncToDelete.code}</strong>
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Voulez-vous supprimer définitivement cette non-conformité de l'appareil ?
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setNcToDelete(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteNc}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-600/30"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Supprimer la NC</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT NC WITH TEMPLATE & COHERENT DATA */}
      {showImportNcModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Importation des Non-Conformités (NC) avec Trame
                </h3>
              </div>
              <button
                onClick={() => setShowImportNcModal(false)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              Cet outil permet d'importer des Non-Conformités en les rattachant automatiquement aux numéros d'appareils PF et comptes clients des devis. <strong>Note : cette opération n'altère pas les devis existants.</strong>
            </p>

            <div className="space-y-3">
              {/* Button 1: Download Template */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-200">1. Trame d'Importation Standard (.csv)</h4>
                  <p className="text-[11px] text-slate-400">Téléchargez le modèle contenant les colonnes requises</p>
                </div>
                <button
                  type="button"
                  onClick={downloadNcTemplateCsv}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>Télécharger Trame</span>
                </button>
              </div>

              {/* Button 2: Import Coherent Demo Data */}
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-amber-300">2. Charger Données NC Cohérentes (Devis 2026)</h4>
                  <p className="text-[11px] text-slate-400">Génère automatiquement les NC réelles sur les appareils & devis</p>
                </div>
                <button
                  type="button"
                  onClick={handleImportCoherentNcDemo}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Charger NC Démo</span>
                </button>
              </div>

              {/* Custom File Upload */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-200">3. Importer votre fichier Excel / CSV personnalisé</h4>
                <button
                  type="button"
                  onClick={() => {
                    if (ncFileInputRef.current) {
                      ncFileInputRef.current.value = "";
                      ncFileInputRef.current.click();
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slate-900 hover:bg-slate-850 border border-dashed border-slate-700 text-slate-300 text-xs font-medium cursor-pointer transition-colors"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Parcourir / Choisir un fichier (.xlsx, .csv)</span>
                </button>
                <input
                  ref={ncFileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.tsv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={handleImportNcFile}
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowImportNcModal(false)}
                className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT EQUIPMENT PF */}
      {editingEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                Modifier l'Appareil PF ({editingEquipment.pfNumber})
              </h3>
              <button
                onClick={() => setEditingEquipment(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditEquipment} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">N° Appareil (PF) *</label>
                  <input
                    type="text"
                    required
                    value={editingEquipment.pfNumber}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, pfNumber: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Customer Account</label>
                  <input
                    type="text"
                    value={editingEquipment.customerAccount || ""}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, customerAccount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Project ID</label>
                  <input
                    type="text"
                    value={editingEquipment.projectId || ""}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, projectId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Nom du site / Appareil *</label>
                <input
                  type="text"
                  required
                  value={editingEquipment.name}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Adresse / Street</label>
                  <input
                    type="text"
                    value={editingEquipment.street || ""}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, street: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Ville</label>
                  <input
                    type="text"
                    value={editingEquipment.city || ""}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, city: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Technicien Assigné</label>
                  <input
                    type="text"
                    value={editingEquipment.assignedTechnician || ""}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, assignedTechnician: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date Dernier CPSI</label>
                  <input
                    type="date"
                    value={editingEquipment.lastCpsiDate || ""}
                    onChange={(e) => setEditingEquipment({ ...editingEquipment, lastCpsiDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Commentaires / Remarques sur l'appareil (Consignes, accès, devis...)</span>
                </label>
                <textarea
                  rows={3}
                  value={editingEquipment.notes || ""}
                  onChange={(e) => setEditingEquipment({ ...editingEquipment, notes: e.target.value })}
                  placeholder="ex: Accès par la loge gardien, passage recommandé le matin, devis en attente..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 text-xs focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingEquipment(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md cursor-pointer"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT NON-CONFORMITY */}
      {editingNc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-100">
                  Modifier la Non-Conformité ({editingNc.nc.code})
                </h3>
              </div>
              <button
                onClick={() => setEditingNc(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditNc} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Code NC</label>
                  <input
                    type="text"
                    required
                    value={editingNc.nc.code}
                    onChange={(e) =>
                      setEditingNc({ ...editingNc, nc: { ...editingNc.nc, code: e.target.value } })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Gravité</label>
                  <select
                    value={editingNc.nc.severity}
                    onChange={(e) =>
                      setEditingNc({ ...editingNc, nc: { ...editingNc.nc, severity: e.target.value as any } })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  >
                    <option value="Faible">Faible (Confort / Esthétique)</option>
                    <option value="Moyenne">Moyenne (Usure prématurée)</option>
                    <option value="Majeure">Majeure (Sécurité partielle)</option>
                    <option value="Critique / Bloquante">Critique / Bloquante (Arrêt d'urgence)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Description détaillée *</label>
                <textarea
                  rows={3}
                  required
                  value={editingNc.nc.description}
                  onChange={(e) =>
                    setEditingNc({ ...editingNc, nc: { ...editingNc.nc, description: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Plan d'Action Correctif</label>
                <input
                  type="text"
                  value={editingNc.nc.actionPlan || ""}
                  onChange={(e) =>
                    setEditingNc({ ...editingNc, nc: { ...editingNc.nc, actionPlan: e.target.value } })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                />
              </div>

              {/* Couverture & N° Devis Associé */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-slate-200 font-semibold mb-1.5 text-xs uppercase tracking-wider">
                    Prise en charge des travaux de remise en conformité *
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() =>
                        setEditingNc({
                          ...editingNc,
                          nc: { ...editingNc.nc, isCoveredByContract: false },
                        })
                      }
                      className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        editingNc.nc.isCoveredByContract === false || editingNc.nc.associatedQuoteNumber
                          ? "bg-amber-950/60 border-amber-500 text-amber-200 font-bold shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-amber-400 font-bold text-sm shrink-0">🟠</span>
                      <div>
                        <div className="font-semibold text-slate-100">Hors Contrat de Maintenance</div>
                        <div className="text-[10px] text-amber-300/80 font-normal mt-0.5">Travaux non couverts (Devis)</div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setEditingNc({
                          ...editingNc,
                          nc: { ...editingNc.nc, isCoveredByContract: true, associatedQuoteNumber: undefined },
                        })
                      }
                      className={`p-2.5 rounded-lg border text-left flex items-start gap-2 transition-all cursor-pointer ${
                        editingNc.nc.isCoveredByContract === true && !editingNc.nc.associatedQuoteNumber
                          ? "bg-emerald-950/60 border-emerald-500 text-emerald-200 font-bold shadow-xs"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      <span className="text-emerald-400 font-bold text-sm shrink-0">🟢</span>
                      <div>
                        <div className="font-semibold text-slate-100">Inclus dans le Contrat</div>
                        <div className="text-[10px] text-emerald-300/80 font-normal mt-0.5">Pris en charge par la maintenance</div>
                      </div>
                    </button>
                  </div>
                </div>

                {(editingNc.nc.isCoveredByContract === false || editingNc.nc.associatedQuoteNumber) && (
                  <div className="pt-2 border-t border-slate-800">
                    <label className="block text-amber-300 font-semibold mb-1 text-xs">
                      N° Devis Associé (Si travaux Hors Contrat de maintenance) *
                    </label>
                    <input
                      type="text"
                      value={editingNc.nc.associatedQuoteNumber || ""}
                      onChange={(e) =>
                        setEditingNc({
                          ...editingNc,
                          nc: { ...editingNc.nc, associatedQuoteNumber: e.target.value, isCoveredByContract: false },
                        })
                      }
                      placeholder="ex: R1009850"
                      className="w-full bg-slate-950 border border-amber-600/50 rounded-lg p-2 text-amber-100 font-mono text-sm focus:border-amber-400 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Numéro du devis de remise en conformité transmis au client pour ces travaux hors contrat de maintenance.
                    </p>
                  </div>
                )}

                {editingNc.nc.isCoveredByContract === true && !editingNc.nc.associatedQuoteNumber && (
                  <div className="p-2 rounded bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-[11px] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Les travaux sont pris en charge par le contrat de maintenance. Aucun devis facturable n'est requis.</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-indigo-300 font-semibold mb-1">Date Prévisionnelle de Clôture</label>
                  <input
                    type="date"
                    value={editingNc.nc.estimatedClosureDate || ""}
                    onChange={(e) =>
                      setEditingNc({
                        ...editingNc,
                        nc: { ...editingNc.nc, estimatedClosureDate: e.target.value },
                      })
                    }
                    className="w-full bg-slate-950 border border-indigo-700/60 rounded-lg p-2 text-indigo-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Actions Réalisées / Faites</label>
                  <input
                    type="text"
                    value={editingNc.nc.actionsDone || ""}
                    onChange={(e) =>
                      setEditingNc({
                        ...editingNc,
                        nc: { ...editingNc.nc, actionsDone: e.target.value },
                      })
                    }
                    placeholder="ex: Remplacement pièce effectué"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Date de Constat</label>
                  <input
                    type="date"
                    required
                    value={editingNc.nc.detectedDate}
                    onChange={(e) =>
                      setEditingNc({
                        ...editingNc,
                        nc: {
                          ...editingNc.nc,
                          detectedDate: e.target.value,
                          deadlineDate: addDays(e.target.value, 100),
                        },
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Technicien Responsable</label>
                  <div className="w-full bg-slate-950/80 border border-slate-700 rounded-lg p-2.5 text-blue-300 font-bold text-xs flex items-center justify-between">
                    <span className="uppercase tracking-wide">
                      {equipments.find((e) => e.id === editingNc.eqId)?.assignedTechnician ||
                        editingNc.nc.assignedTechnician ||
                        "Non assigné"}
                    </span>
                    <span className="text-[10px] text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-800/50 px-2 py-0.5 rounded">
                      Titulaire Appareil
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingNc(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs shadow-md cursor-pointer"
                >
                  Sauvegarder la NC
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: QUICK COMMENT / NOTES FOR EQUIPMENT */}
      {quickCommentModalEq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-300">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Commentaires sur l'Appareil {quickCommentModalEq.pfNumber}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {quickCommentModalEq.name} &bull; Tech: <span className="text-blue-300 font-semibold">{quickCommentModalEq.assignedTechnician}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQuickCommentModalEq(null)}
                className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Commentaires / Remarques / Consignes d'accès :
                </label>
                <textarea
                  rows={4}
                  value={equipmentCommentText}
                  onChange={(e) => setEquipmentCommentText(e.target.value)}
                  placeholder="Saisissez ici des informations pratiques ou techniques concernant cet appareil (ex: clé chez le gardien bât B, devis hors contrat transmis, etc.)..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl p-3 text-slate-200 leading-relaxed text-xs focus:outline-none"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                {quickCommentModalEq.notes ? (
                  <button
                    type="button"
                    onClick={() => {
                      setEquipmentCommentText("");
                      handleSaveEquipmentComment(quickCommentModalEq.id, "");
                    }}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Effacer le commentaire</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickCommentModalEq(null)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium cursor-pointer"
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSaveEquipmentComment(quickCommentModalEq.id, equipmentCommentText)}
                    className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-md cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Enregistrer le commentaire</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FULL NC CLOSURE DOCUMENT GENERATOR */}
      {ncDocModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto p-4 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">
                    Générateur Officiel de Bon de Clôture des NCs Schindler (Maintenance & CPSI)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Modèle officiel répliqué avec logo Schindler, tableau d'intervention et signature superviseur
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNcDocModal({ isOpen: false, nc: null, equipment: null })}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                ✕ Fermer
              </button>
            </div>

            <NcClosureDocument
              initialNc={ncDocModal.nc}
              initialEquipment={ncDocModal.equipment}
            />
          </div>
        </div>
      )}
    </div>
  );
};
