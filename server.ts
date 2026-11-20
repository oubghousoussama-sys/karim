import express from "express";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import PizZip from "pizzip";
import Docxtemplater from "docxtemplater";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Initialize Gemini Client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is missing.");
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
};

// Resilient helper to call Gemini with automatic retry and model fallback upon 503 / 429
async function generateContentWithRetry(
  ai: ReturnType<typeof getGenAI>,
  params: Parameters<ReturnType<typeof getGenAI>["models"]["generateContent"]>[0],
  maxRetries = 2
) {
  const preferredModel = params.model || "gemini-3.7-flash";
  const fallbackModels = [preferredModel, "gemini-flash-latest", "gemini-3.1-flash-lite"];
  const modelsToTry = Array.from(new Set(fallbackModels));

  let lastError: any = null;

  for (const model of modelsToTry) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const status = err?.status || err?.code || err?.error?.code;
        const msg = (err?.message || err?.error?.message || "").toLowerCase();
        const isTransient =
          status === 503 ||
          status === 429 ||
          status === "UNAVAILABLE" ||
          status === "RESOURCE_EXHAUSTED" ||
          msg.includes("high demand") ||
          msg.includes("temporarily unavailable") ||
          msg.includes("spikes in demand") ||
          msg.includes("overloaded") ||
          msg.includes("rate limit") ||
          msg.includes("fetch failed");

        if (!isTransient) {
          // If it's a prompt/syntax error, trying the same model again won't help, move to next
          break;
        }

        if (attempt < maxRetries) {
          const delay = (attempt + 1) * 1000;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError;
}

const SYSTEM_PROMPT = `# ROLE
Tu es TOOLBOX AI PRO, un assistant métier intelligent conçu pour accompagner les équipes opérationnelles, administratives, commerciales et managériales.

Tu combines les compétences d'un :
• Consultant Senior (Stratégie opérationnelle, structuration, résolution de problèmes complexes)
• Responsable des Opérations (Supply chain, logistique, optimisation des processus, Lean)
• Contrôleur de Gestion (Analyse financière, marges, budgets, rentabilité, KPI)
• Coordinateur Administratif (Gestion documentaire, conformité, procédures SOP, comptes-rendus)
• Expert Excel et Reporting (Formules avancées, PowerQuery, DAX, VBA, modélisation financière)
• Assistant RH et Contrats (Contrats CDI/CDD/Prestataire, avenants, fiches de poste, conformité)
• Gestionnaire de Stock (Calculs de sécurité, formule de Wilson, point de commande, rotation ABC, alertes)
• Chef de Projet (Méthodes Agile/Cascade, matrice RACI, rétroplannings, gestion des risques)

Ton objectif est de transformer toute demande en résultat directement exploitable.

# COMPORTEMENT ET NIVEAU D'EXIGENCE
Tu travailles toujours comme un expert métier expérimenté.
Tu analyses avant de répondre.
Tu identifies :
- le besoin réel
- les risques
- les opportunités
- les actions prioritaires

Tu ne fournis JAMAIS une réponse générique ou vague. Tu apportes toujours une valeur ajoutée concrète avec des chiffres, méthodes et étapes précises.
Raisonner comme un directeur des opérations expérimenté.
Utiliser des tableaux Markdown clairs chaque fois que c'est pertinent.

# FORMAT DE SORTIE OBLIGATOIRE
Sauf demande très spécifique (par exemple si l'utilisateur demande uniquement un code de formule Excel brut ou un texte de contrat prêt à copier), structure TOUTES tes analyses et réponses avec le formatage strict suivant :

🎯 OBJECTIF
[Objectif précis et clair identifié]

📋 SYNTHÈSE
[Résumé exécutif à forte valeur ajoutée en 2-4 phrases percutantes]

🔍 ANALYSE
[Analyse détaillée, détection des contraintes, données clés, tableaux comparatifs si applicable]

✅ RECOMMANDATION
[Meilleure solution recommandée avec justification métier]

🛠 PLAN D'ACTION
1. [Action 1 prioritaire - Responsable / Échéance / Livrable]
2. [Action 2 - Responsable / Échéance / Livrable]
3. [Action 3 - Responsable / Échéance / Livrable]
4. [Action 4 - Responsable / Échéance / Livrable]

⚠️ POINTS DE VIGILANCE
[Résumé des risques opérationnels, financiers, juridiques ou humains à anticiper]

📈 IMPACT ATTENDU
[Gains chiffrés attendus : temps, coûts, conformité, qualité, trésorerie]

⭐ CONSEIL EXPERT
[Recommandation d'optimisation complémentaire de haut niveau pour dépasser l'objectif initial]

# TON
Professionnel. Moderne. Concis. Consultatif. Hautement structuré et orienté résultats.`;

// Serve contract template files statically
app.use("/MODELES CONTRATS", express.static(path.join(process.cwd(), "MODELES CONTRATS")));
app.use("/modeles-contrats", express.static(path.join(process.cwd(), "MODELES CONTRATS")));

// API Routes
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Generic Consultation / Chat Endpoint
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { messages, contextSpecialty, customParameters } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const ai = getGenAI();

    let specializedContext = "";
    if (contextSpecialty) {
      specializedContext = `\n\n[CONTEXTE DU MODULE ACTIF : ${contextSpecialty}]`;
    }
    if (customParameters && Object.keys(customParameters).length > 0) {
      specializedContext += `\n[PARAMÈTRES MÉTIER SPÉCIFIQUES : ${JSON.stringify(customParameters)}]`;
    }

    // Build chat contents or prompt
    const contents = messages.map((m: { role: string; content: string }) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT + specializedContext,
        temperature: 0.4,
      },
    });

    res.json({
      text: response.text || "Aucune réponse générée.",
    });
  } catch (error: any) {
    console.error("Error in /api/gemini/chat:", error);
    res.status(500).json({
      error: error?.message || "Erreur lors de l'exécution de l'assistant IA.",
    });
  }
});

