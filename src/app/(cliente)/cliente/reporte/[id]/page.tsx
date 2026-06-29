"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { motion } from "motion/react";
import {
  TrendingUp, Star, MapPin, Target, Lightbulb, ArrowRight,
  Download, Calendar, ChevronRight, AlertCircle,
} from "lucide-react";

interface Lead {
  nombre: string;
  rubro: string | null;
  direccion: string | null;
  rating: number | null;
  puntaje_total: number | null;
  tier: string | null;
  senal_destacada: string | null;
  razon: string | null;
  angulo_contacto: string | null;
}

interface Data {
  entrevista: {
    empresa: string;
    zona: string;
    dolor_principal: string | null;
    objetivo_3_meses: string | null;
  };
  lead: Lead | null;
}

const TIER_STYLES: Record<string, { label: string; bg: string; text: string }> = {
  alto: { label: "Tier ALTO", bg: "bg-emerald-100", text: "text-emerald-700" },
  medio: { label: "Tier MEDIO", bg: "bg-amber-100", text: "text-amber-700" },
  bajo: { label: "Tier BAJO", bg: "bg-gray-100", text: "text-gray-600" },
};

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
      className="rounded-2xl border border-[#e7eae9] bg-white p-6 shadow-[0_1px_3px_rgba(24,33,31,0.07)]"
    >
      <div className="mb-4 flex items-center gap-2.5">
        <Icon className="h-4.5 w-4.5 text-teal-600" style={{ width: 18, height: 18 }} />
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

export default function ReportePage() {
  const params = useParams<{ id: string }>();
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch(`/api/cliente/${params.id}`)
      .then((r) => r.json())
      .then(setData)
      .catch(() => setError(true));
  }, [params.id]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]">
        <div className="text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-400" />
          <p className="mt-3 text-sm text-gray-500">No encontramos este reporte. Verifica el enlace.</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f4f7f6]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const { entrevista, lead } = data;
  const empresa = lead?.nombre ?? entrevista.empresa;
  const tier = lead?.tier?.toLowerCase();
  const tierStyle = tier ? TIER_STYLES[tier] ?? null : null;

  return (
    <div className="min-h-screen bg-[#f4f7f6]">
      {/* Header */}
      <header className="border-b border-white/60 bg-white/80 backdrop-blur-sm px-6 py-4 sticky top-0 z-10">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-teal-500">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-sm font-bold text-gray-700">codflow</span>
          </div>
          <button
            disabled
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-1.5 text-xs font-medium text-gray-400 shadow-sm"
          >
            <Download className="h-3.5 w-3.5" /> Descargar PDF
            <span className="ml-1 rounded bg-gray-100 px-1 py-0.5 text-[10px]">pronto</span>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-6 py-10">
        {/* Title card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 24 }}
          className="rounded-2xl bg-[#0f1d1d] px-7 py-8 text-white"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-teal-400">Reporte de inteligencia</p>
          <h1 className="mt-2 text-2xl font-bold">{empresa}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {tierStyle && (
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tierStyle.bg} ${tierStyle.text}`}>
                {tierStyle.label}
              </span>
            )}
            {lead?.puntaje_total != null && (
              <span className="text-sm tabular-nums text-white/60">
                Puntaje: <strong className="text-white">{Math.round(lead.puntaje_total)}</strong>/100
              </span>
            )}
            {lead?.rubro && (
              <span className="flex items-center gap-1 text-sm text-white/60">
                <ChevronRight className="h-3.5 w-3.5" /> {lead.rubro}
              </span>
            )}
          </div>
          {(lead?.direccion ?? entrevista.zona) && (
            <div className="mt-4 flex items-center gap-1.5 text-xs text-white/40">
              <MapPin className="h-3.5 w-3.5" />
              {lead?.direccion ?? entrevista.zona}
            </div>
          )}
        </motion.div>

        {/* Resumen ejecutivo */}
        {lead?.razon && (
          <Section title="Resumen ejecutivo" icon={Target}>
            <p className="text-sm leading-relaxed text-gray-700">{lead.razon}</p>
          </Section>
        )}

        {/* Dolor detectado */}
        {(lead?.senal_destacada ?? entrevista.dolor_principal) && (
          <Section title="Dolor principal detectado" icon={AlertCircle}>
            <p className="text-sm leading-relaxed text-gray-700">
              {lead?.senal_destacada ?? entrevista.dolor_principal}
            </p>
          </Section>
        )}

        {/* Rating */}
        {lead?.rating != null && (
          <Section title="Reputación en Google Maps" icon={Star}>
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold tabular-nums text-gray-900">
                {lead.rating.toFixed(1)}
              </span>
              <div>
                <div className="text-amber-400">
                  {"★".repeat(Math.round(lead.rating))}
                  {"☆".repeat(5 - Math.round(lead.rating))}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">Sobre 5.0 estrellas</p>
              </div>
            </div>
          </Section>
        )}

        {/* Recomendaciones */}
        {lead?.angulo_contacto && (
          <Section title="Recomendaciones y próximos pasos" icon={Lightbulb}>
            <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">
              {lead.angulo_contacto}
            </p>
          </Section>
        )}

        {/* Objetivo del cliente */}
        {entrevista.objetivo_3_meses && (
          <Section title="Tu objetivo declarado" icon={ArrowRight}>
            <p className="text-sm leading-relaxed text-gray-700">{entrevista.objetivo_3_meses}</p>
          </Section>
        )}

        {/* CTAs */}
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            disabled
            className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white py-4 text-sm font-semibold text-gray-400 shadow-sm"
          >
            <Download className="h-4 w-4" /> Descargar PDF
            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-normal">próximamente</span>
          </button>
          <a
            href="https://calendly.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 rounded-2xl bg-teal-600 py-4 text-sm font-semibold text-white shadow-lg shadow-teal-600/20 transition-all hover:bg-teal-500 active:scale-[0.97]"
          >
            <Calendar className="h-4 w-4" /> Agendar reunión con Codflow
          </a>
        </div>

        <p className="pb-6 text-center text-xs text-gray-400">
          Generado por Codflow Intelligence · {new Date().toLocaleDateString("es-PA", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </main>
    </div>
  );
}
