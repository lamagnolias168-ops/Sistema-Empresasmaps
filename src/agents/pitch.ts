/**
 * Agente Pitch — Codflow
 * Genera mensajes de contacto personalizados por canal (WhatsApp / Email / Llamada).
 * Lee el contexto completo de la empresa y adapta el tono, extensión y contenido.
 *
 * Mejoras clave sobre los mensajes estáticos anteriores:
 * - Usa senal_destacada, angulo_contacto, contexto_completo Y notas_interacciones
 * - Adapta el mensaje si ya hubo contacto previo (no repite lo mismo)
 * - Produce output diferente por canal (longitud, estructura, tono)
 */

export type CanalPitch = "whatsapp" | "email" | "llamada";

export interface PitchInput {
  lead_id: string;
  nombre: string;
  rubro: string | null;
  senal_destacada: string | null;
  angulo_contacto: string | null;
  contexto_completo: unknown;
  notas_interacciones: Array<{ fecha: string; texto: string; tipo?: string }> | null;
  canal: CanalPitch;
  contexto_adicional?: string;
}

export interface PitchResult {
  canal: CanalPitch;
  // WhatsApp
  mensaje_whatsapp?: string;
  // Email
  asunto?: string;
  cuerpo_email?: string;
  // Llamada
  script_llamada?: string;
  // Metadata
  tono_usado: string;
  hay_historial: boolean;
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

function resumirHistorial(
  notas: Array<{ fecha: string; texto: string; tipo?: string }> | null
): string {
  if (!notas || notas.length === 0) return "(sin contacto previo)";
  const recientes = notas.slice(0, 5);
  return recientes
    .map((n) => {
      const fecha = new Date(n.fecha).toLocaleDateString("es-PA", {
        day: "numeric",
        month: "short",
      });
      return `${fecha}: ${n.texto.slice(0, 120)}`;
    })
    .join("\n");
}

// ── Prompts por canal ─────────────────────────────────────────────────────────

function buildPrompt(input: PitchInput, contextoTexto: string, historialTexto: string): string {
  const hayHistorial = input.notas_interacciones && input.notas_interacciones.length > 0;

  const instruccionesCanal: Record<CanalPitch, string> = {
    whatsapp: `CANAL: WhatsApp
REGLAS ESTRICTAS:
- Máximo 3-4 oraciones. Debe caber en un preview de WhatsApp sin hacer scroll.
- Primera oración: saludo + quién eres (Codflow) + un dato específico de la empresa que demuestre que hiciste tarea.
- Segunda/tercera oración: el dolor real o el ángulo de valor — sin vender, sin prometer.
- Última oración: una sola pregunta abierta o propuesta concreta (ej: "¿tienen 15 minutos esta semana?").
- Tono: directo, humano, como un WhatsApp de un conocido que tiene contexto. NO corporativo.
- NO uses puntos de lista, emojis en exceso, ni asteriscos de markdown.
- Si hay historial previo: el mensaje debe reconocer el contacto anterior de forma natural.
OUTPUT: solo el texto del mensaje. Sin asunto, sin firma, sin explicaciones.`,

    email: `CANAL: Email
REGLAS ESTRICTAS:
- Generar: (1) línea de asunto y (2) cuerpo del email.
- Asunto: máximo 8 palabras, que genere curiosidad sin ser clickbait. NO "Una idea para [empresa]".
  Ejemplos buenos: "Su rating de 3.8★ tiene una explicación", "PGT: 33K seguidores, ¿cuántos convierten?", "El dato que encontramos sobre [Empresa]"
- Cuerpo: 3-4 párrafos cortos.
  · Párrafo 1 (2 oraciones): quién soy + el dato específico que encontramos.
  · Párrafo 2 (2-3 oraciones): el dolor real en términos de dinero o clientes perdidos. Sin promesas.
  · Párrafo 3 (1-2 oraciones): qué puede hacer Codflow específicamente — una cosa, no una lista.
  · Párrafo 4 (1 oración): CTA claro: proponer día/hora o pedir 15 min.
- Firma: terminar con "Quedo atento,\n[Tu nombre]\nCodeflow — IA & Datos, Panamá"
- Si hay historial: el párrafo 1 debe mencionar que ya tuvieron contacto y dar contexto.
OUTPUT en formato:
ASUNTO: ...
CUERPO:
[cuerpo]`,

    llamada: `CANAL: Script de Llamada (30 segundos)
REGLAS ESTRICTAS:
- Dividir en 3 bloques etiquetados: APERTURA, DOLOR, CIERRE.
- APERTURA (5-8 seg, 1-2 oraciones): presentación + permiso para continuar.
  Ej: "Hola, soy [nombre] de Codflow. ¿Le llamo en buen momento? Tenemos algo específico sobre [Empresa] que creo le va a interesar."
- DOLOR (15-18 seg, 2-3 oraciones): mencionar el dato concreto + conectarlo con el dolor.
  Debe sonar como alguien que investigó la empresa, no como un guión genérico.
- CIERRE (5-7 seg, 1 oración): propuesta de siguiente paso concreta — una fecha, una reunión, no "cuando quiera".
  Ej: "¿Le parece bien el miércoles a las 10am para una llamada de 15 minutos?"
- Tono: conversacional, pausas naturales. El interlocutor puede interrumpir — el script debe poder retomarse.
- Si hay historial: la apertura debe mencionar el contacto previo y su resultado.
OUTPUT: el script con los 3 bloques etiquetados.`,
  };

  return `Eres el sistema de generación de mensajes comerciales de Codflow, consultora de IA y datos en Panamá.

${instruccionesCanal[input.canal]}

---

EMPRESA: ${input.nombre}
RUBRO: ${input.rubro ?? "desconocido"}

SEÑAL DE DOLOR (lo más importante):
${input.senal_destacada ?? "(no disponible — usa el contexto completo)"}

ÁNGULO DE CONTACTO BASE (puedes adaptarlo, no copiar literal):
${input.angulo_contacto ?? "(no disponible)"}

HISTORIAL DE INTERACCIONES:
${historialTexto}

CONTEXTO ADICIONAL (proporcionado por el vendedor):
${input.contexto_adicional?.trim() || "(ninguno)"}

PERFIL COMPLETO DE LA EMPRESA (extracto):
${contextoTexto.slice(0, 3000) || "(no disponible — generar mensaje basado en señal y ángulo)"}

---

INSTRUCCIÓN FINAL: genera el mensaje para el canal ${input.canal.toUpperCase()}.
${hayHistorial ? "OJO: ya hubo contacto previo — el mensaje debe reconocerlo y avanzar la conversación, no empezar desde cero." : ""}
${input.contexto_adicional ? `OJO: el vendedor dice: "${input.contexto_adicional}" — esto debe influir directamente en el tono y contenido del mensaje.` : ""}`;
}

// ── Función principal ──────────────────────────────────────────────────────────

export async function generarPitch(
  input: PitchInput,
  anthropicKey: string
): Promise<PitchResult> {
  const advertencias: string[] = [];
  const hayHistorial = (input.notas_interacciones?.length ?? 0) > 0;
  const contextoTexto = extractTexto(input.contexto_completo);
  const historialTexto = resumirHistorial(input.notas_interacciones);

  if (!input.senal_destacada && !input.angulo_contacto && !contextoTexto) {
    advertencias.push("Empresa sin señal, ángulo ni contexto — el mensaje será genérico. Ejecuta Investigar + Analizar dolor primero.");
  }

  const prompt = buildPrompt(input, contextoTexto, historialTexto);

  let tono_usado = hayHistorial ? "seguimiento" : "primer contacto";
  if (input.contexto_adicional) tono_usado += " + contexto vendedor";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 900,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return fallback(input, tono_usado, hayHistorial, advertencias, `API ${res.status}: ${errText.slice(0, 150)}`);
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const raw = data.content?.[0]?.text?.trim() ?? "";

    if (!raw) {
      return fallback(input, tono_usado, hayHistorial, advertencias, "Claude devolvió respuesta vacía");
    }

    return parseOutput(raw, input.canal, tono_usado, hayHistorial, advertencias);
  } catch (err) {
    return fallback(input, tono_usado, hayHistorial, advertencias, err instanceof Error ? err.message : "Error desconocido");
  }
}

