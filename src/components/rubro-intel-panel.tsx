"use client";

import { useMemo } from "react";
import { TrendingUp, MapPin, Target, Phone } from "lucide-react";
import type { Lead } from "@/types/lead";
import { normalizeTier } from "@/lib/tier-colors";

// Zones Perfil A and B from the business logic
const ZONAS_A = ["juan díaz","tocumen","transístmica","calidonia","av. central","ojo de agua","villa zaita","las mañanitas","santa ana"];
const ZONAS_B = ["obarrio","costa del este","san francisco","marbella","bella vista","calle 50","paitilla","punta pacífica","panamá pacífico"];

function classifyZone(direccion: string | null): "A" | "B" | null {
  if (!direccion) return null;
  const d = direccion.toLowerCase();
  if (ZONAS_A.some((z) => d.includes(z))) return "A";
  if (ZONAS_B.some((z) => d.includes(z))) return "B";
  return null;
}

function extractZoneName(direccion: string | null): string {
  if (!direccion) return "Desconocida";
  const d = direccion.toLowerCase();
  for (const z of [...ZONAS_A, ...ZONAS_B]) {
    if (d.includes(z)) return z.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
  // fallback: first meaningful part of address
  return direccion.split(",")[0]?.trim() ?? direccion;
}

// Extract the most common "dolor" keyword from senal_destacada
const DOLOR_KEYWORDS = [
  "rating", "reseñas", "operación manual", "whatsapp", "reportería",
  "inventario", "sin datos", "sin crm", "sin sistema", "escala",
  "competidor", "fuga", "manual", "sin visibilidad",
];

function getMostCommonDolor(leads: Lead[]): string {
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    const text = (lead.senal_destacada ?? "") + " " + (lead.angulo_contacto ?? "");
    const lower = text.toLowerCase();
    for (const kw of DOLOR_KEYWORDS) {
      if (lower.includes(kw)) counts[kw] = (counts[kw] ?? 0) + 1;
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  if (!sorted.length) return "No identificado";
  // Capitalize and list top 2
  return sorted
    .slice(0, 2)
    .map(([kw]) => kw.charAt(0).toUpperCase() + kw.slice(1))
    .join(" · ");
}

function getMostCommonZone(leads: Lead[]): string {
  const counts: Record<string, number> = {};
  for (const lead of leads) {
    const z = extractZoneName(lead.direccion);
    counts[z] = (counts[z] ?? 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? "Desconocida";
}

interface RubroIntelPanelProps {
  rubro: string;
  leads: Lead[]; // all leads of this rubro
}

export function RubroIntelPanel({ rubro, leads }: RubroIntelPanelProps) {
  const intel = useMemo(() => {
    const total = leads.length;
    const tiers = { alto: 0, medio: 0, bajo: 0 };
    let zonaA = 0, zonaB = 0;

    for (const l of leads) {
      const t = normalizeTier(l.tier);
      if (t === "alto") tiers.alto++;
      else if (t === "medio") tiers.medio++;
      else tiers.bajo++;

      const z = classifyZone(l.direccion);
      if (z === "A") zonaA++;
      else if (z === "B") zonaB++;
    }

    const top3 = [...leads]
      .sort((a, b) => (b.puntaje_total ?? 0) - (a.puntaje_total ?? 0))
      .slice(0, 3);

    return {
      total,
      tiers,
      zonaA,
      zonaB,
      dolor: getMostCommonDolor(leads),
      zonaOportunidad: getMostCommonZone(leads),
      top3,
    };
  }, [leads]);

  const tierBarTotal = intel.total || 1;

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Target className="h-4 w-4 text-indigo-600" />
        <h3 className="text-sm font-bold text-indigo-800 uppercase tracking-wide">
          Inteligencia de rubro — {rubro}
        </h3>
        <span className="ml-auto text-xs text-indigo-500">{intel.total} empresa{intel.total !== 1 ? "s" : ""}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Dolor más común */}
        <div className="rounded-lg border border-indigo-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1">Dolor más común</p>
          <p className="text-sm font-semibold text-gray-800">{intel.dolor}</p>
        </div>

        {/* Zona con más oportunidad */}
        <div className="rounded-lg border border-indigo-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-1 flex items-center gap-1">
            <MapPin className="h-3 w-3" /> Zona principal
          </p>
          <p className="text-sm font-semibold text-gray-800">{intel.zonaOportunidad}</p>
          <p className="mt-1 text-xs text-gray-500">
            Perfil A: {intel.zonaA} · Perfil B: {intel.zonaB}
          </p>
        </div>

        {/* Distribución de tiers */}
        <div className="rounded-lg border border-indigo-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2 flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> Tiers
          </p>
          <div className="flex h-3 overflow-hidden rounded-full">
            {intel.tiers.alto > 0 && (
              <div className="bg-emerald-500" style={{ width: `${(intel.tiers.alto / tierBarTotal) * 100}%` }} title={`Alto: ${intel.tiers.alto}`} />
            )}
            {intel.tiers.medio > 0 && (
              <div className="bg-amber-400" style={{ width: `${(intel.tiers.medio / tierBarTotal) * 100}%` }} title={`Medio: ${intel.tiers.medio}`} />
            )}
            {intel.tiers.bajo > 0 && (
              <div className="bg-gray-300" style={{ width: `${(intel.tiers.bajo / tierBarTotal) * 100}%` }} title={`Bajo: ${intel.tiers.bajo}`} />
            )}
          </div>
          <div className="mt-1.5 flex gap-3 text-[10px] text-gray-500">
            <span><span className="font-bold text-emerald-600">{intel.tiers.alto}</span> alto</span>
            <span><span className="font-bold text-amber-500">{intel.tiers.medio}</span> medio</span>
            <span><span className="font-bold text-gray-400">{intel.tiers.bajo}</span> bajo</span>
          </div>
        </div>

        {/* Top 3 para llamar */}
        <div className="rounded-lg border border-indigo-200 bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500 mb-2 flex items-center gap-1">
            <Phone className="h-3 w-3" /> Top 3 para llamar
          </p>
          <ol className="space-y-1">
            {intel.top3.map((lead, i) => (
              <li key={lead.id} className="flex items-start gap-1.5 text-xs">
                <span className="shrink-0 font-bold text-indigo-400">{i + 1}.</span>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{lead.nombre}</p>
                  <p className="text-gray-400">{lead.puntaje_total ?? "?"} pts</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
