import Link from "next/link";
import { getDict, type Locale } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";
import { Logo } from "./logo";

export function SiteFooter({ locale }: { locale: Locale }) {
  const d = getDict(locale);
  const links = [
    { href: `/${locale}/investigations`, label: d.nav.investigations },
    { href: `/${locale}/people`, label: d.nav.people },
    { href: `/${locale}/countries`, label: d.nav.countries },
    { href: `/${locale}/methodology`, label: d.nav.methodology },
    { href: `/${locale}/corrections`, label: d.nav.corrections },
    { href: `/${locale}/reply`, label: d.nav.reply },
  ];
  return (
    <footer className="bg-ink text-ink-text">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[2fr_1fr]">
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            <Logo className="h-6 w-6 text-accent" />
            <span className="font-serif text-lg font-bold">{d.siteName}</span>
          </div>
          <p className="max-w-md text-sm text-ink-muted">{d.footer.about}</p>
          <p className="text-sm font-semibold text-ink-text">{d.footer.legal}</p>
          {CONTACT_EMAIL && (
            <a href={`mailto:${CONTACT_EMAIL}`} dir="ltr" className="inline-block text-sm text-accent underline">
              {CONTACT_EMAIL}
            </a>
          )}
        </div>
        <ul className="grid grid-cols-2 gap-2 text-sm">
          {links.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-ink-muted hover:text-ink-text">{l.label}</Link>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
