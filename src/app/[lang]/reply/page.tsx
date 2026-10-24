import type { Metadata } from "next";
import { PageHeader } from "@/components/page-header";
import { getDict, type Locale } from "@/lib/i18n";
import { CONTACT_EMAIL } from "@/lib/site";

export async function generateMetadata({ params }: PageProps<"/[lang]/reply">): Promise<Metadata> {
  return { title: getDict((await params).lang as Locale).nav.reply };
}

export default async function Reply({ params }: PageProps<"/[lang]/reply">) {
  const d = getDict((await params).lang as Locale);
  return (
    <>
      <PageHeader eyebrow={d.nav.reply} title={d.reply.heading} />
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-12">
        {d.reply.paragraphs.map((p) => (
          <p key={p} className="text-lg leading-relaxed">{p}</p>
        ))}
        {CONTACT_EMAIL && (
          <p className="rounded-2xl border border-border bg-surface p-5">
            {d.reply.contact}{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-brand underline" dir="ltr">{CONTACT_EMAIL}</a>
          </p>
        )}
      </div>
    </>
  );
}
