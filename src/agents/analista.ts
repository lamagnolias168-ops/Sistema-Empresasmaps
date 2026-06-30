/**
 * Agente Analista — Codflow
 * Lee contexto_completo de una empresa y genera senal_destacada + angulo_contacto
 * al nivel de calidad de MiroFish: datos reales, dolor específico, pitch que derriba objeciones.
 *
 * Flujo natural: Investigar (investigador.ts) → Analizar dolor (analista.ts)
 */

// ── Ejemplos de calidad MiroFish (few-shot para calibrar el modelo) ───────────
// Estos son el estándar. El agente debe producir output de esta calidad o mejor.
const EJEMPLOS_MIROFISH = [
  {
    empresa: "MLC Multimodal Logistics",
    rubro: "Logística / Perfil B (Obarrio)",
    contexto_resumen:
      "Rating 3.8★ en zona corporativa Obarrio. Quejas documentadas: no contestan correos ni llamadas (patrón en múltiples reseñas). Caso documentado: cliente pagó $575 por envío que Copa Courier cotizó en $28. 20+ años operando, presencia en Zona Libre de Colón. Competidores mencionados: Copa Courier, LMT Panama.",
    senal_destacada:
      "MLC opera 20+ años en Obarrio pero su rating de 3.8★ y cobros sin justificación ($575 por un envío de $45 que Copa Courier cotiza en $28) indican una operación que vive en la cabeza de las personas, no en sistemas — cada cliente corporativo que se va en silencio puede representar $50K-$200K anuales perdidos.",
    angulo_contacto:
      "En diciembre de 2024, uno de sus clientes documentó en Google que pagó $575 por 4kg de carga que Copa Courier cotizó en $28. No le llamamos a criticar eso — le llamamos porque ese tipo de inconsistencia desaparece cuando hay sistemas de cotización y trazabilidad. Tienen 20 años de operación y presencia en la ZLC: eso es un activo enorme que hoy no se está midiendo. ¿Cuántos clientes así no volvieron a llamar sin decirle por qué? Eso es exactamente lo que queremos calcular con ustedes.",
  },
  {
    empresa: "PGT Logistics",
    rubro: "Logística / Perfil A (Juan Díaz) + frontera B",
    contexto_resumen:
      "Rating 4.9★, 250+ reseñas (el más alto del grupo), 14 años operando, vuelos diarios Miami-Panamá, 33,000 seguidores IG, equipo de 18-40 personas. PERO: solo 5 embarques documentados en ImportGenius (2007-2022). CEO: Gary Alvarado. Sin evidencia de reportería gerencial o BI.",
    senal_destacada:
      "PGT tiene la operación courier más sólida del grupo (4.9★, 250 reseñas, vuelos diarios) pero opera en ciego: 33K seguidores y 14 años de historial sin trazabilidad — no saben qué clientes son rentables, qué rutas generan más reclamaciones ni cuántos B2B repiten en 90 días.",
    angulo_contacto:
      "PGT tiene algo que pocos en Panamá logran: 4.9★ con 250 reseñas y vuelos diarios Miami-Panamá. El problema no es la operación — es que toda esa inteligencia operativa se está perdiendo porque no existe sistema que la capture. ImportGenius solo documenta 5 embarques en 14 años: eso no refleja su volumen real, refleja la ausencia de trazabilidad. ¿Saben qué porcentaje de sus clientes B2B repiten en los primeros 90 días? Eso es lo primero que podemos calcular con los datos que ya tienen.",
  },
  {
    empresa: "Clínica Los Portales",
    rubro: "Clínica / zona residencial alta densidad",
    contexto_resumen:
      "Rating 2.5★ (más bajo de su zona), 80+ profesionales de salud, atención 24h. Quejas: tiempos de espera, atención al paciente. Zona: Campo Limberg.",
    senal_destacada:
      "Los Portales tiene 80+ profesionales y operación 24h pero el rating más bajo de su zona (2.5★): esa brecha entre capacidad instalada y percepción del paciente no es un problema médico sino de flujo de atención, tiempos de espera y seguimiento post-consulta — todo medible y corregible con datos.",
    angulo_contacto:
      "Los Portales tiene más de 80 profesionales de salud trabajando 24 horas, y sin embargo el rating de Google Maps es el más bajo de su zona geográfica. No creemos que sea un problema de los médicos. Creemos que es un problema de los tiempos entre llegada y atención, y de la falta de seguimiento al paciente después de la consulta. ¿Han medido cuántos minutos tarda en promedio un paciente desde que llega hasta que es atendido? Eso es lo primero que analizaríamos — y en clínicas similares ese número suele explicar el 80% del rating.",
  },
];

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface LeadParaAnalisis {
  id: string;
  nombre: string;
  rubro: string | null;
  direccion: string | null;
  rating: number | null;
  tier: string | null;
  puntaje_total: number | null;
  senal_destacada: string | null;
  angulo_contacto: string | null;
  contexto_completo: unknown;
}

