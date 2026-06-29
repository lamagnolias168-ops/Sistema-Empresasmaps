"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "motion/react";
import type { Lead } from "@/types/lead";
import { fetchLeads } from "@/lib/supabase";
import {
  EMPTY_FILTERS,
  computeKpis,
  filterLeads,
  getUniqueRubros,
  leadsWithCoordinates,
  type LeadFilters,
} from "@/lib/leads-utils";
import { sortByUrgency } from "@/lib/urgency";
import { KpiRow } from "@/components/kpi-row";
import { FiltersBar } from "@/components/filters-bar";
import { LeadsGrid } from "@/components/leads-grid";
import { LeadsMap } from "@/components/leads-map";
import { LeadDetailPanel } from "@/components/lead-detail-panel";
import { PipelineMetrics } from "@/components/pipeline-metrics";
import { KanbanView } from "@/components/kanban-view";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { RubroIntelPanel } from "@/components/rubro-intel-panel";
import { RefreshCw, ShieldAlert, LayoutGrid, Kanban } from "lucide-react";
import { BrushResultPanel } from "@/components/brush-result-panel";

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

type ViewMode = "tarjetas" | "kanban";

export function Dashboard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filters, setFilters] = useState<LeadFilters>(EMPTY_FILTERS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<MonitorResult | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("tarjetas");
  const [brushSelection, setBrushSelection] = useState<Lead[] | null>(null);

  const rubros = useMemo(() => getUniqueRubros(leads), [leads]);
  const filteredLeads = useMemo(() => filterLeads(leads, filters), [leads, filters]);
  const sortedLeads = useMemo(() => sortByUrgency(filteredLeads), [filteredLeads]);
  const kpis = useMemo(() => computeKpis(leads), [leads]);
  const mapLeads = useMemo(() => leadsWithCoordinates(sortedLeads), [sortedLeads]);

  // When brush selection is active, restrict grid to only those leads
  const brushSelectedIds = useMemo(
    () => new Set(brushSelection?.map((l) => l.id) ?? []),
    [brushSelection]
  );
  const displayLeads = useMemo(() => {
    if (!brushSelection || brushSelection.length === 0) return sortedLeads;
    return sortedLeads.filter((l) => brushSelectedIds.has(l.id));
  }, [sortedLeads, brushSelection, brushSelectedIds]);

  // Leads del rubro seleccionado (todos, sin otros filtros) para el panel de inteligencia
  const rubroLeads = useMemo(() => {
    if (!filters.rubro) return [];
    return leads.filter((l) => l.rubro === filters.rubro);
  }, [leads, filters.rubro]);

  useEffect(() => {
    fetchLeads()
      .then(setLeads)
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar desde Supabase."))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError(null);
    setSyncResult(null);
    try {
      const fresh = await fetchLeads();
      setLeads(fresh);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar desde Supabase.");
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
      const fresh = await fetchLeads();
      setLeads(fresh);
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
      {/* Header */}
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Prospección Codflow</h1>
          <p className="mt-1 text-sm text-gray-500">Leads calificados de empresas en Ciudad de Panamá</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleMonitor}
            disabled={isSyncing || isLoading}
            title="Revisar ratings y reseñas nuevas en Google Maps para todas las empresas"
            className="press inline-flex items-center gap-2 rounded-md border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ShieldAlert className={`h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`} />
            {isSyncing ? "Monitoreando…" : "Monitor de reputación"}
          </button>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing || isLoading}
            className="press inline-flex items-center gap-2 rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${(isRefreshing || isLoading) ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>
      </header>

      {/* Monitor result banner */}
      {syncResult && (
        <div className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
          syncResult.total_alertas > 0
            ? "border-red-200 bg-red-50 text-red-800"
            : "border-green-200 bg-green-50 text-green-800"
        }`}>
          <p className="font-semibold">
            {syncResult.total_alertas > 0
              ? `⚠️ ${syncResult.total_alertas} alerta${syncResult.total_alertas > 1 ? "s" : ""} de rating — `
              : "✓ "}
            {syncResult.total_actualizados} actualizado{syncResult.total_actualizados !== 1 ? "s" : ""}{" "}
            de {syncResult.total_revisados} revisados
            {syncResult.total_resenas_nuevas > 0 ? ` · ${syncResult.total_resenas_nuevas} reseña${syncResult.total_resenas_nuevas > 1 ? "s" : ""} negativa${syncResult.total_resenas_nuevas > 1 ? "s" : ""} nueva${syncResult.total_resenas_nuevas > 1 ? "s" : ""}` : ""}
            {syncResult.total_errores > 0 ? ` · ${syncResult.total_errores} error${syncResult.total_errores > 1 ? "es" : ""}` : ""}
          </p>
          {syncResult.detalles.filter(d => d.estado !== "sin_cambios" && d.estado !== "error").length > 0 && (
            <ul className="mt-1.5 space-y-0.5 text-xs opacity-80">
              {syncResult.detalles
                .filter(d => d.estado !== "sin_cambios" && d.estado !== "error")
                .map((d, i) => (
                  <li key={i}>
                    {d.nombre}:{" "}
                    {d.rating_anterior != null && d.rating_nuevo != null
                      ? `${d.rating_anterior.toFixed(1)}★ → ${d.rating_nuevo.toFixed(1)}★`
                      : d.notas_agregadas[0] ?? d.estado}
                    {d.estado === "rating_alerta" ? " ⚠️" : ""}
                  </li>
                ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>
      )}

      {isLoading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <div className="mt-6"><KpiRow kpis={kpis} /></div>
          <div className="mt-6"><PipelineMetrics leads={leads} /></div>

          {/* Rubro intel panel — solo cuando hay rubro seleccionado */}
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
          <div className="mt-4 flex items-center gap-2">
            <span className="text-xs text-gray-500 font-medium">Vista:</span>
            <div className="flex rounded-lg border border-gray-200 bg-white p-0.5">
              <button
                onClick={() => setViewMode("tarjetas")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "tarjetas"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" /> Tarjetas
              </button>
              <button
                onClick={() => setViewMode("kanban")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  viewMode === "kanban"
                    ? "bg-teal-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Kanban className="h-3.5 w-3.5" /> Kanban
              </button>
            </div>
            <span className="text-xs text-gray-400 ml-1">
              Ordenado por urgencia · {sortedLeads.length} leads
            </span>
          </div>

          {/* Main content */}
          <div className="mt-4">
            {viewMode === "kanban" ? (
              <KanbanView
                leads={sortedLeads}
                onVerDetalle={setSelectedLead}
                onLeadUpdate={handleLeadUpdate}
              />
            ) : (
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
                <LeadsGrid leads={displayLeads} onVerDetalle={setSelectedLead} />
                <div className="flex gap-4">
                  <div className="flex-1 min-w-0">
                    <LeadsMap
                      leads={mapLeads}
                      onBrushSelect={(sel) => setBrushSelection(sel.length ? sel : null)}
                      brushSelectedIds={brushSelectedIds}
                    />
                  </div>
                  <AnimatePresence>
                    {brushSelection && brushSelection.length > 0 && (
                      <BrushResultPanel
                        key="brush-panel"
                        leads={brushSelection}
                        onClose={() => setBrushSelection(null)}
                        onSelectLead={setSelectedLead}
                      />
                    )}
                  </AnimatePresence>
                </div>
              </div>
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
