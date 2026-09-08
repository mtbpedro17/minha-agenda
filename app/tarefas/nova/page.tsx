"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check } from "lucide-react";
import type { Priority } from "@/types/task";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/types/task";
import { createTask } from "@/lib/database/tasks";
import { scheduleTaskReminder } from "@/lib/notifications/notifications";
import { todayISO } from "@/lib/utils/date";

const PRIORITY_DOT: Record<Priority, string> = {
  HIGH: "bg-priority-high",
  MEDIUM: "bg-priority-medium",
  LOW: "bg-priority-low",
};

function nowHHMM(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

export default function NovaTarefaPage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState(nowHHMM());
  const [priority, setPriority] = useState<Priority>("MEDIUM");
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    try {
      const task = await createTask({
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        time,
        priority,
        reminderEnabled,
      });
      if (reminderEnabled) {
        await scheduleTaskReminder(task);
      }
      router.push("/tarefas");
    } catch {
      setError("Não foi possível salvar a tarefa. Tente novamente.");
      setSaving(false);
    }
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
        <h1 className="text-lg font-semibold text-foreground">Nova Tarefa</h1>
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

        <Field label="Prioridade">
          <div className="space-y-2">
            {PRIORITY_ORDER.map((p) => (
              <label
                key={p}
                className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3"
              >
                <span className="flex items-center gap-2.5 text-foreground">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${PRIORITY_DOT[p]}`}
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

        <div className="flex items-center justify-between rounded-2xl bg-surface px-4 py-3.5">
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
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                reminderEnabled ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>

        {error && <p className="text-sm text-priority-high">{error}</p>}

        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-accent py-3.5 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? "Salvando..." : "Salvar Tarefa"}
        </button>
      </div>
    </main>
  );
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
