import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/localized-text";
import { StatusBadge } from "@/components/status-badge";
import { entriesFor, getContent, getEntity } from "@/lib/content/load";
import { formatDate, getDict, LOCALES, t, type Locale } from "@/lib/i18n";

export const dynamicParams = false;

// A profile only exists once at least one case about it is public.
export function generateStaticParams() {
  const slugs = new Set(getContent().entries.map((e) => e.entity));
  return LOCALES.flatMap((lang) => [...slugs].map((slug) => ({ lang, slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/profiles/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const entity = getEntity(slug);
  return entity ? { title: t(entity.name, lang as Locale).value } : {};
}

export default async function ProfilePage({ params }: PageProps<"/[lang]/profiles/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const entity = getEntity(slug);
  const entries = entriesFor(slug);
  if (!entity || entries.length === 0) notFound();
  const d = getDict(locale);

  return (
    <div className="max-w-3xl space-y-10">
      <header className="space-y-2">
        <L as="h1" text={entity.name} locale={locale} className="font-serif text-4xl font-bold" />
        <L as="p" text={entity.role} locale={locale} className="text-lg text-muted" />
        {entity.description && <L as="p" text={entity.description} locale={locale} className="leading-relaxed" />}
      </header>

      {entity.links.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-serif text-xl font-bold">{d.profile.links}</h2>
          <ul className="flex flex-wrap gap-3 text-sm">
            {entity.links.map((l) => (
              <li key={l.url}>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="text-brand underline">
                  <L text={l.label} locale={locale} />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-serif text-xl font-bold">{d.profile.entries}</h2>
        <ul className="divide-y divide-border rounded-xl border border-border bg-surface">
          {entries.map((e) => (
            <li key={e.slug}>
              <Link href={`/${locale}/entries/${e.slug}`} className="block space-y-2 p-5 hover:bg-brand-soft/50">
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
                  <StatusBadge status={e.status} locale={locale} />
                  <span>{d.categories[e.category].name}</span>
                  <span>{formatDate(e.date, locale)}</span>
                  {e.editorial.state === "retracted" && (
                    <span className="font-semibold text-status-convicted">{d.entry.retracted}</span>
                  )}
                </div>
                <L as="h3" text={e.title} locale={locale} className="font-serif text-lg font-bold" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
