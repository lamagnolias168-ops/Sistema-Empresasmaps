import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ── tipos mínimos ────────────────────────────────────────────────────────────
interface Interaccion {
  fecha: string;
  texto: string;
  tipo?: string;
}

interface LeadRow {
  id: string;
  nombre: string;
  latitud: number | null;
  longitud: number | null;
  rating: number | null;
  notas_interacciones: Interaccion[] | null;
}

// ── Google Maps Find Place ───────────────────────────────────────────────────
async function fetchCurrentRating(
  nombre: string,
  lat: number,
  lng: number,
  apiKey: string
): Promise<number | null> {
  const params = new URLSearchParams({
    input: nombre,
    inputtype: "textquery",
    fields: "rating",
    locationbias: `circle:500@${lat},${lng}`,
    key: apiKey,
  });

  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    candidates?: Array<{ rating?: number }>;
    status: string;
  };

  return data.candidates?.[0]?.rating ?? null;
}

// ── handler ──────────────────────────────────────────────────────────────────
export async function POST() {
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!gmKey || !sbUrl || !sbKey) {
    return NextResponse.json({ error: "Faltan variables de entorno." }, { status: 500 });
  }

  const supabase = createClient(sbUrl, sbKey);

  // 1. Traer todos los leads con coordenadas
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, nombre, latitud, longitud, rating, notas_interacciones")
    .not("latitud", "is", null)
    .not("longitud", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (leads ?? []) as LeadRow[];
  const results = { checked: 0, updated: 0, alerted: 0, errors: 0, details: [] as string[] };

  for (const lead of rows) {
    if (lead.latitud == null || lead.longitud == null) continue;

    // Pausa para no saturar la API (50 rpm límite en tier gratuito)
    await new Promise((r) => setTimeout(r, 250));

    try {
      const newRating = await fetchCurrentRating(
        lead.nombre,
        lead.latitud,
        lead.longitud,
        gmKey
      );
      results.checked++;

      if (newRating == null) continue;

      const oldRating = lead.rating;
      const changed = oldRating == null || Math.abs(newRating - oldRating) >= 0.05;
      const dropped = oldRating != null && oldRating - newRating > 0.3;

      if (!changed) continue;

      // Construir notas actualizado si aplica
      const notasActuales: Interaccion[] = lead.notas_interacciones ?? [];
      const notasNuevas: Interaccion[] = dropped
        ? [
            {
              fecha: new Date().toISOString(),
              texto: `⚠️ ALERTA: Rating bajó de ${oldRating.toFixed(1)} a ${newRating.toFixed(1)} en Google Maps`,
              tipo: "nota",
            },
            ...notasActuales,
          ]
        : notasActuales;

      const updatePayload: Record<string, unknown> = { rating: newRating };
      if (dropped) updatePayload.notas_interacciones = notasNuevas;

      const { error: updateError } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", lead.id);

      if (updateError) {
        results.errors++;
        continue;
      }

      results.updated++;
      if (dropped) {
        results.alerted++;
        results.details.push(
          `${lead.nombre}: ${oldRating?.toFixed(1)} → ${newRating.toFixed(1)} ⚠️`
        );
      } else {
        results.details.push(
          `${lead.nombre}: ${oldRating?.toFixed(1) ?? "?"} → ${newRating.toFixed(1)}`
        );
      }
    } catch {
      results.errors++;
    }
  }

  return NextResponse.json(results);
}
