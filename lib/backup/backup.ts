import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import {
  replaceAllData,
  type ReplaceNoteRow,
  type ReplaceTaskRow,
} from "@/lib/database/replaceAll";
import { listTasks } from "@/lib/database/tasks";
import { listAllNotes } from "@/lib/database/notes";
import { listSettings, setSetting } from "@/lib/database/settings";
import {
  cancelTaskReminder,
  scheduleTaskReminder,
} from "@/lib/notifications/notifications";
import type { Priority } from "@/types/task";
import { parseRepeat, serializeRepeat } from "@/lib/utils/repeat";

/**
 * Backup = one JSON file with every task, note and setting.
 *
 * The app has no cloud backup (android:allowBackup="false"), so this file is
 * the only way to move data to another phone or keep a safety copy. The user
 * decides where to keep it (Drive, WhatsApp, e-mail, computer…).
 *
 * Bump BACKUP_FORMAT only for incompatible changes, and keep parseBackup()
 * able to read every older format.
 */
export const BACKUP_FORMAT = 1;
const APP_ID = "minha-agenda";

/** Setting keys that describe this device and must not travel in a backup. */
export const LAST_EXPORT_KEY = "last_export_at";
const LOCAL_ONLY_SETTINGS = new Set([
  LAST_EXPORT_KEY,
  // Security and sound belong to the phone, not to the data: restoring a
  // backup on a phone without biometry must not lock the user out, and the
  // sound channel must be created on each device.
  "app_lock_enabled",
  "notification_sound",
  "notification_vibrate",
]);

/** Task as stored in the backup file (no device-specific notification id). */
export type BackupTask = ReplaceTaskRow;
/** Note as stored in the backup file. */
export type BackupNote = ReplaceNoteRow;

export interface BackupFile {
  app: typeof APP_ID;
  format: number;
  exportedAt: string;
  tasks: BackupTask[];
  notes: BackupNote[];
  settings: { key: string; value: string }[];
}

/** Error with a message that can be shown to the user as-is. */
export class BackupError extends Error {}

// ---------------------------------------------------------------- export

export async function buildBackup(): Promise<BackupFile> {
  const [tasks, notes, settings] = await Promise.all([
    listTasks(),
    listAllNotes(),
    listSettings(),
  ]);
  return {
    app: APP_ID,
    format: BACKUP_FORMAT,
    exportedAt: new Date().toISOString(),
    // notification_id is device-specific, so it is not exported.
    tasks: tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      date: t.date,
      time: t.time,
      priority: t.priority,
      completed: t.completed,
      reminderEnabled: t.reminderEnabled,
      reminderOffset: t.reminderOffset,
      repeat: serializeRepeat(t.repeat),
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    })),
    notes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      content: n.content,
      date: n.date,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    })),
    settings: settings.filter((s) => !LOCAL_ONLY_SETTINGS.has(s.key)),
  };
}

export function backupFileName(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `minha-agenda-backup-${date.getFullYear()}-${pad(
    date.getMonth() + 1
  )}-${pad(date.getDate())}.json`;
}

/**
 * Creates the backup file and hands it to the user:
 * - Android: saves it in the app cache and opens the share sheet
 *   (Drive, WhatsApp, e-mail, "Salvar em arquivos"…).
 * - Browser: downloads it.
 *
 * Returns false if the user closed the share sheet without choosing anything.
 */
