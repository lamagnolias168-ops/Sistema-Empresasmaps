import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

interface EntrevistaPayload {
  empresa: string;
  rubro: string;
  zona: string;
  problema: string;
  objetivos: string;
  competidores: string;
  presupuesto: string;
  contacto: {
    nombre: string;
    cargo: string;
    canal: string;
    valor: string;
    cuando: string;
  };
  respuestas_completas: Record<string, unknown>;
  anios_operando: string;
  empleados: string;
  web: string | null;
  sucursales: string;
  zonas_clientes: string[];
  problemas_intentados: string;
}

export async function POST(req: NextRequest) {
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: "Faltan variables de entorno." }, { status: 500 });
  }

  let body: EntrevistaPayload;
  try {
    body = await req.json() as EntrevistaPayload;
  } catch {
    return NextResponse.json({ error: "Body inválido." }, { status: 400 });
  }

  const supabase = createClient(sbUrl, sbKey);

  // 1. Guardar entrevista con la estructura nueva de columnas
  const { data: entrevista, error: entrevistaError } = await supabase
    .from("entrevistas")
    .insert({
      empresa:               body.empresa,
      rubro:                 body.rubro,
      zona:                  body.zona,
      empleados:             body.empleados,
      antiguedad:            body.anios_operando,
      tiene_web:             body.web !== null,
      url_web:               body.web ?? null,
      sucursales:            body.sucursales,
      zonas_clientes:        body.zonas_clientes.join(", "),
      dolor_principal:       body.problema,
      herramientas_actuales: body.problemas_intentados,
      competidores:          body.competidores,
      objetivo_3_meses:      body.objetivos,
      presupuesto:           body.presupuesto,
      contacto_nombre:       body.contacto.nombre,
      contacto_cargo:        body.contacto.cargo,
      contacto_canal:        body.contacto.canal,
      contacto_dato:         body.contacto.valor,
      contacto_fecha:        body.contacto.cuando,
      respuestas_completas:  body.respuestas_completas,
    })
    .select("id")
    .single();

  if (entrevistaError) {
    return NextResponse.json({ error: entrevistaError.message }, { status: 500 });
  }

  // 2. Crear lead en tabla leads
  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .insert({
      nombre:           body.empresa,
      rubro:            body.rubro,
      direccion:        body.zona,
      web:              body.web || null,
      senal_destacada:  body.problema,
      angulo_contacto:  body.objetivos,
      tier:             "NUEVO",
      puntaje_total:    0,
      estado:           "por_contactar",
    })
    .select("id")
    .single();

  if (leadError) {
    return NextResponse.json(
      { error: `Entrevista guardada pero lead falló: ${leadError.message}` },
      { status: 500 }
    );
  }

  // 3. Vincular entrevista → lead
  await supabase
    .from("entrevistas")
    .update({ lead_id: lead.id })
    .eq("id", entrevista.id);

  // 4. Disparar Investigador en background (sin await)
  const origin = req.headers.get("origin") ?? req.nextUrl.origin;
  fetch(`${origin}/api/orquestador`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accion: "nuevo_lead", lead_id: lead.id }),
  }).catch(() => {});

  return NextResponse.json({
    ok: true,
    entrevista_id: entrevista.id,
    lead_id: lead.id,
  });
}
