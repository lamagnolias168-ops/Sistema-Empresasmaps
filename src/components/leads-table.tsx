"use client";

import type { Lead } from "@/types/lead";
import { getTierStyle } from "@/lib/tier-colors";

interface LeadsTableProps {
  leads: Lead[];
  onVerDetalle: (lead: Lead) => void;
}

const ESTADO_STYLES: Record<string, string> = {
  por_contactar: "bg-orange-100 text-orange-700",
  contactado: "bg-blue-100 text-blue-700",
  en_proceso: "bg-indigo-100 text-indigo-700",
  cerrado: "bg-emerald-100 text-emerald-700",
  descartado: "bg-gray-100 text-gray-500",
};

function estadoLabel(estado: string | null): string {
  if (!estado) return "Sin estado";
  return estado.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function LeadsTable({ leads, onVerDetalle }: LeadsTableProps) {
  if (leads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-[#e7eae9] bg-white py-16 text-center">
        <p className="text-sm font-medium text-gray-400">No hay prospectos que coincidan</p>
        <p className="mt-1 text-xs text-gray-300">Ajusta los filtros para ver resultados</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-[#e7eae9] bg-white shadow-[0_1px_3px_rgba(24,33,31,0.07)]">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-[#e7eae9] bg-gray-50/80">
            <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Empresa</th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Rubro</th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Tier</th>
            <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Puntaje</th>
            <th className="px-4 py-3.5 text-right text-xs font-semibold uppercase tracking-wide text-gray-400">Rating</th>
            <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wide text-gray-400">Estado</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#f0f2f1]">
          {leads.map((lead) => {
            const tierStyle = getTierStyle(lead.tier);
            const estadoCls = ESTADO_STYLES[lead.estado ?? ""] ?? "bg-gray-100 text-gray-500";
            return (
              <tr
                key={lead.id}
                onClick={() => onVerDetalle(lead)}
                className="cursor-pointer border-l-[3px] border-l-transparent transition-all duration-150 hover:border-l-teal-500 hover:bg-teal-50/40 active:scale-[0.995]"
              >
                <td className="px-5 py-3.5">
                  <p className="font-medium text-[#1c2b2b]">{lead.nombre}</p>
                  {lead.direccion && (
                    <p className="mt-0.5 truncate text-xs text-gray-400 max-w-[200px]">{lead.direccion}</p>
                  )}
                </td>
                <td className="px-4 py-3.5 text-gray-500">{lead.rubro ?? "—"}</td>
                <td className="px-4 py-3.5">
                  {lead.tier ? (
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium ${tierStyle.badgeClass}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${tierStyle.dotClass}`} />
                      {tierStyle.label}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-gray-700">
                  {lead.puntaje_total != null ? Math.round(lead.puntaje_total) : "—"}
                </td>
                <td className="px-4 py-3.5 text-right tabular-nums text-amber-500">
                  {lead.rating != null ? (
                    <span>{lead.rating.toFixed(1)} ★</span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3.5">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${estadoCls}`}>
                    {estadoLabel(lead.estado)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
