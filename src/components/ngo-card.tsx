import Link from "next/link";

export type NgoCardData = { number: string; name: string; sub: string; amount: string; amountLabel: string; note: string | null };

export function NgoCard({ n, locale }: { n: NgoCardData; locale: string }) {
  return (
    <Link
      href={`/${locale}/funding/${n.number}`}
      className="group flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-5 transition hover:-translate-y-0.5 hover:border-brand hover:shadow-lg"
    >
      <div className="space-y-1">
        <h3 className="font-serif text-lg font-bold leading-snug group-hover:text-brand">{n.name}</h3>
        {n.sub && <p className="text-xs text-muted">{n.sub}</p>}
      </div>
      {n.note && <p className="self-start rounded-full bg-status-indicted/10 px-2.5 py-0.5 text-xs font-semibold text-status-indicted">{n.note}</p>}
      <div className="mt-auto flex items-end justify-between gap-2 border-t border-border pt-3">
        <span className="text-xs text-muted">{n.amountLabel}</span>
        <span className="font-serif text-xl font-bold tabular-nums">{n.amount}</span>
      </div>
    </Link>
  );
}
