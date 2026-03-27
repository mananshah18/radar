import type { Status } from "@/lib/db";

const STATUS_OPTIONS: Status[] = ["Todo", "In Progress", "Waiting On", "Done"];

interface Props {
  value: Status;
  onChange: (v: Status) => void;
}

export function StatusSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as Status)}
      className="rounded-lg px-2 py-1 text-[12px] outline-none"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border-med)",
        color: "var(--text-primary)",
      }}
    >
      {STATUS_OPTIONS.map((s) => (
        <option key={s} value={s}>{s}</option>
      ))}
    </select>
  );
}
