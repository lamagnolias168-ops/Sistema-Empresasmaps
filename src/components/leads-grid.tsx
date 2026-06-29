"use client";

import { AnimatePresence, motion } from "motion/react";
import type { Lead } from "@/types/lead";
import { LeadCard } from "@/components/lead-card";

interface LeadsGridProps {
  leads: Lead[];
  onVerDetalle: (lead: Lead) => void;
}

export function LeadsGrid({ leads, onVerDetalle }: LeadsGridProps) {
  if (leads.length === 0) {
    return (
      <div className="rise-in flex h-48 items-center justify-center rounded-xl border border-dashed border-[#d8dddb] text-sm text-gray-400">
        No hay prospectos que coincidan con los filtros.
      </div>
    );
  }

  return (
    <motion.div layout className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <AnimatePresence mode="popLayout">
        {leads.map((lead, i) => (
          <LeadCard key={lead.id} lead={lead} index={i} onVerDetalle={onVerDetalle} />
        ))}
      </AnimatePresence>
    </motion.div>
  );
}
