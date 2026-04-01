"use client";

import { useState, useEffect, useRef } from "react";
import { mutate } from "swr";
import type { Task } from "@/types/app";
import { TaskDetail } from "./TaskDetail";

interface Props {
  task: Task;
  priorityColor: string;
}

type DoneAnim = "none" | "particles" | "stamp" | "strike" | "exit";

function revalidate() {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"),
    undefined,
    { revalidate: true }
  );
}

function removeFromCache(taskId: string) {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"),
    (current: Task[] | undefined) => current?.filter((t) => t.id !== taskId),
    { revalidate: true }
  );
}

function optimisticUpdate(updater: (tasks: Task[]) => Task[]) {
  mutate(
    (key: unknown) => typeof key === "string" && key.startsWith("/api/tasks"),
    (current: Task[] | undefined) => current ? updater(current) : current,
    { revalidate: false }
  );
}

function pickAnim(): "particles" | "stamp" | "strike" {
  const r = Math.random();
  if (r < 0.333) return "particles";
  if (r < 0.666) return "stamp";
  return "strike";
}

/* ── Animation 1: Particle burst ───────────────────────── */
function ParticleBurst({ color }: { color: string }) {
  const particles = Array.from({ length: 8 }, (_, i) => {
    const angle    = (i / 8) * 360 + (Math.random() * 30 - 15);
    const distance = 22 + Math.random() * 16;
    const rad      = (angle * Math.PI) / 180;
    return {
      tx:    Math.cos(rad) * distance,
      ty:    Math.sin(rad) * distance,
      delay: Math.random() * 60,
      size:  3 + Math.random() * 2,
    };
  });

  return (
    <div style={{ position: "absolute", left: 18, top: 14, pointerEvents: "none", zIndex: 10 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position:              "absolute",
            width:                 p.size,
            height:                p.size,
            borderRadius:          "50%",
            background:            color,
            animationName:         "particleFly",
            animationDuration:     "500ms",
            animationDelay:        `${p.delay}ms`,
            animationTimingFunction: "ease-out",
            animationFillMode:     "forwards",
            "--tx":                `${p.tx}px`,
            "--ty":                `${p.ty}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}

/* ── Animation 2: Ink stamp ────────────────────────────── */
function InkStamp({ rotation }: { rotation: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 10 }}>
      <div
        style={{
          fontFamily:              "var(--font-dm-serif)",
          fontSize:                "20px",
          letterSpacing:           "0.18em",
          color:                   "var(--stamp-blue)",
          border:                  "2px solid var(--stamp-blue)",
          padding:                 "2px 14px",
          animationName:           "stampIn",
          animationDuration:       "680ms",
          animationTimingFunction: "ease-out",
          animationFillMode:       "forwards",
          "--rot":                 `${rotation}deg`,
          opacity:                 0,
        } as React.CSSProperties}
      >
        DONE
      </div>
    </div>
  );
}

/* ── Main component ────────────────────────────────────── */
export function BoardCard({ task, priorityColor }: Props) {
  const [expanded,    setExpanded]    = useState(false);
  const [completing,  setCompleting]  = useState(false);
  const [deleting,    setDeleting]    = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [doneAnim,    setDoneAnim]    = useState<DoneAnim>("none");
  // Local checked state so checkbox fills immediately without optimistic SWR update
  const [checkedLocal, setCheckedLocal] = useState(false);

  const stampRotation = useRef(Math.floor(Math.random() * 9) - 4);
  const timersRef     = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  function schedule(fn: () => void, ms: number) {
    timersRef.current.push(setTimeout(fn, ms));
  }

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation();
    if (completing) return;
    setCompleting(true);
    setError(null);
    const markingDone = task.status !== "Done";

    if (markingDone) {
      // Show checkbox as checked immediately (local state — no SWR update so card stays mounted)
      setCheckedLocal(true);

      const animsEnabled = typeof window !== "undefined"
        ? localStorage.getItem("radar_animations") !== "off"
        : true;

      if (animsEnabled) {
        const anim   = pickAnim();
        const holdMs = anim === "particles" ? 380 : anim === "stamp" ? 460 : 290;
        setDoneAnim(anim);
        schedule(() => setDoneAnim("exit"), holdMs);
        schedule(() => removeFromCache(task.id), holdMs + 380);
      } else {
        setDoneAnim("exit");
        schedule(() => removeFromCache(task.id), 500);
      }
    }

    try {
      const res = await fetch(`/api/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ status: markingDone ? "Done" : "Todo" }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({})) as { error?: string };
        setError(d.error ?? "Failed to update task");
        setCheckedLocal(false);
        setDoneAnim("none");
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
        revalidate(); // roll back both mark-done and mark-undone failures
      } else if (!markingDone) {
        // Optimistically restore task to active
        optimisticUpdate((tasks) =>
          tasks.map((t) => t.id === task.id ? { ...t, status: "Todo" } : t)
        );
      }
    } finally {
      setCompleting(false);
    }
  }

  async function deleteTask(e: React.MouseEvent) {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    optimisticUpdate((tasks) => tasks.filter((t) => t.id !== task.id));
    try {
      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
      if (!res.ok) revalidate();
    } finally {
      setDeleting(false);
    }
  }

  const isDone    = task.status === "Done" || checkedLocal;
  const isOverdue = !isDone && task.dueDate && new Date(task.dueDate) < new Date();

  const metaParts: { text: string; color?: string }[] = [];
  if (task.subcategory?.name)        metaParts.push({ text: task.subcategory.name });
  else if (task.category?.name)      metaParts.push({ text: task.category.name });
  if (task.status === "In Progress") metaParts.push({ text: "in progress", color: "var(--stamp-blue)" });
  if (task.status === "Waiting On")  metaParts.push({ text: `waiting · ${task.waitingOn || "someone"}`, color: "var(--stamp-amber)" });
  if (isOverdue && task.dueDate)     metaParts.push({ text: "overdue", color: "var(--stamp-red)" });
  else if (task.dueDate && !isDone)  metaParts.push({ text: new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) });

  // Strike animation suppresses CSS line-through so we can animate it instead
  const showCssStrike = isDone && doneAnim !== "strike";

  const cardStyle: React.CSSProperties = doneAnim === "exit"
    ? { opacity: 0, transform: "translateY(-6px) scale(0.97)", transition: "opacity 0.35s ease-out, transform 0.35s ease-out", pointerEvents: "none", position: "relative" }
    : { transition: "opacity 0.35s ease-out, transform 0.35s ease-out", position: "relative" };

  return (
    <div
      className="board-card group"
      onClick={() => setExpanded((p) => !p)}
      style={cardStyle}
    >
      {/* Anim 1: particles */}
      {doneAnim === "particles" && <ParticleBurst color={priorityColor} />}

      {/* Anim 2: stamp */}
      {doneAnim === "stamp" && <InkStamp rotation={stampRotation.current} />}

      <div className="board-card-inner">
        <div className="flex items-start gap-2">

          {/* Priority dot */}
          <div
            className="flex-shrink-0 mt-[5px]"
            style={{ width: "8px", height: "8px", borderRadius: "50%", background: priorityColor }}
          />

          {/* Checkbox */}
          <button
            onClick={toggleDone}
            disabled={completing}
            className="mt-[2px] flex-shrink-0 w-[15px] h-[15px] transition-all flex items-center justify-center"
            style={{
              border:       `1.5px solid ${isDone ? priorityColor : "var(--border-ink)"}`,
              borderRadius: "2px",
              background:   isDone ? priorityColor : "transparent",
            }}
          >
            {isDone && (
              <svg className="check-animate" width="8" height="8" viewBox="0 0 9 9" fill="none">
                <path d="M1.5 4.5l2 2 4-4" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>

          {/* Title */}
          <p
            className={`flex-1 leading-snug ${showCssStrike ? "line-through" : ""}`}
            style={{
              position:   "relative",
              fontFamily: "var(--font-inter, 'Inter', system-ui, sans-serif)",
              fontSize:   "15px",
              fontWeight: 450,
              color:      isDone ? "var(--ink-ghost)" : isOverdue ? "var(--stamp-red)" : "var(--ink)",
            }}
          >
            {task.title}
            {/* Anim 3: animated strikethrough line */}
            {doneAnim === "strike" && (
              <span
                style={{
                  position:                "absolute",
                  left:                    0,
                  top:                     "50%",
                  height:                  "1.5px",
                  background:              "var(--ink-ghost)",
                  animationName:           "strikethrough",
                  animationDuration:       "320ms",
                  animationTimingFunction: "ease-out",
                  animationFillMode:       "forwards",
                  width:                   0,
                }}
              />
            )}
          </p>

          {/* Delete */}
          <button
            onClick={deleteTask}
            disabled={deleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 w-4 h-4 flex items-center justify-center"
            style={{ fontSize: "16px", color: "var(--ink-ghost)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {metaParts.length > 0 && (
          <p className="mt-1.5 pl-[23px]" style={{ fontSize: "12px", color: "var(--ink-ghost)" }}>
            {metaParts.map((part, i) => (
              <span key={i}>
                {i > 0 && <span style={{ margin: "0 4px", opacity: 0.5 }}>·</span>}
                <span style={part.color ? { color: part.color } : undefined}>{part.text}</span>
              </span>
            ))}
          </p>
        )}

        {error && (
          <p className="mt-1 pl-[23px]" style={{ fontSize: "11px", color: "var(--stamp-red)" }}>
            {error}
          </p>
        )}
      </div>

      {expanded && (
        <div onClick={(e) => e.stopPropagation()} style={{ borderTop: "1px solid var(--border-ink)" }}>
          <TaskDetail task={task} onClose={() => setExpanded(false)} />
        </div>
      )}
    </div>
  );
}
