/**
 * Tiny test helper (no framework): `check(name, got, expected)`.
 * Run all tests with `npm test`. Exit code is 1 if anything fails.
 */
let failures = 0;

export function check(name: string, got: unknown, expected: unknown): void {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failures++;
  console.log(
    `${ok ? "✔" : "✘"} ${name}` +
      (ok ? "" : `\n    recebido: ${JSON.stringify(got)}\n    esperado: ${JSON.stringify(expected)}`)
  );
}

export function section(title: string): void {
  console.log(`\n# ${title}`);
}

export function finish(): void {
  console.log(failures ? `\n${failures} teste(s) falharam.` : "\nTodos os testes passaram.");
  if (failures) process.exitCode = 1;
}
