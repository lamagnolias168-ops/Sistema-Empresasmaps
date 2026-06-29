"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence } from "motion/react";
import { Crosshair, X, MapPin } from "lucide-react";
import type { Lead } from "@/types/lead";
import { fetchLeads } from "@/lib/supabase";
import { leadsWithCoordinates } from "@/lib/leads-utils";
import { BrushResultPanel } from "@/components/brush-result-panel";
import { LeadDetailPanel } from "@/components/lead-detail-panel";

const LeadsMapInner = dynamic(() => import("@/components/leads-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse rounded-xl bg-gray-100" />
  ),
});

export function MapaView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [brushMode, setBrushMode] = useState(false);
  const [brushSelection, setBrushSelection] = useState<Lead[] | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const mapLeads = useMemo(() => leadsWithCoordinates(leads), [leads]);
  const brushSelectedIds = useMemo(
    () => new Set(brushSelection?.map((l) => l.id) ?? []),
    [brushSelection]
  );

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .finally(() => setIsLoading(false));
  }, []);

  function handleBrushSelect(selected: Lead[]) {
    setBrushSelection(selected.length ? selected : null);
    setBrushMode(false);
  }

  function cancelBrush() {
    setBrushMode(false);
    setBrushSelection(null);
  }

  function handleLeadUpdate(id: string, fields: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)));
    setSelectedLead((prev) => (prev?.id === id ? { ...prev, ...fields } : prev));
  }

  return (
    <div className="flex h-full flex-col">
      {/* Slim header */}
      <div className="flex shrink-0 items-center justify-between border-b border-[#e7eae9] bg-white px-6 py-4">
        <div className="flex items-center gap-2.5">
          <MapPin className="h-5 w-5 text-teal-600" />
          <div>
            <h1 className="text-base font-semibold text-gray-900">Mapa inteligente</h1>
            {!isLoading && (
              <p className="text-xs text-gray-400">
                {mapLeads.length} empresas con coordenadas
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Map + panel */}
      <div className="relative flex flex-1 overflow-hidden">
        {/* Map */}
        <div className={`relative flex-1 ${brushMode ? "cursor-crosshair" : ""}`}>
          {!isLoading && (
            <LeadsMapInner
              leads={mapLeads}
              brushMode={brushMode}
              selectedIds={brushSelectedIds}
              onBrushSelect={handleBrushSelect}
            />
          )}

          {/* Brush toolbar */}
          <div className="absolute right-4 top-4 z-1000 flex gap-1.5">
            {brushMode ? (
              <>
                <div className="flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-600 px-3 py-2 text-xs font-medium text-white shadow-lg">
                  <Crosshair className="h-3.5 w-3.5 animate-pulse" />
                  Arrastra para seleccionar
                </div>
                <button
                  onClick={cancelBrush}
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#e7eae9] bg-white text-gray-500 shadow-lg transition-colors hover:bg-gray-50 active:scale-[0.97]"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setBrushMode(true)}
                className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-medium shadow-lg transition-colors active:scale-[0.97] ${
                  brushSelectedIds.size > 0
                    ? "border-teal-300 bg-teal-600 text-white hover:bg-teal-700"
                    : "border-[#e7eae9] bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                <Crosshair className="h-3.5 w-3.5" />
                {brushSelectedIds.size > 0
                  ? `${brushSelectedIds.size} seleccionadas`
                  : "Seleccionar área"}
              </button>
            )}
          </div>
        </div>

        {/* Brush result panel */}
        <AnimatePresence>
          {brushSelection && brushSelection.length > 0 && (
            <div className="shrink-0 overflow-hidden p-3">
              <BrushResultPanel
                key="brush-panel"
                leads={brushSelection}
                onClose={() => setBrushSelection(null)}
                onSelectLead={setSelectedLead}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Lead detail panel */}
      <AnimatePresence>
        {selectedLead && (
          <LeadDetailPanel
            key={selectedLead.id}
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onLeadUpdate={handleLeadUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
