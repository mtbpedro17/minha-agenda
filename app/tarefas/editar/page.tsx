"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import TaskForm, {
  type TaskFormResult,
  type TaskFormValues,
} from "@/components/TaskForm";
import type { Task } from "@/types/task";
import { getTaskById, updateTask } from "@/lib/database/tasks";
import { ruleFor } from "@/lib/utils/repeat";
import {
  cancelTaskReminder,
  syncTaskReminder,
} from "@/lib/notifications/notifications";

/**
 * Edit screen: /tarefas/editar?id=123
 *
 * Uses a query parameter instead of a dynamic route (/tarefas/[id]) because
 * the app is a static export: dynamic routes would need every id at build time.
 */
export default function EditarTarefaPage() {
  // useSearchParams requires a <Suspense> boundary in a static export.
  return (
    <Suspense fallback={null}>
      <EditarTarefa />
    </Suspense>
  );
}

function EditarTarefa() {
  const router = useRouter();
  const id = Number(useSearchParams().get("id"));
  const [task, setTask] = useState<Task | null>(null);

  useEffect(() => {
    getTaskById(id).then((found) => {
      if (!found) {
        router.replace("/tarefas");
        return;
      }
      setTask(found);
    });
  }, [id, router]);

  if (!task) return null;

  async function handleSubmit(values: TaskFormValues): Promise<TaskFormResult> {
    if (!task) throw new Error("Tarefa não carregada.");

    // If this throws, nothing was saved and the form shows an error.
    const updated = await updateTask(task.id, {
      title: values.title,
      description: values.description || null,
      date: values.date,
      time: values.time,
      priority: values.priority,
      reminderEnabled: values.reminderEnabled,
      reminderOffset: values.reminderOffset,
      repeat: ruleFor(values.repeatKind, values.date),
    });

    // Nothing to do if there was no reminder before and none is wanted now.
    const hadReminder = task.reminderEnabled || task.notificationId !== null;
    if (!hadReminder && !updated.reminderEnabled) return { reminderFailed: false };

    try {
      // Cancel first: if the new time is in the past, scheduleTaskReminder
      // schedules nothing and the old reminder would otherwise still fire.
      await cancelTaskReminder(updated);
      await syncTaskReminder(updated);
      return { reminderFailed: false };
    } catch {
      return { reminderFailed: true };
    }
  }

  return (
    <TaskForm
      key={task.id}
      heading="Editar Tarefa"
      submitLabel="Salvar alterações"
      initialValues={{
        title: task.title,
        description: task.description ?? "",
        date: task.date,
        time: task.time,
        priority: task.priority,
        reminderEnabled: task.reminderEnabled,
        reminderOffset: task.reminderOffset,
        repeatKind: task.repeat?.kind ?? null,
      }}
      onSubmit={handleSubmit}
    />
  );
}
