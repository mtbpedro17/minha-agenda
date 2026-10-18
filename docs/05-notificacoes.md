# 5. Notificações (lembretes)

Os lembretes usam o plugin **`@capacitor/local-notifications`**. A notificação é registrada **no sistema Android** (AlarmManager) na hora em que a tarefa é salva. Por isso ela toca **mesmo com o app fechado**, e não precisa de internet nem de servidor de push.

Todo o código fica em `lib/notifications/notifications.ts`.

## 5.1 Funções

| Função | Quando é chamada | O que faz |
|---|---|---|
| `ensureNotificationPermission()` | Uma vez, ao abrir o app (`components/AppInit.tsx`) | Verifica a permissão; se não estiver concedida, mostra o pedido do sistema. Retorna `true/false` (o valor não é usado hoje). Erros são ignorados (ex.: navegador sem suporte). |
| `scheduleTaskReminder(task)` | Ao criar uma tarefa com lembrete (`app/tarefas/nova`); via `syncTaskReminder`; ao restaurar backup | Sai sem fazer nada se `reminderEnabled` for falso **ou** se não há horário futuro. Tarefa simples: agenda 1 aviso. Tarefa que se repete: cancela os avisos antigos e agenda os das **próximas 14 ocorrências**. Grava o `notification_id` (o da 1ª ocorrência) na tarefa. |
| `cancelTaskReminder(task)` | Ao excluir uma tarefa; ao editar (antes de reagendar); via `syncTaskReminder` | Cancela **todos** os avisos da tarefa (os 16 ids possíveis) e grava `notification_id = NULL`. Cancelar algo que não existe não dá erro. |
| `refreshAllReminders()` | Ao abrir o app, **só no Android** (`AppInit`); depois de trocar o som | Reagenda os avisos de todas as tarefas pendentes com lembrete (repetidas ou com data de hoje em diante). Mantém andando a janela de 14 ocorrências das repetidas e coloca todos os avisos no canal de som atual, inclusive os criados por versões antigas. Devolve quantas falharam. |
| `applyReminderSound(prefs)` | Configurações → Notificações | Salva som/vibração, cria o canal novo, apaga os antigos e chama `refreshAllReminders()`. |
| `sendTestNotification(segundos)` | Botão "Enviar notificação de teste" | Mostra um lembrete de exemplo (id 99001) com o som atual. |
| `plannedReminders(task, now)` / `reminderTimeFor(task, now)` | Internas, puras (testadas em `tests/reminders.test.ts`) | Calculam quais avisos devem existir e quando cada um toca. |
| `syncTaskReminder(task)` | Depois de marcar/desmarcar como concluída (telas Hoje e Tarefas) e depois de editar (`app/tarefas/editar`) | Se a tarefa estiver concluída **ou** sem lembrete → cancela. Caso contrário → (re)agenda. |

## 5.2 Como o ID da notificação é calculado

```ts
export function notificationIdFor(taskId: number, occurrence = 0): number {
  return occurrence === 0 ? 100000 + taskId : 1_000_000 + taskId * 16 + occurrence;
}
```

| Aviso | ID | Exemplo (tarefa 7) |
|---|---|---|
| Tarefa simples, ou 1ª ocorrência de uma repetida | `100000 + id` | 100007 |
| Ocorrências 2 a 16 de uma tarefa repetida | `1000000 + id × 16 + k` (k = 1…15) | 1000113 … 1000127 |

O ID é **determinístico**, o que permite:

- **Reagendar** sem duplicar: agendar de novo com o mesmo ID substitui o anterior.
- **Cancelar** tudo de uma tarefa sem guardar a lista de IDs (o app sempre cancela os 16 possíveis).
- Manter compatibilidade: o ID da 1ª ocorrência é o mesmo das versões anteriores.

As faixas não se sobrepõem enquanto os ids das tarefas forem menores que 900000, e o maior ID possível fica bem abaixo do limite do Android (inteiro de 32 bits, ~2,1 bilhões).

> ⚠️ Se criar outro tipo de notificação no futuro (ex.: resumo diário), use IDs **abaixo de 100000**, que estão livres.

## 5.3 Quando o aviso toca (antecedência)

Cada tarefa tem `reminderOffset` (minutos antes): 0 (na hora), 5, 15, 30, 60 ou 1440 (1 dia). As opções da tela ficam em `REMINDER_OFFSETS` (`types/task.ts`).

A regra está na função pura `reminderTimeFor(task, now)`:

| Situação (exemplo: agora são 19:00) | Resultado |
|---|---|
| Tarefa 20:00, na hora | toca 20:00 |
| Tarefa 20:00, 15 min antes | toca 19:45 (aviso antecipado) |
| Tarefa 19:10, 15 min antes (o aviso seria 18:55, que já passou) | toca **19:10**, na hora, como reserva |
| Tarefa amanhã 20:00, 1 dia antes | toca hoje 20:00 |
| Tarefa 18:00 (já passou) | não agenda |
| Tarefa 01/11 00:10, 30 min antes | toca 31/10 23:40 (vira o mês certo) |

