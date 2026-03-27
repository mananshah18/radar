"use client";

import { useState } from "react";
import { mutate } from "swr";

interface Props {
  title: string;
  subtitle?: string;
  bucketSlug?: string;
  taskCount?: number;
}

export function TopBar({ title, subtitle, bucketSlug, taskCount }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  async function syncSlack() {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/slack/poll");
      const data = await res.json();
      if (data.error) {
        setSyncMsg(`Error: ${data.error}`);
      } else {
        setSyncMsg(`${data.imported} task${data.imported !== 1 ? "s" : ""} imported`);
        mutate((key: string) => typeof key === "string" && (key.startsWith("/api/tasks") || key.startsWith("/api/buckets")), undefined, { revalidate: true });
      }
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(null), 3000);
    }
  }

  return (
    <div className="px-6 py-4 border-b border-[#2e2e2e] flex items-center justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-[#e8e8e8]">{title}</h2>
        {subtitle && <p className="text-[11px] text-[#555] mt-0.5">{subtitle}</p>}
        {typeof taskCount === "number" && (
          <p className="text-[11px] text-[#555] mt-0.5">{taskCount} active task{taskCount !== 1 ? "s" : ""}</p>
        )}
      </div>

      <div className="flex items-center gap-2">
        {syncMsg && (
          <span className="text-[11px] text-[#7c6af7]">{syncMsg}</span>
        )}
        <button
          onClick={syncSlack}
          disabled={syncing}
          title="Import unread messages from your Slack tasks channel"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1e1e1e] hover:bg-[#2a2a2a] border border-[#2e2e2e] text-[#777] hover:text-[#e8e8e8] text-[12px] rounded-lg transition-colors disabled:opacity-40"
        >
          <span>⚡</span>
          {syncing ? "Syncing…" : "Sync Slack"}
        </button>
      </div>
    </div>
  );
}
