import type { Localized } from "@/lib/content/schema";
import { t, type Locale } from "@/lib/i18n";

// Renders text in the reader's language, or in the other one with a lang/dir
// attribute so the browser lays it out correctly.
export function L({ text, locale, as: Tag = "span", className }: {
  text: Localized | undefined;
  locale: Locale;
  as?: "span" | "p" | "h1" | "h2" | "h3";
  className?: string;
}) {
  const { value, fallback, lang } = t(text, locale);
  if (!fallback) return <Tag className={className}>{value}</Tag>;
  return (
    <Tag className={className} lang={lang} dir={lang === "he" ? "rtl" : "ltr"}>
      {value}
    </Tag>
  );
}
