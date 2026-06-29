<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design Agent

**Invocación:** se activa cuando se trabaje en el frontend del dashboard con la frase
**"usa el design agent para esto"**. Aplica a cualquier componente de UI bajo `src/components/`
y a la presentación visual del dashboard de prospección.

## Reglas duras (verificar antes de generar CUALQUIER código de frontend)

1. **Lee y aplica primero los skills de Emil Kowalski.** Antes de escribir una sola línea de
   UI, carga e interioriza:
   - `emil-design-eng` — filosofía de pulido de UI, diseño de componentes y decisiones de
     animación. (`.claude/skills/emil-design-eng/`)
   - `review-animations` — revisión de animaciones contra una vara de calidad alta; por
     defecto se marca, la aprobación se gana. (`.claude/skills/review-animations/`)
   Úsalos como criterio rector, no como adorno.

2. **Animaciones con spring, no keyframes.** Cada componente debe tener movimiento suave
   basado en física (spring). Evita `@keyframes` y curvas rígidas salvo justificación clara.

3. **Botones interactivos:** `scale(0.97)` en `:active` para dar respuesta táctil al click.

4. **Tipografía:** ancho de línea limitado a **65ch** máximo (`max-width: 65ch`) en bloques
   de texto para legibilidad.

5. **`tabular-nums`** (`font-variant-numeric: tabular-nums`) en toda columna numérica —
   KPIs, tablas, métricas — para que los dígitos no bailen.

6. **Transiciones de 200–300ms con `ease-out`.** Ni más lentas (se sienten pesadas) ni más
   rápidas (se sienten secas).

7. **Color con intención, no genérico.** Nada de azules/grises por defecto de framework.
   Cada color debe tener un propósito (estado, jerarquía, marca). Respeta la paleta de la
   marca Codflow.

8. **El resultado NO debe verse "hecho por IA".** Detalles cuidados, jerarquía real,
   espaciado deliberado, micro-interacciones. Si parece una plantilla genérica, no está listo.

## Cómo trabajar
- Antes de codear, abre el componente objetivo y léelo (no especules).
- Aplica los skills de Emil, implementa, y luego autorevisa la animación contra
  `review-animations` antes de dar por terminado.
