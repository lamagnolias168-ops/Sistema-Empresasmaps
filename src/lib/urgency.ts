import type { Lead } from "@/types/lead";
import { normalizeTier } from "@/lib/tier-colors";

export type UrgencyLevel = "urgente" | "prioridad" | "normal";

export interface UrgencyResult {
  level: UrgencyLevel;
  score: number;
  reasons: string[];
}

export function computeUrgency(lead: Lead): UrgencyResult {
  let score = 0;
  const reasons: string[] = [];

  if (lead.rating != null && lead.rating < 4.0) {
    score += 2;
    reasons.push(`Rating bajo (${lead.rating}★)`);
  }
  if (lead.senal_destacada && /crítica|urgente|crítico/i.test(lead.senal_destacada)) {
    score += 3;
    reasons.push("Señal crítica");
  }
  if (normalizeTier(lead.tier) === "alto") {
    score += 3;
    reasons.push("Tier alto");
  }

  const notas = lead.notas_interacciones ?? [];
  if (notas.length > 0) {
    const dias = Math.floor((Date.now() - new Date(notas[0].fecha).getTime()) / 86400000);
    if (dias > 7) {
      score += 2;
      reasons.push(`Sin contacto ${dias}d`);
    }
  }

  if (lead.fecha_proximo_seguimiento) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (lead.fecha_proximo_seguimiento <= hoy) {
      score += 3;
      reasons.push("Seguimiento vencido");
    }
  }

  const level: UrgencyLevel = score >= 5 ? "urgente" : score >= 2 ? "prioridad" : "normal";
  return { level, score, reasons };
}

export function sortByUrgency(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => computeUrgency(b).score - computeUrgency(a).score);
}

export const URGENCY_CONFIG: Record<UrgencyLevel, { emoji: string; label: string; cls: string }> = {
  urgente:   { emoji: "🔴", label: "Urgente",   cls: "bg-red-100 text-red-700" },
  prioridad: { emoji: "🟡", label: "Prioridad", cls: "bg-yellow-100 text-yellow-700" },
  normal:    { emoji: "🟢", label: "Normal",    cls: "bg-green-100 text-green-700" },
};
