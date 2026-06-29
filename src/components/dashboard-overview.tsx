"use client";

import { useEffect, useMemo, useState } from "react";
import type { Lead } from "@/types/lead";
import { fetchLeads } from "@/lib/supabase";
import { computeKpis } from "@/lib/leads-utils";
import { KpiRow } from "@/components/kpi-row";
import { PipelineMetrics } from "@/components/pipeline-metrics";
import { DashboardSkeleton } from "@/components/dashboard-skeleton";
import { RefreshCw, ShieldAlert } from "lucide-react";

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

export function DashboardOverview() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<MonitorResult | null>(null);

  const kpis = useMemo(() => computeKpis(leads), [leads]);

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

  const today = new Date().toLocaleDateString("es-PA", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm capitalize text-gray-400">{today}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={handleMonitor}
            disabled={isSyncing || isLoading}
            title="Revisar ratings y reseñas nuevas en Google Maps"
            className="inline-flex items-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-700 shadow-sm transition-colors hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.97]"
          >
            <ShieldAlert className={`h-4 w-4 ${isSyncing ? "animate-pulse" : ""}`} />
            {isSyncing ? "Monitoreando…" : "Monitor de reputación"}
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
              ? `⚠️ ${syncResult.total_alertas} alerta${syncResult.total_alertas > 1 ? "s" : ""} de rating — `
              : "✓ "}
            {syncResult.total_actualizados} actualizado{syncResult.total_actualizados !== 1 ? "s" : ""} de{" "}
            {syncResult.total_revisados} revisados
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
          <div className="mt-6">
            <KpiRow kpis={kpis} />
          </div>
          <div className="mt-6">
            <PipelineMetrics leads={leads} />
          </div>
        </>
      )}
    </div>
  );
}