// Specialized Technical Diagnostic Report Generator Endpoint (Schindler Elevator Expertise)
app.post("/api/technical-reports/generate", async (req, res) => {
  try {
    const reportData = req.body;
    if (!reportData) {
      return res.status(400).json({ error: "Données du rapport technique manquantes." });
    }

    const ai = getGenAI();

    const formattedAnomalies = (reportData.anomalies || [])
      .map((a: any, index: number) => `
Anomalie N°${index + 1} : ${a.title || "Anomalie constatée"}
- Organe : ${a.organ || "Non spécifié"}
- Description : ${a.description || "N/A"}
- Causes probables : ${a.causes || "N/A"}
- Impact sur le service : ${a.impact || "N/A"}
- Actions réalisées : ${a.actionsDone || "N/A"}
- Solution temporaire appliquée : ${a.temporarySolution || "N/A"}
- Solution définitive recommandée : ${a.definitiveSolution || "N/A"}
- Pièces de rechange nécessaires : ${a.requiredParts || "N/A"}
- Criticité : ${a.criticality || "Moyen"}
- Recommandations préventives : ${a.preventiveRecommendations || "N/A"}
`).join("\n");

    const formattedParts = (reportData.replacedOrOrderedParts || [])
      .map(
        (p: any) =>
          `| ${p.designation || "Pièce"} | ${p.reference || "-"} | ${p.quantity || "1"} | ${p.reason || "-"} |`
      )
      .join("\n");

    const inputContext = `
INFORMATIONS COLLECTÉES SUR LE TERRAIN :
- Numéro du rapport : ${reportData.reportNumber || "RT-" + new Date().getFullYear() + "-001"}
- Date d'intervention : ${reportData.interventionDate || new Date().toISOString().split("T")[0]}
- Numéro appareil (PF) : ${reportData.equipmentNumber || "PF-78012"}
- Type / Gamme d'ascenseur : ${reportData.equipmentType || "Schindler 3300 / 5500"}
- Client / Immeuble : ${reportData.clientName || "Client"}
- Ville / Localisation : ${reportData.locationCity || "Casablanca"}
- Technicien intervenant : ${reportData.technicianName || "Technicien Expert Schindler"}
- Responsable du technicien (Signataire) : ${reportData.supervisorName || "Responsable Technique Schindler"}
- Constat sur terrain : ${reportData.siteObservation || "Appareil vérifié sur site suite à signalement d'anomalie."}

ANOMALIES CONSTATÉES SUR SITE :
${formattedAnomalies || "Aucune anomalie critique enregistrée."}

HISTORIQUE DES PANNES & RÉCURRENCE :
${reportData.historyAndRecurrence || "Historique des 3 derniers mois analysé."}

TRAVAUX RÉALISÉS LORS DE L'INTERVENTION :
${reportData.worksDone || "Contrôles de sécurité et réglages initiaux effectués."}

PIÈCES REMPLACÉES OU COMMANDÉES :
${
  formattedParts
    ? `| Désignation | Référence | Quantité | Motif de remplacement |\n|---|---|---|---|\n${formattedParts}`
    : "Aucune pièce spécifique listée."
}

RECOMMANDATIONS TECHNIQUES PRÉCONISÉES :
${reportData.technicalRecommendations || "Maintenance préventive approfondie recommandée."}

CONCLUSION PROVISOIRE :
${reportData.conclusion || "Installation sous surveillance technique."}
`;

    const userPrompt = `Agis en tant qu'expert technique en maintenance d'ascenseurs Schindler.

À partir des informations suivantes, rédige un rapport technique de diagnostic détaillé, professionnel et destiné au client ainsi qu'aux équipes techniques.

Pour chaque anomalie constatée, ajoute obligatoirement :

1. Description détaillée de l'anomalie.
2. Analyse des causes probables.
3. Impact potentiel sur le fonctionnement de l'appareil.
4. Actions correctives déjà réalisées sur site.
5. Solutions préconisées à court terme.
6. Solution définitive recommandée.
7. Pièces de rechange nécessaires (si applicable).
8. Niveau de criticité (Faible / Moyen / Élevé).
9. Recommandations de maintenance préventive pour éviter la réapparition du défaut.
10. Conclusion générale sur l'état de l'appareil.

Rédige le rapport avec les sections suivantes :

# RAPPORT TECHNIQUE D'INTERVENTION ET DIAGNOSTIC

## 1. Informations générales
- Numéro du rapport
- Date d'intervention
- Numéro appareil
- Technicien intervenant
- Responsable technique signataire

## 2. Constat sur terrain
Décrire précisément l'état de l'appareil lors de l'intervention.

## 3. Anomalies constatées

### Anomalie N°1
- Description
- Causes probables
- Impact sur le service
- Actions réalisées
- Solution temporaire appliquée
- Solution définitive recommandée
- Pièces de rechange nécessaires
- Criticité

### Anomalie N°2
(Même structure)

## 4. Historique des pannes et analyse des récurrences
Analyser les tickets historiques et identifier les éventuelles récurrences ou tendances.

## 5. Travaux réalisés lors de l'intervention
Présenter les actions exécutées sur site.

## 6. Pièces remplacées ou commandées
Présenter sous forme de tableau :
| Désignation | Référence | Quantité | Motif de remplacement |

## 7. Recommandations techniques
Proposer des recommandations d'amélioration et de maintenance préventive.

## 8. Conclusion
Donner un avis technique global sur l'état de l'installation et les actions à planifier.

Utiliser un ton professionnel, précis et orienté expertise technique.
Mettre en évidence les risques opérationnels et les bénéfices des solutions proposées.

---
${inputContext}
`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.8-flash",
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      config: {
        systemInstruction:
          "Tu es un Ingénieur Expert Technique et Responsable National du Diagnostic Ascenseurs chez Schindler Maroc. Tu rédiges des rapports techniques d'intervention et de diagnostic d'une rigueur absolue, impeccablement structurés en Markdown, avec un vocabulaire technique d'ascensoriste précis (variateurs VF, manœuvre CO MX / Bionic, opérateurs de porte Fermator/QKS, câbles de traction STM, parachutes, contacts de sécurité, fins de course, amortisseurs, serrure de porte palière).",
        temperature: 0.3,
      },
    });

    const markdown = response.text || "Erreur lors de la génération du rapport technique.";
    res.json({ markdown });
  } catch (error: any) {
    console.error("Error in /api/technical-reports/generate:", error);
    res.status(500).json({
      error: error?.message || "Erreur lors de la génération du rapport technique.",
    });
  }
});

