/**
 * Agente Post-Llamada — Codflow
 * Se dispara automáticamente al guardar una nota en el CRM.
 * Analiza qué pasó, sugiere el próximo paso y prefilla la fecha de seguimiento.
 *
 * El vendedor escribe lo que pasó — el agente decide qué hacer después.
 */

export interface Interaccion {
  fecha: string;
  texto: string;
  tipo?: string;
}

export interface PostLlamadaInput {
  lead_id: string;
  nombre: string;
  rubro: string | null;
  senal_destacada: string | null;
  angulo_contacto: string | null;
  contexto_completo: unknown;
  notas_interacciones: Interaccion[];
  nota_nueva: string;
  tipo_interaccion: string;
  fecha_proximo_seguimiento: string | null;
}

export type SituacionDetectada =
  | "objecion_precio"
  | "objecion_tiempo"
  | "objecion_necesidad"
  | "no_contesto"
  | "buzon_correo"
  | "interes_confirmado"
  | "pidio_informacion"
  | "reunion_agendada"
  | "rechazo_definitivo"
  | "seguimiento_neutro";

export interface PostLlamadaResult {
  situacion: SituacionDetectada;
  proximo_paso: string;
  dias_recomendados: number;
  fecha_sugerida: string;
  nota_automatica: string;
  mensaje_seguimiento: string;
  actualizar_estado?: string;
  advertencias: string[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function extractTexto(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const o = raw as Record<string, unknown>;
    if (typeof o.value === "string") return o.value;
  }
  return "";
}

function addDaysToToday(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function resumirHistorialReciente(notas: Interaccion[], excluirPrimera: boolean): string {
  const relevantes = excluirPrimera ? notas.slice(1, 5) : notas.slice(0, 5);
  if (!relevantes.length) return "(sin interacciones previas)";
  return relevantes
    .map((n) => {
      const fecha = new Date(n.fecha).toLocaleDateString("es-PA", { day: "numeric", month: "short" });
      return `[${fecha}] ${n.tipo ?? "nota"}: ${n.texto.slice(0, 150)}`;
    })
    .join("\n");
}

// ── Reglas rápidas (sin IA) para casos obvios ──────────────────────────────────

function deteccionRapida(nota: string): SituacionDetectada | null {
  const n = nota.toLowerCase();
  if (/no contest[oó]|nadie atendi[oó]|tim[eo]d out|voicemail|buz[oó]n/.test(n)) return "no_contesto";
  if (/buzon|buz[oó]n de voz|dej[eé] mensaje/.test(n)) return "buzon_correo";
  if (/reuni[oó]n agendada|cita confirmada|agend[eé]|confirm[oó] reuni[oó]n/.test(n)) return "reunion_agendada";
  if (/rechazo|no le interesa|no necesita|cerr[oó] la puerta|definitivamente no/.test(n)) return "rechazo_definitivo";
  return null;
}

// ── Configuración de respuesta por situación ──────────────────────────────────

const SITUACION_CONFIG: Record<
  SituacionDetectada,
  { dias: number; estado?: string }
> = {
  no_contesto:         { dias: 3 },
  buzon_correo:        { dias: 2 },
  objecion_precio:     { dias: 14 },
  objecion_tiempo:     { dias: 21 },
  objecion_necesidad:  { dias: 30 },
  interes_confirmado:  { dias: 2,  estado: "contactado" },
  pidio_informacion:   { dias: 1,  estado: "contactado" },
  reunion_agendada:    { dias: 1,  estado: "reunion_agendada" },
  rechazo_definitivo:  { dias: 90, estado: "descartado" },
  seguimiento_neutro:  { dias: 7 },
};

// ── Función principal ──────────────────────────────────────────────────────────

export async function procesarPostLlamada(
  input: PostLlamadaInput,
  anthropicKey: string
): Promise<PostLlamadaResult> {
  const advertencias: string[] = [];
  const contextoTexto = extractTexto(input.contexto_completo);
  const historialTexto = resumirHistorialReciente(input.notas_interacciones, true);

  // Detección rápida para casos obvios (no gasta tokens)
  const situacionRapida = deteccionRapida(input.nota_nueva);

  const prompt = `Eres el sistema de análisis post-interacción de Codflow, CRM de prospección B2B en Panamá.

Un vendedor acaba de registrar esta nota tras una interacción:

NOTA DEL VENDEDOR: "${input.nota_nueva}"
TIPO DE INTERACCIÓN: ${input.tipo_interaccion}
EMPRESA: ${input.nombre} (${input.rubro ?? "rubro desconocido"})
SEÑAL DE DOLOR: ${input.senal_destacada ?? "(no disponible)"}
ÁNGULO BASE: ${input.angulo_contacto ?? "(no disponible)"}

HISTORIAL PREVIO (últimas 4 interacciones, sin contar la nueva):
${historialTexto}

CONTEXTO COMPLETO:
${contextoTexto.slice(0, 2000) || "(no disponible)"}

---

TAREA: analiza la nota y genera el plan de seguimiento.

Responde SOLO en JSON válido:
{
  "situacion": "<una de: objecion_precio | objecion_tiempo | objecion_necesidad | no_contesto | buzon_correo | interes_confirmado | pidio_informacion | reunion_agendada | rechazo_definitivo | seguimiento_neutro>",
  "proximo_paso": "<qué debe hacer el vendedor — acción concreta y específica, 1 oración>",
  "dias_recomendados": <número entero — cuántos días esperar antes del siguiente contacto>,
  "nota_automatica": "<nota que se añadirá al historial del CRM — empieza con '🤖 Análisis:' — 2-3 oraciones describiendo qué pasó y qué sugiere el sistema>",
  "mensaje_seguimiento": "<mensaje prellenado para el próximo contacto — adaptado a la situación, listo para copiar y usar>",
  "actualizar_estado": "<opcional: nuevo estado del lead si corresponde — contactado | reunion_agendada | descartado | null>"
}

REGLAS:
- Si el vendedor dice que no contestaron → situacion: "no_contesto", dias_recomendados: 3
- Si mencionan objeción de presupuesto → "objecion_precio", días 14
- Si dijeron "ahora no, más adelante" → "objecion_tiempo", días 21
- Si confirmaron reunión → "reunion_agendada", días 1, actualizar_estado: "reunion_agendada"
- Si pidieron información específica → "pidio_informacion", días 1
- Si mostraron interés claro → "interes_confirmado", días 2
- Si rechazaron definitivamente → "rechazo_definitivo", días 90, actualizar_estado: "descartado"
- El mensaje_seguimiento debe ser específico al contexto — no genérico. Debe tener en cuenta la objeción o situación detectada.
- Si hay historial previo, la nota_automatica debe mencionarlo (ej: "es el 3er intento sin respuesta").`;

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 700,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      return fallback(input, situacionRapida, advertencias, `API ${res.status}`);
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = data.content?.[0]?.text?.trim() ?? "";
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      return fallback(input, situacionRapida, advertencias, "Respuesta no era JSON");
    }

    const parsed = JSON.parse(match[0]) as {
      situacion?: string;
      proximo_paso?: string;
      dias_recomendados?: number;
      nota_automatica?: string;
      mensaje_seguimiento?: string;
      actualizar_estado?: string | null;
    };

    const situacion = (parsed.situacion ?? situacionRapida ?? "seguimiento_neutro") as SituacionDetectada;
    const config = SITUACION_CONFIG[situacion] ?? SITUACION_CONFIG.seguimiento_neutro;
    const dias = parsed.dias_recomendados ?? config.dias;

    return {
      situacion,
      proximo_paso: parsed.proximo_paso ?? "Hacer seguimiento según el contexto.",
      dias_recomendados: dias,
      fecha_sugerida: addDaysToToday(dias),
      nota_automatica: parsed.nota_automatica ?? `🤖 Análisis: situación detectada — ${situacion}. Próximo contacto en ${dias} días.`,
      mensaje_seguimiento: parsed.mensaje_seguimiento ?? "",
      actualizar_estado: parsed.actualizar_estado ?? config.estado ?? undefined,
      advertencias,
    };
  } catch (err) {
    return fallback(input, situacionRapida, advertencias, err instanceof Error ? err.message : "Error desconocido");
  }
}

// ── Fallback sin IA ───────────────────────────────────────────────────────────

function fallback(
  input: PostLlamadaInput,
  situacionRapida: SituacionDetectada | null,
  advertencias: string[],
  errorMsg: string
): PostLlamadaResult {
  advertencias.push(`IA no disponible: ${errorMsg}. Usando reglas básicas.`);
  const situacion = situacionRapida ?? "seguimiento_neutro";
  const config = SITUACION_CONFIG[situacion];
  const dias = config.dias;

  return {
    situacion,
    proximo_paso: situacion === "no_contesto"
      ? "Reintentar llamada en 3 días, preferiblemente a otra hora."
      : "Hacer seguimiento según el contexto de la interacción.",
    dias_recomendados: dias,
    fecha_sugerida: addDaysToToday(dias),
    nota_automatica: `🤖 Análisis (sin IA): situación detectada — ${situacion}. Próximo contacto sugerido en ${dias} días.`,
    mensaje_seguimiento: `Hola, retomando nuestra conversación sobre ${input.nombre}. ¿Podemos coordinar unos minutos esta semana?`,
    actualizar_estado: config.estado,
    advertencias,
  };
}
