import { NextRequest, NextResponse } from "next/server";
import { orquestar, detectarLeadsSinContexto, type OrquestadorParams } from "@/agents/orquestador";
import { createClient } from "@supabase/supabase-js";

// Validación de variables críticas
function checkEnv(): string | null {
  const needed = ["NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"];
  const missing = needed.filter((k) => !process.env[k]);
  return missing.length ? `Faltan variables: ${missing.join(", ")}` : null;
}

// ── POST /api/orquestador ─────────────────────────────────────────────────────
// Punto de entrada único para todos los flujos de agentes.

export async function POST(req: NextRequest) {
  const envError = checkEnv();
  if (envError) return NextResponse.json({ error: envError }, { status: 500 });

  let params: OrquestadorParams;
  try {
    params = await req.json() as OrquestadorParams;
  } catch {
    return NextResponse.json({ error: "Body JSON inválido." }, { status: 400 });
  }

  if (!params.accion) {
    return NextResponse.json(
      { error: "accion requerida: nuevo_lead | monitor | pitch | post_llamada" },
      { status: 400 }
    );
  }

  // Validaciones por acción
  if (params.accion === "nuevo_lead" && !params.lead_id) {
    return NextResponse.json({ error: "nuevo_lead requiere lead_id." }, { status: 400 });
  }
  if (params.accion === "pitch" && (!params.lead_id || !params.canal)) {
    return NextResponse.json({ error: "pitch requiere lead_id y canal." }, { status: 400 });
  }
  if (params.accion === "post_llamada" && (!params.lead_id || !params.nota_nueva)) {
    return NextResponse.json({ error: "post_llamada requiere lead_id y nota_nueva." }, { status: 400 });
  }

  try {
    const result = await orquestar(params);
    const status = result.errores_fatales.length > 0 ? 207 : 200; // 207 = éxito parcial
    return NextResponse.json(result, { status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET /api/orquestador?accion=pendientes ────────────────────────────────────
// Devuelve leads sin contexto_completo para disparar flujo nuevo_lead desde el dashboard.

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const accion = searchParams.get("accion");

  if (accion !== "pendientes") {
    return NextResponse.json({ error: "accion GET soportada: ?accion=pendientes" }, { status: 400 });
  }

  const envError = checkEnv();
  if (envError) return NextResponse.json({ error: envError }, { status: 500 });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const ids = await detectarLeadsSinContexto(supabase);
  return NextResponse.json({ pendientes: ids, total: ids.length });
}
