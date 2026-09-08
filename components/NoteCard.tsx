"use client";

import type { Note } from "@/types/note";
import { Pencil } from "lucide-react";

export default function NoteCard({
  note,
  onEdit,
}: {
  note: Note;
  onEdit: (note: Note) => void;
}) {
  return (
    <div className="relative rounded-2xl bg-surface px-4 py-4">
      <p className="font-medium text-foreground">{note.title}</p>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted">
        {note.content}
      </p>
      <button
        type="button"
        aria-label="Editar nota"
        onClick={() => onEdit(note)}
        className="absolute bottom-3 right-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface-elevated text-muted transition-colors active:scale-95"
      >
        <Pencil size={14} />
      </button>
    </div>
  );
}
