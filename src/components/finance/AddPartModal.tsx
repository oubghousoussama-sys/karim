import React, { useState } from "react";
import { MaintenancePartConsumption, PartStatus, PFEquipment } from "../../types";
import { Wrench, Package, Plus, Check } from "lucide-react";

interface AddPartModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (part: MaintenancePartConsumption) => void;
  equipments: PFEquipment[];
  initialPart?: MaintenancePartConsumption | null;
}

export const AddPartModal: React.FC<AddPartModalProps> = ({
  isOpen,
  onClose,
  onSave,
  equipments,
  initialPart,
}) => {
  const [reference, setReference] = useState(
    initialPart?.reference || `REF-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [designation, setDesignation] = useState(initialPart?.designation || "");
  const [pfNumber, setPfNumber] = useState(initialPart?.pfNumber || equipments[0]?.pfNumber || "PF-78012");
  const [clientName, setClientName] = useState(initialPart?.clientName || "");
  const [quantity, setQuantity] = useState(initialPart?.quantity || 1);
  const [unitCostHT, setUnitCostHT] = useState(initialPart?.unitCostHT || 150);
  const [sellingPriceHT, setSellingPriceHT] = useState(initialPart?.sellingPriceHT || 300);
  const [supplier, setSupplier] = useState(initialPart?.supplier || "Schindler Parts & Components");
  const [orderDate, setOrderDate] = useState(initialPart?.orderDate || "2026-09-01");
  const [deliveryDate, setDeliveryDate] = useState(initialPart?.deliveryDate || "");
  const [installationDate, setInstallationDate] = useState(initialPart?.installationDate || "");
  const [status, setStatus] = useState<PartStatus>(initialPart?.status || "Commandée");
  const [technician, setTechnician] = useState(initialPart?.technician || "Karim Bennani");
  const [notes, setNotes] = useState(initialPart?.notes || "");

  if (!isOpen) return null;

  const totalCostHT = quantity * unitCostHT;
  const totalSellingHT = (sellingPriceHT || 0) * quantity;
  const marginHT = totalSellingHT - totalCostHT;
  const marginPct = totalSellingHT > 0 ? (marginHT / totalSellingHT) * 100 : 0;

  const handlePfChange = (selectedPf: string) => {
    setPfNumber(selectedPf);
    const eq = equipments.find((e) => e.pfNumber === selectedPf);
    if (eq) {
      setClientName(eq.name);
      setTechnician(eq.assignedTechnician);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reference || !designation || !pfNumber || quantity <= 0) return;

    const newPart: MaintenancePartConsumption = {
      id: initialPart?.id || `part-${Date.now()}`,
      reference,
      designation,
      pfNumber,
      clientName: clientName || undefined,
      quantity,
      unitCostHT,
      totalCostHT,
      sellingPriceHT: sellingPriceHT || undefined,
      orderDate,
      deliveryDate: deliveryDate || undefined,
      installationDate: installationDate || undefined,
      supplier,
      status,
      technician,
      notes: notes || undefined,
    };

    onSave(newPart);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-5 overflow-hidden">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fade-in text-xs">
        {/* Fixed Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 sm:p-5 shrink-0 bg-slate-900">
          <div className="flex items-center gap-2">
            <Wrench className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-100">
              {initialPart ? "Modifier la Pièce de Rechange" : "Commander / Consommer une Pièce de Rechange"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 text-sm cursor-pointer p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Scrollable Form Body */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Référence Pièce / SKU *</label>
              <input
                type="text"
                required
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="ex: REF-GAL-150VT"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-amber-400 font-mono font-semibold"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Appareil PF Destinataire *</label>
              <select
                required
                value={pfNumber}
                onChange={(e) => handlePfChange(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-blue-400 font-mono font-semibold"
              >
                {equipments.map((eq) => (
                  <option key={eq.id} value={eq.pfNumber}>
                    {eq.pfNumber} - {eq.name.slice(0, 26)}...
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Désignation & Caractéristiques *</label>
            <input
              type="text"
              required
              value={designation}
              onChange={(e) => setDesignation(e.target.value)}
              placeholder="ex: Jeu de 4 galets de guidage haute résistance 150mm"
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <label className="block text-slate-400 mb-1">Quantité *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 1)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Coût Achat HT (MAD)</label>
              <input
                type="number"
                min="0"
                step="10"
                required
                value={unitCostHT}
                onChange={(e) => setUnitCostHT(Number(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-rose-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Prix Vente HT (MAD)</label>
              <input
                type="number"
                min="0"
                step="10"
                value={sellingPriceHT}
                onChange={(e) => setSellingPriceHT(Number(e.target.value) || 0)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-emerald-400 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-400 mb-1">Statut Pièce</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as PartStatus)}
                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-slate-200"
              >
                <option value="Commandée">Commandée</option>
                <option value="Reçue en stock">Reçue en stock</option>
                <option value="Consommée / Installée">Consommée / Installée</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] px-1 text-slate-400">
            <span>Coût total HT engagé : <strong className="text-rose-400 font-mono">{totalCostHT.toLocaleString("fr-FR")} MAD</strong></span>
            <span>Marge refacturation : <strong className="text-emerald-400 font-mono">{marginHT.toLocaleString("fr-FR")} MAD ({marginPct.toFixed(1)} %)</strong></span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-medium mb-1">Fournisseur / Fabricant</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="ex: Schindler, Otis, Parker, DMG..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Technicien Référent</label>
              <input
                type="text"
                value={technician}
                onChange={(e) => setTechnician(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Date Commande</label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-300 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Date Réception Stock</label>
              <input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-300 font-mono text-xs"
              />
            </div>

            <div>
              <label className="block text-slate-400 text-[10px] mb-1">Date Pose / Pose</label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded p-1.5 text-slate-300 font-mono text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-medium mb-1">Notes d'intervention / Motif</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: Pièce nécessaire pour lever la NC-2026-084 avant le 15/09..."
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-slate-200"
            />
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-950/95 border-t border-slate-800 shrink-0 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
          >
            Annuler
          </button>
          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 cursor-pointer"
          >
            {initialPart ? "Enregistrer les Modifications" : "Enregistrer la Pièce"}
          </button>
        </div>
        </form>
      </div>
    </div>
  );
};
