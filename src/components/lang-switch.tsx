"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Locale } from "@/lib/i18n";

export function LangSwitch({ locale, label }: { locale: Locale; label: string }) {
  const pathname = usePathname();
  const other: Locale = locale === "he" ? "en" : "he";
  const href = pathname.replace(/^\/(he|en)(?=\/|$)/, `/${other}`) || `/${other}`;
  return (
    <Link
      href={href}
      hrefLang={other}
      lang={other}
      className="rounded-full border border-ink-border px-3 py-1 text-sm text-ink-text hover:bg-ink-2"
    >
      {label}
    </Link>
  );
}
