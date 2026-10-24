export function PageHeader({ eyebrow, title, intro, children }: {
  eyebrow?: string;
  title: string;
  intro?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="hero-grid text-ink-text">
      <div className="mx-auto max-w-6xl space-y-3 px-4 py-12 sm:py-16">
        {eyebrow && <p className="text-sm font-semibold text-accent">{eyebrow}</p>}
        <h1 className="font-serif text-4xl font-black leading-tight sm:text-5xl">{title}</h1>
        {intro && <p className="max-w-2xl text-lg text-ink-muted">{intro}</p>}
        {children}
      </div>
    </section>
  );
}
