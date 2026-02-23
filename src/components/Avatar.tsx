const COLORS = [
  "bg-violet-500",
  "bg-blue-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-lime-600",
  "bg-orange-500",
  "bg-teal-500",
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

interface AvatarProps {
  name: string;
  size?: "xs" | "sm" | "md" | "lg";
  online?: boolean;
  className?: string;
}

const sizeMap = {
  xs: "w-7 h-7 text-[10px]",
  sm: "w-9 h-9 text-xs",
  md: "w-11 h-11 text-sm",
  lg: "w-14 h-14 text-lg",
};

export function Avatar({ name, size = "md", online, className = "" }: AvatarProps) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const color = COLORS[hashCode(name) % COLORS.length];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} ${color} rounded-full flex items-center justify-center text-white font-semibold shadow-sm`}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            online ? "bg-green-400" : "bg-gray-300"
          }`}
        />
      )}
    </div>
  );
}
