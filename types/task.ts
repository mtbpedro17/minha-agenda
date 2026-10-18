import type { RepeatRule } from "@/lib/utils/repeat";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  priority: Priority;
  completed: boolean;
  reminderEnabled: boolean;
  /** Minutes before date/time to fire the reminder. 0 = at the exact time. */
  reminderOffset: number;
  /** null = does not repeat. See lib/utils/repeat.ts. */
  repeat: RepeatRule | null;
  notificationId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  date: string;
  time: string;
  priority: Priority;
  reminderEnabled: boolean;
  /** Defaults to 0 (at the exact time). */
  reminderOffset?: number;
  /** Defaults to null (does not repeat). */
  repeat?: RepeatRule | null;
}

export interface UpdateTaskInput
  extends Partial<Omit<NewTaskInput, "description" | "repeat">> {
  /** `null` removes the repetition; `undefined` keeps the current one. */
  repeat?: RepeatRule | null;
  /** `null` clears the description; `undefined` keeps the current one. */
  description?: string | null;
  completed?: boolean;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export const PRIORITY_ORDER: Priority[] = ["HIGH", "MEDIUM", "LOW"];

/** Tailwind class for the colored dot of each priority. */
export const PRIORITY_DOT_CLASS: Record<Priority, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

/** Reminder lead-time options offered in the task form, in minutes. */
export const REMINDER_OFFSETS: { minutes: number; label: string }[] = [
  { minutes: 0, label: "Na hora" },
  { minutes: 5, label: "5 min antes" },
  { minutes: 15, label: "15 min antes" },
  { minutes: 30, label: "30 min antes" },
  { minutes: 60, label: "1 h antes" },
  { minutes: 1440, label: "1 dia antes" },
];

/** Human label for a reminder offset, e.g. "15 min antes" or "Na hora". */
export function reminderOffsetLabel(minutes: number): string {
  const known = REMINDER_OFFSETS.find((o) => o.minutes === minutes);
  if (known) return known.label;
  if (minutes % 1440 === 0) return `${minutes / 1440} dias antes`;
  if (minutes % 60 === 0) return `${minutes / 60} h antes`;
  return `${minutes} min antes`;
}
