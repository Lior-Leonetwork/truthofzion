// Shared by server pages and the client-side directory, so no node imports.
export function money(n: number, locale: string, compact = false) {
  const big = compact && n >= 1_000_000;
  return new Intl.NumberFormat(locale === "he" ? "he-IL" : "en-GB", {
    style: "currency",
    currency: "ILS",
    maximumFractionDigits: big ? 1 : 0,
    notation: big ? "compact" : "standard",
  }).format(n);
}
