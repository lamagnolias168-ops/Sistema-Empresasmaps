# Estado del Proyecto — Codflow Prospección
> Leer esto PRIMERO antes de cualquier trabajo. Última actualización: 2026-06-30.

## Qué es este proyecto
Dashboard de prospección comercial B2B para **Codflow** (consultora de IA y datos en Panamá).
Permite a prospectos completar una entrevista, los agentes los analizan automáticamente, y el equipo de Codflow ve los resultados en un panel admin.

**Stack:** Next.js 16, React 19, Tailwind v4, Supabase, Vercel, Anthropic Claude, Google Maps API.

---

## Arquitectura actual

### Dos portales separados
- `/admin/*` — Portal interno de Codflow (con sidebar SaaS colapsable)
  - `/admin/dashboard` — KPIs + pipeline
  - `/admin/prospectos` — Leads (vista Tarjetas / Kanban / Tabla)
  - `/admin/mapa` — Mapa interactivo con brush/lasso de selección
  - `/admin/agentes` — Centro de agentes IA
  - `/admin/inteligencia` — Análisis de mercado
  - `/admin/configuracion` — Configuración

- `/cliente/*` — Portal público para prospectos (sin login)
  - `/cliente` — Página de bienvenida
  - `/cliente/entrevista` — Entrevista conversacional inteligente
  - `/cliente/analisis/[id]` — Progreso en tiempo real de los agentes
  - `/cliente/reporte/[id]` — Reporte final de inteligencia

### Flujo completo del cliente
1. Cliente llega a `/cliente` → hace clic en CTA
2. Completa entrevista en `/cliente/entrevista` (chat conversacional)
3. Al enviar → API crea entrevista + lead en Supabase + dispara orquestador
4. Cliente ve `/cliente/analisis/[id]` con polling cada 4 segundos
5. Cuando agentes terminan → botón activo → `/cliente/reporte/[id]`

---

## Supabase
- **Proyecto canónico (el nuestro):** `xxpjukoeuclvhsqfpqsh` — 34 leads
- **NO usar:** `xjkpaxsptfmpkgtymbuu` — es de un compañero
- Tablas principales: `leads`, `entrevistas`
- Columnas clave en `leads`: `nombre`, `rubro`, `direccion`, `web`, `rating`, `tier`, `puntaje_total`, `senal_destacada`, `angulo_contacto`, `contexto_completo`, `estado`, `lead_id`
- Columnas clave en `entrevistas`: `id`, `empresa`, `dolor_principal`, `lead_id`, `respuestas_completas`

---

## Agentes IA (src/agents/)
Flujo `nuevo_lead`: **Investigador → Analista** (secuencial)

1. **Investigador** (`investigador.ts`): scraping web + Google Maps reviews + Claude para inferir dolor. Ahora recibe `dolorDeclarado` desde la entrevista como fuente primaria.
2. **Analista** (`analista.ts`): lee `contexto_completo` + dolor declarado y genera `senal_destacada` + `angulo_contacto` al nivel MiroFish.
3. **Orquestador** (`orquestador.ts`): punto de entrada. Ahora busca la entrevista asociada al lead para pasar `dolor_principal` a los agentes.

### Regla crítica de los agentes
El `dolor_declarado` por el cliente en la entrevista es la **fuente primaria**. Los agentes NUNCA inventan un dolor diferente — solo lo amplifican con evidencia de Google Maps y web.

---

## Entrevista inteligente (src/app/entrevista/page.tsx)
### Cambios recientes (lo más importante)
- **Primer paso = opener libre**: el cliente escribe libremente "trabajo en Banco General, tenemos 96 sucursales y queremos..."
- **`parseOpener()`**: extrae automáticamente empresa, rubro, zona, sucursales del texto libre
- **skipIf inteligente**: si el opener ya cubrió un campo, esa pregunta se salta automáticamente
- **`zonas_clientes` eliminado**: el agente busca esto solo, no preguntamos
- **`sucursales_detalle`**: solo pregunta cuántas, no en qué zonas (el agente las busca)
- **Detección empresa grande**: si tiene 10+ sucursales o es banco/multinacional, se saltan preguntas obvias (¿tiene web?, etc.)
- **El dolor declarado** (opener + problema) se envía como `dolor_principal` a Supabase y llega a los agentes

---

## Diseño / Frontend
- **Librería de animaciones:** `motion/react` (NO framer-motion)
- **Tailwind v4** — usar clases canónicas: `h-150`, `z-1000`, `bg-white/6`, `bg-teal-500/18`
- **Springs siempre**, nunca keyframes
- **tabular-nums** en todas las columnas numéricas
- **Design Agent** se activa con la frase "usa el design agent para esto"
- Skills del Design Agent en: `.claude/skills/emil-design-eng/` y `.claude/skills/review-animations/`

---

## Deploy
- **Vercel** — proyecto `codflow-prospeccion` en cuenta `pbi-nomina-s-projects`
- Comando: `npx vercel --prod --yes`
- **Problema conocido**: las URLs de preview de Vercel piden login de equipo. Para acceso público se necesita dominio propio o desactivar "Deployment Protection" en Settings.

---

## GitHub
- Repo: `https://github.com/lamagnolias168-ops/Sistema-Empresasmaps`
- Rama principal: `main`
- **`.env.local` NO está en GitHub** (secreto) — debe copiarse manualmente

---

## Variables de entorno necesarias (.env.local)
```
NEXT_PUBLIC_SUPABASE_URL=https://xxpjukoeuclvhsqfpqsh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
ANTHROPIC_API_KEY=...
GOOGLE_MAPS_API_KEY=...
```

---

## Lo que falta / próximos pasos
1. **Probar flujo completo de entrevista** con la nueva versión (opener + parseOpener)
2. **Dominio propio en Vercel** para que el link del cliente sea público sin login
3. **Google Maps API Key** — sin ella el agente Investigador no puede buscar en Maps (solo hace scraping web)
4. **Agente de scoring** — el `puntaje_total` del lead hoy se queda en 0; necesita lógica de scoring real
5. **PDF del reporte** — botón "Descargar PDF" en `/cliente/reporte/[id]` está deshabilitado (pendiente)
6. **Link de Calendly** real — en el reporte hay un placeholder `calendly.com`

---

## Cómo retomar el trabajo
1. `git clone https://github.com/lamagnolias168-ops/Sistema-Empresasmaps.git`
2. `npm install`
3. Crear `.env.local` con las variables de arriba
4. `npm run dev` para desarrollo local
5. Leer este archivo + `CLAUDE.md` + `AGENTS.md`
6. Decirle a Claude: "Lee ESTADO_PROYECTO.md y continuemos desde ahí"