// Direct Word (.docx) Contract Template Filling Endpoint
app.post("/api/contracts/generate", async (req, res) => {
  try {
    const {
      contractModel,
      projectName,
      clientName,
      city,
      effectiveDate,
      contractDuration,
      billingMethod,
      paymentMethod,
      tvaRate,
      invoiceDepot,
      breakdownOptions,
      apparatusList,
      totals,
    } = req.body;

    let templateFilename = "residentiel (1).docx";
    const modelLower = String(contractModel || "").toLowerCase();
    if (modelLower.includes("simple")) {
      templateFilename = "simple (1).docx";
    } else if (modelLower.includes("etendue") || modelLower.includes("étendue") || modelLower.includes("complet")) {
      templateFilename = "etendue.docx";
    }

    const templatePath = path.join(process.cwd(), "MODELES CONTRATS", templateFilename);
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: `Fichier modèle non trouvé : ${templateFilename}` });
    }

    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    const clientStr = clientName || projectName || "Client";
    const cityStr = city || "Casablanca";
    const totalHTNum = Number(totals?.totalHT || 0);
    const tvaRateNum = Number(tvaRate || 20);
    const tvaAmountNum = Number(totals?.tvaAmount || (totalHTNum * tvaRateNum) / 100);
    const totalTTCNum = Number(totals?.totalTTC || (totalHTNum + tvaAmountNum));

    // Format apparatus table rows
    const formattedAppareils = (apparatusList || []).map((app: any) => ({
      numero: app.appNumber || "",
      type: app.type || "Ascenseur",
      client: app.clientBuilding || clientStr,
      charge: String(app.capacityKg || "-"),
      niveaux: String(app.levels || "-"),
      visites: String(app.annualVisits || "12"),
      prixHTFmt: Number(app.priceHtAnnual || 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    }));

    // Format date string (e.g. DD/MM/YYYY)
    let formattedEffetDate = effectiveDate || "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(formattedEffetDate)) {
      const [y, m, d] = formattedEffetDate.split("-");
      formattedEffetDate = `${d}/${m}/${y}`;
    }

    doc.render({
      nomClient: clientStr,
      ville: cityStr,
      dateEffet: formattedEffetDate || "01/09/2026",
      duree: String(contractDuration || "").trim() || "3 ans",
      facturation: billingMethod || "Fin de trimestre",
      moyenPaiement: paymentMethod || "Virement ou chèque",
      check24h: breakdownOptions?.h24 ? "☑" : "☐",
      check2h: breakdownOptions?.under2h ? "☑" : "☐",
      checkDematerialise: invoiceDepot?.dematerialized ? "☑" : "☐",
      checkPhysique: invoiceDepot?.physical ? "☑" : "☐",
      totalHTFmt: totalHTNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      tvaFmt: tvaAmountNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      totalTTCFmt: totalTTCNum.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      appareils: formattedAppareils,
    });

    const buffer = doc.getZip().generate({ type: "nodebuffer" });
    const cleanClientName = clientStr.replace(/[^a-zA-Z0-9-_]/g, "_");
    const outputFilename = `Contrat_Schindler_${cleanClientName}_${contractModel || "residentiel"}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${outputFilename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error generating contract docx:", error);
    res.status(500).json({ error: error?.message || "Erreur lors de la génération du contrat Word." });
  }
});

// Grand Compte Attachment Document Generator (.docx)
app.post("/api/attachements/generate-docx", async (req, res) => {
  try {
    const {
      clientName,
      city,
      contractNumber,
      installationName,
      apparatusList,
      year = 2026,
      trimester = 3,
      representative
    } = req.body;

    const templatePath = path.join(process.cwd(), "public", "Attachement_PALAIS_ROYAL_TOITS_OUVRANTS_3ème_Trimestre.docx");
    if (!fs.existsSync(templatePath)) {
      return res.status(404).json({ error: "Modèle d'attachement Word non trouvé dans /public" });
    }

    const content = fs.readFileSync(templatePath);
    const zip = new PizZip(content);

    const tNum = Number(trimester) || 3;
    const yNum = Number(year) || 2026;

    const trimesterOrdinals: Record<number, string> = {
      1: "1er",
      2: "2ème",
      3: "3ème",
      4: "4ème"
    };

    const trimesterPeriods: Record<number, string> = {
      1: `DU 01/01/${yNum} AU 31/03/${yNum}`,
      2: `DU 01/04/${yNum} AU 30/06/${yNum}`,
      3: `DU 01/07/${yNum} AU 30/09/${yNum}`,
      4: `DU 01/10/${yNum} AU 31/12/${yNum}`
    };

    const trimesterMonths: Record<number, [string, string, string]> = {
      1: ["Janvier", "Février", "Mars"],
      2: ["Avril", "Mai", "Juin"],
      3: ["Juillet", "Août", "Septembre"],
      4: ["Octobre", "Novembre", "Décembre"]
    };

    const targetOrdinal = trimesterOrdinals[tNum] || `${tNum}ème`;
    const targetPeriod = trimesterPeriods[tNum] || `DU 01/01/${yNum} AU 31/12/${yNum}`;
    const targetMonths = trimesterMonths[tNum] || ["Mois 1", "Mois 2", "Mois 3"];

    const clientStr = (clientName || installationName || "CLIENT GRAND COMPTE").trim();
    const cityStr = (city || "CASABLANCA").trim().toUpperCase();
    const contractStr = (contractNumber || "6142").trim();
    const appStr = Array.isArray(apparatusList)
      ? apparatusList.join(", ")
      : String(apparatusList || "").trim() || "770001";

    let docXml = zip.file("word/document.xml")?.asText();
    if (!docXml) {
      throw new Error("Impossible de lire la structure XML du modèle Word.");
    }

    // Surgical replacements inside document.xml
    docXml = docXml.replace(/PALAIS ROYAL TOITS OUVRANTS/g, clientStr);
    docXml = docXml.replace(/FES/g, cityStr);
    docXml = docXml.replace(/6142/g, contractStr);
    docXml = docXml.replace(/770397, 770398, 770399, 770400, 770401, 770402/g, appStr);
    docXml = docXml.replace(/DU 01\/07\/2026 AU 30\/09\/2026/g, targetPeriod);
    docXml = docXml.replace(/>3ème</g, `>${targetOrdinal}<`);
    docXml = docXml.replace(/TRIMESTRE 2026/g, `TRIMESTRE ${yNum}`);
    docXml = docXml.replace(/>Juillet</g, `>${targetMonths[0]}<`);
    docXml = docXml.replace(/>Août</g, `>${targetMonths[1]}<`);
    docXml = docXml.replace(/>Septembre</g, `>${targetMonths[2]}<`);

    zip.file("word/document.xml", docXml);

    const buffer = zip.generate({ type: "nodebuffer" });
    const cleanClient = clientStr.replace(/[^a-zA-Z0-9-_]/g, "_");
    const outputFilename = `Attachement_${cleanClient}_T${tNum}_${yNum}.docx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${outputFilename}"`);
    res.send(buffer);
  } catch (error: any) {
    console.error("Error generating Grand Compte attachment docx:", error);
    res.status(500).json({ error: error?.message || "Erreur lors de la génération du bon d'attachement Word." });
  }
});

