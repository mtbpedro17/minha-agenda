"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, NotebookPen } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import NoteCard from "@/components/NoteCard";
import EmptyState from "@/components/EmptyState";
import NoteFormSheet from "@/components/NoteFormSheet";
import type { Note } from "@/types/note";
import { createNote, deleteNote, listNotesByDate, updateNote } from "@/lib/database/notes";
import {
  formatDayMonth,
  todayISO,
  weekAround,
  weekdayShort,
} from "@/lib/utils/date";

export default function AgendaPage() {
  const today = todayISO();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weekStart, setWeekStart] = useState(today);
  const [notes, setNotes] = useState<Note[]>([]);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const week = useMemo(() => weekAround(weekStart), [weekStart]);

  const load = useCallback(async (date: string) => {
    setLoading(true);
    const list = await listNotesByDate(date);
    setNotes(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(selectedDate);
  }, [selectedDate, load]);

  function selectDate(date: string) {
    setSelectedDate(date);
    setWeekStart(date);
  }

  function openNewNote() {
    setEditingNote(null);
    setShowForm(true);
  }

  function openEditNote(note: Note) {
    setEditingNote(note);
    setShowForm(true);
  }

  async function handleSave(input: { title: string; content: string }) {
    if (editingNote) {
      await updateNote(editingNote.id, input);
    } else {
      await createNote({ ...input, date: selectedDate });
    }
    setShowForm(false);
    load(selectedDate);
  }

  async function handleDelete(note: Note) {
    await deleteNote(note.id);
    setShowForm(false);
    load(selectedDate);
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
            return (
              <button
                key={date}
                type="button"
                onClick={() => setSelectedDate(date)}
                className={`flex min-w-[3.1rem] flex-col items-center gap-1 rounded-2xl px-2 py-2.5 transition-colors ${
                  active ? "bg-accent text-white" : "bg-surface text-muted"
                }`}
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
                {isToday && !active && (
                  <span className="h-1 w-1 rounded-full bg-accent" />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-2 flex justify-between text-xs text-muted">
          <button type="button" onClick={() => selectDate(today)} className="text-accent">
            Hoje
          </button>
          <span>{formatDayMonth(selectedDate)}</span>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? null : notes.length === 0 ? (
            <EmptyState
              icon={NotebookPen}
              title="Nenhuma nota neste dia"
              description="Toque no botão + para anotar algo."
            />
          ) : (
            notes.map((note) => (
              <NoteCard key={note.id} note={note} onEdit={openEditNote} />
            ))
          )}
        </div>
      </main>

      {showForm && (
        <NoteFormSheet
          note={editingNote}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
          onDelete={editingNote ? handleDelete : undefined}
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
