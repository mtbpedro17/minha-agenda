"use client";

import { useState } from "react";
import { X, Trash2 } from "lucide-react";
import type { Note } from "@/types/note";

export default function NoteFormSheet({
  note,
  onClose,
  onSave,
  onDelete,
}: {
  note: Note | null;
  onClose: () => void;
  onSave: (input: { title: string; content: string }) => void;
  onDelete?: (note: Note) => void;
}) {
  const [title, setTitle] = useState(note?.title ?? "");
  const [content, setContent] = useState(note?.content ?? "");

  function handleSave() {
    if (!content.trim() && !title.trim()) {
      onClose();
      return;
    }
    onSave({
      title: title.trim() || "Nota",
      content: content.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60">
      <div className="w-full max-w-md rounded-t-3xl bg-surface-elevated p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            {note ? "Editar nota" : "Nova nota"}
          </h2>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="rounded-full p-1.5 text-muted"
          >
            <X size={20} />
          </button>
        </div>

        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título (ex: Notas do dia)"
          className="mt-4 w-full rounded-2xl bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Escreva sua anotação..."
          rows={5}
          className="mt-3 w-full resize-none rounded-2xl bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
        />

        <div className="mt-4 flex gap-3">
          {note && onDelete && (
            <button
              type="button"
              aria-label="Excluir nota"
              onClick={() => onDelete(note)}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-priority-high-soft text-priority-high"
            >
              <Trash2 size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 rounded-2xl bg-accent py-3.5 font-medium text-white transition-transform active:scale-[0.98]"
          >
            Salvar nota
          </button>
        </div>
      </div>
    </div>
  );
}
