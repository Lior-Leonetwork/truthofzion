import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { SpectrumBadge } from "@/components/spectrum-badge";
import { getDict, t, type Locale } from "@/lib/i18n";
import { parties, partyKeyVotes } from "@/lib/knesset/parties";
import { SPECTRUM_ORDER } from "@/lib/knesset/view";

export async function generateMetadata({ params }: PageProps<"/[lang]/knesset/parties">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).parties.heading };
}

export default async function Parties({ params }: PageProps<"/[lang]/knesset/parties">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const list = parties()
    .map((p) => ({ p, kv: partyKeyVotes(p) }))
    .sort((a, b) => SPECTRUM_ORDER.indexOf(a.p.spectrum) - SPECTRUM_ORDER.indexOf(b.p.spectrum) || b.p.members.length - a.p.members.length);
  return (
    <>
      <PageHeader eyebrow={d.nav.knesset} title={d.parties.heading} intro={d.parties.intro} />
      <ul className="mx-auto grid max-w-6xl gap-4 px-4 py-10 sm:grid-cols-2 lg:grid-cols-3">
        {list.map(({ p, kv }) => {
          const decided = kv.aligned + kv.opposed;
          return (
            <li key={p.slug}>
              <Link
                href={`/${locale}/knesset/parties/${p.slug}`}
                className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
              >
                <h2 className="font-serif text-2xl font-bold group-hover:text-brand">{t(p.short, locale).value}</h2>
                <SpectrumBadge spectrum={p.spectrum} label={d.spectrum[p.spectrum]} sector={p.sector ? d.sector[p.sector as keyof typeof d.sector] : null} />
                <p className="text-sm text-muted">{d.parties.seats(p.members.length)}</p>
                {decided > 0 && (
                  <div className="mt-auto space-y-1.5 border-t border-border pt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-status-convicted/30">
                      <div className="h-full rounded-full bg-status-documented" style={{ width: `${(kv.aligned / decided) * 100}%` }} />
                    </div>
                    <p className="text-xs text-muted">{d.parties.alignment(kv.aligned, decided)}</p>
                  </div>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
