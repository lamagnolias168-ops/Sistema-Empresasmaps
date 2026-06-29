"use client";

import { useEffect, useMemo, useState } from "react";
import { Lightbulb, ChevronDown } from "lucide-react";
import type { Lead } from "@/types/lead";
import { fetchLeads } from "@/lib/supabase";
import { getUniqueRubros } from "@/lib/leads-utils";
import { RubroIntelPanel } from "@/components/rubro-intel-panel";

export default function AdminInteligenciaPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRubro, setSelectedRubro] = useState<string>("");

  useEffect(() => {
    fetchLeads().then(setLeads).finally(() => setIsLoading(false));
  }, []);

  const rubros = useMemo(() => getUniqueRubros(leads), [leads]);
  const rubroLeads = useMemo(
    () => leads.filter((l) => l.rubro === selectedRubro),
    [leads, selectedRubro]
  );

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Inteligencia</h1>
        <p className="mt-1 text-sm text-gray-400">Análisis profundo por sector — patrones, dolores y oportunidades</p>
      </header>

      <div className="relative max-w-xs">
        <select
          value={selectedRubro}
          onChange={(e) => setSelectedRubro(e.target.value)}
          disabled={isLoading}
          className="w-full appearance-none rounded-xl border border-[#e7eae9] bg-white px-4 py-2.5 pr-9 text-sm font-medium text-gray-700 shadow-sm transition-colors focus:border-teal-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Selecciona un rubro…</option>
          {rubros.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      </div>

      <div className="mt-8">
        {!selectedRubro ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#c8d4d2] bg-white py-20 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-50">
              <Lightbulb className="h-7 w-7 text-teal-500" />
            </div>
            <h3 className="mt-4 text-base font-semibold text-gray-700">Selecciona un rubro para comenzar</h3>
            <p className="mt-1.5 max-w-[36ch] text-sm text-gray-400">
              Verás dolores comunes, zonas con oportunidad y patrones del sector.
            </p>
          </div>
        ) : rubroLeads.length === 0 ? (
          <div className="rounded-2xl border border-[#e7eae9] bg-white py-16 text-center">
            <p className="text-sm text-gray-400">No hay datos para {selectedRubro}.</p>
          </div>
        ) : (
          <RubroIntelPanel rubro={selectedRubro} leads={rubroLeads} />
        )}
      </div>
    </div>
  );
}
