import { addDays, fromISODate } from "./date";

/**
 * Recurring tasks ("tarefas que se repetem").
 *
 * Model: a recurring task is ONE row whose `date` is its current occurrence.
 * Completing it moves `date` to the next occurrence instead of marking it
 * done (see `toggleTaskCompleted` in lib/database/tasks.ts).
 *
 * Stored in tasks.repeat_rule as text:
 *   "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY:<day 1-31>"
 * Weekly uses the weekday of the task's current date. Monthly keeps the
 * original day (e.g. 31) so it doesn't drift after short months: in months
 * without that day it falls on the last day of the month.
 *
 * Everything here is pure (no database, no plugins) so it can be unit-tested.
 */

export type RepeatKind = "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY";

export interface RepeatRule {
  kind: RepeatKind;
  /** Only for MONTHLY: day of the month (1-31) the task belongs to. */
  monthDay?: number;
}

/** Options shown in the task form, in display order. `null` = no repetition. */
export const REPEAT_OPTIONS: { kind: RepeatKind | null; label: string }[] = [
  { kind: null, label: "Não repete" },
  { kind: "DAILY", label: "Todo dia" },
  { kind: "WEEKDAYS", label: "Dias úteis" },
  { kind: "WEEKLY", label: "Toda semana" },
  { kind: "MONTHLY", label: "Todo mês" },
];

const WEEKDAY_NAMES = [
  "domingo",
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
];

export function serializeRepeat(rule: RepeatRule | null): string | null {
  if (!rule) return null;
  if (rule.kind === "MONTHLY") return `MONTHLY:${rule.monthDay ?? 1}`;
  return rule.kind;
}

/** Parses the stored text. Unknown/invalid values become `null` (no repeat). */
export function parseRepeat(value: string | null | undefined): RepeatRule | null {
  if (!value) return null;
  if (value === "DAILY" || value === "WEEKDAYS" || value === "WEEKLY") {
    return { kind: value };
  }
  const monthly = /^MONTHLY:(\d{1,2})$/.exec(value);
  if (monthly) {
    const day = Number(monthly[1]);
    if (day >= 1 && day <= 31) return { kind: "MONTHLY", monthDay: day };
  }
  return null;
}

/** Builds the rule chosen in the form for a task dated `date`. */
export function ruleFor(kind: RepeatKind | null, date: string): RepeatRule | null {
  if (!kind) return null;
  if (kind === "MONTHLY") return { kind, monthDay: fromISODate(date).getDate() };
  return { kind };
}

/** e.g. "Todo dia", "Dias úteis (seg–sex)", "Toda semana (sexta)", "Todo mês (dia 31)". */
export function repeatLabel(rule: RepeatRule, date: string): string {
  switch (rule.kind) {
    case "DAILY":
      return "Todo dia";
    case "WEEKDAYS":
      return "Dias úteis (seg–sex)";
    case "WEEKLY":
      return `Toda semana (${WEEKDAY_NAMES[fromISODate(date).getDay()]})`;
    case "MONTHLY":
      return `Todo mês (dia ${rule.monthDay ?? fromISODate(date).getDate()})`;
  }
}

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

/**
 * Does a task with this rule, whose current occurrence is `anchorDate`,
 * also happen on `date`? Only dates on/after the anchor can match.
 */
export function occursOn(rule: RepeatRule, anchorDate: string, date: string): boolean {
  if (date < anchorDate) return false;
  if (date === anchorDate) return true;
  const d = fromISODate(date);
  switch (rule.kind) {
    case "DAILY":
      return true;
    case "WEEKDAYS": {
      const wd = d.getDay();
      return wd >= 1 && wd <= 5;
    }
    case "WEEKLY":
      return d.getDay() === fromISODate(anchorDate).getDay();
    case "MONTHLY": {
      const wanted = rule.monthDay ?? fromISODate(anchorDate).getDate();
      const last = daysInMonth(d.getFullYear(), d.getMonth());
      return d.getDate() === Math.min(wanted, last);
    }
  }
}

/** First date strictly after `after` on which the rule occurs (anchor = `anchorDate`). */
export function nextOccurrence(
  rule: RepeatRule,
  anchorDate: string,
  after: string
): string {
  // At most ~1 month + a few days for any rule; 400 is a generous safety cap.
  let d = addDays(after, 1);
  for (let i = 0; i < 400; i++) {
    if (d > anchorDate && occursOn(rule, anchorDate, d)) return d;
    d = addDays(d, 1);
  }
  return addDays(after, 1);
}

/**
 * Date a recurring task moves to when the user completes it.
 * The next occurrence after the current one that is also today or later:
 * - "Todo dia" due today → tomorrow;
 * - "Todo dia" overdue since last week → today (past ones are skipped).
 */
export function dateAfterCompletion(
  rule: RepeatRule,
  currentDate: string,
  today: string
): string {
  const after = currentDate >= today ? currentDate : addDays(today, -1);
  return nextOccurrence(rule, currentDate, after);
}

/** The current occurrence plus the following ones, `count` dates in total. */
export function upcomingOccurrences(
  rule: RepeatRule,
  anchorDate: string,
  count: number
): string[] {
  const dates = [anchorDate];
  while (dates.length < count) {
    dates.push(nextOccurrence(rule, anchorDate, dates[dates.length - 1]));
  }
  return dates;
}
