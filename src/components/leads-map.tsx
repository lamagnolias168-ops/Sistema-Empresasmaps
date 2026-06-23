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
    <div className="h-[600px] overflow-hidden rounded-xl border border-gray-200 shadow-sm">
      <LeadsMapInner leads={leads} />
    </div>
  );
}
