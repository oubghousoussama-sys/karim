import jsPDF from "jspdf";
import {
  PointageDayName,
  RHCongeDocument,
  RHNoteFraisDocument,
  RHPointageDocument,
  RHPointageLine
} from "../../../types";

const POINTAGE_DAYS: PointageDayName[] = [
  "LUNDI",
  "MARDI",
  "MERCREDI",
  "JEUDI",
  "VENDREDI",
  "SAMEDI",
  "DIMANCHE"
];

export function formatFrDate(isoDate?: string): string {
  if (!isoDate) return "";
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]} / ${match[2]} / ${match[1].slice(2)}`;
  }
  return isoDate;
}

export function formatFrDateFull(isoDate?: string): string {
  if (!isoDate) return "";
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }
  return isoDate;
}

export function formatHoursLabel(val: number): string {
  if (!val || val <= 0) return "";
  const whole = Math.floor(val);
  const mins = Math.round((val - whole) * 60);
  if (mins === 0) return `${whole}h`;
  return `${whole}h${String(mins).padStart(2, "0")}`;
}

export function formatMoney(val: number): string {
  if (!val || val === 0) return "";
  return val
    .toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    .replace(/[\u00A0\u202F]/g, " ");
}

export function getPointageLineTotalHours(line: RHPointageLine): number {
  return (
    (Number(line.entretien) || 0) +
    (Number(line.reparation) || 0) +
    (Number(line.permanence) || 0) +
    (Number(line.depannage) || 0) +
    (Number(line.horsDecompte) || 0) +
    (Number(line.formation) || 0) +
    (Number(line.congesJoursFeries) || 0)
  );
}

async function loadImageAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * 1. FEUILLE HEBDOMADAIRE DE POINTAGE — SCHINDLER MAROC (A4 Portrait)
 */
export function exportPointagePDF(data: RHPointageDocument) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const marginX = 8;
  const contentWidth = 194; // 210 - 16
  let y = 10;

  // Helper to get DD/MM for each day from dateDebut
  const getDayDateLabel = (dayIndex: number): string => {
    if (!data.dateDebut) return "";
    const parts = data.dateDebut.split("-").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return "";
    const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2] + dayIndex));
    if (isNaN(d.getTime())) return "";
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${dd}/${mm}`;
  };

  // Boxed "SCHINDLER - MAROC"
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.5);
  doc.roundedRect(marginX, y, 52, 8.5, 1.5, 1.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text("SCHINDLER - MAROC", marginX + 26, y + 5.6, { align: "center" });

  // Right metadata block
  const rightMetaX = 116;
  doc.setFontSize(8.5);
  const metaRows = [
    ["AGENCE :", data.agence || "FES"],
    ["SERVICE :", data.service || "S.A.V"],
    ["NOM :", (data.nom || "").toUpperCase()],
    ["MATRICULE :", data.matricule || ""]
  ];
  metaRows.forEach(([label, value], idx) => {
    const my = y + 3.2 + idx * 5.8;
    doc.setFont("helvetica", "bold");
    doc.setTextColor(51, 65, 85);
    doc.text(label, rightMetaX, my);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(value, rightMetaX + 24, my);
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.2);
    doc.line(rightMetaX + 23, my + 1.1, marginX + contentWidth, my + 1.1);
  });

  // Title & Week Range left
  doc.setDrawColor(15, 23, 42);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(15, 23, 42);
  doc.text("FEUILLE HEBDOMADAIRE DE POINTAGE", marginX, y + 14.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  doc.text(
    `DU LUNDI  ${formatFrDate(data.dateDebut) || "___/___/___"}   AU DIMANCHE  ${formatFrDate(data.dateFin) || "___/___/___"}`,
    marginX,
    y + 20.5
  );
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text(`N° SEMAINE :  ${data.numSemaine || ""}`, marginX, y + 26.5);

  y = 40;

  // Column geometry (total = 194mm) — wider horizontal JOURS column (21mm)
  const colWidths = {
    jour: 21,
    imputation: 28,
    entretien: 11.25,
    reparation: 11.25,
    permanence: 11.25,
    depannage: 11.25,
    horsDecompte: 11.5,
    formation: 11.5,
    conges: 11.5,
    totaux: 15.5,
    absence: 10,
    maladie: 10,
    indDepl: 15,
    indPerm: 15
  };

  const xPos: Record<string, number> = {};
  let cx = marginX;
  for (const [k, w] of Object.entries(colWidths)) {
    xPos[k] = cx;
    cx += w;
  }

  const groupHeaderH = 9.5;
  const subHeaderH = 22.5;
  const totalHeaderH = groupHeaderH + subHeaderH;

  // Header Background
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.35);
  doc.rect(marginX, y, contentWidth, totalHeaderH, "FD");

  // Full-height columns (JOURS, IMPUTATION, TOTAUX HEURES POINTEES)
  doc.line(xPos.imputation, y, xPos.imputation, y + totalHeaderH);
  doc.line(xPos.entretien, y, xPos.entretien, y + totalHeaderH);
  doc.line(xPos.totaux, y, xPos.totaux, y + totalHeaderH);
  doc.line(xPos.absence, y, xPos.absence, y + totalHeaderH);
  doc.line(xPos.indDepl, y, xPos.indDepl, y + totalHeaderH);

  // Horizontal divider between group header and sub-header for grouped blocks
  doc.line(xPos.imputation, y + groupHeaderH, xPos.totaux, y + groupHeaderH);
  doc.line(xPos.absence, y + groupHeaderH, marginX + contentWidth, y + groupHeaderH);

  // Group boundary vertical lines
  doc.line(xPos.horsDecompte, y, xPos.horsDecompte, y + totalHeaderH);

  // Sub-column vertical lines
  const subDividers = [
    xPos.reparation,
    xPos.permanence,
    xPos.depannage,
    xPos.formation,
    xPos.conges,
    xPos.maladie,
    xPos.indPerm
  ];
  subDividers.forEach((sx) => {
    doc.line(sx, y + groupHeaderH, sx, y + totalHeaderH);
  });

  // Group Header Labels (all horizontally centered cleanly!)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text("JOURS", xPos.jour + colWidths.jour / 2, y + totalHeaderH / 2 + 1, { align: "center" });

  doc.setFontSize(7.5);
  doc.text("IMPUTATION", xPos.imputation + colWidths.imputation / 2, y + 6, { align: "center" });
  doc.setFontSize(8);
  doc.text("N° E", xPos.imputation + colWidths.imputation / 2, y + groupHeaderH + 12.5, {
    align: "center"
  });

  doc.setFontSize(6.4);
  doc.text(
    "HEURES MAINTENANCE\nSOUS CONTRAT",
    xPos.entretien + (colWidths.entretien * 4) / 2,
    y + 3.8,
    { align: "center" }
  );
  doc.text(
    "HEURES NON\nAFFECTÉES",
    xPos.horsDecompte + (colWidths.horsDecompte * 3) / 2,
    y + 3.8,
    { align: "center" }
  );

  doc.setFontSize(5.9);
  doc.text("TOTAUX\nHEURES\nPOINTÉES", xPos.totaux + colWidths.totaux / 2, y + 12.2, {
    align: "center"
  });

  doc.setFontSize(6.4);
  doc.text("HEURES\nRETENUES", xPos.absence + (colWidths.absence * 2) / 2, y + 3.8, {
    align: "center"
  });
  doc.text("INDEMNITÉS", xPos.indDepl + (colWidths.indDepl * 2) / 2, y + 6, { align: "center" });

  // Vertical sub-header labels (no align: "center" bug — exact vertical anchor from bottom)
  const verticalLabels: Array<{ key: keyof typeof colWidths; text: string }> = [
    { key: "entretien", text: "Entretien" },
    { key: "reparation", text: "Réparation" },
    { key: "permanence", text: "Permanence" },
    { key: "depannage", text: "Dépannage" },
    { key: "horsDecompte", text: "Hors décompte" },
    { key: "formation", text: "Formation" },
    { key: "conges", text: "Congés / J. fériés" },
    { key: "absence", text: "Absence" },
    { key: "maladie", text: "Maladie" },
    { key: "indDepl", text: "Déplacement" },
    { key: "indPerm", text: "Permanence" }
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  verticalLabels.forEach(({ key, text }) => {
    const xCenter = xPos[key] + colWidths[key] / 2 + 1.1;
    const yBottom = y + totalHeaderH - 2;
    doc.text(text, xCenter, yBottom, { angle: 90 });
  });

  y += totalHeaderH;

  // Group lines by day (minimum 3 visual rows per day for clean fidelity)
  const dayBlocks = POINTAGE_DAYS.map((day, idx) => {
    const matching = data.lines.filter((l) => l.day === day);
    const visualCount = Math.max(3, matching.length);
    return { day, dayIndex: idx, lines: matching, visualCount };
  });

  const totalVisualRows = dayBlocks.reduce((acc, b) => acc + b.visualCount, 0);
  const availableTableHeight = 161; // keep totals + footer cleanly on A4 page 1
  const rowH = Math.min(7.4, Math.max(5.2, availableTableHeight / totalVisualRows));

  // Column totals accumulators
  const totals = {
    entretien: 0,
    reparation: 0,
    permanence: 0,
    depannage: 0,
    horsDecompte: 0,
    formation: 0,
    conges: 0,
    heuresPointees: 0,
    absence: 0,
    maladie: 0,
    indDepl: 0,
    indPerm: 0
  };

  dayBlocks.forEach((block) => {
    const blockH = block.visualCount * rowH;
    const blockStartY = y;

    // Subtle alternating day tint for crisp visual readability
    if (block.dayIndex % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, blockStartY, contentWidth, blockH, "F");
    }

    // Distinct soft background on JOURS and TOTAUX columns for structural clarity
    doc.setFillColor(241, 245, 249);
    doc.rect(xPos.jour, blockStartY, colWidths.jour, blockH, "F");
    doc.setFillColor(248, 250, 252);
    doc.rect(xPos.totaux, blockStartY, colWidths.totaux, blockH, "F");

    // Day outer box
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.38);
    doc.rect(marginX, blockStartY, contentWidth, blockH, "S");

    // Day total hours
    const dayHours = block.lines.reduce((s, l) => s + getPointageLineTotalHours(l), 0);

    // Draw rows inside block
    for (let i = 0; i < block.visualCount; i++) {
      const ry = blockStartY + i * rowH;
      if (i > 0) {
        doc.setDrawColor(148, 163, 184);
        doc.setLineWidth(0.18);
        // Line across non-merged columns (skip JOURS and TOTAUX HEURES POINTEES)
        doc.line(xPos.imputation, ry, xPos.totaux, ry);
        doc.line(xPos.absence, ry, marginX + contentWidth, ry);
      }

      const line = block.lines[i];
      if (line) {
        totals.entretien += Number(line.entretien) || 0;
        totals.reparation += Number(line.reparation) || 0;
        totals.permanence += Number(line.permanence) || 0;
        totals.depannage += Number(line.depannage) || 0;
        totals.horsDecompte += Number(line.horsDecompte) || 0;
        totals.formation += Number(line.formation) || 0;
        totals.conges += Number(line.congesJoursFeries) || 0;
        totals.heuresPointees += getPointageLineTotalHours(line);
        totals.absence += Number(line.absence) || 0;
        totals.maladie += Number(line.maladie) || 0;
        totals.indDepl += Number(line.indemniteDeplacement) || 0;
        totals.indPerm += Number(line.indemnitePermanence) || 0;

        const textY = ry + rowH * 0.68;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7.2);
        doc.setTextColor(15, 23, 42);

        if (line.imputation) {
          doc.text(String(line.imputation).slice(0, 18), xPos.imputation + 1.5, textY);
        }

        const numCols: Array<{ key: keyof typeof colWidths; val: string }> = [
          { key: "entretien", val: formatHoursLabel(line.entretien) },
          { key: "reparation", val: formatHoursLabel(line.reparation) },
          { key: "permanence", val: formatHoursLabel(line.permanence) },
          { key: "depannage", val: formatHoursLabel(line.depannage) },
          { key: "horsDecompte", val: formatHoursLabel(line.horsDecompte) },
          { key: "formation", val: formatHoursLabel(line.formation) },
          { key: "conges", val: formatHoursLabel(line.congesJoursFeries) },
          { key: "absence", val: formatHoursLabel(line.absence) },
          { key: "maladie", val: formatHoursLabel(line.maladie) },
          { key: "indDepl", val: formatMoney(line.indemniteDeplacement) },
          { key: "indPerm", val: formatMoney(line.indemnitePermanence) }
        ];

        doc.setFontSize(7);
        numCols.forEach(({ key, val }) => {
          if (val) {
            doc.text(val, xPos[key] + colWidths[key] / 2, textY, { align: "center" });
          }
        });
      }
    }

    // Draw vertical column lines across the full block height
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.22);
    Object.values(xPos)
      .slice(1)
      .forEach((vx) => {
        doc.line(vx, blockStartY, vx, blockStartY + blockH);
      });

    // Horizontal centered Day name + Date in JOURS cell (clean, legible, zero overlap!)
    const dayDate = getDayDateLabel(block.dayIndex);
    const centerX = xPos.jour + colWidths.jour / 2;
    const centerY = blockStartY + blockH / 2;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    if (dayDate) {
      doc.text(block.day, centerX, centerY - 0.8, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(71, 85, 105);
      doc.text(dayDate, centerX, centerY + 3.0, { align: "center" });
    } else {
      doc.text(block.day, centerX, centerY + 1.0, { align: "center" });
    }

    // Day total hours centered in TOTAUX HEURES POINTEES merged cell
    if (dayHours > 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(formatHoursLabel(dayHours), xPos.totaux + colWidths.totaux / 2, centerY + 1.4, {
        align: "center"
      });
    }

    y += blockH;
  });

  // TOTAUX Row
  const totRowH = 11;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.4);
  doc.rect(marginX, y, contentWidth, totRowH, "FD");

  // Vertical lines in TOTAUX row (skip line between jour & imputation)
  Object.entries(xPos).forEach(([k, vx]) => {
    if (k !== "jour" && k !== "imputation") {
      doc.line(vx, y, vx, y + totRowH);
    }
  });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text("TOTAUX :", xPos.jour + (colWidths.jour + colWidths.imputation) / 2, y + 6.8, {
    align: "center"
  });

  const totCells: Array<{ key: keyof typeof colWidths; val: string }> = [
    { key: "entretien", val: formatHoursLabel(totals.entretien) },
    { key: "reparation", val: formatHoursLabel(totals.reparation) },
    { key: "permanence", val: formatHoursLabel(totals.permanence) },
    { key: "depannage", val: formatHoursLabel(totals.depannage) },
    { key: "horsDecompte", val: formatHoursLabel(totals.horsDecompte) },
    { key: "formation", val: formatHoursLabel(totals.formation) },
    { key: "conges", val: formatHoursLabel(totals.conges) },
    { key: "totaux", val: formatHoursLabel(totals.heuresPointees) || "0h" },
    { key: "absence", val: formatHoursLabel(totals.absence) },
    { key: "maladie", val: formatHoursLabel(totals.maladie) },
    { key: "indDepl", val: formatMoney(totals.indDepl) },
    { key: "indPerm", val: formatMoney(totals.indPerm) }
  ];

  doc.setFontSize(7.3);
  totCells.forEach(({ key, val }) => {
    if (val) {
      doc.text(val, xPos[key] + colWidths[key] / 2, y + 6.5, { align: "center" });
    }
  });

  y += totRowH + 2;

  // Combined Indemnities Total line under Indemnités columns
  const totalIndemnites = totals.indDepl + totals.indPerm;
  if (totalIndemnites > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.6);
    doc.text(
      `Total Indemnités : ${formatMoney(totalIndemnites)} MAD`,
      marginX + contentWidth - 1.5,
      y + 3.2,
      { align: "right" }
    );
  }

  // Footer: Établi le / Justification / Visa
  const footerY = Math.max(y + 10, 258);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(`Établi le :  ${formatFrDate(data.etabliLe) || "___/___/___"}`, marginX, footerY);
  doc.setFontSize(7.5);
  doc.text("* Justification au verso", marginX + 68, footerY);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text(`Visa : ${data.visaResponsable || ""}`, marginX + 132, footerY);

  if (data.signatureDataUrl) {
    try {
      doc.addImage(data.signatureDataUrl, "PNG", marginX + 138, footerY + 2, 42, 16, undefined, "FAST");
    } catch {
      // Ignore invalid image data
    }
  }

  if (data.justificationVerso?.trim()) {
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("JUSTIFICATION AU VERSO — FEUILLE DE POINTAGE", 15, 20);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    const lines = doc.splitTextToSize(data.justificationVerso, 180);
    doc.text(lines, 15, 32);
  }

  const safeName = (data.nom || "Collaborateur").replace(/[^a-zA-Z0-9-_]/g, "_");
  const safeWeek = (data.numSemaine || "Semaine").replace(/[^a-zA-Z0-9-_]/g, "_");
  doc.save(`Fiche_Pointage_${safeName}_${safeWeek}.pdf`);
}

