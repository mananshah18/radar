import type { Priority } from "@/lib/db";

const config: Record<Priority, { label: string; bg: string; color: string }> = {
  P0: { label: "P0", bg: "rgba(255,59,48,0.1)", color: "#ff3b30" },
  P1: { label: "P1", bg: "rgba(255,149,0,0.1)", color: "#ff9500" },
  P2: { label: "P2", bg: "rgba(255,204,0,0.12)", color: "#b8860b" },
  P3: { label: "P3", bg: "rgba(0,0,0,0.05)", color: "#aeaeb2" },
};

export function PriorityBadge({ priority }: { priority: Priority }) {
  const { label, bg, color } = config[priority] ?? config.P2;
  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

export const PRIORITIES: Priority[] = ["P0", "P1", "P2", "P3"];
