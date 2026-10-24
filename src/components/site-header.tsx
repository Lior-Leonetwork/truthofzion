import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const nav = [
    { href: `/${locale}#cases`, label: d.nav.entries },
    { href: `/${locale}/methodology`, label: d.nav.methodology },
    { href: `/${locale}/corrections`, label: d.nav.corrections },
    { href: `/${locale}/reply`, label: d.nav.reply },
  ];
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
        <Link href={`/${locale}`} className="flex items-center gap-2 text-brand">
          <Logo />
          <span className="font-serif text-xl font-bold tracking-tight">{d.siteName}</span>
        </Link>
        <nav className="order-last flex w-full flex-wrap gap-x-4 gap-y-1 text-sm text-muted sm:order-none sm:w-auto sm:flex-1">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="hover:text-foreground">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto sm:ms-0">
          <LangSwitch locale={locale} label={d.langSwitch} />
        </div>
      </div>
    </header>
  );
}
