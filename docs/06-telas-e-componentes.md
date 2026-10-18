# 6. Telas e componentes (referência)

Todas as telas começam com `"use client"`, porque usam estado, efeitos e o banco local. Os componentes ficam em `components/` e **não acessam o banco**: recebem dados e funções por *props*.

## 6.1 Telas (`app/`)

### `app/layout.tsx` — layout raiz

- Exporta `metadata` (título "Minha Agenda", descrição) e `viewport` (sem zoom, `themeColor #0b0b10`).
- Estrutura: `<html lang="pt-BR">` → `<body>` → `<AppInit/>` + coluna central `max-w-md` com a tela atual.
- Usa o tipo global `LayoutProps<"/">` (gerado automaticamente pelo Next.js 16 em `.next/types`).

### `app/page.tsx` — **Hoje** (`HojePage`)

| Estado | Tipo | Conteúdo |
|---|---|---|
| `userName` | `string` | Configuração `user_name` |
| `summary` | `TaskSummary` | `{ urgent, pending, completed }` de hoje |
| `upcoming` | `Task[]` | Até 3 próximas pendentes |
| `overdue` | `Task[]` | Todas as pendentes de dias anteriores (`listOverdueTasks`) |
| `loading` | `boolean` | Esconde a lista até a 1ª carga |

- `load()` busca as quatro informações **em paralelo** (`Promise.all`).
- Seção **Atrasadas**: só renderiza se `overdue.length > 0`. Mostra até `MAX_OVERDUE_SHOWN` (= 3) cards; acima disso, o link "+N na lista" leva a `/tarefas`.
- `handleToggle(task)` → `toggleTaskCompleted` → `syncTaskReminder` → `load()`.
- Componente interno `StatCard({ value, label, color })` para os três contadores.
- Os cards de "Próximas tarefas" usam `TaskCard` com `showDate` (mostram "Hoje", "Amanhã"…).

### `app/agenda/page.tsx` — **Agenda** (`AgendaPage` → `Agenda`)

O conteúdo fica em `Agenda`, dentro de `<Suspense>`, porque usa `useSearchParams` (exigência da exportação estática).

| Estado | Tipo | Conteúdo |
|---|---|---|
| `selectedDate` | `string` (YYYY-MM-DD) | Dia exibido. Valor inicial: `?date=` da URL (se válido) ou hoje. |
| `weekStart` | `string` | Dia **central** da tira de 7 dias (o nome é enganoso: não é o início da semana) |
| `tasks` | `Task[]` | Tarefas do dia (`listTasksByDate`) |
| `projected` | `Task[]` | Tarefas repetidas cuja data atual é **anterior** ao dia selecionado e que ocorrem nele (`occursOn`). Exibidas como previstas. |
| `notes` | `Note[]` | Notas do dia (`listNotesByDate`) |
| `busyDates` | `Set<string>` | Dias da tira com pelo menos uma tarefa ou nota (pontinhos) |
| `selectedTask` | `Task \| null` | Tarefa aberta no `TaskDetailSheet` |
| `editingNote` | `Note \| null` | Nota em edição (`null` = criando nova) |
| `showNoteForm` | `boolean` | Painel de nota aberto |
| `loading` | `boolean` | |

- `loadDay(date)` busca tarefas, notas e `listRecurringTasks()` em paralelo, e calcula `projected`. Tarefas reais e previstas são mostradas juntas, ordenadas pela hora. `loadMarkers(week)` junta as datas com tarefas e notas e os dias da semana em que alguma tarefa repetida ocorre. `refresh()` chama os dois depois de qualquer alteração.
- `setSelectedDate(date)` muda a seleção **e** grava na URL com `router.replace("/agenda?date=…")` (sem criar histórico). Tocar num dia usa só esta função: a tira fica parada, para não "pular" sob o dedo.
- `selectDate(date)` também recentraliza a tira. É usado pelo link "Hoje" e por `shiftWeek(-1 | 1)` (`addDays(weekStart, ±7)`).
- Tarefas: `openNewTask()` → `/tarefas/nova?date=<selectedDate>`; toggle → `toggleTaskCompleted` + `syncTaskReminder`; excluir → `cancelTaskReminder` + `deleteTask`; editar → `/tarefas/editar?id=…`.
- Componentes internos: `SectionHeader({ title, addLabel, onAdd })` (título + botão "+ Tarefa/Nota") e `EmptyLine({ text })` (linha tracejada de lista vazia).
- O botão "+" roxo desta tela abre **nova nota** (é um `<button>` próprio, não o `FloatingButton`, que é um link).

