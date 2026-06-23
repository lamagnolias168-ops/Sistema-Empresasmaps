import { Phone, Globe, MapPin, Lightbulb, AlertTriangle } from "lucide-react";
import type { Lead } from "@/types/lead";
import { TierBadge } from "@/components/tier-badge";

interface LeadCardProps {
  lead: Lead;
}

function normalizeUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `https://${url}`;
}

export function LeadCard({ lead }: LeadCardProps) {
  return (
    <div className="group rounded-xl border border-gray-200 bg-white p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold leading-tight text-gray-900">{lead.nombre}</h3>
          {lead.rubro && (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">
              {lead.rubro}
            </p>
          )}
        </div>
        <TierBadge tier={lead.tier} puntaje={lead.puntaje_total} />
      </div>

      {lead.senal_destacada && (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
          <p className="text-xs leading-snug text-amber-800">{lead.senal_destacada}</p>
        </div>
      )}

      {lead.direccion && (
        <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
          <span className="leading-snug">{lead.direccion}</span>
        </div>
      )}

      {(lead.telefono || lead.web) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {lead.telefono && (
            <a
              href={`tel:${lead.telefono.replace(/[^\d+]/g, "")}`}
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100"
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
              className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-100"
            >
              <Globe className="h-3.5 w-3.5" />
              Sitio web
            </a>
          )}
        </div>
      )}

      {lead.angulo_contacto && (
        <div className="mt-4 flex items-start gap-2 border-t border-gray-100 pt-3">
          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
          <p className="text-xs italic leading-snug text-gray-600">{lead.angulo_contacto}</p>
        </div>
      )}
    </div>
  );
}
