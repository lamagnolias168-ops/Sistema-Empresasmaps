import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generarPitch, type CanalPitch, type PitchInput } from "@/agents/pitch";

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

  let body: { lead_id?: string; canal?: string; contexto_adicional?: string };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (!body.lead_id) return NextResponse.json({ error: "lead_id requerido." }, { status: 400 });
  if (!body.canal) return NextResponse.json({ error: "canal requerido (whatsapp|email|llamada)." }, { status: 400 });

  const canal = body.canal as CanalPitch;
  if (!["whatsapp", "email", "llamada"].includes(canal)) {
    return NextResponse.json({ error: "canal inválido. Usa: whatsapp | email | llamada" }, { status: 400 });
  }

  const supabase = createClient(sbUrl, sbKey);

  const { data: lead, error: fetchError } = await supabase
    .from("leads")
    .select("id, nombre, rubro, senal_destacada, angulo_contacto, contexto_completo, notas_interacciones")
    .eq("id", body.lead_id)
    .single();

  if (fetchError || !lead) {
    return NextResponse.json(
      { error: `Lead no encontrado: ${fetchError?.message ?? "sin datos"}` },
      { status: 404 }
    );
  }

  const input: PitchInput = {
    lead_id: lead.id,
    nombre: lead.nombre,
    rubro: lead.rubro,
    senal_destacada: lead.senal_destacada,
    angulo_contacto: lead.angulo_contacto,
    contexto_completo: lead.contexto_completo,
    notas_interacciones: lead.notas_interacciones,
    canal,
    contexto_adicional: body.contexto_adicional,
  };

  const result = await generarPitch(input, anthropicKey);
  return NextResponse.json(result);
}
