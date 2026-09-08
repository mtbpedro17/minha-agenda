export interface Note {
  id: number;
  title: string;
  content: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface NewNoteInput {
  title: string;
  content: string;
  date: string;
}

export type UpdateNoteInput = Partial<NewNoteInput>;
