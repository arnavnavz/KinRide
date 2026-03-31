import { ListSkeleton } from "@/components/Skeleton";

export default function NotificationsLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10 space-y-6">
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
        ))}
      </div>
      <ListSkeleton rows={8} />
    </div>
  );
}
