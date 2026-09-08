"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import FloatingButton from "@/components/FloatingButton";
import TaskCard from "@/components/TaskCard";
import EmptyState from "@/components/EmptyState";
import TaskDetailSheet from "@/components/TaskDetailSheet";
import type { Priority, Task } from "@/types/task";
import { PRIORITY_LABEL, PRIORITY_ORDER } from "@/types/task";
import { deleteTask, listTasks, toggleTaskCompleted } from "@/lib/database/tasks";
import { cancelTaskReminder, syncTaskReminder } from "@/lib/notifications/notifications";
import { ListChecks } from "lucide-react";

type Filter = "all" | "pending" | "completed";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendentes" },
  { value: "completed", label: "Concluídas" },
];

export default function TarefasPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const all = await listTasks();
    setTasks(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const filtered = useMemo(() => {
    let result = tasks;
    if (filter === "pending") result = result.filter((t) => !t.completed);
    if (filter === "completed") result = result.filter((t) => t.completed);
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      result = result.filter((t) => t.title.toLowerCase().includes(q));
    }
    return result;
  }, [tasks, filter, query]);

  const grouped = useMemo(() => {
    const groups = new Map<Priority, Task[]>();
    for (const priority of PRIORITY_ORDER) groups.set(priority, []);
    for (const task of filtered) groups.get(task.priority)?.push(task);
    return groups;
  }, [filtered]);

  async function handleToggle(task: Task) {
    const updated = await toggleTaskCompleted(task.id);
    await syncTaskReminder(updated);
    load();
  }

  async function handleDelete(task: Task) {
    await cancelTaskReminder(task);
    await deleteTask(task.id);
    setSelected(null);
    load();
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <header className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-foreground">Tarefas</h1>
          <button
            type="button"
            aria-label="Pesquisar"
            onClick={() => setSearchOpen((v) => !v)}
            className="rounded-full p-1.5 text-muted"
          >
            {searchOpen ? <X size={20} /> : <Search size={20} />}
          </button>
        </header>

        {searchOpen && (
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar tarefas..."
            className="mt-4 w-full rounded-2xl bg-surface px-4 py-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        )}

        <div className="mt-4 flex gap-2">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                filter === value
                  ? "bg-accent text-white"
                  : "bg-surface text-muted"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-5 space-y-6">
          {loading ? null : filtered.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="Nenhuma tarefa encontrada"
              description="Toque no botão + para criar uma nova tarefa."
            />
          ) : (
            PRIORITY_ORDER.map((priority) => {
              const items = grouped.get(priority) ?? [];
              if (items.length === 0) return null;
              return (
                <section key={priority}>
                  <h2 className="text-sm font-medium text-muted">
                    Prioridade {PRIORITY_LABEL[priority]}
                  </h2>
                  <div className="mt-2.5 space-y-2.5">
                    {items.map((task) => (
                      <div key={task.id} onClick={() => setSelected(task)}>
                        <TaskCard task={task} onToggle={handleToggle} />
                      </div>
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </div>
      </main>

      {selected && (
        <TaskDetailSheet
          task={selected}
          onClose={() => setSelected(null)}
          onDelete={handleDelete}
        />
      )}

      <FloatingButton href="/tarefas/nova" />
      <BottomNavigation />
    </>
  );
}