// Specialized Document & Contract Generator
app.post("/api/gemini/generate-document", async (req, res) => {
  try {
    const {
      documentType,
      contractModel,
      projectName,
      clientName,
      city,
      effectiveDate,
      contractDuration,
      billingMethod,
      paymentMethod,
      tvaRate,
      schindlerRep,
      invoiceDepot,
      breakdownOptions,
      apparatusList,
      totals,
      title,
      parties,
      keyTerms,
      clauses,
      specificNotes
    } = req.body;

    const ai = getGenAI();

    let prompt = "";
    if (documentType === "Contrat de Prestation" || contractModel) {
      prompt = `Génère un contrat de maintenance et prestation de service Schindler complet, prêt à l'emploi et juridiquement conforme au modèle "${contractModel || 'résidentiel'}".

INFORMATIONS GÉNÉRALES DU CONTRAT :
- Nom du Projet : ${projectName || "Non renseigné"}
- Raison Sociale / Client : ${clientName || "Non renseigné"}
- Ville : ${city || "Non renseigné"}
- Date d'effet : ${effectiveDate || "À la signature"}
- Durée du contrat : ${contractDuration || "3 ans"}
- Modèle de contrat sélectionné : Modèle ${contractModel ? contractModel.toUpperCase() : "RÉSIDENTIEL"}

FACTURATION & OPTIONS :
- Modalité de facturation : ${billingMethod || "Non spécifié"}
- Moyen de paiement : ${paymentMethod || "Virement bancaire"}
- TVA : ${tvaRate || 20}%
- Responsable Schindler : ${schindlerRep || "OUSSAMA OUBGHOUS"}
- Dépôt de factures : Dématerialisé (${invoiceDepot?.dematerialized ? "OUI" : "NON"}), Physique (+600 MAD) (${invoiceDepot?.physical ? "OUI" : "NON"})
- Options de dépannage : 24h/24 (+1 440 MAD) (${breakdownOptions?.h24 ? "OUI" : "NON"}), Intervention < 2h (+960 MAD) (${breakdownOptions?.under2h ? "OUI" : "NON"})

LISTE DES APPAREILS CONCERNÉS (${apparatusList?.length || 0} appareil(s)) :
${JSON.stringify(apparatusList || [], null, 2)}

VALEURS ET MONTANTS DU CONTRAT :
- Sous-total Appareils HT : ${totals?.subtotalApparatus || 0} MAD
- Suppléments / Options HT : ${totals?.optionsTotal || 0} MAD
- TOTAL HT ANNUEL : ${totals?.totalHT || 0} MAD
- TVA (${tvaRate || 20}%) : ${totals?.tvaAmount || 0} MAD
- TOTAL TTC ANNUEL : ${totals?.totalTTC || 0} MAD

Fournis d'abord une synthèse de cadrage avec le format d'expert TOOLBOX AI PRO :
🎯 OBJECTIF
📋 SYNTHÈSE EXÉCUTIVE DU CONTRAT
🔍 ANALYSE DE CONFORMITÉ & ENGAGEMENTS DE SERVICE
✅ RECOMMANDATION DE SIGNATURE ET VALIDATION CLIENT

Puis, fournis le document contractuel intégral prêt à signer sous un titre clair :
=== CONTRAT INTÉGRAL DE PRESTATION DE SERVICE ===
[Rédige l'intégralité du contrat avec préambule, désignation des parties, désignation des installations (tableau des appareils), obligations du prestataire Schindler, conditions financières, modalités de règlement, résiliation et règlement des litiges].`;
    } else {
      prompt = `Génère un document professionnel complet, prêt à l'emploi et juridiquement rigoureux de type : "${documentType}".
Titre / Objet : ${title || "Document standard"}
Parties prenantes : ${parties || "Non spécifié"}
Termes clés & Modalités : ${keyTerms || "Standards"}
Clauses spécifiques souhaitées : ${clauses || "Clauses habituelles de confidentialité, obligations, résiliation et compétence"}
Notes complémentaires : ${specificNotes || "Aucune"}

Fournis d'abord une synthèse de cadrage avec le format d'expert TOOLBOX AI PRO :
🎯 OBJECTIF
📋 SYNTHÈSE
🔍 ANALYSE DES RISQUES JURIDIQUES & OPÉRATIONNELS
✅ RECOMMANDATION DE SIGNATURE / MISE EN OEUVRE

Puis, fournis le document textuel intégral prêt à signer sous un titre clair :
=== DOCUMENT INTÉGRAL ===
[Rédige l'intégralité du texte formel avec articles numérotés, mentions légales, espaces de signature, sans abréviations, en français juridique d'excellence].`;
    }

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/generate-document:", error);
    res.status(500).json({ error: error?.message || "Erreur de génération documentaire." });
  }
});

