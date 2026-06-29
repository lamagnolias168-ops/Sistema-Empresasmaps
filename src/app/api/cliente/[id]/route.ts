import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) {
    return NextResponse.json({ error: "Config error" }, { status: 500 });
  }

  const supabase = createClient(sbUrl, sbKey);

  const { data: entrevista, error: eError } = await supabase
    .from("entrevistas")
    .select("*")
    .eq("id", id)
    .single();

  if (eError || !entrevista) {
    return NextResponse.json({ error: "Entrevista no encontrada" }, { status: 404 });
  }

  let lead = null;
  if (entrevista.lead_id) {
    const { data } = await supabase
      .from("leads")
      .select("*")
      .eq("id", entrevista.lead_id)
      .single();
    lead = data;
  }

  return NextResponse.json({ entrevista, lead });
}
