import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { getDict, type Locale } from "@/lib/i18n";
import { countries } from "@/lib/view";

export async function generateMetadata({ params }: PageProps<"/[lang]/countries">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.countries };
}

export default async function Countries({ params }: PageProps<"/[lang]/countries">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  const list = countries(locale);
  return (
    <>
      <PageHeader eyebrow={d.home.eyebrow} title={d.countries.heading} intro={d.countries.intro} />
      <div className="mx-auto max-w-6xl px-4 py-10">
        {list.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-12 text-center text-muted">{d.countries.none}</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((c) => (
              <li key={c.code}>
                <Link
                  href={`/${locale}/countries/${c.code.toLowerCase()}`}
                  className="group flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface p-5 transition hover:border-brand hover:shadow-lg"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold tracking-widest text-muted">{c.code}</p>
                    <p className="font-serif text-2xl font-bold group-hover:text-brand">{c.name}</p>
                  </div>
                  <dl className="flex gap-5 text-center">
                    <div>
                      <dd className="font-serif text-2xl font-bold tabular-nums">{c.people}</dd>
                      <dt className="text-xs text-muted">{d.countries.people}</dt>
                    </div>
                    <div>
                      <dd className="font-serif text-2xl font-bold tabular-nums">{c.cases}</dd>
                      <dt className="text-xs text-muted">{d.countries.cases}</dt>
                    </div>
                  </dl>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