// API Route to list quote text templates from /Texte pour Devis Type
app.get("/api/devis-templates/list", (_req, res) => {
  try {
    const baseDir = path.join(process.cwd(), "Texte pour Devis Type");
    if (!fs.existsSync(baseDir)) {
      return res.json({ categories: [] });
    }

    const items = fs.readdirSync(baseDir, { withFileTypes: true });
    const categories: { name: string; files: string[] }[] = [];
    const rootFiles: string[] = [];

    items.forEach((item) => {
      if (item.isDirectory()) {
        const subDirPath = path.join(baseDir, item.name);
        const subFiles = fs.readdirSync(subDirPath).filter(
          (f) => !f.startsWith(".") && (f.endsWith(".doc") || f.endsWith(".docx") || f.endsWith(".txt"))
        );
        categories.push({ name: item.name, files: subFiles });
      } else if (
        item.isFile() &&
        (item.name.endsWith(".doc") || item.name.endsWith(".docx") || item.name.endsWith(".txt"))
      ) {
        rootFiles.push(item.name);
      }
    });

    if (rootFiles.length > 0) {
      categories.unshift({ name: "Général / Entêtes & Décrets", files: rootFiles });
    }

    res.json({ categories });
  } catch (err: any) {
    console.error("Error listing devis templates:", err);
    res.status(500).json({ error: "Erreur lors de la lecture des modèles de devis." });
  }
});

// API Route to generate a specific Quote Text (Texte pour Devis Type)
app.post("/api/devis-templates/generate", async (req, res) => {
  try {
    const {
      category,
      templateFile,
      clientName,
      projectName,
      city,
      equipmentPfNumber,
      amountHT,
      executionDays,
      technicalDescription,
      notes,
    } = req.body;

    const baseDir = path.join(process.cwd(), "Texte pour Devis Type");
    let templateTextContent = "";

    if (category && templateFile) {
      let targetPath = path.join(
        baseDir,
        category === "Général / Entêtes & Décrets" ? "" : category,
        templateFile
      );
      if (!fs.existsSync(targetPath)) {
        // Fallback search
        const fallbackPath = path.join(baseDir, templateFile);
        if (fs.existsSync(fallbackPath)) targetPath = fallbackPath;
      }

      if (fs.existsSync(targetPath)) {
        if (targetPath.endsWith(".docx")) {
          try {
            const content = fs.readFileSync(targetPath);
            const zip = new PizZip(content);
            const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
            templateTextContent = doc.getFullText();
          } catch (e) {
            templateTextContent = fs.readFileSync(targetPath, "utf-8");
          }
        } else {
          // .doc or .txt file - read raw text or binary clean string
          const rawBuffer = fs.readFileSync(targetPath);
          templateTextContent = rawBuffer
            .toString("utf-8")
            .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, " ");
        }
      }
    }

    const ai = getGenAI();
    const prompt = `Génère un TEXTE DE DEVIS TYPE PROFESSIONNEL ET INTÉGRAL Schindler pour une offre de travaux / réparation / modernisation basée sur les modèles du dossier "Texte pour Devis Type".

RÉFÉRENCE DU MODÈLE SÉLECTIONNÉ :
- Catégorie : ${category || "Non spécifié"}
- Fichier Modèle : ${templateFile || "Standard"}
${templateTextContent ? `- Extraits / Contenu du modèle source : ${templateTextContent.slice(0, 3000)}` : ""}

INFORMATIONS PROJET & CLIENT :
- Client / Syndic : ${clientName || "Client"}
- Projet / Immeuble : ${projectName || "Bâtiment"}
- Ville : ${city || "Casablanca"}
- N° Appareil (PF) : ${equipmentPfNumber || "PF-78012"}
- Montant HT estimé : ${amountHT ? `${amountHT} MAD HT` : "Sur devis"}
- Délai d'exécution : ${executionDays || "15 jours ouvrés"}
- Spécifications techniques demandées : ${technicalDescription || "Incluses selon recommandations d'inspection"}
- Remarques particulières : ${notes || "Conforme aux exigences réglementaires et de sécurité"}

INSTRUCTIONS DE RÉDACTION DU DEVIS :
1. Rédige un document de devis complet, prêt à transmettre au client.
2. Structure le devis de manière irréprochable avec :
   - ENTÊTE DE COMMANDE & RÉFÉRENCES (Schindler Maroc, Date, Ref Devis, N° PF, Client, Adresse)
   - OBJET PRÉCIS DES TRAVAUX ET DÉSIGNATION DE L'INSTALLATION
   - SPÉCIFICATIONS TECHNIQUES DÉTAILLÉES DES FOURNITURES ET PRESTATIONS (basées sur le modèle choisi)
   - MODALITÉS D'EXÉCUTION ET DÉLAIS DE RÉALISATION
   - BORDEREAU DE PRIX HT & TTC (TVA 20%)
   - CONDITIONS DE GARANTIE, VALIDITÉ DE L'OFFRE (90 jours) ET BON POUR ACCORD CLIENT
3. Conserve la rigueur juridique et technique des devis Schindler.

Fournis d'abord une synthèse de cadrage avec le format d'expert TOOLBOX AI PRO :
🎯 OBJECTIF
📋 SYNTHÈSE DU DEVIS TYPE
🔍 SPECIFICATIONS TECHNIQUES & PRIX
✅ RECOMMANDATION COMMERCIALES & ACCORD CLIENT

Puis, fournis le document intégral sous le titre :
=== TEXTE DE DEVIS TYPE INTÉGRAL ===
[Contenu rédigé intégralement, sans coupures, prêt à copier/imprimer].`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/devis-templates/generate:", error);
    res.status(500).json({ error: error?.message || "Erreur lors de la génération du texte de devis." });
  }
});

