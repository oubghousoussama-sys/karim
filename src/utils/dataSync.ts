export interface FullAppBackup {
  version: string;
  exportedAt: string;
  data: {
    pfEquipments?: any[];
    archivedPfEquipments?: any[];
    quotes?: any[];
    partsCatalog?: any[];
    stockItems?: any[];
    regieRequests?: any[];
    chatHistory?: any[];
  };
}

const STORAGE_KEYS = {
  pfEquipments: ["toolbox_pf_equipments", "toolbox_pf_equipments_v1"],
  archivedPfEquipments: ["toolbox_pf_archived_equipments"],
  quotes: ["toolbox_quotes_v3"],
  partsCatalog: ["toolbox_parts_v1"],
  stockItems: ["toolbox_stock_items_v2"],
  regieRequests: ["toolbox_regie_requests_v1"],
  chatHistory: ["toolbox_chat_history"],
};

export function exportFullAppData(): FullAppBackup {
  const getJson = (keys: string[]) => {
    for (const key of keys) {
      const item = localStorage.getItem(key);
      if (item) {
        try {
          return JSON.parse(item);
        } catch (e) {
          console.error("Error parsing key", key, e);
        }
      }
    }
    return null;
  };

  return {
    version: "2026.1",
    exportedAt: new Date().toISOString(),
    data: {
      pfEquipments: getJson(STORAGE_KEYS.pfEquipments),
      archivedPfEquipments: getJson(STORAGE_KEYS.archivedPfEquipments),
      quotes: getJson(STORAGE_KEYS.quotes),
      partsCatalog: getJson(STORAGE_KEYS.partsCatalog),
      stockItems: getJson(STORAGE_KEYS.stockItems),
      regieRequests: getJson(STORAGE_KEYS.regieRequests),
      chatHistory: getJson(STORAGE_KEYS.chatHistory),
    },
  };
}

export function importFullAppData(backup: FullAppBackup): { success: boolean; counts: Record<string, number> } {
  if (!backup || !backup.data) {
    throw new Error("Format de sauvegarde invalide.");
  }

  const counts: Record<string, number> = {};

  if (Array.isArray(backup.data.pfEquipments)) {
    localStorage.setItem("toolbox_pf_equipments", JSON.stringify(backup.data.pfEquipments));
    localStorage.setItem("toolbox_pf_equipments_v1", JSON.stringify(backup.data.pfEquipments));
    counts["Équipements Parc PF"] = backup.data.pfEquipments.length;
  }

  if (Array.isArray(backup.data.archivedPfEquipments)) {
    localStorage.setItem("toolbox_pf_archived_equipments", JSON.stringify(backup.data.archivedPfEquipments));
    counts["Appareils Hors Garantie / Résiliés"] = backup.data.archivedPfEquipments.length;
  }

  if (Array.isArray(backup.data.quotes)) {
    localStorage.setItem("toolbox_quotes_v3", JSON.stringify(backup.data.quotes));
    counts["Devis Chiffrés"] = backup.data.quotes.length;
  }

  if (Array.isArray(backup.data.partsCatalog)) {
    localStorage.setItem("toolbox_parts_v1", JSON.stringify(backup.data.partsCatalog));
    counts["Catalogue Pièces"] = backup.data.partsCatalog.length;
  }

  if (Array.isArray(backup.data.stockItems)) {
    localStorage.setItem("toolbox_stock_items_v2", JSON.stringify(backup.data.stockItems));
    counts["Articles de Stock"] = backup.data.stockItems.length;
  }

  if (Array.isArray(backup.data.regieRequests)) {
    localStorage.setItem("toolbox_regie_requests_v1", JSON.stringify(backup.data.regieRequests));
    counts["Fiches de Régie"] = backup.data.regieRequests.length;
  }

  if (Array.isArray(backup.data.chatHistory)) {
    localStorage.setItem("toolbox_chat_history", JSON.stringify(backup.data.chatHistory));
    counts["Messages Historique"] = backup.data.chatHistory.length;
  }

  return { success: true, counts };
}

export function downloadBackupFile() {
  const data = exportFullAppData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `toolbox_backup_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
