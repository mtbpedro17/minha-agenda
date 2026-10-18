import { getDb, persistWeb } from "./sqlite";
import type { NewNoteInput, Note, UpdateNoteInput } from "@/types/note";

interface NoteRow {
  id: number;
  title: string;
  content: string;
  date: string;
  created_at: string;
  updated_at: string;
}

function rowToNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    date: row.date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function createNote(input: NewNoteInput): Promise<Note> {
  const db = await getDb();
  const now = new Date().toISOString();

  const result = await db.run(
    `INSERT INTO notes (title, content, date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [input.title, input.content, input.date, now, now]
  );

  const id = result.changes?.lastId;
  if (id === undefined || id === null) {
    throw new Error("Falha ao criar nota: id não retornado pelo SQLite.");
  }

  await persistWeb();
  const created = await getNoteById(id);
  if (!created) throw new Error("Nota criada mas não encontrada.");
  return created;
}

export async function getNoteById(id: number): Promise<Note | null> {
  const db = await getDb();
  const result = await db.query("SELECT * FROM notes WHERE id = ?", [id]);
  const row = result.values?.[0] as NoteRow | undefined;
  return row ? rowToNote(row) : null;
}

/** All notes, oldest day first (used by the backup export). */
export async function listAllNotes(): Promise<Note[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM notes ORDER BY date ASC, created_at ASC"
  );
  return (result.values as NoteRow[] | undefined)?.map(rowToNote) ?? [];
}

export async function listNotesByDate(date: string): Promise<Note[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM notes WHERE date = ? ORDER BY created_at ASC",
    [date]
  );
  return (result.values as NoteRow[] | undefined)?.map(rowToNote) ?? [];
}

/** Distinct dates (YYYY-MM-DD) between `start` and `end` (inclusive) that have notes. */
export async function listNoteDatesBetween(
  start: string,
  end: string
): Promise<string[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT DISTINCT date FROM notes WHERE date BETWEEN ? AND ?",
    [start, end]
  );
  return ((result.values as { date: string }[] | undefined) ?? []).map(
    (r) => r.date
  );
}

export async function updateNote(
  id: number,
  input: UpdateNoteInput
): Promise<Note> {
  const db = await getDb();
  const existing = await getNoteById(id);
  if (!existing) throw new Error("Nota não encontrada.");

  const merged = {
    title: input.title ?? existing.title,
    content: input.content ?? existing.content,
    date: input.date ?? existing.date,
  };
  const now = new Date().toISOString();

  await db.run(
    "UPDATE notes SET title = ?, content = ?, date = ?, updated_at = ? WHERE id = ?",
    [merged.title, merged.content, merged.date, now, id]
  );

  await persistWeb();
  const updated = await getNoteById(id);
  if (!updated) throw new Error("Nota atualizada mas não encontrada.");
  return updated;
}

export async function deleteNote(id: number): Promise<void> {
  const db = await getDb();
  await db.run("DELETE FROM notes WHERE id = ?", [id]);
  await persistWeb();
}
