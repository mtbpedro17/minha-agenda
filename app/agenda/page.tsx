"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import NoteCard from "@/components/NoteCard";
import NoteFormSheet from "@/components/NoteFormSheet";
import TaskCard from "@/components/TaskCard";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import type { Note } from "@/types/note";
import type { Task } from "@/types/task";
import {
  createNote,
  deleteNote,
  listNoteDatesBetween,
  listNotesByDate,
  updateNote,
} from "@/lib/database/notes";
import {
  deleteTask,
  listRecurringTasks,
  listTaskDatesBetween,
  listTasksByDate,
  toggleTaskCompleted,
} from "@/lib/database/tasks";
import { occursOn } from "@/lib/utils/repeat";
import {
  cancelTaskReminder,
  syncTaskReminder,
} from "@/lib/notifications/notifications";
import {
  addDays,
  formatDayMonth,
  todayISO,
  weekAround,
  weekdayShort,
} from "@/lib/utils/date";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Agenda: everything planned for one day — tasks (with time) and free-form
 * notes. The 7-day strip marks days that have at least one task or note.
 *
 * The selected day lives in the URL (`/agenda?date=YYYY-MM-DD`), so coming
 * back from "Nova/Editar Tarefa" returns to the same day instead of today.
 */
export default function AgendaPage() {
  // useSearchParams requires a <Suspense> boundary in a static export.
  return (
    <Suspense fallback={null}>
      <Agenda />
    </Suspense>
  );
}

