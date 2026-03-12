/**
 * Formatea una fecha ISO a hora local de Ecuador (HH:mm AM/PM)
 */
export function formatHoraEC(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("es-EC", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Guayaquil",
  });
}
