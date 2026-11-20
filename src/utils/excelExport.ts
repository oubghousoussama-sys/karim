import * as XLSX from "xlsx";

/**
 * Export any array of objects/rows directly to native Excel (.xlsx) file
 */
export function exportToExcel(
  sheets: Array<{ sheetName: string; data: Record<string, any>[] | any[][] }>,
  fileName: string
) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ sheetName, data }) => {
    let ws: XLSX.WorkSheet;
    if (Array.isArray(data) && data.length > 0 && Array.isArray(data[0])) {
      ws = XLSX.utils.aoa_to_sheet(data as any[][]);
    } else {
      ws = XLSX.utils.json_to_sheet(data as Record<string, any>[]);
    }
    
    // Auto calculate column widths
    const colWidths: number[] = [];
    if (Array.isArray(data) && data.length > 0) {
      if (Array.isArray(data[0])) {
        (data as any[][]).forEach((row) => {
          row.forEach((val, colIdx) => {
            const str = val ? String(val) : "";
            colWidths[colIdx] = Math.max(colWidths[colIdx] || 10, str.length + 3);
          });
        });
      } else {
        const keys = Object.keys(data[0] || {});
        keys.forEach((key, colIdx) => {
          let maxLen = key.length;
          (data as Record<string, any>[]).forEach((row) => {
            const str = row[key] !== undefined && row[key] !== null ? String(row[key]) : "";
            if (str.length > maxLen) maxLen = str.length;
          });
          colWidths[colIdx] = Math.min(Math.max(maxLen + 3, 12), 50);
        });
      }
    }

    ws["!cols"] = colWidths.map((w) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName.slice(0, 31));
  });

  const finalName = fileName.endsWith(".xlsx") ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalName);
}

/**
 * Export detailed, beautifully formatted Billing Forecasts report to Excel
 * RESTRICTED TO 3 MONTHS (Current Month + Next 2 Months) as requested.
 */
