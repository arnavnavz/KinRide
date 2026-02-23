export function haptic(style: "light" | "medium" | "heavy" = "medium") {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    const ms = style === "light" ? 10 : style === "heavy" ? 50 : 25;
    navigator.vibrate(ms);
  }
}
