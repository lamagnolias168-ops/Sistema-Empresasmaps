export interface EstadoConfig {
  value: string;
  label: string;
  color: string;
  colorActive: string;
  dot: string;
  icon: string;
}

export const ESTADO_OPTIONS: EstadoConfig[] = [
  { value: "por_contactar",     label: "Por contactar",    color: "bg-gray-100 text-gray-600",     colorActive: "bg-gray-700 text-white",    dot: "bg-gray-400",   icon: "○" },
  { value: "contactado",        label: "Contactado",        color: "bg-blue-100 text-blue-700",    colorActive: "bg-blue-600 text-white",    dot: "bg-blue-500",   icon: "✓" },
  { value: "reunion_agendada",  label: "Reunión agendada",  color: "bg-orange-100 text-orange-700",colorActive: "bg-orange-500 text-white",  dot: "bg-orange-500", icon: "📅" },
  { value: "propuesta_enviada", label: "Propuesta enviada", color: "bg-purple-100 text-purple-700",colorActive: "bg-purple-600 text-white",  dot: "bg-purple-500", icon: "📄" },
  { value: "cerrado_ganado",    label: "Cerrado ganado",    color: "bg-green-100 text-green-700",  colorActive: "bg-green-600 text-white",   dot: "bg-green-500",  icon: "🏆" },
  { value: "cerrado_perdido",   label: "Cerrado perdido",   color: "bg-red-100 text-red-700",      colorActive: "bg-red-600 text-white",     dot: "bg-red-500",    icon: "✗" },
];

export function getEstadoConfig(value: string | null): EstadoConfig {
  return ESTADO_OPTIONS.find((o) => o.value === value) ?? ESTADO_OPTIONS[0];
}
