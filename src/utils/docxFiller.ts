import JSZip from "jszip";

export interface DocxRowData {
  refNc: string;
  description: string;
  inspectionDate?: string;
  inspectionType?: string;
  closureDate?: string;
  technician?: string;
}

export interface DocxPlaceholderData {
  id: string;
  equipmentNumber: string;
  clientName: string;
  description?: string;
  inspectionDate?: string;
  inspectionType?: string;
  technician?: string;
  coveredBy?: "Schindler" | "Client";
  rows?: DocxRowData[];
}

/**
 * Fills the official NC_ID.docx template with provided data and triggers download
 */
export async function downloadFilledNcDocx(data: DocxPlaceholderData, customFilename?: string): Promise<void> {
  try {
    // 1. Fetch the exact NC_ID.docx template from /public/NC_ID.docx
    const response = await fetch("/NC_ID.docx");
    if (!response.ok) {
      throw new Error(`Impossible de charger le modèle /NC_ID.docx (${response.status})`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    const docXmlFile = zip.file("word/document.xml");
    if (!docXmlFile) {
      throw new Error("Structure docx invalide : word/document.xml introuvable.");
    }

    let docXml = await docXmlFile.async("string");

    const idVal = data.id || "11127";
    const eqVal = data.equipmentNumber || "9911614";
    const clientVal = (data.clientName || "BANQUE POPULAIRE REM").toUpperCase();
    const descVal = data.description || "";
    const typeVal = data.inspectionType || "5Y";
    const techVal = (data.technician || "HICHAM BOUTKHILI").toUpperCase();
    const inspDateVal = data.inspectionDate || "5/19/2026";

    // Escape special XML characters in replacement text to prevent corrupting XML
    const escapeXml = (unsafe?: string) => {
      return (unsafe || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
    };

    const safeId = escapeXml(idVal);
    const safeEq = escapeXml(eqVal);
    const safeClient = escapeXml(clientVal);

    // Replace [ID]
    docXml = docXml.replace(/\[ID\]/g, safeId);

    // Replace [nom client]
    docXml = docXml.replace(/\[nom client\]/g, safeClient);

    // Replace [N°appareil] across any split XML tag boundaries
    docXml = docXml.replace(/\[N[\s\S]*?appareil\]/g, safeEq);
    docXml = docXml.replace(/\[N°appareil\]/g, safeEq);

    // Build Structured Table XML with clean borders and column widths
    const rowsList: DocxRowData[] = data.rows && data.rows.length > 0
      ? data.rows
      : [{
          refNc: idVal,
          description: descVal,
          inspectionDate: inspDateVal,
          inspectionType: typeVal,
          closureDate: "",
          technician: techVal
        }];

    const cols = [
      { name: "Réf NC", w: 1100, align: "left" },
      { name: "Description NC Remarques", w: 3900, align: "left" },
      { name: "Date de l'inspection", w: 1400, align: "left" },
      { name: "1Y/5Y", w: 800, align: "center" },
      { name: "Date de clôture", w: 1200, align: "left" },
      { name: "Technicien", w: 1300, align: "left" },
      { name: "Signature", w: 800, align: "center" }
    ];

    let tableXml = '<w:tbl>';
    tableXml += '<w:tblPr>';
    tableXml += '<w:tblW w:w="10500" w:type="dxa"/>';
    tableXml += '<w:jc w:val="center"/>';
    tableXml += '<w:tblBorders>';
    tableXml += '<w:top w:val="single" w:sz="20" w:space="0" w:color="000000"/>';
    tableXml += '<w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/>';
    tableXml += '<w:left w:val="none"/>';
    tableXml += '<w:right w:val="none"/>';
    tableXml += '<w:insideH w:val="single" w:sz="16" w:space="0" w:color="000000"/>';
    tableXml += '<w:insideV w:val="none"/>';
    tableXml += '</w:tblBorders>';
    tableXml += '<w:tblCellMar>';
    tableXml += '<w:top w:w="140" w:type="dxa"/>';
    tableXml += '<w:bottom w:w="140" w:type="dxa"/>';
    tableXml += '<w:left w:w="120" w:type="dxa"/>';
    tableXml += '<w:right w:w="120" w:type="dxa"/>';
    tableXml += '</w:tblCellMar>';
    tableXml += '</w:tblPr>';

    tableXml += '<w:tblGrid>';
    cols.forEach(c => { tableXml += `<w:gridCol w:w="${c.w}"/>`; });
    tableXml += '</w:tblGrid>';

    // Header Row (without vertical borders, gray bold text matching the model)
    tableXml += '<w:tr><w:trPr><w:tblHeader/></w:trPr>';
    cols.forEach(c => {
      tableXml += `<w:tc><w:tcPr><w:tcW w:w="${c.w}" w:type="dxa"/></w:tcPr>`;
      tableXml += `<w:p><w:pPr><w:jc w:val="${c.align}"/><w:spacing w:before="100" w:after="100"/><w:rPr><w:b/><w:color w:val="52525B"/><w:sz w:val="18"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:pPr>`;
      tableXml += `<w:r><w:rPr><w:b/><w:color w:val="52525B"/><w:sz w:val="18"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>${c.name}</w:t></w:r></w:p></w:tc>`;
    });
    tableXml += '</w:tr>';

    // Data Rows (without vertical borders)
    rowsList.forEach(r => {
      tableXml += '<w:tr>';
      const cellVals = [
        { val: escapeXml(r.refNc || idVal), align: "left", bold: true },
        { val: escapeXml(r.description || descVal), align: "left", bold: false },
        { val: escapeXml(r.inspectionDate || inspDateVal), align: "left", bold: false },
        { val: escapeXml(r.inspectionType || typeVal), align: "center", bold: false },
        { val: escapeXml(r.closureDate || ""), align: "left", bold: false },
        { val: escapeXml(r.technician || techVal).toUpperCase(), align: "left", bold: false },
        { val: "", align: "center", bold: false }
      ];

      cellVals.forEach((cv, idx) => {
        tableXml += `<w:tc><w:tcPr><w:tcW w:w="${cols[idx].w}" w:type="dxa"/><w:tcBorders><w:bottom w:val="single" w:sz="4" w:space="0" w:color="E2E8F0"/></w:tcBorders></w:tcPr>`;
        tableXml += `<w:p><w:pPr><w:jc w:val="${cv.align}"/><w:spacing w:before="100" w:after="100"/><w:rPr>${cv.bold ? '<w:b/>' : ''}<w:sz w:val="18"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr></w:pPr>`;
        tableXml += `<w:r><w:rPr>${cv.bold ? '<w:b/>' : ''}<w:sz w:val="18"/><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>${cv.val}</w:t></w:r></w:p></w:tc>`;
      });
      tableXml += '</w:tr>';
    });
    tableXml += '</w:tbl>';

    // Replace the placeholder table block in docXml with tableXml
    if (docXml.includes("Réf")) {
      const startIdx = docXml.lastIndexOf("<w:p", docXml.indexOf("Réf"));
      const techIdx = docXml.indexOf("[nom techncien]");
      let endIdx = -1;
      if (techIdx !== -1) {
        endIdx = docXml.indexOf("</w:p>", techIdx) + 6;
      } else {
        const endTarget = docXml.indexOf("Chef d'agence");
        if (endTarget !== -1) {
          endIdx = docXml.lastIndexOf("</w:p>", endTarget) + 6;
        }
      }

      if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
        docXml = docXml.substring(0, startIdx) + tableXml + docXml.substring(endIdx);
      }
    }

    // Fallback replaces if table markers were not present
    docXml = docXml.replace(/\[description\]/g, escapeXml(descVal));
    docXml = docXml.replace(/\[1Y\/5Y\]/g, escapeXml(typeVal));
    docXml = docXml.replace(/\[nom techncien\]/g, escapeXml(techVal));
    docXml = docXml.replace(/\[nom technicien\]/g, escapeXml(techVal));

    // Update word/document.xml in the zip
    zip.file("word/document.xml", docXml);

    // Generate output blob
    const outputBlob = await zip.generateAsync({
      type: "blob",
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    });

    // Trigger instant browser download
    const filename = customFilename || `Bon_Cloture_NC_${idVal}_App_${eqVal}.docx`;
    const blobUrl = URL.createObjectURL(outputBlob);
    const downloadLink = document.createElement("a");
    downloadLink.href = blobUrl;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  } catch (error) {
    console.error("Erreur lors de la génération du document Word (.docx) :", error);
    throw error;
  }
}

