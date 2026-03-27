"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import useSWR from "swr";
import type { Bucket } from "@/lib/db";
import { CountdownChip } from "@/components/buckets/CountdownChip";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface GroupedBuckets {
  [group: string]: Bucket[];
}

const GROUP_ORDER = ["Mobile", "Charts", "General"];

const NAV_ITEMS = [
  { href: "/tasks/focus",   label: "Today / Focus", icon: "⚡" },
  { href: "/tasks/all",     label: "All Tasks",     icon: "◈" },
  { href: "/tasks/waiting", label: "Waiting On",    icon: "⏳" },
  { href: "/tasks/archive", label: "Archive",       icon: "✓" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: buckets = [] } = useSWR<Bucket[]>("/api/buckets", fetcher, { refreshInterval: 5000 });

  const grouped: GroupedBuckets = {};
  for (const b of buckets) {
    if (!grouped[b.group_name]) grouped[b.group_name] = [];
    grouped[b.group_name].push(b);
  }

  const isActive = (href: string) => pathname === href;
  const isBucketActive = (slug: string) => pathname === `/tasks/${slug}`;

  return (
    <aside className="w-56 flex-shrink-0 h-screen flex flex-col border-r border-[#2e2e2e] bg-[#111]">
      {/* App name */}
      <div className="px-4 py-4 border-b border-[#2e2e2e]">
        <h1 className="text-sm font-semibold text-[#e8e8e8] tracking-tight">My Tasks</h1>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 space-y-4">
        {/* Fixed views */}
        <div className="px-2 space-y-0.5">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
                isActive(item.href)
                  ? "bg-[#7c6af7]/20 text-[#9585ff]"
                  : "text-[#999] hover:text-[#e8e8e8] hover:bg-[#1e1e1e]"
              }`}
            >
              <span className="text-[11px] w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        {/* Grouped buckets */}
        {GROUP_ORDER.filter((g) => grouped[g]?.length).map((group) => (
          <div key={group} className="px-2">
            <p className="px-2 mb-1 text-[10px] font-semibold uppercase tracking-widest text-[#555]">
              {group}
            </p>
            <div className="space-y-0.5">
              {grouped[group].map((b) => (
                <Link
                  key={b.id}
                  href={`/tasks/${b.slug}`}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors group ${
                    isBucketActive(b.slug)
                      ? "bg-[#7c6af7]/20 text-[#e8e8e8]"
                      : "text-[#999] hover:text-[#e8e8e8] hover:bg-[#1e1e1e]"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50 flex-shrink-0" />
                  <span className="flex-1 truncate">{b.name}</span>
                  <span className="flex items-center gap-1">
                    {b.deadline && <CountdownChip deadline={b.deadline} />}
                    {(b.task_count ?? 0) > 0 && (
                      <span className="text-[10px] text-[#555] group-hover:text-[#777]">
                        {b.task_count}
                      </span>
                    )}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Settings link */}
      <div className="border-t border-[#2e2e2e] p-2">
        <Link
          href="/settings"
          className={`flex items-center gap-2 px-2 py-1.5 rounded-md text-[13px] transition-colors ${
            pathname === "/settings"
              ? "bg-[#7c6af7]/20 text-[#9585ff]"
              : "text-[#666] hover:text-[#e8e8e8] hover:bg-[#1e1e1e]"
          }`}
        >
          <span className="text-[11px] w-4 text-center">⚙</span>
          Settings
        </Link>
      </div>
    </aside>
  );
}