export interface AnalisisResult {
  senal_destacada: string;
  angulo_contacto: string;
  razonamiento: string;
  calidad_contexto: "rico" | "medio" | "escaso";
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

function evaluarCalidadContexto(texto: string): "rico" | "medio" | "escaso" {
  if (texto.length > 2000) return "rico";
  if (texto.length > 500) return "medio";
  return "escaso";
}

// ── Función principal ──────────────────────────────────────────────────────────
export async function analizarDolor(
  lead: LeadParaAnalisis,
  anthropicKey: string
): Promise<AnalisisResult> {
  const advertencias: string[] = [];
  const contextoTexto = extractTexto(lead.contexto_completo);
  const calidad = evaluarCalidadContexto(contextoTexto);

  if (calidad === "escaso") {
    advertencias.push(
      "Contexto escaso — ejecuta primero el Agente Investigador para enriquecer el perfil"
    );
  }

  // Construir ejemplos few-shot
  const ejemplosStr = EJEMPLOS_MIROFISH.map(
    (ej) =>
      `--- EJEMPLO (${ej.empresa} — ${ej.rubro}) ---
RESUMEN DE CONTEXTO: ${ej.contexto_resumen}
SEÑAL DESTACADA GENERADA: ${ej.senal_destacada}
ÁNGULO DE CONTACTO GENERADO: ${ej.angulo_contacto}`
  ).join("\n\n");

  const prompt = `Eres el sistema de análisis comercial de Codflow, consultora de IA y datos en Panamá.

Tu tarea: leer el perfil completo de una empresa panameña y generar (1) la señal de dolor real con cifras concretas, y (2) el pitch de entrada que suene como alguien que conoce el negocio por dentro.

ESTÁNDAR DE CALIDAD — estos son outputs reales del sistema MiroFish (el mejor nivel):

${ejemplosStr}

---

EMPRESA A ANALIZAR: ${lead.nombre}
RUBRO: ${lead.rubro ?? "desconocido"}
DIRECCIÓN: ${lead.direccion ?? "desconocida"}
RATING: ${lead.rating ?? "?"}★
TIER CODFLOW: ${lead.tier ?? "?"}
PUNTAJE: ${lead.puntaje_total ?? "?"}

PERFIL COMPLETO (contexto_completo):
${contextoTexto.slice(0, 6000) || "(vacío — ejecutar Agente Investigador primero)"}

---

REGLAS DE CALIDAD (obligatorias):

⭐ REGLA CRÍTICA: Si el contexto incluye una sección "Dolor declarado por el cliente", la senal_destacada DEBE construirse SOBRE ese dolor específico que el cliente declaró con sus propias palabras. Ampliarlo con datos reales, pero NUNCA ignorarlo ni reemplazarlo por otro dolor inventado. Si el cliente dijo que quiere hacer scraping propio en vez de pagar $170K, la señal debe hablar de ESO, no de fragmentación digital ni de churn.

SEÑAL DESTACADA (2-3 oraciones):
- Si hay dolor declarado: mencionarlo explícitamente y ampliar con evidencia (rating, reseñas, cifras de mercado)
- Si no hay dolor declarado: identificarlo desde reseñas y zona con al menos UN dato numérico real
- Debe identificar el DOLOR REAL en términos de dinero perdido o clientes que se van, no síntomas superficiales
- NO debe ser genérica — "empresa con oportunidad de mejora" NO es aceptable

ÁNGULO DE CONTACTO (4-6 oraciones):
- Primera oración: debe mencionar un dato específico que demuestre que investigamos la empresa
- Segunda/tercera: conectar ese dato con el dolor real sin sonar a auditoría
- Cuarta/quinta: ofrecer qué exactamente puede calcular o resolver Codflow
- Última: pregunta que los haga reflexionar sobre su propia operación
- Tono: consultivo, nunca de ventas. Como si ya conocieras el negocio por dentro.

RAZONAMIENTO (1 párrafo):
- Explica brevemente qué señales del contexto usaste y por qué

Responde SOLO en JSON válido, sin texto antes ni después:
{
  "senal_destacada": "...",
  "angulo_contacto": "...",
  "razonamiento": "..."
}`;

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
        max_tokens: 1200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return {
        senal_destacada: lead.senal_destacada ?? "No disponible",
        angulo_contacto: lead.angulo_contacto ?? "No disponible",
        razonamiento: `Error API: ${res.status} — ${errText.slice(0, 200)}`,
        calidad_contexto: calidad,
        advertencias: [...advertencias, `Error Claude API: ${res.status}`],
      };
    }

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    const text = data.content?.[0]?.text ?? "{}";

    // Extraer JSON robusto (Claude a veces añade markdown)
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) {
      return {
        senal_destacada: lead.senal_destacada ?? "No disponible",
        angulo_contacto: lead.angulo_contacto ?? "No disponible",
        razonamiento: `Respuesta no parseada: ${text.slice(0, 300)}`,
        calidad_contexto: calidad,
        advertencias: [...advertencias, "Respuesta de Claude no era JSON válido"],
      };
    }

    const parsed = JSON.parse(match[0]) as {
      senal_destacada?: string;
      angulo_contacto?: string;
      razonamiento?: string;
    };

    // Validar que no sean genéricos
    const senal = parsed.senal_destacada ?? "";
    const angulo = parsed.angulo_contacto ?? "";

    if (senal.length < 80) {
      advertencias.push("Señal generada es muy corta — puede ser genérica");
    }
    if (angulo.length < 150) {
      advertencias.push("Ángulo de contacto es muy corto — puede carecer de especificidad");
    }

    return {
      senal_destacada: senal || lead.senal_destacada || "No disponible",
      angulo_contacto: angulo || lead.angulo_contacto || "No disponible",
      razonamiento: parsed.razonamiento ?? "Sin razonamiento disponible",
      calidad_contexto: calidad,
      advertencias,
    };
  } catch (err) {
    return {
      senal_destacada: lead.senal_destacada ?? "No disponible",
      angulo_contacto: lead.angulo_contacto ?? "No disponible",
      razonamiento: `Excepción: ${err instanceof Error ? err.message : String(err)}`,
      calidad_contexto: calidad,
      advertencias: [...advertencias, "Excepción al llamar Claude API"],
    };
  }
}
