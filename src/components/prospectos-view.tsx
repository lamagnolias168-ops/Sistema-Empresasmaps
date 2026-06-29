"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Lead } from "@/types/lead";
import { fetchLeads } from "@/lib/supabase";
import {
  EMPTY_FILTERS,
  filterLeads,
  getUniqueRubros,
  type LeadFilters,
} from "@/lib/leads-utils";
import { sortByUrgency } from "@/lib/urgency";
import { FiltersBar } from "@/components/filters-bar";
import { LeadsGrid } from "@/components/leads-grid";
import { LeadsTable } from "@/components/leads-table";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { KanbanView } from "@/components/kanban-view";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { RubroIntelPanel } from "@/components/rubro-intel-panel";
import { RefreshCw, ShieldAlert, LayoutGrid, Kanban, Table2 } from "lucide-react";

type ViewMode = "tarjetas" | "kanban" | "tabla";

interface MonitorResult {
  total_revisados: number;
  total_actualizados: number;
  total_alertas: number;
  total_resenas_nuevas: number;
  total_errores: number;
  detalles: Array<{
    nombre: string;
    estado: string;
    rating_anterior: number | null;
    rating_nuevo: number | null;
    notas_agregadas: string[];
    error?: string;
  }>;
}

export function ProspectosView() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<MonitorResult | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tarjetas");

  const rubros = useMemo(() => getUniqueRubros(leads), [leads]);
  const filteredLeads = useMemo(() => filterLeads(leads, filters), [leads, filters]);
  const sortedLeads = useMemo(() => sortByUrgency(filteredLeads), [filteredLeads]);

  const rubroLeads = useMemo(() => {
    if (!filters.rubro) return [];
    return leads.filter((l) => l.rubro === filters.rubro);
  }, [leads, filters.rubro]);

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    setSyncResult(null);
    try {
      setLeads(await fetchLeads());
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar.");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleMonitor() {
    setIsSyncing(true);
    setSyncResult(null);
    setError(null);
    try {
      const res = await fetch("/api/monitor", { method: "POST" });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const result = (await res.json()) as MonitorResult;
      setSyncResult(result);
      setLeads(await fetchLeads());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al ejecutar el monitor.");
    } finally {
      setIsSyncing(false);
    }
  }

  function handleLeadUpdate(id: string, fields: Partial<Lead>) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, ...fields } : l)));
    setSelectedLead((prev) => (prev?.id === id ? { ...prev, ...fields } : prev));
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Prospectos</h1>
          <p className="mt-1 text-sm text-gray-400">
            Leads calificados de empresas en Ciudad de Panamá
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleMonitor}
            disabled={isSyncing || isLoading}
            title="Revisar ratings y reseñas nuevas en Google Maps"
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
          >
            <ShieldAlert className={`h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`} />
            {isSyncing ? "Monitoreando…" : "Monitor"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing || isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </header>

      {syncResult && (
        <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
          syncResult.total_alertas > 0
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800"
        }`}>
          <p className="font-semibold">
            {syncResult.total_alertas > 0
              ? `⚠️ ${syncResult.total_alertas} alerta${syncResult.total_alertas > 1 ? "s" : ""} — `
              : "✓ "}
            {syncResult.total_actualizados} actualizado{syncResult.total_actualizados !== 1 ? "s" : ""}{" "}
            de {syncResult.total_revisados} revisados
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          {filters.rubro && rubroLeads.length > 0 && (
            <div className="mt-6">
              <RubroIntelPanel rubro={filters.rubro} leads={rubroLeads} />
            </div>
          )}

          <div className="mt-6">
            <FiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              rubros={rubros}
              resultCount={sortedLeads.length}
              totalCount={leads.length}
            />
          </div>

          {/* View toggle */}
          <div className="mt-4 flex items-center gap-3">
            <div className="flex rounded-xl border border-gray-200 bg-white p-0.5 shadow-sm">
              {(
                [
                  { mode: "tarjetas", label: "Tarjetas", Icon: LayoutGrid },
                  { mode: "kanban", label: "Kanban", Icon: Kanban },
                  { mode: "tabla", label: "Tabla", Icon: Table2 },
                ] as const
              ).map(({ mode, label, Icon }) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors active:scale-[0.97] ${
                    viewMode === mode
                      ? "bg-teal-600 text-white shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" /> {label}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400">
              {sortedLeads.length} prospecto{sortedLeads.length !== 1 ? "s" : ""} · ordenado por urgencia
            </span>
          </div>

          <div className="mt-4">
            {viewMode === "kanban" ? (
              <KanbanView
                leads={sortedLeads}
                onVerDetalle={setSelectedLead}
                onLeadUpdate={handleLeadUpdate}
              />
            ) : viewMode === "tabla" ? (
              <LeadsTable leads={sortedLeads} onVerDetalle={setSelectedLead} />
            ) : (
              <LeadsGrid leads={sortedLeads} onVerDetalle={setSelectedLead} />
            )}
          </div>
        </>
      )}

      <AnimatePresence>
        {selectedLead && (
          <LeadDetailPanel
            key={selectedLead.id}
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onLeadUpdate={handleLeadUpdate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
