export type Priority = "HIGH" | "MEDIUM" | "LOW";

export interface Task {
  id: number;
  title: string;
  description: string | null;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  priority: Priority;
  completed: boolean;
  reminderEnabled: boolean;
  notificationId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewTaskInput {
  title: string;
  description?: string;
  date: string;
  time: string;
  priority: Priority;
  reminderEnabled: boolean;
}

export interface UpdateTaskInput extends Partial<NewTaskInput> {
  completed?: boolean;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  HIGH: "Alta",
  MEDIUM: "Média",
  LOW: "Baixa",
};

export const PRIORITY_ORDER: Priority[] = ["HIGH", "MEDIUM", "LOW"];
