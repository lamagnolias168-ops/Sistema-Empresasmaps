# CODFLOW — Documento Maestro de Contexto v2.0
## Para Claude Code / Visual Studio Code

> Este documento resume todo el contexto, la visión, la arquitectura actual y el estado real del proyecto. Léelo completo antes de tocar cualquier código. Última actualización: Junio 2026.

---

## 1. ¿Qué es Codflow?

Codflow es una consultora de IA y análisis de datos en Panamá. Este proyecto es su herramienta interna de prospección e inteligencia comercial: un sistema que busca, califica y analiza empresas panameñas que podrían contratar los servicios de Codflow — y que eventualmente se venderá como producto a otras empresas.

**Dos líneas de servicio principales:**
- **Automatización de procesos manuales** — dashboards, reportería, flujos con n8n, conexiones de datos. Lo que Codflow puede entregar hoy.
- **Inteligencia de mercado** — dónde va el dinero, qué zona encaja con qué producto, análisis de dolor por rubro. En desarrollo, ya con datos reales de 34 empresas.

---

## 2. Infraestructura actual (CONSTRUIDA Y OPERATIVA)

```
Google Maps API (scraper)
        ↓
Claude Code investiga cada empresa a fondo
(sitio web, reseñas, LinkedIn, redes, competidores)
        ↓
MiroFish procesa con simulación multi-agente
(para logística y clínicas — los demás rubros
fueron procesados por Claude Code directamente)
        ↓
Supabase → tabla "leads" (34 empresas completas)
        ↓
Obsidian → cerebro / memoria institucional
        ↓
Dashboard en Vercel → https://codflow-prospeccion.vercel.app
(con modal "Ver detalle" por empresa)
```

### Tabla "leads" en Supabase — campos actuales:
- `nombre`, `rubro`, `dirección`, `teléfono`, `sitio_web`
- `rating` (Google Maps), `cantidad_reseñas`
- `lat`, `lng` (coordenadas para el mapa)
- `puntaje_total` (0-100), `tier` (Alto / Medio / Bajo)
- `señal_destacada` — el dolor o fuga de dinero real del negocio
- `angulo_contacto` — el pitch comercial personalizado para llamar
- `contexto_completo` — perfil largo con toda la investigación
- `info_web` — información scrapeada del sitio web
- `razon` — razón del tier asignado
- `estado` — etapa comercial (por contactar, contactado, etc.)

### Stack técnico:
- **Backend/DB:** Supabase (Postgres)
- **Frontend:** Vercel (Next.js) con cache: no-store
- **Scraping:** Google Maps API + Claude Code (sitios web)
- **IA de análisis:** MiroFish (plan Starter $9/mes) + Claude Code
- **Memoria:** Obsidian (vault en codflow-prospeccion/cerebro-obsidian)
- **Desarrollo:** VS Code + Claude Code

---

## 3. La lógica de negocio central (NO tocar esto)

La calificación no usa solo datos superficiales. Cruza **zona geográfica + volumen operativo + comportamiento del dinero** en Panamá:

### Perfil A — Alta Rotación / Margen Ajustado
Zonas: Juan Díaz, Tocumen, Transístmica, Calidonia, Av. Central, Ojo de Agua, Villa Zaita, Las Mañanitas, Santa Ana
- **Dolor principal:** Mermas, uso ineficiente del personal en horas pico, grillas de turnos caóticas en días de quincena
- **Solución Codflow:** Modelos predictivos de inventario y optimización de turnos
- **Ejemplo real:** GAP Logística tiene GPS en cada camión pero no convierte esos datos en reportería gerencial

### Perfil B — Ticket Alto / Volumen Controlado
Zonas: Obarrio, Costa del Este, San Francisco, Marbella, Bella Vista, Calle 50, Paitilla, Punta Pacífica, Panamá Pacífico
- **Dolor principal:** Pérdida de clientes por fricción en atención, marketing sin datos de zona
- **Solución Codflow:** Automatización de respuestas, analítica de retención, inteligencia de zona
- **Ejemplo real:** MLC Multimodal cobró $575 por envío de $45, rating 3.8 en Obarrio — pérdida de clientes activa

### Nota especial — Híbridos A+B:
Algunas empresas como UPIM (distribuidora en El Carmen/Bella Vista) están geográficamente en Perfil B pero operan como Perfil A (mayoreo masivo, márgenes ajustados). Analizar con criterio híbrido.

