/**
 * Orquestador — Codflow
 * Punto de entrada único para todos los agentes.
 * No reimplementa lógica: delega a cada agente especializado.
 *
 * Flujos:
 *   nuevo_lead  → Investigador → Analista (secuencial)
 *   monitor     → Monitor de Reputación (batch)
 *   pitch       → Generador de Pitch (por canal)
 *   post_llamada → Agente Post-Llamada (tras guardar nota)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { investigarEmpresa, buildContextoCompleto, type LeadInput } from "./investigador";
import { analizarDolor, type LeadParaAnalisis } from "./analista";
import { monitorearEmpresas } from "./monitor";
import { generarPitch, type CanalPitch, type PitchInput } from "./pitch";
import { procesarPostLlamada, type PostLlamadaInput } from "./post-llamada";

// ── Tipos públicos ────────────────────────────────────────────────────────────

export type AccionOrquestador =
  | "nuevo_lead"
  | "monitor"
  | "pitch"
  | "post_llamada";

export interface OrquestadorParams {
  accion: AccionOrquestador;
  lead_id?: string;
  // pitch
  canal?: CanalPitch;
  contexto_adicional?: string;
  // post_llamada
  nota_nueva?: string;
  tipo_interaccion?: string;
}

export interface PasoEjecutado {
  agente: string;
  ok: boolean;
  duracion_ms: number;
  resumen: string;
  error?: string;
}

export interface OrquestadorResult {
  accion: AccionOrquestador;
  lead_id?: string;
  pasos: PasoEjecutado[];
  payload: unknown;  // resultado final del flujo
  errores_fatales: string[];
  duracion_total_ms: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function timer(): () => number {
  const t0 = Date.now();
  return () => Date.now() - t0;
}

async function fetchLead<T>(
  supabase: SupabaseClient,
  lead_id: string,
  campos: string
): Promise<T> {
  const { data, error } = await supabase
    .from("leads")
    .select(campos)
    .eq("id", lead_id)
    .single();
  if (error || !data) throw new Error(`Lead ${lead_id} no encontrado: ${error?.message}`);
  return data as unknown as T;
}

// ── Flujo: nuevo_lead ─────────────────────────────────────────────────────────
// Investigador → Analista (secuencial; el Analista necesita el contexto del Investigador)

async function flujoNuevoLead(
  supabase: SupabaseClient,
  lead_id: string,
  gmKey: string,
  anthropicKey: string
): Promise<OrquestadorResult> {
  const pasos: PasoEjecutado[] = [];
  const erroresFatales: string[] = [];
  const t0 = Date.now();

  // Paso 1 — Investigador
  const t1 = timer();
  let contextoCompleto = "";
  try {
    const lead = await fetchLead<LeadInput>(
      supabase,
      lead_id,
      "id, nombre, rubro, direccion, telefono, web, rating, latitud, longitud, senal_destacada, tier, contexto_completo"
    );

    // Obtener dolor declarado por el cliente desde la entrevista asociada
    const { data: entrevistaData } = await supabase
      .from("entrevistas")
      .select("dolor_principal")
      .eq("lead_id", lead_id)
      .maybeSingle();
    const dolorDeclarado = entrevistaData?.dolor_principal ?? null;

    const resultado = await investigarEmpresa(lead, gmKey, anthropicKey, dolorDeclarado);
    contextoCompleto = buildContextoCompleto(lead, resultado, dolorDeclarado);

    const updateFields: Record<string, unknown> = { contexto_completo: contextoCompleto };
    if (resultado.info_web) updateFields.info_web = resultado.info_web.slice(0, 4000);
    if (resultado.rating_actual != null) updateFields.rating = resultado.rating_actual;
    if (resultado.dolor_identificado && !resultado.dolor_identificado.startsWith("Error")) {
      updateFields.senal_destacada = resultado.dolor_identificado;
      updateFields.angulo_contacto = resultado.angulo_contacto_sugerido;
    }

    await supabase.from("leads").update(updateFields).eq("id", lead_id);

    pasos.push({
      agente: "investigador",
      ok: true,
      duracion_ms: t1(),
      resumen: `Investigado: zona ${resultado.perfil_zona}, ${resultado.resenas_negativas.length} reseñas negativas, fuentes: ${resultado.fuentes_usadas.join(", ") || "ninguna"}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pasos.push({ agente: "investigador", ok: false, duracion_ms: t1(), resumen: "Falló", error: msg });
    erroresFatales.push(`Investigador: ${msg}`);
    // Sin contexto no podemos analizar — abortar
    return { accion: "nuevo_lead", lead_id, pasos, payload: null, errores_fatales: erroresFatales, duracion_total_ms: Date.now() - t0 };
  }

  // Paso 2 — Analista (lee el contexto que acaba de escribir el Investigador)
  const t2 = timer();
  try {
    const leadParaAnalisis = await fetchLead<LeadParaAnalisis>(
      supabase,
      lead_id,
      "id, nombre, rubro, direccion, rating, tier, puntaje_total, senal_destacada, angulo_contacto, contexto_completo"
    );

    const analisis = await analizarDolor(leadParaAnalisis, anthropicKey);

    await supabase
      .from("leads")
      .update({
        senal_destacada: analisis.senal_destacada,
        angulo_contacto: analisis.angulo_contacto,
      })
      .eq("id", lead_id);

    pasos.push({
      agente: "analista",
      ok: true,
      duracion_ms: t2(),
      resumen: `Análisis completado. Calidad contexto: ${analisis.calidad_contexto}${analisis.advertencias.length ? ` | ⚠ ${analisis.advertencias.join(", ")}` : ""}`,
    });

    return {
      accion: "nuevo_lead",
      lead_id,
      pasos,
      payload: {
        senal_destacada: analisis.senal_destacada,
        angulo_contacto: analisis.angulo_contacto,
        calidad_contexto: analisis.calidad_contexto,
      },
      errores_fatales: erroresFatales,
      duracion_total_ms: Date.now() - t0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pasos.push({ agente: "analista", ok: false, duracion_ms: t2(), resumen: "Falló", error: msg });
    return {
      accion: "nuevo_lead",
      lead_id,
      pasos,
      payload: { contexto_completo: contextoCompleto.slice(0, 200) },
      errores_fatales: [...erroresFatales, `Analista: ${msg}`],
      duracion_total_ms: Date.now() - t0,
    };
  }
}

// ── Flujo: monitor ────────────────────────────────────────────────────────────

async function flujoMonitor(
  supabase: SupabaseClient,
  gmKey: string
): Promise<OrquestadorResult> {
  const pasos: PasoEjecutado[] = [];
  const t0 = Date.now();
  const t1 = timer();

  try {
    const summary = await monitorearEmpresas(supabase, gmKey);
    pasos.push({
      agente: "monitor",
      ok: true,
      duracion_ms: t1(),
      resumen: `${summary.total_revisados} revisados, ${summary.total_alertas} alertas, ${summary.total_resenas_nuevas} reseñas nuevas, ${summary.total_errores} errores`,
    });
    return { accion: "monitor", pasos, payload: summary, errores_fatales: [], duracion_total_ms: Date.now() - t0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pasos.push({ agente: "monitor", ok: false, duracion_ms: t1(), resumen: "Falló", error: msg });
    return { accion: "monitor", pasos, payload: null, errores_fatales: [msg], duracion_total_ms: Date.now() - t0 };
  }
}

// ── Flujo: pitch ──────────────────────────────────────────────────────────────

async function flujopitch(
  supabase: SupabaseClient,
  lead_id: string,
  canal: CanalPitch,
  anthropicKey: string,
  contexto_adicional?: string
): Promise<OrquestadorResult> {
  const pasos: PasoEjecutado[] = [];
  const t0 = Date.now();
  const t1 = timer();

  interface LeadPitch {
    nombre: string; rubro: string | null;
    senal_destacada: string | null; angulo_contacto: string | null;
    contexto_completo: unknown;
    notas_interacciones: Array<{ fecha: string; texto: string; tipo?: string }> | null;
  }

  try {
    const lead = await fetchLead<LeadPitch>(
      supabase,
      lead_id,
      "id, nombre, rubro, senal_destacada, angulo_contacto, contexto_completo, notas_interacciones"
    );

    const input: PitchInput = {
      lead_id,
      nombre: lead.nombre,
      rubro: lead.rubro,
      senal_destacada: lead.senal_destacada,
      angulo_contacto: lead.angulo_contacto,
      contexto_completo: lead.contexto_completo,
      notas_interacciones: lead.notas_interacciones ?? [],
      canal,
      contexto_adicional,
    };

    const result = await generarPitch(input, anthropicKey);
    pasos.push({
      agente: "pitch",
      ok: true,
      duracion_ms: t1(),
      resumen: `Mensaje generado para canal ${canal} (${result.tono_usado})`,
    });

    return { accion: "pitch", lead_id, pasos, payload: result, errores_fatales: [], duracion_total_ms: Date.now() - t0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pasos.push({ agente: "pitch", ok: false, duracion_ms: t1(), resumen: "Falló", error: msg });
    return { accion: "pitch", lead_id, pasos, payload: null, errores_fatales: [msg], duracion_total_ms: Date.now() - t0 };
  }
}

// ── Flujo: post_llamada ───────────────────────────────────────────────────────

async function flujoPostLlamada(
  supabase: SupabaseClient,
  lead_id: string,
  nota_nueva: string,
  tipo_interaccion: string,
  anthropicKey: string
): Promise<OrquestadorResult> {
  const pasos: PasoEjecutado[] = [];
  const t0 = Date.now();
  const t1 = timer();

  interface LeadPostLlamada {
    nombre: string; rubro: string | null;
    senal_destacada: string | null; angulo_contacto: string | null;
    contexto_completo: unknown;
    notas_interacciones: Array<{ fecha: string; texto: string; tipo?: string }> | null;
    fecha_proximo_seguimiento: string | null;
  }

  try {
    const lead = await fetchLead<LeadPostLlamada>(
      supabase,
      lead_id,
      "id, nombre, rubro, senal_destacada, angulo_contacto, contexto_completo, notas_interacciones, fecha_proximo_seguimiento"
    );

    const input: PostLlamadaInput = {
      lead_id,
      nombre: lead.nombre,
      rubro: lead.rubro,
      senal_destacada: lead.senal_destacada,
      angulo_contacto: lead.angulo_contacto,
      contexto_completo: lead.contexto_completo,
      notas_interacciones: lead.notas_interacciones ?? [],
      nota_nueva,
      tipo_interaccion,
      fecha_proximo_seguimiento: lead.fecha_proximo_seguimiento,
    };

    const result = await procesarPostLlamada(input, anthropicKey);

    // Persistir nota automática + fecha sugerida + estado
    const notaAgente = {
      fecha: new Date().toISOString(),
      texto: result.nota_automatica,
      tipo: "nota",
    };
    const notasActualizadas = [notaAgente, ...(lead.notas_interacciones ?? [])];
    const updatePayload: Record<string, unknown> = {
      fecha_proximo_seguimiento: result.fecha_sugerida,
      notas_interacciones: notasActualizadas,
    };
    if (result.actualizar_estado) updatePayload.estado = result.actualizar_estado;
    await supabase.from("leads").update(updatePayload).eq("id", lead_id);

    pasos.push({
      agente: "post_llamada",
      ok: true,
      duracion_ms: t1(),
      resumen: `Situación: ${result.situacion}. Seguimiento en ${result.dias_recomendados} días (${result.fecha_sugerida})`,
    });

    return {
      accion: "post_llamada",
      lead_id,
      pasos,
      payload: { ...result, notas_actualizadas: notasActualizadas },
      errores_fatales: [],
      duracion_total_ms: Date.now() - t0,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    pasos.push({ agente: "post_llamada", ok: false, duracion_ms: t1(), resumen: "Falló", error: msg });
    return { accion: "post_llamada", lead_id, pasos, payload: null, errores_fatales: [msg], duracion_total_ms: Date.now() - t0 };
  }
}

// ── Punto de entrada ──────────────────────────────────────────────────────────

export async function orquestar(params: OrquestadorParams): Promise<OrquestadorResult> {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const gmKey = process.env.GOOGLE_MAPS_API_KEY!;
  const anthropicKey = process.env.ANTHROPIC_API_KEY!;

  const supabase = createClient(sbUrl, sbKey);

  switch (params.accion) {
    case "nuevo_lead": {
      if (!params.lead_id) throw new Error("nuevo_lead requiere lead_id");
      return flujoNuevoLead(supabase, params.lead_id, gmKey, anthropicKey);
    }

    case "monitor": {
      return flujoMonitor(supabase, gmKey);
    }

    case "pitch": {
      if (!params.lead_id) throw new Error("pitch requiere lead_id");
      if (!params.canal) throw new Error("pitch requiere canal");
      return flujopitch(supabase, params.lead_id, params.canal, anthropicKey, params.contexto_adicional);
    }

    case "post_llamada": {
      if (!params.lead_id) throw new Error("post_llamada requiere lead_id");
      if (!params.nota_nueva) throw new Error("post_llamada requiere nota_nueva");
      return flujoPostLlamada(
        supabase,
        params.lead_id,
        params.nota_nueva,
        params.tipo_interaccion ?? "nota",
        anthropicKey
      );
    }

    default: {
      const accionInvalida = (params as { accion: string }).accion;
      throw new Error(`Acción desconocida: ${accionInvalida}`);
    }
  }
}

/**
 * Detecta leads sin contexto_completo y los encola para investigación.
 * Usado en el flujo automático (cron / webhook de Supabase).
 */
export async function detectarLeadsSinContexto(supabase: SupabaseClient): Promise<string[]> {
  const { data } = await supabase
    .from("leads")
    .select("id")
    .or("contexto_completo.is.null,contexto_completo.eq.");
  return (data ?? []).map((r: { id: string }) => r.id);
}
