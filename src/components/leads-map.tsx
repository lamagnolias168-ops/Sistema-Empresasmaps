"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Crosshair, X } from "lucide-react";
import type { Lead } from "@/types/lead";
import { Skeleton } from "@/components/ui/skeleton";

const LeadsMapInner = dynamic(() => import("@/components/leads-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

interface LeadsMapProps {
  leads: Lead[];
  onBrushSelect: (leads: Lead[]) => void;
  brushSelectedIds: Set<string>;
}

export function LeadsMap({ leads, onBrushSelect, brushSelectedIds }: LeadsMapProps) {
  const [brushMode, setBrushMode] = useState(false);

  function handleBrushSelect(selected: Lead[]) {
    onBrushSelect(selected);
    setBrushMode(false);
  }

  function cancelBrush() {
    setBrushMode(false);
    onBrushSelect([]);
  }

  return (
    // isolation: isolate crea un nuevo stacking context que contiene
    // los z-index internos de Leaflet (~400) sin que escalen al documento
    <div className="relative h-150 overflow-hidden rounded-xl border border-[#e7eae9] shadow-[0_1px_2px_rgba(24,33,31,0.05)] isolate">
      <LeadsMapInner
        leads={leads}
        brushMode={brushMode}
        selectedIds={brushSelectedIds}
        onBrushSelect={handleBrushSelect}
      />

      {/* Brush toolbar — top-right corner, above Leaflet z-index */}
      <div className="absolute right-3 top-3 z-1000 flex gap-1.5">
        {brushMode ? (
          <>
            <div className="flex items-center gap-1.5 rounded-lg border border-teal-200 bg-teal-600 px-3 py-1.5 text-xs font-medium text-white shadow-md">
              <Crosshair className="h-3.5 w-3.5 animate-pulse" />
              Arrastra para seleccionar
            </div>
            <button
              onClick={cancelBrush}
              title="Cancelar"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e7eae9] bg-white text-gray-500 shadow-md transition-colors hover:bg-gray-50 active:scale-[0.97]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <button
            onClick={() => setBrushMode(true)}
            title="Seleccionar empresas en el mapa"
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium shadow-md transition-colors active:scale-[0.97] ${
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
  );
}
