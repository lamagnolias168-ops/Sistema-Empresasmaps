import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  investigarEmpresa,
  buildContextoCompleto,
  type LeadInput,
} from "@/agents/investigador";

export async function POST(req: NextRequest) {
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!gmKey || !sbUrl || !sbKey) {
    return NextResponse.json(
      { error: "Faltan GOOGLE_MAPS_API_KEY, SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL." },
      { status: 500 }
    );
  }
  if (!anthropicKey) {
    return NextResponse.json(
      { error: "Falta ANTHROPIC_API_KEY en las variables de entorno de Vercel." },
      { status: 500 }
    );
  }

  let body: { lead_id?: string };
  try {
    body = (await req.json()) as { lead_id?: string };
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (!body.lead_id) {
    return NextResponse.json({ error: "lead_id requerido." }, { status: 400 });
  }

  const supabase = createClient(sbUrl, sbKey);

  // Traer el lead
  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, nombre, rubro, direccion, telefono, web, rating, latitud, longitud, senal_destacada, tier, contexto_completo"
    )
    .eq("id", body.lead_id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json(
      { error: `Lead no encontrado: ${fetchError?.message ?? "sin datos"}` },
      { status: 404 }
    );
  }

  // Investigar
  const resultado = await investigarEmpresa(lead as LeadInput, gmKey, anthropicKey);
  const contextoCompleto = buildContextoCompleto(lead as LeadInput, resultado);

  // Actualizar Supabase
  const updateFields: Record<string, unknown> = {
    contexto_completo: contextoCompleto,
  };
  if (resultado.info_web) {
    updateFields.info_web = resultado.info_web.slice(0, 4000);
  }
  if (resultado.rating_actual != null) {
    updateFields.rating = resultado.rating_actual;
  }
  if (
    resultado.dolor_identificado &&
    resultado.dolor_identificado !== "No disponible" &&
    !resultado.dolor_identificado.startsWith("Error")
  ) {
    updateFields.senal_destacada = resultado.dolor_identificado;
    updateFields.angulo_contacto = resultado.angulo_contacto_sugerido;
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(updateFields)
    .eq("id", body.lead_id);

  if (updateError) {
    return NextResponse.json(
      { error: `Error al guardar en Supabase: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    nombre: lead.nombre,
    perfil_zona: resultado.perfil_zona,
    dolor_identificado: resultado.dolor_identificado,
    angulo_contacto_sugerido: resultado.angulo_contacto_sugerido,
    rating_actual: resultado.rating_actual,
    resenas_negativas: resultado.resenas_negativas.length,
    resenas_positivas: resultado.resenas_positivas.length,
    fuentes_usadas: resultado.fuentes_usadas,
    errores: resultado.errores,
    campos_actualizados: Object.keys(updateFields),
  });
}
