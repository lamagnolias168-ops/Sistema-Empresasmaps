export type Tier = "alto" | "medio" | "bajo";

export interface Interaccion {
  fecha: string;   // ISO string
  texto: string;
  tipo?: string;
}

export interface Lead {
  id: string;
  nombre: string;
  rubro: string | null;
  fuente: string | null;
  web: string | null;
  telefono: string | null;
  direccion: string | null;
  rating: number | null;
  latitud: number | null;
  longitud: number | null;
  senal_destacada: string | null;
  punt_necesidad: number | null;
  punt_capacidad: number | null;
  punt_competencia: number | null;
  punt_madurez: number | null;
  punt_fit_datos: number | null;
  puntaje_total: number | null;
  tier: string | null;
  razon: string | null;
  angulo_contacto: string | null;
  estado: string | null;
  contexto_completo: unknown;
  notas_interacciones: Interaccion[] | null;
  fecha_proximo_seguimiento: string | null;
  created_at: string;
}