Esses casos foram testados. Se mudar a regra, rode-os de novo.

### Tarefas que se repetem

- O app agenda os avisos das **próximas 14 ocorrências** de uma vez (`RECURRING_REMINDERS_AHEAD`), pulando as que já passaram. Ex.: diária às 8h com 15 min de antecedência → avisos às 7h45 dos próximos 14 dias.
- Ao **concluir**, a tarefa avança de data e os avisos são refeitos a partir da nova data. Assim, o aviso de hoje (já concluída) não toca.
- Ao **abrir o app** no Android, `refreshAllReminders()` refaz a janela. Quem abre o app pelo menos a cada duas semanas nunca fica sem aviso.
- **Limite:** o Android permite ~500 alarmes pendentes por app. Com 14 por tarefa repetida, isso dá cerca de 35 tarefas repetidas com lembrete. Para uso pessoal é folgado. Se precisar de mais, reduza `RECURRING_REMINDERS_AHEAD`.
- Tarefa mensal no dia 31: nos meses mais curtos, o aviso vai para o último dia do mês.

## 5.4 Conteúdo e configuração da notificação

```ts
{
  id: 100000 + task.id,
  title: "Lembrete de tarefa",
  body: aviso na hora    → "Consulta médica\nPrioridade: Alta"
        aviso antecipado → "Consulta médica\nComeça hoje às 10:30 · Prioridade: Alta"
                           (ou "amanhã", ou "em 25/10")
  schedule: { at: reminderTimeFor(task).at, allowWhileIdle: true },
  smallIcon: "ic_stat_reminder",
  channelId: "lembretes_sino_v",   // canal do som escolhido (veja 5.5)
}
```

- **Horário:** `new Date("2026-10-18T14:00:00")` é interpretado no **fuso local** do aparelho, que é o esperado.
- **`allowWhileIdle: true`:** permite disparar mesmo com o aparelho em modo *Doze* (economia de energia).
- **Ícone pequeno:** `android/app/src/main/res/drawable/ic_stat_reminder.xml` (vetor branco, exigido pelo Android para a barra de status). A cor de destaque `#8b5cf6` vem de `capacitor.config.ts`:

```ts
plugins: {
  LocalNotifications: { smallIcon: "ic_stat_reminder", iconColor: "#8b5cf6" },
}
```

- Tocar na notificação abre o app (comportamento padrão do plugin; não há tratamento de clique personalizado).

## 5.5 Som e vibração (canais de notificação)

Código em `lib/notifications/sound.ts`; tela em `components/NotificationSoundSection.tsx`.

**Por que canais?** No Android 8+, som, vibração e importância pertencem a um **canal de notificação**, não a cada notificação. E o app **não consegue alterar** um canal depois de criado. Por isso cada combinação tem seu próprio canal:

| Escolha | Canal | Importância |
|---|---|---|
| Padrão do Android, vibrando | `lembretes_system_v` | 4 (alta: som + pop-up na tela) |
| Sino, sem vibrar | `lembretes_sino_n` | 4 |
| Silencioso | `lembretes_silencioso` | 2 (baixa: sem som, sem vibração, sem pop-up) |

Ao trocar: `ensureReminderChannel()` cria o canal novo e **apaga os outros `lembretes_*`** (nas configurações do Android só aparece "Lembretes de tarefas"). Depois disso, `refreshAllReminders()` reagenda os pendentes no canal novo. O canal atual fica em memória (`getReminderChannelId()`) e é recriado a partir das configurações salvas ao abrir o app.

**Arquivos de som** (WAV, 22 kHz, mono, cerca de 1 a 2 s):

| Opção | Arquivo | Onde fica |
|---|---|---|
| Suave | `lembrete_suave.wav` | `android/app/src/main/res/raw/` (usado pelo Android) **e** `public/sounds/` (prévia ▶) |
| Sino | `lembrete_sino.wav` | idem |
| Digital | `lembrete_digital.wav` | idem |
| Alerta | `lembrete_alerta.wav` | idem |

Os quatro são **originais**, sintetizados por `scripts/make_sounds.py` (Python + numpy), sem direitos autorais de terceiros, e com volume equalizado entre si.

**"Padrão do Android"** cria o canal **sem** arquivo de som, e o Android usa o som de notificação do celular. Como o canal é do sistema, o usuário pode escolher **qualquer toque do celular** em *Configurações do Android → Apps → Minha Agenda → Notificações → Lembretes de tarefas → Som*. A tela do app explica isso.

> ⚠️ Se o usuário mudar o som pelas configurações do Android e depois mudar de novo pelo app, vale a escolha do app: o canal antigo é apagado e um novo é criado.

> ℹ️ Também existe um canal **"Default"**, criado automaticamente pelo plugin de notificações. Ele não é usado pelos lembretes e não pode ser removido (o plugin o recria).

