import { LocalNotifications } from "@capacitor/local-notifications";
import type { Task } from "@/types/task";
import { PRIORITY_LABEL } from "@/types/task";
import {
  listTasksNeedingReminders,
  setTaskNotificationId,
} from "@/lib/database/tasks";
import { relativeDayLabel, toISODate, todayISO } from "@/lib/utils/date";
import {
  getReminderChannelId,
  setReminderChannel,
  type SoundPrefs,
} from "./sound";
import { nextOccurrence } from "@/lib/utils/repeat";

/** Requests notification permission from the user; call once on app start. */
export async function ensureNotificationPermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions();
  if (current.display === "granted") return true;

  const requested = await LocalNotifications.requestPermissions();
  return requested.display === "granted";
}

/**
 * How many upcoming occurrences of a recurring task get a reminder scheduled
 * in advance, so reminders keep firing even if the app isn't opened for days.
 * They are renewed on every app start (refreshAllReminders) and every
 * time the task changes. Android allows ~500 pending alarms per app, so keep
 * this small.
 */
export const RECURRING_REMINDERS_AHEAD = 14;

/**
 * Deterministic notification ids, so a task's reminders can always be
 * replaced or cancelled without storing every id:
 * - occurrence 0 (the current one, and every non-recurring task): 100000 + id
 * - occurrences 1..15 of a recurring task: 1000000 + id * 16 + k
 * Ranges don't overlap while task ids stay below 900000.
 */
export function notificationIdFor(taskId: number, occurrence = 0): number {
  return occurrence === 0 ? 100000 + taskId : 1_000_000 + taskId * 16 + occurrence;
}

function allNotificationIdsFor(taskId: number): number[] {
  return Array.from({ length: 16 }, (_, k) => notificationIdFor(taskId, k));
}

/**
 * When should the reminder for `task` fire?
 *
 * - `null` if the task time is invalid or already passed (nothing to remind).
 * - Normally: task time minus `reminderOffset` minutes.
 * - If that moment already passed but the task itself is still in the future
 *   (e.g. task in 10 min with "15 min antes"), falls back to the task time
 *   so the user still gets a reminder.
 *
 * Pure function (no plugin calls) so it can be unit-tested.
 */
export function reminderTimeFor(
  task: Pick<Task, "date" | "time" | "reminderOffset">,
  now: number = Date.now()
): { at: Date; early: boolean } | null {
  const taskAt = new Date(`${task.date}T${task.time}:00`);
  if (Number.isNaN(taskAt.getTime()) || taskAt.getTime() <= now) return null;

  const offsetMs = Math.max(0, task.reminderOffset ?? 0) * 60_000;
  const earlyAt = new Date(taskAt.getTime() - offsetMs);
  if (offsetMs > 0 && earlyAt.getTime() > now) {
    return { at: earlyAt, early: true };
  }
  return { at: taskAt, early: false };
}

/** Notification text. Early reminders say when the task starts. */
function reminderBody(task: Task, at: Date, early: boolean): string {
  const priority = `Prioridade: ${PRIORITY_LABEL[task.priority]}`;
  if (!early) return `${task.title}\n${priority}`;

  const day = relativeDayLabel(task.date, toISODate(at));
  const when =
    day === "Hoje" || day === "Amanhã" ? day.toLowerCase() : `em ${day}`;
  return `${task.title}\nComeça ${when} às ${task.time} · ${priority}`;
}

/**
 * Reminders that should exist for a task right now: one for a normal task,
 * or up to RECURRING_REMINDERS_AHEAD (current + next occurrences, skipping
 * ones already in the past) for a recurring task. Pure, for unit tests.
 */
export function plannedReminders(
  task: Pick<Task, "date" | "time" | "reminderOffset" | "repeat">,
  now: number = Date.now()
): { date: string; at: Date; early: boolean }[] {
  if (!task.repeat) {
    const when = reminderTimeFor(task, now);
    return when ? [{ date: task.date, ...when }] : [];
  }
  const planned: { date: string; at: Date; early: boolean }[] = [];
  let date = task.date;
  // Walk occurrences from the current one; overdue ones produce no reminder.
  for (let guard = 0; planned.length < RECURRING_REMINDERS_AHEAD && guard < 500; guard++) {
    const when = reminderTimeFor({ ...task, date }, now);
    if (when) planned.push({ date, ...when });
    date = nextOccurrence(task.repeat, task.date, date);
  }
  return planned;
}

/** Schedules (or reschedules) the reminder notification(s) for a task. */
export async function scheduleTaskReminder(task: Task): Promise<void> {
  if (!task.reminderEnabled) return;

  const planned = plannedReminders(task);
  if (planned.length === 0) return; // Task (and occurrences) in the past.

  if (task.repeat) {
    // The set of occurrences shifts when the task advances: start clean.
    await LocalNotifications.cancel({
      notifications: allNotificationIdsFor(task.id).map((id) => ({ id })),
    });
  }

  // Sound/vibration come from the channel (see lib/notifications/sound.ts).
  const channelId = await getReminderChannelId();

  await LocalNotifications.schedule({
    notifications: planned.map((p, k) => ({
      id: notificationIdFor(task.id, k),
      title: "Lembrete de tarefa",
      body: reminderBody({ ...task, date: p.date }, p.at, p.early),
      schedule: { at: p.at, allowWhileIdle: true },
      smallIcon: "ic_stat_reminder",
      channelId,
    })),
  });

  await setTaskNotificationId(task.id, notificationIdFor(task.id));
}

/** Cancels every reminder of a task (all occurrences, if recurring). */
export async function cancelTaskReminder(task: Task): Promise<void> {
  await LocalNotifications.cancel({
    notifications: allNotificationIdsFor(task.id).map((id) => ({ id })),
  });
  await setTaskNotificationId(task.id, null);
}

/**
 * Re-schedules the reminders of every task that may still need one
 * (pending, reminder on, recurring or dated today/later). Used:
 * - on app start (Android), so recurring tasks keep their "next 14
 *   occurrences" window and every reminder uses the current channel;
 * - after the user changes the notification sound.
 * Returns how many tasks failed (e.g. notifications blocked).
 */
export async function refreshAllReminders(): Promise<number> {
  const tasks = await listTasksNeedingReminders(todayISO());
  let failures = 0;
  for (const task of tasks) {
    try {
      await scheduleTaskReminder(task);
    } catch {
      failures++;
    }
  }
  return failures;
}

/** Changes the notification sound/vibration and moves pending reminders to it. */
export async function applyReminderSound(prefs: SoundPrefs): Promise<number> {
  await setReminderChannel(prefs);
  return refreshAllReminders();
}

/** Id reserved for the "send a test notification" button (below 100000). */
const TEST_NOTIFICATION_ID = 99_001;

/** Shows a sample reminder in `seconds`, with the current sound settings. */
export async function sendTestNotification(seconds = 3): Promise<void> {
  const channelId = await getReminderChannelId();
  await LocalNotifications.schedule({
    notifications: [
      {
        id: TEST_NOTIFICATION_ID,
        title: "Lembrete de tarefa",
        body: "Este é um teste do som de notificação 🔔",
        schedule: { at: new Date(Date.now() + seconds * 1000), allowWhileIdle: true },
        smallIcon: "ic_stat_reminder",
        channelId,
      },
    ],
  });
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
