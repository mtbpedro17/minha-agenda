"use client";

import type { Task } from "@/types/task";
import PriorityBadge from "./PriorityBadge";
import { Circle, CheckCircle2, Repeat } from "lucide-react";
import { relativeDayLabel, todayISO } from "@/lib/utils/date";

/**
 * One task row: time (and optionally day), title, priority and the
 * complete/reopen circle.
 *
 * `projected`: this card is a FUTURE occurrence of a recurring task shown in
 * the Agenda (the real task is dated earlier). It is dimmed and has no
 * circle, since only the current occurrence can be completed.
 */
export default function TaskCard({
  task,
  onToggle,
  showDate = false,
  projected = false,
}: {
  task: Task;
  onToggle: (task: Task) => void;
  showDate?: boolean;
  projected?: boolean;
}) {
  // Pending tasks from previous days get their date highlighted in red.
  const overdue = !projected && !task.completed && task.date < todayISO();

  return (
    <div
      className={`flex items-center justify-between gap-3 rounded-2xl bg-surface px-4 py-3.5 ${
        projected ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-center gap-3 overflow-hidden">
        <div className="w-14 shrink-0">
          <span className="block text-sm font-medium text-muted">
            {task.time}
          </span>
          {showDate && (
            <span
              className={`block text-xs ${
                overdue ? "text-priority-high" : "text-muted"
              }`}
            >
              {relativeDayLabel(task.date)}
            </span>
          )}
        </div>
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
            <PriorityBadge priority={task.priority} />
            {task.repeat && (
              <span
                className="inline-flex items-center gap-1 text-xs text-muted"
                title="Tarefa que se repete"
              >
                <Repeat size={12} aria-hidden="true" />
                {projected ? "Prevista" : "Repete"}
              </span>
            )}
          </div>
        </div>
      </div>

      {!projected && (
        <button
          type="button"
          aria-label={
            task.completed
              ? "Marcar como pendente"
              : task.repeat
                ? "Concluir e passar para a próxima data"
                : "Marcar como concluída"
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
      )}
    </div>
  );
}