### `app/tarefas/page.tsx` — **Tarefas** (`TarefasPage`)

| Estado | Tipo | Conteúdo |
|---|---|---|
| `tasks` | `Task[]` | Todas as tarefas |
| `filter` | `"all" \| "pending" \| "completed"` | Filtro ativo |
| `searchOpen` | `boolean` | Caixa de busca visível |
| `query` | `string` | Texto da busca |
| `selected` | `Task \| null` | Tarefa aberta no painel de detalhe |

- `filtered` (memo): aplica filtro + busca (`title.toLowerCase().includes(q)`).
- `grouped` (memo): `Map<Priority, Task[]>` na ordem de `PRIORITY_ORDER`.
- Cada `TaskCard` (com `showDate`) fica dentro de um `<div onClick={() => setSelected(task)}>`. O botão de concluir do card usa `stopPropagation()` para não abrir o painel junto.
- Botão da lupa: ao **fechar**, também faz `setQuery("")`, para a lista nunca ficar filtrada por um texto invisível. O `aria-label` alterna entre "Pesquisar" e "Fechar pesquisa".
- `handleDelete(task)` → `cancelTaskReminder` → `deleteTask` → fecha painel → `load()`.
- `onEdit` do painel → ``router.push(`/tarefas/editar?id=${task.id}`)``.

### `app/tarefas/nova/page.tsx` — **Nova Tarefa** (`NovaTarefaPage` → `NovaTarefa`)

