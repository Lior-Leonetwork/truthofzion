import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import { LangSwitch } from "./lang-switch";
import { Logo } from "./logo";

export function SiteHeader({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const nav = [
    { href: `/${locale}/investigations`, label: d.nav.investigations },
    { href: `/${locale}/people`, label: d.nav.people },
    { href: `/${locale}/countries`, label: d.nav.countries },
    { href: `/${locale}/methodology`, label: d.nav.methodology },
    { href: `/${locale}/corrections`, label: d.nav.corrections },
  ];
  return (
    <header className="sticky top-0 z-30 border-b border-ink-border bg-ink/95 text-ink-text backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-3">
        <Link href={`/${locale}`} className="flex shrink-0 items-center gap-2.5">
          <Logo className="h-7 w-7 text-accent" />
          <span className="font-serif text-xl font-bold tracking-tight">{d.siteName}</span>
        </Link>
        <nav className="no-scrollbar hidden flex-1 gap-1 overflow-x-auto text-sm md:flex">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-ink-muted hover:bg-ink-2 hover:text-ink-text">
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="ms-auto md:ms-0">
          <LangSwitch locale={locale} label={d.langSwitch} />
        </div>
      </div>
      <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2 text-sm md:hidden">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className="whitespace-nowrap rounded-lg px-3 py-1.5 text-ink-muted hover:bg-ink-2 hover:text-ink-text">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
