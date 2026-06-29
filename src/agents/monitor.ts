/**
 * Agente Monitor — Codflow
 * Revisa el estado de cada empresa en Google Maps y detecta cambios de rating y reseñas negativas.
 * Reemplaza /api/sync-ratings con una versión más completa.
 *
 * Flujo: lee todos los leads → consulta Google Maps → compara → escribe alertas en Supabase
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface Interaccion {
  fecha: string;
  texto: string;
  tipo?: string;
}

interface LeadMonitor {
  id: string;
  nombre: string;
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  rating: number | null;
  senal_destacada: string | null;
  contexto_completo: unknown;
  notas_interacciones: Interaccion[] | null;
}

interface ReviewFromMaps {
  rating: number;
  author_name: string;
  text: string;
  time: number;
}

export interface MonitorLeadResult {
  id: string;
  nombre: string;
  estado: "sin_cambios" | "rating_actualizado" | "rating_alerta" | "resenas_negativas" | "error";
  rating_anterior: number | null;
  rating_nuevo: number | null;
  resenas_negativas_nuevas: number;
  notas_agregadas: string[];
  error?: string;
}

export interface MonitorSummary {
  total_revisados: number;
  total_actualizados: number;
  total_alertas: number;
  total_resenas_nuevas: number;
  total_errores: number;
  detalles: MonitorLeadResult[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Extrae place_id del texto de contexto_completo si el Agente Investigador lo guardó */
function extractPlaceId(raw: unknown): string | null {
  const texto = typeof raw === "string" ? raw : "";
  const m = texto.match(/place_id[:\s]+([A-Za-z0-9_-]{10,})/i);
  return m?.[1] ?? null;
}

/** Construye place_id buscando por nombre + coordenadas en Google Maps */
async function findPlaceId(
  nombre: string,
  direccion: string | null,
  lat: number | null,
  lng: number | null,
  apiKey: string
): Promise<string | null> {
  const params = new URLSearchParams({
    input: `${nombre} ${direccion ?? "Panamá"}`,
    inputtype: "textquery",
    fields: "place_id",
    key: apiKey,
  });
  if (lat != null && lng != null) {
    params.set("locationbias", `circle:800@${lat},${lng}`);
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates?: Array<{ place_id?: string }> };
    return data.candidates?.[0]?.place_id ?? null;
  } catch {
    return null;
  }
}

/** Trae rating actual y las 5 reseñas más recientes para un place_id */
async function fetchPlaceData(
  placeId: string,
  apiKey: string
): Promise<{ rating: number | null; reviews: ReviewFromMaps[] }> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: "rating,reviews",
    language: "es",
    reviews_sort: "newest",
    key: apiKey,
  });

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${params}`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return { rating: null, reviews: [] };

    const data = (await res.json()) as {
      result?: { rating?: number; reviews?: ReviewFromMaps[] };
    };

    return {
      rating: data.result?.rating ?? null,
      reviews: data.result?.reviews ?? [],
    };
  } catch {
    return { rating: null, reviews: [] };
  }
}

/**
 * Reseñas negativas que aún no han sido anotadas en notas_interacciones.
 * Compara por primeros 80 chars del texto para evitar duplicados.
 */
function filtrarResenasNuevas(
  reviews: ReviewFromMaps[],
  notasExistentes: Interaccion[]
): ReviewFromMaps[] {
  const textoYaNotado = new Set(
    notasExistentes
      .filter((n) => n.texto.includes("⭐") || n.texto.includes("Reseña"))
      .map((n) => n.texto.slice(0, 80))
  );

  return reviews
    .filter((r) => r.rating <= 3 && r.text.trim().length > 10)
    .filter((r) => {
      const key = `[${r.rating}★] ${r.author_name}: "${r.text.slice(0, 60)}`.slice(0, 80);
      return !textoYaNotado.has(key);
    });
}

// ── Función principal ──────────────────────────────────────────────────────────

