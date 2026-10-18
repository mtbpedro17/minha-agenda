import { Capacitor } from "@capacitor/core";
import {
  CapacitorSQLite,
  SQLiteConnection,
  SQLiteDBConnection,
} from "@capacitor-community/sqlite";

const DB_NAME = "minha_agenda";
const DB_VERSION = 1;

const CREATE_TASKS_TABLE = `
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    completed INTEGER NOT NULL DEFAULT 0,
    reminder_enabled INTEGER NOT NULL DEFAULT 0,
    notification_id INTEGER,
    reminder_offset INTEGER NOT NULL DEFAULT 0,
    repeat_rule TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const CREATE_NOTES_TABLE = `
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    date TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`;

const CREATE_SETTINGS_TABLE = `
  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    key TEXT NOT NULL UNIQUE,
    value TEXT NOT NULL
  );
`;

const CREATE_INDEXES = `
  CREATE INDEX IF NOT EXISTS idx_tasks_date ON tasks(date);
  CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
  CREATE INDEX IF NOT EXISTS idx_notes_date ON notes(date);
`;

/**
 * Schema migrations for databases created by older versions of the app.
 *
 * `CREATE TABLE IF NOT EXISTS` above only builds tables that don't exist yet;
 * it never changes an existing table. So whenever you add a column:
 *   1. add it to the CREATE TABLE statement (for fresh installs), AND
 *   2. append an entry here (for users who already have the app).
 *
 * Each entry is idempotent: the column is only added if it's missing, so the
 * list can safely run on every app start. Never remove or reorder entries.
 * A NOT NULL column needs a DEFAULT, e.g. "INTEGER NOT NULL DEFAULT 0".
 */
interface ColumnMigration {
  table: "tasks" | "notes" | "settings";
  column: string;
  definition: string;
}

const COLUMN_MIGRATIONS: ColumnMigration[] = [
  // Example: { table: "tasks", column: "category", definition: "TEXT" },

  // v1.3 — minutes before the task time to fire the reminder (0 = at the time).
  { table: "tasks", column: "reminder_offset", definition: "INTEGER NOT NULL DEFAULT 0" },

  // v1.4 — recurring tasks: "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY:<day>" (NULL = no repeat).
  { table: "tasks", column: "repeat_rule", definition: "TEXT" },
];

let sqliteConnection: SQLiteConnection | null = null;
let db: SQLiteDBConnection | null = null;
let initPromise: Promise<SQLiteDBConnection> | null = null;

/**
 * Returns a ready-to-use SQLite connection.
 * On Android/iOS this uses the native Capacitor SQLite plugin.
 * On the web (e.g. `next dev` in the browser) it uses jeep-sqlite,
 * which requires the <jeep-sqlite> web component to be mounted once
 * (see components/JeepSqlite.tsx) so the app can still be developed
 * and previewed without a device.
 */
export async function getDb(): Promise<SQLiteDBConnection> {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);

    const platform = Capacitor.getPlatform();

    if (platform === "web") {
      // jeep-sqlite must already be defined via customElements
      // (done in components/JeepSqlite.tsx, mounted in app/layout.tsx)
      await customElements.whenDefined("jeep-sqlite");
      const jeepEl = document.querySelector("jeep-sqlite");
      if (jeepEl) {
        await sqliteConnection.initWebStore();
      }
    }

    const isConsistent = (
      await sqliteConnection.checkConnectionsConsistency()
    ).result;
    const isConnection = (await sqliteConnection.isConnection(DB_NAME, false))
      .result;

    let connection: SQLiteDBConnection;
    if (isConsistent && isConnection) {
      connection = await sqliteConnection.retrieveConnection(DB_NAME, false);
    } else {
      connection = await sqliteConnection.createConnection(
        DB_NAME,
        false,
        "no-encryption",
        DB_VERSION,
        false
      );
    }

    await connection.open();
    await connection.execute(CREATE_TASKS_TABLE);
    await connection.execute(CREATE_NOTES_TABLE);
    await connection.execute(CREATE_SETTINGS_TABLE);
    await connection.execute(CREATE_INDEXES);
    await runMigrations(connection);

    if (platform === "web") {
      await sqliteConnection.saveToStore(DB_NAME);
    }

    db = connection;
    return connection;
  })();

  return initPromise;
}

/** Persists pending writes to IndexedDB when running on the web (no-op on native). */
export async function persistWeb(): Promise<void> {
  if (Capacitor.getPlatform() === "web" && sqliteConnection) {
    await sqliteConnection.saveToStore(DB_NAME);
  }
}

export async function closeDb(): Promise<void> {
  if (sqliteConnection && db) {
    await sqliteConnection.closeConnection(DB_NAME, false);
    db = null;
    initPromise = null;
  }
}

async function runMigrations(conn: SQLiteDBConnection): Promise<void> {
  for (const m of COLUMN_MIGRATIONS) {
    await addColumnIfMissing(conn, m.table, m.column, m.definition);
  }
}

/** Adds a column only if the table doesn't have it yet. */
async function addColumnIfMissing(
  conn: SQLiteDBConnection,
  table: string,
  column: string,
  definition: string
): Promise<void> {
  const info = await conn.query(`PRAGMA table_info(${table});`);
  const exists = (info.values as { name: string }[] | undefined)?.some(
    (c) => c.name === column
  );
  if (!exists) {
    await conn.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition};`);
  }
}
