interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`animate-shimmer bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] rounded ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-3 w-2/3 rounded" />
        </div>
      </div>
      <Skeleton className="h-3 w-full rounded" />
      <Skeleton className="h-3 w-4/5 rounded" />
    </div>
  );
}

export function ListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4">
          <Skeleton className="w-10 h-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/5 rounded" />
            <Skeleton className="h-3 w-3/5 rounded" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-48 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
      </div>
      <CardSkeleton />
      <ListSkeleton />
    </div>
  );
}

export function EarningsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-2">
        <Skeleton className="h-7 w-32 rounded" />
        <Skeleton className="h-4 w-56 rounded" />
      </div>
      <div className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-2">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-8 w-24 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        ))}
      </div>
      <ListSkeleton rows={4} />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded" />
            <Skeleton className="h-4 w-56 rounded" />
          </div>
          <Skeleton className="h-10 w-24 rounded-xl" />
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <Skeleton className="h-4 w-20 rounded" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-12 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-16 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-44 rounded" />
        <ListSkeleton rows={2} />
      </div>
    </div>
  );
}

export function ChatSkeleton() {
  return (
    <div className="flex h-[calc(100vh-7.5rem)] gap-4 animate-fade-in">
      <div className="flex flex-col w-full md:w-80 shrink-0 space-y-2">
        <Skeleton className="h-6 w-16 rounded mb-2" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 p-3 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
          </div>
        ))}
      </div>
      <div className="hidden md:flex flex-1 bg-white rounded-2xl border border-gray-100 items-center justify-center">
        <Skeleton className="w-16 h-16 rounded-full" />
      </div>
    </div>
  );
}
