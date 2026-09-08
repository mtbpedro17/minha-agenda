import { getDb, persistWeb } from "./sqlite";

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDb();
  const result = await db.query(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  const row = result.values?.[0] as { value: string } | undefined;
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDb();
  await db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value]
  );
  await persistWeb();
}
