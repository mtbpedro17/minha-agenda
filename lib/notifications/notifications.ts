import { LocalNotifications } from "@capacitor/local-notifications";
import type { Task } from "@/types/task";
import { PRIORITY_LABEL } from "@/types/task";
import { setTaskNotificationId } from "@/lib/database/tasks";

/** Requests notification permission from the user; call once on app start. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

/**
 * Deterministic notification id derived from the task id, so a given task
 * always maps to the same scheduled notification and can be reliably cancelled.
 */
function notificationIdForTask(taskId: number): number {
  return 100000 + taskId;
}

/** Schedules (or reschedules) the reminder notification for a task. */
export async function scheduleTaskReminder(task: Task): Promise<void> {
  if (!task.reminderEnabled) return;

  const scheduleAt = new Date(`${task.date}T${task.time}:00`);
  if (Number.isNaN(scheduleAt.getTime()) || scheduleAt.getTime() <= Date.now()) {
    // Don't schedule reminders in the past.
    return;
  }

  const notificationId = notificationIdForTask(task.id);

  await LocalNotifications.schedule({
    notifications: [
      {
        id: notificationId,
        title: "Lembrete de tarefa",
        body: `${task.title}\nPrioridade: ${PRIORITY_LABEL[task.priority]}`,
        schedule: { at: scheduleAt, allowWhileIdle: true },
        smallIcon: "ic_stat_reminder",
      },
    ],
  });

  await setTaskNotificationId(task.id, notificationId);
}

/** Cancels the reminder notification associated with a task, if any. */
export async function cancelTaskReminder(task: Task): Promise<void> {
  const notificationId = task.notificationId ?? notificationIdForTask(task.id);
  await LocalNotifications.cancel({ notifications: [{ id: notificationId }] });
  await setTaskNotificationId(task.id, null);
}

/**
 * Keeps the scheduled reminder in sync with the task's current state:
 * reschedules on date/time/reminder changes, cancels when reminder is
 * disabled or the task is completed.
 */
export async function syncTaskReminder(task: Task): Promise<void> {
  if (task.completed || !task.reminderEnabled) {
    await cancelTaskReminder(task);
    return;
  }
  await scheduleTaskReminder(task);
}
