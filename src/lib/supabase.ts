import { createClient } from "@supabase/supabase-js";
import type { Lead } from "@/types/lead";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY. Defínelas en .env.local."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
