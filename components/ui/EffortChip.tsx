import type { Effort } from "@/lib/db";

const config: Record<Effort, { label: string; bg: string; color: string }> = {
  Quick:  { label: "Quick",  bg: "rgba(52,199,89,0.1)",  color: "#34c759" },
  Medium: { label: "Medium", bg: "rgba(0,113,227,0.08)", color: "#0071e3" },
  Deep:   { label: "Deep",   bg: "rgba(175,82,222,0.1)", color: "#af52de" },
};

export function EffortChip({ effort }: { effort: Effort }) {
  const { label, bg, color } = config[effort] ?? config.Medium;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px]"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

export const EFFORTS: Effort[] = ["Quick", "Medium", "Deep"];