function Agenda() {
  const router = useRouter();
  const today = todayISO();
  const fromUrl = useSearchParams().get("date");
  const initialDate = fromUrl && ISO_DATE.test(fromUrl) ? fromUrl : today;

  const [selectedDate, setSelectedDateState] = useState(initialDate);
  /** Center day of the 7-day strip (not the first day). */
  const [weekStart, setWeekStart] = useState(initialDate);
  const [tasks, setTasks] = useState<Task[]>([]);
  /** Future occurrences of recurring tasks that fall on the selected day. */
  const [projected, setProjected] = useState<Task[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const week = useMemo(() => weekAround(weekStart), [weekStart]);

  const loadDay = useCallback(async (date: string) => {
    const [dayTasks, dayNotes, recurring] = await Promise.all([
      listTasksByDate(date),
      listNotesByDate(date),
      listRecurringTasks(),
    ]);
    setTasks(dayTasks);
    // A recurring task is stored once, on its current occurrence. Later
    // days where it will happen again are shown as "projected" cards.
    setProjected(
      recurring.filter(
        (t) => t.repeat && t.date < date && occursOn(t.repeat, t.date, date)
      )
    );
    setNotes(dayNotes);
    setLoading(false);
  }, []);

  const loadMarkers = useCallback(async (days: string[]) => {
    const start = days[0];
    const end = days[days.length - 1];
    const [taskDates, noteDates, recurring] = await Promise.all([
      listTaskDatesBetween(start, end),
      listNoteDatesBetween(start, end),
      listRecurringTasks(),
    ]);
    const busy = new Set([...taskDates, ...noteDates]);
    for (const day of days) {
      if (recurring.some((t) => t.repeat && occursOn(t.repeat, t.date, day))) {
        busy.add(day);
      }
    }
    setBusyDates(busy);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadDay(selectedDate);
  }, [selectedDate, loadDay]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMarkers(week);
  }, [week, loadMarkers]);

  /** Reloads the selected day and the strip markers after any change. */
  function refresh() {
    loadDay(selectedDate);
    loadMarkers(week);
  }

  /** Selects a day without moving the strip, and records it in the URL. */
  function setSelectedDate(date: string) {
    setSelectedDateState(date);
    router.replace(`/agenda?date=${date}`, { scroll: false });
  }

  /** Selects a day and re-centers the strip on it. */
  function selectDate(date: string) {
    setSelectedDate(date);
    setWeekStart(date);
  }

  /** Moves the 7-day strip one week back (-1) or forward (+1), selecting its center day. */
  function shiftWeek(direction: -1 | 1) {
    selectDate(addDays(weekStart, direction * 7));
  }

  // ---- Notes
  function openNewNote() {
    setEditingNote(null);
    setShowNoteForm(true);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setShowNoteForm(true);
  }

  async function handleSaveNote(input: { title: string; content: string }) {
    if (editingNote) {
      await updateNote(editingNote.id, input);
    } else {
      await createNote({ ...input, date: selectedDate });
    }
    setShowNoteForm(false);
    refresh();
  }

  async function handleDeleteNote(note: Note) {
    await deleteNote(note.id);
    setShowNoteForm(false);
    refresh();
  }

  // ---- Tasks
  function openNewTask() {
    router.push(`/tarefas/nova?date=${selectedDate}`);
  }

  async function handleToggleTask(task: Task) {
    const updated = await toggleTaskCompleted(task.id);
    await syncTaskReminder(updated);
    refresh();
  }

  async function handleDeleteTask(task: Task) {
    await cancelTaskReminder(task);
    await deleteTask(task.id);
    setSelectedTask(null);
    refresh();
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <header>
          <h1 className="text-xl font-semibold text-foreground">Agenda</h1>
        </header>

        <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
          {week.map((date) => {
            const active = date === selectedDate;
            const isToday = date === today;
            const busy = busyDates.has(date);
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                aria-label={`${weekdayShort(date)} ${formatDayMonth(date)}${
                  busy ? ", tem itens" : ""
                }${isToday ? ", hoje" : ""}`}
                className={`flex min-w-[3.1rem] flex-col items-center gap-1 rounded-2xl px-2 py-2.5 transition-colors ${
                  active ? "bg-accent text-white" : "bg-surface text-muted"
                } ${isToday && !active ? "ring-1 ring-accent" : ""}`}
              >
                <span className="text-[10px] font-medium">
                  {weekdayShort(date)}
                </span>
                <span
                  className={`text-sm font-semibold ${
                    active ? "text-white" : "text-foreground"
                  }`}
                >
                  {date.slice(8, 10)}
                </span>
                {/* Dot = this day has at least one task or note */}
                <span
                  className={`h-1 w-1 rounded-full ${
                    busy ? (active ? "bg-white" : "bg-accent") : "bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <button
            type="button"
            aria-label="Semana anterior"
            onClick={() => shiftWeek(-1)}
            className="flex items-center gap-0.5 rounded-full py-1 pr-2 active:scale-95"
          >
            <ChevronLeft size={16} />
            Semana
          </button>
          <div className="flex items-center gap-3">
            {selectedDate !== today && (
              <button
                type="button"
                onClick={() => selectDate(today)}
                className="text-accent"
              >
                Hoje
              </button>
            )}
            <span>{formatDayMonth(selectedDate)}</span>
          </div>
          <button
            type="button"
            aria-label="Próxima semana"
            onClick={() => shiftWeek(1)}
            className="flex items-center gap-0.5 rounded-full py-1 pl-2 active:scale-95"
          >
            Semana
            <ChevronRight size={16} />
          </button>
        </div>

        {!loading && (
          <>
            <section className="mt-6">
              <SectionHeader
                title="Tarefas"
                addLabel="Tarefa"
                onAdd={openNewTask}
              />
              <div className="mt-2.5 space-y-2.5">
                {tasks.length === 0 && projected.length === 0 ? (
                  <EmptyLine text="Nenhuma tarefa neste dia." />
                ) : (
                  [
                    ...tasks.map((task) => ({ task, isProjected: false })),
                    ...projected.map((task) => ({ task, isProjected: true })),
                  ]
                    .sort((a, b) => a.task.time.localeCompare(b.task.time))
                    .map(({ task, isProjected }) => (
                      <div
                        key={`${task.id}-${isProjected ? "p" : "r"}`}
                        onClick={() => setSelectedTask(task)}
                      >
                        <TaskCard
                          task={task}
                          onToggle={handleToggleTask}
                          projected={isProjected}
                        />
                      </div>
                    ))
                )}
              </div>
            </section>

            <section className="mt-6">
              <SectionHeader title="Notas" addLabel="Nota" onAdd={openNewNote} />
              <div className="mt-2.5 space-y-3">
                {notes.length === 0 ? (
                  <EmptyLine text="Nenhuma nota neste dia." />
                ) : (
                  notes.map((note) => (
                    <NoteCard key={note.id} note={note} onEdit={openEditNote} />
                  ))
                )}
              </div>
            </section>
          </>
        )}
      </main>

      {selectedTask && (
        <TaskDetailSheet
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onDelete={handleDeleteTask}
          onEdit={(task) => router.push(`/tarefas/editar?id=${task.id}`)}
        />
      )}

      {showNoteForm && (
        <NoteFormSheet
          note={editingNote}
          onClose={() => setShowNoteForm(false)}
          onSave={handleSaveNote}
          onDelete={editingNote ? handleDeleteNote : undefined}
        />
      )}

      <button
        type="button"
        aria-label="Nova nota"
        onClick={openNewNote}
        className="fixed bottom-24 right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg shadow-accent/30 transition-transform active:scale-95"
      >
        <Plus size={26} strokeWidth={2.5} />
      </button>

      <BottomNavigation />
    </>
  );
}

function SectionHeader({
  title,
  addLabel,
  onAdd,
}: {
  title: string;
  addLabel: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-sm font-medium text-muted">{title}</h2>
      <button
        type="button"
        onClick={onAdd}
        aria-label={`Adicionar ${addLabel.toLowerCase()}`}
        className="flex items-center gap-1 rounded-full px-2 py-1 text-sm font-medium text-accent active:scale-95"
      >
        <Plus size={16} />
        {addLabel}
      </button>
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-3.5 text-sm text-muted">
      {text}
    </p>
  );
}