## 5.6 Permissões Android

Declaradas em `android/app/src/main/AndroidManifest.xml`:

| Permissão | Para quê |
|---|---|
| `POST_NOTIFICATIONS` | Exibir notificações (Android 13+ pede ao usuário). |
| `SCHEDULE_EXACT_ALARM` | Alarmes no minuto exato (Android 12+). |
| `USE_EXACT_ALARM` | Alarmes exatos concedidos automaticamente (Android 13+) — ver alerta da Play Store abaixo. |
| `RECEIVE_BOOT_COMPLETED` | O plugin reagenda os lembretes depois que o celular reinicia. |
| `VIBRATE` | Vibração na notificação. |

> ⚠️ **Google Play e `USE_EXACT_ALARM`:** a Play Store só aceita essa permissão em apps cuja **função principal** é alarme, relógio ou calendário/agenda, e pede uma declaração no Play Console. Um app de agenda costuma se encaixar, mas se a revisão recusar, remova `USE_EXACT_ALARM` e fique só com `SCHEDULE_EXACT_ALARM`. Nesse caso, no Android 14+ o usuário precisa liberar "Alarmes e lembretes" nas configurações do app. O plugin tem `LocalNotifications.checkExactNotificationSetting()` e `changeExactNotificationSetting()` para verificar e abrir essa tela.

## 5.7 Matriz de comportamento

| Ação do usuário | Banco | Notificação |
|---|---|---|
| Cria tarefa com lembrete, horário futuro | `notification_id = 100000+id` | Agendada |
| Cria tarefa com lembrete, horário passado | `notification_id = NULL` | Nada |
| Cria tarefa sem lembrete | `notification_id = NULL` | Nada |
| Marca como concluída | `notification_id = NULL` | Cancelada |
| Reabre (desmarca) com horário futuro | `notification_id = 100000+id` | Reagendada |
| Reabre com horário passado | `notification_id = NULL` (cancelada antes) | Nada |
| Exclui a tarefa | linha removida | Cancelada |
| Edita: novo horário no futuro, lembrete ligado, pendente | `notification_id = 100000+id` | Antiga cancelada, **nova** agendada no novo horário |
| Edita: desliga o lembrete, ou novo horário no passado | `notification_id = NULL` | Cancelada |
| Edita só a antecedência (ex.: "na hora" → "1 h antes") | `notification_id = 100000+id` | Antiga cancelada, nova no horário − 1 h |
| Restaura um backup | lembretes antigos cancelados | Pendentes do arquivo com lembrete e horário futuro são **agendados de novo** |
| Conclui uma tarefa **que se repete** | `date` passa para a próxima ocorrência; `notification_id = 100000+id` | Avisos refeitos a partir da nova data (14 à frente) |
| Abre o app (Android) com tarefas repetidas pendentes | inalterado | Janela de 14 avisos renovada |
| Edita: "Todo dia" → "Não repete" | `repeat_rule = NULL` | Todos os avisos cancelados; fica 1 aviso para a data atual |
| Edita uma tarefa que nunca teve lembrete e continua sem | inalterado | Nada (o plugin nem é chamado) |
| Celular reinicia | — | O plugin reagenda sozinho |
| Usuário nega a permissão | inalterado | Agendada no sistema, mas **não aparece** |

## 5.8 Como testar

1. Rode o app em um **aparelho ou emulador Android (API 33+)**. O navegador não serve para isso.
2. Aceite a permissão de notificação na primeira abertura.
3. Crie uma tarefa para **daqui a 2 minutos** com "Definir lembrete" ligado.
4. Feche o app (ou bloqueie a tela) e espere.
5. Para checar se ficou agendado, rode com o celular conectado:
   ```bash
   adb shell dumpsys alarm | grep -i minhaagenda
   ```
6. Teste também: concluir a tarefa antes do horário (não deve tocar), **editar** a tarefa para outro horário (deve tocar só no novo) e reiniciar o emulador (deve tocar mesmo assim).

> 💡 Em alguns fabricantes (Xiaomi, Huawei, Samsung com economia agressiva), o sistema pode atrasar ou bloquear alarmes de apps em segundo plano. Se um usuário relatar lembretes perdidos, peça para desativar a "otimização de bateria" do Minha Agenda.

## 5.9 Pontos de atenção no código atual

- Ao criar ou editar uma tarefa, a gravação no banco e o agendamento do lembrete ficam em blocos `try` **separados** (`app/tarefas/nova/page.tsx` e `app/tarefas/editar/page.tsx`). Se só o lembrete falhar, a tarefa continua salva, o `TaskForm` mostra um aviso e esconde os botões de salvar, evitando duplicatas. Mantenha esse contrato em qualquer tela nova que use o `TaskForm` ([06 — TaskForm](06-telas-e-componentes.md#taskform)).
- Não existe tela para reativar a permissão depois de negada. O usuário precisa ir em *Configurações do Android → Apps → Minha Agenda → Notificações*.
