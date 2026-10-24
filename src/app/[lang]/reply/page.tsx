import type { Metadata } from "next";
import { getDict, type Locale } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/reply">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.reply };
}

export default async function Reply({ params }: PageProps<"/[lang]/reply">) {
  const d = getDict((await params).lang as Locale);
  return (
    <article className="max-w-3xl space-y-5">
      <h1 className="font-serif text-4xl font-bold">{d.reply.heading}</h1>
      {d.reply.paragraphs.map((p) => (
        <p key={p} className="leading-relaxed">{p}</p>
      ))}
      {CONTACT_EMAIL && (
        <p className="rounded-xl border border-border bg-surface p-5">
          {d.reply.contact}{" "}
          <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand underline" dir="ltr">{CONTACT_EMAIL}</a>
        </p>
      )}
    </article>
  );
}
