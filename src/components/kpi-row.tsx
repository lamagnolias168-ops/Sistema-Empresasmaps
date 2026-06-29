"use client";

import { useEffect, useState } from "react";
import { animate, motion, useMotionValue, useReducedMotion } from "motion/react";
import { Users, Star, TrendingUp, BarChart2, Phone } from "lucide-react";
import type { LeadKpis } from "@/lib/leads-utils";

// ── Contador animado ──────────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(() => (reduce ? value.toFixed(decimals) : "0"));

  useEffect(() => {
    if (reduce) { setDisplay(value.toFixed(decimals)); return; }
    const controls = animate(mv, value, { duration: 0.9, ease: [0.23, 1, 0.32, 1] });
    const unsub = mv.on("change", (v) => setDisplay(v.toFixed(decimals)));
    return () => { controls.stop(); unsub(); };
  }, [value, decimals, reduce, mv]);

  return <span className="tabular-nums">{display}</span>;
}

// ── KPI Card ──────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number | null;
  decimals?: number;
  sub?: string;
  icon: React.ElementType;
  accentClass: string;   // border color
  valueClass: string;    // número color
  iconBg: string;
  index?: number;
}

function KpiCard({
  label, value, decimals = 0, sub, icon: Icon,
  accentClass, valueClass, iconBg, index = 0,
}: KpiCardProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 28, delay: reduce ? 0 : index * 0.06 }}
    >
      <div className={`relative overflow-hidden rounded-2xl border border-[#e7eae9] bg-white px-5 py-4 shadow-[0_1px_3px_rgba(24,33,31,0.07)] transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(24,33,31,0.10)]`}>
        {/* Accent top bar */}
        <div className={`absolute inset-x-0 top-0 h-0.5 ${accentClass}`} />

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-medium text-gray-500 leading-none">{label}</p>
            <p className={`mt-2.5 text-[1.75rem] font-bold leading-none tracking-tight ${valueClass}`}>
              {value === null ? "—" : <AnimatedNumber value={value} decimals={decimals} />}
            </p>
            {sub && (
              <p className="mt-1.5 text-[11px] text-gray-400 leading-none">{sub}</p>
            )}
          </div>
          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ── KPI Row ───────────────────────────────────────────────────────────────────

export function KpiRow({ kpis }: { kpis: LeadKpis }) {
  const cards: KpiCardProps[] = [
    {
      label: "Total prospectos",
      value: kpis.total,
      icon: Users,
      accentClass: "bg-gradient-to-r from-teal-500 to-teal-400",
      valueClass: "text-[#1c2b2b]",
      iconBg: "bg-teal-50 text-teal-600",
      sub: "en pipeline activo",
    },
    {
      label: "Tier alto",
      value: kpis.alto,
      icon: Star,
      accentClass: "bg-gradient-to-r from-emerald-500 to-emerald-400",
      valueClass: "text-emerald-600",
      iconBg: "bg-emerald-50 text-emerald-600",
      sub: "prioridad máxima",
    },
    {
      label: "Tier medio",
      value: kpis.medio,
      icon: TrendingUp,
      accentClass: "bg-gradient-to-r from-amber-500 to-amber-400",
      valueClass: "text-amber-600",
      iconBg: "bg-amber-50 text-amber-600",
      sub: "en desarrollo",
    },
    {
      label: "Puntaje promedio",
      value: kpis.promedio,
      decimals: 1,
      icon: BarChart2,
      accentClass: "bg-gradient-to-r from-indigo-500 to-indigo-400",
      valueClass: "text-indigo-600",
      iconBg: "bg-indigo-50 text-indigo-600",
      sub: "sobre 100 puntos",
    },
    {
      label: "Por contactar",
      value: kpis.porContactar,
      icon: Phone,
      accentClass: "bg-gradient-to-r from-orange-500 to-orange-400",
      valueClass: "text-orange-600",
      iconBg: "bg-orange-50 text-orange-600",
      sub: "acción inmediata",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {cards.map((card, i) => (
        <KpiCard key={card.label} {...card} index={i} />
      ))}
    </div>
  );
}
