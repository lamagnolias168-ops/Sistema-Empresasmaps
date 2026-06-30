/**
 * Agente Investigador — Codflow
 * Investiga una empresa automáticamente: web, Google Maps reviews, zona, dolor.
 * Diseñado para swappear la fuente de datos (fetch → Apify) sin tocar la lógica.
 */

// ── Zonas (del documento maestro) ────────────────────────────────────────────
const ZONAS_A = [
  "juan díaz", "juan diaz", "tocumen", "transístmica", "transistmica",
  "calidonia", "av. central", "avenida central", "ojo de agua",
  "villa zaita", "las mañanitas", "las manitas", "santa ana",
];
const ZONAS_B = [
  "obarrio", "costa del este", "san francisco", "marbella",
  "bella vista", "calle 50", "paitilla", "punta pacífica",
  "punta pacifica", "panamá pacífico", "panama pacifico",
];

// ── Tipos ─────────────────────────────────────────────────────────────────────
export interface LeadInput {
  id: string;
  nombre: string;
  rubro: string | null;
  direccion: string | null;
  telefono: string | null;
  web: string | null;
  rating: number | null;
  latitud: number | null;
  longitud: number | null;
  senal_destacada: string | null;
  tier: string | null;
  contexto_completo: unknown;
}

export interface Resena {
  rating: number;
  autor: string;
  texto: string;
}

export interface InvestigacionResult {
  info_web: string | null;
  resenas_positivas: Resena[];
  resenas_negativas: Resena[];
  todas_resenas: Resena[];
  perfil_zona: "A" | "B" | "desconocido";
  dolor_identificado: string;
  angulo_contacto_sugerido: string;
  place_id: string | null;
  rating_actual: number | null;
  fuentes_usadas: string[];
  errores: string[];
}

// ── 1. Web scraping ───────────────────────────────────────────────────────────
export async function scrapeWeb(rawUrl: string): Promise<string | null> {
  try {
    const url = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
    const res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(9000),
    });
    if (!res.ok) return null;

    const html = await res.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 4000);

    return text.length > 100 ? text : null;
  } catch {
    return null;
  }
}

// ── 2. Google Maps — place_id + reseñas ──────────────────────────────────────
interface PlaceSearchResult {
  placeId: string | null;
  rating: number | null;
  resenas: Resena[];
}

export async function fetchPlaceDetails(
  nombre: string,
  direccion: string | null,
  lat: number | null,
  lng: number | null,
  apiKey: string
): Promise<PlaceSearchResult> {
  // 2a. Buscar place_id
  const searchParams = new URLSearchParams({
    input: `${nombre} ${direccion ?? "Panamá"}`,
    inputtype: "textquery",
    fields: "place_id,rating",
    key: apiKey,
  });
  if (lat != null && lng != null) {
    searchParams.set("locationbias", `circle:800@${lat},${lng}`);
  }

  let placeId: string | null = null;
  let ratingBase: number | null = null;

  try {
    const searchRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${searchParams}`
    );
    if (searchRes.ok) {
      const searchData = (await searchRes.json()) as {
        candidates?: Array<{ place_id?: string; rating?: number }>;
        status: string;
      };
      const candidate = searchData.candidates?.[0];
      placeId = candidate?.place_id ?? null;
      ratingBase = candidate?.rating ?? null;
    }
  } catch {
    return { placeId: null, rating: null, resenas: [] };
  }

  if (!placeId) return { placeId: null, rating: ratingBase, resenas: [] };

  // 2b. Obtener reseñas completas
  const detailsParams = new URLSearchParams({
    place_id: placeId,
    fields: "rating,reviews",
    language: "es",
    reviews_sort: "most_relevant",
    key: apiKey,
  });

  try {
    const detailsRes = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?${detailsParams}`
    );
    if (!detailsRes.ok) return { placeId, rating: ratingBase, resenas: [] };

    const detailsData = (await detailsRes.json()) as {
      result?: {
        rating?: number;
        reviews?: Array<{ text: string; rating: number; author_name: string }>;
      };
      status: string;
    };

    const rating = detailsData.result?.rating ?? ratingBase;
    const resenas: Resena[] = (detailsData.result?.reviews ?? []).map((r) => ({
      rating: r.rating,
      autor: r.author_name,
      texto: r.text,
    }));

    return { placeId, rating, resenas };
  } catch {
    return { placeId, rating: ratingBase, resenas: [] };
  }
}