export async function monitorearEmpresas(
  supabase: SupabaseClient,
  googleMapsKey: string
): Promise<MonitorSummary> {
  // 1. Traer todos los leads
  const { data: leads, error } = await supabase
    .from("leads")
    .select(
      "id, nombre, direccion, latitud, longitud, rating, senal_destacada, contexto_completo, notas_interacciones"
    );

  if (error || !leads) {
    return {
      total_revisados: 0,
      total_actualizados: 0,
      total_alertas: 0,
      total_resenas_nuevas: 0,
      total_errores: 1,
      detalles: [{ id: "", nombre: "Supabase", estado: "error", rating_anterior: null, rating_nuevo: null, resenas_negativas_nuevas: 0, notas_agregadas: [], error: error?.message }],
    };
  }

  const rows = leads as LeadMonitor[];
  const detalles: MonitorLeadResult[] = [];
  let totalActualizados = 0;
  let totalAlertas = 0;
  let totalResenasNuevas = 0;
  let totalErrores = 0;

  for (const lead of rows) {
    // Pausa anti-rate-limit (50 rpm Google Maps tier gratuito)
    await new Promise((r) => setTimeout(r, 300));

    const resultado: MonitorLeadResult = {
      id: lead.id,
      nombre: lead.nombre,
      estado: "sin_cambios",
      rating_anterior: lead.rating,
      rating_nuevo: null,
      resenas_negativas_nuevas: 0,
      notas_agregadas: [],
    };

    try {
      // 2. Resolver place_id (contexto → búsqueda)
      let placeId = extractPlaceId(lead.contexto_completo);
      if (!placeId) {
        placeId = await findPlaceId(lead.nombre, lead.direccion, lead.latitud, lead.longitud, googleMapsKey);
      }

      if (!placeId) {
        resultado.estado = "error";
        resultado.error = "No se pudo resolver place_id";
        totalErrores++;
        detalles.push(resultado);
        continue;
      }

      // 3. Traer datos actuales de Maps
      const { rating: ratingNuevo, reviews } = await fetchPlaceData(placeId, googleMapsKey);
      if (ratingNuevo == null) {
        resultado.estado = "error";
        resultado.error = "Google Maps no devolvió rating";
        totalErrores++;
        detalles.push(resultado);
        continue;
      }

      resultado.rating_nuevo = ratingNuevo;

      const ratingAnterior = lead.rating;
      const diff = ratingAnterior != null ? ratingNuevo - ratingAnterior : null;
      const bajóMucho = diff != null && diff < -0.3;
      const subióMucho = diff != null && diff > 0.3;
      const cambioSignificativo = diff == null || Math.abs(diff) >= 0.05;

      const notasActuales: Interaccion[] = lead.notas_interacciones ?? [];
      const notasNuevas: Interaccion[] = [];

      // 4. Alerta por bajada de rating
      if (bajóMucho) {
        const nota: Interaccion = {
          fecha: new Date().toISOString(),
          texto: `⚠️ Rating bajó de ${ratingAnterior!.toFixed(1)}★ a ${ratingNuevo.toFixed(1)}★ en Google Maps`,
          tipo: "nota",
        };
        notasNuevas.push(nota);
        resultado.notas_agregadas.push(nota.texto);
        resultado.estado = "rating_alerta";
        totalAlertas++;
      } else if (subióMucho) {
        const nota: Interaccion = {
          fecha: new Date().toISOString(),
          texto: `✅ Rating subió de ${ratingAnterior!.toFixed(1)}★ a ${ratingNuevo.toFixed(1)}★ en Google Maps`,
          tipo: "nota",
        };
        notasNuevas.push(nota);
        resultado.notas_agregadas.push(nota.texto);
        resultado.estado = "rating_actualizado";
      }

      // 5. Reseñas negativas nuevas
      const resenasNuevas = filtrarResenasNuevas(reviews, notasActuales);
      for (const r of resenasNuevas) {
        const nota: Interaccion = {
          fecha: new Date().toISOString(),
          texto: `[${r.rating}★] ${r.author_name}: "${r.text.slice(0, 280)}"`,
          tipo: "nota",
        };
        notasNuevas.push(nota);
        resultado.notas_agregadas.push(nota.texto);
      }
      resultado.resenas_negativas_nuevas = resenasNuevas.length;
      if (resenasNuevas.length > 0 && resultado.estado === "sin_cambios") {
        resultado.estado = "resenas_negativas";
      }
      totalResenasNuevas += resenasNuevas.length;

      // 6. Construir payload de actualización
      const hayNotas = notasNuevas.length > 0;
      const hayRatingCambio = cambioSignificativo && ratingAnterior !== ratingNuevo;

      if (!hayNotas && !hayRatingCambio) {
        detalles.push(resultado);
        continue;
      }

      const updatePayload: Record<string, unknown> = {};

      if (hayRatingCambio) {
        updatePayload.rating = ratingNuevo;
      }

      if (hayNotas) {
        updatePayload.notas_interacciones = [...notasNuevas, ...notasActuales];
      }

      // Si bajó mucho: actualizar senal_destacada para reflejar urgencia
      if (bajóMucho) {
        const senalBase = lead.senal_destacada ?? "";
        const prefijo = `⚠️ RATING BAJÓ A ${ratingNuevo.toFixed(1)}★ (era ${ratingAnterior!.toFixed(1)}★). `;
        if (!senalBase.startsWith("⚠️ RATING")) {
          updatePayload.senal_destacada = prefijo + senalBase;
        }
      }

      const { error: updateError } = await supabase
        .from("leads")
        .update(updatePayload)
        .eq("id", lead.id);

      if (updateError) {
        resultado.estado = "error";
        resultado.error = updateError.message;
        totalErrores++;
      } else {
        if (resultado.estado === "sin_cambios") resultado.estado = "rating_actualizado";
        totalActualizados++;
      }
    } catch (err) {
      resultado.estado = "error";
      resultado.error = err instanceof Error ? err.message : "Error desconocido";
      totalErrores++;
    }

    detalles.push(resultado);
  }

  return {
    total_revisados: rows.length,
    total_actualizados: totalActualizados,
    total_alertas: totalAlertas,
    total_resenas_nuevas: totalResenasNuevas,
    total_errores: totalErrores,
    detalles,
  };
}

/** Inicializa el cliente Supabase para uso desde el endpoint */
export function buildSupabaseAdmin(): SupabaseClient {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(sbUrl, sbKey);
}
