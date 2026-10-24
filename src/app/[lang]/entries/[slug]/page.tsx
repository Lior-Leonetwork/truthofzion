import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CountryTag } from "@/components/country-tag";
import { LegalProgress } from "@/components/legal-progress";
import { L } from "@/components/localized-text";
import { Monogram } from "@/components/monogram";
import { StatusBadge } from "@/components/status-badge";
import { entriesFor, getContent, getEntity, getEntry } from "@/lib/content/load";
import { STATUSES } from "@/lib/content/schema";
import { countryName, formatDate, getDict, LOCALES, t, type Locale } from "@/lib/i18n";
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

function Block({ title, children, id }: { title: string; children: React.ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      <h2 className="flex items-center gap-3 font-serif text-2xl font-bold">
        <span className="h-6 w-1 rounded-full bg-accent" />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default async function EntryPage({ params }: PageProps<"/[lang]/entries/[slug]">) {
  const { lang, slug } = await params;
  const locale = lang as Locale;
  const entry = getEntry(slug);
  if (!entry) notFound();
  const entity = getEntity(entry.entity)!;
  const d = getDict(locale);
  const ed = entry.editorial;
  const sourceIndex = new Map(entry.sources.map((s, i) => [s.id, i + 1]));
  const cite = (id: string) => (
    <a key={id} href={`#src-${id}`} className="align-super text-xs font-semibold text-brand">[{sourceIndex.get(id)}]</a>
  );
  const name = t(entity.name, locale).value;
  const related = entriesFor(entity.slug).filter((e) => e.slug !== entry.slug);
  const statusLabels = Object.fromEntries(STATUSES.map((s) => [s, d.statuses[s].name])) as Record<(typeof STATUSES)[number], string>;

  const progress = (
    <LegalProgress
      status={entry.status}
      labels={statusLabels}
      note={d.statuses[entry.status].note}
      title={d.progress.label}
      publicRecord={d.progress.publicRecord}
    />
  );

  const header = (
    <section className="hero-grid text-ink-text">
      <div className="mx-auto max-w-6xl space-y-5 px-4 py-12 sm:py-16">
        <div className="flex flex-wrap items-center gap-3 text-sm text-ink-muted">
          <span className="inline-flex items-center gap-2 rounded-md border border-ink-border px-2 py-0.5 text-xs">
            {d.entry.caseFile}
            <code dir="ltr" className="font-mono tracking-wider">{entry.slug}</code>
          </span>
          <span>{d.categories[entry.category].name}</span>
          <span>·</span>
          <span>{formatDate(entry.date, locale)}</span>
        </div>
        <L
          as="h1"
          text={entry.title}
          locale={locale}
          className={`max-w-4xl font-serif text-4xl font-black leading-tight sm:text-5xl ${ed.state === "retracted" ? "line-through opacity-60" : ""}`}
        />
        <div className="flex flex-wrap items-center gap-4">
          <Link href={`/${locale}/profiles/${entity.slug}`} className="flex items-center gap-3 hover:text-accent">
            <Monogram name={name} seed={entity.slug} size="sm" />
            <span>
              <span className="block font-semibold">{name}</span>
              <L text={entity.role} locale={locale} className="block text-sm text-ink-muted" />
            </span>
          </Link>
          <CountryTag code={entity.country} name={countryName(entity.country, locale)} tone="ink" />
        </div>
      </div>
    </section>
  );

  if (ed.state === "retracted") {
    return (
      <>
        {header}
        <div className="mx-auto max-w-3xl space-y-4 px-4 py-12">
          <p className="font-serif text-2xl font-bold text-status-convicted">
            {d.entry.retracted} · {formatDate(ed.retractedOn!, locale)}
          </p>
          <L as="p" text={ed.retractionReason} locale={locale} className="rounded-2xl border border-border bg-surface p-5 text-lg leading-relaxed" />
        </div>
      </>
    );
  }

  return (
    <>
      {header}
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_320px]">
        <article className="min-w-0 space-y-12">
          {/* On narrow screens the legal status leads, before the story. */}
          <div className="lg:hidden">{progress}</div>
          <div className="space-y-4">
            <L as="p" text={entry.summary} locale={locale} className="font-serif text-xl leading-relaxed sm:text-2xl" />
            {entry.body.map((p, i) => (
              <L key={i} as="p" text={p} locale={locale} className="text-lg leading-relaxed" />
            ))}
          </div>

          {entry.timeline.length > 0 && (
            <Block title={d.entry.timeline}>
              <ol className="relative space-y-6 border-s-2 border-border ps-6">
                {entry.timeline.map((ev, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -start-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background bg-brand" />
                    <p className="text-sm font-semibold text-muted">{formatDate(ev.date, locale)}</p>
                    <p className="text-lg">
                      <L text={ev.text} locale={locale} /> {ev.sourceIds.map(cite)}
                    </p>
                  </li>
                ))}
              </ol>
            </Block>
          )}

          <Block title={d.entry.response}>
            <div className="rounded-2xl border border-border bg-surface p-5">
              <p className="font-semibold">{d.entry.responseStatus[entry.response.status]}</p>
              {entry.response.text && (
                <blockquote className="mt-3 border-s-4 border-accent ps-4 font-serif text-xl leading-relaxed">
                  <L text={entry.response.text} locale={locale} /> {entry.response.sourceId && cite(entry.response.sourceId)}
                </blockquote>
              )}
              {entry.response.requestedOn && (
                <p className="mt-3 text-sm text-muted">{d.entry.requestedOn}{formatDate(entry.response.requestedOn, locale)}</p>
              )}
            </div>
          </Block>

          <Block title={d.entry.sources} id="sources">
            <ol className="divide-y divide-border rounded-2xl border border-border bg-surface">
              {entry.sources.map((s, i) => (
                <li key={s.id} id={`src-${s.id}`} className="flex scroll-mt-24 gap-4 p-4">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">{i + 1}</span>
                  <div className="min-w-0 space-y-1">
                    <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand hover:underline">
                      {s.title}
                    </a>
                    <p className="text-sm text-muted">
                      <span className="rounded bg-background px-1.5 py-0.5 text-xs font-semibold">{d.sourceTypes[s.type]}</span>{" "}
                      {s.publisher} · {formatDate(s.date, locale)}
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
          </Block>

          <Block title={d.entry.corrections}>
            {entry.corrections.length === 0 ? (
              <p className="text-muted">{d.entry.noCorrections}</p>
            ) : (
              <ul className="space-y-3">
                {entry.corrections.map((c, i) => (
                  <li key={i} className="rounded-2xl border border-border bg-surface p-4">
                    <p className="text-sm font-semibold text-muted">{formatDate(c.date, locale)}</p>
                    <L as="p" text={c.text} locale={locale} />
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="hidden lg:block">{progress}</div>
          <dl className="divide-y divide-border rounded-2xl border border-border bg-surface text-sm">
            <p className="p-4 text-xs font-semibold uppercase tracking-wider text-muted">{d.entry.facts}</p>
            {[
              [d.entry.category, d.categories[entry.category].name],
              [d.entry.date, formatDate(entry.date, locale)],
              [d.entry.sourcesCount, String(entry.sources.length)],
              [d.entry.published, formatDate(ed.publishedOn!, locale)],
              ...(ed.updatedOn ? [[d.entry.updated, formatDate(ed.updatedOn, locale)]] : []),
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-muted">{k}</dt>
                <dd className="font-semibold">{v}</dd>
              </div>
            ))}
            <p className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-status-documented">✓ {d.entry.reviewedBy}</p>
          </dl>
          {related.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-border bg-surface p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">{d.entry.related}</p>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/${locale}/entries/${r.slug}`} className="group block space-y-1">
                      <StatusBadge status={r.status} label={d.statuses[r.status].name} />
                      <L as="p" text={r.title} locale={locale} className="text-sm font-semibold group-hover:text-brand" />
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={`/${locale}/profiles/${entity.slug}`} className="block text-sm font-semibold text-brand hover:underline">
                {d.entry.profile} <span className="inline-block rtl:rotate-180">→</span>
              </Link>
            </div>
          )}
          {CONTACT_EMAIL && (
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(entry.slug)}`}
              className="block rounded-2xl border border-dashed border-border p-4 text-center text-sm text-muted hover:border-brand hover:text-brand"
            >
              {d.entry.reportError}
            </a>
          )}
        </aside>
      </div>
    </>
  );
}