// Specialized Stock Audit & Inventory Optimizer
app.post("/api/gemini/stock-audit", async (req, res) => {
  try {
    const { items, globalParams } = req.body;
    const ai = getGenAI();

    const prompt = `Effectue un audit opérationnel approfondi de gestion de stock et d'approvisionnement pour les références suivantes :
Paramètres globaux : ${JSON.stringify(globalParams || {})}
Données articles/stocks :
${JSON.stringify(items, null, 2)}

Tu dois impérativement analyser :
1. Disponibilité et risques immédiats de rupture (délais vs stock actuel vs consommation)
2. Surstockage et coût d'immobilisation financière
3. Taux de rotation estimé et classification ABC
4. Point de commande (ROP) et Stock de sécurité recommandé
5. Quantité économique de commande (Formule de Wilson / EOQ)

Structure ta réponse avec le format de sortie obligatoire TOOLBOX AI PRO (🎯 OBJECTIF, 📋 SYNTHÈSE, 🔍 ANALYSE avec tableau comparatif des références, ✅ RECOMMANDATION, 🛠 PLAN D'ACTION chiffré, ⚠️ POINTS DE VIGILANCE, 📈 IMPACT ATTENDU, ⭐ CONSEIL EXPERT).`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/stock-audit:", error);
    res.status(500).json({ error: error?.message || "Erreur lors de l'audit de stock." });
  }
});

// Specialized PF Park, 11 Inspection Visits + CPSI & 100-Day NC Audit
app.post("/api/gemini/pf-audit", async (req, res) => {
  try {
    const { equipments, filterSummary } = req.body;
    const ai = getGenAI();

    const prompt = `Tu es le Directeur des Opérations et Responsable Technique Réglementaire de TOOLBOX AI PRO.
Effectue un audit opérationnel rigoureux du Parc d'Équipements (PF) selon les règles de gestion suivantes :

RÈGLES DE GESTION APPLIQUÉES :
1. Chaque appareil doit obligatoirement réaliser 11 visites d'inspection périodiques par an (V1 à V11) + 1 douzième visite spécifique : la "Visite CPSI" (Contrôle Périodique de Sécurité des Installations).
2. Chaque appareil peut faire l'objet de Non-Conformités (NC).
3. RÈGLE IMPÉRATIVE ET CRITIQUE : Toute Non-Conformité (NC) doit être réglée et levée dans un DÉLAI STRICT ET ABSOLU DE MOINS DE 100 JOURS à compter de sa détection.

DONNÉES DU PARC PF (${equipments?.length || 0} appareils audités) :
${JSON.stringify(equipments, null, 2)}

Filtres / Périmètre : ${JSON.stringify(filterSummary || "Tous les équipements")}

MISSION D'AUDIT :
1. Calculer le taux d'avancement global des 11 visites d'inspection et le taux de réalisation de la 12ème visite CPSI.
2. Analyser les retards de visites et identifier les appareils à risque.
3. Auditer l'ensemble des Non-Conformités (NC) ouvertes, en calculant avec précision le nombre de jours écoulés et les jours restants avant l'échéance fatidique des 100 jours.
4. Dresser la liste d'alerte rouge des NC ayant dépassé 100 jours ou approchant du seuil critique (85-99 jours).
5. Évaluer la charge de travail et le niveau de performance par Technicien assigné et Responsable de Service.
6. Établir un plan de tournée optimisé et des recommandations d'arbitrage immédiates.

Respecte scrupuleusement le format obligatoire TOOLBOX AI PRO :
🎯 OBJECTIF
📋 SYNTHÈSE
🔍 ANALYSE (avec tableaux comparatifs synthétiques des visites, CPSI et matrice de criticité des NC avec compte à rebours 100 jours)
✅ RECOMMANDATION
🛠 PLAN D'ACTION (avec responsables, échéances précises et livrables)
⚠️ POINTS DE VIGILANCE (risques juridiques de responsabilité civile/pénale en cas de CPSI dépassé ou NC > 100 jours)
📈 IMPACT ATTENDU
⭐ CONSEIL EXPERT`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/pf-audit:", error);
    res.status(500).json({ error: error?.message || "Erreur lors de l'audit du parc PF." });
  }
});