// ── Parseo de output por canal ─────────────────────────────────────────────────

function parseOutput(
  raw: string,
  canal: CanalPitch,
  tono_usado: string,
  hay_historial: boolean,
  advertencias: string[]
): PitchResult {
  if (canal === "whatsapp") {
    return { canal, mensaje_whatsapp: raw, tono_usado, hay_historial, advertencias };
  }

  if (canal === "email") {
    // Extraer ASUNTO y CUERPO
    const asuntoMatch = raw.match(/^ASUNTO:\s*(.+)/im);
    const cuerpoMatch = raw.match(/^CUERPO:\s*([\s\S]+)/im);

    const asunto = asuntoMatch?.[1]?.trim() ?? `Una idea para su empresa`;
    const cuerpo = cuerpoMatch?.[1]?.trim() ?? raw;

    return { canal, asunto, cuerpo_email: cuerpo, tono_usado, hay_historial, advertencias };
  }

  if (canal === "llamada") {
    return { canal, script_llamada: raw, tono_usado, hay_historial, advertencias };
  }

  return { canal, tono_usado, hay_historial, advertencias };
}

// ── Fallback estático (si Claude falla) ──────────────────────────────────────

function fallback(
  input: PitchInput,
  tono_usado: string,
  hay_historial: boolean,
  advertencias: string[],
  errorMsg: string
): PitchResult {
  advertencias.push(`Error al generar con IA: ${errorMsg}. Usando mensaje base.`);
  const angulo = input.angulo_contacto ?? "Somos Codflow, consultora de datos en Panamá.";
  const sentences = angulo.match(/[^.!?]+[.!?]+/g) ?? [angulo];

  if (input.canal === "whatsapp") {
    return {
      canal: "whatsapp",
      mensaje_whatsapp: `Hola, soy de Codflow. ${sentences.slice(0, 2).join(" ").trim()} ¿Tienen 15 minutos esta semana?`,
      tono_usado, hay_historial, advertencias,
    };
  }
  if (input.canal === "email") {
    return {
      canal: "email",
      asunto: `Una idea para ${input.nombre}`,
      cuerpo_email: `Hola,\n\nSoy de Codflow, consultora de IA y datos en Panamá.\n\n${angulo}\n\n¿Tienen disponibilidad para una llamada de 15 minutos esta semana?\n\nQuedo atento,\n[Tu nombre]\nCodeflow — IA & Datos, Panamá`,
      tono_usado, hay_historial, advertencias,
    };
  }
  return {
    canal: "llamada",
    script_llamada: `APERTURA:\nHola, soy [nombre] de Codflow. ¿Le llamo en buen momento?\n\nDOLOR:\n${sentences.slice(0, 2).join(" ")}\n\nCIERRE:\n¿Le parece bien el miércoles a las 10am para una llamada de 15 minutos?`,
    tono_usado, hay_historial, advertencias,
  };
}
