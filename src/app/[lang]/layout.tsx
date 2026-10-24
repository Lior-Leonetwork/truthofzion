import type { Metadata } from "next";
import { Frank_Ruhl_Libre, Heebo } from "next/font/google";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { IS_DEMO } from "@/lib/content/load";
import { dir, getDict, hasLocale, LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";
import "../globals.css";

const heebo = Heebo({ variable: "--font-heebo", subsets: ["hebrew", "latin"] });
const frank = Frank_Ruhl_Libre({ variable: "--font-frank", subsets: ["hebrew", "latin"], weight: ["500", "700", "900"] });

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  if (!hasLocale(lang)) return {};
  const d = getDict(lang);
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: d.siteName, template: `%s · ${d.siteName}` },
    description: d.home.intro,
    alternates: { languages: { he: "/he", en: "/en" } },
    // Demo builds show fictional people; keep them out of search engines.
    robots: IS_DEMO ? { index: false, follow: false } : undefined,
  };
}

export default async function RootLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!hasLocale(lang)) notFound();
  const d = getDict(lang);
  return (
    <html lang={lang} dir={dir(lang)} className={`${heebo.variable} ${frank.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        {IS_DEMO && (
          <div className="bg-accent px-4 py-1.5 text-center text-sm font-semibold text-ink">{d.demo}</div>
        )}
        <SiteHeader locale={lang} />
        <main className="flex-1">{children}</main>
        <SiteFooter locale={lang} />
      </body>
    </html>
  );
}
