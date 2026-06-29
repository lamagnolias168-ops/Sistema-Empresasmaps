"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Calendar, PhoneCall, MessageCircle, Mail, Video, StickyNote, FileText } from "lucide-react";
import type { Lead, Interaccion } from "@/types/lead";
import { ESTADO_OPTIONS, getEstadoConfig } from "@/lib/estado-config";

// ── helpers ──────────────────────────────────────────────────────────────────
function todayStr() { return new Date().toISOString().slice(0, 10); }

function pct(num: number, den: number) {
  if (!den) return "—";
  return Math.round((num / den) * 100) + "%";
}

const TIPO_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  llamada:  PhoneCall,
  whatsapp: MessageCircle,
  email:    Mail,
  reunion:  Video,
  nota:     StickyNote,
};
function TipoIcon({ tipo }: { tipo: string }) {
  const Icon = TIPO_ICONS[tipo] ?? FileText;
  return <Icon className="h-3.5 w-3.5 shrink-0" />;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `hace ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs}h`;
  return `hace ${Math.floor(hrs / 24)}d`;
}

// ── sub-components ───────────────────────────────────────────────────────────
function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#e7eae9] bg-white p-5 shadow-[0_1px_2px_rgba(24,33,31,0.05)]">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</h3>
      {children}
    </div>
  );
}

