import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { procesarPostLlamada, type PostLlamadaInput } from "@/agents/post-llamada";

export async function POST(req: NextRequest) {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: "Faltan variables de entorno de Supabase." }, { status: 500 });
  }
  if (!anthropicKey) {
    return NextResponse.json({ error: "Falta ANTHROPIC_API_KEY." }, { status: 500 });
  }

  let body: { lead_id?: string; nota_nueva?: string; tipo_interaccion?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (!body.lead_id) return NextResponse.json({ error: "lead_id requerido." }, { status: 400 });
  if (!body.nota_nueva) return NextResponse.json({ error: "nota_nueva requerida." }, { status: 400 });

  const supabase = createClient(sbUrl, sbKey);

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, nombre, rubro, senal_destacada, angulo_contacto, contexto_completo, notas_interacciones, fecha_proximo_seguimiento"
    )
    .eq("id", body.lead_id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json(
      { error: `Lead no encontrado: ${fetchError?.message ?? "sin datos"}` },
      { status: 404 }
    );
  }

  const input: PostLlamadaInput = {
    lead_id: lead.id,
    nombre: lead.nombre,
    rubro: lead.rubro,
    senal_destacada: lead.senal_destacada,
    angulo_contacto: lead.angulo_contacto,
    contexto_completo: lead.contexto_completo,
    notas_interacciones: lead.notas_interacciones ?? [],
    nota_nueva: body.nota_nueva,
    tipo_interaccion: body.tipo_interaccion ?? "nota",
    fecha_proximo_seguimiento: lead.fecha_proximo_seguimiento,
  };

  const resultado = await procesarPostLlamada(input, anthropicKey);

  // Construir nota automática como entrada en notas_interacciones
  const notaAgente = {
    fecha: new Date().toISOString(),
    texto: resultado.nota_automatica,
    tipo: "nota",
  };

  const notasActuales = (lead.notas_interacciones ?? []) as Array<{ fecha: string; texto: string; tipo?: string }>;
  const notasActualizadas = [notaAgente, ...notasActuales];

  // Actualizar Supabase: fecha_proximo_seguimiento + nota automática + estado si aplica
  const updatePayload: Record<string, unknown> = {
    fecha_proximo_seguimiento: resultado.fecha_sugerida,
    notas_interacciones: notasActualizadas,
  };
  if (resultado.actualizar_estado) {
    updatePayload.estado = resultado.actualizar_estado;
  }

  const { error: updateError } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("id", body.lead_id);

  if (updateError) {
    return NextResponse.json(
      { error: `Error al actualizar Supabase: ${updateError.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    situacion: resultado.situacion,
    proximo_paso: resultado.proximo_paso,
    fecha_sugerida: resultado.fecha_sugerida,
    dias_recomendados: resultado.dias_recomendados,
    mensaje_seguimiento: resultado.mensaje_seguimiento,
    nota_automatica: resultado.nota_automatica,
    actualizar_estado: resultado.actualizar_estado,
    advertencias: resultado.advertencias,
    // Para que el cliente pueda actualizar su estado local sin recargar
    notas_actualizadas: notasActualizadas,
  });
}
