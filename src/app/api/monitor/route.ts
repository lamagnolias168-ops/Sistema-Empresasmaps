import { NextResponse } from "next/server";
import { monitorearEmpresas, buildSupabaseAdmin } from "@/agents/monitor";

export async function POST() {
  const gmKey = process.env.GOOGLE_MAPS_API_KEY;
  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!gmKey || !sbUrl || !sbKey) {
    return NextResponse.json({ error: "Faltan variables de entorno." }, { status: 500 });
  }

  const supabase = buildSupabaseAdmin();
  const summary = await monitorearEmpresas(supabase, gmKey);

  return NextResponse.json(summary);
}
