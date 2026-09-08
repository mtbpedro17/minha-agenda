"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import BottomNavigation from "@/components/BottomNavigation";
import FloatingButton from "@/components/FloatingButton";
import TaskCard from "@/components/TaskCard";
import EmptyState from "@/components/EmptyState";
import type { Task } from "@/types/task";
import {
  getTodaySummary,
  listUpcomingTasks,
  toggleTaskCompleted,
  type TaskSummary,
} from "@/lib/database/tasks";
import { syncTaskReminder } from "@/lib/notifications/notifications";
import { getSetting } from "@/lib/database/settings";
import { formatLongDate, greeting, todayISO } from "@/lib/utils/date";
import { quoteOfTheDay } from "@/lib/utils/quotes";
import { ListTodo } from "lucide-react";

export default function HojePage() {
  const today = todayISO();
  const [userName, setUserName] = useState("");
  const [summary, setSummary] = useState<TaskSummary>({
    urgent: 0,
    pending: 0,
    completed: 0,
  });
  const [upcoming, setUpcoming] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [name, todaySummary, nextTasks] = await Promise.all([
      getSetting("user_name"),
      getTodaySummary(today),
      listUpcomingTasks(today, 3),
    ]);
    setUserName(name ?? "");
    setSummary(todaySummary);
    setUpcoming(nextTasks);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function handleToggle(task: Task) {
    const updated = await toggleTaskCompleted(task.id);
    await syncTaskReminder(updated);
    load();
  }

  return (
    <>
      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <header className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {userName ? `${greeting()}, ${userName}` : greeting()} 👋
            </h1>
            <p className="mt-1 text-sm text-muted">{formatLongDate(today)}</p>
          </div>
          <Link
            href="/configuracoes"
            aria-label="Configurações"
            className="mt-0.5 rounded-full p-1.5 text-muted transition-colors active:scale-95"
          >
            <Settings size={22} />
          </Link>
        </header>

        <div className="mt-5 rounded-2xl bg-surface px-5 py-4">
          <p className="text-lg leading-snug text-foreground">
            “{quoteOfTheDay(today)}”
          </p>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-muted">Resumo do dia</h2>
          <div className="mt-3 grid grid-cols-3 gap-3">
            <StatCard
              value={summary.urgent}
              label="Urgentes"
              color="text-priority-high"
            />
            <StatCard
              value={summary.pending}
              label="Pendentes"
              color="text-priority-medium"
            />
            <StatCard
              value={summary.completed}
              label="Concluídas"
              color="text-priority-low"
            />
          </div>
        </section>

        <section className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted">
              Próximas tarefas
            </h2>
            <Link href="/tarefas" className="text-sm font-medium text-accent">
              Ver todas
            </Link>
          </div>

          <div className="mt-3 space-y-2.5">
            {loading ? null : upcoming.length === 0 ? (
              <EmptyState
                icon={ListTodo}
                title="Nenhuma tarefa por vir"
                description="Toque no botão + para criar sua primeira tarefa."
              />
            ) : (
              upcoming.map((task) => (
                <TaskCard key={task.id} task={task} onToggle={handleToggle} />
              ))
            )}
          </div>
        </section>
      </main>

      <FloatingButton href="/tarefas/nova" />
      <BottomNavigation />
    </>
  );
}

function StatCard({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  return (
    <div className="rounded-2xl bg-surface px-3 py-4 text-center">
      <p className={`text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-muted">{label}</p>
    </div>
  );
}
