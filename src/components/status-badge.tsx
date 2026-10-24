import type { Status } from "@/lib/content/schema";
import { STATUS_BG, STATUS_BORDER, STATUS_TEXT } from "./status-style";

export function StatusBadge({ status, label, className = "" }: { status: Status; label: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_BORDER[status]} ${STATUS_TEXT[status]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${STATUS_BG[status]}`} />
      {label}
    </span>
  );
}
