"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import type { LeadKpis } from "@/lib/leads-utils";

interface KpiCardProps {
  label: string;
  value: number | null;
  decimals?: number;
  accent?: "default" | "alto" | "medio" | "bajo";
  index?: number;
}

const ACCENT_CLASSES: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  default: "text-gray-900",
  alto: "text-emerald-600",
  medio: "text-amber-600",
  bajo: "text-gray-500",
};

// Conteo que sube hasta el valor final al cargar (delight de una sola vez).
function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => (reduce ? value.toFixed(decimals) : "0"));

  useEffect(() => {
    if (reduce) {
      setDisplay(value.toFixed(decimals));
      return;
    }
    const controls = animate(mv, value, { duration: 0.8, ease: [0.23, 1, 0.32, 1] });
    const unsub = mv.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return () => {
      controls.stop();
      unsub();
    };
  }, [value, decimals, reduce, mv]);

  return <span className="tabular-nums">{display}</span>;
}

function KpiCard({ label, value, decimals = 0, accent = "default", index = 0 }: KpiCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.14, delay: reduce ? 0 : index * 0.05 }}
    >
      <div className="card-lift rounded-xl border border-[#e7eae9] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(24,33,31,0.05)]">
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <p className={`mt-1.5 text-2xl font-semibold tabular-nums ${ACCENT_CLASSES[accent]}`}>
          {value === null ? "—" : <AnimatedNumber value={value} decimals={decimals} />}
        </p>
      </div>
    </motion.div>
  );
}

interface KpiRowProps {
  kpis: LeadKpis;
}

export function KpiRow({ kpis }: KpiRowProps) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      <KpiCard label="Total de prospectos" value={kpis.total} index={0} />
      <KpiCard label="Tier alto" value={kpis.alto} accent="alto" index={1} />
      <KpiCard label="Tier medio" value={kpis.medio} accent="medio" index={2} />
      <KpiCard label="Puntaje promedio" value={kpis.promedio} decimals={1} index={3} />
      <KpiCard label="Por contactar" value={kpis.porContactar} index={4} />
    </div>
  );
}
