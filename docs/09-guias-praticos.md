# 9. Guias práticos (receitas)

Passo a passo para as mudanças mais comuns. Em todas elas, **termine com a checagem final** da seção [9.10](#910-checklist-antes-de-entregar-qualquer-mudança).

---

## 9.1 Adicionar um campo novo na tarefa (ex.: categoria)

Mexe em 5 lugares, sempre nesta ordem: **tipo → esquema → migração → acesso ao banco → telas**.

**1. Tipo** — `types/task.ts`

```ts
export interface Task {
  // ...campos existentes
  category: string | null;
}

export interface NewTaskInput {
  // ...campos existentes
  category?: string;
}
```

**2. Esquema para instalações novas** — `lib/database/sqlite.ts`, dentro de `CREATE_TASKS_TABLE`:

```sql
    notification_id INTEGER,
    category TEXT,                -- ← nova coluna
    created_at TEXT NOT NULL,
```

**3. Migração para quem já tem o app instalado** — também em `sqlite.ts`, acrescente uma linha **no final** de `COLUMN_MIGRATIONS` (detalhes em [04 — Banco de dados §4.5](04-banco-de-dados.md#45-migrações-como-mudar-o-esquema-sem-perder-dados)):

```ts
const COLUMN_MIGRATIONS: ColumnMigration[] = [
  { table: "tasks", column: "category", definition: "TEXT" },
];
```

**4. Acesso ao banco** — `lib/database/tasks.ts`

```ts
interface TaskRow {
  // ...
  category: string | null;
}

function rowToTask(row: TaskRow): Task {
  return {
    // ...
    category: row.category,
  };
}
```

No `createTask`, inclua a coluna no `INSERT` e o valor na lista (a posição dos `?` precisa bater com a lista):

```ts
`INSERT INTO tasks
  (title, description, date, time, priority, completed, reminder_enabled, notification_id, category, created_at, updated_at)
 VALUES (?, ?, ?, ?, ?, 0, ?, NULL, ?, ?, ?)`,
[input.title, input.description ?? null, input.date, input.time, input.priority,
 input.reminderEnabled ? 1 : 0, input.category ?? null, now, now]
```

No `updateTask`, adicione `category` ao objeto `merged` e ao `UPDATE … SET`.

**5. Telas**

- **Backup:** inclua `category` em `buildBackup`, `parseBackup` (com padrão quando faltar, para aceitar backups antigos) e `replaceAllData` ([04 §4.6](04-banco-de-dados.md#46-backup-em-arquivo-formato)).
- `components/TaskForm.tsx`: acrescente `category: string` em `TaskFormValues`, um `useState` inicializado com `initialValues.category`, um `<Field label="Categoria">` com o input e `category` no objeto passado ao `onSubmit`. Como o formulário é compartilhado, **Nova** e **Editar** ganham o campo de uma vez.
- `app/tarefas/nova/page.tsx`: `category: ""` em `initialValues` e `category: values.category || undefined` no `createTask`.
- `app/tarefas/editar/page.tsx`: `category: task.category ?? ""` em `initialValues` e `category: values.category || null` no `updateTask` (ajuste `UpdateTaskInput` para aceitar `null`, como já é feito com `description`).
- `components/TaskDetailSheet.tsx` (e/ou `TaskCard.tsx`): exibir `task.category`.

**6. Teste os dois cenários**

- **Banco novo:** no navegador, *Clear site data* → criar tarefa com categoria.
- **Banco antigo:** instale no celular a versão **anterior** do app, crie tarefas, depois instale a nova **por cima** (sem desinstalar). As tarefas antigas devem aparecer com categoria vazia e o app não pode dar erro.

---

## 9.2 Criar uma tela nova e uma aba na barra inferior

Exemplo: tela **Estatísticas** em `/estatisticas`.

**1.** Crie `app/estatisticas/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";
import BottomNavigation from "@/components/BottomNavigation";
import { listTasks } from "@/lib/database/tasks";
import type { Task } from "@/types/task";

export default function EstatisticasPage() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    listTasks().then(setTasks);
  }, []);

  const done = tasks.filter((t) => t.completed).length;

  return (
    <>
      <main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">
        <h1 className="text-xl font-semibold text-foreground">Estatísticas</h1>
        <div className="mt-5 rounded-2xl bg-surface px-5 py-4">
          <p className="text-2xl font-semibold text-accent">{done}/{tasks.length}</p>
          <p className="mt-1 text-sm text-muted">tarefas concluídas</p>
        </div>
      </main>
      <BottomNavigation />
    </>
  );
}
```

**2.** Adicione a aba em `components/BottomNavigation.tsx`:

```ts
import { Home, Calendar, ListChecks, BarChart3 } from "lucide-react";

const TABS = [
  { href: "/", label: "Hoje", icon: Home },
  { href: "/agenda", label: "Agenda", icon: Calendar },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
  { href: "/estatisticas", label: "Estatísticas", icon: BarChart3 },
];
```

**3.** `npm run dev` e confira. A rota passa a existir automaticamente (a pasta define a URL).

Regras para telas novas:

- Comece sempre com `"use client"`.
- Carregue dados no `useEffect` (nada de `async` no componente da página nem de *Server Components* com banco).
- Telas principais incluem `<BottomNavigation/>` e usam `pb-28`; telas secundárias têm botão "Voltar" (`router.back()`) e usam `pb-10`.
- **Não** use rota dinâmica `[id]`. Use `?id=`, como a tela de edição (veja 9.3).
- **Painel ou diálogo novo?** Chame `useBackHandler(true, onClose)` dentro dele, para o botão voltar do Android fechá-lo em vez de trocar de tela ([06 §6.4](06-telas-e-componentes.md#64-botão-voltar-libnavigationbackbuttonts)). Para ações destrutivas, use o `ConfirmDialog`.

---

## 9.3 Como a edição de tarefa funciona (e como reaproveitar o padrão)

A edição já está implementada. Vale entender o desenho, porque ele serve de modelo para outras telas de "editar algo pelo id".

**Peças:**

| Arquivo | Papel |
|---|---|
| `components/TaskForm.tsx` | Formulário único (campos, validação, mensagens, aviso de lembrete). Não acessa o banco. |
| `app/tarefas/nova/page.tsx` | Valores iniciais vazios + `onSubmit` que **cria** |
| `app/tarefas/editar/page.tsx` | Carrega a tarefa pelo `?id=`, valores iniciais preenchidos + `onSubmit` que **atualiza** |
| `components/TaskDetailSheet.tsx` | Botão **Editar** (`onEdit`) |
| `app/tarefas/page.tsx` | `onEdit` → ``router.push(`/tarefas/editar?id=${task.id}`)`` |

**Por que `?id=` e não `/tarefas/[id]`?** Na exportação estática, rotas dinâmicas precisam conhecer todos os ids no momento do build, e os ids só existem no celular do usuário. Com parâmetro de busca existe **uma** página (`editar.html`) que lê o id em tempo de execução. O `useSearchParams` exige `<Suspense>` em volta, senão o `next build` falha:

```tsx
export default function EditarTarefaPage() {
  return (
    <Suspense fallback={null}>
      <EditarTarefa />
    </Suspense>
  );
}

function EditarTarefa() {
  const id = Number(useSearchParams().get("id"));
  // carrega com getTaskById(id); se não existir → router.replace("/tarefas")
}
```

**Ordem do lembrete ao editar:** primeiro `cancelTaskReminder`, depois `syncTaskReminder`. Se fosse só o `sync` e o novo horário estivesse no passado, o `scheduleTaskReminder` não agendaria nada e o lembrete **antigo** continuaria valendo.

**Para criar outra tela de edição** (ex.: editar nota em tela cheia): siga o mesmo trio. Formulário em `components/`, uma página fina que cria e outra que carrega por `?id=` e atualiza, e o `onSubmit` respeitando o contrato descrito em [06 — TaskForm](06-telas-e-componentes.md#taskform).

---

## 9.4 Adicionar uma nova configuração

Exemplo: "mostrar frase do dia" (liga/desliga).

1. Escolha uma **chave** em `snake_case`: `show_quote`. Valores sempre como texto: `"1"` / `"0"`.
2. Em `app/configuracoes/page.tsx`: leia com `getSetting("show_quote")` no `useEffect` e grave com `setSetting("show_quote", valor ? "1" : "0")`.
3. Onde for usar (tela Hoje): `const show = (await getSetting("show_quote")) !== "0";` (o padrão quando não existe é "ligado").
4. Registre a chave na tabela "Chaves em uso" de [04 — Banco de dados](04-banco-de-dados.md#tabela-settings--configurações-chavevalor).

> 💡 Se as chaves começarem a se espalhar, crie em `lib/database/settings.ts` uma constante `SETTINGS_KEYS = { userName: "user_name", showQuote: "show_quote" } as const` para evitar erro de digitação.

---

> ⚠️ **Configuração que só vale para este aparelho** (ex.: a data do último backup, um "não mostrar de novo"): adicione a chave em `LOCAL_ONLY_SETTINGS` (`lib/backup/backup.ts`). Assim ela não vai para o arquivo de backup e não é apagada ao restaurar.

## 9.5 Oferecer outra antecedência de aviso

Para incluir, por exemplo, "2 h antes": adicione `{ minutes: 120, label: "2 h antes" }` em `REMINDER_OFFSETS` (`types/task.ts`), na posição em que deve aparecer. Nada mais muda: o banco guarda minutos, o cálculo (`reminderTimeFor`) aceita qualquer valor e o texto do detalhe usa `reminderOffsetLabel`.

### E um novo tipo de repetição? (ex.: "a cada 2 semanas")

1. `lib/utils/repeat.ts`: inclua o tipo em `RepeatKind`, o formato salvo em `serializeRepeat`/`parseRepeat` (ex.: `"EVERY_N_WEEKS:2"`), a regra em `occursOn` e o texto em `repeatLabel`. Adicione a opção em `REPEAT_OPTIONS`.
2. `components/TaskForm.tsx`: frase em `repeatHint`. Se o tipo tiver parâmetro (o "2"), um campo para ele.
3. `ruleFor()`: monte a regra a partir do formulário.
4. **Testes:** acrescente casos em `tests/repeat.test.ts`, inclusive virada de mês e de ano, e rode `npm test`.
5. Banco e backup não mudam: a regra é guardada como texto em `repeat_rule`. Mas backups com o tipo novo serão recusados por versões antigas do app, que não o conhecem.

## 9.6 Adicionar um novo som de notificação

1. **Crie o arquivo:** WAV curto (1–2 s), mono, com nome só de minúsculas, números e `_` (ex.: `lembrete_passaros.wav`). Pode sintetizar um novo em `scripts/make_sounds.py` (rode `python3 scripts/make_sounds.py <pasta>`) ou usar um arquivo próprio. ⚠️ Só use áudio que você tem direito de distribuir.
2. **Copie para dois lugares:** `android/app/src/main/res/raw/` (Android) e `public/sounds/` (prévia ▶).
3. **Registre a opção** em `SOUND_OPTIONS` (`lib/notifications/sound.ts`): `{ id: "passaros", label: "Pássaros", file: "lembrete_passaros.wav" }` e inclua `"passaros"` no tipo `SoundId`.
4. `npm test`: o teste de som confere se o nome do arquivo e o id do canal são válidos para o Android.
5. `npm run build && npx cap sync android` e teste com "Enviar notificação de teste".

> 💡 Para mudar um som **existente**, troque o arquivo **e** o nome dele (ex.: `lembrete_sino2.wav`). O Android guarda o som no canal; com o mesmo nome, quem já escolheu "Sino" pode continuar ouvindo o arquivo antigo até trocar de opção.

## 9.7 Adicionar/alterar frases do dia

Edite o array `QUOTES` em `lib/utils/quotes.ts`. Nada mais é necessário: a escolha usa `QUOTES.length` automaticamente.

---

## 9.8 Adicionar um novo plugin do Capacitor

Exemplo: compartilhar uma tarefa (`@capacitor/share`).

```bash
npm install @capacitor/share
npm run build
npx cap sync android        # registra o plugin no projeto Android
```

Use no código (`import { Share } from "@capacitor/share"`). Verifique na documentação do plugin se ele exige **permissões** no `AndroidManifest.xml` ou configuração em `capacitor.config.ts`. Sempre teste no aparelho: muitos plugins se comportam diferente (ou não funcionam) no navegador. Para código que só faz sentido no celular, proteja com:

```ts
import { Capacitor } from "@capacitor/core";
if (Capacitor.isNativePlatform()) { /* ... */ }
```

---

## 9.9 Mudar o nome exibido do app

| Onde | Arquivo |
|---|---|
| Nome sob o ícone no Android | `android/app/src/main/res/values/strings.xml` (`app_name` e `title_activity_main`) |
| Config do Capacitor | `capacitor.config.ts` → `appName` |
| Título da página | `app/layout.tsx` → `metadata.title` |
| Rodapé de Configurações | `app/configuracoes/page.tsx` |

> ⚠️ Não confunda com o **`appId`** (`com.mutombo.minhaagenda`): mudar o ID cria outro app. Veja [08 §8.8](08-android-build-e-publicacao.md#88-configuração-nativa--onde-fica-cada-coisa).

---

## 9.10 Checklist antes de entregar qualquer mudança

```bash
npx next typegen && npx tsc --noEmit   # sem erros de tipo
npm run lint                           # sem erros
npm test                               # "Todos os testes passaram." 
npm run build                          # o build estático precisa passar
```

Depois:

- [ ] Testou no navegador (`npm run dev`), incluindo **recarregar a página** (para confirmar que os dados persistiram → `persistWeb()`).
- [ ] Se mexeu em banco, notificações ou plugins: testou **no Android** (`npm run build && npx cap sync android` → Run).
- [ ] Se mudou o esquema do banco: testou a **atualização por cima** de uma versão anterior (9.1, passo 6).
- [ ] Atualizou esta documentação, se algo descrito aqui mudou.
