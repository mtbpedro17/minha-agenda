import { getDb, persistWeb } from "./sqlite";
import type { NewTaskInput, Priority, Task, UpdateTaskInput } from "@/types/task";
import { dateAfterCompletion, parseRepeat, serializeRepeat } from "@/lib/utils/repeat";
import { todayISO } from "@/lib/utils/date";

// The SQLite plugin returns generic rows; this shape matches our `tasks` table.
interface TaskRow {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string;
  priority: Priority;
  completed: number;
  reminder_enabled: number;
  notification_id: number | null;
  reminder_offset: number;
  repeat_rule: string | null;
  created_at: string;
  updated_at: string;
}

function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    date: row.date,
    time: row.time,
    priority: row.priority,
    completed: !!row.completed,
    reminderEnabled: !!row.reminder_enabled,
    reminderOffset: row.reminder_offset ?? 0,
    repeat: parseRepeat(row.repeat_rule),
    notificationId: row.notification_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.run(
    `INSERT INTO tasks
      (title, description, date, time, priority, completed, reminder_enabled, reminder_offset, repeat_rule, notification_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NULL, ?, ?)`,
    [
      input.title,
      input.description ?? null,
      input.date,
      input.time,
      input.priority,
      input.reminderEnabled ? 1 : 0,
      input.reminderOffset ?? 0,
      serializeRepeat(input.repeat ?? null),
      now,
      now,
    ]
  );

  const id = result.changes?.lastId;
  if (id === undefined || id === null) {
    throw new Error("Falha ao criar tarefa: id não retornado pelo SQLite.");
  }

  await persistWeb();
  const created = await getTaskById(id);
  if (!created) throw new Error("Tarefa criada mas não encontrada.");
  return created;
}

export async function getTaskById(id: number): Promise<Task | null> {
  const db = await getDb();
  const result = await db.query("SELECT * FROM tasks WHERE id = ?", [id]);
  const row = result.values?.[0] as TaskRow | undefined;
  return row ? rowToTask(row) : null;
}

export async function listTasks(): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM tasks ORDER BY date ASC, time ASC"
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}

export async function listTasksByDate(date: string): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM tasks WHERE date = ? ORDER BY time ASC",
    [date]
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}

export async function listUpcomingTasks(
  fromDate: string,
  limit = 3
): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM tasks
     WHERE completed = 0 AND date >= ?
     ORDER BY date ASC, time ASC
     LIMIT ?`,
    [fromDate, limit]
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}

/** Distinct dates (YYYY-MM-DD) between `start` and `end` (inclusive) that have tasks. */
export async function listTaskDatesBetween(
  start: string,
  end: string
): Promise<string[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT DISTINCT date FROM tasks WHERE date BETWEEN ? AND ?",
    [start, end]
  );
  return ((result.values as { date: string }[] | undefined) ?? []).map(
    (r) => r.date
  );
}

/** Pending tasks from days before `today` (oldest first). */
export async function listOverdueTasks(today: string): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM tasks
     WHERE completed = 0 AND date < ?
     ORDER BY date ASC, time ASC`,
    [today]
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}

export async function updateTask(
  id: number,
  input: UpdateTaskInput
): Promise<Task> {
  const db = await getDb();
  const existing = await getTaskById(id);
  if (!existing) throw new Error("Tarefa não encontrada.");

  const merged = {
    title: input.title ?? existing.title,
    description:
      input.description !== undefined ? input.description : existing.description,
    date: input.date ?? existing.date,
    time: input.time ?? existing.time,
    priority: input.priority ?? existing.priority,
    completed: input.completed ?? existing.completed,
    reminderEnabled: input.reminderEnabled ?? existing.reminderEnabled,
    reminderOffset: input.reminderOffset ?? existing.reminderOffset,
    repeat: input.repeat !== undefined ? input.repeat : existing.repeat,
  };

  const now = new Date().toISOString();

  await db.run(
    `UPDATE tasks SET
      title = ?, description = ?, date = ?, time = ?, priority = ?,
      completed = ?, reminder_enabled = ?, reminder_offset = ?, repeat_rule = ?, updated_at = ?
     WHERE id = ?`,
    [
      merged.title,
      merged.description,
      merged.date,
      merged.time,
      merged.priority,
      merged.completed ? 1 : 0,
      merged.reminderEnabled ? 1 : 0,
      merged.reminderOffset,
      serializeRepeat(merged.repeat),
      now,
      id,
    ]
  );

  await persistWeb();
  const updated = await getTaskById(id);
  if (!updated) throw new Error("Tarefa atualizada mas não encontrada.");
  return updated;
}

export async function setTaskNotificationId(
  id: number,
  notificationId: number | null
): Promise<void> {
  const db = await getDb();
  await db.run("UPDATE tasks SET notification_id = ? WHERE id = ?", [
    notificationId,
    id,
  ]);
  await persistWeb();
}

/**
 * Marks a task as done (or pending again).
 *
 * Recurring tasks are never marked done: completing one moves its date to
 * the next occurrence (today or later) and it stays pending. To stop a
 * recurring task, edit it to "Não repete" (or delete it).
 */
export async function toggleTaskCompleted(id: number): Promise<Task> {
  const existing = await getTaskById(id);
  if (!existing) throw new Error("Tarefa não encontrada.");
  if (existing.repeat && !existing.completed) {
    return updateTask(id, {
      date: dateAfterCompletion(existing.repeat, existing.date, todayISO()),
    });
  }
  return updateTask(id, { completed: !existing.completed });
}

/**
 * Pending tasks that may still need a reminder: reminder on, not completed,
 * and either recurring or dated today or later.
 */
export async function listTasksNeedingReminders(today: string): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    `SELECT * FROM tasks
     WHERE completed = 0 AND reminder_enabled = 1
       AND (repeat_rule IS NOT NULL OR date >= ?)`,
    [today]
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}

/** Pending recurring tasks (used to project future occurrences in the Agenda). */
export async function listRecurringTasks(): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM tasks WHERE completed = 0 AND repeat_rule IS NOT NULL ORDER BY time ASC"
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}

export async function deleteTask(id: number): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM tasks WHERE id = ?", [id]);
  await persistWeb();
}

export interface TaskSummary {
  urgent: number; // pending, high priority
  pending: number;
  completed: number;
}

export async function getTodaySummary(today: string): Promise<TaskSummary> {
  const tasks = await listTasksByDate(today);
  return {
    urgent: tasks.filter((t) => !t.completed && t.priority === "HIGH").length,
    pending: tasks.filter((t) => !t.completed).length,
    completed: tasks.filter((t) => t.completed).length,
  };
}
