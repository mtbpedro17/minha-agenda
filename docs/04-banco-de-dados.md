# 4. Banco de dados

Todo o armazenamento é feito em **um banco SQLite local** chamado `minha_agenda`. Não há servidor nem sincronização.

| Ambiente | Implementação | Onde os dados ficam |
|---|---|---|
| Android (APK) | Plugin nativo `@capacitor-community/sqlite` | `/data/data/com.mutombo.minhaagenda/databases/minha_agendaSQLite.db` |
| Navegador (`npm run dev`) | `jeep-sqlite` (sql.js em WebAssembly) | IndexedDB do navegador, banco `jeepSqliteStore` |

O banco **não é criptografado** (`"no-encryption"` em `sqlite.ts` e `androidIsEncryption: false` em `capacitor.config.ts`).

## 4.1 Esquema

Definido em `lib/database/sqlite.ts`. As tabelas são criadas automaticamente na primeira chamada de `getDb()`.

### Tabela `tasks` — tarefas

| Coluna | Tipo SQLite | Nulo? | Padrão | Campo TS (`Task`) | Descrição |
|---|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | não | — | `id: number` | Identificador |
| `title` | TEXT | não | — | `title: string` | Título (já sem espaços nas pontas) |
| `description` | TEXT | **sim** | — | `description: string \| null` | Detalhes opcionais |
| `date` | TEXT | não | — | `date: string` | Data no formato **`YYYY-MM-DD`** (hora local) |
| `time` | TEXT | não | — | `time: string` | Hora no formato **`HH:mm`** (24 h) |
| `priority` | TEXT | não | `'MEDIUM'` | `priority: Priority` | `'HIGH'`, `'MEDIUM'` ou `'LOW'` |
| `completed` | INTEGER | não | `0` | `completed: boolean` | `0` = pendente, `1` = concluída |
| `reminder_enabled` | INTEGER | não | `0` | `reminderEnabled: boolean` | `1` se o usuário pediu lembrete |
| `notification_id` | INTEGER | **sim** | — | `notificationId: number \| null` | ID da notificação agendada (ou `NULL`) |
| `reminder_offset` | INTEGER | não | `0` | `reminderOffset: number` | Minutos de antecedência do aviso (0 = na hora). Criada na v1.3 pela migração. |
| `repeat_rule` | TEXT | **sim** | — | `repeat: RepeatRule \| null` | Regra de repetição: `DAILY`, `WEEKDAYS`, `WEEKLY` ou `MONTHLY:<dia>` (ex.: `MONTHLY:31`). `NULL` = não repete. Lida/gravada por `parseRepeat`/`serializeRepeat` (`lib/utils/repeat.ts`). Criada na v1.4. |
| `created_at` | TEXT | não | — | `createdAt: string` | ISO 8601 em **UTC** (`new Date().toISOString()`) |
| `updated_at` | TEXT | não | — | `updatedAt: string` | ISO 8601 em UTC, atualizado a cada `updateTask` |

### Tabela `notes` — notas da agenda

| Coluna | Tipo | Nulo? | Campo TS (`Note`) | Descrição |
|---|---|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | não | `id` | Identificador |
| `title` | TEXT | não | `title` | Título (vira "Nota" se vazio) |
| `content` | TEXT | não | `content` | Texto da nota (pode ser string vazia) |
| `date` | TEXT | não | `date` | Dia da agenda a que pertence (`YYYY-MM-DD`) |
| `created_at` | TEXT | não | `createdAt` | ISO 8601 UTC |
| `updated_at` | TEXT | não | `updatedAt` | ISO 8601 UTC |

### Tabela `settings` — configurações chave/valor

| Coluna | Tipo | Descrição |
|---|---|---|
| `id` | INTEGER PK AUTOINCREMENT | Não é usado pelo código |
| `key` | TEXT **UNIQUE** | Nome da configuração |
| `value` | TEXT | Valor (sempre string) |

**Chaves em uso hoje:**