// ── 3. Clasificación de zona ──────────────────────────────────────────────────
export function clasificarZona(direccion: string | null): "A" | "B" | "desconocido" {
  if (!direccion) return "desconocido";
  const d = direccion.toLowerCase();
  if (ZONAS_B.some((z) => d.includes(z))) return "B";
  if (ZONAS_A.some((z) => d.includes(z))) return "A";
  return "desconocido";
}

// ── 4. Inferencia de dolor con Claude ─────────────────────────────────────────
export async function inferirDolor(
  lead: LeadInput,
  textoWeb: string | null,
  resenas: Resena[],
  perfilZona: "A" | "B" | "desconocido",
  anthropicKey: string,
  dolorDeclarado?: string | null
): Promise<{ dolor: string; angulo: string }> {
  const perfilDesc =
    perfilZona === "A"
      ? "Perfil A — alta rotación, márgenes ajustados."
      : perfilZona === "B"
      ? "Perfil B — ticket alto, volumen controlado."
      : "Zona no clasificada.";

  const resenasNegStr = resenas
    .filter((r) => r.rating <= 3)
    .map((r) => `[${r.rating}★] ${r.autor}: "${r.texto.slice(0, 300)}"`)
    .join("\n");

  const resenasPosiStr = resenas
    .filter((r) => r.rating >= 4)
    .slice(0, 3)
    .map((r) => `[${r.rating}★] ${r.autor}: "${r.texto.slice(0, 200)}"`)
    .join("\n");

  const seccionDolorDeclarado = dolorDeclarado
    ? `⭐ DOLOR DECLARADO POR EL CLIENTE (FUENTE PRIMARIA — esto es lo que el cliente dijo con sus propias palabras):
"${dolorDeclarado}"

REGLA CRÍTICA: El campo dolor_identificado DEBE construirse SOBRE este dolor específico que el cliente declaró. Ampliarlo con evidencia de reseñas y web si la hay, pero NUNCA inventar un dolor diferente. Si el cliente dijo que quiere hacer scraping propio en vez de pagar por datos, confirma/amplía ESO. Si las reseñas hablan de otro problema, mencionarlo como contexto adicional, no como el dolor principal.`
    : `(El cliente no declaró un dolor específico — inferir desde reseñas y zona.)`;

  const prompt = `Eres el sistema de inteligencia comercial de Codflow, consultora de IA y datos en Panamá.

Tu tarea: confirmar y ampliar el dolor de esta empresa usando evidencia real, luego generar el ángulo de entrada para una llamada comercial.

${seccionDolorDeclarado}

EMPRESA: ${lead.nombre}
RUBRO: ${lead.rubro ?? "desconocido"}
DIRECCIÓN: ${lead.direccion ?? "desconocida"}
RATING GOOGLE MAPS: ${lead.rating ?? "?"}★
PERFIL DE ZONA: ${perfilDesc}

INFORMACIÓN DEL SITIO WEB:
${textoWeb?.slice(0, 1500) ?? "(no accesible)"}

RESEÑAS NEGATIVAS (≤3★):
${resenasNegStr || "(ninguna)"}

RESEÑAS POSITIVAS (≥4★, muestra):
${resenasPosiStr || "(ninguna)"}

Responde SOLO en JSON válido, sin texto antes ni después:
{
  "dolor_identificado": "1-2 oraciones que validan/amplían el dolor declarado con evidencia real. Incluir cifras específicas si las hay (rating, años, costos mencionados). NUNCA ignorar lo que el cliente dijo.",
  "angulo_contacto": "Pitch de entrada de 1-2 oraciones que conecta con el dolor declarado por el cliente. Sonar como alguien que entendió exactamente el problema. Terminar con pregunta reflexiva."
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
        model: "claude-haiku-4-5-20251001",
        max_tokens: 500,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) return { dolor: "No disponible (error API)", angulo: "No disponible" };

    const data = (await res.json()) as {
      content?: Array<{ text?: string }>;
    };
    const text = data.content?.[0]?.text ?? "{}";

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return { dolor: text.slice(0, 300), angulo: "No disponible" };

    const parsed = JSON.parse(match[0]) as {
      dolor_identificado?: string;
      angulo_contacto?: string;
    };
    return {
      dolor: parsed.dolor_identificado ?? "No disponible",
      angulo: parsed.angulo_contacto ?? "No disponible",
    };
  } catch {
    return { dolor: "Error al contactar Claude API", angulo: "No disponible" };
  }
}

// ── 5. Función principal ───────────────────────────────────────────────────────
export async function investigarEmpresa(
  lead: LeadInput,
  googleMapsKey: string,
  anthropicKey: string,
  dolorDeclarado?: string | null
): Promise<InvestigacionResult> {
  const fuentes: string[] = [];
  const errores: string[] = [];

  // Web scraping
  let textoWeb: string | null = null;
  if (lead.web) {
    textoWeb = await scrapeWeb(lead.web);
    if (textoWeb) {
      fuentes.push(`web:${lead.web}`);
    } else {
      errores.push(`No se pudo acceder a ${lead.web}`);
    }
  }

  // Google Maps
  const placeData = await fetchPlaceDetails(
    lead.nombre,
    lead.direccion,
    lead.latitud,
    lead.longitud,
    googleMapsKey
  );
  if (placeData.placeId) {
    fuentes.push(`google_maps:${placeData.placeId}`);
  } else {
    errores.push("No se encontró place_id en Google Maps");
  }

  // Clasificar zona
  const perfilZona = clasificarZona(lead.direccion);

  // Separar reseñas
  const resenasPositivas = placeData.resenas.filter((r) => r.rating >= 4);
  const resenasNegativas = placeData.resenas.filter((r) => r.rating <= 3);

  // Inferir dolor con Claude
  const { dolor, angulo } = await inferirDolor(
    lead,
    textoWeb,
    placeData.resenas,
    perfilZona,
    anthropicKey,
    dolorDeclarado
  );

  return {
    info_web: textoWeb,
    resenas_positivas: resenasPositivas,
    resenas_negativas: resenasNegativas,
    todas_resenas: placeData.resenas,
    perfil_zona: perfilZona,
    dolor_identificado: dolor,
    angulo_contacto_sugerido: angulo,
    place_id: placeData.placeId,
    rating_actual: placeData.rating,
    fuentes_usadas: fuentes,
    errores,
  };
}

// ── 6. Construir contexto_completo en markdown ────────────────────────────────
export function buildContextoCompleto(
  lead: LeadInput,
  r: InvestigacionResult,
  dolorDeclarado?: string | null
): string {
  const zonaLabel =
    r.perfil_zona === "A"
      ? "Perfil A (alta rotación / márgenes ajustados)"
      : r.perfil_zona === "B"
      ? "Perfil B (ticket alto / volumen controlado)"
      : "Zona no clasificada";

  const resenasNegStr =
    r.resenas_negativas.length > 0
      ? r.resenas_negativas
          .map((re) => `**${re.rating}★ — ${re.autor}:** "${re.texto.slice(0, 400)}"`)
          .join("\n\n")
      : "Sin reseñas negativas encontradas.";

  const resenasPosiStr =
    r.resenas_positivas.length > 0
      ? r.resenas_positivas
          .slice(0, 3)
          .map((re) => `**${re.rating}★ — ${re.autor}:** "${re.texto.slice(0, 300)}"`)
          .join("\n\n")
      : "Sin reseñas positivas encontradas.";

  return `## PERFIL COMPLETO — ${lead.nombre}
**Puntaje Codflow:** ${lead.tier ?? "?"} | **Rating Google Maps:** ${r.rating_actual ?? lead.rating ?? "?"}★
**Dirección:** ${lead.direccion ?? "desconocida"} | **Zona Codflow:** ${zonaLabel}

---
${dolorDeclarado ? `
### ⭐ Dolor declarado por el cliente (fuente primaria)
"${dolorDeclarado}"

---
` : ""}
### Dolor identificado por investigación
${r.dolor_identificado}

### Ángulo de contacto
${r.angulo_contacto_sugerido}

---

### Reseñas negativas (≤3★)
${resenasNegStr}

### Reseñas positivas (≥4★)
${resenasPosiStr}

---

### Info del sitio web
${r.info_web ? r.info_web.slice(0, 1500) : "No accesible o sin sitio web."}

---
*Investigado por Agente Investigador Codflow*
*Fuentes: ${r.fuentes_usadas.join(", ") || "ninguna"}*
${r.errores.length > 0 ? `*Errores: ${r.errores.join(", ")}*` : ""}
*Fecha: ${new Date().toISOString().slice(0, 10)}*`;
}
