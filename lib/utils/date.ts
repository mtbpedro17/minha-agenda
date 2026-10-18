const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

const WEEKDAYS_SHORT = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

/** Returns today's date as YYYY-MM-DD, in local time. */
export function todayISO(): string {
  return toISODate(new Date());
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** e.g. "Sábado, 05 de Setembro" */
export function formatLongDate(iso: string): string {
  const date = fromISODate(iso);
  const weekday = WEEKDAYS_LONG[date.getDay()];
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS[date.getMonth()];
  return `${weekday}, ${day} de ${month}`;
}

/** e.g. "05/09/2026" */
export function formatShortDate(iso: string): string {
  const date = fromISODate(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** e.g. "05/09" */
export function formatDayMonth(iso: string): string {
  const date = fromISODate(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS_SHORT[fromISODate(iso).getDay()];
}

/** Adds (or subtracts, if negative) whole days to an ISO date, in local time. */
export function addDays(iso: string, days: number): string {
  const date = fromISODate(iso);
  date.setDate(date.getDate() + days);
  return toISODate(date);
}

/**
 * Short, human label for a date relative to today:
 * "Hoje", "Amanhã", "Ontem", "05/09" (same year) or "05/09/27" (other year).
 * Kept short on purpose: it fits under the time in TaskCard.
 */
export function relativeDayLabel(iso: string, today: string = todayISO()): string {
  if (iso === today) return "Hoje";
  if (iso === addDays(today, 1)) return "Amanhã";
  if (iso === addDays(today, -1)) return "Ontem";
  return iso.slice(0, 4) === today.slice(0, 4)
    ? formatDayMonth(iso)
    : `${formatDayMonth(iso)}/${iso.slice(2, 4)}`;
}

/** Current local time as HH:mm. */
export function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

/** Returns an array of 7 ISO dates centered on `iso` (3 before, `iso`, 3 after). */
export function weekAround(iso: string): string[] {
  const center = fromISODate(iso);
  const days: string[] = [];
  for (let offset = -3; offset <= 3; offset++) {
    const d = new Date(center);
    d.setDate(center.getDate() + offset);
    days.push(toISODate(d));
  }
  return days;
}

export function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
}
