import type { Metadata } from "next";
import Link from "next/link";
import { L } from "@/components/localized-text";
import { PageHeader } from "@/components/page-header";
import { getContent } from "@/lib/content/load";
import type { Localized } from "@/lib/content/schema";
import { formatDate, getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/corrections">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.corrections };
}

export default async function Corrections({ params }: PageProps<"/[lang]/corrections">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const log: { date: string; slug: string; title: Localized; text?: Localized; retraction: boolean }[] = [];
  for (const e of getContent().entries) {
    for (const c of e.corrections) log.push({ date: c.date, slug: e.slug, title: e.title, text: c.text, retraction: false });
    if (e.editorial.state === "retracted") {
      log.push({ date: e.editorial.retractedOn!, slug: e.slug, title: e.title, text: e.editorial.retractionReason, retraction: true });
    }
  }
  log.sort((a, b) => b.date.localeCompare(a.date));

  return (
    <>
      <PageHeader eyebrow={d.nav.corrections} title={d.corrections.heading} intro={d.corrections.intro} />
      <div className="mx-auto max-w-3xl px-4 py-12">
        {log.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-10 text-center text-muted">{d.corrections.empty}</p>
        ) : (
          <ol className="relative space-y-6 border-s-2 border-border ps-6">
            {log.map((c, i) => (
              <li key={i} className="relative space-y-1">
                <span className={`absolute -start-[31px] top-1.5 h-3 w-3 rounded-full border-2 border-background ${c.retraction ? "bg-status-convicted" : "bg-accent"}`} />
                <p className="text-sm text-muted">
                  {formatDate(c.date, locale)}
                  {c.retraction && <span className="ms-2 font-semibold text-status-convicted">{d.corrections.retraction}</span>}
                </p>
                <Link href={`/${locale}/entries/${c.slug}`} className="font-serif text-lg font-bold hover:text-brand">
                  <L text={c.title} locale={locale} />
                </Link>
                <L as="p" text={c.text} locale={locale} className="text-muted" />
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
