"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  Send, Check, Pencil,
  Search, BarChart2, AlertCircle, Calculator, FileText,
  CheckCircle, ArrowRight, Download,
} from "lucide-react";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type StepType = "text" | "options" | "multiselect" | "longtext" | "url";

interface Step {
  id: string;
  etapa: number;
  pregunta: string;
  tipo: StepType;
  opciones?: string[];
  placeholder?: string;
  // Si true, siempre mostrar input de texto libre además de opciones
  allowFreeText?: boolean;
  // Función que determina si este paso debe saltarse dado el estado actual
  skipIf?: (r: Record<string, string>) => boolean;
  // Si la respuesta es esta opción, se pide seguimiento con ese id
  seguimientoSi?: { opcion: string | RegExp; id: string; pregunta: string; tipo: StepType; placeholder?: string };
}

const ETAPAS = ["La empresa", "Ubicación", "El problema", "Objetivos", "Contacto"];

// ── Zonas para detección ──────────────────────────────────────────────────────

const ZONAS_KEYWORDS_A = ["juan díaz", "juan diaz", "tocumen", "transístmica", "transistmica", "calidonia", "santa ana", "villa zaita", "las mañanitas", "ojo de agua"];
const ZONAS_KEYWORDS_B = ["obarrio", "costa del este", "san francisco", "marbella", "bella vista", "calle 50", "paitilla", "punta pacífica", "punta pacifica", "panamá pacífico"];
const TODAS_ZONAS = [...ZONAS_KEYWORDS_A, ...ZONAS_KEYWORDS_B];

function mencionaZonas(texto: string): boolean {
  const t = texto.toLowerCase();
  return TODAS_ZONAS.some((z) => t.includes(z));
}

// ── STEPS ─────────────────────────────────────────────────────────────────────

