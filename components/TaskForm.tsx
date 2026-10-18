"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import type { Priority } from "@/types/task";
import { REPEAT_OPTIONS, type RepeatKind } from "@/lib/utils/repeat";
import { canGoBackInApp } from "@/lib/navigation/backButton";
import { fromISODate } from "@/lib/utils/date";
import {
  PRIORITY_DOT_CLASS,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  REMINDER_OFFSETS,
} from "@/types/task";

export interface TaskFormValues {
  title: string;
  description: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  priority: Priority;
  reminderEnabled: boolean;
  /** Minutes before the task time (0 = at the time). */
  reminderOffset: number;
  /** null = does not repeat. The page turns it into a RepeatRule with ruleFor(). */
  repeatKind: RepeatKind | null;
}

export interface TaskFormResult {
  /** true when the task was saved but its reminder could not be scheduled. */
  reminderFailed: boolean;
}

/**
 * Shared form used by "Nova Tarefa" and "Editar Tarefa".
 *
 * The page provides `onSubmit`, which must:
 *  - throw if the task could NOT be saved (the form shows an error and lets
 *    the user retry);
 *  - resolve with `{ reminderFailed: true }` if the task WAS saved but the
 *    reminder failed (the form shows a warning and hides the save buttons,
 *    so the user cannot create a duplicate);
 *  - resolve with `{ reminderFailed: false }` on full success (the form
 *    returns to the previous screen, or /tarefas if there is none).
 *
 * Values passed to `onSubmit` are already validated and trimmed.
 */