### Tiers de clasificación:
- **TIER ALTO:** Zona + volumen = fuga de capital visible en reseñas. Alta urgencia. Llamar primero.
- **TIER MEDIO:** Estables pero estancados, operan por intuición sin datos.
- **TIER BAJO:** IA no puede impactar su modelo de negocio directamente.

---

## 4. Estado actual de los 34 leads por rubro

### Logística — 10 empresas ✅ Procesado con MiroFish
| Empresa | Tier | Dolor principal |
|---------|------|----------------|
| PGT Logistics | ALTO | 33K IG pero solo 5 embarques documentados — brecha volumen/operación |
| PSL Int. | ALTO | $5.9M/año con 378 seguidores IG — gap entre operación y medición |
| Fulter Logistics | MEDIO | DigitalHub y SoFIA pero sin visibilidad de rentabilidad por cliente |
| Next 2.2 | MEDIO | "Analista personal" no escala — cuello de botella operativo |
| GLC Panamá | MEDIO | Sin métricas locales — centralizado en El Salvador |
| GAP Logística | MEDIO | GPS sin reportería — datos existen, nadie los usa |
| Legal Logístic | MEDIO | 100% WhatsApp — presión regulatoria ANA 2025-2030 |
| Logística Xpress | MEDIO | Dolor autoidentificado públicamente en Maps |
| MLC Multimodal | MEDIO | 3.8★, cobro $575 vs $28 Copa Courier — urgencia crítica |
| Panama Int'l | BAJO | Posible duplicado de PSL — verificar antes de contactar |

### Clínicas — 8 empresas ✅ Procesado con MiroFish
| Empresa | Tier | Dolor principal |
|---------|------|----------------|
| Express Villa Lucre | MEDIO | Metro Domingo Díaz sin captación digital, MiniMed a 100m |
| Express Bethania | MEDIO | MediExpress Empresarial sin renovación automatizada |
| Express Paitilla | MEDIO | Ficha duplicada 4.8★ vs 3.1★ destruyendo reputación |
| Panama Diagnostic | MEDIO | 712 reseñas con quejas en 4 áreas, sin recuperación |
| SYSLAB | MEDIO | 35 años, 4 sucursales, sin CRM para pipeline B2B |
| Los Portales | MEDIO | Rating 2.5★ — más bajo de la zona, fuga activa |
| El Crisol | MEDIO | 20 años pero 3.7★, sin WhatsApp ni agendamiento |
| Amedic | MEDIO | 3.6★ vs competidor 4.9★ — hemorragia reputacional |

### Contable — 7 empresas (procesado por Claude Code)
| Empresa | Tier | Dolor principal |
|---------|------|----------------|
| Bermúdez & Asociados | MEDIO | Contacto: Jenia Moreno (ex Deloitte/BDO) |
| BTA Consultores | MEDIO | Administración de PHs sin reportes automatizados |
| Contadores TF | MEDIO | Profesores de NIIF procesando planillas SIPE |
| Hurtado & Asociados | MEDIO | Puerta: Mario Berguido, Form 930 / Panamá Pacífico |
| Kontadores Panamá | MEDIO | Claim de IA sin sistema real detrás |
| Núñez Soto & Asociados | MEDIO | 350 clientes, blog de avisos fiscales manual |
| Iris Jaramillo | BAJO | Operación unipersonal, cuello de botella personal |

### Distribución — 3 empresas (procesado por Claude Code)
| Empresa | Tier | Dolor principal |
|---------|------|----------------|
| UPIM | MEDIO | Híbrido A+B, mayoreo por WhatsApp/IG |
| DEPEDÉ | MEDIO | Pedidos por WhatsApp caóticos, respuestas tardías |
| LOGÍSTICA S.A. | BAJO | Verificar antes de contactar — nombre genérico |

### Importadoras — 6 empresas (procesado por Claude Code)
| Empresa | Tier | Dolor principal |
|---------|------|----------------|
| Transmundi | MEDIO | Reportería de ventas por línea de producto |
| Mundo Fino | MEDIO | Control de inventario y reportería de importaciones |
| Chen | MEDIO | Rating 3.0, sitio caído, cambios junta directiva |
| Scorpio | MEDIO | Modernización catálogo y reportería multi-categoría |
| IDESA | MEDIO | 60 años, portal B2B existente pero básico |
| SIEMA | MEDIO | Rating 1.0 — urgencia crítica, causas no documentadas |

---

## 5. El rol de MiroFish en el flujo

MiroFish corre simulaciones multi-agente internas de cada empresa (Director de Operaciones, Finanzas, Marketing debatiendo). Construye un grafo de conocimiento que cruza relaciones entre empresas, zonas, competidores y dolores.

