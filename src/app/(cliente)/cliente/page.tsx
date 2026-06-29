"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Search, BarChart2, FileText, TrendingUp } from "lucide-react";

const STEPS = [
  {
    number: "01",
    icon: Search,
    title: "Cuéntanos tu empresa",
    description: "Respondés 8 preguntas sobre tu negocio, zona y objetivos. Toma 5 minutos.",
    time: "5 min",
  },
  {
    number: "02",
    icon: BarChart2,
    title: "Nuestros agentes analizan",
    description: "3 IAs trabajan en paralelo: investigación de mercado, calificación y estrategia.",
    time: "2 min",
  },
  {
    number: "03",
    icon: FileText,
    title: "Recibes tu reporte",
    description: "Análisis completo con oportunidades detectadas, competencia y próximos pasos.",
    time: "inmediato",
  },
];

export default function ClienteWelcomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="relative flex flex-1 flex-col items-center justify-center overflow-hidden bg-[#0f1d1d] px-6 py-24 text-center">
        {/* Subtle radial glow */}
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 0%, #14b8a6, transparent)",
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 28 }}
          className="relative z-10 flex flex-col items-center"
        >
          {/* Logo */}
          <div className="mb-8 flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-500 shadow-lg shadow-teal-500/30">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold tracking-tight text-white/70">codflow</span>
          </div>

          <h1 className="max-w-[16ch] text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
            Descubre el potencial de tu empresa.
          </h1>

          <p className="mt-5 max-w-[44ch] text-base text-white/55 leading-relaxed">
            Análisis de mercado inteligente para empresas en Ciudad de Panamá —
            sin consultores, sin esperas, en minutos.
          </p>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 26, delay: 0.15 }}
            className="mt-10"
          >
            <Link
              href="/cliente/entrevista"
              className="group inline-flex items-center gap-2.5 rounded-2xl bg-teal-500 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-teal-500/25 transition-all duration-200 hover:bg-teal-400 hover:shadow-teal-400/30 active:scale-[0.97]"
            >
              Comenzar análisis de mi empresa
              <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <p className="mt-4 text-xs text-white/30">Gratis · Sin registro · Sin tarjeta de crédito</p>
        </motion.div>
      </section>

      {/* Steps */}
      <section className="bg-white px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-12 text-center text-xs font-semibold uppercase tracking-widest text-teal-600"
          >
            Así funciona
          </motion.p>

          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ type: "spring", stiffness: 280, damping: 26, delay: i * 0.1 }}
                  className="flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-teal-50">
                      <Icon className="h-5 w-5 text-teal-600" />
                    </div>
                    <span className="text-xs font-bold tabular-nums text-teal-500">{step.number}</span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-400">{step.description}</p>
                  <p className="mt-3 text-xs font-medium text-teal-600">{step.time}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="border-t border-gray-100 bg-gray-50 px-6 py-8 text-center">
        <p className="text-xs text-gray-400">
          Powered by <span className="font-semibold text-gray-600">Codflow Intelligence</span> ·
          Análisis de mercado para empresas panameñas
        </p>
      </footer>
    </div>
  );
}