const STEPS: Step[] = [
  // ── ETAPA 1 ───────────────────────────────────────────────────────────────
  {
    id: "empresa",
    etapa: 0,
    pregunta: "¡Bienvenido! Soy el Agente Guía de Codflow.\n\nVoy a hacerle algunas preguntas para entender su negocio y preparar un análisis personalizado. Son menos de 5 minutos.\n\n¿Cómo se llama su empresa?",
    tipo: "text",
    placeholder: "Nombre de su empresa",
  },
  {
    id: "rubro",
    etapa: 0,
    pregunta: "¿En qué rubro opera {empresa}?",
    tipo: "options",
    allowFreeText: true,
    opciones: [
      "Restaurante / Alimentos",
      "Clínica / Salud",
      "Logística / Courier",
      "Distribuidora",
      "Importadora",
      "Retail / Comercio",
      "Servicios profesionales",
      "Otro",
    ],
  },
  {
    id: "anios",
    etapa: 0,
    pregunta: "¿Cuántos años lleva operando {empresa}?",
    tipo: "options",
    opciones: ["Menos de 1 año", "1–3 años", "3–10 años", "Más de 10 años"],
  },
  {
    id: "empleados",
    etapa: 0,
    pregunta: "¿Cuántos empleados tiene aproximadamente?",
    tipo: "options",
    opciones: ["1–5", "6–15", "16–50", "51–200", "Más de 200"],
  },
  {
    id: "web",
    etapa: 0,
    pregunta: "¿Tiene sitio web?",
    tipo: "options",
    opciones: ["Sí", "No, todavía no"],
    seguimientoSi: {
      opcion: "Sí",
      id: "web_url",
      pregunta: "¿Cuál es la URL de su sitio web?",
      tipo: "url",
      placeholder: "https://miempresa.com",
    },
  },
  // ── ETAPA 2 ───────────────────────────────────────────────────────────────
  {
    id: "zona",
    etapa: 1,
    pregunta: "¿Dónde está ubicada {empresa} en Panamá?",
    tipo: "text",
    placeholder: "Ej: Juan Díaz, Costa del Este, Obarrio…",
  },
  {
    id: "sucursales",
    etapa: 1,
    pregunta: "¿Tiene más de una sucursal?",
    tipo: "options",
    opciones: ["Sí, tengo varias", "No, solo una ubicación"],
    seguimientoSi: {
      opcion: /^Sí/,
      id: "sucursales_detalle",
      pregunta: "¿Cuántas sucursales tiene y en qué zonas están?",
      tipo: "text",
      placeholder: "Ej: 3 sucursales — Costa del Este, San Miguelito y Chiriquí",
    },
  },
  {
    id: "zonas_clientes",
    etapa: 1,
    pregunta: "¿En qué zonas de Panamá están sus clientes principales?",
    tipo: "multiselect",
    // Saltar si las sucursales ya mencionaron zonas con suficiente detalle
    skipIf: (r) => Boolean(r.sucursales_detalle && mencionaZonas(r.sucursales_detalle) && r.sucursales_detalle.length > 20),
    opciones: [
      "Juan Díaz / Tocumen",
      "Transístmica / Villa Zaita",
      "Calidonia / Santa Ana",
      "San Francisco / Marbella",
      "Obarrio / Bella Vista",
      "Costa del Este / Paitilla",
      "Calle 50 / Punta Pacífica",
      "Interior del país",
      "Zona Libre de Colón",
      "Todo Panamá",
    ],
  },
  // ── ETAPA 3 ───────────────────────────────────────────────────────────────
  {
    id: "problema",
    etapa: 2,
    pregunta: "¿Qué problemas le quitan más tiempo o dinero en su operación diaria?\n\nPuede seleccionar varios.",
    tipo: "multiselect",
    allowFreeText: true,
    opciones: [
      "No sé dónde estoy perdiendo dinero",
      "Mis clientes se van sin saber por qué",
      "Mi equipo hace todo de forma manual",
      "No sé en qué zona expandirme",
      "Mi competencia me está ganando terreno",
      "No tengo datos para tomar decisiones",
      "Otro",
    ],
  },
  {
    id: "herramientas",
    etapa: 2,
    pregunta: "¿Qué herramientas o sistemas usa actualmente para gestionar su negocio?",
    tipo: "multiselect",
    opciones: [
      "Excel / Google Sheets",
      "Software contable (QuickBooks, SAP, etc.)",
      "WhatsApp para todo",
      "Sistema propio o ERP",
      "No uso nada digital",
      "Otro",
    ],
  },
  {
    id: "competidores",
    etapa: 2,
    pregunta: "¿Conoce a su competencia directa? ¿Quiénes son sus principales competidores?",
    tipo: "text",
    allowFreeText: true,
    placeholder: "Nombres de sus competidores principales (si no los conoce, escríba 'No los conozco')",
  },
  // ── ETAPA 4 ───────────────────────────────────────────────────────────────
  {
    id: "objetivo",
    etapa: 3,
    pregunta: "¿Qué necesita lograr en los próximos 3 meses?\n\nPuede elegir varios.",
    tipo: "multiselect",
    allowFreeText: true,
    opciones: [
      "Conseguir más clientes",
      "Reducir costos operativos",
      "Entender mi mercado y competencia",
      "Automatizar procesos manuales",
      "Expandirme a una nueva zona",
      "Mejorar mi presencia digital",
      "Otro",
    ],
  },
  {
    id: "decision",
    etapa: 3,
    pregunta: "¿Qué decisión necesita tomar pronto y no tiene datos suficientes para tomarla?",
    tipo: "options",
    allowFreeText: true,
    opciones: [
      "Abrir nueva sucursal — ¿dónde?",
      "Lanzar producto nuevo — ¿en qué zona?",
      "Entrar a un nuevo canal de venta",
      "Mejorar mi servicio al cliente",
      "Contratar más personal",
      "Otra decisión",
    ],
  },
  {
    id: "presupuesto",
    etapa: 3,
    pregunta: "¿Tiene presupuesto definido para un proyecto de datos?",
    tipo: "options",
    opciones: [
      "Menos de $500",
      "$500 – $2,000",
      "$2,000 – $5,000",
      "Más de $5,000",
      "Prefiero ver la propuesta primero",
    ],
  },
  // ── ETAPA 5 ───────────────────────────────────────────────────────────────
  {
    id: "nombre_contacto",
    etapa: 4,
    pregunta: "Casi terminamos. ¿Cuál es su nombre completo?",
    tipo: "text",
    placeholder: "Su nombre y apellido",
  },
  {
    id: "cargo",
    etapa: 4,
    pregunta: "¿Cuál es su cargo en {empresa}?",
    tipo: "text",
    placeholder: "Ej: Gerente General, Dueño, Director de Operaciones…",
  },
  {
    id: "canal_contacto",
    etapa: 4,
    pregunta: "¿Cómo prefiere que lo contactemos?",
    tipo: "options",
    opciones: ["WhatsApp", "Email", "Llamada"],
    seguimientoSi: {
      opcion: /.+/,
      id: "canal_valor",
      pregunta: "¿Cuál es su {canal_contacto} de contacto?",
      tipo: "text",
      placeholder: "Número o correo electrónico",
    },
  },
  {
    id: "cuando",
    etapa: 4,
    pregunta: "¿Cuándo sería un buen momento para una sesión de 30 minutos con nuestro equipo?",
    tipo: "options",
    opciones: [
      "Esta semana — mañana o pasado",
      "La próxima semana",
      "En 2 semanas",
      "Que me contacten y coordinamos",
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function interpolate(text: string, r: Record<string, string>): string {
  return text.replace(/\{(\w+)\}/g, (_, k) => r[k] ?? "");
}

function clasificarZona(zona: string): "A" | "B" | "desconocido" {
  const z = (zona ?? "").toLowerCase();
  if (ZONAS_KEYWORDS_B.some((x) => z.includes(x))) return "B";
  if (ZONAS_KEYWORDS_A.some((x) => z.includes(x))) return "A";
  return "desconocido";
}

// Genera insights cruzados para el resumen final
function computeInsights(r: Record<string, string>): string[] {
  const ins: string[] = [];
  const zona = clasificarZona(r.zona ?? "");
  const zonasCli = r.zonas_clientes ?? "";
  const problemas = r.problema ?? "";
  const empleados = r.empleados ?? "";
  const anios = r.anios ?? "";
  const objetivo = r.objetivo ?? "";

  // Discrepancia zona empresa vs zona clientes
  if (
    zona === "B" &&
    (zonasCli.includes("Juan Díaz") || zonasCli.includes("Calidonia") || zonasCli.includes("Transístmica"))
  ) {
    ins.push(
      "Su empresa opera en zona B (ticket alto, volumen controlado) pero atiende clientes de zona A (alta rotación, márgenes ajustados). Esto puede generar una brecha de expectativas en precios y servicio."
    );
  }
  if (
    zona === "A" &&
    (zonasCli.includes("Obarrio") || zonasCli.includes("Costa del Este") || zonasCli.includes("Paitilla"))
  ) {
    ins.push(
      "Su empresa está en zona A (alta rotación) pero sus clientes principales son de zona B (ticket alto). Hay una oportunidad de reposicionar su propuesta de valor para ese segmento."
    );
  }

  // Dolor costoso + equipo grande
  if (
    problemas.includes("no sé dónde estoy perdiendo dinero") &&
    (empleados.includes("16–50") || empleados.includes("51–200") || empleados.includes("Más de 200"))
  ) {
    ins.push(
      `Con ${empleados} empleados sin visibilidad de costos, el impacto de este punto ciego es significativo — cada empleado sin métrica puede representar miles de dólares anuales en ineficiencia no detectada.`
    );
  }

  // Muchos años sin web
  if (r.web === "No, todavía no" && (anios.includes("3–10") || anios.includes("Más de 10"))) {
    ins.push(
      `${r.empresa ?? "Su empresa"} lleva ${anios} operando sin presencia web. En su sector, los clientes que no la encuentran en línea simplemente van a su competencia.`
    );
  }

  // Empresa nueva + quiere expandirse
  if (anios.includes("Menos de 1 año") && objetivo.includes("Expandirme")) {
    ins.push(
      "Para una empresa de menos de 1 año, antes de expandirse conviene consolidar datos de los clientes actuales. El análisis de zona puede esperar — primero necesita entender quién le compra hoy."
    );
  }

  // Todo manual + quiere más clientes
  if (problemas.includes("manual") && objetivo.includes("Conseguir más clientes")) {
    ins.push(
      "Si el equipo aún gestiona todo de forma manual, adquirir más clientes aumentará el caos antes de aumentar los ingresos. La automatización de procesos actuales debería ser el primer paso."
    );
  }

  // No conoce competidores
  if (r.competidores && r.competidores.toLowerCase().includes("no los conozco")) {
    ins.push(
      "No conocer a su competencia directa es un riesgo operativo. Uno de los primeros outputs del análisis Codflow será un mapa competitivo de su zona."
    );
  }

  return ins;
}

// ── Componentes visuales ──────────────────────────────────────────────────────

function AgentAvatar() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white shadow-sm select-none">
      C
    </div>
  );
}

function AgentBubble({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 360, damping: 30 }}
      className="flex items-start gap-3"
    >
      <AgentAvatar />
      <div className="max-w-[65ch] rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-gray-200/60">
        <p className="text-[0.9375rem] leading-relaxed text-gray-800 whitespace-pre-line">{text}</p>
      </div>
    </motion.div>
  );
}

