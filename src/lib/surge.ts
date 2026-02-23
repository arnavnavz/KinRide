interface SurgeConfig {
  multiplier: number;
  label: string;
  color: string;
}

export function getSurgeMultiplier(): SurgeConfig {
  const now = new Date();
  const hour = now.getHours();
  const day = now.getDay(); // 0 = Sunday

  // Peak hours: weekday mornings (7-9) and evenings (5-7)
  if (day >= 1 && day <= 5) {
    if (hour >= 7 && hour < 9) return { multiplier: 1.5, label: "Morning rush", color: "text-amber-600" };
    if (hour >= 17 && hour < 19) return { multiplier: 1.7, label: "Evening rush", color: "text-red-500" };
  }

  // Weekend nights (10pm - 2am)
  if ((day === 5 || day === 6) && (hour >= 22 || hour < 2)) {
    return { multiplier: 2.0, label: "High demand", color: "text-red-600" };
  }

  // Late night (11pm - 5am)
  if (hour >= 23 || hour < 5) {
    return { multiplier: 1.3, label: "Late night", color: "text-amber-500" };
  }

  // Normal
  return { multiplier: 1.0, label: "", color: "" };
}

export function formatSurgeLabel(multiplier: number): string {
  if (multiplier <= 1.0) return "";
  return `${multiplier.toFixed(1)}x`;
}
