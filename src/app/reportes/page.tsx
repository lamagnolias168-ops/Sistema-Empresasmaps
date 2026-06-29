import { FileText, Download, Clock, Lock } from "lucide-react";

export const metadata = { title: "Reportes — Codflow" };

const FEATURES = [
  "Reporte PDF por empresa con perfil completo, análisis y ángulo de contacto",
  "Reporte por rubro con benchmarks, dolores comunes y oportunidades detectadas",
  "Resumen ejecutivo del pipeline de prospección con KPIs y conversión",
  "Exportación de historial de interacciones por lead",
];

export default function ReportesPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-10">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Reportes</h1>
        <p className="mt-1 text-sm text-gray-400">
          Genera reportes PDF por empresa o rubro
        </p>
      </header>

      {/* Main card */}
      <div className="rounded-2xl border border-[#e7eae9] bg-white p-8 text-center shadow-[0_1px_3px_rgba(24,33,31,0.07)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50">
          <FileText className="h-8 w-8 text-teal-600" />
        </div>
        <h2 className="mt-5 text-xl font-semibold text-gray-900">Reportes en desarrollo</h2>
        <p className="mt-2 mx-auto max-w-[42ch] text-sm text-gray-400">
          El módulo de reportes estará disponible próximamente. Aquí podrás generar y descargar
          documentos para compartir con tu equipo comercial.
        </p>

        <ul className="mt-8 space-y-3 text-left">
          {FEATURES.map((f, i) => (
            <li key={i} className="flex items-start gap-3 rounded-xl border border-[#e7eae9] bg-gray-50 px-4 py-3">
              <Lock className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
              <span className="text-sm text-gray-500">{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            disabled
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-medium text-white opacity-40"
          >
            <Download className="h-4 w-4" />
            Generar reporte
          </button>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock className="h-3.5 w-3.5" />
            Próximamente
          </div>
        </div>
      </div>
    </div>
  );
}
