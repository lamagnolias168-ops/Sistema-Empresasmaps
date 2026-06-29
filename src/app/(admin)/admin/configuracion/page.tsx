import { Settings, Key, MapPin, Tag, Sliders, Lock } from "lucide-react";

export const metadata = { title: "Configuración — Codflow Admin" };

const SECTIONS = [
  { icon: Key, title: "API Keys", description: "Claude API, Supabase, Google Maps. Gestiona las claves de acceso de cada integración." },
  { icon: MapPin, title: "Zonas de Panamá", description: "Define las zonas de Ciudad de Panamá y asigna perfiles A/B para la clasificación de leads." },
  { icon: Tag, title: "Rubros y categorías", description: "Gestiona los rubros de empresa, palabras clave de búsqueda y criterios de calificación." },
  { icon: Sliders, title: "Preferencias", description: "Umbrales de puntaje, frecuencia del monitor de reputación y notificaciones." },
];

export default function AdminConfiguracionPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <header className="mb-10 flex items-start gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100">
          <Settings className="h-5 w-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Configuración</h1>
          <p className="mt-0.5 text-sm text-gray-400">API keys, zonas, rubros y preferencias del sistema</p>
        </div>
      </header>
      <div className="space-y-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.title} className="flex items-start gap-4 rounded-2xl border border-[#e7eae9] bg-white p-5 shadow-[0_1px_3px_rgba(24,33,31,0.05)]">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gray-50">
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-gray-800">{section.title}</h3>
                  <span className="flex shrink-0 items-center gap-1 text-[11px] text-gray-300">
                    <Lock className="h-3 w-3" /> Próximamente
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-gray-400">{section.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