| Chave | Usada em | Significado |
|---|---|---|
| `user_name` | Configurações (grava), Hoje (lê) | Nome exibido na saudação. String vazia = sem nome. |
| `app_lock_enabled` | Segurança (grava), `AppLock` (lê) | `"1"` = bloqueio com biometria ligado. **Do aparelho:** não vai no backup nem é apagada ao restaurar. |
| `notification_sound` | Notificações | `system`, `suave`, `sino`, `digital`, `alerta` ou `silencioso`. Do aparelho. |
| `notification_vibrate` | Notificações | `"1"`/`"0"`. Do aparelho. |
| `last_export_at` | Backup (grava ao exportar), Configurações (lê) | Data/hora ISO do último backup exportado **neste aparelho**. Não vai para o arquivo de backup nem é apagada ao restaurar (`LOCAL_ONLY_SETTINGS`). |

### Índices

```sql
CREATE INDEX IF NOT EXISTS idx_tasks_date      ON tasks(date);
CREATE INDEX IF NOT EXISTS idx_tasks_completed ON tasks(completed);
CREATE INDEX IF NOT EXISTS idx_notes_date      ON notes(date);
```

### Por que datas como texto?

`YYYY-MM-DD` e `HH:mm` como texto **ordenam corretamente** com `ORDER BY` e comparam com `>=` sem conversão. Também evitam problemas de fuso horário: a data é sempre a data **local** do usuário (gerada por `toISODate()` em `lib/utils/date.ts`), nunca UTC.

> ⚠️ **Nunca** gere a data com `new Date().toISOString().slice(0, 10)`. Isso dá a data em UTC e, perto da meia-noite, pode cair no dia errado. Use sempre `todayISO()` ou `toISODate(date)`.

## 4.2 A conexão — `lib/database/sqlite.ts`

| Função | O que faz |
|---|---|
| `getDb(): Promise<SQLiteDBConnection>` | Devolve a conexão pronta. Na primeira chamada: cria o `SQLiteConnection`; no navegador espera o `<jeep-sqlite>` e chama `initWebStore()`; reaproveita ou cria a conexão `minha_agenda` (versão 1, sem criptografia); abre; roda os `CREATE TABLE/INDEX IF NOT EXISTS`. Chamadas seguintes devolvem a mesma conexão. |
| `persistWeb(): Promise<void>` | **Só no navegador:** grava o banco em memória no IndexedDB (`saveToStore`). No Android não faz nada. |
| `closeDb(): Promise<void>` | Fecha a conexão e zera o singleton. Não é chamada em lugar nenhum hoje. |

> ⚠️ **Regra obrigatória:** toda função que **escreve** no banco (`INSERT`, `UPDATE`, `DELETE`) deve chamar `await persistWeb()` no final. Sem isso, a alteração funciona no Android, mas **some ao recarregar a página** no navegador.

## 4.3 Funções de acesso

### `lib/database/tasks.ts`

| Função | Retorno | Descrição |
|---|---|---|
| `createTask(input: NewTaskInput)` | `Promise<Task>` | Insere com `completed = 0` e `notification_id = NULL`. Retorna a tarefa lida de volta do banco. |
| `getTaskById(id)` | `Promise<Task \| null>` | Busca por id. |
| `listTasks()` | `Promise<Task[]>` | Todas as tarefas, `ORDER BY date, time`. |
| `listTasksByDate(date)` | `Promise<Task[]>` | Tarefas de um dia, `ORDER BY time`. |
| `listUpcomingTasks(fromDate, limit = 3)` | `Promise<Task[]>` | Pendentes com `date >= fromDate`, por data e hora, até `limit`. |
| `listTaskDatesBetween(start, end)` | `Promise<string[]>` | Datas distintas com tarefas no intervalo (pontinhos da Agenda). |
| `listOverdueTasks(today)` | `Promise<Task[]>` | Pendentes com `date < today` (atrasadas), da mais antiga para a mais nova. Usada na seção "Atrasadas" da tela Hoje. |
| `updateTask(id, input: UpdateTaskInput)` | `Promise<Task>` | Atualização **parcial**: campos `undefined` mantêm o valor atual. Para apagar a descrição, passe `description: null` (é o que a tela Editar Tarefa faz quando o campo fica vazio). Atualiza `updated_at`. **Não mexe em `notification_id`.** |
| `setTaskNotificationId(id, notificationId \| null)` | `Promise<void>` | Grava só o `notification_id`. Usada pelo módulo de notificações. |
| `toggleTaskCompleted(id)` | `Promise<Task>` | Inverte `completed`. **Exceção:** numa tarefa que se repete e está pendente, não conclui; muda `date` para a próxima ocorrência de hoje em diante (`dateAfterCompletion`). |
| `listRecurringTasks()` | `Promise<Task[]>` | Pendentes com `repeat_rule` preenchido. Usada pela Agenda (repetições previstas e pontinhos) e para renovar os lembretes ao abrir o app. |
| `deleteTask(id)` | `Promise<void>` | Remove a linha. **Não cancela o lembrete** — a tela deve chamar `cancelTaskReminder` antes. |
| `getTodaySummary(today)` | `Promise<TaskSummary>` | `{ urgent, pending, completed }` das tarefas do dia (calculado em JS a partir de `listTasksByDate`). |

