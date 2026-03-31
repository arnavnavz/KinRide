import { CardSkeleton } from "@/components/Skeleton";

export default function DriverRideLoading() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="h-[280px] bg-gray-200 dark:bg-gray-700 rounded-2xl animate-pulse" />
      <CardSkeleton />
      <CardSkeleton />
    </div>
  );
}
