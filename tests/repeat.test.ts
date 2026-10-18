import { check, section } from "./check";
import {
  dateAfterCompletion, nextOccurrence, occursOn, parseRepeat,
  repeatLabel, ruleFor, serializeRepeat, upcomingOccurrences,
} from "@/lib/utils/repeat";

// 18/10/2026 é domingo.
const D = { kind: "DAILY" } as const;
const WD = { kind: "WEEKDAYS" } as const;
const W = { kind: "WEEKLY" } as const;
const M31 = { kind: "MONTHLY", monthDay: 31 } as const;

section("Repetição — formato salvo e rótulos");
check("serializa e lê mensal", parseRepeat(serializeRepeat(M31)), M31);
check("valores inválidos viram null", [parseRepeat("YEARLY"), parseRepeat("MONTHLY:0"), parseRepeat("MONTHLY:32"), parseRepeat(null)], [null, null, null, null]);
check("ruleFor mensal usa o dia da data", ruleFor("MONTHLY", "2026-01-31"), M31);
check("rótulos", [repeatLabel(W, "2026-10-23"), repeatLabel(M31, "2026-02-28"), repeatLabel(WD, "2026-10-18")], ["Toda semana (sexta)", "Todo mês (dia 31)", "Dias úteis (seg–sex)"]);

section("Repetição — concluir avança a data");
check("diária de hoje → amanhã", dateAfterCompletion(D, "2026-10-18", "2026-10-18"), "2026-10-19");
check("diária atrasada 5 dias → hoje", dateAfterCompletion(D, "2026-10-13", "2026-10-18"), "2026-10-18");
check("diária adiantada → dia seguinte ao atual", dateAfterCompletion(D, "2026-10-20", "2026-10-18"), "2026-10-21");
check("dias úteis: sexta → segunda", dateAfterCompletion(WD, "2026-10-23", "2026-10-23"), "2026-10-26");
check("semanal: sexta → próxima sexta", dateAfterCompletion(W, "2026-10-23", "2026-10-23"), "2026-10-30");
check("semanal atrasada 3 semanas → próxima sexta a partir de hoje", dateAfterCompletion(W, "2026-10-02", "2026-10-21"), "2026-10-23");
check("mensal dia 31 concluída em 28/02 → 31/03", dateAfterCompletion(M31, "2027-02-28", "2027-02-28"), "2027-03-31");

section("Repetição — ocorrências");
check("virada de ano", nextOccurrence(D, "2026-12-31", "2026-12-31"), "2027-01-01");
check("dias úteis: criada no sábado → segunda", nextOccurrence(WD, "2026-10-24", "2026-10-24"), "2026-10-26");
check("dias úteis: domingo não ocorre", occursOn(WD, "2026-10-19", "2026-10-25"), false);
check("dias úteis: 6 a partir de qui 22/10", upcomingOccurrences(WD, "2026-10-22", 6), ["2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29"]);
check("semanal: só no mesmo dia da semana", [occursOn(W, "2026-10-23", "2026-10-30"), occursOn(W, "2026-10-23", "2026-10-29")], [true, false]);
check("mensal 31: jan → fev28 → mar31 → abr30", upcomingOccurrences(M31, "2027-01-31", 4), ["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30"]);
check("mensal 31 em ano bissexto → 29/02", nextOccurrence(M31, "2028-01-31", "2028-01-31"), "2028-02-29");
check("nada antes da data atual", occursOn(D, "2026-10-18", "2026-10-17"), false);