function ClientBubble({ text }: { text: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 400, damping: 32 }}
      className="flex justify-end"
    >
      <div className="max-w-[65ch] rounded-2xl rounded-tr-sm bg-teal-600 px-4 py-3 shadow-sm">
        <p className="text-[0.9375rem] leading-relaxed text-white">{text}</p>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <AgentAvatar />
      <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-white px-4 py-3.5 shadow-sm ring-1 ring-gray-200/60">
        {[0, 0.18, 0.36].map((delay, i) => (
          <motion.span
            key={i}
            className="h-2 w-2 rounded-full bg-gray-300"
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 0.72, repeat: Infinity, delay, ease: "easeInOut" }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Barra de progreso (basada en pasos efectivos) ────────────────────────────

function ProgressBar({
  etapa,
  completados,
  total,
}: {
  etapa: number;
  completados: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((completados / total) * 100) : 0;
  return (
    <div className="border-b border-gray-200/70 bg-white px-6 py-4">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 shadow-sm">
            <span className="text-[11px] font-bold text-white">C</span>
          </div>
          <span className="text-sm font-semibold text-gray-900">Codflow Intelligence</span>
        </div>
        <span className="text-xs font-medium tabular-nums text-gray-400">
          {completados} / {total} · {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
        <motion.div
          className="h-full rounded-full bg-teal-600"
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", stiffness: 100, damping: 18 }}
        />
      </div>
      <div className="mt-2 flex gap-1">
        {ETAPAS.map((label, i) => (
          <div
            key={i}
            className={`flex-1 rounded-full py-0.5 text-center text-[10px] font-medium transition-colors ${
              i === etapa
                ? "bg-teal-100 text-teal-700"
                : i < etapa
                ? "bg-teal-600/20 text-teal-600"
                : "text-gray-300"
            }`}
          >
            {i < etapa ? "✓" : i === etapa ? label : "·"}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Plan de trabajo (datos estáticos, descripciones se interpolan) ─────────────

interface PlanStep {
  id: string;
  icon: React.ElementType;
  title: string;
  description: (r: Record<string, string>) => string;
  tiempo: string;
}

const PLAN_STEPS: PlanStep[] = [
  {
    id: "investigacion",
    icon: Search,
    title: "Investigación de mercado",
    description: (r) =>
      `Analizamos su zona${r.zona ? ` (${r.zona})` : ""}, competidores y clientes potenciales con datos reales de Google Maps y fuentes abiertas.`,
    tiempo: "24–48 h",
  },
  {
    id: "competencia",
    icon: BarChart2,
    title: "Análisis de competencia",
    description: (r) =>
      `Identificamos quiénes compiten con ${r.empresa ?? "su empresa"}, qué hacen bien y dónde están fallando.`,
    tiempo: "24–48 h",
  },
  {
    id: "diagnostico",
    icon: AlertCircle,
    title: "Diagnóstico de dolor",
    description: (r) =>
      `Detectamos con datos exactamente dónde está ${r.empresa ?? "su empresa"} perdiendo dinero o clientes.`,
    tiempo: "48–72 h",
  },
  {
    id: "viabilidad",
    icon: Calculator,
    title: "Análisis de viabilidad",
    description: (r) =>
      `Calculamos el retorno esperado y la viabilidad económica de la solución para ${r.rubro ?? "su industria"}.`,
    tiempo: "48–72 h",
  },
  {
    id: "reporte",
    icon: FileText,
    title: "Reporte de inteligencia",
    description: () =>
      "Entregamos recomendaciones concretas, prioridades y un plan de acción paso a paso.",
    tiempo: "5–7 días",
  },
];

// ── Pantalla 0: Perfil generado ───────────────────────────────────────────────

function Screen0Perfil({
  respuestas,
  onNext,
}: {
  respuestas: Record<string, string>;
  onNext: () => void;
}) {
  const reduce = useReducedMotion();
  const zona = clasificarZona(respuestas.zona ?? "");
  const insights = computeInsights(respuestas);
  const dolorPrincipal =
    (respuestas.problema ?? "").split(", ")[0] ?? "Identificar ineficiencias operativas";
  const oportunidad =
    insights[0] ?? "Visibilidad de datos para decisiones más rápidas y rentables.";
  const nombre = respuestas.nombre_contacto?.split(" ")[0] ?? "";

  const zonaGradient =
    zona === "A"
      ? "from-orange-500 to-orange-600"
      : zona === "B"
      ? "from-indigo-500 to-indigo-600"
      : "from-[#1c2b2b] to-[#2d4444]";
  const zonaLabel =
    zona === "A"
      ? "Perfil A — Alta rotación"
      : zona === "B"
      ? "Perfil B — Ticket alto"
      : "Perfil en análisis";

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.11 } },
  };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.97 },
    show: {
      opacity: 1, y: 0, scale: 1,
      transition: { type: "spring" as const, stiffness: 340, damping: 28 },
    },
  };

  return (
    <motion.div
      key="s0"
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.97, y: -8 }}
      transition={reduce ? { duration: 0.18 } : { type: "spring", stiffness: 260, damping: 26 }}
      className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f4] px-4 py-10"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm"
      >
        {/* Badge */}
        <motion.div variants={item} className="mb-4 flex justify-center">
          <span className="rounded-full bg-teal-100 px-4 py-1.5 text-[11px] font-bold uppercase tracking-widest text-teal-700">
            Análisis listo
          </span>
        </motion.div>

        {/* Título */}
        <motion.div variants={item} className="mb-5 text-center">
          {nombre && (
            <p className="mb-0.5 text-sm text-gray-500">Hola, {nombre}. Este es el perfil que generamos:</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-[#1c2b2b]">
            {respuestas.empresa ?? "Su empresa"}
          </h1>
        </motion.div>

        {/* Tarjeta */}
        <motion.div
          variants={item}
          className="overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5"
        >
          {/* Header coloreado */}
          <div className={`bg-gradient-to-br ${zonaGradient} px-6 py-5 text-white`}>
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">Perfil de zona</p>
            <p className="mt-0.5 text-lg font-bold">{zonaLabel}</p>
            <p className="mt-0.5 text-sm opacity-75">{respuestas.zona ?? "Panamá"}</p>
          </div>

          {/* Datos */}
          <div className="divide-y divide-gray-100 px-6">
            {(
              [
                { label: "Rubro", val: respuestas.rubro },
                {
                  label: "Tamaño",
                  val: respuestas.empleados ? `${respuestas.empleados} empleados` : null,
                },
                { label: "Antigüedad", val: respuestas.anios },
                { label: "Dolor principal", val: dolorPrincipal, hi: true },
              ] as { label: string; val?: string | null; hi?: boolean }[]
            ).map(
              ({ label, val, hi }) =>
                val ? (
                  <div key={label} className="flex items-start justify-between gap-3 py-3.5">
                    <p className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                      {label}
                    </p>
                    <p
                      className={`text-right text-sm font-medium leading-snug ${
                        hi ? "text-teal-700" : "text-gray-800"
                      }`}
                    >
                      {val}
                    </p>
                  </div>
                ) : null
            )}
          </div>

          {/* Oportunidad */}
          <div className="mx-4 mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-amber-600">
              💡 Oportunidad detectada
            </p>
            <p className="text-sm leading-relaxed text-amber-900 max-w-[55ch]">{oportunidad}</p>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div variants={item} className="mt-5">
          <motion.button
            onClick={onNext}
            whileTap={reduce ? {} : { scale: 0.97 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-teal-700"
          >
            Ver qué va a hacer Codflow por mí <ArrowRight className="h-4 w-4" />
          </motion.button>
          <p className="mt-2.5 text-center text-xs text-gray-400">
            Nuestros agentes ya están preparando su análisis
          </p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

// ── Pantalla 1: Plan visual animado ──────────────────────────────────────────

const PLAN_STAGGER = 0.78;

function Screen1Plan({
  respuestas,
  enviando,
  enviado,
  error,
  onNext,
}: {
  respuestas: Record<string, string>;
  enviando: boolean;
  enviado: boolean;
  error: string | null;
  onNext: () => void;
}) {
  const reduce = useReducedMotion();
  const ctaDelay = PLAN_STEPS.length * PLAN_STAGGER + 0.5;

  return (
    <motion.div
      key="s1"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, x: -32 }}
      transition={reduce ? { duration: 0.18 } : { type: "spring", stiffness: 280, damping: 28 }}
      className="flex min-h-screen flex-col items-center bg-[#f0f4f4] px-4 py-10"
    >
      <div className="w-full max-w-sm">
        {/* Header */}
        <motion.div
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-orange-500 shadow-md">
            <span className="text-lg font-bold text-white">C</span>
          </div>
          <h2 className="text-xl font-bold text-[#1c2b2b]">
            Plan para {respuestas.empresa ?? "su empresa"}
          </h2>
          <p className="mt-1 text-sm text-gray-500 max-w-[55ch] mx-auto">
            Esto es exactamente lo que nuestros agentes están haciendo ahora mismo.
          </p>
        </motion.div>

        {/* Timeline */}
        <div className="relative pl-2">
          {/* Línea vertical con progreso animado */}
          <div className="absolute left-[33px] top-7 bottom-7 w-px bg-gray-200 overflow-hidden">
            <motion.div
              className="w-full bg-teal-400 origin-top"
              style={{ height: "100%" }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{
                delay: 0.5,
                duration: PLAN_STEPS.length * PLAN_STAGGER,
                ease: "linear",
              }}
            />
          </div>

          <div className="space-y-0">
            {PLAN_STEPS.map((step, i) => {
              const Icon = step.icon;
              const delay = 0.3 + i * PLAN_STAGGER;
              return (
                <motion.div
                  key={step.id}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay, type: "spring", stiffness: 300, damping: 26 }}
                  className="flex items-start gap-4 pb-7 last:pb-0"
                >
                  {/* Ícono */}
                  <div className="relative z-10 flex h-[56px] w-[56px] shrink-0 items-center justify-center rounded-2xl bg-teal-600 shadow-md ring-4 ring-[#f0f4f4]">
                    <motion.div
                      initial={{ scale: 0.4, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        delay: delay + 0.15,
                        type: "spring",
                        stiffness: 420,
                        damping: 20,
                      }}
                    >
                      <Icon className="h-6 w-6 text-white" />
                    </motion.div>
                  </div>

                  {/* Texto */}
                  <div className="flex-1 pt-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold leading-tight text-[#1c2b2b]">{step.title}</p>
                      <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[11px] tabular-nums font-medium text-gray-400 ring-1 ring-gray-200">
                        {step.tiempo}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500 max-w-[48ch]">
                      {step.description(respuestas)}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Estado API */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4 text-center text-xs text-red-500"
          >
            ❌ {error}
          </motion.p>
        )}

        {/* CTA — aparece después de que todos los pasos se revelaron */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: ctaDelay, type: "spring", stiffness: 260, damping: 26 }}
          className="mt-8"
        >
          <div className="mb-3 flex items-center justify-center gap-2 text-xs text-gray-500">
            {(enviando || !enviado) && (
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.1, ease: "linear" }}
                className="block h-3.5 w-3.5 rounded-full border-2 border-teal-400 border-t-transparent"
              />
            )}
            {enviado
              ? "✓ Agentes iniciados — trabajando en su caso"
              : enviando
              ? "Iniciando sus agentes…"
              : "Conectando agentes…"}
          </div>
          <motion.button
            onClick={onNext}
            whileTap={reduce ? {} : { scale: 0.97 }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-teal-700"
          >
            Ver próximos pasos <ArrowRight className="h-4 w-4" />
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
}

// ── Pantalla 2: Próximos pasos ────────────────────────────────────────────────

function Screen2ProximosPasos({
  respuestas,
  entrevistaId,
}: {
  respuestas: Record<string, string>;
  entrevistaId: string | null;
}) {
  const reduce = useReducedMotion();
  const canal = respuestas.canal_contacto ?? "WhatsApp";
  const cuando = respuestas.cuando ?? "pronto";
  const cuandoFmt = cuando.toLowerCase().startsWith("esta")
    ? cuando.toLowerCase()
    : cuando.toLowerCase().startsWith("la")
    ? cuando.toLowerCase()
    : "pronto";
  const analisisHref = entrevistaId ? `/cliente/analisis/${entrevistaId}` : "/cliente";

  const pasos = [
    {
      num: "1",
      color: "bg-teal-50 text-teal-700",
      titulo: "Sus agentes ya están trabajando",
      desc: `Nuestros agentes inteligentes investigan ${respuestas.empresa ?? "su empresa"} en este momento.`,
      cta: { label: "Ver análisis en tiempo real →", href: analisisHref },
    },
    {
      num: "2",
      color: "bg-orange-50 text-orange-700",
      titulo: `Le contactaremos por ${canal}`,
      desc: `Recibirá los primeros resultados ${cuandoFmt}.`,
      cta: null,
    },
    {
      num: "3",
      color: "bg-indigo-50 text-indigo-700",
      titulo: "Reporte de inteligencia listo",
      desc: "Su reporte completo con oportunidades y próximos pasos estará disponible en minutos.",
      cta: entrevistaId ? { label: "Ver mi reporte →", href: `/cliente/reporte/${entrevistaId}` } : null,
    },
  ];

  const container = {
    hidden: {},
    show: { transition: { staggerChildren: 0.13 } },
  };
  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 22 },
    show: {
      opacity: 1, y: 0,
      transition: { type: "spring" as const, stiffness: 320, damping: 28 },
    },
  };

  return (
    <motion.div
      key="s2"
      initial={reduce ? { opacity: 0 } : { opacity: 0, x: 48 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={reduce ? { duration: 0.18 } : { type: "spring", stiffness: 260, damping: 26 }}
      className="flex min-h-screen flex-col items-center justify-center bg-[#f0f4f4] px-4 py-10"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm"
      >
        {/* Ícono de check */}
        <motion.div
          variants={item}
          className="mb-6 flex flex-col items-center gap-3"
        >
          <motion.div
            initial={reduce ? { scale: 0.8, opacity: 0 } : { scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 360, damping: 22, delay: 0.1 }}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-600 shadow-lg"
          >
            <CheckCircle className="h-8 w-8 text-white" />
          </motion.div>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-[#1c2b2b]">¿Qué sigue ahora?</h2>
            <p className="mt-0.5 text-sm text-gray-500">Su análisis está en marcha.</p>
          </div>
        </motion.div>

        {/* Cards de próximos pasos */}
        <div className="space-y-3">
          {pasos.map((paso, i) => (
            <motion.div
              key={i}
              variants={item}
              className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${paso.color}`}
                >
                  {paso.num}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[#1c2b2b]">{paso.titulo}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-gray-500 max-w-[52ch]">
                    {paso.desc}
                  </p>
                  {paso.cta && (
                    <a
                      href={paso.cta.href}
                      className="mt-1.5 inline-flex items-center gap-1 text-sm font-semibold text-teal-600 transition-colors duration-150 hover:text-teal-700"
                    >
                      {paso.cta.label}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Botones principales */}
        <motion.div variants={item} className="mt-6 space-y-3">
          <a
            href={analisisHref}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-teal-700 active:scale-[0.97]"
          >
            Ver mi análisis en tiempo real <ArrowRight className="h-4 w-4" />
          </a>
          <button
            onClick={() => window.print()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-gray-600 transition-colors duration-200 hover:border-teal-300 hover:text-teal-700 active:scale-[0.97]"
          >
            <Download className="h-4 w-4" /> Descargar resumen en PDF
          </button>
        </motion.div>

        <motion.p variants={item} className="mt-5 text-center text-xs text-gray-400">
          Codflow Intelligence · Análisis personalizado para {respuestas.empresa ?? "su empresa"}
        </motion.p>
      </motion.div>
    </motion.div>
  );
}

// ── Orquestador de las 3 pantallas ────────────────────────────────────────────

function ResumenFinal({
  respuestas,
  enviando,
  enviado,
  error,
  onEnviar,
  entrevistaId,
}: {
  respuestas: Record<string, string>;
  enviando: boolean;
  enviado: boolean;
  error: string | null;
  onEnviar: () => void;
  entrevistaId: string | null;
}) {
  const [screenIdx, setScreenIdx] = useState<0 | 1 | 2>(0);
  const hasFiredRef = useRef(false);

  // Disparar el orquestador cuando el usuario llega a la pantalla del plan
  useEffect(() => {
    if (screenIdx !== 1 || hasFiredRef.current) return;
    hasFiredRef.current = true;
    onEnviar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenIdx]);

  return (
    <AnimatePresence mode="wait">
      {screenIdx === 0 && (
        <Screen0Perfil
          key="s0"
          respuestas={respuestas}
          onNext={() => setScreenIdx(1)}
        />
      )}
      {screenIdx === 1 && (
        <Screen1Plan
          key="s1"
          respuestas={respuestas}
          enviando={enviando}
          enviado={enviado}
          error={error}
          onNext={() => setScreenIdx(2)}
        />
      )}
      {screenIdx === 2 && (
        <Screen2ProximosPasos key="s2" respuestas={respuestas} entrevistaId={entrevistaId} />
      )}
    </AnimatePresence>
  );
}

// ── Input area por tipo ───────────────────────────────────────────────────────

interface InputAreaProps {
  step: Step;
  respuestas: Record<string, string>;
  pending: boolean;    // esperando seguimiento
  pendingStep?: { id: string; pregunta: string; tipo: StepType; placeholder?: string };
  onAnswer: (val: string, id?: string) => void;
}

function InputArea({ step, respuestas, pending, pendingStep, onAnswer }: InputAreaProps) {
  const reduce = useReducedMotion();
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const [textVal, setTextVal] = useState("");
  const [multiSel, setMultiSel] = useState<string[]>([]);
  const [otroSelected, setOtroSelected] = useState(false);
  const [otroVal, setOtroVal] = useState("");
  const [freeMode, setFreeMode] = useState(false);

  // Resetear cuando cambia el paso
  useEffect(() => {
    setTextVal("");
    setMultiSel([]);
    setOtroSelected(false);
    setOtroVal("");
    setFreeMode(false);
  }, [step.id, pending]);

  useEffect(() => {
    const tipo = pending ? pendingStep?.tipo : step.tipo;
    if (tipo === "text" || tipo === "url" || tipo === "longtext" || freeMode) {
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [step.id, pending, freeMode, pendingStep?.tipo, step.tipo]);

  // Si está esperando seguimiento, mostrar solo ese input
  if (pending && pendingStep) {
    const ph = pendingStep.placeholder ? interpolate(pendingStep.placeholder, respuestas) : "Su respuesta…";
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={pendingStep.tipo === "url" ? "url" : "text"}
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && textVal.trim()) onAnswer(textVal.trim(), pendingStep.id); }}
          placeholder={ph}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
        <button
          onClick={() => textVal.trim() && onAnswer(textVal.trim(), pendingStep.id)}
          disabled={!textVal.trim()}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:scale-[0.95] disabled:opacity-40 transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const tipo = step.tipo;

  // ── Text / URL ─────────────────────────────────────────────────────────────
  if (tipo === "text" || tipo === "url") {
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef as React.RefObject<HTMLInputElement>}
          type={tipo === "url" ? "url" : "text"}
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && textVal.trim()) onAnswer(textVal.trim()); }}
          placeholder={step.placeholder ?? "Escriba aquí…"}
          className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
        <button
          onClick={() => textVal.trim() && onAnswer(textVal.trim())}
          disabled={!textVal.trim()}
          className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:scale-[0.95] disabled:opacity-40 transition-all"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>
    );
  }

  // ── Longtext ───────────────────────────────────────────────────────────────
  if (tipo === "longtext") {
    return (
      <div className="space-y-2">
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={textVal}
          onChange={(e) => setTextVal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && textVal.trim()) onAnswer(textVal.trim()); }}
          placeholder={step.placeholder ?? "Cuéntenos con detalle…"}
          rows={3}
          className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
        />
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Ctrl+Enter para enviar</span>
          <button
            onClick={() => textVal.trim() && onAnswer(textVal.trim())}
            disabled={!textVal.trim()}
            className="flex items-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-[0.97] disabled:opacity-40 transition-all"
          >
            <Send className="h-3.5 w-3.5" /> Enviar
          </button>
        </div>
      </div>
    );
  }

  // ── Options ────────────────────────────────────────────────────────────────
  if (tipo === "options") {
    if (freeMode) {
      return (
        <div className="flex gap-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && textVal.trim()) onAnswer(textVal.trim()); }}
            placeholder="Escríbalo aquí…"
            autoFocus
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
          <button onClick={() => textVal.trim() && onAnswer(textVal.trim())} disabled={!textVal.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:scale-[0.95] disabled:opacity-40 transition-all">
            <Send className="h-4 w-4" />
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {step.opciones?.map((op) => {
            const isOtro = op === "Otro";
            const isSelected = isOtro && otroSelected;
            return (
              <React.Fragment key={op}>
                <motion.button
                  whileTap={reduce ? {} : { scale: 0.96 }}
                  onClick={() => {
                    if (isOtro) {
                      setOtroSelected(true);
                      setOtroVal("");
                    } else {
                      onAnswer(op);
                    }
                  }}
                  className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-left text-sm font-medium transition-colors duration-150 ${
                    isSelected
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-teal-400 hover:bg-teal-50"
                  }`}
                >
                  {isOtro && <Pencil className="h-3 w-3 opacity-60" />}
                  {op}
                </motion.button>
              </React.Fragment>
            );
          })}
        </div>

        {/* Expansión de "Otro" */}
        <AnimatePresence>
          {otroSelected && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex gap-2 overflow-hidden"
            >
              <input
                autoFocus
                type="text"
                value={otroVal}
                onChange={(e) => setOtroVal(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && otroVal.trim()) onAnswer(otroVal.trim()); }}
                placeholder="Describa su respuesta…"
                className="flex-1 rounded-xl border border-teal-300 bg-teal-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
              <button onClick={() => otroVal.trim() && onAnswer(otroVal.trim())} disabled={!otroVal.trim()}
                className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:scale-[0.95] disabled:opacity-40 transition-all">
                <Send className="h-4 w-4" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escribir libremente */}
        {step.allowFreeText && !otroSelected && (
          <button
            onClick={() => setFreeMode(true)}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors"
          >
            <Pencil className="h-3 w-3" /> O escríbalo con sus propias palabras
          </button>
        )}
      </div>
    );
  }

  // ── Multiselect ────────────────────────────────────────────────────────────
  if (tipo === "multiselect") {
    if (freeMode) {
      return (
        <div className="flex gap-2">
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type="text"
            value={textVal}
            onChange={(e) => setTextVal(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && textVal.trim()) onAnswer(textVal.trim()); }}
            placeholder="Escríbalo aquí…"
            autoFocus
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
          />
          <button onClick={() => textVal.trim() && onAnswer(textVal.trim())} disabled={!textVal.trim()}
            className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700 active:scale-[0.95] disabled:opacity-40 transition-all">
            <Send className="h-4 w-4" />
          </button>
        </div>
      );
    }

    const hasOtro = step.opciones?.includes("Otro");
    const normalOpciones = step.opciones?.filter((o) => o !== "Otro") ?? [];
    const selWithoutOtro = multiSel.filter((s) => s !== "Otro");

    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {normalOpciones.map((op) => {
            const sel = multiSel.includes(op);
            return (
              <motion.button
                key={op}
                whileTap={reduce ? {} : { scale: 0.96 }}
                onClick={() => setMultiSel((prev) => prev.includes(op) ? prev.filter((x) => x !== op) : [...prev, op])}
                className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  sel
                    ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-700 hover:border-teal-400 hover:bg-teal-50"
                }`}
              >
                {sel && <Check className="h-3.5 w-3.5 shrink-0" />}
                {op}
              </motion.button>
            );
          })}

          {hasOtro && (
            <motion.button
              whileTap={reduce ? {} : { scale: 0.96 }}
              onClick={() => setOtroSelected(!otroSelected)}
              className={`flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors duration-150 ${
                otroSelected ? "border-teal-500 bg-teal-50 text-teal-700" : "border-gray-200 bg-white text-gray-700 hover:border-teal-400 hover:bg-teal-50"
              }`}
            >
              <Pencil className="h-3 w-3 opacity-60" /> Otro
            </motion.button>
          )}
        </div>

        {/* Expansión Otro */}
        <AnimatePresence>
          {otroSelected && (
            <motion.div
              initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <input
                autoFocus
                type="text"
                value={otroVal}
                onChange={(e) => setOtroVal(e.target.value)}
                placeholder="Describa su respuesta…"
                className="w-full rounded-xl border border-teal-300 bg-teal-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 transition-all"
              />
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const final = [
                ...selWithoutOtro,
                ...(otroSelected && otroVal.trim() ? [otroVal.trim()] : []),
              ];
              if (!final.length) return;
              onAnswer(final.join(", "));
            }}
            disabled={selWithoutOtro.length === 0 && !(otroSelected && otroVal.trim())}
            className="flex items-center gap-2 rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 active:scale-[0.97] disabled:opacity-40 transition-all"
          >
            <Send className="h-3.5 w-3.5" />
            Confirmar{selWithoutOtro.length > 0 ? ` (${selWithoutOtro.length + (otroSelected && otroVal.trim() ? 1 : 0)})` : ""}
          </button>

          {step.allowFreeText && (
            <button
              onClick={() => setFreeMode(true)}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-teal-600 transition-colors"
            >
              <Pencil className="h-3 w-3" /> Escríbalo con sus propias palabras
            </button>
          )}
        </div>
      </div>
    );
  }

  return null;
}

// ── COMPONENTE PRINCIPAL ──────────────────────────────────────────────────────

export default function EntrevistaPage() {
  // Queue de pasos pendientes (empieza con todos los IDs)
  const [queue, setQueue] = useState<string[]>(STEPS.map((s) => s.id));
  const [completados, setCompletados] = useState(0);
  const [totalEfectivo, setTotalEfectivo] = useState(STEPS.length);

  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [mensajes, setMensajes] = useState<Array<{ tipo: "agente" | "cliente"; texto: string }>>([]);
  const [showTyping, setShowTyping] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [pendingSeguimiento, setPendingSeguimiento] = useState<
    { id: string; pregunta: string; tipo: StepType; placeholder?: string } | null
  >(null);

  const [terminado, setTerminado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const [entrevistaId, setEntrevistaId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const currentStepId = queue[0];
  const currentStep = STEPS.find((s) => s.id === currentStepId);
  const etapaActual = currentStep?.etapa ?? 4;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
  }, [mensajes, showTyping, showInput, reduce]);

  // Mostrar primera pregunta
  useEffect(() => {
    const first = STEPS[0];
    setShowTyping(true);
    setTimeout(() => {
      setShowTyping(false);
      setMensajes([{ tipo: "agente", texto: first.pregunta }]);
      setShowInput(true);
    }, 900);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Avanza a la siguiente pregunta de la queue, saltando las que ya están respondidas
  const avanzarQueue = useCallback(
    (nuevasResp: Record<string, string>, queueActual: string[]) => {
      // Quitar el step actual (ya respondido)
      let restante = queueActual.slice(1);

      // Saltar pasos cuya skipIf retorna true con las nuevas respuestas
      const saltados: string[] = [];
      while (restante.length > 0) {
        const sig = STEPS.find((s) => s.id === restante[0]);
        if (sig?.skipIf?.(nuevasResp)) {
          saltados.push(restante[0]);
          // Auto-registrar la respuesta saltada con la info que ya tenemos
          if (sig.id === "zonas_clientes" && nuevasResp.sucursales_detalle) {
            nuevasResp = { ...nuevasResp, zonas_clientes: nuevasResp.sucursales_detalle };
          }
          restante = restante.slice(1);
        } else {
          break;
        }
      }

      // Actualizar total efectivo (reducir por saltos)
      setTotalEfectivo((prev) => Math.max(1, prev - saltados.length));
      setQueue(restante);

      if (restante.length === 0) {
        setTerminado(true);
        return;
      }

      const sigStep = STEPS.find((s) => s.id === restante[0]);
      if (!sigStep) { setTerminado(true); return; }

      const pregunta = interpolate(sigStep.pregunta, nuevasResp);
      const delay = reduce ? 250 : 750;

      setShowTyping(true);
      setTimeout(() => {
        setShowTyping(false);
        setMensajes((prev) => [...prev, { tipo: "agente", texto: pregunta }]);
        setShowInput(true);
      }, delay);
    },
    [reduce]
  );

  function handleAnswer(val: string, idOverride?: string) {
    if (!currentStep) return;

    const id = idOverride ?? (pendingSeguimiento ? pendingSeguimiento.id : currentStep.id);
    const nuevasResp = { ...respuestas, [id]: val };
    setRespuestas(nuevasResp);
    setMensajes((prev) => [...prev, { tipo: "cliente", texto: val }]);
    setShowInput(false);
    setCompletados((c) => c + 1);

    // ¿Necesita seguimiento?
    const seg = currentStep.seguimientoSi;
    if (seg && !pendingSeguimiento) {
      const match =
        typeof seg.opcion === "string" ? val === seg.opcion : seg.opcion.test(val);
      if (match) {
        const pregSeg = interpolate(seg.pregunta, { ...nuevasResp, [currentStep.id]: val });
        const delay = reduce ? 250 : 600;
        setTimeout(() => {
          setShowTyping(true);
          setTimeout(() => {
            setShowTyping(false);
            setMensajes((prev) => [...prev, { tipo: "agente", texto: pregSeg }]);
            setPendingSeguimiento({ id: seg.id, pregunta: pregSeg, tipo: seg.tipo, placeholder: seg.placeholder });
            setShowInput(true);
          }, delay);
        }, 200);
        return;
      }
    }

    // Limpiar seguimiento pendiente si lo había
    setPendingSeguimiento(null);
    avanzarQueue(nuevasResp, queue);
  }

  async function handleEnviar() {
    setEnviando(true);
    setErrorEnvio(null);
    try {
      const payload = {
        empresa: respuestas.empresa,
        rubro: respuestas.rubro,
        zona: respuestas.zona,
        problema: respuestas.problema,
        objetivos: respuestas.objetivo,
        competidores: respuestas.competidores,
        presupuesto: respuestas.presupuesto,
        contacto: {
          nombre: respuestas.nombre_contacto,
          cargo: respuestas.cargo,
          canal: respuestas.canal_contacto,
          valor: respuestas.canal_valor ?? "",
          cuando: respuestas.cuando,
        },
        respuestas_completas: respuestas,
        anios_operando: respuestas.anios,
        empleados: respuestas.empleados,
        web: respuestas.web_url ?? null,
        sucursales: respuestas.sucursales_detalle ?? "",
        zonas_clientes: (respuestas.zonas_clientes ?? "").split(", ").filter(Boolean),
        problemas_intentados: respuestas.herramientas ?? "",
      };
      const res = await fetch("/api/entrevista", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json() as { ok?: boolean; error?: string; entrevista_id?: string };
      if (!res.ok || !data.ok) setErrorEnvio(data.error ?? "Error desconocido");
      else { setEnviado(true); setEntrevistaId(data.entrevista_id ?? null); }
    } catch {
      setErrorEnvio("Error de red. Intente de nuevo.");
    } finally {
      setEnviando(false);
    }
  }

  if (terminado) {
    return (
      <ResumenFinal
        respuestas={respuestas}
        enviando={enviando}
        enviado={enviado}
        error={errorEnvio}
        onEnviar={handleEnviar}
        entrevistaId={entrevistaId}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f0f4f4]">
      <ProgressBar
        etapa={etapaActual}
        completados={completados}
        total={totalEfectivo}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
          <AnimatePresence mode="sync">
            {mensajes.map((m, i) =>
              m.tipo === "agente"
                ? <AgentBubble key={i} text={m.texto} />
                : <ClientBubble key={i} text={m.texto} />
            )}
            {showTyping && (
              <motion.div key="typing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <TypingIndicator />
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={bottomRef} />
        </div>
      </div>

      <AnimatePresence>
        {showInput && currentStep && (
          <motion.div
            key={`input-${currentStep.id}-${Boolean(pendingSeguimiento)}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 8 }}
            transition={reduce ? { duration: 0.15 } : { type: "spring", stiffness: 300, damping: 28 }}
            className="border-t border-gray-200/70 bg-white px-4 py-4 shadow-[0_-4px_24px_rgba(0,0,0,0.07)]"
          >
            <div className="mx-auto max-w-2xl">
              <InputArea
                step={currentStep}
                respuestas={respuestas}
                pending={Boolean(pendingSeguimiento)}
                pendingStep={pendingSeguimiento ?? undefined}
                onAnswer={handleAnswer}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
