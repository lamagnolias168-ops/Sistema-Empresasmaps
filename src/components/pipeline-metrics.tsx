"use client";

import { useMemo } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Calendar, PhoneCall, MessageCircle, Mail, Video, StickyNote, FileText,
  Activity, CheckCircle2, Clock,
} from "lucide-react";
import type { Lead, Interaccion } from "@/types/lead";
import { ESTADO_OPTIONS, getEstadoConfig } from "@/lib/estado-config";

// ── helpers ───────────────────────────────────────────────────────────────────

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

// ── Sección container ─────────────────────────────────────────────────────────

function Section({ title, icon: Icon, children }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[#e7eae9] bg-white p-5 shadow-[0_1px_3px_rgba(24,33,31,0.07)]">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-50">
          <Icon className="h-3.5 w-3.5 text-teal-600" />
        </div>
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── 1. Pipeline bar ───────────────────────────────────────────────────────────

const BAR_COLORS: Record<string, string> = {
  por_contactar:     "bg-gray-300",
  contactado:        "bg-teal-500",
  reunion_agendada:  "bg-orange-500",
  propuesta_enviada: "bg-purple-500",
  cerrado_ganado:    "bg-emerald-500",
  cerrado_perdido:   "bg-red-400",
};

const BAR_GRADIENTS: Record<string, string> = {
  por_contactar:     "from-gray-300 to-gray-400",
  contactado:        "from-teal-400 to-teal-600",
  reunion_agendada:  "from-orange-400 to-orange-600",
  propuesta_enviada: "from-purple-400 to-purple-600",
  cerrado_ganado:    "from-emerald-400 to-emerald-600",
  cerrado_perdido:   "from-red-300 to-red-500",
};

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

  const segments = ESTADO_OPTIONS.map((opt) => ({
    opt, count: counts[opt.value] ?? 0,
  })).filter((s) => s.count > 0);

  return (
    <Section title="Pipeline de ventas" icon={Activity}>
      {/* Total pill */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-2xl font-bold tabular-nums text-[#1c2b2b]">{leads.length}</span>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
          leads totales
        </span>
      </div>

      {/* Barra segmentada */}
      <div className="flex h-10 w-full gap-0.5 overflow-hidden rounded-xl bg-gray-100">
        {segments.map(({ opt, count }, i) => {
          const width = (count / total) * 100;
          return (
            <motion.div
              key={opt.value}
              title={`${opt.label}: ${count}`}
              initial={{ width: 0 }}
              animate={{ width: `${width}%` }}
              transition={{
                duration: reduce ? 0 : 0.8,
                ease: [0.23, 1, 0.32, 1],
                delay: reduce ? 0 : 0.1 + i * 0.08,
              }}
              style={{ minWidth: 32 }}
              className={`group relative flex items-center justify-center bg-linear-to-b ${BAR_GRADIENTS[opt.value]} text-xs font-bold tabular-nums text-white transition-[filter] duration-200 hover:brightness-105`}
            >
              {count}
              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#1c2b2b] px-2.5 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100">
                {opt.label}: {count}
              </span>
            </motion.div>
          );
        })}
      </div>

      {/* Leyenda */}
      <div className="mt-3.5 flex flex-wrap gap-x-4 gap-y-2">
        {ESTADO_OPTIONS.map((opt) => {
          const count = counts[opt.value] ?? 0;
          return (
            <div key={opt.value} className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${BAR_COLORS[opt.value]}`} />
              <span className="text-xs text-gray-500">{opt.label}</span>
              <span className={`text-xs font-bold tabular-nums ${count > 0 ? "text-gray-800" : "text-gray-300"}`}>
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ── 2. Tasa de conversión ─────────────────────────────────────────────────────

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
    { label: "Contactados",  num: stats.contactados, den: stats.total,       color: "bg-teal-500" },
    { label: "Reuniones",    num: stats.reuniones,   den: stats.contactados,  color: "bg-orange-500" },
    { label: "Propuestas",   num: stats.propuestas,  den: stats.reuniones,    color: "bg-purple-500" },
    { label: "Cerrados",     num: stats.cerrados,    den: stats.propuestas,   color: "bg-emerald-500" },
  ];

  const reduce = useReducedMotion();

  return (
    <Section title="Tasa de conversión" icon={CheckCircle2}>
      <div className="space-y-4">
        {steps.map(({ label, num, den, color }, i) => {
          const ratio = den ? num / den : 0;
          const pctNum = den ? Math.round(ratio * 100) : null;
          return (
            <div key={label}>
              <div className="mb-1.5 flex items-end justify-between">
                <span className="text-sm font-medium text-gray-700">{label}</span>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xs tabular-nums text-gray-400">{num}/{den}</span>
                  <span className={`text-sm font-bold tabular-nums ${
                    pctNum === null ? "text-gray-300"
                    : pctNum >= 50 ? "text-emerald-600"
                    : pctNum >= 25 ? "text-amber-600"
                    : "text-gray-400"
                  }`}>
                    {pctNum !== null ? `${pctNum}%` : "—"}
                  </span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, ratio * 100)}%` }}
                  transition={{
                    duration: reduce ? 0 : 0.8,
                    ease: [0.23, 1, 0.32, 1],
                    delay: reduce ? 0 : 0.1 + i * 0.1,
                  }}
                  className={`h-2 rounded-full ${color}`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

// ── 3. Actividad reciente ─────────────────────────────────────────────────────

interface FlatInteraccion extends Interaccion { empresa: string; }

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

  const TIPO_COLORS: Record<string, string> = {
    llamada: "bg-teal-50 text-teal-600",
    whatsapp: "bg-green-50 text-green-600",
    email: "bg-indigo-50 text-indigo-600",
    reunion: "bg-orange-50 text-orange-600",
    nota: "bg-gray-50 text-gray-500",
  };

  return (
    <Section title="Actividad reciente" icon={Clock}>
      {actividad.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
            <Activity className="h-5 w-5 text-gray-300" />
          </div>
          <p className="text-sm font-medium text-gray-400">Sin interacciones aún</p>
          <p className="mt-0.5 text-xs text-gray-300">Las notas aparecerán aquí</p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {actividad.map((item, i) => {
            const tipo = item.tipo ?? "nota";
            const tipoLabel = { llamada: "Llamada", whatsapp: "WhatsApp", email: "Email", reunion: "Reunión", nota: "Nota" }[tipo] ?? "Nota";
            const resumen = item.texto.length > 75 ? item.texto.slice(0, 72) + "…" : item.texto;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.06 }}
                className="flex gap-3"
              >
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${TIPO_COLORS[tipo] ?? "bg-gray-50 text-gray-500"}`}>
                  <TipoIcon tipo={tipo} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-gray-800 truncate">{item.empresa}</span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500">
                      {tipoLabel}
                    </span>
                    <span className="shrink-0 text-[10px] text-gray-400 ml-auto">{formatRelative(item.fecha)}</span>
                  </div>
                  <p className="mt-0.5 text-xs leading-snug text-gray-500">{resumen}</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ── 4. Seguimientos pendientes ────────────────────────────────────────────────

function SeguimientosPendientes({ leads }: { leads: Lead[] }) {
  const hoy = todayStr();

  const pendientes = useMemo(() => {
    return leads
      .filter((l) => l.fecha_proximo_seguimiento && l.fecha_proximo_seguimiento <= hoy)
      .sort((a, b) => (a.fecha_proximo_seguimiento ?? "").localeCompare(b.fecha_proximo_seguimiento ?? ""));
  }, [leads, hoy]);

  return (
    <Section title="Seguimientos pendientes" icon={Calendar}>
      {pendientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 22 }}
            className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50"
          >
            <CheckCircle2 className="h-6 w-6 text-emerald-500" />
          </motion.div>
          <p className="text-sm font-semibold text-emerald-600">Todo al día</p>
          <p className="mt-0.5 text-xs text-gray-400">Sin seguimientos vencidos</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {pendientes.map((lead, i) => {
            const isHoy = lead.fecha_proximo_seguimiento === hoy;
            const cfg = getEstadoConfig(lead.estado);
            return (
              <motion.div
                key={lead.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 26, delay: i * 0.07 }}
                className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${
                  isHoy
                    ? "border-orange-200 bg-orange-50"
                    : "border-red-200 bg-red-50"
                }`}
              >
                <Calendar className={`mt-0.5 h-4 w-4 shrink-0 ${isHoy ? "text-orange-500" : "text-red-500"}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-800 truncate">{lead.nombre}</span>
                    <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </div>
                  <p className={`mt-0.5 text-xs font-medium ${isHoy ? "text-orange-600" : "text-red-600"}`}>
                    {isHoy
                      ? "🔔 Hoy"
                      : `⚠️ ${new Date(lead.fecha_proximo_seguimiento! + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}`}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

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
