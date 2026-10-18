"use client";

import { useState } from "react";
import type { Task } from "@/types/task";
import ConfirmDialog from "./ConfirmDialog";
import { useBackHandler } from "@/lib/navigation/backButton";
import PriorityBadge from "./PriorityBadge";
import { formatShortDate } from "@/lib/utils/date";
import { reminderOffsetLabel } from "@/types/task";
import { Trash2, X, BellRing, BellOff, Pencil, Repeat } from "lucide-react";
import { repeatLabel } from "@/lib/utils/repeat";

export default function TaskDetailSheet({
  task,
  onClose,
  onDelete,
  onEdit,
}: {
  task: Task;
  onClose: () => void;
  onDelete: (task: Task) => void;
  onEdit: (task: Task) => void;
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // Android back button / Escape closes the sheet.
  useBackHandler(true, onClose);

  return (
    <div
      className="fixed inset-0 z-30 flex items-end justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl bg-surface-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
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

        {task.repeat && (
          <div className="mt-4 flex items-center gap-2 text-sm text-muted">
            <Repeat size={16} className="text-accent" />
            {repeatLabel(task.repeat, task.date)}
          </div>
        )}

        <div
          className={`${task.repeat ? "mt-2" : "mt-4"} flex items-center gap-2 text-sm text-muted`}
        >
          {task.reminderEnabled ? (
            <BellRing size={16} className="text-accent" />
          ) : (
            <BellOff size={16} />
          )}
          {task.reminderEnabled
            ? `Lembrete: ${reminderOffsetLabel(task.reminderOffset).toLowerCase()}`
            : "Sem lembrete"}
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setConfirmingDelete(true)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-priority-high-soft py-3.5 font-medium text-priority-high transition-transform active:scale-[0.98]"
          >
            <Trash2 size={18} />
            Excluir
          </button>
          <button
            type="button"
            onClick={() => onEdit(task)}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-3.5 font-medium text-white transition-transform active:scale-[0.98]"
          >
            <Pencil size={18} />
            Editar
          </button>
        </div>
      </div>

      {confirmingDelete && (
        <ConfirmDialog
          title="Excluir tarefa?"
          message={
            task.repeat
              ? `"${task.title}" e todas as próximas repetições serão excluídas, e os lembretes cancelados. Isso não pode ser desfeito.`
              : `"${task.title}" será excluída e o lembrete cancelado. Isso não pode ser desfeito.`
          }
          onCancel={() => setConfirmingDelete(false)}
          onConfirm={() => {
            setConfirmingDelete(false);
            onDelete(task);
          }}
        />
      )}
    </div>
  );
}
