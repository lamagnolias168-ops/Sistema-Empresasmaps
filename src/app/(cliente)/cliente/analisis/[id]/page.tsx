"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { useRouter } from "next/navigation";
import { Search, BarChart2, Lightbulb, CheckCircle, Clock, TrendingUp, ArrowRight } from "lucide-react";

interface Lead {
  id: string;
  nombre: string;
  rubro: string | null;
  contexto_completo: unknown;
  puntaje_total: number | null;
  angulo_contacto: string | null;
  senal_destacada: string | null;
  tier: string | null;
}

interface EntrevistaData {
  entrevista: { empresa: string; zona: string; dolor_principal: string | null };
  lead: Lead | null;
}

const AGENT_STEPS = [
  {
    key: "investigador",
    name: "Investigador",
    icon: Search,
    color: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    label: "Mapeando tu empresa, zona y mercado…",
    isDone: (lead: Lead | null) => lead?.contexto_completo != null,
    preview: (lead: Lead | null) => lead?.rubro ? `Sector: ${lead.rubro}` : null,
  },
  {
    key: "analista",
    name: "Analista",
    icon: BarChart2,
    color: "text-indigo-600",
    bg: "bg-indigo-50",
    ring: "ring-indigo-200",
    label: "Calculando tu puntaje de oportunidad…",
    isDone: (lead: Lead | null) => lead?.puntaje_total != null,
    preview: (lead: Lead | null) =>
      lead?.puntaje_total != null
        ? `Puntaje: ${Math.round(lead.puntaje_total)}/100 · Tier ${lead.tier ?? "—"}`
        : null,
  },
  {
    key: "estratega",
    name: "Estratega",
    icon: Lightbulb,
    color: "text-amber-600",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    label: "Preparando tu plan de trabajo…",
    isDone: (lead: Lead | null) => lead?.angulo_contacto != null,
    preview: (lead: Lead | null) => lead?.senal_destacada ?? null,
  },
];

function isAllDone(lead: Lead | null) {
  return AGENT_STEPS.every((s) => s.isDone(lead));
}

export default function AnalisisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const entrevistaId = params.id;
  const [data, setData] = useState<EntrevistaData | null>(null);
  const [error, setError] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/cliente/${entrevistaId}`);
      if (!res.ok) { setError(true); return; }
      const json = (await res.json()) as EntrevistaData;
      setData(json);
      if (isAllDone(json.lead)) {
        doneRef.current = true;
      } else if (!doneRef.current) {
        timerRef.current = setTimeout(poll, 4000);
      }
    } catch {
      setError(true);
    }
  }, [entrevistaId]);

  useEffect(() => {
    poll();
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [poll]);

  const lead = data?.lead ?? null;
  const empresa = data?.entrevista?.empresa ?? "Tu empresa";
  const allDone = isAllDone(lead);

  return (
    <div className="flex min-h-screen flex-col bg-[#f4f7f6]">
      {/* Header */}
      <header className="flex items-center gap-3 border-b border-gray-100 bg-white px-6 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500">
          <TrendingUp className="h-3.5 w-3.5 text-white" />
        </div>
        <span className="text-sm font-bold text-gray-700">codflow</span>
        <div className="ml-auto text-xs text-gray-400">Paso 3 — Análisis en proceso</div>
      </header>

      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-6 py-16">
        {error ? (
          <div className="text-center">
            <p className="text-sm text-red-500">No encontramos tu análisis. Verifica el enlace.</p>
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="w-full text-center"
            >
              <h1 className="text-2xl font-bold text-gray-900">
                {allDone ? "¡Tu análisis está listo!" : `Analizando ${empresa}…`}
              </h1>
              <p className="mt-2 text-sm text-gray-400">
                {allDone
                  ? "Nuestros agentes completaron el análisis. Ya puedes ver tu reporte."
                  : "Nuestros agentes están trabajando. Esto toma 2-3 minutos."}
              </p>
            </motion.div>

            <div className="mt-10 w-full space-y-3">
              {AGENT_STEPS.map((step, i) => {
                const Icon = step.icon;
                const done = step.isDone(lead);
                const active = !done && AGENT_STEPS.slice(0, i).every((s) => s.isDone(lead));
                const preview = step.preview(lead);
                return (
                  <motion.div
                    key={step.key}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 28, delay: i * 0.08 }}
                    className={`rounded-2xl border bg-white p-4 shadow-[0_1px_3px_rgba(24,33,31,0.07)] transition-all duration-300 ${
                      done ? "border-emerald-200" : active ? `ring-2 ${step.ring} border-transparent` : "border-[#e7eae9]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${done ? "bg-emerald-50" : step.bg}`}>
                        {done ? (
                          <CheckCircle className="h-5 w-5 text-emerald-500" />
                        ) : (
                          <Icon className={`h-5 w-5 ${step.color} ${active ? "animate-pulse" : "opacity-40"}`} />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-semibold ${done ? "text-emerald-700" : active ? "text-gray-900" : "text-gray-400"}`}>
                          {step.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {done ? "Completado" : active ? step.label : "En espera…"}
                        </p>
                      </div>
                      {!done && active && (
                        <div className="flex shrink-0 items-center gap-1 text-xs text-gray-400">
                          <Clock className="h-3.5 w-3.5 animate-pulse" />
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {done && preview && (
                        <motion.p
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-2 overflow-hidden border-t border-gray-50 pt-2 text-xs text-gray-500 line-clamp-2"
                        >
                          {preview}
                        </motion.p>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* CTA */}
            <motion.div
              animate={{ opacity: allDone ? 1 : 0.35 }}
              transition={{ duration: 0.4 }}
              className="mt-10 w-full"
            >
              <button
                disabled={!allDone}
                onClick={() => router.push(`/cliente/reporte/${entrevistaId}`)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-all duration-200 hover:bg-teal-500 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 disabled:shadow-none active:scale-[0.97]"
              >
                Ver mi reporte
                <ArrowRight className="h-4 w-4" />
              </button>
            </motion.div>
          </>
        )}
      </main>
    </div>
  );
}
