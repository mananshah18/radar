"use client";

interface Props {
  deadline: string; // ISO date "YYYY-MM-DD"
}

export function CountdownChip({ deadline }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(deadline);
  target.setHours(0, 0, 0, 0);
  const days = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  const color =
    days <= 7 ? "#ff3b30" :
    days <= 21 ? "#ff9500" :
    "#34c759";
  const bg =
    days <= 7 ? "rgba(255,59,48,0.1)" :
    days <= 21 ? "rgba(255,149,0,0.1)" :
    "rgba(52,199,89,0.1)";

  return (
    <span
      className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold"
      style={{ background: bg, color }}
    >
      {days > 0 ? `${days}d` : days === 0 ? "today" : "overdue"}
    </span>
  );
}
