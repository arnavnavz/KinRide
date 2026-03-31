import { CardSkeleton } from "@/components/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
        <div className="space-y-2">
          <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-56 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
      </div>
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