### `lib/database/notes.ts`

| Função | Retorno | Descrição |
|---|---|---|
| `createNote({ title, content, date })` | `Promise<Note>` | Insere e devolve a nota. |
| `getNoteById(id)` | `Promise<Note \| null>` | |
| `listNotesByDate(date)` | `Promise<Note[]>` | Notas do dia, `ORDER BY created_at`. |
| `listAllNotes()` | `Promise<Note[]>` | Todas as notas (usada pelo backup). |
| `listNoteDatesBetween(start, end)` | `Promise<string[]>` | Datas distintas com notas no intervalo (pontinhos da Agenda). |
| `updateNote(id, input)` | `Promise<Note>` | Parcial; atualiza `updated_at`. |
| `deleteNote(id)` | `Promise<void>` | |

### `lib/database/settings.ts`

| Função | Descrição |
|---|---|
| `getSetting(key): Promise<string \| null>` | `null` se a chave não existir. |
| `setSetting(key, value): Promise<void>` | *Upsert* (`INSERT … ON CONFLICT(key) DO UPDATE`). |
| `listSettings()` | Todas as chaves e valores (usada pelo backup). |

### `lib/database/replaceAll.ts`

| Função | Descrição |
|---|---|
| `replaceAllData({ tasks, notes, settings }, keepSettingKeys)` | Apaga tudo e insere os dados recebidos **mantendo os ids**, numa **única transação** (`executeSet(set, true)`): se qualquer comando falhar, nada muda. Configurações listadas em `keepSettingKeys` são preservadas. `notification_id` volta como `NULL`. Usada só pela restauração de backup. |

### Tipos (`types/`)

```ts
// types/task.ts
type Priority = "HIGH" | "MEDIUM" | "LOW";
PRIORITY_LABEL = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
PRIORITY_ORDER = ["HIGH", "MEDIUM", "LOW"];   // ordem de exibição
PRIORITY_DOT_CLASS = { HIGH: "bg-priority-high", MEDIUM: "bg-priority-medium", LOW: "bg-priority-low" };

interface NewTaskInput { title; description?: string; date; time; priority; reminderEnabled }
interface UpdateTaskInput extends Partial<Omit<NewTaskInput, "description">> {
  description?: string | null;   // null = apagar; undefined = manter
  completed?: boolean;
}

// types/note.ts
interface NewNoteInput { title; content; date }
type UpdateNoteInput = Partial<NewNoteInput>;
```

## 4.4 Padrões de código para novas funções

Siga o mesmo molde das funções existentes:

```ts
export async function listTasksBetween(start: string, end: string): Promise<Task[]> {
  const db = await getDb();
  const result = await db.query(
    "SELECT * FROM tasks WHERE date BETWEEN ? AND ? ORDER BY date ASC, time ASC",
    [start, end]                       // ✅ sempre parâmetros "?" — nunca concatene strings
  );
  return (result.values as TaskRow[] | undefined)?.map(rowToTask) ?? [];
}
```

