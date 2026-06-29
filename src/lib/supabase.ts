import { createClient } from "@supabase/supabase-js";
import type { Interaccion, Lead } from "@/types/lead";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Defínelas en .env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: (url, options = {}) => fetch(url, { ...options, cache: "no-store" }) },
});

export async function fetchLeads(): Promise<Lead[]> {
const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("puntaje_total", { ascending: false, nullsFirst: false });

  if (error) {
    throw new Error(`Error al leer leads de Supabase: ${error.message}`);
  }

  return data ?? [];
}

export async function updateLeadEstado(id: string, estado: string): Promise<void> {
  const { error } = await supabase.from("leads").update({ estado }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateLeadCrm(
  id: string,
  fields: {
    estado?: string;
    notas_interacciones?: Interaccion[];
    fecha_proximo_seguimiento?: string | null;
  }
): Promise<void> {
  const { error } = await supabase.from("leads").update(fields).eq("id", id);
  if (error) throw new Error(error.message);
}