### Lo que genera:
1. **SEÑAL DESTACADA:** El dolor o fuga de dinero real basado en zona y volumen
2. **ÁNGULO DE CONTACTO:** Pitch comercial quirúrgico que derriba la objeción antes de que el cliente la diga

### Estado actual con MiroFish:
- **Logística:** ✅ Procesado completo — reporte generado y señales extraídas
- **Clínicas:** ✅ Procesado completo — reporte macro del sector + señales por empresa
- **Contable:** ⏳ Pendiente — sin simulaciones disponibles
- **Distribución:** ⏳ Pendiente — sin simulaciones disponibles
- **Importadoras:** ⏳ Pendiente — sin simulaciones disponibles

Los 3 rubros pendientes fueron procesados por Claude Code con el contexto_completo como fuente. Calidad buena pero no quirúrgica como MiroFish.

---

## Agentes del sistema

Todos en src/agents/:
- investigador.ts → /api/investigar
- analista.ts → /api/analizar
- monitor.ts → /api/monitor
- pitch.ts → /api/pitch
- post-llamada.ts → /api/post-llamada
- orquestador.ts → /api/orquestador
- guia.ts → /api/guia

Flujo: Lead nuevo → Investigador → Analista → Lead listo en dashboard

Requiere ANTHROPIC_API_KEY en Vercel

### Archivos de MiroFish en Obsidian:
- `MIROFISH_SEED_LOGISTICA.md` — documento seed enviado a MiroFish
- `MIROFISH_PROMPT_LOGISTICA.txt` — prompt de simulación
- `Informe_Codflow_Logistica_Panama.docx` — reporte completo generado
- `consultoria_b2b_panama_medico.docx` — reporte de clínicas
- `MIROFISH_SEED_CLINICAS.md` — seed de clínicas
- `MIROFISH_SEED_CONTABLE.md` — seed listo para cuando haya simulaciones
- `MIROFISH_SEED_DISTRIBUCION.md` — seed listo para cuando haya simulaciones
- `MIROFISH_SEED_IMPORTADORAS.md` — seed listo para cuando haya simulaciones

---

## 6. Capa de memoria institucional — Obsidian

### Ubicación del vault:
```
C:\Users\gcabq\Downloads\codflow-prospeccion\cerebro-obsidian
```

### Estructura actual:
```
cerebro-obsidian/
├── Cerebro — Codflow Inteligencia Comercial.md (nota raíz)
├── Sistema de prospectos.md
├── Fulter Logistics — Juan Díaz.md
├── Patrones — Logística.md
├── Rubros/
│   ├── Clínica/
│   ├── Contable/
│   ├── Distribución/
│   ├── Importadora/
│   └── Logística/
├── Casos de Estudio/ (notas por empresa)
├── Patrones/ (patrones por rubro)
├── MIROFISH_SEED_LOGISTICA.md
├── MIROFISH_SEED_CLINICAS.md
├── MIROFISH_SEED_CONTABLE.md
├── MIROFISH_SEED_DISTRIBUCION.md
├── MIROFISH_SEED_IMPORTADORAS.md
├── MIROFISH_PROMPT_LOGISTICA.txt
├── Informe_Codflow_Logistica_Panama.docx
└── consultoria_b2b_panama_medico.docx
```

### Flujo con Obsidian:
```
MiroFish o Claude Code genera análisis
        ↓
Se guarda en Obsidian como nota estructurada
por rubro y zona
        ↓
Cuando llega un nuevo lead del mismo rubro
el sistema lee las notas de Obsidian primero
        ↓
Genera señal_destacada y angulo_contacto
con contexto acumulado, no desde cero
        ↓
Supabase → Dashboard
```

---

## 7. Dashboard en Vercel — Estado actual

**URL:** https://codflow-prospeccion.vercel.app

### Funcionalidades actuales:
- KPIs: total de leads (34), Tier Alto (2), Tier Medio (29), puntaje promedio (65.9)
- Filtros por rubro y tier
- Tarjetas con señal destacada y ángulo de contacto
- Mapa con pines de colores
- Botón "Llamar" y "Sitio web" por empresa
- **Modal "Ver detalle"** — al hacer clic muestra toda la información completa:
  - Señal destacada completa
  - Ángulo de contacto completo
  - Contacto directo
  - Perfil de la empresa
  - Reseñas clave
  - Análisis de zona
  - Soluciones Codflow aplicables
  - Estado del prospecto (editable)

### Fix aplicado:
- `cache: "no-store"` en supabase.ts para evitar datos cacheados

