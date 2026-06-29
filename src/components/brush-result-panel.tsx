"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, ChevronDown, Star, MapPin, BarChart2, Users, Phone } from "lucide-react";
import type { Lead } from "@/types/lead";

interface BrushResultPanelProps {
  leads: Lead[];
  onClose: () => void;
  onSelectLead: (lead: Lead) => void;
}

function starCount(rating: number | null): number {
  if (!rating) return 0;
  return Math.round(rating);
}

function tierColor(tier: string | null): string {
  if (!tier) return "bg-gray-100 text-gray-500";
  const t = tier.toLowerCase();
  if (t === "alto") return "bg-emerald-100 text-emerald-700";
  if (t === "medio") return "bg-amber-100 text-amber-700";
  if (t === "bajo") return "bg-rose-100 text-rose-700";
  return "bg-gray-100 text-gray-500";
}

function mostCommon<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  const counts = new Map<T, number>();
  for (const v of arr) counts.set(v, (counts.get(v) ?? 0) + 1);
  let max = 0, result: T = arr[0];
  for (const [v, c] of counts) { if (c > max) { max = c; result = v; } }
  return result;
}

export function BrushResultPanel({ leads, onClose, onSelectLead }: BrushResultPanelProps) {
  const [openRubros, setOpenRubros] = useState<Set<string>>(() => new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, Lead[]>();
    for (const l of leads) {
      const rubro = l.rubro ?? "Sin rubro";
      if (!map.has(rubro)) map.set(rubro, []);
      map.get(rubro)!.push(l);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [leads]);

  const metrics = useMemo(() => {
    const withRating = leads.filter(l => l.rating != null);
    const avgRating = withRating.length
      ? withRating.reduce((s, l) => s + l.rating!, 0) / withRating.length
      : null;
    const tiers = leads.map(l => l.tier).filter(Boolean) as string[];
    const dominantTier = mostCommon(tiers);
    const topRubro = grouped[0]?.[0] ?? null;
    const sinContactar = leads.filter(l => !l.estado || l.estado === "por_contactar").length;
    return { avgRating, dominantTier, topRubro, sinContactar };
  }, [leads, grouped]);

  function toggleRubro(rubro: string) {
    setOpenRubros(prev => {
      const next = new Set(prev);
      if (next.has(rubro)) next.delete(rubro);
      else next.add(rubro);
      return next;
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 52 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 52 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="flex h-full w-[360px] flex-col overflow-hidden rounded-2xl border border-[#e7eae9] bg-white shadow-[0_8px_32px_rgba(24,33,31,0.12)]"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-[#e7eae9] px-5 py-4">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-semibold text-[#1c2b2b]">
              {leads.length} empresa{leads.length !== 1 ? "s" : ""} en el área
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-gray-400">Selección rectangular activa</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 active:scale-[0.97]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Metrics row */}
      <div className="grid grid-cols-2 gap-2 border-b border-[#e7eae9] px-4 py-3">
        <MetricChip
          icon={Star}
          label="Rating prom."
          value={metrics.avgRating != null ? metrics.avgRating.toFixed(1) + " ★" : "—"}
          color="text-amber-600"
        />
        <MetricChip
          icon={BarChart2}
          label="Tier dominante"
          value={metrics.dominantTier ?? "—"}
          color="text-indigo-600"
        />
        <MetricChip
          icon={Users}
          label="Rubro líder"
          value={metrics.topRubro ?? "—"}
          color="text-teal-600"
        />
        <MetricChip
          icon={Phone}
          label="Sin contactar"
          value={String(metrics.sinContactar)}
          color="text-orange-600"
        />
      </div>

      {/* Leads list grouped by rubro */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {grouped.map(([rubro, grupoLeads]) => {
          const isOpen = openRubros.has(rubro);
          return (
            <div key={rubro} className="mb-1">
              <button
                onClick={() => toggleRubro(rubro)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors hover:bg-gray-50 active:scale-[0.99]"
              >
                <span className="text-xs font-semibold text-[#1c2b2b]">{rubro}</span>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                    {grupoLeads.length}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="ml-2 space-y-0.5 pb-1">
                      {grupoLeads.map(lead => (
                        <button
                          key={lead.id}
                          onClick={() => onSelectLead(lead)}
                          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-teal-50 active:scale-[0.99]"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-[#1c2b2b]">{lead.nombre}</p>
                            {lead.direccion && (
                              <p className="truncate text-[11px] text-gray-400">{lead.direccion}</p>
                            )}
                          </div>
                          <div className="flex shrink-0 flex-col items-end gap-1">
                            {lead.tier && (
                              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${tierColor(lead.tier)}`}>
                                {lead.tier}
                              </span>
                            )}
                            {lead.rating != null && (
                              <span className="flex items-center gap-0.5 text-[11px] tabular-nums text-amber-500">
                                {"★".repeat(starCount(lead.rating))}
                                <span className="ml-0.5 text-gray-400">({lead.rating.toFixed(1)})</span>
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="border-t border-[#e7eae9] px-4 py-3">
        <button
          onClick={onClose}
          className="w-full rounded-xl border border-[#e7eae9] py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 active:scale-[0.98]"
        >
          Limpiar selección
        </button>
      </div>
    </motion.div>
  );
}

function MetricChip({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-2">
      <Icon className={`h-3.5 w-3.5 shrink-0 ${color}`} />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-400">{label}</p>
        <p className={`truncate text-xs font-semibold tabular-nums ${color}`}>{value}</p>
      </div>
    </div>
  );
}
