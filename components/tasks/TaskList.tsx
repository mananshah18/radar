"use client";

import useSWR from "swr";
import type { Task } from "@/lib/db";
import { TaskRow } from "./TaskRow";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface Props {
  bucket?: string;       // slug, "all", "focus", "waiting", or "archive"
  showBucket?: boolean;
  subArea?: string | null;
  includeArchive?: boolean;
}

export function TaskList({ bucket, showBucket, subArea, includeArchive }: Props) {
  const isArchive = bucket === "archive" || includeArchive === true;

  const query = new URLSearchParams();
  if (bucket && bucket !== "archive") query.set("bucket", bucket);
  if (isArchive) query.set("includeArchive", "true");

  const { data: tasks = [], isLoading } = useSWR<Task[]>(
    `/api/tasks?${query.toString()}`,
    fetcher,
    { refreshInterval: 5000 }
  );

  const filtered = subArea ? tasks.filter((t) => t.sub_area === subArea) : tasks;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-[#444] text-sm">
        Loading…
      </div>
    );
  }

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-[#333] text-3xl mb-3">{isArchive ? "✓" : "◈"}</p>
        <p className="text-[#555] text-sm">
          {isArchive ? "No completed tasks yet." : "No tasks here. Add one above ↑"}
        </p>
      </div>
    );
  }

  // Group by priority for non-archive views
  if (!isArchive) {
    const groups: Record<string, Task[]> = { P0: [], P1: [], P2: [], P3: [] };
    for (const t of filtered) {
      groups[t.priority].push(t);
    }

    return (
      <div>
        {(["P0", "P1", "P2", "P3"] as const).map((p) => {
          if (!groups[p].length) return null;
          return (
            <div key={p}>
              <div className={`px-6 py-1.5 text-[10px] font-semibold uppercase tracking-widest border-b border-[#1e1e1e] ${
                p === "P0" ? "text-red-500/60 bg-red-500/5"
                : p === "P1" ? "text-orange-500/60 bg-orange-500/5"
                : p === "P2" ? "text-yellow-500/60 bg-yellow-500/5"
                : "text-zinc-600"
              }`}>
                {p} · {groups[p].length} task{groups[p].length !== 1 ? "s" : ""}
              </div>
              {groups[p].map((task) => (
                <TaskRow key={task.id} task={task} showBucket={showBucket} />
              ))}
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div>
      {filtered.map((task) => (
        <TaskRow key={task.id} task={task} showBucket={showBucket} />
      ))}
    </div>
  );
}
