import { check, section } from "./check";
import { BackupError, parseBackup } from "@/lib/backup/backup";

const base = {
  app: "minha-agenda", format: 1, exportedAt: "2026-10-18T19:00:00.000Z",
  tasks: [{ id: 1, title: "A", description: null, date: "2026-10-20", time: "09:00", priority: "HIGH", completed: false, reminderEnabled: true, reminderOffset: 15, repeat: "DAILY", createdAt: "x", updatedAt: "x" }],
  notes: [{ id: 1, title: "N", content: "c", date: "2026-10-20", createdAt: "x", updatedAt: "x" }],
  settings: [{ key: "user_name", value: "Ana" }, { key: "user_name", value: "Bia" }, { key: "last_export_at", value: "x" }],
};
const errorOf = (text: string) => { try { parseBackup(text); return "ok"; } catch (e) { return e instanceof BackupError ? e.message : "outro erro"; } };

section("Backup — leitura do arquivo");
const parsed = parseBackup(JSON.stringify(base));
check("arquivo válido", [parsed.tasks.length, parsed.notes.length, parsed.tasks[0].repeat], [1, 1, "DAILY"]);
check("configuração repetida: vale a última; chave local é ignorada", parsed.settings, [{ key: "user_name", value: "Bia" }]);
const old = { ...base, tasks: [{ ...base.tasks[0], repeat: undefined, reminderOffset: undefined }] };
check("backup antigo (sem repeat/offset) é aceito", [parseBackup(JSON.stringify(old)).tasks[0].repeat, parseBackup(JSON.stringify(old)).tasks[0].reminderOffset], [null, 0]);
check("não é JSON", errorOf("abc"), "Este arquivo não é um backup válido (não é um JSON).");
check("outro app", errorOf(JSON.stringify({ ...base, app: "x" })), "Este arquivo não é um backup do Minha Agenda.");
check("formato mais novo", errorOf(JSON.stringify({ ...base, format: 99 })).startsWith("Este backup foi feito por uma versão mais nova"), true);
check("hora inválida", errorOf(JSON.stringify({ ...base, tasks: [{ ...base.tasks[0], time: "25:00" }] })), "Backup corrompido (tarefa nº 1: hora).");
check("repetição inválida", errorOf(JSON.stringify({ ...base, tasks: [{ ...base.tasks[0], repeat: "YEARLY" }] })), "Backup corrompido (tarefa nº 1: repetição).");
check("id de nota repetido", errorOf(JSON.stringify({ ...base, notes: [base.notes[0], base.notes[0]] })), "Backup corrompido (nota nº 2: id).");
