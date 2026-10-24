import type { Metadata } from "next";
import { StatusBadge } from "@/components/status-badge";
import { STATUSES } from "@/lib/content/schema";
import { getDict, type Locale } from "@/lib/i18n";

export async function generateMetadata({ params }: PageProps<"/[lang]/methodology">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.methodology };
}

export default async function Methodology({ params }: PageProps<"/[lang]/methodology">) {
  const locale = (await params).lang as Locale;
  const d = getDict(locale);
  return (
    <article className="max-w-3xl space-y-10">
      <h1 className="font-serif text-4xl font-bold">{d.methodology.heading}</h1>
      <ul className="space-y-2 rounded-xl border border-border bg-surface p-5">
        {STATUSES.map((s) => (
          <li key={s}>
            <StatusBadge status={s} locale={locale} withNote />
          </li>
        ))}
      </ul>
      {d.methodology.sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="font-serif text-2xl font-bold">{s.title}</h2>
          {s.body.map((p) => (
            <p key={p} className="leading-relaxed">{p}</p>
          ))}
        </section>
      ))}
    </article>
  );
}
