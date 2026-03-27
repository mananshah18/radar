"use client";

const SUB_AREAS = ["Personalization", "Agent", "UX"];

interface Props {
  active: string | null;
  onChange: (v: string | null) => void;
}

export function SubAreaFilter({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-2 px-6 py-2 border-b border-[#1e1e1e]">
      <span className="text-[11px] text-[#555]">Filter:</span>
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
          active === null ? "bg-[#7c6af7]/20 text-[#9585ff]" : "text-[#666] hover:text-[#999]"
        }`}
      >
        All
      </button>
      {SUB_AREAS.map((s) => (
        <button
          key={s}
          onClick={() => onChange(active === s ? null : s)}
          className={`px-2.5 py-1 rounded text-[11px] transition-colors ${
            active === s
              ? "bg-[#7c6af7]/20 text-[#9585ff]"
              : "text-[#666] hover:text-[#999]"
          }`}
        >
          {s}
        </button>
      ))}
    </div>
  );
}
