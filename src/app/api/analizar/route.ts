import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { analizarDolor, type LeadParaAnalisis } from "@/agents/analista";

export async function POST(req: NextRequest) {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (!sbUrl || !sbKey) {
    return NextResponse.json(
      { error: "Faltan SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL." },
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

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select(
      "id, nombre, rubro, direccion, rating, tier, puntaje_total, senal_destacada, angulo_contacto, contexto_completo"
    )
    .eq("id", body.lead_id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json(
      { error: `Lead no encontrado: ${fetchError?.message ?? "sin datos"}` },
      { status: 404 }
    );
  }

  const resultado = await analizarDolor(lead as LeadParaAnalisis, anthropicKey);

  // Solo actualizar si los campos no son genéricos
  const { error: updateError } = await supabase
    .from("leads")
    .update({
      senal_destacada: resultado.senal_destacada,
      angulo_contacto: resultado.angulo_contacto,
    })
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
    senal_destacada: resultado.senal_destacada,
    angulo_contacto: resultado.angulo_contacto,
    razonamiento: resultado.razonamiento,
    calidad_contexto: resultado.calidad_contexto,
    advertencias: resultado.advertencias,
  });
}
