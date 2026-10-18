import { getDb, persistWeb } from "./sqlite";
import type { Priority } from "@/types/task";

export interface ReplaceTaskRow {
  id: number;
  title: string;
  description: string | null;
  date: string;
  time: string;
  priority: Priority;
  completed: boolean;
  reminderEnabled: boolean;
  reminderOffset: number;
  /** Stored text of the repetition rule ("DAILY", "MONTHLY:31"…) or null. */
  repeat: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReplaceNoteRow {
  id: number;
  title: string;
  content: string;
  date: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Replaces ALL tasks, notes and settings with the given data, keeping the
 * original ids, in ONE transaction: if any statement fails, nothing changes.
 *
 * Settings whose key is in `keepSettingKeys` are left untouched (device-only
 * values such as the last export date). `notification_id` is reset to NULL;
 * reminders must be scheduled again by the caller.
 */
export async function replaceAllData(
  data: {
    tasks: ReplaceTaskRow[];
    notes: ReplaceNoteRow[];
    settings: { key: string; value: string }[];
  },
  keepSettingKeys: string[] = []
): Promise<void> {
  const db = await getDb();

  const set: { statement: string; values: unknown[] }[] = [
    { statement: "DELETE FROM tasks;", values: [] },
    { statement: "DELETE FROM notes;", values: [] },
    keepSettingKeys.length > 0
      ? {
          statement: `DELETE FROM settings WHERE key NOT IN (${keepSettingKeys
            .map(() => "?")
            .join(", ")});`,
          values: keepSettingKeys,
        }
      : { statement: "DELETE FROM settings;", values: [] },
  ];

  for (const t of data.tasks) {
    set.push({
      statement: `INSERT INTO tasks
        (id, title, description, date, time, priority, completed, reminder_enabled,
         reminder_offset, repeat_rule, notification_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?);`,
      values: [
        t.id, t.title, t.description, t.date, t.time, t.priority,
        t.completed ? 1 : 0, t.reminderEnabled ? 1 : 0, t.reminderOffset,
        t.repeat, t.createdAt, t.updatedAt,
      ],
    });
  }
  for (const n of data.notes) {
    set.push({
      statement: `INSERT INTO notes (id, title, content, date, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?);`,
      values: [n.id, n.title, n.content, n.date, n.createdAt, n.updatedAt],
    });
  }
  for (const s of data.settings) {
    set.push({
      statement: "INSERT INTO settings (key, value) VALUES (?, ?);",
      values: [s.key, s.value],
    });
  }

  await db.executeSet(set, true);
  await persistWeb();
}
