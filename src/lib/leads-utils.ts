import type { Lead } from "@/types/lead";
import { normalizeTier } from "@/lib/tier-colors";

export interface LeadFilters {
  rubro: string | null;
  tier: string | null;
  search: string;
  estado: string | null;
}

export const EMPTY_FILTERS: LeadFilters = {
  rubro: null,
  tier: null,
  search: "",
  estado: null,
};

export function getUniqueRubros(leads: Lead[]): string[] {
  const set = new Set<string>();
  for (const lead of leads) {
    if (lead.rubro) set.add(lead.rubro);
  }
  return Array.from(set).sort();
}

export function filterLeads(leads: Lead[], filters: LeadFilters): Lead[] {
  const search = filters.search.trim().toLowerCase();

  return leads.filter((lead) => {
    if (filters.rubro && lead.rubro !== filters.rubro) return false;
    if (filters.tier && normalizeTier(lead.tier) !== filters.tier) return false;
    if (filters.estado && lead.estado !== filters.estado) return false;
    if (search && !lead.nombre.toLowerCase().includes(search)) return false;
    return true;
  });
}

export interface LeadKpis {
  total: number;
  alto: number;
  medio: number;
  bajo: number;
  promedio: number | null;
  porContactar: number;
}

export function computeKpis(leads: Lead[]): LeadKpis {
  let alto = 0;
  let medio = 0;
  let bajo = 0;
  let sum = 0;
  let scored = 0;
  let porContactar = 0;

  for (const lead of leads) {
    const tier = normalizeTier(lead.tier);
    if (tier === "alto") alto += 1;
    else if (tier === "medio") medio += 1;
    else if (tier === "bajo") bajo += 1;

    if (lead.estado === "por_contactar" || lead.estado == null) porContactar += 1;

    if (typeof lead.puntaje_total === "number") {
      sum += lead.puntaje_total;
      scored += 1;
    }
  }

  return {
    total: leads.length,
    alto,
    medio,
    bajo,
    promedio: scored > 0 ? sum / scored : null,
    porContactar,
  };
}

export function leadsWithCoordinates(leads: Lead[]): Lead[] {
  return leads.filter(
    (lead) => typeof lead.latitud === "number" && typeof lead.longitud === "number"
  );
}
