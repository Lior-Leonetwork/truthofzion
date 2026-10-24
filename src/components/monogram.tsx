// Initials instead of photos: no image rights to clear, and no face put next
// to an accusation.
const TONES = [
  "from-[#1f4fd1] to-[#0b2a7a]",
  "from-[#334155] to-[#0f172a]",
  "from-[#7c5c12] to-[#3d2c06]",
  "from-[#4b3b8f] to-[#211852]",
  "from-[#0f5f5a] to-[#06302d]",
];

function hash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function Monogram({ name, seed, size = "md" }: { name: string; seed: string; size?: "sm" | "md" | "lg" }) {
  const initials = name
    .replace(/[״׳"']/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("");
  const dims = { sm: "h-10 w-10 text-sm", md: "h-14 w-14 text-lg", lg: "h-24 w-24 text-3xl" }[size];
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br font-serif font-bold text-white ${dims} ${TONES[hash(seed) % TONES.length]}`}
    >
      {initials}
    </span>
  );
}