export default function TaskForm({
  heading,
  submitLabel,
  initialValues,
  onSubmit,
}: {
  heading: string;
  submitLabel: string;
  initialValues: TaskFormValues;
  onSubmit: (values: TaskFormValues) => Promise<TaskFormResult>;
}) {
  const router = useRouter();

  const [title, setTitle] = useState(initialValues.title);
  const [description, setDescription] = useState(initialValues.description);
  const [date, setDate] = useState(initialValues.date);
  const [time, setTime] = useState(initialValues.time);
  const [priority, setPriority] = useState<Priority>(initialValues.priority);
  const [reminderEnabled, setReminderEnabled] = useState(
    initialValues.reminderEnabled
  );
  const [reminderOffset, setReminderOffset] = useState(
    initialValues.reminderOffset
  );
  const [repeatKind, setRepeatKind] = useState<RepeatKind | null>(
    initialValues.repeatKind
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminderWarning, setReminderWarning] = useState(false);

  /** Back to the screen that opened the form (Hoje, Agenda, Tarefas…). */
  function finish() {
    if (canGoBackInApp()) router.back();
    else router.replace("/tarefas");
  }

  async function handleSave() {
    if (!title.trim()) {
      setError("Dê um título à tarefa antes de salvar.");
      return;
    }
    if (!date || !time) {
      setError("Data e hora são obrigatórias.");
      return;
    }

    setSaving(true);
    setError(null);

    let result: TaskFormResult;
    try {
      result = await onSubmit({
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        priority,
        reminderEnabled,
        reminderOffset,
        repeatKind,
      });
    } catch {
      setError("Não foi possível salvar a tarefa. Tente novamente.");
      setSaving(false);
      return;
    }

    // The task is already saved at this point. A reminder failure must not
    // look like a save failure, or the user would retry and create a duplicate.
    if (result.reminderFailed) {
      setReminderWarning(true);
      return;
    }

    finish();
  }

  return (
    <main className="flex-1 overflow-y-auto px-5 pb-10 pt-6">
      <header className="flex items-center justify-between">
        <button
          type="button"
          aria-label="Voltar"
          onClick={() => router.back()}
          className="rounded-full p-1.5 text-foreground"
        >
          <ArrowLeft size={22} />
        </button>
        <h1 className="text-lg font-semibold text-foreground">{heading}</h1>
        <button
          type="button"
          aria-label="Salvar"
          onClick={handleSave}
          disabled={saving}
          className="rounded-full p-1.5 text-accent disabled:opacity-50"
        >
          <Check size={22} />
        </button>
      </header>

      <div className="mt-6 space-y-5">
        <Field label="Título">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Estudar programação"
            className="w-full rounded-2xl bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Field>

        <Field label="Descrição">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes da tarefa (opcional)"
            rows={3}
            className="w-full resize-none rounded-2xl bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Data">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-2xl bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
            />
          </Field>
          <Field label="Hora">
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full rounded-2xl bg-surface px-4 py-3 text-foreground focus:outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]"
            />
          </Field>
        </div>

        <Field label="Repetir">
          <div
            role="radiogroup"
            aria-label="Repetir"
            className="flex flex-wrap gap-2"
          >
            {REPEAT_OPTIONS.map(({ kind, label }) => {
              const selected = repeatKind === kind;
              return (
                <button
                  key={label}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRepeatKind(kind)}
                  className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    selected ? "bg-accent text-white" : "bg-surface text-muted"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {repeatKind && date && (
            <p className="mt-2 text-xs text-muted">
              {repeatHint(repeatKind, date)} Ao concluir, a tarefa passa para a
              próxima data.
            </p>
          )}
        </Field>

        <Field label="Prioridade">
          <div className="space-y-2">
            {PRIORITY_ORDER.map((p) => (
              <label
                key={p}
                className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3"
              >
                <span className="flex items-center gap-2.5 text-foreground">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT_CLASS[p]}`}
                  />
                  {PRIORITY_LABEL[p]}
                </span>
                <input
                  type="radio"
                  name="priority"
                  checked={priority === p}
                  onChange={() => setPriority(p)}
                  className="h-4 w-4 accent-accent"
                />
              </label>
            ))}
          </div>
        </Field>

        <div className="rounded-2xl bg-surface px-4 py-3.5">
          <div className="flex items-center justify-between">
            <span className="text-foreground">Definir lembrete</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => setReminderEnabled((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                reminderEnabled ? "bg-accent" : "bg-surface-elevated"
              }`}
            >
              <span
                className={`absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  reminderEnabled ? "translate-x-5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {reminderEnabled && (
            <div
              role="radiogroup"
              aria-label="Quando avisar"
              className="mt-3 flex flex-wrap gap-2"
            >
              {REMINDER_OFFSETS.map(({ minutes, label }) => {
                const selected = reminderOffset === minutes;
                return (
                  <button
                    key={minutes}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setReminderOffset(minutes)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected
                        ? "bg-accent text-white"
                        : "bg-surface-elevated text-muted"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="text-sm text-priority-high">{error}</p>}

        {reminderWarning ? (
          <div className="rounded-2xl bg-priority-medium-soft px-4 py-3.5">
            <p className="text-sm text-foreground">
              Tarefa salva, mas o lembrete não pôde ser agendado. Verifique se
              as notificações do app estão permitidas nas configurações do
              Android.
            </p>
            <button
              type="button"
              onClick={finish}
              className="mt-3 w-full rounded-2xl bg-accent py-3 font-medium text-white transition-transform active:scale-[0.98]"
            >
              Continuar
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="w-full rounded-2xl bg-accent py-3.5 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {saving ? "Salvando..." : submitLabel}
          </button>
        )}
      </div>
    </main>
  );
}

const WEEKDAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

/** One-line explanation of the chosen repetition, based on the form's date. */
function repeatHint(kind: RepeatKind, date: string): string {
  const d = fromISODate(date);
  switch (kind) {
    case "DAILY":
      return "Repete todos os dias.";
    case "WEEKDAYS":
      return "Repete de segunda a sexta.";
    case "WEEKLY":
      return `Repete toda ${WEEKDAY_NAMES[d.getDay()]}${d.getDay() === 0 || d.getDay() === 6 ? "" : "-feira"}.`;
    case "MONTHLY":
      return `Repete todo dia ${d.getDate()}${d.getDate() > 28 ? " (nos meses mais curtos, no último dia)" : ""}.`;
  }
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
