const translations: Record<string, Record<string, string>> = {
  en: {
    "nav.chats": "Chats",
    "nav.history": "Ride History",
    "nav.scheduled": "Scheduled",
    "nav.kin": "My Kin",
    "nav.profile": "Profile",
    "nav.wallet": "Wallet",
    "nav.support": "Support",
    "nav.promos": "Promos & Referrals",
    "booking.where_to": "Where to?",
    "booking.choose_ride": "Choose a ride",
    "booking.confirm_ride": "Confirm ride",
    "booking.schedule_later": "Schedule for later",
    "booking.prefer_kin": "Prefer Kin drivers",
    "booking.finding_driver": "Finding a driver...",
    "ride.your_ride": "Your Ride",
    "ride.driver_arriving": "Driver is arriving!",
    "ride.ride_completed": "Ride completed!",
    "ride.cancel_ride": "Cancel Ride",
    "ride.rate_driver": "Rate Driver",
    "ride.tip_driver": "Tip Driver",
    "ride.split_fare": "Split Fare",
    "ride.share_trip": "Share Trip",
    "common.loading": "Loading...",
    "common.save": "Save",
    "common.cancel": "Cancel",
    "common.confirm": "Confirm",
    "common.back": "Back",
    "common.next": "Next",
    "common.sign_out": "Sign out",
  },
  es: {
    "nav.chats": "Mensajes",
    "nav.history": "Historial de Viajes",
    "nav.scheduled": "Programados",
    "nav.kin": "Mi Kin",
    "nav.profile": "Perfil",
    "nav.wallet": "Billetera",
    "nav.support": "Soporte",
    "nav.promos": "Promos y Referidos",
    "booking.where_to": "¿A dónde vas?",
    "booking.choose_ride": "Elige un viaje",
    "booking.confirm_ride": "Confirmar viaje",
    "booking.schedule_later": "Programar para después",
    "booking.prefer_kin": "Preferir conductores Kin",
    "booking.finding_driver": "Buscando conductor...",
    "ride.your_ride": "Tu Viaje",
    "ride.driver_arriving": "¡El conductor está llegando!",
    "ride.ride_completed": "¡Viaje completado!",
    "ride.cancel_ride": "Cancelar Viaje",
    "ride.rate_driver": "Calificar Conductor",
    "ride.tip_driver": "Propina",
    "ride.split_fare": "Dividir Tarifa",
    "ride.share_trip": "Compartir Viaje",
    "common.loading": "Cargando...",
    "common.save": "Guardar",
    "common.cancel": "Cancelar",
    "common.confirm": "Confirmar",
    "common.back": "Atrás",
    "common.next": "Siguiente",
    "common.sign_out": "Cerrar sesión",
  },
};

export type Locale = "en" | "es";

export function getTranslation(locale: Locale, key: string): string {
  return translations[locale]?.[key] || translations.en[key] || key;
}

export function getLocale(): Locale {
  if (typeof window === "undefined") return "en";
  return (localStorage.getItem("kinride-locale") as Locale) || "en";
}

export function setLocale(locale: Locale): void {
  localStorage.setItem("kinride-locale", locale);
}

export function getSupportedLocales(): Array<{ code: Locale; label: string }> {
  return [
    { code: "en", label: "English" },
    { code: "es", label: "Español" },
  ];
}
