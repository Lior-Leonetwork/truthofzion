export function Logo({ className = "h-8 w-8" }: { className?: string }) {
  // Two interlocking triangles, drawn as outlines so the mark reads at any size.
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round">
        <path d="M16 3 L28 24 H4 Z" />
        <path d="M16 29 L4 8 H28 Z" />
      </g>
    </svg>
  );
}
