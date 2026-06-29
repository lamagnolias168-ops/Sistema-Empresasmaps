"use client";

import dynamic from "next/dynamic";
import type { Lead } from "@/types/lead";
import { Skeleton } from "@/components/ui/skeleton";

const LeadsMapInner = dynamic(() => import("@/components/leads-map-inner"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-xl" />,
});

interface LeadsMapProps {
  leads: Lead[];
}

export function LeadsMap({ leads }: LeadsMapProps) {
  return (
    // isolation: isolate crea un nuevo stacking context que contiene
    // los z-index internos de Leaflet (~400) sin que escalen al documento
    <div className="h-[600px] overflow-hidden rounded-xl border border-[#e7eae9] shadow-[0_1px_2px_rgba(24,33,31,0.05)] isolate">
      <LeadsMapInner leads={leads} />
    </div>
  );
}