### Pendiente:
- PGT, PSL y Next 2.2 de logística pueden seguir mostrando textos genéricos viejos — verificar

---

## 8. Propuesta de 10 pasos (documento del equipo)

El equipo refinó la visión del sistema en un documento de 10 pasos que reemplaza la visión original:

| # | Paso | Estado |
|---|------|--------|
| 1 | Anclar a plantillas de solución (2-3 soluciones replicables por segmento) | Pendiente — lo define el equipo |
| 2 | Descubrimiento por rubro × zona (Google Maps) | ✅ Hecho |
| 3 | Enriquecimiento multi-fuente (web, reseñas, LinkedIn, redes) | ✅ Hecho para 34 empresas |
| 4 | Filtro de calidad/viabilidad de la información | Parcial — scoring pendiente |
| 5 | Calificación contra la plantilla | Nuevo — el corazón del sistema |
| 6 | Perfil del cliente (dossier) | ✅ Parcial — contexto_completo existe |
| 7 | Inferencia del dolor + ángulo de contacto | ✅ Hecho (MiroFish + Claude Code) |
| 8 | Acercamiento personalizado y creíble | ✅ Diseñado — pitches en Supabase |
| 9 | Control de calidad humano (gate de credibilidad) | Nuevo |
| 10 | Entrega multi-canal + medición | Nuevo |

**Decisión clave del documento:** "MiroFish ya no existe como dependencia; su función se reconstruye con IA, que es el propio producto de Codflow."

**Nota sobre scraping:** Las fuentes como LinkedIn e ImportGenius son frágiles. El sistema prioriza calidad de información sobre fuente: Google Maps oficial, sitio web propio y reseñas públicas son robustos. Redes sociales son best-effort.

---

## 9. Visión del producto

### Dos capas de valor:

**Capa 1 — Antes de llamar (OPERATIVA):**
El vendedor ya sabe qué le duele a la empresa, por qué, qué objeciones va a poner y cómo romperlas. Esto ya funciona con los 34 leads actuales.

**Capa 2 — Inteligencia de mercado (EN DESARROLLO):**
Un dueño de negocio puede saber en qué zona de Panamá tiene más oportunidad, por qué no puede entrar a Riba Smith vs Machetazo, qué perfil de cliente tiene cada zona, dónde está perdiendo dinero sin saberlo.

### El producto en una frase:
> "Antes de cualquier movimiento comercial en Panamá, nosotros te decimos exactamente qué va a pasar y por qué."

### Camino de construcción:
1. ✅ **Fase 1** — Dashboard operativo con 34 leads completos
2. ⏳ **Fase 2** — Validar con llamadas reales y ajustar pitches
3. ⏳ **Fase 3** — Procesar rubros pendientes con MiroFish
4. 🔜 **Fase 4** — Construir Capa 2 de inteligencia de mercado por zona
5. 🔜 **Fase 5** — Primer reporte vendible a cliente externo

---

## 10. Otros proyectos del equipo Codflow (contexto)

### Sistema de marketing con IA (Jun):
Segmentación automática de productos con IA (SAM de Meta, Florence de Microsoft). Toma foto real de producto, detecta zonas editables vs protegidas (logo/marca), aplica diseños nuevos manteniendo identidad. Costo: 4 centavos por generación. Aplicable a cualquier empresa con productos físicos que necesite contenido visual para redes.

---

## 11. Reglas que no se deben romper

1. **El sistema debe funcionar para CUALQUIER rubro**, no solo supermercados o logística
2. **La calificación siempre cruza zona + volumen**, nunca solo datos superficiales de internet
3. **El ángulo de contacto debe ser quirúrgico**, no genérico — debe sonar como alguien que conoce el negocio por dentro
4. **Calidad de información sobre cantidad de fuentes** — mejor datos confiables de pocas fuentes que datos dudosos de muchas
5. **Primero interno, luego vendible** — validar con el uso de Codflow antes de vender a externos
6. **No depender de una sola herramienta** — MiroFish es valioso pero no crítico, Claude Code puede suplir

---

## 12. Credenciales y conexiones disponibles

Claude Code ya tiene acceso a:
- Supabase (proyecto Codflow con tabla "leads" — proyecto xjkpaxsptfmpkgtymbuu)
- Google Maps API
- Vercel (deploy del dashboard)
- MiroFish (plan Starter — simulaciones limitadas)
- Obsidian (vault en codflow-prospeccion/cerebro-obsidian)

---

*Documento Maestro v2.0 — Codflow — Junio 2026*
*Este documento reemplaza la versión anterior. Usar como punto de partida en Claude Code / VS Code.*
