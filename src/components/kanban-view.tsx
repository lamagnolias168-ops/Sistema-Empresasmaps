"use client";

import { useState } from "react";
import type { Lead } from "@/types/lead";
import { ESTADO_OPTIONS } from "@/lib/estado-config";
import { updateLeadCrm } from "@/lib/supabase";
import { normalizeTier } from "@/lib/tier-colors";

// ── Urgency (inline, same logic as urgency.ts) ───────────────────────────────
function urgencyBadge(lead: Lead): "urgente" | "prioridad" | "normal" {
  let score = 0;
  if (lead.rating != null && lead.rating < 4.0) score += 2;
  if (lead.senal_destacada && /crítica|urgente|crítico/i.test(lead.senal_destacada)) score += 3;
  if (normalizeTier(lead.tier) === "alto") score += 3;
  const notas = lead.notas_interacciones ?? [];
  if (notas.length > 0) {
    const dias = Math.floor((Date.now() - new Date(notas[0].fecha).getTime()) / 86400000);
    if (dias > 7) score += 2;
  }
  if (lead.fecha_proximo_seguimiento) {
    const hoy = new Date().toISOString().slice(0, 10);
    if (lead.fecha_proximo_seguimiento <= hoy) score += 3;
  }
  if (score >= 6) return "urgente";
  if (score >= 3) return "prioridad";
  return "normal";
}

const URGENCY_DOT: Record<string, string> = {
  urgente:   "bg-red-500",
  prioridad: "bg-yellow-400",
  normal:    "bg-green-400",
};

const TIER_COLORS: Record<string, string> = {
  alto:  "bg-emerald-100 text-emerald-700",
  medio: "bg-amber-100 text-amber-700",
  bajo:  "bg-gray-100 text-gray-500",
};

// Column background tints (light)
const COL_ACCENT: Record<string, string> = {
  por_contactar:     "bg-gray-50 border-gray-200",
  contactado:        "bg-teal-50 border-teal-200",
  reunion_agendada:  "bg-orange-50 border-orange-200",
  propuesta_enviada: "bg-purple-50 border-purple-200",
  cerrado_ganado:    "bg-green-50 border-green-200",
  cerrado_perdido:   "bg-red-50 border-red-200",
};

const COL_HEADER: Record<string, string> = {
  por_contactar:     "text-gray-600 border-gray-300",
  contactado:        "text-teal-700 border-teal-300",
  reunion_agendada:  "text-orange-700 border-orange-300",
  propuesta_enviada: "text-purple-700 border-purple-300",
  cerrado_ganado:    "text-green-700 border-green-300",
  cerrado_perdido:   "text-red-700 border-red-300",
};

// ── Mini card ────────────────────────────────────────────────────────────────
function KanbanCard({
  lead,
  onVerDetalle,
  onDragStart,
}: {
  lead: Lead;
  onVerDetalle: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
}) {
  const tier = normalizeTier(lead.tier);
  const urg = urgencyBadge(lead);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, lead)}
      onClick={() => onVerDetalle(lead)}
      className="cursor-pointer rounded-lg border border-gray-200 bg-white px-3 py-2.5 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 active:opacity-70 select-none"
    >
      <div className="flex items-start justify-between gap-1.5">
        <p className="text-xs font-semibold leading-tight text-gray-900 line-clamp-2">{lead.nombre}</p>
        <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${URGENCY_DOT[urg]}`} title={urg} />
      </div>
      {lead.rubro && (
        <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-400 truncate">
          {lead.rubro}
        </p>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        {tier && (
          <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${TIER_COLORS[tier] ?? TIER_COLORS.bajo}`}>
            {tier.charAt(0).toUpperCase() + tier.slice(1)}
          </span>
        )}
        {lead.puntaje_total != null && (
          <span className="text-[10px] text-gray-400 font-medium">{Math.round(lead.puntaje_total)} pts</span>
        )}
      </div>
    </div>
  );
}

// ── Column ───────────────────────────────────────────────────────────────────
function KanbanColumn({
  estado,
  label,
  icon,
  leads,
  onVerDetalle,
  onDragStart,
  onDrop,
}: {
  estado: string;
  label: string;
  icon: string;
  leads: Lead[];
  onVerDetalle: (lead: Lead) => void;
  onDragStart: (e: React.DragEvent, lead: Lead) => void;
  onDrop: (e: React.DragEvent, targetEstado: string) => void;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      className={`flex min-h-[500px] w-60 shrink-0 flex-col rounded-xl border ${COL_ACCENT[estado]} transition-all ${
        over ? "ring-2 ring-teal-400 ring-offset-1" : ""
      }`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { setOver(false); onDrop(e, estado); }}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 border-b px-3 py-2.5 ${COL_HEADER[estado]}`}>
        <span className="text-sm">{icon}</span>
        <span className="text-xs font-semibold">{label}</span>
        <span className="ml-auto rounded-full bg-white/70 px-1.5 py-0.5 text-xs font-bold text-gray-700">
          {leads.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2">
        {leads.map((lead) => (
          <KanbanCard
            key={lead.id}
            lead={lead}
            onVerDetalle={onVerDetalle}
            onDragStart={onDragStart}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex h-20 items-center justify-center rounded-lg border border-dashed border-gray-300 text-xs text-gray-400">
            Sin leads
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main export ──────────────────────────────────────────────────────────────
interface KanbanViewProps {
  leads: Lead[];
  onVerDetalle: (lead: Lead) => void;
  onLeadUpdate: (id: string, fields: Partial<Lead>) => void;
}

export function KanbanView({ leads, onVerDetalle, onLeadUpdate }: KanbanViewProps) {
  const [dragging, setDragging] = useState<Lead | null>(null);

  // Agrupa leads por estado
  const grouped = ESTADO_OPTIONS.reduce<Record<string, Lead[]>>((acc, opt) => {
    acc[opt.value] = leads.filter((l) => (l.estado ?? "por_contactar") === opt.value);
    return acc;
  }, {});

  function handleDragStart(e: React.DragEvent, lead: Lead) {
    e.dataTransfer.setData("leadId", lead.id);
    e.dataTransfer.effectAllowed = "move";
    setDragging(lead);
  }

  async function handleDrop(e: React.DragEvent, targetEstado: string) {
    e.preventDefault();
    const leadId = e.dataTransfer.getData("leadId");
    if (!leadId || dragging?.estado === targetEstado) { setDragging(null); return; }

    // Optimistic update
    onLeadUpdate(leadId, { estado: targetEstado });
    setDragging(null);

    try {
      await updateLeadCrm(leadId, { estado: targetEstado });
    } catch {
      // Revert on error
      onLeadUpdate(leadId, { estado: dragging?.estado ?? "por_contactar" });
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-3" style={{ minWidth: "max-content" }}>
        {ESTADO_OPTIONS.map((opt) => (
          <KanbanColumn
            key={opt.value}
            estado={opt.value}
            label={opt.label}
            icon={opt.icon}
            leads={grouped[opt.value] ?? []}
            onVerDetalle={onVerDetalle}
            onDragStart={handleDragStart}
            onDrop={handleDrop}
          />
        ))}
      </div>
    </div>
  );
}
