"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import ConfirmDialog from "./ConfirmDialog";
import {
  BackupError,
  LAST_EXPORT_KEY,
  exportBackup,
  parseBackup,
  restoreBackup,
  type BackupFile,
} from "@/lib/backup/backup";
import { getSetting } from "@/lib/database/settings";
import { listTasks } from "@/lib/database/tasks";
import { listAllNotes } from "@/lib/database/notes";
import { formatShortDate, toISODate } from "@/lib/utils/date";

type Status = { kind: "ok" | "error"; text: string } | null;

/** Local date (dd/mm/aaaa) of an ISO timestamp. */
function localDay(isoTimestamp: string): string {
  return formatShortDate(toISODate(new Date(isoTimestamp)));
}

/**
 * "Backup" block of the Configurações screen: export everything to a JSON
 * file, or restore (replace everything) from one. See lib/backup/backup.ts.
 */
export default function BackupSection() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState<{
    backup: BackupFile;
    currentTasks: number;
    currentNotes: number;
  } | null>(null);

  useEffect(() => {
    getSetting(LAST_EXPORT_KEY).then(setLastExport);
  }, []);

  async function handleExport() {
    setBusy(true);
    setStatus(null);
    try {
      const shared = await exportBackup();
      if (shared) {
        setLastExport(await getSetting(LAST_EXPORT_KEY));
        setStatus({ kind: "ok", text: "Backup criado. Guarde o arquivo em um lugar seguro." });
      }
    } catch {
      setStatus({ kind: "error", text: "Não foi possível criar o backup. Tente novamente." });
    } finally {
      setBusy(false);
    }
  }

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow choosing the same file again later
    if (!file) return;
    setStatus(null);
    try {
      const backup = parseBackup(await file.text());
      const [tasks, notes] = await Promise.all([listTasks(), listAllNotes()]);
      setPending({ backup, currentTasks: tasks.length, currentNotes: notes.length });
    } catch (err) {
      setStatus({
        kind: "error",
        text:
          err instanceof BackupError
            ? err.message
            : "Não foi possível ler o arquivo.",
      });
    }
  }

  async function handleConfirmRestore() {
    if (!pending) return;
    const { backup } = pending;
    setPending(null);
    setBusy(true);
    try {
      const result = await restoreBackup(backup);
      setStatus({
        kind: "ok",
        text:
          `Backup restaurado: ${result.tasks} tarefa(s) e ${result.notes} nota(s).` +
          (result.reminderFailures > 0
            ? ` ${result.reminderFailures} lembrete(s) não puderam ser agendados — verifique as permissões de notificação.`
            : ""),
      });
    } catch {
      setStatus({
        kind: "error",
        text: "Não foi possível restaurar. Seus dados atuais não foram alterados.",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-medium text-muted">Backup</h2>
      <div className="mt-2.5 rounded-2xl bg-surface px-4 py-4">
        <p className="text-sm text-muted">
          {lastExport ? (
            <>Último backup: <span className="text-foreground">{localDay(lastExport)}</span></>
          ) : (
            <span className="text-priority-medium">Você ainda não fez nenhum backup.</span>
          )}
        </p>
        <p className="mt-1 text-xs text-muted">
          Gera um arquivo com todas as tarefas, notas e configurações. Guarde-o
          no Drive, no WhatsApp, no e-mail ou no computador.
        </p>

        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={handleExport}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent py-3 font-medium text-white transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <Upload size={18} />
            Exportar
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-elevated py-3 font-medium text-foreground transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            <Download size={18} />
            Restaurar
          </button>
        </div>

        {/* No `accept` filter: on Android, .json files often come with a
            generic MIME type and would be greyed out. Content is validated. */}
        <input
          ref={fileInput}
          type="file"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={handleFileChosen}
        />

        {status && (
          <p
            role="status"
            className={`mt-3 text-sm ${
              status.kind === "ok" ? "text-priority-low" : "text-priority-high"
            }`}
          >
            {status.text}
          </p>
        )}
      </div>

      {pending && (
        <ConfirmDialog
          title="Restaurar backup?"
          message={
            `Backup${pending.backup.exportedAt ? ` de ${localDay(pending.backup.exportedAt)}` : ""}: ` +
            `${pending.backup.tasks.length} tarefa(s) e ${pending.backup.notes.length} nota(s). ` +
            `Isso SUBSTITUI tudo o que está no app agora ` +
            `(${pending.currentTasks} tarefa(s) e ${pending.currentNotes} nota(s)).`
          }
          confirmLabel="Restaurar"
          onCancel={() => setPending(null)}
          onConfirm={handleConfirmRestore}
        />
      )}
    </section>
  );
}
