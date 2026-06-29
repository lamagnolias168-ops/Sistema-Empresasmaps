"use client";

import { Phone, Globe, MapPin, Lightbulb, AlertTriangle, ChevronRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import type { Lead } from "@/types/lead";
import { TierBadge } from "@/components/tier-badge";
import { getEstadoConfig } from "@/lib/estado-config";
import { computeUrgency, URGENCY_CONFIG } from "@/lib/urgency";

interface LeadCardProps {
  lead: Lead;
  index?: number;
  onVerDetalle?: (lead: Lead) => void;
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function LeadCard({ lead, index = 0, onVerDetalle }: LeadCardProps) {
  const reduce = useReducedMotion();
  const urg = computeUrgency(lead);
  const urgCfg = URGENCY_CONFIG[urg.level];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14, scale: 0.985 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{
        // spring estilo Apple — entra natural; stagger de 50ms entre tarjetas
        type: "spring",
        duration: 0.5,
        bounce: 0.18,
        delay: reduce ? 0 : Math.min(index, 14) * 0.05,
      }}
    >
      <div className="card-lift group h-full rounded-xl border border-[#e7eae9] bg-white p-5 shadow-[0_1px_2px_rgba(24,33,31,0.05)]">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight text-gray-900">{lead.nombre}</h3>
            {lead.rubro && (
              <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
                {lead.rubro}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <TierBadge tier={lead.tier} puntaje={lead.puntaje_total} />
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${urgCfg.cls}`}
              title={urg.reasons.join(", ")}
            >
              {urgCfg.emoji} {urgCfg.label}
            </span>
          </div>
        </div>

        {lead.senal_destacada && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
            <p className="measure text-xs leading-snug text-amber-800">{lead.senal_destacada}</p>
          </div>
        )}

        {lead.direccion && (
          <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="measure leading-snug">{lead.direccion}</span>
          </div>
        )}

        {(lead.telefono || lead.web) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {lead.telefono && (
              <a
                href={`tel:${lead.telefono.replace(/[^\d+]/g, "")}`}
                className="press inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <Phone className="h-3.5 w-3.5" />
                Llamar
              </a>
            )}
            {lead.web && (
              <a
                href={normalizeUrl(lead.web)}
                target="_blank"
                rel="noopener noreferrer"
                className="press inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-100"
              >
                <Globe className="h-3.5 w-3.5" />
                Sitio web
              </a>
            )}
          </div>
        )}

        {lead.angulo_contacto && (
          <div className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-3">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-600" />
            <p className="measure text-xs italic leading-snug text-gray-600 line-clamp-3">{lead.angulo_contacto}</p>
          </div>
        )}

        {(() => {
          const cfg = getEstadoConfig(lead.estado);
          return (
            <div className="mt-3 flex items-center gap-1.5 border-t border-gray-100 pt-3">
              <span className={`h-2 w-2 rounded-full ${cfg.dot}`} />
              <span className="text-xs text-gray-500">{cfg.label}</span>
            </div>
          );
        })()}

        <button
          onClick={() => onVerDetalle?.(lead)}
          className="press mt-3 flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 py-1.5 text-xs font-medium text-gray-500 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
        >
          Ver detalle
          <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-0.5" />
        </button>
      </div>
    </motion.div>
  );
}
