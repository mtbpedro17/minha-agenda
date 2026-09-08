"use client";

import type { Task } from "@/types/task";
import PriorityBadge from "./PriorityBadge";
import { formatShortDate } from "@/lib/utils/date";
import { Trash2, X, BellRing, BellOff } from "lucide-react";

export default function TaskDetailSheet({
  task,
  onClose,
  onDelete,
}: {
  task: Task;
  onClose: () => void;
  onDelete: (task: Task) => void;
}) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-md rounded-t-3xl bg-surface-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-start justify-between">
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-foreground">
              {task.title}
            </p>
            <div className="mt-1.5 flex items-center gap-3 text-sm text-muted">
              <span>
                {formatShortDate(task.date)} • {task.time}
              </span>
              <PriorityBadge priority={task.priority} />
            </div>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted"
          >
            <X size={20} />
          </button>
        </div>

        {task.description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted">
            {task.description}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2 text-sm text-muted">
          {task.reminderEnabled ? (
            <BellRing size={16} className="text-accent" />
          ) : (
            <BellOff size={16} />
          )}
          {task.reminderEnabled ? "Lembrete ativado" : "Sem lembrete"}
        </div>

        <button
          type="button"
          onClick={() => onDelete(task)}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-priority-high-soft py-3.5 font-medium text-priority-high transition-transform active:scale-[0.98]"
        >
          <Trash2 size={18} />
          Excluir tarefa
        </button>
      </div>
    </div>
  );
}