/**
 * 2. AUTORISATION DE CONGÉ / DEMANDE DE CONGÉ (A4 Portrait)
 */
export function exportCongePDF(data: RHCongeDocument) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4"
  });

  const pageW = 210;
  const marginX = 24;
  const contentW = pageW - marginX * 2; // 162mm
  const rightX = pageW - marginX;

  doc.setTextColor(15, 23, 42);
  doc.setDrawColor(30, 41, 59);

  // Header Title: Autorisation de Congé
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Autorisation de Congé", pageW / 2, 24, { align: "center" });

  doc.setLineWidth(0.45);
  doc.line(marginX, 30, rightX, 30);

  // Section 1: Demande de Congé
  let y = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Demande de Congé", pageW / 2, y, { align: "center" });

  y += 12;
  const labelX = marginX;
  const valX = marginX + 42;

  const infoRows: Array<[string, string]> = [
    ["Nom & Prénom :", (data.nomPrenom || "").toUpperCase()],
    ["MLE :", data.mle || ""],
    ["Fonction :", data.fonction || ""],
    ["Service :", data.service || ""],
    ["Date de départ :", formatFrDateFull(data.dateDepart)],
    ["Date retour :", formatFrDateFull(data.dateRetour)]
  ];

  infoRows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(lbl, labelX, y);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(val, valX, y);
    y += 7.5;
  });

  // VISA de l'intéressé
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("VISA de l'intéressé", rightX - 18, y, { align: "center" });
  if (data.signatureInteresseDataUrl) {
    try {
      doc.addImage(data.signatureInteresseDataUrl, "PNG", rightX - 42, y + 2, 46, 18, undefined, "FAST");
    } catch {
      // ignore
    }
  } else if (data.visaInteresse) {
    doc.setFont("helvetica", "italic");
    doc.text(data.visaInteresse, rightX - 18, y + 10, { align: "center" });
  }

  y += 22;
  doc.setLineWidth(0.45);
  doc.line(marginX, y, rightX, y);

  // Section 2: Situation Congés Payés (Réservé à la DRH)
  y += 11;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Situation Congés Payés (Réservé à la DRH)", pageW / 2, y, { align: "center" });

  y += 12;
  const totalDispo = (Number(data.reliquatAnneeNMoins1) || 0) + (Number(data.reliquatAnneeN) || 0);
  const demandes = Number(data.joursDemandes) || 0;
  const nouveauReliquat = totalDispo - demandes;

  const drhRows: Array<[string, string]> = [
    ["Reliquat des jours dus au titre de l'année N-1", `${Number(data.reliquatAnneeNMoins1) || 0} j`],
    ["Reliquat des jours dus au titre de l'année N", `${Number(data.reliquatAnneeN) || 0} j`],
    ["Nombre de jours de congé demandés", `${demandes} j`],
    ["Nouveau reliquat de jours de congés payés", `${nouveauReliquat} j`]
  ];

  drhRows.forEach(([lbl, val]) => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.text(lbl, labelX, y);
    doc.setFont("helvetica", "bold");
    doc.text(val, rightX - 24, y, { align: "right" });
    y += 8;
  });

  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("VISA DRH", rightX - 24, y, { align: "center" });
  if (data.visaDrh) {
    doc.setFont("helvetica", "bold");
    doc.text(data.visaDrh, rightX - 24, y + 7, { align: "center" });
  }

  y += 16;
  doc.setLineWidth(0.45);
  doc.line(marginX, y, rightX, y);

  // Section 3: Autorisation du supérieur Hiérarchique
  y += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.text("Autorisation du supérieur Hiérarchique", pageW / 2, y, { align: "center" });

  y += 13;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);

  // Checkbox 1: Congé Autorisé
  doc.text("Congé Autorisé", marginX + 6, y);
  const box1X = marginX + 42;
  const boxY = y - 4;
  doc.setLineWidth(0.4);
  doc.rect(box1X, boxY, 5, 5, "S");
  if (data.decision === "autorise") {
    doc.setLineWidth(0.6);
    doc.line(box1X + 1, boxY + 2.5, box1X + 2.1, boxY + 4);
    doc.line(box1X + 2.1, boxY + 4, box1X + 4.3, boxY + 1);
  }

  // Checkbox 2: Congé Reporté
  doc.text("Congé Reporté", marginX + 94, y);
  const box2X = marginX + 128;
  doc.setLineWidth(0.4);
  doc.rect(box2X, boxY, 5, 5, "S");
  if (data.decision === "reporte") {
    doc.setLineWidth(0.6);
    doc.line(box2X + 1, boxY + 2.5, box2X + 2.1, boxY + 4);
    doc.line(box2X + 2.1, boxY + 4, box2X + 4.3, boxY + 1);
  }

  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.text("Observations :", marginX + 6, y);
  const obsText = (data.observations || "").trim();
  const obsLines = obsText ? doc.splitTextToSize(obsText, contentW - 36) : [];
  if (obsLines.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.text(obsLines, marginX + 34, y);
  }

  y += Math.max(20, obsLines.length * 6 + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("VISA Responsable Hiérarchique", marginX + 14, y);
  doc.text("VISA DG", rightX - 24, y, { align: "center" });

  if (data.visaResponsable) {
    doc.setFont("helvetica", "bold");
    doc.text(data.visaResponsable, marginX + 14, y + 7);
  }
  if (data.visaDg) {
    doc.setFont("helvetica", "bold");
    doc.text(data.visaDg, rightX - 24, y + 7, { align: "center" });
  }

  y += 28;
  doc.setLineWidth(0.45);
  doc.line(marginX, y, rightX, y);

  const safeName = (data.nomPrenom || "Collaborateur").replace(/[^a-zA-Z0-9-_]/g, "_");
  const safeDate = (data.dateDepart || "2026").replace(/[^a-zA-Z0-9-_]/g, "-");
  doc.save(`Demande_Conge_${safeName}_${safeDate}.pdf`);
}