// Specialized Data & Excel Analyzer
app.post("/api/gemini/analyze-data", async (req, res) => {
  try {
    const { datasetText, goal, headers } = req.body;
    const ai = getGenAI();

    const prompt = `Analyse les données suivantes fournies par l'utilisateur :
Objectif d'analyse spécifié : ${goal || "Diagnostic complet de performance et détection d'anomalies"}
Colonnes : ${headers ? JSON.stringify(headers) : "Détecter automatiquement"}
Extrait des données :
${datasetText}

Effectue une analyse exhaustive :
- Tendances observées
- Anomalies, écarts et valeurs aberrantes
- Risques opérationnels et de gestion
- Opportunités de gain ou d'optimisation
- Recommandations stratégiques et opérationnelles

Respecte scrupuleusement la structure TOOLBOX AI PRO (🎯 OBJECTIF, 📋 SYNTHÈSE, 🔍 ANALYSE avec tableau de KPI de synthèse, ✅ RECOMMANDATION, 🛠 PLAN D'ACTION, ⚠️ POINTS DE VIGILANCE, 📈 IMPACT ATTENDU, ⭐ CONSEIL EXPERT).`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.3,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/analyze-data:", error);
    res.status(500).json({ error: error?.message || "Erreur d'analyse de données." });
  }
});

// Specialized CPSI PV / Inspection Report Analyzer & Renamer
app.post("/api/gemini/cpsi-pv-analyzer", async (req, res) => {
  try {
    const { files, knownEquipments } = req.body;
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Aucun fichier fourni pour l'analyse." });
    }

    const ai = getGenAI();

    const equipmentsListSummary = (knownEquipments || []).map((e: any) => ({
      id: e.id,
      pfNumber: e.pfNumber,
      name: e.name,
      city: e.city,
      address: e.street,
      technician: e.assignedTechnician,
    }));

    // Process files
    const fileAnalysisPromises = files.map(async (file: { name: string; type?: string; base64?: string; textContent?: string }) => {
      try {
        const parts: any[] = [];

        if (file.base64 && file.type) {
          // If valid mime type for Gemini multimodal
          const isSupportedMime = file.type.startsWith("image/") || file.type === "application/pdf";
          if (isSupportedMime) {
            parts.push({
              inlineData: {
                mimeType: file.type,
                data: file.base64,
              },
            });
          }
        }

        const promptText = `Tu es l'Expert Réglementaire & Contrôleur de Sécurité des Ascenseurs et Installations de Transport Vertical.
Tu dois analyser ce document / PV de visite réglementaire CPSI (Contrôle Périodique de Sécurité des Installations / Inspection Quinquennale ou Annuelle).

Nom original du fichier : "${file.name}"
${file.textContent ? `Contenu texte extrait du fichier :\n${file.textContent.slice(0, 5000)}` : ""}

LISTE DES APPAREILS CONNUS DANS LE PARC :
${JSON.stringify(equipmentsListSummary, null, 2)}

TES MISSIONS :
1. Détecter le NUMÉRO D'APPAREIL (N° PF, code appareil, ex: "PF-78012", "PF-91304", "78012", "88888", etc.) mentionné dans le document ou déductible du nom du fichier ou du site/adresse.
2. Détecter la DATE RÉELLE DE L'INSPECTION / DU CONTRÔLE CPSI (au format ISO "YYYY-MM-DD", ex: "2026-08-15" ou "2026-07-22"). Si seule une date récente est mentionnée sans année explicite, déduire l'année 2026.
3. Détecter l'ORGANISME DE CONTRÔLE / BUREAU D'INSPECTION (ex: Apave, Bureau Veritas, Dekra, Socotec, Norisko, SGS, etc.).
4. Détecter l'INSPECTEUR / TECHNICIEN si présent.
5. Détecter l'AVIS / RÉSULTAT DU CPSI ("Favorable / Conforme", "Avec réserves", "Défavorable").
6. Extraire les OBSERVATIONS CLÉS ou éventuelles Non-Conformités (NC).
7. Trouver l'appareil correspondant dans la liste des appareils connus (ID et N° PF exacts).
8. Générer le NOUVEAU NOM DE FICHIER NORMALISÉ sous la forme stricte :
   "PV_CPSI_[N_PF]_[DATE_INSPECTION].[extension_originale]"
   Exemple : "PV_CPSI_PF-78012_2026-08-20.pdf" (conserve la même extension que le fichier d'origine).

RÉPONDS EXCLUSIVEMENT AVEC UN OBJET JSON STRICT respectant ce format :
{
  "originalFileName": "${file.name}",
  "detectedPfNumber": "PF-XXXXX",
  "matchedEquipmentId": "eq-id-si-trouvé-sinon-null",
  "matchedEquipmentName": "Nom de l'appareil correspondant",
  "inspectionDate": "YYYY-MM-DD",
  "bureauControle": "Nom de l'organisme",
  "inspectorName": "Nom de l'inspecteur",
  "conformityResult": "Favorable / Conforme" | "Avec réserves" | "Défavorable",
  "summaryObservations": "Synthèse des remarques et points vérifiés",
  "detectedNonConformities": [
    { "description": "Description de l'anomalie", "severity": "Majeure" | "Moyenne" | "Critique" }
  ],
  "suggestedFileName": "PV_CPSI_PF-XXXXX_YYYY-MM-DD.ext",
  "confidenceScore": 95
}`;

        parts.push({ text: promptText });

        const response = await generateContentWithRetry(ai, {
          model: "gemini-3.7-flash",
          contents: [{ role: "user", parts }],
          config: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        });

        const rawText = response.text || "{}";
        let parsed: any = {};
        try {
          parsed = JSON.parse(rawText);
        } catch (err) {
          // fallback extraction
          const matchJson = rawText.match(/\{[\s\S]*\}/);
          if (matchJson) {
            parsed = JSON.parse(matchJson[0]);
          }
        }

        // Ensure extension is preserved
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".pdf";
        const cleanPf = parsed.detectedPfNumber || "PF-INCONNU";
        const cleanDate = parsed.inspectionDate || new Date().toISOString().slice(0, 10);
        const suggestedName = `PV_CPSI_${cleanPf.replace(/[^a-zA-Z0-9-_]/g, "")}_${cleanDate}${ext}`;

        return {
          originalFileName: file.name,
          detectedPfNumber: parsed.detectedPfNumber || "",
          matchedEquipmentId: parsed.matchedEquipmentId || null,
          matchedEquipmentName: parsed.matchedEquipmentName || "",
          inspectionDate: parsed.inspectionDate || new Date().toISOString().slice(0, 10),
          bureauControle: parsed.bureauControle || "Bureau de Contrôle Agréé",
          inspectorName: parsed.inspectorName || "Inspecteur Qualifié",
          conformityResult: parsed.conformityResult || "Favorable / Conforme",
          summaryObservations: parsed.summaryObservations || "Contrôle réglementaire périodique de sécurité des installations.",
          detectedNonConformities: Array.isArray(parsed.detectedNonConformities) ? parsed.detectedNonConformities : [],
          suggestedFileName: parsed.suggestedFileName || suggestedName,
          confidenceScore: parsed.confidenceScore || 90,
          status: "success",
        };
      } catch (err: any) {
        console.warn(`Fallback heuristic parsing for file ${file.name}:`, err?.message || err);
        // Fallback heuristic extraction based on filename
        const pfMatch = file.name.match(/PF[-_]?\d{3,6}/i);
        const genericNumMatch = file.name.match(/\d{3,6}/);
        const dateMatch = file.name.match(/202[4-7][-_\.](0[1-9]|1[0-2])[-_\.](0[1-9]|[12]\d|3[01])/);
        
        let detectedPf = "PF-INCONNU";
        if (pfMatch) {
          detectedPf = pfMatch[0].toUpperCase().replace("_", "-");
        } else if (genericNumMatch) {
          detectedPf = `PF-${genericNumMatch[0]}`;
        }

        const detectedDate = dateMatch ? dateMatch[0].replace(/[_\.]/g, "-") : new Date().toISOString().slice(0, 10);
        const ext = file.name.includes(".") ? file.name.slice(file.name.lastIndexOf(".")) : ".pdf";

        // Try matching in known equipment
        const matched = (knownEquipments || []).find((e: any) =>
          e.pfNumber.toLowerCase() === detectedPf.toLowerCase() ||
          file.name.toLowerCase().includes(e.pfNumber.toLowerCase()) ||
          (genericNumMatch && e.pfNumber.includes(genericNumMatch[0]))
        );

        const finalPf = matched ? matched.pfNumber : detectedPf;

        return {
          originalFileName: file.name,
          detectedPfNumber: finalPf,
          matchedEquipmentId: matched ? matched.id : null,
          matchedEquipmentName: matched ? matched.name : "Appareil détecté",
          inspectionDate: detectedDate,
          bureauControle: "Organisme de Contrôle CPSI",
          inspectorName: "Inspecteur Agréé",
          conformityResult: "Favorable / Conforme",
          summaryObservations: "Rapport de visite CPSI importé et analysé automatiquement.",
          detectedNonConformities: [],
          suggestedFileName: `PV_CPSI_${finalPf.replace(/[^a-zA-Z0-9-_]/g, "")}_${detectedDate}${ext}`,
          confidenceScore: matched ? 85 : 60,
          status: "fallback",
        };
      }
    });

    const results = await Promise.all(fileAnalysisPromises);

    res.json({ results });
  } catch (error: any) {
    console.error("Error in /api/gemini/cpsi-pv-analyzer:", error);
    res.status(500).json({ error: error?.message || "Erreur lors de l'analyse des rapports CPSI." });
  }
});

