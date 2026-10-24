import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { L } from "@/components/localized-text";
import { StatusBadge } from "@/components/status-badge";
import { getContent, getEntity, getEntry } from "@/lib/content/load";
import { formatDate, getDict, LOCALES, t, type Locale } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.flatMap((lang) => getContent().entries.map((e) => ({ lang, slug: e.slug })));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/entries/[slug]">): Promise<Metadata> {
  const { lang, slug } = await params;
  const entry = getEntry(slug);
  if (!entry) return {};
  const locale = lang as Locale;
  return { title: t(entry.title, locale).value, description: t(entry.summary, locale).value };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-xl font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default async function EntryPage({ params }: PageProps<"/[lang]/entries/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const entry = getEntry(slug);
  if (!entry) notFound();
  const entity = getEntity(entry.entity);
  const d = getDict(locale);
  const ed = entry.editorial;
  const sourceIndex = new Map(entry.sources.map((s, i) => [s.id, i + 1]));
  const cite = (id: string) => (
    <a key={id} href={`#src-${id}`} className="text-brand">[{sourceIndex.get(id)}]</a>
  );

  if (ed.state === "retracted") {
    return (
      <article className="max-w-3xl space-y-4">
        <p className="font-semibold text-status-convicted">{d.entry.retracted} · {formatDate(ed.retractedOn!, locale)}</p>
        <L as="h1" text={entry.title} locale={locale} className="font-serif text-3xl font-bold line-through opacity-60" />
        <L as="p" text={ed.retractionReason} locale={locale} className="rounded-lg border border-border bg-surface p-4" />
      </article>
    );
  }

  return (
    <article className="max-w-3xl space-y-10">
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          <span>{d.categories[entry.category].name}</span>
          <span>·</span>
          <span>{formatDate(entry.date, locale)}</span>
        </div>
        <L as="h1" text={entry.title} locale={locale} className="font-serif text-3xl font-bold leading-tight sm:text-4xl" />
        <StatusBadge status={entry.status} locale={locale} withNote />
        {entity && (
          <p className="text-muted">
            <L text={entity.name} locale={locale} className="font-semibold text-foreground" /> —{" "}
            <L text={entity.role} locale={locale} />{" "}
            <Link href={`/${locale}/profiles/${entity.slug}`} className="text-brand underline">{d.entry.profile}</Link>
          </p>
        )}
      </header>

      <Section title={d.entry.summary}>
        <L as="p" text={entry.summary} locale={locale} className="text-lg leading-relaxed" />
      </Section>

      {entry.body.length > 0 && (
        <Section title={d.entry.details}>
          {entry.body.map((p, i) => (
            <L key={i} as="p" text={p} locale={locale} className="leading-relaxed" />
          ))}
        </Section>
      )}

      {entry.timeline.length > 0 && (
        <Section title={d.entry.timeline}>
          <ol className="space-y-3 border-s-2 border-border ps-5">
            {entry.timeline.map((ev, i) => (
              <li key={i} className="space-y-0.5">
                <p className="text-sm font-semibold text-muted">{formatDate(ev.date, locale)}</p>
                <p>
                  <L text={ev.text} locale={locale} /> {ev.sourceIds.map(cite)}
                </p>
              </li>
            ))}
          </ol>
        </Section>
      )}

      <Section title={d.entry.response}>
        <div className="rounded-lg border border-border bg-surface p-4">
          <p className="font-medium">{d.entry.responseStatus[entry.response.status]}</p>
          {entry.response.text && (
            <blockquote className="mt-2 border-s-4 border-gold ps-4">
              <L text={entry.response.text} locale={locale} /> {entry.response.sourceId && cite(entry.response.sourceId)}
            </blockquote>
          )}
          {entry.response.requestedOn && (
            <p className="mt-2 text-sm text-muted">{d.entry.requestedOn}{formatDate(entry.response.requestedOn, locale)}</p>
          )}
        </div>
      </Section>

      <Section title={d.entry.sources}>
        <ol className="space-y-3">
          {entry.sources.map((s, i) => (
            <li key={s.id} id={`src-${s.id}`} className="flex gap-3 text-sm">
              <span className="font-semibold text-muted">{i + 1}.</span>
              <div>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-medium text-brand underline">
                  {s.title}
                </a>
                <p className="text-muted">
                  {s.publisher} · {d.sourceTypes[s.type]} · {formatDate(s.date, locale)}
                  {s.archivedUrl && (
                    <>
                      {" · "}
                      <a href={s.archivedUrl} target="_blank" rel="noopener noreferrer" className="underline">{d.entry.archived}</a>
                    </>
                  )}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </Section>

      <Section title={d.entry.corrections}>
        {entry.corrections.length === 0 ? (
          <p className="text-sm text-muted">{d.entry.noCorrections}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {entry.corrections.map((c, i) => (
              <li key={i}>
                <span className="font-semibold">{formatDate(c.date, locale)}:</span> <L text={c.text} locale={locale} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <footer className="space-y-1 border-t border-border pt-4 text-sm text-muted">
        <p>
          {d.entry.published} {formatDate(ed.publishedOn!, locale)}
          {ed.updatedOn && ` · ${d.entry.updated} ${formatDate(ed.updatedOn, locale)}`} · {d.entry.reviewedBy}
        </p>
        {CONTACT_EMAIL && (
          <p>
            <a href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(entry.slug)}`} className="underline">
              {d.entry.reportError}
            </a>
          </p>
        )}
      </footer>
    </article>
  );
}