- **Leitura** → `db.query(sql, params)` → resultado em `result.values`.
- **Escrita** → `db.run(sql, params)` → id inserido em `result.changes?.lastId` → depois `await persistWeb()`.
- **Vários comandos SQL de uma vez, sem parâmetros** → `db.execute(sqlTexto)` (usado na criação das tabelas).
- Converta booleanos: grave `valor ? 1 : 0`, leia com `!!row.coluna`.

## 4.5 Migrações: como mudar o esquema sem perder dados

O `CREATE TABLE IF NOT EXISTS` só cria tabelas que **não existem**; ele nunca altera uma tabela existente. **Se você só adicionar uma coluna no `CREATE TABLE`, quem já tem o app instalado não recebe a coluna** e o app quebra com `no such column`.

Por isso `lib/database/sqlite.ts` tem um **sistema de migrações de colunas**, que roda em toda abertura do app, logo depois da criação das tabelas e índices:

```ts
const COLUMN_MIGRATIONS: ColumnMigration[] = [
  // Example: { table: "tasks", column: "category", definition: "TEXT" },

  // v1.3 — minutes before the task time to fire the reminder (0 = at the time).
  { table: "tasks", column: "reminder_offset", definition: "INTEGER NOT NULL DEFAULT 0" },

  // v1.4 — recurring tasks: "DAILY" | "WEEKDAYS" | "WEEKLY" | "MONTHLY:<day>" (NULL = no repeat).
  { table: "tasks", column: "repeat_rule", definition: "TEXT" },
];
```

Para cada item, a função `addColumnIfMissing` consulta `PRAGMA table_info(tabela)` e só roda `ALTER TABLE … ADD COLUMN` se a coluna ainda não existir. Por isso a lista pode rodar em toda abertura: em bancos já atualizados, nada acontece. A primeira migração real é a da v1.3 (`reminder_offset`), **testada atualizando um banco criado pela v1.2**: a coluna foi criada, tarefas e notas antigas ficaram intactas e passaram a avisar "na hora". A da v1.4 (`repeat_rule`) foi testada do mesmo jeito, sobre um banco da v1.3.

### Como adicionar uma coluna (ex.: `category` em `tasks`)

1. Acrescente a coluna ao `CREATE_TASKS_TABLE` (para **instalações novas**):
   ```sql
       notification_id INTEGER,
       category TEXT,
       created_at TEXT NOT NULL,
   ```
2. Acrescente uma linha **no final** de `COLUMN_MIGRATIONS` (para **quem já tem o app**):
   ```ts
   const COLUMN_MIGRATIONS: ColumnMigration[] = [
     { table: "tasks", column: "category", definition: "TEXT" },
   ];
   ```
3. Use a coluna em `lib/database/tasks.ts` (`TaskRow`, `rowToTask`, `INSERT`, `UPDATE`).

### Regras

1. **Nunca remova nem reordene** itens de `COLUMN_MIGRATIONS`. Só acrescente no final.
2. A coluna precisa estar **nos dois lugares** (`CREATE TABLE` e `COLUMN_MIGRATIONS`). Em instalação nova ela já nasce na tabela e a migração é pulada.
3. `ADD COLUMN` com `NOT NULL` **exige** `DEFAULT` (ex.: `"INTEGER NOT NULL DEFAULT 0"`). Sem isso o SQLite recusa o comando para tabelas que já têm linhas.
4. Nomes de tabela/coluna vão direto no SQL. Use só constantes do código, nunca texto vindo do usuário.
5. SQLite tem suporte limitado para remover ou renomear colunas. Prefira **adicionar** colunas novas e deixar as antigas sem uso.
6. Para mudanças mais complexas (dividir tabela, mudar tipo, migrar dados), o plugin oferece `addUpgradeStatement` com controle por versão (`DB_VERSION`). Leia a documentação do `@capacitor-community/sqlite` antes de usar.

> ✅ **Testado:** com dados criados pela versão sem migrações, uma versão com duas migrações (`tasks.category TEXT` e `notes.pinned INTEGER NOT NULL DEFAULT 0`) adicionou as colunas, manteve tarefas e notas antigas e abriu de novo sem erros.

