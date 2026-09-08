"use client";

import type { Task } from "@/types/task";
import PriorityBadge from "./PriorityBadge";
import { Circle, CheckCircle2 } from "lucide-react";

export default function TaskCard({
  task,
  onToggle,
  showDate = false,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  showDate?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3.5">
      <div className="flex items-center gap-3 overflow-hidden">
        <span className="w-14 shrink-0 text-sm font-medium text-muted">
          {task.time}
        </span>
        <div className="min-w-0">
          <p
            className={`truncate font-medium ${
              task.completed
                ? "text-muted line-through"
                : "text-foreground"
            }`}
          >
            {task.title}
          </p>
          <div className="mt-0.5 flex items-center gap-2">
            {showDate && (
              <span className="text-xs text-muted">{task.date}</span>
            )}
            <PriorityBadge priority={task.priority} />
          </div>
        </div>
      </div>

      <button
        type="button"
        aria-label={
          task.completed ? "Marcar como pendente" : "Marcar como concluída"
        }
        onClick={(e) => {
          e.stopPropagation();
          onToggle(task);
        }}
        className="shrink-0 text-muted transition-colors active:scale-95"
      >
        {task.completed ? (
          <CheckCircle2 size={24} className="text-accent" />
        ) : (
          <Circle size={24} />
        )}
      </button>
    </div>
  );
}