// 1. Pipeline bar
function PipelineBar({ leads }: { leads: Lead[] }) {
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const opt of ESTADO_OPTIONS) map[opt.value] = 0;
    for (const lead of leads) {
      const key = lead.estado ?? "por_contactar";
      if (key in map) map[key]++;
      else map["por_contactar"]++;
    }
    return map;
  }, [leads]);

  const total = leads.length || 1;
  const reduce = useReducedMotion();

  // Segment colors (solid bg for the bar)
  const BAR_COLORS: Record<string, string> = {
    por_contactar:     "bg-gray-400",
    contactado:        "bg-teal-500",
    reunion_agendada:  "bg-orange-500",
    propuesta_enviada: "bg-purple-500",
    cerrado_ganado:    "bg-green-500",
    cerrado_perdido:   "bg-red-500",
  };

  const segments = ESTADO_OPTIONS.map((opt) => ({
    opt,
    count: counts[opt.value] ?? 0,
  })).filter((s) => s.count > 0);

  return (
    <Card title="Pipeline de ventas">
      {/* Barra — cada segmento crece desde 0 al cargar; hover revela el detalle */}
      <div className="flex h-8 w-full gap-px overflow-hidden rounded-lg bg-gray-100">
        {segments.map(({ opt, count }, i) => {
          const width = (count / total) * 100;
          return (
            <motion.div
              key={opt.value}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{
                duration: reduce ? 0 : 0.7,
                ease: [0.23, 1, 0.32, 1],
                delay: reduce ? 0 : 0.1 + i * 0.07,
              }}
              style={{ minWidth: "28px" }}
              className={`group relative flex items-center justify-center text-xs font-bold tabular-nums text-white transition-[filter] duration-200 ease-out hover:brightness-110 ${BAR_COLORS[opt.value]}`}
            >
              {count}
              {/* Popover origin-aware que aparece sobre el segmento al hacer hover */}
              <span
                className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 origin-bottom scale-90 whitespace-nowrap rounded-md bg-[#18211f] px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-[opacity,transform] duration-150 ease-out group-hover:scale-100 group-hover:opacity-100"
              >
                {opt.label}: <span className="tabular-nums">{count}</span>
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {ESTADO_OPTIONS.map((opt) => {
          const count = counts[opt.value] ?? 0;
          return (
            <div key={opt.value} className="flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 rounded-full ${BAR_COLORS[opt.value]}`} />
              <span className="text-xs text-gray-600">{opt.label}</span>
              <span className="text-xs font-semibold tabular-nums text-gray-800">{count}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// 2. Tasa de conversión
function ConversionFunnel({ leads }: { leads: Lead[] }) {
  const stats = useMemo(() => {
    let total = 0, contactados = 0, reuniones = 0, propuestas = 0, cerrados = 0;
    for (const lead of leads) {
      const e = lead.estado ?? "por_contactar";
      total++;
      if (["contactado","reunion_agendada","propuesta_enviada","cerrado_ganado","cerrado_perdido"].includes(e)) contactados++;
      if (["reunion_agendada","propuesta_enviada","cerrado_ganado","cerrado_perdido"].includes(e)) reuniones++;
      if (["propuesta_enviada","cerrado_ganado","cerrado_perdido"].includes(e)) propuestas++;
      if (e === "cerrado_ganado") cerrados++;
    }
    return { total, contactados, reuniones, propuestas, cerrados };
  }, [leads]);

  const steps = [
    { label: "Contactados / Total",         num: stats.contactados, den: stats.total },
    { label: "Reuniones / Contactados",      num: stats.reuniones,   den: stats.contactados },
    { label: "Propuestas / Reuniones",       num: stats.propuestas,  den: stats.reuniones },
    { label: "Cerrados / Propuestas",        num: stats.cerrados,    den: stats.propuestas },
  ];

  const reduce = useReducedMotion();

  return (
    <Card title="Tasa de conversión">
      <div className="space-y-3">
        {steps.map(({ label, num, den }, i) => {
          const ratio = den ? num / den : 0;
          return (
            <div key={label}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-gray-600">{label}</span>
                <span className="font-semibold tabular-nums text-gray-800">
                  {num} / {den} &nbsp;
                  <span className={ratio >= 0.5 ? "text-green-600" : ratio >= 0.25 ? "text-amber-600" : "text-gray-400"}>
                    ({pct(num, den)})
                  </span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ratio * 100)}%` }}
                  transition={{
                    duration: reduce ? 0 : 0.7,
                    ease: [0.23, 1, 0.32, 1],
                    delay: reduce ? 0 : 0.15 + i * 0.08,
                  }}
                  className={`h-1.5 rounded-full ${
                    ratio >= 0.5 ? "bg-green-500" : ratio >= 0.25 ? "bg-amber-400" : "bg-gray-300"
                  }`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// 3. Actividad reciente
interface FlatInteraccion extends Interaccion {
  empresa: string;
}

function ActividadReciente({ leads }: { leads: Lead[] }) {
  const actividad = useMemo<FlatInteraccion[]>(() => {
    const all: FlatInteraccion[] = [];
    for (const lead of leads) {
      for (const nota of lead.notas_interacciones ?? []) {
        all.push({ ...nota, empresa: lead.nombre });
      }
    }
    all.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    return all.slice(0, 5);
  }, [leads]);

  return (
    <Card title="Actividad reciente">
      {actividad.length === 0 ? (
        <p className="text-sm text-gray-400">Aún no hay interacciones registradas.</p>
      ) : (
        <div className="space-y-3">
          {actividad.map((item, i) => {
            const tipo = item.tipo ?? "nota";
            const tipoLabel = {
              llamada: "Llamada", whatsapp: "WhatsApp", email: "Email",
              reunion: "Reunión", nota: "Nota",
            }[tipo] ?? "Nota";
            const resumen = item.texto.length > 80 ? item.texto.slice(0, 77) + "…" : item.texto;
            return (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-600">
                  <TipoIcon tipo={tipo} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800 truncate">{item.empresa}</span>
                    <span className="text-xs text-gray-400 shrink-0">{tipoLabel} · {formatRelative(item.fecha)}</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-snug mt-0.5">{resumen}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// 4. Seguimientos pendientes
function SeguimientosPendientes({ leads }: { leads: Lead[] }) {
  const hoy = todayStr();

  const pendientes = useMemo(() => {
    return leads
      .filter((l) => l.fecha_proximo_seguimiento && l.fecha_proximo_seguimiento <= hoy)
      .sort((a, b) => (a.fecha_proximo_seguimiento ?? "").localeCompare(b.fecha_proximo_seguimiento ?? ""));
  }, [leads, hoy]);

  return (
    <Card title="Seguimientos pendientes">
      {pendientes.length === 0 ? (
        <p className="text-sm text-green-600 font-medium">✓ Sin seguimientos vencidos</p>
      ) : (
        <div className="space-y-2.5">
          {pendientes.map((lead) => {
            const isHoy = lead.fecha_proximo_seguimiento === hoy;
            const cfg = getEstadoConfig(lead.estado);
            return (
              <div key={lead.id} className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 ${
                isHoy ? "border-orange-200 bg-orange-50" : "border-red-200 bg-red-50"
              }`}>
                <Calendar className={`mt-0.5 h-4 w-4 shrink-0 ${isHoy ? "text-orange-500" : "text-red-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800">{lead.nombre}</span>
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs font-semibold ${isHoy ? "text-orange-600" : "text-red-600"}`}>
                    {isHoy ? "🔔 Hoy" : `⚠️ Vencido — ${new Date(lead.fecha_proximo_seguimiento! + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}`}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
export function PipelineMetrics({ leads }: { leads: Lead[] }) {
  return (
    <div className="space-y-4">
      <PipelineBar leads={leads} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <ConversionFunnel leads={leads} />
        <ActividadReciente leads={leads} />
        <SeguimientosPendientes leads={leads} />
      </div>
    </div>
  );
}
