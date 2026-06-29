import { Skeleton } from "@/components/ui/skeleton";

// Skeleton que refleja el layout real (KPIs · pipeline · grid · mapa).
// Barrido suave en lugar de spinner — el ojo anticipa la estructura que viene.
export function DashboardSkeleton() {
  return (
    <div className="rise-in" aria-hidden>
      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-[#e7eae9] bg-white px-5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-3 h-7 w-12" />
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="mt-6 rounded-xl border border-[#e7eae9] bg-white p-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-4 h-8 w-full rounded-lg" />
        <div className="mt-3 flex flex-wrap gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-24" />
          ))}
        </div>
      </div>

      {/* Grid + mapa */}
      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-[#e7eae9] bg-white p-5">
              <div className="flex items-start justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-12 w-full rounded-lg" />
              <Skeleton className="mt-3 h-3 w-3/4" />
              <Skeleton className="mt-4 h-7 w-full rounded-md" />
            </div>
          ))}
        </div>
        <Skeleton className="h-[600px] w-full rounded-xl" />
      </div>
    </div>
  );
}
