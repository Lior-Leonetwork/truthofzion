import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { STATUSES } from "@/lib/content/schema";
import { L } from "@/components/localized-text";
import { formatDate, getDict, type Locale } from "@/lib/i18n";
import { readPolicy } from "@/lib/knesset/store";
import { getContent } from "@/lib/content/load";

export async function generateMetadata({ params }: PageProps<"/[lang]/methodology">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.methodology };
}

export default async function Methodology({ params }: PageProps<"/[lang]/methodology">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const policy = readPolicy();
  const approver = policy?.approvedBy ? getContent().editors.get(policy.approvedBy)?.name ?? policy.approvedBy : null;
  return (
    <>
      <PageHeader eyebrow={d.nav.methodology} title={d.methodology.heading} intro={d.methodology.intro} />
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_340px]">
        <article className="space-y-10">
          {d.methodology.sections.map((s, i) => (
            <section key={s.title} className="space-y-3">
              <p className="font-mono text-sm text-accent">0{i + 1}</p>
              <h2 className="font-serif text-3xl font-bold">{s.title}</h2>
              {s.body.map((p) => (
                <p key={p} className="text-lg leading-relaxed">{p}</p>
              ))}
            </section>
          ))}
          {policy && (
            <section id="policy" className="scroll-mt-24 space-y-3">
              <p className="font-mono text-sm text-accent">0{d.methodology.sections.length + 1}</p>
              <h2 className="font-serif text-3xl font-bold">{d.knesset.policy.title}</h2>
              <p className="text-lg leading-relaxed">{d.knesset.policy.intro}</p>
              <ul className="space-y-2">
                {policy.stances.map((s) => (
                  <li key={s.id} className="flex gap-3 rounded-xl border border-border bg-surface p-4">
                    <span className="text-accent">★</span>
                    <L as="span" text={s.statement} locale={locale} />
                  </li>
                ))}
              </ul>
              <p className="text-sm text-muted">
                {approver && policy.approvedOn ? d.knesset.policy.approved(approver, formatDate(policy.approvedOn, locale)) : d.knesset.policy.pending}
              </p>
            </section>
          )}
        </article>
        <aside className="space-y-3 lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted">{d.progress.label}</p>
          <ul className="divide-y divide-border rounded-2xl border border-border bg-surface">
            {STATUSES.map((s) => (
              <li key={s} className="space-y-1.5 p-4">
                <StatusBadge status={s} label={d.statuses[s].name} />
                <p className="text-sm text-muted">{d.statuses[s].note}</p>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </>
  );
}