function formatFrDateSlash(isoDate?: string): string {
  if (!isoDate) return "";
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`;
  }
  return isoDate;
}

function formatMoneyZero(val: number, showZero = false): string {
  const n = Number(val) || 0;
  if (n === 0 && !showZero) return "";
  return n
    .toLocaleString("fr-FR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
    .replace(/[\u00A0\u202F]/g, " ");
}

/**
 * 3. NOTE DE FRAIS — MODÈLE OFFICIEL SCHINDLER MAROC (A4 Paysage)
 * Reproduction fidèle du modèle /public/Copie de Note de frais.pdf
 */
export async function exportNoteFraisPDF(data: RHNoteFraisDocument) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4"
  });

  const pageW = 297;
  const marginX = 14;
  const contentW = 272; // 14mm -> 286mm
  let y = 18;

  // Main Title centered above left/center area
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17.5);
  doc.text("Note de Frais", 125, y + 6, { align: "center" });

  // Schindler logo top right
  const logoDataUrl = await loadImageAsDataUrl("/schindler-logo-docx.jpg");
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, "JPEG", 218, y - 1, 16.5, 14.2, undefined, "FAST");
    } catch {
      // ignore
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(220, 38, 38);
    doc.text("Schindler", 226, y + 8, { align: "center" });
  }

  // Metadata Grid (exact stacked cells matching Copie de Note de frais.pdf)
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);

  const metaBoxX = 68.5;
  const metaBoxW = 76.5;
  const metaRowH = 3.7;

  // Left: Demandeur (3 stacked boxes: Demandeur, Fonction, Service)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("Demandeur :", metaBoxX - 18, 34.7);

  const demandeurRows = [
    (data.demandeur || "").toUpperCase(),
    (data.fonction || "").toUpperCase(),
    (data.service || "").toUpperCase()
  ];
  demandeurRows.forEach((val, i) => {
    const ry = 32.1 + i * metaRowH;
    doc.rect(metaBoxX, ry, metaBoxW, metaRowH, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    if (val) {
      doc.text(val.slice(0, 42), metaBoxX + 1.5, ry + 2.65);
    }
  });

  // Left: Responsable hiérarchique (2 stacked boxes: Nom, Fonction Resp.)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.1);
  doc.text("Responsable hiérarchique :", 34.5, 46.8);

  const respRows = [
    (data.responsableHierarchique || "").toUpperCase(),
    (data.fonctionResponsable || "").toUpperCase()
  ];
  respRows.forEach((val, i) => {
    const ry = 44.2 + i * metaRowH;
    doc.rect(metaBoxX, ry, metaBoxW, metaRowH, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.3);
    if (val) {
      doc.text(val.slice(0, 42), metaBoxX + 1.5, ry + 2.65);
    }
  });

  // Right: Objet & Mois / Année
  const objX = 182;
  const objW = 104;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.3);
  doc.text("Objet :", objX, 39.2);
  doc.rect(objX, 40.2, objW, 5.4, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.4);
  doc.text((data.objet || "NOTE DE FRAIS").toUpperCase(), objX + 1.5, 42.9);

  const moisX = 208;
  const moisW = 78;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("Mois / Année :", 189.5, 48.2);
  doc.rect(moisX, 45.6, moisW, 3.7, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.3);
  if (data.moisAnnee) {
    doc.text(data.moisAnnee, moisX + 1.5, 48.2);
  }

  y = 54;

  // 13 columns summing to 272mm (x = 14 to 286)
  const cols = [
    { key: "date", label: "Date de la dépense", w: 22.5, align: "center" as const },
    { key: "lieu", label: "Lieu de la Dépense", w: 31, align: "center" as const },
    { key: "devise", label: `Montant EN\nDevise ${data.deviseCode || "EURO"}`, w: 20, align: "right" as const },
    { key: "taux", label: "Taux de change", w: 21, align: "right" as const },
    { key: "km", label: "km", w: 10, align: "right" as const },
    { key: "indKm", label: "taxi", w: 11, align: "right" as const },
    { key: "forfait", label: "Forfait\n/Divers", w: 13.5, align: "right" as const },
    { key: "repas", label: "Repas", w: 15, align: "right" as const },
    { key: "hotel", label: "Hôtel", w: 11, align: "right" as const },
    { key: "parking", label: "PARKING", w: 13.5, align: "right" as const },
    { key: "gasoil", label: "Gasoil", w: 12.5, align: "right" as const },
    { key: "autoroute", label: "AUTOROUTE", w: 15, align: "right" as const },
    { key: "comment", label: "Commentaire", w: 66, align: "left" as const }
  ];

  const drawTableHeader = (headerY: number) => {
    const h = 7.8;
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.rect(marginX, headerY, contentW, h, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.2);
    doc.setTextColor(0, 0, 0);

    let cx = marginX;
    cols.forEach((c, idx) => {
      if (idx > 0) {
        doc.setLineWidth(0.2);
        doc.line(cx, headerY, cx, headerY + h);
      }
      const lines = c.label.split("\n");
      if (lines.length === 2) {
        doc.text(lines[0], cx + c.w / 2, headerY + 3.1, { align: "center" });
        doc.text(lines[1], cx + c.w / 2, headerY + 6.1, { align: "center" });
      } else {
        doc.text(c.label, cx + c.w / 2, headerY + 4.7, { align: "center" });
      }
      cx += c.w;
    });
    return headerY + h;
  };

  y = drawTableHeader(y);

  // Totals accumulator
  const sums = {
    devise: 0,
    deviseDhs: 0,
    km: 0,
    indKm: 0,
    forfait: 0,
    repas: 0,
    hotel: 0,
    parking: 0,
    gasoil: 0,
    autoroute: 0
  };

  const baseRowH = 3.7;
  const minGridRows = 19; // Matches the clean 19-row Excel table grid in Copie de Note de frais.pdf
  const rowsCount = Math.max(minGridRows, data.lines.length + 1);

  for (let idx = 0; idx < rowsCount; idx++) {
    const line = data.lines[idx];
    const commentText = line?.commentaire || "";
    const commentLines = commentText ? doc.splitTextToSize(commentText, cols[12].w - 6) : [];
    const rowH = line ? Math.max(baseRowH, commentLines.length * 3.1 + 0.9) : baseRowH;

    if (y + rowH > 180 && idx < rowsCount - 1) {
      doc.addPage();
      y = 14;
      y = drawTableHeader(y);
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(marginX, y, contentW, rowH, "S");

    let cx = marginX;
    cols.slice(0, -1).forEach((c) => {
      cx += c.w;
      doc.line(cx, y, cx, y + rowH);
    });

    if (line) {
      const dev = Number(line.montantDevise) || 0;
      const taux = Number(line.tauxChange) || 1;
      sums.devise += dev;
      sums.deviseDhs += dev * taux;
      sums.km += Number(line.km) || 0;
      sums.indKm += Number(line.indemniteKmTaxi) || 0;
      sums.forfait += Number(line.forfaitDivers) || 0;
      sums.repas += Number(line.repas) || 0;
      sums.hotel += Number(line.hotel) || 0;
      sums.parking += Number(line.parking) || 0;
      sums.gasoil += Number(line.gasoil) || 0;
      sums.autoroute += Number(line.autoroute) || 0;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.1);
      doc.setTextColor(0, 0, 0);

      const rowValues: string[] = [
        formatFrDateSlash(line.date),
        (line.lieu || "").toUpperCase().slice(0, 20),
        formatMoneyZero(dev),
        dev > 0 && taux !== 1 ? String(taux) : "",
        line.km ? String(line.km) : "",
        formatMoneyZero(line.indemniteKmTaxi),
        formatMoneyZero(line.forfaitDivers),
        formatMoneyZero(line.repas),
        formatMoneyZero(line.hotel),
        formatMoneyZero(line.parking),
        formatMoneyZero(line.gasoil),
        formatMoneyZero(line.autoroute),
        ""
      ];

      cx = marginX;
      cols.forEach((c, cIdx) => {
        if (cIdx === 12) {
          if (commentLines.length > 0) {
            doc.text(commentLines, cx + 1.4, y + 2.65);
          }
        } else {
          const val = rowValues[cIdx];
          if (val) {
            if (c.align === "center") {
              doc.text(val, cx + c.w / 2, y + 2.65, { align: "center" });
            } else if (c.align === "right") {
              doc.text(val, cx + c.w - 1.6, y + 2.65, { align: "right" });
            } else {
              doc.text(val, cx + 1.4, y + 2.65);
            }
          }
        }
        cx += c.w;
      });
    }

    y += rowH;
  }

  // Totals row at bottom of grid (identical bordered grid row)
  if (y + 42 > 202) {
    doc.addPage();
    y = 14;
  }

  const totRowH = 4.0;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.rect(marginX, y, contentW, totRowH, "S");

  let cx = marginX;
  cols.slice(0, -1).forEach((c) => {
    cx += c.w;
    doc.line(cx, y, cx, y + totRowH);
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.1);
  doc.setTextColor(0, 0, 0);

  const subVals = [
    "",
    "",
    formatMoneyZero(sums.devise, sums.devise > 0),
    "",
    sums.km > 0 ? String(sums.km) : "",
    formatMoneyZero(sums.indKm, sums.indKm > 0),
    formatMoneyZero(sums.forfait, true),
    formatMoneyZero(sums.repas, true),
    formatMoneyZero(sums.hotel, true),
    formatMoneyZero(sums.parking, true),
    formatMoneyZero(sums.gasoil, true),
    formatMoneyZero(sums.autoroute, true),
    ""
  ];

  cx = marginX;
  cols.forEach((c, cIdx) => {
    if (subVals[cIdx]) {
      doc.text(subVals[cIdx], cx + c.w - 1.6, y + 2.8, { align: "right" });
    }
    cx += c.w;
  });

  y += totRowH + 5;

  // Bottom Summary & Validation Layout (matching public/Copie de Note de frais.pdf)
  const totalDepensesDHS =
    sums.deviseDhs +
    sums.indKm +
    sums.forfait +
    sums.repas +
    sums.hotel +
    sums.parking +
    sums.gasoil +
    sums.autoroute;
  const avances = Number(data.avancesRecues) || 0;
  const netAPayer = totalDepensesDHS - avances;

  const leftColW = cols[0].w + cols[1].w; // 53.5mm
  const miniDevX = marginX + leftColW;
  const miniDevW1 = cols[2].w; // 20mm
  const miniDevW2 = cols[3].w; // 21mm

  // Middle summary column aligned under Repas + Hôtel + PARKING + Gasoil
  const yellowX = marginX + cols[0].w + cols[1].w + cols[2].w + cols[3].w + cols[4].w + cols[5].w + cols[6].w;
  const yellowW = cols[7].w + cols[8].w + cols[9].w + cols[10].w;

  const rightBoxX = marginX + contentW - cols[12].w;
  const rightBoxW = cols[12].w;

  const boxRowH = 3.7;

  // Left: Row 1 — TOTAL DEPENSES
  doc.setLineWidth(0.25);
  doc.rect(marginX, y, leftColW, boxRowH, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.5);
  doc.text("TOTAL DEPENSES", marginX + 1.4, y + 2.65);

  // Middle top empty cell
  doc.rect(yellowX, y, yellowW, boxRowH, "S");

  // Left: Row 2 — Montant en devise | Taux de change mini grid
  const yRow2 = y + boxRowH + 1.6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(4.4);
  doc.rect(miniDevX, yRow2, miniDevW1, boxRowH, "S");
  doc.text("Montant en devise", miniDevX + miniDevW1 / 2, yRow2 + 2.5, { align: "center" });
  doc.rect(miniDevX + miniDevW1, yRow2, miniDevW2, boxRowH, "S");
  doc.text("Taux de change", miniDevX + miniDevW1 + miniDevW2 / 2, yRow2 + 2.5, { align: "center" });

  doc.rect(miniDevX, yRow2 + boxRowH, miniDevW1, boxRowH, "S");
  doc.rect(miniDevX + miniDevW1, yRow2 + boxRowH, miniDevW2, boxRowH, "S");
  if (sums.devise > 0) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.1);
    doc.text(formatMoneyZero(sums.devise, true), miniDevX + miniDevW1 - 1.6, yRow2 + boxRowH + 2.6, {
      align: "right"
    });
    doc.text(String(data.tauxChangeDefaut || 1), miniDevX + miniDevW1 + miniDevW2 - 1.6, yRow2 + boxRowH + 2.6, {
      align: "right"
    });
  }

  // Middle: Row 2 — Bright Yellow Total Box (#FFFF00)
  doc.setFillColor(255, 255, 0);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.35);
  doc.rect(yellowX, yRow2, yellowW, 4.6, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.2);
  doc.setTextColor(0, 0, 0);
  doc.text(formatMoneyZero(totalDepensesDHS, true), yellowX + yellowW / 2, yRow2 + 3.2, {
    align: "center"
  });

  // Left: Row 3 — AVANCES SUR NDF RECUES
  const yRow3 = yRow2 + boxRowH;
  doc.setLineWidth(0.25);
  doc.rect(marginX, yRow3, leftColW, boxRowH, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.2);
  doc.text("AVANCES SUR NDF RECUES", marginX + 1.4, yRow3 + 2.6);
  if (avances > 0) {
    doc.text(formatMoneyZero(avances, true), marginX + leftColW - 1.6, yRow3 + 2.6, { align: "right" });
  }

  // Middle Row 3 empty cell
  doc.rect(yellowX, yRow3 + 1.2, yellowW, boxRowH, "S");

  // Left: Row 4 — NET A PAYER :
  const yRow4 = yRow3 + boxRowH + 3.5;
  doc.setLineWidth(0.45);
  doc.rect(marginX, yRow4, leftColW, 4.2, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.2);
  doc.text("NET A PAYER :", marginX + 1.2, yRow4 + 2.95);
  doc.setFontSize(8.5);
  doc.text(formatMoneyZero(netAPayer, true), marginX + leftColW - 6, yRow4 + 3.0, { align: "right" });

  // Middle Row 4 empty cell
  doc.setLineWidth(0.25);
  doc.rect(yellowX, yRow4, yellowW, 3.8, "S");

  // Left Bottom: Date et Signature du Demandeur + Bon pour acquis + wide signature box
  const sigDemandeurY = yRow4 + 9;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.8);
  doc.text("Date et Signature du Demandeur", marginX + 0.5, sigDemandeurY);
  if (data.bonPourAcquis) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.6);
    doc.text("Bon pour acquis", marginX + 0.5, sigDemandeurY + 3.8);
  }
  doc.setLineWidth(0.45);
  const sigBoxY = sigDemandeurY + 4.8;
  const sigBoxW = 131;
  const sigBoxH = 9.2;
  doc.rect(marginX, sigBoxY, sigBoxW, sigBoxH, "S");

  if (data.dateSignatureDemandeur) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.text(formatFrDateSlash(data.dateSignatureDemandeur), marginX + 2.5, sigBoxY + 5.8);
  }
  if (data.signatureDemandeurDataUrl) {
    try {
      doc.addImage(data.signatureDemandeurDataUrl, "PNG", marginX + 32, sigBoxY + 0.8, 30, 7.6, undefined, "FAST");
    } catch {
      // ignore
    }
  }

  // Right Bottom: 3 stacked validation boxes (Responsable Hiérarchique, Validation Chef Comptable, Référence comptabilité)
  const stackHeaderH = 3.7;
  const stackBodyH = 10.6;
  const stackItems = [
    { title: "Date et Signature du responsable Hierarchique", value: "" },
    { title: "Validation Chef Comptable", value: "" },
    { title: "Référence comptabilité", value: data.referenceComptabilite || "" }
  ];

  stackItems.forEach((item, idx) => {
    const sy = y + idx * (stackHeaderH + stackBodyH);
    doc.setLineWidth(0.3);
    doc.rect(rightBoxX, sy, rightBoxW, stackHeaderH, "S");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(5.6);
    doc.text(item.title, rightBoxX + rightBoxW / 2, sy + 2.5, { align: "center" });

    doc.setLineWidth(0.25);
    doc.rect(rightBoxX, sy + stackHeaderH, rightBoxW, stackBodyH, "S");
    if (item.value) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(item.value, rightBoxX + rightBoxW / 2, sy + stackHeaderH + 6.5, { align: "center" });
    }
  });

  const safeDemandeur = (data.demandeur || "Collaborateur").replace(/[^a-zA-Z0-9-_]/g, "_");
  const safePeriod = (data.moisAnnee || "2026").replace(/[^a-zA-Z0-9-_]/g, "_");
  doc.save(`Note_De_Frais_${safeDemandeur}_${safePeriod}.pdf`);
}