Página fina sobre o componente [`TaskForm`](#taskform). Fica dentro de `<Suspense>` porque lê `?date=`.

- `initialValues`: título/descrição vazios, data = `?date=` (se for `AAAA-MM-DD` válido) ou `todayISO()`, `nowHHMM()`, `"MEDIUM"`, lembrete ligado, `reminderOffset: 0`. Calculados **uma vez** na montagem (`useState(() => …)`).
- `handleSubmit(values)`: `createTask` (se lançar erro, o formulário mostra "Não foi possível salvar") → se lembrete ligado, `scheduleTaskReminder` dentro de `try`; se falhar, devolve `{ reminderFailed: true }`.

### `app/tarefas/editar/page.tsx` — **Editar Tarefa** (`EditarTarefaPage`)

- URL: `/tarefas/editar?id=N`. Usa `useSearchParams` (por isso o conteúdo fica dentro de `<Suspense>`) em vez de rota dinâmica `[id]`, que não funciona na exportação estática.
- Carrega a tarefa com `getTaskById`. Se não existir, `router.replace("/tarefas")`. Enquanto carrega, não renderiza nada.
- Renderiza `TaskForm` com os dados atuais e `key={task.id}` (garante que o formulário reinicie se o id mudar).
- `handleSubmit(values)`:
  1. `updateTask(id, {...})`. Descrição vazia vira `null` (apaga). O campo `completed` não é alterado.
  2. Se a tarefa não tinha lembrete e continua sem, termina aqui.
  3. Senão: `cancelTaskReminder` **e depois** `syncTaskReminder`. O cancelamento vem primeiro porque, se o novo horário estiver no passado, `scheduleTaskReminder` não agenda nada e o lembrete antigo continuaria valendo.
  4. Falha no passo 3 → `{ reminderFailed: true }` (aviso, sem perder a edição).

### `app/configuracoes/page.tsx` — **Configurações** (`ConfiguracoesPage`)

- Lê `user_name` ao montar; `handleSave` grava `name.trim()` e mostra "Salvo!" por 1500 ms.
- Rodapé com a versão lida de `package.json` (`import { version } from "@/package.json"`). Não edite o texto: mude a versão no `package.json` ([08 §8.5](08-android-build-e-publicacao.md#85-versão-do-app)).
- Inclui o componente `BackupSection` (veja abaixo).

## 6.2 Componentes (`components/`)

### `AppInit`
Sem props. Montado uma vez no layout. Em `useEffect`:
- `ensureNotificationPermission()` (erros ignorados) e, em seguida, **só no Android**, `refreshAllReminders()` (renova os avisos das tarefas repetidas e põe todos no canal de som atual);
- `installBackButtonHandling()` (botão voltar do Android, veja [6.4](#64-botão-voltar-libnavigationbackbuttonts));
- `recordScreenVisit()` a cada troca de tela (`usePathname`), para o `TaskForm` saber se pode voltar com segurança.

Renderiza `<JeepSqlite/>`.

### `AppLock`

| Prop | Tipo | Descrição |
|---|---|---|
| `children` | `ReactNode` | O app inteiro (usado em `app/layout.tsx`) |

Estados: `checking` (lendo a configuração; a tela fica coberta, sem botão) → `locked` (tela de bloqueio) ou `unlocked`. Mais `covered` (app em segundo plano).

- **Ao abrir:** se `app_lock_enabled` for "1", confere `getLockSupport()`. Se o aparelho não tiver mais biometria **nem** PIN de tela, **desliga o bloqueio** em vez de trancar o usuário. Caso contrário, bloqueia e chama `authenticate()` automaticamente. Qualquer erro → libera o app, para nunca travar.
- **Segundo plano:** no Android usa `App.addListener("appStateChange")`; no navegador, `visibilitychange`. Ao sair, cobre o conteúdo e marca a hora; ao voltar, bloqueia se ficou fora ≥ `LOCK_AFTER_BACKGROUND_MS` (30 s), senão só descobre.
- **Armadilha tratada:** a tela de biometria do Android é outra *activity*, então abrir o pedido faz o app "pausar e voltar". Durante a autenticação (`authenticating`) e por 1,5 s depois dela (`ignoreEventsUntil`), esses eventos são ignorados. Sem isso, o app pediria a digital em loop.
- Escuta o evento `LOCK_CHANGED_EVENT` (disparado por `setLockEnabled`), para começar ou parar de vigiar o segundo plano assim que o usuário muda a opção.
- Na tela de bloqueio, o botão voltar chama `App.minimizeApp()` (via `useBackHandler`).

### `SecuritySection`

Sem props. Bloco "Segurança" de Configurações. Mostra o interruptor "Bloquear com digital/rosto" conforme `getLockSupport().methodLabel`. **Ligar e desligar exigem `authenticate()`**. Fica desabilitado, com o motivo, se o aparelho não tiver biometria nem PIN. No navegador, avisa que a biometria é simulada.

### `NotificationSoundSection`

Sem props. Bloco "Notificações" de Configurações:
- lista `SOUND_OPTIONS` como `role="radio"`; escolher chama `applyReminderSound()` e mostra o resultado (ou desfaz a escolha em caso de erro);
- botão ▶/■ por som com arquivo: prévia com `new Audio("/sounds/<arquivo>")`;
- interruptor "Vibrar" (desabilitado no Silencioso);
- "Enviar notificação de teste" (só no Android) → `sendTestNotification(3)`;
- texto explicando como usar um toque do próprio celular.

### `BackupSection`

Sem props. Bloco "Backup" da tela Configurações (exceção consciente à regra "componentes não acessam o banco"; veja [03 §3.3](03-arquitetura.md#33-camadas-e-regras-de-dependência)).

- Lê `last_export_at` para mostrar "Último backup: dd/mm/aaaa" ou o aviso laranja de que nunca houve backup.
- **Exportar** → `exportBackup()`. Se o usuário fechar a janela de compartilhar, não mostra nada.
- **Restaurar** → abre um `<input type="file">` escondido, **sem filtro `accept`**: no Android, arquivos `.json` costumam vir com tipo genérico e ficariam cinza no seletor. O conteúdo é validado por `parseBackup()`.
- Arquivo válido → `ConfirmDialog` "Restaurar backup?" com as contagens do arquivo e do app atual → `restoreBackup()`.
- Mensagens em `role="status"`: verde (sucesso) ou vermelho (erro).

### `ConfirmDialog`

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `title` | `string` | — | Ex.: "Excluir tarefa?" |
| `message` | `string` | — | Texto explicativo |
| `confirmLabel` | `string` | `"Excluir"` | Texto do botão vermelho |
| `onConfirm` | `() => void` | — | Usuário confirmou |
| `onCancel` | `() => void` | — | "Cancelar", toque fora ou botão voltar |

Janela centralizada em `z-40` (acima dos painéis). Usa `role="alertdialog"`. Já registra `useBackHandler`, então o voltar do Android a fecha. Usada por `TaskDetailSheet` e `NoteFormSheet`. Para outra ação destrutiva, basta guardar um estado `confirming` e renderizar `{confirming && <ConfirmDialog … />}`.

### `JeepSqlite`
Sem props. **Só no navegador** (`Capacitor.getPlatform() === "web"`): importa `jeep-sqlite/loader` dinamicamente, registra o *custom element* e insere um `<jeep-sqlite>` no DOM. O elemento é criado via `document.createElement` porque o React/TypeScript não conhece essa tag no JSX. No Android, não faz nada.

### `BottomNavigation`
Sem props. Barra fixa no rodapé com as abas definidas na constante `TABS`:

```ts
const TABS = [
  { href: "/",        label: "Hoje",    icon: Home },
  { href: "/agenda",  label: "Agenda",  icon: Calendar },
  { href: "/tarefas", label: "Tarefas", icon: ListChecks },
];
```

Respeita a área segura inferior do aparelho (`env(safe-area-inset-bottom)`). Para adicionar uma aba, veja [Guias práticos](09-guias-praticos.md#92-criar-uma-tela-nova-e-uma-aba-na-barra-inferior).

### `FloatingButton`

| Prop | Tipo | Descrição |
|---|---|---|
| `href` | `string` | Rota aberta ao tocar |

Botão "+" roxo fixo (`bottom-24 right-5`, acima da barra inferior). É um `<Link>`.

### `TaskForm`

Formulário completo de tarefa, usado por **Nova Tarefa** e **Editar Tarefa**. Inclui cabeçalho (← Voltar, título, ✓ Salvar), campos, validação, mensagens e o aviso de lembrete.

| Prop | Tipo | Descrição |
|---|---|---|
| `heading` | `string` | Título do cabeçalho ("Nova Tarefa" / "Editar Tarefa") |
| `submitLabel` | `string` | Texto do botão principal ("Salvar Tarefa" / "Salvar alterações") |
| `initialValues` | `TaskFormValues` | `{ title, description, date, time, priority, reminderEnabled, reminderOffset }`. Lidos só na montagem. |
| `onSubmit` | `(values) => Promise<TaskFormResult>` | Grava os dados. Recebe valores **já validados e com `trim()`**. |

**Contrato do `onSubmit`** (respeite-o se criar outra tela com este formulário):

| O `onSubmit`… | O formulário… |
|---|---|
| **lança erro** | entende que **nada foi salvo**: mostra "Não foi possível salvar a tarefa. Tente novamente." e reabilita os botões |
| devolve `{ reminderFailed: true }` | entende que **a tarefa foi salva** mas o lembrete falhou: mostra o aviso laranja com "Continuar" e **esconde** os botões de salvar (evita duplicata) |
| devolve `{ reminderFailed: false }` | volta para a tela anterior (`finish()`: `router.back()`, ou `/tarefas` se não houver histórico) |

Validações internas: título obrigatório; data e hora obrigatórias. Componente interno `Field({ label, children })`. O interruptor de lembrete é um `<button role="switch" aria-checked>`. Com o lembrete ligado, aparece o grupo **"Quando avisar"** (`role="radiogroup"`) com os chips de `REMINDER_OFFSETS`. O grupo **"Repetir"** usa `REPEAT_OPTIONS` e guarda `repeatKind` (`null` = não repete). Abaixo dele, a função interna `repeatHint(kind, date)` mostra a frase "Repete toda sexta-feira." etc. A página converte `repeatKind` + data em regra com `ruleFor()`; no mensal, o dia do mês vem da data escolhida.

`finish()` volta para a tela anterior só se `canGoBackInApp()` (há uma tela do app antes desta); senão faz `router.replace("/tarefas")`. Isso evita sair do app quando o formulário foi a primeira tela aberta (link direto).

### `TaskCard`

| Prop | Tipo | Padrão | Descrição |
|---|---|---|---|
| `task` | `Task` | — | Tarefa exibida |
| `onToggle` | `(task: Task) => void` | — | Chamado ao tocar no círculo |
| `showDate` | `boolean` | `false` | Mostra o dia embaixo da hora, com `relativeDayLabel()`: "Hoje", "Amanhã", "Ontem", "dd/mm" ou "dd/mm/aa". Usado nas telas Hoje e Tarefas. |
| `projected` | `boolean` | `false` | Card de **repetição prevista** (Agenda, dias futuros): esmaecido, etiqueta "↻ Prevista" e **sem círculo**. |

- Título riscado e acinzentado quando concluída; ícone `CheckCircle2` roxo × `Circle`.
- Tarefas que se repetem mostram "↻ Repete" ao lado da prioridade, e o círculo tem `aria-label` "Concluir e passar para a próxima data".
- Com `showDate`, se a tarefa está **pendente** e `task.date < hoje`, o dia aparece em **vermelho** (`text-priority-high`), indicando atraso.

### `TaskDetailSheet`

| Prop | Tipo | Descrição |
|---|---|---|
| `task` | `Task` | Tarefa exibida |
| `onClose` | `() => void` | Fechar (X) |
| `onDelete` | `(task: Task) => void` | Botão vermelho "Excluir" |
| `onEdit` | `(task: Task) => void` | Botão roxo "Editar" |

Se a tarefa se repete, mostra a regra (`repeatLabel`: "Todo dia", "Toda semana (sexta)", "Todo mês (dia 31)"). A confirmação de exclusão avisa que **todas as próximas repetições** serão excluídas. Mostra também o status do lembrete com a antecedência: "Lembrete: na hora", "Lembrete: 15 min antes" ou "Sem lembrete" (`reminderOffsetLabel`).

Painel que sobe da parte de baixo com fundo escurecido. Fecha pelo X, **tocando no fundo escuro** ou pelo **botão voltar** (`useBackHandler`). "Excluir" primeiro abre um `ConfirmDialog`; `onDelete` só é chamado após a confirmação.

### `NoteCard`

| Prop | Tipo | Descrição |
|---|---|---|
| `note` | `Note` | Nota exibida (título + conteúdo com quebras de linha preservadas) |
| `onEdit` | `(note: Note) => void` | Botão lápis |

### `NoteFormSheet`

| Prop | Tipo | Descrição |
|---|---|---|
| `note` | `Note \| null` | `null` = nova nota; objeto = edição (preenche os campos) |
| `onClose` | `() => void` | Fechar sem salvar |
| `onSave` | `(input: { title; content }) => void` | Salvar. Título vazio vira `"Nota"`. |
| `onDelete?` | `(note: Note) => void` | Se informado **e** em edição, mostra a lixeira. Chamado só **depois** da confirmação no `ConfirmDialog`. |

Fecha pelo X ou pelo **botão voltar** (sem salvar). Tocar no fundo escuro **não** fecha, de propósito, para o usuário não perder o texto digitado.

> ⚠️ O estado inicial vem de `note` só na **montagem**. Funciona porque a tela desmonta o painel ao fechar (`{showForm && …}`). Se mudar para um painel sempre montado, use `key={note?.id ?? "new"}` para reiniciar os campos.

### `PriorityBadge`

| Prop | Tipo |
|---|---|
| `priority` | `Priority` |

Bolinha + texto colorido ("Alta" vermelho, "Média" laranja, "Baixa" verde). A cor da bolinha vem de `PRIORITY_DOT_CLASS` (`types/task.ts`), a mesma usada no `TaskForm`.

### `EmptyState`

| Prop | Tipo | Descrição |
|---|---|---|
| `icon` | `LucideIcon` | Ícone do lucide-react (ex.: `ListTodo`) |
| `title` | `string` | Título |
| `description` | `string` | Texto de apoio |

Caixa com borda tracejada usada quando uma lista está vazia.

## 6.3 Utilitários (`lib/utils/`)

### `date.ts`

| Função | Exemplo de entrada → saída |
|---|---|
| `todayISO()` | → `"2026-10-18"` (data **local**) |
| `toISODate(date: Date)` | `new Date(2026, 9, 18)` → `"2026-10-18"` |
| `nowHHMM()` | → `"19:24"` (hora local atual) |
| `relativeDayLabel(iso, today?)` | `"Hoje"`, `"Amanhã"`, `"Ontem"`, `"10/03"` (mesmo ano) ou `"10/03/27"` (outro ano). Curto de propósito, para caber embaixo da hora no `TaskCard`. |
| `addDays(iso, n)` | `addDays("2026-10-28", 7)` → `"2026-11-04"` (aceita `n` negativo; vira mês/ano corretamente) |
| `fromISODate(iso)` | `"2026-10-18"` → `Date` à meia-noite local |
| `formatLongDate(iso)` | → `"Domingo, 18 de Outubro"` |
| `formatShortDate(iso)` | → `"18/10/2026"` |
| `formatDayMonth(iso)` | → `"18/10"` |
| `weekdayShort(iso)` | → `"DOM"` |
| `weekAround(iso)` | → 7 datas: 3 antes, a própria, 3 depois |
| `greeting()` | → `"Bom dia"` / `"Boa tarde"` / `"Boa noite"` conforme a hora atual |

Nomes de dias e meses estão em listas fixas em português (não usa `Intl`), então o resultado não depende do idioma do aparelho.

### `quotes.ts`

| Função | Descrição |
|---|---|
| `quoteOfTheDay(dateISO)` | Soma ano + mês + dia e usa o resto da divisão pelo total de frases da lista `QUOTES`. Mesmo dia → mesma frase. |

Para adicionar frases, basta incluir strings no array `QUOTES`. As frases passam a variar entre mais opções automaticamente.

### `repeat.ts` — tarefas que se repetem (puro, testado em `tests/repeat.test.ts`)

| Função | Exemplo |
|---|---|
| `parseRepeat(texto)` / `serializeRepeat(regra)` | `"MONTHLY:31"` ↔ `{ kind: "MONTHLY", monthDay: 31 }`. Texto inválido → `null`. |
| `ruleFor(kind, date)` | `ruleFor("MONTHLY", "2026-01-31")` → `{ kind: "MONTHLY", monthDay: 31 }` |
| `repeatLabel(regra, date)` | → "Todo dia", "Dias úteis (seg–sex)", "Toda semana (sexta)", "Todo mês (dia 31)" |
| `occursOn(regra, dataAtual, dia)` | A tarefa (na `dataAtual`) também acontece em `dia`? |
| `nextOccurrence(regra, dataAtual, depoisDe)` | Primeira ocorrência depois de `depoisDe`. |
| `dateAfterCompletion(regra, dataAtual, hoje)` | Para onde a tarefa vai ao ser concluída (próxima ocorrência, de hoje em diante). |
| `upcomingOccurrences(regra, dataAtual, n)` | As `n` próximas datas, a atual incluída. |
| `REPEAT_OPTIONS` | Opções do formulário, em ordem. |

### `types/task.ts` — constantes e funções

| Export | Descrição |
|---|---|
| `REMINDER_OFFSETS` | Lista `{ minutes, label }` das antecedências oferecidas no formulário. Para oferecer "2 h antes", basta adicionar `{ minutes: 120, label: "2 h antes" }`. |
| `reminderOffsetLabel(min)` | Texto para qualquer antecedência ("15 min antes", "Na hora", "2 dias antes"). |
| `PRIORITY_LABEL`, `PRIORITY_ORDER`, `PRIORITY_DOT_CLASS` | Rótulos, ordem e cor da bolinha de cada prioridade. |

## 6.4 Botão voltar (`lib/navigation/backButton.ts`)

| Export | Descrição |
|---|---|
| `installBackButtonHandling()` | Instala os ouvintes globais (botão voltar nativo via `@capacitor/app` e tecla Esc no navegador). Chamada uma vez pelo `AppInit`. Devolve a função de remoção. |
| `useBackHandler(active, onBack)` | Hook para painéis e diálogos: enquanto `active` for `true`, `onBack` fica na pilha. O botão voltar chama só o item do topo. |
| `recordScreenVisit()` / `canGoBackInApp()` | Contam as telas do app visitadas na sessão. `canGoBackInApp()` é `true` se existe uma tela do app para onde voltar (usado pelo `TaskForm` depois de salvar). |

Comportamento com a pilha vazia: `window.history.back()` se houver histórico; senão `App.exitApp()`. Mais detalhes em [03 §3.7](03-arquitetura.md#37-navegação).

**Ao criar um painel ou diálogo novo**, inclua no componente:

```tsx
useBackHandler(true, onClose);
```

## 6.5 Bloqueio (`lib/security/appLock.ts`)

| Export | Descrição |
|---|---|
| `getLockSupport()` | `{ canLock, hasBiometry, methodLabel, reason }`. `canLock` = tem biometria cadastrada **ou** PIN/padrão de tela. `methodLabel`: "digital", "rosto", "biometria" ou "bloqueio de tela". |
| `authenticate(motivo)` | Abre o pedido do sistema com `allowDeviceCredential: true` (PIN/padrão como alternativa) e força `androidBiometryStrength: weak` (exigência do Android quando o PIN é permitido). Devolve `{ ok }` ou `{ ok: false, cancelled, message }` com mensagem em português. |
| `isLockEnabled()` / `setLockEnabled(bool)` | Lê/grava `app_lock_enabled`; `setLockEnabled` também dispara `LOCK_CHANGED_EVENT`. |
| `LOCK_AFTER_BACKGROUND_MS` | 30000. Tempo em segundo plano que faz o app bloquear de novo. |

No navegador, a primeira chamada configura a simulação do plugin (`setBiometryType(fingerprint)`, `setBiometryIsEnrolled(true)`, `setDeviceIsSecure(true)`). Por isso o recurso pode ser testado com `npm run dev`.

## 6.6 Som (`lib/notifications/sound.ts`)

| Export | Descrição |
|---|---|
| `SOUND_OPTIONS` | `{ id, label, file? }` de cada opção. Para adicionar um som, veja [09 §9.6](09-guias-praticos.md#96-adicionar-um-novo-som-de-notificação). |
| `getSoundPrefs()` / `saveSoundPrefs()` | Lê/grava `notification_sound` e `notification_vibrate` (padrão: Padrão do Android, vibrando). |
| `channelIdFor(prefs)` | Id do canal da combinação (puro, testado em `tests/sound.test.ts`). |
| `ensureReminderChannel(prefs)` | Cria o canal e apaga os outros `lembretes_*`. No navegador não faz nada. |
| `getReminderChannelId()` / `setReminderChannel(prefs)` | Canal atual (em memória); usado por `scheduleTaskReminder`. |

## 6.7 Ícones

Todos os ícones vêm de **lucide-react** (`import { Plus } from "lucide-react"`). Catálogo: https://lucide.dev/icons. Tamanhos usados: 14–26 px; o padrão nas barras é `size={22}`.
