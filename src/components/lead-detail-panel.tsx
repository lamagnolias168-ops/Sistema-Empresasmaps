"use client";

import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  X, Star, MapPin, Phone, Globe, MessageCircle,
  AlertTriangle, Lightbulb, Users, Award, TrendingUp,
  CheckCircle, Calendar, Clock, Send, MessageSquare,
  PhoneCall, Mail, Video, FileText, StickyNote,
  Copy, Check, Search, Loader2, BrainCircuit,
} from "lucide-react";
import type { Interaccion, Lead } from "@/types/lead";
import { TierBadge } from "@/components/tier-badge";
import { updateLeadCrm } from "@/lib/supabase";
import { ESTADO_OPTIONS, getEstadoConfig } from "@/lib/estado-config";

const INTERACTION_TYPES = [
  { value: "llamada",  label: "Llamada",      Icon: PhoneCall },
  { value: "whatsapp", label: "WhatsApp",      Icon: MessageCircle },
  { value: "email",    label: "Email",         Icon: Mail },
  { value: "reunion",  label: "Reunión",       Icon: Video },
  { value: "nota",     label: "Nota interna",  Icon: StickyNote },
] as const;

function getInteractionIcon(tipo: string) {
  return INTERACTION_TYPES.find((t) => t.value === tipo)?.Icon ?? FileText;
}

function todayStr() { return new Date().toISOString().slice(0, 10); }
function addDays(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10);
}
function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-PA", { day: "2-digit", month: "short", year: "numeric" })
    + " · " + d.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit" });
}
function seguimientoStatus(dateStr: string | null): { label: string; cls: string } | null {
  if (!dateStr) return null;
  const today = todayStr();
  if (dateStr < today) return { label: "VENCIDO", cls: "text-red-600 font-semibold" };
  if (dateStr === today) return { label: "HOY", cls: "text-orange-500 font-semibold" };
  return { label: "Próximo", cls: "text-green-600 font-medium" };
}

function extractMarkdown(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    if (typeof obj.value === "string") return obj.value;
  }
  return "";
}

