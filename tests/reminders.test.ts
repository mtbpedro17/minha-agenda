import { check, section } from "./check";
import { notificationIdFor, plannedReminders, reminderTimeFor } from "@/lib/notifications/notifications";

const now = new Date("2026-10-18T19:00:00").getTime(); // domingo, 19:00
const hhmm = (r: { at: Date } | null) => (r ? r.at.toTimeString().slice(0, 5) : null);

section("Lembretes — quando tocam");
check("na hora", hhmm(reminderTimeFor({ date: "2026-10-18", time: "20:00", reminderOffset: 0 }, now)), "20:00");
check("15 min antes", hhmm(reminderTimeFor({ date: "2026-10-18", time: "20:00", reminderOffset: 15 }, now)), "19:45");
check("antecedência já passou → na hora", hhmm(reminderTimeFor({ date: "2026-10-18", time: "19:10", reminderOffset: 15 }, now)), "19:10");
check("tarefa no passado → nenhum", reminderTimeFor({ date: "2026-10-18", time: "18:00", reminderOffset: 0 }, now), null);
check("virada de mês", reminderTimeFor({ date: "2026-11-01", time: "00:10", reminderOffset: 30 }, now)?.at.getDate(), 31);

section("Lembretes — tarefas que se repetem");
const daily = plannedReminders({ date: "2026-10-18", time: "08:00", reminderOffset: 0, repeat: { kind: "DAILY" } }, now);
check("diária: 14 avisos à frente, pulando o de hoje que já passou", [daily.length, daily[0].date, daily[13].date], [14, "2026-10-19", "2026-11-01"]);
check("tarefa simples: 1 aviso", plannedReminders({ date: "2026-10-20", time: "09:00", reminderOffset: 0, repeat: null }, now).length, 1);

section("Lembretes — ids");
const ids = [1, 2, 899999].flatMap((id) => Array.from({ length: 16 }, (_, k) => notificationIdFor(id, k)));
check("ids não colidem", new Set(ids).size, ids.length);
check("id da 1ª ocorrência é o mesmo das versões antigas", notificationIdFor(7), 100007);