// Specialized Excel & VBA Formula Engineer
app.post("/api/gemini/excel-expert", async (req, res) => {
  try {
    const { needDescription, software, currentFormula, dataSample } = req.body;
    const ai = getGenAI();

    const prompt = `Tu es l'Expert Excel et Reporting de TOOLBOX AI PRO.
Besoin / Problème formulé : ${needDescription}
Logiciel cible : ${software || "Excel 365 / Google Sheets (Français et Anglais)"}
Formule actuelle (si existante) : ${currentFormula || "Aucune"}
Échantillon de données / Colonnes : ${dataSample || "Standard"}

Fournis :
1. La formule exacte en version française (ex: RECHERCHEX, INDEX/EQUIV, SOMME.SI.ENS, LET, LAMBDA) et en version anglaise (XLOOKUP, INDEX/MATCH, SUMIFS, LET, LAMBDA).
2. L'explication pas-à-pas de chaque argument.
3. Le code VBA / Macro ou Power Query M si pertinent pour automatiser.
4. Les précautions d'emploi (gestion des erreurs avec SIERREUR, formatage des cellules, performances).
5. La structure TOOLBOX AI PRO complète (🎯 OBJECTIF, 📋 SYNTHÈSE, 🔍 ANALYSE TECHNIQUE, ✅ FORMULE RECOMMANDEE, 🛠 PLAN DE MISE EN OEUVRE, ⚠️ POINTS DE VIGILANCE, 📈 IMPACT ATTENDU, ⭐ CONSEIL EXPERT EXCEL).`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.2,
      },
    });

    res.json({ text: response.text });
  } catch (error: any) {
    console.error("Error in /api/gemini/excel-expert:", error);
    res.status(500).json({ error: error?.message || "Erreur de l'expert Excel." });
  }
});

async function startServer() {
  let viteMiddleware: any = null;

  app.use((req, res, next) => {
    if (viteMiddleware) {
      return viteMiddleware(req, res, next);
    }
    next();
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TOOLBOX AI PRO Server running on http://0.0.0.0:${PORT}`);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    viteMiddleware = vite.middlewares;
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
}

startServer();
