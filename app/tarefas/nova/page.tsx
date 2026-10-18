"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import TaskForm, {
  type TaskFormResult,
  type TaskFormValues,
} from "@/components/TaskForm";
import { createTask } from "@/lib/database/tasks";
import { scheduleTaskReminder } from "@/lib/notifications/notifications";
import { nowHHMM, todayISO } from "@/lib/utils/date";
import { ruleFor } from "@/lib/utils/repeat";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * New task screen. Optional `?date=YYYY-MM-DD` pre-fills the date
 * (used by the Agenda's "+ Tarefa" button).
 */
export default function NovaTarefaPage() {
  // useSearchParams requires a <Suspense> boundary in a static export.
  return (
    <Suspense fallback={null}>
      <NovaTarefa />
    </Suspense>
  );
}

function NovaTarefa() {
  const dateParam = useSearchParams().get("date");

  // Computed once on mount so the defaults don't change while typing.
  const [initialValues] = useState<TaskFormValues>(() => ({
    title: "",
    description: "",
    date: dateParam && ISO_DATE.test(dateParam) ? dateParam : todayISO(),
    time: nowHHMM(),
    priority: "MEDIUM",
    reminderEnabled: true,
    reminderOffset: 0,
    repeatKind: null,
  }));

  async function handleSubmit(values: TaskFormValues): Promise<TaskFormResult> {
    // If this throws, the task was not saved and the form shows an error.
    const task = await createTask({
      title: values.title,
      description: values.description || undefined,
      date: values.date,
      time: values.time,
      priority: values.priority,
      reminderEnabled: values.reminderEnabled,
      reminderOffset: values.reminderOffset,
      repeat: ruleFor(values.repeatKind, values.date),
    });

    if (!values.reminderEnabled) return { reminderFailed: false };

    try {
      await scheduleTaskReminder(task);
      return { reminderFailed: false };
    } catch {
      return { reminderFailed: true };
    }
  }

  return (
    <TaskForm
      heading="Nova Tarefa"
      submitLabel="Salvar Tarefa"
      initialValues={initialValues}
      onSubmit={handleSubmit}
    />
  );
}