export async function exportBackup(): Promise<boolean> {
  const backup = await buildBackup();
  const json = JSON.stringify(backup, null, 2);
  const fileName = backupFileName();

  if (Capacitor.isNativePlatform()) {
    const { uri } = await Filesystem.writeFile({
      path: fileName,
      data: json,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
    });
    try {
      await Share.share({
        title: "Backup do Minha Agenda",
        dialogTitle: "Salvar backup em…",
        files: [uri],
      });
    } catch (e) {
      // Closing the share sheet rejects with "Share canceled".
      if (String(e).toLowerCase().includes("cancel")) return false;
      throw e;
    }
  } else {
    const url = URL.createObjectURL(
      new Blob([json], { type: "application/json" })
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  await setSetting(LAST_EXPORT_KEY, backup.exportedAt);
  return true;
}

// ---------------------------------------------------------------- import

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;
const PRIORITIES: Priority[] = ["HIGH", "MEDIUM", "LOW"];

function fail(message: string): never {
  throw new BackupError(message);
}

const isObj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isStr = (v: unknown): v is string => typeof v === "string";
const isId = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v > 0;

/**
 * Reads and validates a backup file's text. Throws BackupError with a
 * user-facing message if anything is wrong; nothing is written here.
 */
export function parseBackup(text: string): BackupFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    fail("Este arquivo não é um backup válido (não é um JSON).");
  }
  if (!isObj(raw) || raw.app !== APP_ID) {
    fail("Este arquivo não é um backup do Minha Agenda.");
  }
  if (typeof raw.format !== "number" || raw.format > BACKUP_FORMAT) {
    fail(
      "Este backup foi feito por uma versão mais nova do app. Atualize o app e tente de novo."
    );
  }
  if (!Array.isArray(raw.tasks) || !Array.isArray(raw.notes)) {
    fail("Backup incompleto: faltam as tarefas ou as notas.");
  }

  const taskIds = new Set<number>();
  const tasks: BackupTask[] = raw.tasks.map((t: unknown, i: number) => {
    const where = `tarefa nº ${i + 1}`;
    if (!isObj(t)) fail(`Backup corrompido (${where}).`);
    if (!isId(t.id) || taskIds.has(t.id)) fail(`Backup corrompido (${where}: id).`);
    taskIds.add(t.id);
    if (!isStr(t.title) || !t.title.trim()) fail(`Backup corrompido (${where}: título).`);
    if (!(t.description === null || t.description === undefined || isStr(t.description)))
      fail(`Backup corrompido (${where}: descrição).`);
    if (!isStr(t.date) || !ISO_DATE.test(t.date)) fail(`Backup corrompido (${where}: data).`);
    if (!isStr(t.time) || !HH_MM.test(t.time)) fail(`Backup corrompido (${where}: hora).`);
    if (!PRIORITIES.includes(t.priority as Priority))
      fail(`Backup corrompido (${where}: prioridade).`);
    const offset = t.reminderOffset ?? 0;
    if (typeof offset !== "number" || !Number.isInteger(offset) || offset < 0)
      fail(`Backup corrompido (${where}: lembrete).`);
    // Optional (backups from v1.3 or older don't have it).
    const repeat = t.repeat ?? null;
    if (repeat !== null && !(isStr(repeat) && parseRepeat(repeat)))
      fail(`Backup corrompido (${where}: repetição).`);
    return {
      id: t.id,
      title: t.title,
      description: (t.description as string | null | undefined) ?? null,
      date: t.date,
      time: t.time,
      priority: t.priority as Priority,
      completed: t.completed === true,
      reminderEnabled: t.reminderEnabled === true,
      reminderOffset: offset,
      repeat: repeat as string | null,
      createdAt: isStr(t.createdAt) ? t.createdAt : new Date().toISOString(),
      updatedAt: isStr(t.updatedAt) ? t.updatedAt : new Date().toISOString(),
    };
  });

  const noteIds = new Set<number>();
  const notes: BackupNote[] = raw.notes.map((n: unknown, i: number) => {
    const where = `nota nº ${i + 1}`;
    if (!isObj(n)) fail(`Backup corrompido (${where}).`);
    if (!isId(n.id) || noteIds.has(n.id)) fail(`Backup corrompido (${where}: id).`);
    noteIds.add(n.id);
    if (!isStr(n.title) || !isStr(n.content)) fail(`Backup corrompido (${where}: texto).`);
    if (!isStr(n.date) || !ISO_DATE.test(n.date)) fail(`Backup corrompido (${where}: data).`);
    return {
      id: n.id,
      title: n.title,
      content: n.content,
      date: n.date,
      createdAt: isStr(n.createdAt) ? n.createdAt : new Date().toISOString(),
      updatedAt: isStr(n.updatedAt) ? n.updatedAt : new Date().toISOString(),
    };
  });

  // Keep valid pairs only; if a key repeats, the last value wins
  // (settings.key is UNIQUE, so duplicates would make the restore fail).
  const settingsByKey = new Map<string, string>();
  for (const s of Array.isArray(raw.settings) ? raw.settings : []) {
    if (isObj(s) && isStr(s.key) && isStr(s.value) && !LOCAL_ONLY_SETTINGS.has(s.key)) {
      settingsByKey.set(s.key, s.value);
    }
  }
  const settings = [...settingsByKey].map(([key, value]) => ({ key, value }));

  return {
    app: APP_ID,
    format: raw.format,
    exportedAt: isStr(raw.exportedAt) ? raw.exportedAt : "",
    tasks,
    notes,
    settings,
  };
}

export interface RestoreResult {
  tasks: number;
  notes: number;
  /** Reminders that could not be scheduled (e.g. notifications blocked). */
  reminderFailures: number;
}

/**
 * Replaces ALL current data with the backup's content, in one transaction
 * (if anything fails, nothing changes). Then cancels the old reminders and
 * schedules the reminders of the restored pending tasks.
 */
export async function restoreBackup(backup: BackupFile): Promise<RestoreResult> {
  const oldTasks = await listTasks();

  // One transaction: if anything fails, the current data stays as it was.
  await replaceAllData(backup, [...LOCAL_ONLY_SETTINGS]);

  // Reminders of the replaced tasks must not fire anymore.
  for (const t of oldTasks) {
    if (!t.reminderEnabled && t.notificationId === null) continue;
    try {
      await cancelTaskReminder(t);
    } catch {
      // Ignore: the task is gone; a stale reminder is harmless to retry later.
    }
  }

  let reminderFailures = 0;
  for (const t of await listTasks()) {
    if (t.completed || !t.reminderEnabled) continue;
    try {
      await scheduleTaskReminder(t);
    } catch {
      reminderFailures++;
    }
  }

  return {
    tasks: backup.tasks.length,
    notes: backup.notes.length,
    reminderFailures,
  };
}