interface ParsedSection { title: string; content: string }
function parseSections(md: string): ParsedSection[] {
  const lines = md.split("\n");
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (const line of lines) {
    if (line.startsWith("### ")) {
      if (current) sections.push(current);
      current = { title: line.replace(/^###\s*\d*\.\s*/, "").trim(), content: "" };
    } else if (current) { current.content += line + "\n"; }
  }
  if (current) sections.push(current);
  return sections;
}

function boldify(t: string) {
  return t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>");
}
function MdText({ text }: { text: string }) {
  return (
    <div className="space-y-1">
      {text.trim().split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-2" />;
        if (t.startsWith("- ") || t.startsWith("* ")) return (
          <div key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-gray-400" />
            <span dangerouslySetInnerHTML={{ __html: boldify(t.slice(2)) }} />
          </div>
        );
        return <p key={i} className="text-sm text-gray-700 leading-relaxed" dangerouslySetInnerHTML={{ __html: boldify(t) }} />;
      })}
    </div>
  );
}

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  if (value == null) return null;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-500">
        <span>{label}</span><span className="font-medium text-gray-700">{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-gray-100">
        <div className="h-1.5 rounded-full bg-teal-500 transition-[width] duration-500 ease-out" style={{ width: `${Math.min(100, (value / 25) * 100)}%` }} />
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children, accent }: {
  icon: React.ComponentType<{ className?: string }>; title: string;
  children: React.ReactNode; accent?: string;
}) {
  return (
    <div className={`rounded-lg border p-4 ${accent ?? "border-gray-200 bg-white"}`}>
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-gray-500" />
        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ── Mensaje generators ───────────────────────────────────────────────────────
function normalizePhone(raw: string | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  // Si ya tiene 507 al inicio (código de Panamá) y 11 dígitos total → ok
  if (digits.startsWith("507") && digits.length >= 10) return digits;
  // Si empieza con + → ya tiene código país
  if (raw.trim().startsWith("+")) return digits;
  // Número local panameño (8 dígitos) → agregar 507
  if (digits.length === 8) return "507" + digits;
  return digits;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button onClick={handleCopy}
      className="press flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100">
      {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : "Copiar"}
    </button>
  );
}

type CanalPitch = "whatsapp" | "email" | "llamada";

interface PitchResult {
  canal: CanalPitch;
  mensaje_whatsapp?: string;
  asunto?: string;
  cuerpo_email?: string;
  script_llamada?: string;
  tono_usado: string;
  hay_historial: boolean;
  advertencias: string[];
}

function MensajeSection({ lead }: { lead: Lead }) {
  const [canal, setCanal] = useState<CanalPitch>("whatsapp");
  const [contextoAdicional, setContextoAdicional] = useState("");
  const [generando, setGenerando] = useState(false);
  const [pitch, setPitch] = useState<PitchResult | null>(null);
  const [errorPitch, setErrorPitch] = useState<string | null>(null);
  const phone = normalizePhone(lead.telefono);

  async function handleGenerar() {
    setGenerando(true);
    setPitch(null);
    setErrorPitch(null);
    try {
      const res = await fetch("/api/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: lead.id,
          canal,
          contexto_adicional: contextoAdicional.trim() || undefined,
        }),
      });
      const data = await res.json() as PitchResult & { error?: string };
      if (!res.ok || data.error) {
        setErrorPitch(data.error ?? `Error ${res.status}`);
      } else {
        setPitch(data);
      }
    } catch {
      setErrorPitch("Error de red al llamar /api/pitch");
    } finally {
      setGenerando(false);
    }
  }

  function handleWhatsApp(msg: string) {
    if (!phone) return;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  }

  function handleEmail(asunto: string, cuerpo: string) {
    window.location.href = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
  }

  const CANALES: { value: CanalPitch; label: string; Icon: React.FC<{ className?: string }> }[] = [
    { value: "whatsapp", label: "WhatsApp", Icon: MessageCircle },
    { value: "email",    label: "Email",    Icon: Mail },
    { value: "llamada",  label: "Llamada",  Icon: PhoneCall },
  ];

  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Send className="h-4 w-4 text-green-600 shrink-0" />
        <h3 className="text-sm font-semibold text-green-800 uppercase tracking-wide">Mensaje con IA</h3>
      </div>

      {/* Selector de canal */}
      <div className="flex gap-1.5">
        {CANALES.map(({ value, label, Icon }) => (
          <button
            key={value}
            onClick={() => { setCanal(value); setPitch(null); setErrorPitch(null); }}
            className={`press flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
              canal === value
                ? "border-green-500 bg-green-600 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Contexto adicional */}
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-500">
          Contexto adicional <span className="font-normal opacity-70">(opcional)</span>
        </label>
        <textarea
          value={contextoAdicional}
          onChange={(e) => setContextoAdicional(e.target.value)}
          placeholder='Ej: "ya hablé con él la semana pasada, dijo que no tenía presupuesto"'
          rows={2}
          className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-green-400 focus:outline-none focus:ring-1 focus:ring-green-300"
        />
      </div>

      <button
        onClick={handleGenerar}
        disabled={generando}
        className="press inline-flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
      >
        {generando
          ? <><Loader2 className="h-4 w-4 animate-spin" /> Generando mensaje…</>
          : <><Send className="h-4 w-4" /> Generar mensaje con IA</>}
      </button>

      {errorPitch && (
        <p className="text-xs text-red-600">❌ {errorPitch}</p>
      )}

      {/* Resultado */}
      {pitch && (
        <div className="space-y-2.5">
          {pitch.advertencias.length > 0 && (
            <p className="text-xs text-amber-600">⚠ {pitch.advertencias.join(" · ")}</p>
          )}

          {/* WhatsApp */}
          {pitch.canal === "whatsapp" && pitch.mensaje_whatsapp && (
            <div className="rounded-md border border-green-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                WhatsApp · {pitch.tono_usado}
              </p>
              <p className="mb-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{pitch.mensaje_whatsapp}</p>
              <div className="flex gap-2 flex-wrap">
                {phone
                  ? <button onClick={() => handleWhatsApp(pitch.mensaje_whatsapp!)}
                      className="press flex items-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-600">
                      <MessageCircle className="h-3.5 w-3.5" /> Abrir WhatsApp
                    </button>
                  : <p className="text-xs text-gray-400 self-center">Sin número registrado</p>
                }
                <CopyButton text={pitch.mensaje_whatsapp} />
              </div>
            </div>
          )}

          {/* Email */}
          {pitch.canal === "email" && pitch.cuerpo_email && (
            <div className="rounded-md border border-green-200 bg-white p-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Email · {pitch.tono_usado}
              </p>
              {pitch.asunto && (
                <p className="mb-2 text-xs text-gray-400">
                  Asunto: <span className="font-medium text-gray-700">{pitch.asunto}</span>
                </p>
              )}
              <p className="mb-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{pitch.cuerpo_email}</p>
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => handleEmail(pitch.asunto ?? "", pitch.cuerpo_email!)}
                  className="press flex items-center gap-1.5 rounded-md bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
                  <Mail className="h-3.5 w-3.5" /> Abrir Email
                </button>
                <CopyButton text={`Asunto: ${pitch.asunto ?? ""}\n\n${pitch.cuerpo_email}`} />
              </div>
            </div>
          )}

          {/* Llamada */}
          {pitch.canal === "llamada" && pitch.script_llamada && (
            <div className="rounded-md border border-green-200 bg-white p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                Script llamada · {pitch.tono_usado}
              </p>
              <pre className="mb-3 whitespace-pre-wrap text-sm text-gray-700 leading-relaxed font-sans">{pitch.script_llamada}</pre>
              <CopyButton text={pitch.script_llamada} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface PostLlamadaSugerencia {
  situacion: string;
  proximo_paso: string;
  fecha_sugerida: string;
  dias_recomendados: number;
  mensaje_seguimiento: string;
  nota_automatica: string;
  actualizar_estado?: string;
  advertencias: string[];
  notas_actualizadas?: Interaccion[];
}

const SITUACION_LABEL: Record<string, string> = {
  no_contesto: "No contestó",
  buzon_correo: "Buzón de voz",
  objecion_precio: "Objeción: precio",
  objecion_tiempo: "Objeción: tiempo",
  objecion_necesidad: "Objeción: necesidad",
  interes_confirmado: "Interés confirmado ✓",
  pidio_informacion: "Pidió información",
  reunion_agendada: "Reunión agendada ✓",
  rechazo_definitivo: "Rechazo definitivo",
  seguimiento_neutro: "Seguimiento neutro",
};

function CrmSection({ lead, onCrmUpdate }: { lead: Lead; onCrmUpdate: (f: Partial<Lead>) => void }) {
  const [estado, setEstado] = useState(lead.estado ?? "por_contactar");
  const [nota, setNota] = useState("");
  const [tipo, setTipo] = useState("llamada");
  const [fecha, setFecha] = useState(lead.fecha_proximo_seguimiento ?? "");
  const [historial, setHistorial] = useState<Interaccion[]>(lead.notas_interacciones ?? []);
  const [saving, setSaving] = useState(false);
  const [savingFecha, setSavingFecha] = useState(false);
  const [analizando, setAnalizando] = useState(false);
  const [sugerencia, setSugerencia] = useState<PostLlamadaSugerencia | null>(null);

  const diasDesdeUltimo = historial.length
    ? Math.floor((Date.now() - new Date(historial[0].fecha).getTime()) / 86400000)
    : null;

  async function cambiarEstado(val: string) {
    setEstado(val); setSaving(true);
    try { await updateLeadCrm(lead.id, { estado: val }); onCrmUpdate({ estado: val }); }
    finally { setSaving(false); }
  }

  async function agregarNota() {
    const texto = nota.trim();
    if (!texto) return;

    // 1. Guardar la nota del vendedor inmediatamente (UX optimista)
    const nueva = { fecha: new Date().toISOString(), texto, tipo } as Interaccion;
    const notasConNueva = [nueva, ...historial];
    setHistorial(notasConNueva);
    setNota("");
    setSaving(true);
    try {
      await updateLeadCrm(lead.id, { notas_interacciones: notasConNueva });
      onCrmUpdate({ notas_interacciones: notasConNueva });
    } finally {
      setSaving(false);
    }

    // 2. Disparar agente post-llamada en background (no bloquea al vendedor)
    setSugerencia(null);
    setAnalizando(true);
    try {
      const res = await fetch("/api/post-llamada", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id, nota_nueva: texto, tipo_interaccion: tipo }),
      });
      const data = await res.json() as PostLlamadaSugerencia & { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setSugerencia(data);
        // Actualizar estado local con la nota del agente + fecha sugerida
        if (data.notas_actualizadas) {
          setHistorial(data.notas_actualizadas);
          onCrmUpdate({ notas_interacciones: data.notas_actualizadas });
        }
        if (data.fecha_sugerida) {
          setFecha(data.fecha_sugerida);
          onCrmUpdate({ fecha_proximo_seguimiento: data.fecha_sugerida });
        }
        if (data.actualizar_estado) {
          setEstado(data.actualizar_estado);
          onCrmUpdate({ estado: data.actualizar_estado });
        }
      }
    } catch {
      // El agente falló silenciosamente — la nota ya está guardada
    } finally {
      setAnalizando(false);
    }
  }
  async function cambiarFecha(val: string) {
    setFecha(val); setSavingFecha(true);
    try { await updateLeadCrm(lead.id, { fecha_proximo_seguimiento: val || null }); onCrmUpdate({ fecha_proximo_seguimiento: val || null }); }
    finally { setSavingFecha(false); }
  }

  const ss = seguimientoStatus(fecha || null);

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { value: diasDesdeUltimo !== null ? String(diasDesdeUltimo) : "—", label: "días sin contacto" },
          { value: String(historial.length), label: "interacciones" },
          {
            value: fecha
              ? (ss?.label === "VENCIDO" ? "⚠️" : ss?.label === "HOY" ? "🔔" : "✓")
              : "—",
            label: fecha
              ? new Date(fecha + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })
              : "sin seguimiento",
            cls: ss?.cls,
          },
        ].map(({ value, label, cls }, i) => (
          <div key={i} className="rounded-lg border border-gray-200 bg-white p-3 text-center">
            <p className={`text-xl font-bold ${cls ?? "text-gray-800"}`}>{value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>

      {/* Estado */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Estado del prospecto</h3>
          {saving && <span className="text-xs text-gray-400">Guardando…</span>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          {ESTADO_OPTIONS.map((opt) => {
            const active = estado === opt.value;
            return (
              <button key={opt.value} onClick={() => cambiarEstado(opt.value)}
                className={`press flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold ${
                  active ? opt.colorActive + " border-transparent shadow-sm" : opt.color + " border-gray-200 hover:border-gray-300"
                }`}>
                <span className="text-base leading-none">{opt.icon}</span>
                <span className="leading-tight">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fecha seguimiento */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" /> Próximo seguimiento
          </h3>
          {savingFecha && <span className="text-xs text-gray-400">Guardando…</span>}
        </div>
        <input type="date" value={fecha} onChange={(e) => cambiarFecha(e.target.value)}
          className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
        <div className="mt-2 flex gap-1.5 flex-wrap">
          {[{ label: "Mañana", days: 1 }, { label: "3 días", days: 3 }, { label: "1 semana", days: 7 }].map(({ label, days }) => (
            <button key={days} onClick={() => cambiarFecha(addDays(days))}
              className="press rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-100">
              {label}
            </button>
          ))}
          {fecha && (
            <button onClick={() => cambiarFecha("")}
              className="ml-auto rounded-md border border-red-100 bg-red-50 px-2.5 py-1 text-xs text-red-500 hover:bg-red-100">
              Borrar
            </button>
          )}
        </div>
        {fecha && ss && (
          <p className={`mt-2 text-xs ${ss.cls}`}>
            {ss.label === "VENCIDO" ? "⚠️ Esta fecha ya pasó — actualiza el seguimiento"
              : ss.label === "HOY" ? "🔔 El seguimiento es hoy"
              : `✓ ${new Date(fecha + "T12:00:00").toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long" })}`}
          </p>
        )}
      </div>

      {/* Nueva nota */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Registrar interacción
        </h3>
        <div className="mb-3 flex gap-1.5 flex-wrap">
          {INTERACTION_TYPES.map(({ value, label, Icon }) => (
            <button key={value} onClick={() => setTipo(value)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                tipo === value ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              <Icon className="h-3 w-3" />{label}
            </button>
          ))}
        </div>
        <textarea value={nota} onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) agregarNota(); }}
          placeholder={"¿Qué pasó? ¿Con quién hablaste? ¿Cuál fue la respuesta?\nCtrl+Enter para guardar"}
          rows={4}
          className="w-full resize-none rounded-md border border-gray-200 px-3 py-2.5 text-sm text-gray-700 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
        <button onClick={agregarNota} disabled={!nota.trim() || saving}
          className="press mt-2.5 flex w-full items-center justify-center gap-2 rounded-md bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50">
          <Send className="h-4 w-4" /> Guardar interacción
        </button>

        {/* Banner análisis post-llamada */}
        {analizando && (
          <div className="mt-3 flex items-center gap-2 rounded-md border border-teal-100 bg-teal-50 px-3 py-2 text-xs text-teal-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
            Analizando interacción…
          </div>
        )}
        {sugerencia && !analizando && (
          <div className="mt-3 rounded-md border border-indigo-200 bg-indigo-50 p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-indigo-800 flex items-center gap-1.5">
                <BrainCircuit className="h-3.5 w-3.5" />
                Análisis: {SITUACION_LABEL[sugerencia.situacion] ?? sugerencia.situacion}
              </p>
              <button onClick={() => setSugerencia(null)} className="text-indigo-400 hover:text-indigo-600">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <p className="text-xs text-indigo-700">
              <span className="font-semibold">Próximo paso:</span> {sugerencia.proximo_paso}
            </p>
            <p className="text-xs text-indigo-600">
              📅 Seguimiento sugerido: {new Date(sugerencia.fecha_sugerida + "T12:00:00").toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long" })} ({sugerencia.dias_recomendados} días)
            </p>
            {sugerencia.mensaje_seguimiento && (
              <div className="rounded border border-indigo-200 bg-white p-2">
                <p className="mb-1.5 text-xs font-semibold text-gray-500">Mensaje prellenado:</p>
                <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">{sugerencia.mensaje_seguimiento}</p>
                <div className="mt-1.5">
                  <CopyButton text={sugerencia.mensaje_seguimiento} />
                </div>
              </div>
            )}
            {sugerencia.advertencias.length > 0 && (
              <p className="text-xs text-amber-600">⚠ {sugerencia.advertencias.join(" · ")}</p>
            )}
          </div>
        )}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Historial ({historial.length})
          </h3>
          <div className="relative">
            {/* Línea vertical que se dibuja de arriba a abajo al montar */}
            <motion.div
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              style={{ originY: 0 }}
              className="absolute left-[11px] top-0 bottom-0 w-px bg-linear-to-b from-teal-200 via-gray-200 to-transparent"
            />
            <div className="space-y-5">
              {historial.map((item, i) => {
                const tipoVal = (item as Interaccion & { tipo?: string }).tipo ?? "nota";
                const Icon = getInteractionIcon(tipoVal);
                const tipoLabel = INTERACTION_TYPES.find((t) => t.value === tipoVal)?.label ?? "Nota";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.32, ease: [0.23, 1, 0.32, 1], delay: 0.12 + Math.min(i, 10) * 0.05 }}
                    className="relative flex gap-3 pl-7"
                  >
                    <div className="absolute left-0 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-teal-100 shadow-sm">
                      <Icon className="h-3 w-3 text-teal-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-xs font-semibold text-gray-700">{tipoLabel}</span>
                        <span className="text-xs text-gray-400 tabular-nums">{formatFecha(item.fecha)}</span>
                      </div>
                      <p className="measure text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{item.texto}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface LeadDetailPanelProps {
  lead: Lead;
  onClose: () => void;
  onLeadUpdate: (id: string, fields: Partial<Lead>) => void;
}

export function LeadDetailPanel({ lead, onClose, onLeadUpdate }: LeadDetailPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [tab, setTab] = useState<"perfil" | "crm">("perfil");
  const [investigando, setInvestigando] = useState(false);
  const [investigacionResult, setInvestigacionResult] = useState<{
    ok?: boolean; error?: string; dolor_identificado?: string; perfil_zona?: string;
    resenas_negativas?: number; resenas_positivas?: number; fuentes_usadas?: string[];
  } | null>(null);

  const [analizando, setAnalizando] = useState(false);
  const [analisisResult, setAnalisisResult] = useState<{
    ok?: boolean; error?: string;
    senal_destacada?: string; angulo_contacto?: string;
    razonamiento?: string; calidad_contexto?: string; advertencias?: string[];
  } | null>(null);

  async function handleInvestigar() {
    setInvestigando(true);
    setInvestigacionResult(null);
    try {
      const res = await fetch("/api/investigar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json() as typeof investigacionResult;
      setInvestigacionResult(data);
      if (data?.ok) {
        // Actualizar el lead en el dashboard con los nuevos valores
        onLeadUpdate(lead.id, {
          senal_destacada: data.dolor_identificado ?? lead.senal_destacada,
        });
      }
    } catch {
      setInvestigacionResult({ error: "Error de red al llamar /api/investigar" });
    } finally {
      setInvestigando(false);
    }
  }

  async function handleAnalizar() {
    setAnalizando(true);
    setAnalisisResult(null);
    try {
      const res = await fetch("/api/analizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead_id: lead.id }),
      });
      const data = await res.json() as typeof analisisResult;
      setAnalisisResult(data);
      if (data?.ok) {
        onLeadUpdate(lead.id, {
          senal_destacada: data.senal_destacada ?? lead.senal_destacada,
          angulo_contacto: data.angulo_contacto ?? lead.angulo_contacto,
        } as Partial<Lead>);
      }
    } catch {
      setAnalisisResult({ error: "Error de red al llamar /api/analizar" });
    } finally {
      setAnalizando(false);
    }
  }

  const md = extractMarkdown(lead.contexto_completo);
  const sections = parseSections(md);
  const getSection = (kw: string) => sections.find((s) => s.title.toLowerCase().includes(kw.toLowerCase()));

  const secInfoWeb  = getSection("INFO WEB") ?? getSection("WEB");
  const secResenas  = getSection("RESEÑAS") ?? getSection("RESENAS") ?? getSection("REVIEWS");
  const secExternal = getSection("EXTERNA") ?? getSection("INVESTIGACIÓN");
  const secZona     = getSection("ZONA") ?? getSection("ANÁLISIS");
  const whatsapp = md.match(/WhatsApp[:\s+]*(\+?507[\s-]?\d[\d\s-]{6,})/i)?.[1]?.replace(/\s/g, "");

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [onClose]);

  const estadoCfg = getEstadoConfig(lead.estado);
  const ss = seguimientoStatus(lead.fecha_proximo_seguimiento);
  const reduce = useReducedMotion();

  return (
    <>
      {/* Backdrop — atenúa el fondo y permite cerrar al hacer clic fuera */}
      <motion.div
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}
        className="fixed inset-0 z-1900 bg-[rgba(16,24,22,0.34)] backdrop-blur-[2px]"
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Detalle de ${lead.nombre}`}
        initial={reduce ? { opacity: 0 } : { x: "100%" }}
        animate={reduce ? { opacity: 1 } : { x: 0 }}
        exit={reduce ? { opacity: 0 } : { x: "100%" }}
        transition={
          reduce
            ? { duration: 0.2 }
            : { type: "spring", duration: 0.5, bounce: 0.16 }
        }
        className="fixed inset-y-0 right-0 z-2000 flex w-full max-w-[50%] flex-col border-l border-[#e7eae9] bg-[#f6f7f7] shadow-2xl"
      >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-5 py-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base font-bold text-gray-900 leading-tight">{lead.nombre}</h2>
            <TierBadge tier={lead.tier} puntaje={lead.puntaje_total} />
          </div>
          {lead.rubro && (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-gray-400">{lead.rubro}</p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-gray-500">
            {lead.rating != null && (
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />{lead.rating}
              </span>
            )}
            <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${estadoCfg.color}`}>
              {estadoCfg.icon} {estadoCfg.label}
            </span>
            {lead.fecha_proximo_seguimiento && (
              <span className={`flex items-center gap-1 text-xs font-medium ${ss?.cls ?? "text-gray-500"}`}>
                <Calendar className="h-3 w-3" />
                {new Date(lead.fecha_proximo_seguimiento + "T12:00:00").toLocaleDateString("es-PA", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={handleInvestigar}
            disabled={investigando}
            title="Investigar esta empresa automáticamente (web + Google Maps + Claude)"
            className="press inline-flex items-center gap-1.5 rounded-md border border-purple-200 bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {investigando
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <Search className="h-3.5 w-3.5" />}
            {investigando ? "Investigando…" : "Investigar"}
          </button>
          <button
            onClick={handleAnalizar}
            disabled={analizando}
            title="Analizar dolor y generar pitch quirúrgico (requiere contexto_completo — ejecuta Investigar primero)"
            className="press inline-flex items-center gap-1.5 rounded-md border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {analizando
              ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
              : <BrainCircuit className="h-3.5 w-3.5" />}
            {analizando ? "Analizando…" : "Analizar dolor"}
          </button>
          <button onClick={onClose} aria-label="Cerrar" className="press rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Resultado de investigación */}
      {investigacionResult && (
        <div className={`mx-5 mt-3 rounded-lg border px-4 py-3 text-xs ${
          investigacionResult.error
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-green-200 bg-green-50 text-green-800"
        }`}>
          {investigacionResult.error ? (
            <p>❌ {investigacionResult.error}</p>
          ) : (
            <>
              <p className="font-semibold">✓ Investigación completada — perfil actualizado en Supabase</p>
              <p className="mt-1 text-green-700">
                Zona: {investigacionResult.perfil_zona} ·{" "}
                {investigacionResult.resenas_negativas} reseñas negativas ·{" "}
                {investigacionResult.resenas_positivas} positivas ·{" "}
                Fuentes: {investigacionResult.fuentes_usadas?.join(", ")}
              </p>
              {investigacionResult.dolor_identificado && (
                <p className="mt-1.5 italic text-green-800">"{investigacionResult.dolor_identificado}"</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Resultado de análisis de dolor */}
      {analisisResult && (
        <div className={`mx-5 mt-2 rounded-lg border px-4 py-3 text-xs ${
          analisisResult.error
            ? "border-red-200 bg-red-50 text-red-700"
            : "border-indigo-200 bg-indigo-50 text-indigo-900"
        }`}>
          {analisisResult.error ? (
            <p>❌ {analisisResult.error}</p>
          ) : (
            <>
              <p className="font-semibold text-indigo-800">
                ✓ Análisis completado · Contexto: {analisisResult.calidad_contexto}
              </p>
              {analisisResult.senal_destacada && (
                <p className="mt-1.5 text-indigo-700">
                  <span className="font-semibold">Señal:</span> {analisisResult.senal_destacada}
                </p>
              )}
              {analisisResult.angulo_contacto && (
                <p className="mt-1.5 text-indigo-700">
                  <span className="font-semibold">Pitch:</span> {analisisResult.angulo_contacto}
                </p>
              )}
              {analisisResult.advertencias && analisisResult.advertencias.length > 0 && (
                <p className="mt-1.5 text-amber-600">⚠ {analisisResult.advertencias.join(" · ")}</p>
              )}
            </>
          )}
        </div>
      )}

      {/* Tabs — el subrayado se desliza entre pestañas con spring (layoutId) */}
      <div className="flex border-b border-[#e7eae9] bg-white px-5">
        {(["perfil", "crm"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`relative mr-4 py-3 text-sm font-medium transition-colors duration-200 ease-out ${
              tab === t ? "text-teal-700" : "text-gray-500 hover:text-gray-700"
            }`}>
            {t === "perfil" ? "Perfil" : "CRM"}
            {tab === t && (
              <motion.span
                layoutId="tab-underline"
                transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-teal-600"
              />
            )}
          </button>
        ))}
      </div>

      {/* Body — crossfade suave al cambiar de pestaña */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
        {tab === "crm" ? (
          <CrmSection lead={lead} onCrmUpdate={(fields) => onLeadUpdate(lead.id, fields)} />
        ) : (
          <div className="space-y-4">
            {lead.senal_destacada && (
              <Section icon={AlertTriangle} title="Señal Destacada" accent="border-amber-200 bg-amber-50">
                <p className="text-sm text-amber-900 leading-relaxed">{lead.senal_destacada}</p>
              </Section>
            )}
            {lead.angulo_contacto && (
              <Section icon={Lightbulb} title="Ángulo de Contacto" accent="border-teal-200 bg-teal-50">
                <p className="measure text-sm text-teal-900 leading-relaxed">{lead.angulo_contacto}</p>
              </Section>
            )}
            <MensajeSection lead={lead} />
            <Section icon={Phone} title="Contacto">
              <div className="flex flex-wrap gap-2">
                {lead.telefono && (
                  <a href={`tel:${lead.telefono.replace(/[^\d+]/g, "")}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                    <Phone className="h-3.5 w-3.5" /> {lead.telefono}
                  </a>
                )}
                {whatsapp && (
                  <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-green-200 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 transition-colors">
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                )}
                {lead.web && (
                  <a href={lead.web.startsWith("http") ? lead.web : `https://${lead.web}`} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                    <Globe className="h-3.5 w-3.5" /> Sitio web
                  </a>
                )}
              </div>
            </Section>
            {(lead.punt_necesidad || lead.punt_capacidad || lead.punt_competencia || lead.punt_madurez || lead.punt_fit_datos) && (
              <Section icon={TrendingUp} title="Puntaje Codflow">
                <div className="space-y-2.5">
                  <ScoreBar label="Necesidad"    value={lead.punt_necesidad} />
                  <ScoreBar label="Capacidad"    value={lead.punt_capacidad} />
                  <ScoreBar label="Competencia"  value={lead.punt_competencia} />
                  <ScoreBar label="Madurez"      value={lead.punt_madurez} />
                  <ScoreBar label="Fit de datos" value={lead.punt_fit_datos} />
                  <div className="pt-1 border-t border-gray-100 flex justify-between text-xs font-semibold text-gray-700">
                    <span>TOTAL</span><span>{lead.puntaje_total ?? "—"} / 100</span>
                  </div>
                </div>
              </Section>
            )}
            {secInfoWeb  && <Section icon={Award}      title={secInfoWeb.title}>  <MdText text={secInfoWeb.content}  /></Section>}
            {secResenas  && <Section icon={Star}       title={secResenas.title}>  <MdText text={secResenas.content}  /></Section>}
            {secExternal && <Section icon={Users}      title={secExternal.title}> <MdText text={secExternal.content} /></Section>}
            {secZona     && <Section icon={MapPin}     title={secZona.title}>     <MdText text={secZona.content}     /></Section>}
            {!md && (
              <div className="rounded-lg border border-dashed border-gray-200 py-10 text-center text-sm text-gray-400">
                Sin contexto completo disponible para esta empresa.
              </div>
            )}
            {lead.razon && (
              <Section icon={CheckCircle} title="Razón de clasificación">
                <p className="text-sm text-gray-700 leading-relaxed">{lead.razon}</p>
              </Section>
            )}
          </div>
        )}
          </motion.div>
        </AnimatePresence>
      </div>
    </motion.div>
    </>
  );
}
