const statusColors: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-800",
  OFFERED: "bg-blue-100 text-blue-800",
  ACCEPTED: "bg-indigo-100 text-indigo-800",
  ARRIVING: "bg-purple-100 text-purple-800",
  IN_PROGRESS: "bg-green-100 text-green-800",
  COMPLETED: "bg-gray-100 text-gray-600",
  CANCELED: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  REQUESTED: "Searching...",
  OFFERED: "Offered to drivers",
  ACCEPTED: "Driver accepted",
  ARRIVING: "Driver arriving",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELED: "Canceled",
};

export function RideStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        statusColors[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}