export function exportForecastsToExcel(
  quotes: any[],
  monthlyForecastData: any[],
  fileName = "Previsions_3Mois_Facturation_Schindler.xlsx",
  startMonthKey = "2026-09",
  monthsCount = 3
) {
  const wb = XLSX.utils.book_new();

  // Find index of start month
  let startIdx = monthlyForecastData.findIndex((m) => m.monthKey === startMonthKey);
  if (startIdx === -1) {
    // Try finding month matching current month or default to 0
    startIdx = 8; // Septembre 2026
  }

  // Slice the 3 target months
  const targetMonthlyData = monthlyForecastData.slice(startIdx, Math.min(startIdx + monthsCount, monthlyForecastData.length));
  const targetMonthKeys = new Set(targetMonthlyData.map((m) => m.monthKey));
  const targetMonthLabels = targetMonthlyData.map((m) => m.monthLabel).join(", ");

  // Filter quotes restricted to these 3 months only
  const targetQuotes = quotes.filter((q) => {
    const billingMonth = q.billingMonth || (q.billingSchedule ? Object.keys(q.billingSchedule)[0] : "2026-12");
    return targetMonthKeys.has(billingMonth);
  });

  // 1. SHEET 1: SYNTHESE PREVISIONS 3 MOIS
  const totalForecast = targetMonthlyData.reduce((acc, m) => acc + m.total, 0);
  const totalSecured = targetMonthlyData.reduce((acc, m) => acc + m.securise, 0);
  const totalPotential = targetMonthlyData.reduce((acc, m) => acc + m.potentiel, 0);

  const summaryAoA: any[][] = [
    ["SCHINDLER MAROC - DIRECTION FINANCIÈRE & OPÉRATIONNELLE"],
    [`RAPPORT PRÉVISIONNEL RESTREINT (3 MOIS : ${targetMonthLabels.toUpperCase()})`],
    ["CONFIDENTIALITÉ : EXPÉDITION DÉLIMITÉE SUR LE MOIS EN COURS ET LES 2 PROCHAINS MOIS"],
    [""],
    [`MÉTRIQUES CLÉS PRÉVISIONNELLES - FENÊTRE 3 MOIS`],
    ["CA Total Prévisionnel HT (3 Mois)", `${totalForecast.toLocaleString("fr-FR")} MAD`, "Montant 100% HT des devis de la période"],
    ["CA Sécurisé (Facturé / Validé)", `${totalSecured.toLocaleString("fr-FR")} MAD`, `${totalForecast > 0 ? ((totalSecured / totalForecast) * 100).toFixed(1) : 0}% du total 3M`],
    ["CA Potentiel (En Négociation)", `${totalPotential.toLocaleString("fr-FR")} MAD`, `${totalForecast > 0 ? ((totalPotential / totalForecast) * 100).toFixed(1) : 0}% en cours`],
    ["Nombre de Devis du Trimestre", targetQuotes.length, `Devis programmés sur ${targetMonthLabels}`],
    [""],
    ["TABLEAU DES PRÉVISIONS PAR MOIS (MAD HT)"],
    ["Mois", "Devis Programmé(s)", "CA Sécurisé (MAD)", "CA Potentiel (MAD)", "Total Prévisionnel HT (MAD)", "Part du 3M (%)"]
  ];

  targetMonthlyData.forEach((m) => {
    const pct = totalForecast > 0 ? ((m.total / totalForecast) * 100).toFixed(1) + " %" : "0 %";
    summaryAoA.push([
      m.monthLabel,
      m.quotesCount,
      m.securise,
      m.potentiel,
      m.total,
      pct
    ]);
  });

  summaryAoA.push(["TOTAL TRIMESTRE 3 MOIS", targetQuotes.length, totalSecured, totalPotential, totalForecast, "100.0 %"]);

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  wsSummary["!cols"] = [
    { wch: 25 },
    { wch: 20 },
    { wch: 24 },
    { wch: 24 },
    { wch: 28 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, wsSummary, "Prévisions 3 Mois");

  // 2. SHEET 2: DETAIL DES DEVIS ET PLANNING DE FACTURATION (3 MOIS SEULEMENT)
  const quotesData = targetQuotes.map((q) => {
    const billingMonth = q.billingMonth || (q.billingSchedule ? Object.keys(q.billingSchedule)[0] : "2026-12");
    return {
      "N° Devis": q.quoteNumber,
      "Intitulé de la Prestation": q.title,
      "Client / Syndic": q.clientName,
      "Compte Client": q.customerAccount || "-",
      "N° Appareil (PF)": q.pfNumber || "Global",
      "Montant HT (MAD)": q.amountHT,
      "Taux TVA (%)": q.tvaRate || 20,
      "Montant TTC (MAD)": q.amountTTC,
      "Statut Devis": q.status,
      "Mois Facturation (100%)": billingMonth,
      "Date Émission": q.issueDate || "-",
      "Notes & Conditions": q.notes || "-"
    };
  });

  const wsQuotes = XLSX.utils.json_to_sheet(quotesData.length > 0 ? quotesData : [{ "Information": "Aucun devis sur ces 3 mois" }]);
  wsQuotes["!cols"] = [
    { wch: 16 },
    { wch: 45 },
    { wch: 30 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 24 },
    { wch: 16 },
    { wch: 40 }
  ];

  XLSX.utils.book_append_sheet(wb, wsQuotes, "Planning Devis 3M");

  // 3. SHEET 3: SYNTHESE CLIENTS SUR LES 3 MOIS
  const clientMap: Record<string, { clientName: string; account: string; totalHT: number; count: number }> = {};
  targetQuotes.forEach((q) => {
    const key = q.clientName;
    if (!clientMap[key]) {
      clientMap[key] = {
        clientName: q.clientName,
        account: q.customerAccount || "-",
        totalHT: 0,
        count: 0
      };
    }
    clientMap[key].totalHT += q.amountHT;
    clientMap[key].count += 1;
  });

  const clientSummaryRows = Object.values(clientMap).sort((a, b) => b.totalHT - a.totalHT).map((c) => ({
    "Client / Syndic": c.clientName,
    "Compte Client": c.account,
    "Nombre de Devis (3M)": c.count,
    "Chiffre d'Affaires HT (MAD)": c.totalHT,
    "Part du CA 3M (%)": totalForecast > 0 ? ((c.totalHT / totalForecast) * 100).toFixed(1) + " %" : "0 %"
  }));

  const wsClients = XLSX.utils.json_to_sheet(clientSummaryRows.length > 0 ? clientSummaryRows : [{ "Information": "Aucun client" }]);
  wsClients["!cols"] = [
    { wch: 35 },
    { wch: 18 },
    { wch: 16 },
    { wch: 24 },
    { wch: 20 }
  ];

  XLSX.utils.book_append_sheet(wb, wsClients, "Répartition Clients 3M");

  XLSX.writeFile(wb, fileName);
}

/**
 * Export full Quotes portfolio to Excel (.xlsx) with detailed sheets & financial summary
 */
export function exportQuotesToExcel(
  quotes: any[],
  fileName = "Portefeuille_Devis_Schindler.xlsx",
  filterInfo?: string
) {
  const wb = XLSX.utils.book_new();

  // 1. SHEET 1: DETAIL COMPLET DU PORTEFEUILLE DEVIS
  const quotesRows = quotes.map((q) => {
    const billingMonth =
      q.billingMonth ||
      (q.billingSchedule ? Object.keys(q.billingSchedule)[0] : "2026-12");
    const amountTTC =
      q.amountTTC || Math.round(q.amountHT * (1 + (q.tvaRate || 20) / 100));
    const marginHT = (q.amountHT || 0) - (q.estimatedCostHT || 0);

    return {
      "N° Devis": q.quoteNumber,
      "Date Émission": q.issueDate || "-",
      "Date Validité": q.validityDate || "-",
      "Client / Syndic": q.clientName,
      "Compte Client": q.customerAccount || "-",
      "N° Appareil (PF)": q.pfNumber || "Global",
      "Objet / Intitulé de la Prestation": q.title,
      "Montant HT (MAD)": q.amountHT || 0,
      "Taux TVA (%)": q.tvaRate || 20,
      "Montant TTC (MAD)": amountTTC,
      "Coût Estimé HT (MAD)": q.estimatedCostHT || 0,
      "Marge Estimée HT (MAD)": marginHT,
      "Marge Estimée (%)":
        q.estimatedMarginPct !== undefined
          ? `${Number(q.estimatedMarginPct).toFixed(1)} %`
          : "-",
      "Statut Devis": q.status,
      "Mois Facturation Prévisionnel": billingMonth,
      "Nombre d'Articles": q.items?.length || 1,
      "Notes & Conditions": q.notes || "-",
    };
  });

  const wsQuotes = XLSX.utils.json_to_sheet(
    quotesRows.length > 0 ? quotesRows : [{ Information: "Aucun devis à exporter" }]
  );
  wsQuotes["!cols"] = [
    { wch: 16 }, // N° Devis
    { wch: 14 }, // Date Émission
    { wch: 14 }, // Date Validité
    { wch: 34 }, // Client
    { wch: 16 }, // Compte Client
    { wch: 18 }, // PF
    { wch: 45 }, // Objet
    { wch: 18 }, // Montant HT
    { wch: 14 }, // TVA
    { wch: 18 }, // Montant TTC
    { wch: 20 }, // Coût Estimé HT
    { wch: 22 }, // Marge Estimée HT
    { wch: 18 }, // Marge %
    { wch: 18 }, // Statut
    { wch: 26 }, // Mois Facturation
    { wch: 18 }, // Nb Articles
    { wch: 45 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsQuotes, "Portefeuille Devis");

  // 2. SHEET 2: ARTICLES ET LIGNES DE PRESTATIONS (IF ANY)
  const itemsRows: any[] = [];
  quotes.forEach((q) => {
    if (q.items && q.items.length > 0) {
      q.items.forEach((it: any, idx: number) => {
        itemsRows.push({
          "N° Devis": q.quoteNumber,
          "Client / Syndic": q.clientName,
          "Ligne N°": idx + 1,
          "Désignation / Article": it.description,
          "Quantité": it.quantity || 1,
          "Prix Unitaire HT (MAD)": it.unitPriceHT || 0,
          "Total Ligne HT (MAD)": it.totalHT || (it.quantity || 1) * (it.unitPriceHT || 0),
          "Statut Devis": q.status,
        });
      });
    } else {
      // Fallback single line item
      itemsRows.push({
        "N° Devis": q.quoteNumber,
        "Client / Syndic": q.clientName,
        "Ligne N°": 1,
        "Désignation / Article": q.title,
        "Quantité": 1,
        "Prix Unitaire HT (MAD)": q.amountHT || 0,
        "Total Ligne HT (MAD)": q.amountHT || 0,
        "Statut Devis": q.status,
      });
    }
  });

  const wsItems = XLSX.utils.json_to_sheet(
    itemsRows.length > 0 ? itemsRows : [{ Information: "Aucun article" }]
  );
  wsItems["!cols"] = [
    { wch: 16 },
    { wch: 32 },
    { wch: 10 },
    { wch: 45 },
    { wch: 12 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, wsItems, "Détail des Lignes & Articles");

  // 3. SHEET 3: SYNTHÈSE STATISTIQUE & KPI FINANCIERS
  const totalAmountHT = quotes.reduce((acc, q) => acc + (q.amountHT || 0), 0);
  const totalAmountTTC = quotes.reduce(
    (acc, q) =>
      acc + (q.amountTTC || Math.round((q.amountHT || 0) * (1 + (q.tvaRate || 20) / 100))),
    0
  );

  const validatedQuotes = quotes.filter(
    (q) => q.status === "Validé / Accepté" || q.status === "Facturé"
  );
  const validatedAmountHT = validatedQuotes.reduce((acc, q) => acc + (q.amountHT || 0), 0);

  const pendingQuotes = quotes.filter((q) => q.status === "Envoyé");
  const pendingAmountHT = pendingQuotes.reduce((acc, q) => acc + (q.amountHT || 0), 0);

  const draftQuotes = quotes.filter((q) => q.status === "Brouillon");
  const draftAmountHT = draftQuotes.reduce((acc, q) => acc + (q.amountHT || 0), 0);

  const refusedQuotes = quotes.filter((q) => q.status === "Refusé");
  const refusedAmountHT = refusedQuotes.reduce((acc, q) => acc + (q.amountHT || 0), 0);

  const conversionRate =
    quotes.length > 0
      ? ((validatedQuotes.length / quotes.length) * 100).toFixed(1) + " %"
      : "0 %";

  const avgMargin =
    quotes.length > 0
      ? (
          quotes.reduce((acc, q) => acc + (Number(q.estimatedMarginPct) || 0), 0) /
          quotes.length
        ).toFixed(1) + " %"
      : "0 %";

  const summaryAoA: any[][] = [
    ["SCHINDLER MAROC - DIRECTION OPÉRATIONS & CONTRÔLE FINANCIER"],
    ["EXPORT OFFICIEL DU PORTEFEUILLE DEVIS & PROPOSITIONS COMMERCIALES"],
    [
      `Date d'exportation : ${new Date().toLocaleDateString("fr-FR")} à ${new Date().toLocaleTimeString(
        "fr-FR"
      )}`,
    ],
    [filterInfo ? `Filtres appliqués : ${filterInfo}` : "Périmètre : Ensemble des devis du portefeuille"],
    [""],
    ["INDICATEURS CLÉS DE PERFORMANCE (KPI)"],
    ["Volume Total de Devis", quotes.length, "Total des propositions commerciales"],
    ["Montant Total Portefeuille HT", totalAmountHT, "MAD HT"],
    ["Montant Total Portefeuille TTC", totalAmountTTC, "MAD TTC (avec TVA 20%)"],
    [
      "CA Sécurisé (Validé + Facturé)",
      validatedAmountHT,
      totalAmountHT > 0
        ? `${((validatedAmountHT / totalAmountHT) * 100).toFixed(1)} % du total HT`
        : "0 %",
    ],
    [
      "CA Potentiel (Envoyé / Négociation)",
      pendingAmountHT,
      totalAmountHT > 0
        ? `${((pendingAmountHT / totalAmountHT) * 100).toFixed(1)} % du total HT`
        : "0 %",
    ],
    [
      "Devis en Brouillon",
      draftAmountHT,
      `${draftQuotes.length} devis en préparation`,
    ],
    [
      "Devis Refusés / Non retenus",
      refusedAmountHT,
      `${refusedQuotes.length} devis refusés`,
    ],
    ["Taux de Transformation Commercial", conversionRate, "Taux de signature client"],
    ["Marge Moyenne Estimée", avgMargin, "Marge prévisionnelle brute"],
    [""],
    ["RÉPARTITION DU CHIFFRE D'AFFAIRES PAR STATUT COMMERCIAL"],
    ["Statut Commercial", "Nombre de Devis", "Montant Total HT (MAD)", "Part du Portefeuille (%)"],
    [
      "Validé / Accepté",
      quotes.filter((q) => q.status === "Validé / Accepté").length,
      quotes
        .filter((q) => q.status === "Validé / Accepté")
        .reduce((acc, q) => acc + (q.amountHT || 0), 0),
      totalAmountHT > 0
        ? `${(
            (quotes
              .filter((q) => q.status === "Validé / Accepté")
              .reduce((acc, q) => acc + (q.amountHT || 0), 0) /
              totalAmountHT) *
            100
          ).toFixed(1)} %`
        : "0 %",
    ],
    [
      "Facturé",
      quotes.filter((q) => q.status === "Facturé").length,
      quotes
        .filter((q) => q.status === "Facturé")
        .reduce((acc, q) => acc + (q.amountHT || 0), 0),
      totalAmountHT > 0
        ? `${(
            (quotes
              .filter((q) => q.status === "Facturé")
              .reduce((acc, q) => acc + (q.amountHT || 0), 0) /
              totalAmountHT) *
            100
          ).toFixed(1)} %`
        : "0 %",
    ],
    [
      "Envoyé (En négociation)",
      pendingQuotes.length,
      pendingAmountHT,
      totalAmountHT > 0
        ? `${((pendingAmountHT / totalAmountHT) * 100).toFixed(1)} %`
        : "0 %",
    ],
    [
      "Brouillon",
      draftQuotes.length,
      draftAmountHT,
      totalAmountHT > 0
        ? `${((draftAmountHT / totalAmountHT) * 100).toFixed(1)} %`
        : "0 %",
    ],
    [
      "Refusé",
      refusedQuotes.length,
      refusedAmountHT,
      totalAmountHT > 0
        ? `${((refusedAmountHT / totalAmountHT) * 100).toFixed(1)} %`
        : "0 %",
    ],
    ["TOTAL GÉNÉRAL", quotes.length, totalAmountHT, "100.0 %"],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryAoA);
  wsSummary["!cols"] = [
    { wch: 38 },
    { wch: 24 },
    { wch: 35 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(wb, wsSummary, "Synthèse & KPI");

  XLSX.writeFile(wb, fileName);
}

/**
 * Export Quotes to standard CSV file (UTF-8 with BOM for Excel compatibility)
 */
export function exportQuotesToCsv(
  quotes: any[],
  fileName = "Portefeuille_Devis_Schindler.csv"
) {
  const headers = [
    "N° Devis",
    "Date Émission",
    "Date Validité",
    "Client / Syndic",
    "Compte Client",
    "N° Appareil (PF)",
    "Objet",
    "Montant HT (MAD)",
    "Taux TVA (%)",
    "Montant TTC (MAD)",
    "Statut",
    "Mois Facturation",
    "Marge Estimée (%)",
    "Notes",
  ];

  const escapeCsv = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = quotes.map((q) => {
    const billingMonth =
      q.billingMonth ||
      (q.billingSchedule ? Object.keys(q.billingSchedule)[0] : "2026-12");
    const amountTTC =
      q.amountTTC || Math.round((q.amountHT || 0) * (1 + (q.tvaRate || 20) / 100));

    return [
      escapeCsv(q.quoteNumber),
      escapeCsv(q.issueDate || "-"),
      escapeCsv(q.validityDate || "-"),
      escapeCsv(q.clientName),
      escapeCsv(q.customerAccount || "-"),
      escapeCsv(q.pfNumber || "Global"),
      escapeCsv(q.title),
      q.amountHT || 0,
      q.tvaRate || 20,
      amountTTC,
      escapeCsv(q.status),
      escapeCsv(billingMonth),
      q.estimatedMarginPct !== undefined ? Number(q.estimatedMarginPct).toFixed(1) : "-",
      escapeCsv(q.notes || "-"),
    ].join(";");
  });

  const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\r\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", fileName.endsWith(".csv") ? fileName : `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export a single Quote as a formatted Excel quotation sheet
 */
export function exportSingleQuoteToExcel(quote: any, fileName?: string) {
  const wb = XLSX.utils.book_new();
  const safeNumber = quote.quoteNumber.replace(/[^a-zA-Z0-9_-]/g, "_");
  const actualFileName = fileName || `Devis_Schindler_${safeNumber}.xlsx`;

  const amountTTC =
    quote.amountTTC ||
    Math.round((quote.amountHT || 0) * (1 + (quote.tvaRate || 20) / 100));
  const tvaAmount = amountTTC - (quote.amountHT || 0);

  const aoa: any[][] = [
    ["SCHINDLER MAROC - DIRECTION DES OPÉRATIONS & TRAVAUX"],
    [`PROPOSITION COMMERCIALE / DEVIS N° ${quote.quoteNumber}`],
    [""],
    ["INFORMATIONS GÉNÉRALES"],
    ["Client / Syndic :", quote.clientName, "Date d'Émission :", quote.issueDate || "-"],
    ["Compte Client :", quote.customerAccount || "-", "Date de Validité :", quote.validityDate || "-"],
    ["N° Appareil (PF) :", quote.pfNumber || "Parc Global", "Statut Commercial :", quote.status],
    ["Objet du Devis :", quote.title],
    [""],
    ["DÉTAIL DES FOURNITURES ET PRESTATIONS"],
    ["N°", "Désignation des Travaux / Pièces", "Quantité", "Prix Unitaire HT (MAD)", "Total HT (MAD)"],
  ];

  if (quote.items && quote.items.length > 0) {
    quote.items.forEach((it: any, idx: number) => {
      aoa.push([
        idx + 1,
        it.description,
        it.quantity || 1,
        it.unitPriceHT || 0,
        it.totalHT || (it.quantity || 1) * (it.unitPriceHT || 0),
      ]);
    });
  } else {
    aoa.push([1, quote.title, 1, quote.amountHT || 0, quote.amountHT || 0]);
  }

  aoa.push(
    [""],
    ["RÉCAPITULATIF FINANCIER"],
    ["Total Hors Taxes (MAD HT) :", quote.amountHT || 0],
    [`TVA (${quote.tvaRate || 20}%) :`, tvaAmount],
    ["TOTAL TOUTES TAXES COMPRISES (MAD TTC) :", amountTTC],
    [""],
    ["CONDITIONS DE RÈGLEMENT ET OBSERVATIONS"],
    ["Mois Prévisionnel de Facturation :", quote.billingMonth || "-"],
    ["Notes & Remarques :", quote.notes || "Offre soumise aux conditions générales Schindler Maroc."]
  );

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 25 },
    { wch: 45 },
    { wch: 18 },
    { wch: 24 },
    { wch: 22 },
  ];

  XLSX.utils.book_append_sheet(wb, ws, `Devis ${quote.quoteNumber}`.slice(0, 31));
  XLSX.writeFile(wb, actualFileName);
}

/**
 * Import and parse Excel (.xlsx, .xls, .xlsm, .xlsb, .csv, .tsv) or text file into structured JSON array.
 * Features smart header row detection, CSV delimiter auto-detection, and returns a dual Array/Object
 * for universal compatibility with all calling components.
 */
export async function readExcelFile(file: File): Promise<
  Record<string, any>[] & {
    sheets: Array<{ sheetName: string; rows: Record<string, any>[]; rawArray: any[][] }>;
    primaryRows: Record<string, any>[];
    headers: string[];
  }
> {
  return new Promise((resolve, reject) => {
    const isCsv =
      file.name.toLowerCase().endsWith(".csv") ||
      file.name.toLowerCase().endsWith(".tsv") ||
      file.name.toLowerCase().endsWith(".txt") ||
      file.type === "text/csv" ||
      file.type === "text/plain";

    if (isCsv) {
      const textReader = new FileReader();
      textReader.onload = (e) => {
        try {
          let text = (e.target?.result as string) || "";
          // Remove UTF-8 BOM if present
          if (text.charCodeAt(0) === 0xfeff) {
            text = text.slice(1);
          }

          const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
          if (lines.length === 0) {
            const emptyRes: any = Object.assign([], {
              sheets: [{ sheetName: "CSV", rows: [], rawArray: [] }],
              primaryRows: [],
              headers: [],
            });
            resolve(emptyRes);
            return;
          }

          // Detect delimiter: check first 5 non-empty lines for frequency of ;, \t, ,, |
          const sampleLines = lines.slice(0, Math.min(5, lines.length));
          const delimiters = [";", "\t", ",", "|"];
          let bestDelimiter = ";";
          let maxCount = -1;

          for (const d of delimiters) {
            const count = sampleLines.reduce((acc, l) => acc + (l.split(d).length - 1), 0);
            if (count > maxCount) {
              maxCount = count;
              bestDelimiter = d;
            }
          }

          // Parse CSV lines respecting quotes
          const parseCsvLine = (line: string, delim: string): string[] => {
            const result: string[] = [];
            let current = "";
            let inQuotes = false;
            for (let i = 0; i < line.length; i++) {
              const char = line[i];
              if (char === '"' || char === "'") {
                if (inQuotes && line[i + 1] === char) {
                  current += char;
                  i++;
                } else {
                  inQuotes = !inQuotes;
                }
              } else if (char === delim && !inQuotes) {
                result.push(current.trim());
                current = "";
              } else {
                current += char;
              }
            }
            result.push(current.trim());
            return result;
          };

          const rawArray = lines.map((l) => parseCsvLine(l, bestDelimiter));
          
          // Find header row in CSV
          let headerRowIdx = 0;
          let maxCols = 0;
          for (let i = 0; i < Math.min(10, rawArray.length); i++) {
            const nonEmp = rawArray[i].filter((c) => c && c.length > 0).length;
            if (nonEmp > maxCols) {
              maxCols = nonEmp;
              headerRowIdx = i;
            }
          }

          const headerRow = rawArray[headerRowIdx] || [];
          const headers = headerRow.map((h, idx) => (h && h.trim().length > 0 ? h.trim() : `Col_${idx + 1}`));

          const rows: Record<string, any>[] = [];
          for (let r = headerRowIdx + 1; r < rawArray.length; r++) {
            const rowData = rawArray[r];
            if (!rowData || rowData.every((c) => !c || c.trim() === "")) continue;
            const rowObj: Record<string, any> = {};
            headers.forEach((h, colIdx) => {
              rowObj[h] = rowData[colIdx] !== undefined ? rowData[colIdx] : "";
            });
            rows.push(rowObj);
          }

          const primarySheet = {
            sheetName: "CSV",
            rows,
            rawArray,
          };

          const result: any = Object.assign([...rows], {
            sheets: [primarySheet],
            primaryRows: rows,
            headers,
          });

          resolve(result);
        } catch (err) {
          reject(err);
        }
      };
      textReader.onerror = (err) => reject(err);
      textReader.readAsText(file, "UTF-8");
      return;
    }

    // Binary Excel (.xlsx, .xls, .xlsm, .xlsb)
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array", cellDates: true });

        const KEYWORDS = [
          "pf",
          "appareil",
          "equip",
          "nom",
          "site",
          "client",
          "customer",
          "account",
          "compte",
          "projet",
          "project",
          "ville",
          "city",
          "tech",
          "date",
          "cpsi",
          "devis",
          "quote",
          "titre",
          "montant",
          "ht",
          "ttc",
          "marge",
          "prix",
          "statut",
          "status",
          "tâche",
          "tache",
          "task",
          "sku",
          "article",
          "ref",
          "quantite",
          "qte",
        ];

        const sheets = workbook.SheetNames.map((sheetName) => {
          const ws = workbook.Sheets[sheetName];
          const rawArray = (XLSX.utils.sheet_to_json<any[]>(ws, {
            header: 1,
            defval: "",
          }) as any[][]) || [];

          // Find the best header row
          let bestHeaderIdx = 0;
          let bestScore = -1;

          for (let r = 0; r < Math.min(25, rawArray.length); r++) {
            const row = rawArray[r];
            if (!Array.isArray(row)) continue;
            const textCells = row.filter((c) => c !== undefined && c !== null && String(c).trim() !== "");
            if (textCells.length === 0) continue;

            let keywordScore = 0;
            textCells.forEach((c) => {
              const str = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              if (KEYWORDS.some((kw) => str.includes(kw))) {
                keywordScore += 3;
              }
            });

            const score = textCells.length + keywordScore;
            if (score > bestScore) {
              bestScore = score;
              bestHeaderIdx = r;
            }
          }

          const headerRow = rawArray[bestHeaderIdx] || [];
          const cleanHeaders: string[] = [];
          const seenHeaders: Record<string, number> = {};

          headerRow.forEach((h, cIdx) => {
            let name = h !== undefined && h !== null ? String(h).trim() : "";
            if (!name) name = `Col_${cIdx + 1}`;
            if (seenHeaders[name]) {
              seenHeaders[name]++;
              name = `${name}_${seenHeaders[name]}`;
            } else {
              seenHeaders[name] = 1;
            }
            cleanHeaders.push(name);
          });

          const rows: Record<string, any>[] = [];
          for (let r = bestHeaderIdx + 1; r < rawArray.length; r++) {
            const rowData = rawArray[r];
            if (!Array.isArray(rowData) || rowData.every((c) => c === undefined || c === null || String(c).trim() === "")) {
              continue;
            }
            const rowObj: Record<string, any> = {};
            cleanHeaders.forEach((h, colIdx) => {
              let val = rowData[colIdx];
              if (val instanceof Date) {
                val = val.toISOString().slice(0, 10);
              }
              rowObj[h] = val !== undefined && val !== null ? val : "";
            });
            rows.push(rowObj);
          }

          return {
            sheetName,
            rows,
            rawArray,
            headers: cleanHeaders,
          };
        });

        // Pick primary sheet
        const primarySheet =
          sheets.find(
            (s) =>
              /parc|pf|equip|appareil|cpsi|devis|quote|stock|tache|task/i.test(s.sheetName) &&
              s.rows.length > 0
          ) ||
          sheets.reduce(
            (best, cur) => (cur.rows.length > best.rows.length ? cur : best),
            sheets[0] || { sheetName: "Sheet1", rows: [], rawArray: [], headers: [] }
          );

        const primaryRows = primarySheet.rows || [];
        const headers = primarySheet.headers || [];

        // Dual return: An Array that is also an Object with sheets, primaryRows, headers
        const result: any = Object.assign([...primaryRows], {
          sheets,
          primaryRows,
          headers,
        });

        resolve(result);
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Generate and download standard 3-Sheet Excel template for Quote Import (.xlsx)
 * Sheet 1: Lignes_Devis (En-têtes et lignes principales)
 * Sheet 2: Detail_Pieces (Détails des pièces et articles détachés reliés par N° Devis)
 * Sheet 3: Synthese_Portefeuille (Règles et exemples)
 */
export function downloadQuotesExcelTemplate() {
  const quotesData = [
    {
      "N° Devis": "DEV-2026-1001",
      "Intitulé de la Prestation": "Contrat de maintenance semestriel Ascenseur A",
      "Client / Syndic": "Tour Horizon Syndic",
      "Compte Client": "1008153",
      "N° Appareil (PF)": "PF-78012",
      "Montant HT (MAD)": 36000,
      "Coût Revient HT (MAD)": 15000,
      "Taux TVA (%)": 20,
      "Statut Devis": "Validé / Accepté",
      "Mois Facturation (YYYY-MM)": "2026-10",
      "Date Émission (YYYY-MM-DD)": "2026-09-01",
      "Notes & Remarques": "Validé en assemblée générale",
    },
    {
      "N° Devis": "DEV-2026-1002",
      "Intitulé de la Prestation": "Changement cellules barrières infrarouges 2D",
      "Client / Syndic": "Hôpital Privé La Timone",
      "Compte Client": "1009240",
      "N° Appareil (PF)": "PF-91304",
      "Montant HT (MAD)": 18500,
      "Coût Revient HT (MAD)": 7500,
      "Taux TVA (%)": 20,
      "Statut Devis": "Envoyé",
      "Mois Facturation (YYYY-MM)": "2026-11",
      "Date Émission (YYYY-MM-DD)": "2026-09-02",
      "Notes & Remarques": "Devis transmis au service technique",
    },
    {
      "N° Devis": "DEV-2026-1003",
      "Intitulé de la Prestation": "Rénovation balustrade verre & peignes Escalator",
      "Client / Syndic": "Centre Commercial Confluence",
      "Compte Client": "1004512",
      "N° Appareil (PF)": "PF-84022",
      "Montant HT (MAD)": 74000,
      "Coût Revient HT (MAD)": 32000,
      "Taux TVA (%)": 20,
      "Statut Devis": "Facturé",
      "Mois Facturation (YYYY-MM)": "2026-12",
      "Date Émission (YYYY-MM-DD)": "2026-09-03",
      "Notes & Remarques": "Travaux réceptionnés sans réserve",
    },
    {
      "N° Devis": "DEV-2026-1004",
      "Intitulé de la Prestation": "Remplacement câbles de traction et poulies",
      "Client / Syndic": "Résidence Les Jardins d'Anfa",
      "Compte Client": "1007890",
      "N° Appareil (PF)": "PF-65219",
      "Montant HT (MAD)": 52000,
      "Coût Revient HT (MAD)": 21000,
      "Taux TVA (%)": 20,
      "Statut Devis": "Brouillon",
      "Mois Facturation (YYYY-MM)": "2026-10",
      "Date Émission (YYYY-MM-DD)": "2026-09-04",
      "Notes & Remarques": "En attente confirmation fournisseur câbles",
    },
  ];

  const piecesData = [
    {
      "N° Devis": "DEV-2026-1001",
      "Réf Pièce": "SCH-77119-A",
      "Désignation / Article": "Câble de traction acier 8x19S d10mm (au mètre)",
      "Quantité": 120,
      "Prix Unitaire Vente HT (MAD)": 150,
      "Total Vente HT (MAD)": 18000,
      "Coût Unitaire HT (MAD)": 60,
      "Total Coût HT (MAD)": 7200,
    },
    {
      "N° Devis": "DEV-2026-1001",
      "Réf Pièce": "SCH-88402-B",
      "Désignation / Article": "Kit garnitures mâchoires de frein électromécanique",
      "Quantité": 2,
      "Prix Unitaire Vente HT (MAD)": 9000,
      "Total Vente HT (MAD)": 18000,
      "Coût Unitaire HT (MAD)": 3900,
      "Total Coût HT (MAD)": 7800,
    },
    {
      "N° Devis": "DEV-2026-1002",
      "Réf Pièce": "SCH-33410-C",
      "Désignation / Article": "Jeu barrières immatérielles infrarouges 2D (Émetteur + Récepteur)",
      "Quantité": 1,
      "Prix Unitaire Vente HT (MAD)": 12500,
      "Total Vente HT (MAD)": 12500,
      "Coût Unitaire HT (MAD)": 5000,
      "Total Coût HT (MAD)": 5000,
    },
    {
      "N° Devis": "DEV-2026-1002",
      "Réf Pièce": "SCH-MAIN-OP",
      "Désignation / Article": "Forfait pose & raccordement armoire Schindler",
      "Quantité": 1,
      "Prix Unitaire Vente HT (MAD)": 6000,
      "Total Vente HT (MAD)": 6000,
      "Coût Unitaire HT (MAD)": 2500,
      "Total Coût HT (MAD)": 2500,
    },
    {
      "N° Devis": "DEV-2026-1003",
      "Réf Pièce": "SCH-ESC-881",
      "Désignation / Article": "Jeu de peignes aluminium anodisé palier haut/bas escalator",
      "Quantité": 4,
      "Prix Unitaire Vente HT (MAD)": 8500,
      "Total Vente HT (MAD)": 34000,
      "Coût Unitaire HT (MAD)": 3500,
      "Total Coût HT (MAD)": 14000,
    },
    {
      "N° Devis": "DEV-2026-1003",
      "Réf Pièce": "SCH-ESC-920",
      "Désignation / Article": "Panneaux verre trempé securit balustrade 10mm",
      "Quantité": 8,
      "Prix Unitaire Vente HT (MAD)": 5000,
      "Total Vente HT (MAD)": 40000,
      "Coût Unitaire HT (MAD)": 2250,
      "Total Coût HT (MAD)": 18000,
    },
    {
      "N° Devis": "DEV-2026-1004",
      "Réf Pièce": "SCH-POUL-450",
      "Désignation / Article": "Poulie de déviation fonte GS D450 5 gorges",
      "Quantité": 2,
      "Prix Unitaire Vente HT (MAD)": 14000,
      "Total Vente HT (MAD)": 28000,
      "Coût Unitaire HT (MAD)": 5500,
      "Total Coût HT (MAD)": 11000,
    },
    {
      "N° Devis": "DEV-2026-1004",
      "Réf Pièce": "SCH-CAB-12M",
      "Désignation / Article": "Toron câble de levage spécial ascenseur haute résistance",
      "Quantité": 200,
      "Prix Unitaire Vente HT (MAD)": 120,
      "Total Vente HT (MAD)": 24000,
      "Coût Unitaire HT (MAD)": 50,
      "Total Coût HT (MAD)": 10000,
    },
  ];

  const instructionsData = [
    { "Guide": "Feuille 1 (Lignes_Devis)", "Description": "En-têtes de devis avec N° Devis, Client, PF, Montants, Statut, Mois Facturation" },
    { "Guide": "Feuille 2 (Detail_Pieces)", "Description": "Détails des articles et pièces reliés par le 'N° Devis' (Réf, Description, Qté, Prix, Coût)" },
    { "Guide": "Feuille 3 (Synthese)", "Description": "Cette notice d'utilisation" },
    { "Guide": "Calcul Marge C1", "Description": "Marge C1 (MAD) = Montant Vente HT - Coût de Revient HT | Marge (%) = C1 / Vente HT" },
  ];

  const wb = XLSX.utils.book_new();

  // 1. Feuille 1: Lignes_Devis
  const wsQuotes = XLSX.utils.json_to_sheet(quotesData);
  wsQuotes["!cols"] = [
    { wch: 18 }, // N° Devis
    { wch: 45 }, // Intitulé
    { wch: 30 }, // Client
    { wch: 16 }, // Compte Client
    { wch: 18 }, // N° PF
    { wch: 20 }, // Montant HT
    { wch: 22 }, // Coût HT
    { wch: 14 }, // TVA
    { wch: 20 }, // Statut
    { wch: 26 }, // Mois Facturation
    { wch: 26 }, // Date Émission
    { wch: 40 }, // Notes
  ];
  XLSX.utils.book_append_sheet(wb, wsQuotes, "Lignes_Devis");

  // 2. Feuille 2: Detail_Pieces
  const wsPieces = XLSX.utils.json_to_sheet(piecesData);
  wsPieces["!cols"] = [
    { wch: 18 }, // N° Devis
    { wch: 20 }, // Réf Pièce
    { wch: 55 }, // Désignation
    { wch: 12 }, // Quantité
    { wch: 25 }, // PU Vente
    { wch: 22 }, // Total Vente
    { wch: 22 }, // PU Coût
    { wch: 20 }, // Total Coût
  ];
  XLSX.utils.book_append_sheet(wb, wsPieces, "Detail_Pieces");

  // 3. Feuille 3: Notice & Synthese
  const wsInstructions = XLSX.utils.json_to_sheet(instructionsData);
  wsInstructions["!cols"] = [
    { wch: 30 },
    { wch: 80 },
  ];
  XLSX.utils.book_append_sheet(wb, wsInstructions, "Notice_Synthese");

  XLSX.writeFile(wb, "Modele_Import_Devis_3Feuilles_Schindler.xlsx");
}

