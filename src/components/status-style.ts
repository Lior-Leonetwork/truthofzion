import type { Status } from "@/lib/content/schema";

export const STATUS_TEXT: Record<Status, string> = {
  convicted: "text-status-convicted",
  indicted: "text-status-indicted",
  under_investigation: "text-status-investigation",
  allegation: "text-status-allegation",
  documented: "text-status-documented",
};

export const STATUS_BG: Record<Status, string> = {
  convicted: "bg-status-convicted",
  indicted: "bg-status-indicted",
  under_investigation: "bg-status-investigation",
  allegation: "bg-status-allegation",
  documented: "bg-status-documented",
};

export const STATUS_BORDER: Record<Status, string> = {
  convicted: "border-status-convicted",
  indicted: "border-status-indicted",
  under_investigation: "border-status-investigation",
  allegation: "border-status-allegation border-dashed",
  documented: "border-status-documented",
};
