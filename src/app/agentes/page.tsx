"use client";

import { motion } from "motion/react";
import { ArrowLeft, Cpu, Activity } from "lucide-react";
import Link from "next/link";

export default function AgentesPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f4] px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 26 }}
        className="w-full max-w-sm text-center"
      >
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-600 shadow-md">
          <Cpu className="h-8 w-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-[#1c2b2b]">Agentes en vivo</h1>
        <p className="mt-2 text-sm text-gray-500 max-w-[52ch] mx-auto">
          El monitoreo en tiempo real de los agentes estará disponible próximamente.
          Por ahora puede ver el progreso de cada lead desde el dashboard principal.
        </p>

        <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4 text-left">
          <div className="flex items-center gap-2 text-teal-700">
            <Activity className="h-4 w-4" />
            <p className="text-sm font-semibold">Sus agentes están activos</p>
          </div>
          <p className="mt-1 text-sm text-teal-600">
            Investigador · Analista · Monitor · Pitch · Post-llamada
          </p>
        </div>

        <Link
          href="/"
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 active:scale-[0.97]"
        >
          <ArrowLeft className="h-4 w-4" /> Ir al dashboard
        </Link>
      </motion.div>
    </div>
  );
}
