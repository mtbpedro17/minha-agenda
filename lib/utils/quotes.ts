const QUOTES = [
  "Disciplina hoje, liberdade amanhã.",
  "Pequenos passos todos os dias.",
  "Foco no processo, não só no resultado.",
  "Feito é melhor que perfeito.",
  "Um dia de cada vez.",
  "Consistência vence intensidade.",
  "Comece onde você está, com o que você tem.",
  "O progresso não precisa ser rápido para contar.",
];

/** Returns the same quote all day, changing daily based on the date. */
export function quoteOfTheDay(dateISO: string): string {
  const seed = dateISO
    .split("-")
    .reduce((acc, part) => acc + Number(part), 0);
  return QUOTES[seed % QUOTES.length];
}
