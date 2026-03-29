const cn = (...classes: (string | undefined | null | false)[]) => classes.filter(Boolean).join(' ');

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('animate-pulse rounded-lg bg-muted/60', className)} />
  );
}

export function SkeletonCard() {
  return (
    <div className="bg-card border border-border p-5 rounded-xl space-y-3">
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-5 w-5 rounded-full" />
      </div>
      <Skeleton className="h-8 w-32 mt-1" />
      <Skeleton className="h-3 w-40" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/50">
      <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-4 w-20" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-4 md:p-8 space-y-6 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2"><Skeleton className="h-8 w-48" /><Skeleton className="h-4 w-64" /></div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
      </div>
      <div className="grid md:grid-cols-7 gap-4">
        <div className="md:col-span-4 bg-card border border-border rounded-xl p-5">
          <Skeleton className="h-5 w-48 mb-4" />
          <Skeleton className="h-[240px] w-full rounded-lg" />
        </div>
        <div className="md:col-span-3 bg-card border border-border rounded-xl p-5 space-y-3">
          <Skeleton className="h-5 w-32 mb-4" />
          {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-0 divide-y divide-border/50">
      {[...Array(rows)].map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonProductGrid() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
      {[...Array(10)].map((_, i) => (
        <div key={i} className="bg-card border border-border rounded-xl overflow-hidden">
          <Skeleton className="aspect-[4/5] w-full rounded-none" />
          <div className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
