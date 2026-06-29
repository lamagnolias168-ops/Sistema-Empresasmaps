"use client";

import { motion } from "motion/react";
import { Search, BarChart2, Lightbulb, MessageSquare, Activity, CheckCircle, Clock } from "lucide-react";

const AGENTS = [
  {
    key: "investigador",
    name: "Investigador",
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-50",
    accent: "border-blue-200",
    description: "Mapea la empresa, zona, Google Maps, reseñas y competidores.",
    model: "claude-haiku-4-5",
    stats: { procesados: 34, promedio: "1m 12s" },
  },
  {
    key: "analista",
    name: "Analista",
    icon: BarChart2,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    accent: "border-indigo-200",
    description: "Calcula puntaje de oportunidad, tier y señal destacada.",
    model: "claude-sonnet-4-6",
    stats: { procesados: 34, promedio: "45s" },
  },
  {
    key: "pitch",
    name: "Pitch",
    icon: Lightbulb,
    color: "text-amber-600",
    bg: "bg-amber-50",
    accent: "border-amber-200",
    description: "Genera ángulo de contacto personalizado por empresa.",
    model: "claude-sonnet-4-6",
    stats: { procesados: 10, promedio: "1m 05s" },
  },
  {
    key: "post_llamada",
    name: "Post-llamada",
    icon: MessageSquare,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    accent: "border-emerald-200",
    description: "Analiza reuniones y actualiza el perfil de cada lead.",
    model: "claude-haiku-4-5",
    stats: { procesados: 0, promedio: "—" },
  },
];

export default function AdminAgentesPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Agentes</h1>
          <p className="mt-1 text-sm text-gray-400">Centro de operaciones del sistema de inteligencia</p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs font-medium text-emerald-700">Sistema activo</span>
        </div>
      </header>

      {/* Agent cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {AGENTS.map((agent, i) => {
          const Icon = agent.icon;
          return (
            <motion.div
              key={agent.key}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.07 }}
              className={`rounded-2xl border bg-white p-5 shadow-[0_1px_3px_rgba(24,33,31,0.07)] ${agent.accent}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${agent.bg}`}>
                    <Icon className={`h-5 w-5 ${agent.color}`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">{agent.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-400 leading-relaxed">{agent.description}</p>
                  </div>
                </div>
                <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              </div>

              <div className="mt-4 flex items-center gap-4 border-t border-gray-100 pt-4">
                <div>
                  <p className="text-[11px] text-gray-400">Procesados</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-700">{agent.stats.procesados}</p>
                </div>
                <div>
                  <p className="text-[11px] text-gray-400">Tiempo prom.</p>
                  <p className="text-sm font-semibold tabular-nums text-gray-700">{agent.stats.promedio}</p>
                </div>
                <div className="ml-auto">
                  <span className="rounded-lg bg-gray-100 px-2 py-0.5 text-[11px] font-mono text-gray-500">
                    {agent.model}
                  </span>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Activity feed placeholder */}
      <div className="mt-8">
        <div className="mb-4 flex items-center gap-2">
          <Activity className="h-4 w-4 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">Actividad reciente</h2>
        </div>
        <div className="rounded-2xl border border-[#e7eae9] bg-white divide-y divide-gray-50">
          {[
            { agent: "Investigador", empresa: "Clínica San Marcos", time: "hace 2 min", status: "completado" },
            { agent: "Analista", empresa: "Contable Pérez & Asoc.", time: "hace 5 min", status: "completado" },
            { agent: "Investigador", empresa: "Logística Tráfico Rápido", time: "hace 12 min", status: "completado" },
            { agent: "Pitch", empresa: "Importadora Del Caribe", time: "hace 18 min", status: "completado" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-gray-700">
                  <span className="font-medium">{item.agent}</span> completó análisis de{" "}
                  <span className="font-medium">{item.empresa}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 text-xs text-gray-400">
                <Clock className="h-3 w-3" />
                {item.time}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-center text-xs text-gray-400">
          Feed en tiempo real disponible próximamente
        </p>
      </div>
    </div>
  );
}