O passo a passo completo de "adicionar um campo à tarefa" está em [09 — Guias práticos](09-guias-praticos.md#91-adicionar-um-campo-novo-na-tarefa-ex-categoria).

## 4.6 Backup em arquivo (formato)

O backup é um arquivo JSON gerado por `lib/backup/backup.ts`:

```json
{
  "app": "minha-agenda",
  "format": 1,
  "exportedAt": "2026-10-18T19:59:12.345Z",
  "tasks": [
    { "id": 1, "title": "Consulta médica", "description": "Levar exames",
      "date": "2026-10-25", "time": "10:30", "priority": "HIGH",
      "completed": false, "reminderEnabled": true, "reminderOffset": 15,
      "repeat": "WEEKLY", "createdAt": "…", "updatedAt": "…" }
  ],
  "notes": [
    { "id": 1, "title": "Ideias", "content": "Linha 1\nLinha 2",
      "date": "2026-10-18", "createdAt": "…", "updatedAt": "…" }
  ],
  "settings": [{ "key": "user_name", "value": "Ana" }]
}
```

| Função | Descrição |
|---|---|
| `buildBackup()` | Monta o objeto acima a partir do banco. Não inclui `notification_id` (é do aparelho) nem as chaves de `LOCAL_ONLY_SETTINGS`. |
| `exportBackup()` | Android: grava em `Directory.Cache` (`@capacitor/filesystem`) e abre a janela de compartilhar (`@capacitor/share`). Navegador: baixa o arquivo. Grava `last_export_at`. Devolve `false` se o usuário fechar a janela de compartilhar sem escolher nada. |
| `parseBackup(texto)` | Valida **tudo** antes de qualquer escrita: JSON válido, `app`, `format` não mais novo que o suportado, tipos e formatos de cada campo (data `AAAA-MM-DD`, hora `HH:mm`, prioridade, ids inteiros e únicos). Erros viram `BackupError` com mensagem pronta para o usuário. Configurações repetidas são unificadas (vale a última). |
| `restoreBackup(backup)` | `replaceAllData()` (transação), cancela os lembretes das tarefas antigas e agenda os das tarefas pendentes restauradas. Devolve quantas tarefas/notas e quantos lembretes falharam. |

`repeat` e `reminderOffset` são **opcionais** na leitura: backups da v1.3 ou anteriores (sem esses campos) são aceitos, com "não repete" e "na hora".

**Mudou o formato?** Ao adicionar um campo (ex.: `category`), inclua-o em `buildBackup`, `parseBackup` (com valor padrão quando faltar, para aceitar backups antigos) e `replaceAllData`. Só aumente `BACKUP_FORMAT` se a mudança for **incompatível**, e mantenha o `parseBackup` lendo os formatos antigos.

> 🔐 O arquivo **não é criptografado**: quem tiver o arquivo consegue ler tarefas e notas. Isso é dito ao usuário de forma indireta ("guarde em um lugar seguro"); se o app passar a guardar dados sensíveis, considere criptografar com uma senha.

## 4.7 Inspecionando o banco

### No Android (Android Studio)

1. Rode o app em modo **debug** num emulador ou aparelho.
2. *View → Tool Windows → **App Inspection*** → aba **Database Inspector**.
3. Selecione o processo `com.mutombo.minhaagenda` e o banco `minha_agendaSQLite.db`.
4. Você pode ver as tabelas e rodar SQL ao vivo.

Via linha de comando (apenas builds *debug*):

```bash
adb shell run-as com.mutombo.minhaagenda ls databases/
adb exec-out run-as com.mutombo.minhaagenda cat databases/minha_agendaSQLite.db > copia.db
# abra copia.db no DB Browser for SQLite (sqlitebrowser.org)
```

### No navegador

F12 → *Application* → *IndexedDB* → `jeepSqliteStore`. O banco fica salvo como um blob binário (não dá para ler as tabelas ali). Para consultar, use um `console.log` temporário numa função de `lib/database/`, ou exporte com as funções do plugin.

### Apagar todos os dados

- **Android:** *Configurações do sistema → Apps → Minha Agenda → Armazenamento → Limpar dados* (ou desinstalar).
- **Navegador:** F12 → *Application* → *Clear site data*.
