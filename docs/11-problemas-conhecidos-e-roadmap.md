# 11. Problemas conhecidos e roadmap

Levantamento feito na revisão do código da versão **1.0 (MVP)**. Cada item diz **o que acontece**, **onde está no código** e **como corrigir**. A prioridade sugerida vai de 🔴 alta a 🟢 baixa. Itens marcados com ✅ já foram corrigidos e ficam aqui como registro.

## Resumo

| # | Problema | Tipo | Prioridade / status |
|---|---|---|---|
| 1 | Modo navegador não funcionava sem `sql-wasm.wasm` | Ambiente | ✅ Resolvido |
| 2 | Agenda não navegava além de 3 dias | Funcionalidade | ✅ Resolvido |
| 3 | `npm run lint` acusava erros em arquivos gerados | Ambiente | ✅ Resolvido |
| 4 | Erro no lembrete podia gerar tarefa duplicada | Bug | ✅ Resolvido |
| 5 | Lista de Tarefas não mostrava a data | Usabilidade | ✅ Resolvido |
| 6 | Busca continuava filtrando depois de fechada | Bug | ✅ Resolvido |
| 7 | Exclusões sem confirmação | Usabilidade | ✅ Resolvido |
| 8 | Não era possível editar tarefa | Funcionalidade | ✅ Resolvido |
| 9 | Backup automático do Android estava ligado | Privacidade | ✅ Resolvido (desligado) |
| 10 | Sem mecanismo de migração do banco | Manutenção | ✅ Resolvido |
| 11 | Versões do app desalinhadas | Manutenção | ✅ Resolvido |
| 12 | Botão "voltar" do Android não fechava os painéis | Usabilidade | ✅ Resolvido |
| 13 | Tarefas atrasadas fora da tela Hoje | Usabilidade | ✅ Resolvido |
| 14 | Sem testes automatizados | Qualidade | 🟢 (parcial: regras testadas) |
| 15 | Restaurar backup substitui tudo (não mescla) | Funcionalidade | 🟢 (decisão) |
| 16 | Arquivo de backup não é criptografado | Privacidade | 🟢 |
| 17 | Bloqueio não impede print da tela nem esconde o texto das notificações | Privacidade | 🟢 |

---

### 1. ✅ Modo navegador não funcionava sem `sql-wasm.wasm`

- **O que acontecia:** em `npm run dev`, nada carregava (404 em `/assets/sql-wasm.wasm`).
- **Correção aplicada:** o arquivo da **sql.js 1.12.0** foi adicionado em `public/assets/sql-wasm.wasm`. Ele precisa ser dessa versão (1.11 também serve); as outras são incompatíveis com o jeep-sqlite 2.8 ([detalhes](02-instalacao-e-ambiente.md#o-arquivo-publicassetssql-wasmwasm-já-incluído--não-apague)).

### 2. ✅ Agenda não navegava além de 3 dias

- **O que acontecia:** a tira mostrava só hoje ± 3 dias, sem como avançar ou voltar semanas.
- **Correção aplicada:** botões **‹ Semana** e **Semana ›** em `app/agenda/page.tsx` (função `shiftWeek`), usando o novo utilitário `addDays` de `lib/utils/date.ts`. O link "Hoje" só aparece quando outro dia está selecionado.

### 3. ✅ `npm run lint` acusava erros em arquivos gerados

- **O que acontecia:** 101 erros e ~4.000 avisos, todos no JavaScript compilado em `android/app/src/main/assets/public/`.
- **Correção aplicada:** `"android/**"` adicionado ao `globalIgnores` de `eslint.config.mjs`. Agora `npm run lint` termina sem erros.

### 4. ✅ Erro no lembrete podia gerar tarefa duplicada

- **O que acontecia:** `createTask` e `scheduleTaskReminder` estavam no mesmo `try`. Se o lembrete falhasse, a tela dizia "Não foi possível salvar" mesmo com a tarefa já gravada, e salvar de novo criava uma duplicata.
- **Correção aplicada:** em `app/tarefas/nova/page.tsx`, os dois passos têm `try` separados. Se só o lembrete falhar, aparece o aviso "Tarefa salva, mas o lembrete não pôde ser agendado…" com um botão para seguir (hoje chamado **Continuar**), e os botões de salvar somem.

### 5. ✅ Lista de Tarefas não mostrava a data

- **O que acontecia:** o card exibia só a hora; tarefas de dias diferentes ficavam lado a lado sem distinção.
- **Correção aplicada:** `TaskCard` com `showDate` mostra o dia embaixo da hora usando o novo `relativeDayLabel()` ("Hoje", "Amanhã", "Ontem", "dd/mm" ou "dd/mm/aa"). Ativado nas telas **Tarefas** e **Hoje**. Pendentes de dias passados aparecem com o dia em **vermelho**.

### 6. ✅ Busca continuava filtrando depois de fechada

- **O que acontecia:** fechar a busca (X) escondia o campo mas mantinha o texto, e a lista continuava filtrada sem indicação.
- **Correção aplicada:** em `app/tarefas/page.tsx`, fechar a busca também faz `setQuery("")`.

### 7. ✅ Exclusões sem confirmação

- **O que acontecia:** "Excluir tarefa" e a lixeira da nota apagavam na hora, sem perguntar.
- **Correção aplicada:** novo componente `components/ConfirmDialog.tsx` ("Excluir tarefa?" / "Excluir nota?" com Cancelar e Excluir), usado por `TaskDetailSheet` e `NoteFormSheet`.
- **Possível evolução:** em vez de confirmar, excluir na hora e mostrar um aviso temporário com "Desfazer".

### 8. ✅ Não era possível editar tarefa

- **Correção aplicada:** nova tela `/tarefas/editar?id=N`, aberta pelo botão **Editar** no painel de detalhe. O formulário foi extraído para `components/TaskForm.tsx` e é compartilhado com Nova Tarefa. O lembrete é cancelado e reagendado conforme o novo horário. Detalhes em [09 §9.3](09-guias-praticos.md#93-como-a-edição-de-tarefa-funciona-e-como-reaproveitar-o-padrão).

### 9. ✅ Backup automático do Android estava ligado

- **O que acontecia:** `android:allowBackup="true"` permitia que o Android copiasse o banco para a conta Google do usuário, contrariando a mensagem "Sem servidores".
- **Decisão tomada:** **desligar**. `AndroidManifest.xml` agora tem `android:allowBackup="false"`, e Configurações ganhou o cartão **"Sem backup na nuvem"**, que avisa que desinstalar o app ou limpar os dados dele apaga tudo.
- **Detalhes e consequências:** [08 — Backup automático desligado](08-android-build-e-publicacao.md#backup-automático-desligado).
- **Possível evolução:** exportar/importar JSON manualmente (roadmap v2), para o usuário levar os dados a outro celular sem depender de nuvem.

### 10. ✅ Sem mecanismo de migração do banco

- **O que acontecia:** só havia `CREATE TABLE IF NOT EXISTS`, e a primeira mudança de esquema quebraria quem já tem o app.
- **Correção aplicada:** lista `COLUMN_MIGRATIONS` + `addColumnIfMissing` em `lib/database/sqlite.ts`, executadas a cada abertura. Testado com atualização sobre dados antigos ([04 §4.5](04-banco-de-dados.md#45-migrações-como-mudar-o-esquema-sem-perder-dados)).

### 11. ✅ Versões do app desalinhadas

- **O que acontecia:** `package.json` dizia `0.1.0`, o Android `1.0`/`versionCode 1` e a tela de Configurações tinha `v1.0 (MVP)` escrito no código.
- **Correção aplicada:** o `package.json` virou a **única fonte** (`1.4.0`). O Gradle lê dele e calcula `versionCode` (10400), e Configurações também lê dele. Como lançar versão nova: [08 §8.5](08-android-build-e-publicacao.md#85-versão-do-app).
- O README antigo também listava **JDK 17** e **Node 18+**. O correto é **JDK 21** e **Node 22+** (já corrigido).

### 12. ✅ Botão "voltar" do Android não fechava os painéis

- **O que acontecia:** com um painel aberto, o voltar do sistema trocava de tela, e tocar no fundo escuro não fechava nada.
- **Correção aplicada:** plugin `@capacitor/app` + módulo `lib/navigation/backButton.ts`, com uma pilha de painéis abertos. O voltar fecha primeiro o diálogo de confirmação, depois o painel, depois volta de tela, e na primeira tela sai do app. O painel de detalhe da tarefa também fecha ao tocar no fundo; o de nota não, para não perder texto. No navegador, a tecla Esc usa a mesma pilha ([03 §3.7](03-arquitetura.md#37-navegação)).

### 13. ✅ Tarefas atrasadas fora da tela Hoje

- **O que acontecia:** pendentes de dias anteriores não apareciam na tela Hoje.
- **Correção aplicada:** nova função `listOverdueTasks(today)` e seção vermelha **"Atrasadas (N)"** na tela Hoje, acima de "Próximas tarefas". Mostra as 3 mais antigas e o link "+N na lista" quando há mais. Na tela Tarefas, o dia dessas tarefas também aparece em vermelho.

### 14. Testes automatizados (parcial)

- ✅ `npm test` roda 37 testes das regras puras: repetição (`tests/repeat.test.ts`), horário e ids dos lembretes (`tests/reminders.test.ts`) e leitura/validação do backup (`tests/backup.test.ts`). Não precisa de navegador nem de celular.
- Ainda não há testes de **tela** (clicar, digitar) nem de **banco** (as funções de `lib/database`). As telas foram testadas manualmente/por scripts durante o desenvolvimento.
- **Sugestão:** Playwright para os fluxos principais (criar, concluir, excluir, backup), rodando sobre `npx serve out`.

### 15. Restaurar backup substitui tudo (não mescla)

- **Por quê:** substituir é previsível e evita duplicatas ("essa tarefa é a mesma?"). A confirmação mostra quantas tarefas e notas existem agora e quantas vêm do arquivo.
- **Se um dia precisar mesclar:** criar um modo "Adicionar ao que já existe" que ignora os ids do arquivo e insere tudo como novo.

### 16. Arquivo de backup não é criptografado

- Quem tiver o arquivo consegue ler tarefas e notas. Hoje o app só orienta a guardar "em um lugar seguro".
- **Sugestão:** se o app passar a guardar dados sensíveis, oferecer senha opcional no Exportar e criptografar o JSON (ex.: AES-GCM com a Web Crypto API, que funciona offline).

---

### 17. Bloqueio não impede print da tela nem esconde o texto das notificações

- O bloqueio com biometria protege **o app**. Mas:
  - **o texto dos lembretes** aparece na notificação, inclusive na tela de bloqueio do celular (o canal usa visibilidade pública);
  - **prints e gravação de tela** não são bloqueados;
  - **a miniatura em "apps recentes"** é coberta assim que o app sai de cena, mas isso é "melhor esforço": se o Android tirar a foto antes da tela ser coberta, a miniatura pode mostrar o conteúdo.
- **Sugestões:**
  - **Notificações:** com o bloqueio ligado, criar o canal com `visibility: 0` (privada), para o Android esconder o texto na tela de bloqueio do celular. Como canal não muda depois de criado, isso entraria no id do canal (como já é feito com som e vibração).
  - **Prints e recentes:** ligar `FLAG_SECURE` na janela quando o bloqueio estiver ligado. Exige um pequeno código nativo em `MainActivity.java` ou um plugin.

## Pequenas melhorias de código

- ✅ As cores das bolinhas de prioridade, antes repetidas em dois arquivos, agora vêm de `PRIORITY_DOT_CLASS` em `types/task.ts`.
- O estado `weekStart` da Agenda é o **centro** da semana, não o início. Renomear para `weekCenter` evita confusão.
- `FloatingButton` é um link; a Agenda recria o mesmo botão como `<button>`. Pode virar um único componente que aceita `href` **ou** `onClick`.
- Tokens `accent-strong`, `accent-soft`, `priority-medium-soft`, `priority-low-soft` estão definidos e não são usados.

---

## Roadmap sugerido

**✅ v1.5 — feito**
- Bloqueio do app com digital/rosto (PIN do celular como alternativa), cobrindo o conteúdo em segundo plano e bloqueando de novo após 30 s fora.
- Escolha do som dos lembretes (Padrão do Android + 4 toques próprios + silencioso), vibração e notificação de teste.
- Corrigida a bolinha dos interruptores, que ficava fora do trilho desde a versão original.

**✅ v1.4 — feito**
- Tarefas que se repetem (todo dia, dias úteis, toda semana, todo mês), com repetições previstas na Agenda e avisos das próximas 14 ocorrências.
- Versão única em `package.json` (item 11).
- Testes das regras com `npm test` (item 14, parcial).

**✅ v1.3 — feito**
- Aviso antes da hora, tarefas na Agenda, backup em arquivo, formulário volta para a tela de origem.

**Próximo**
- Botões na notificação ("Concluir", "Adiar 10 min"). Com a repetição pronta, "Concluir" pela notificação vira o atalho mais útil para hábitos diários.
- Resumo do dia pela manhã (notificação opcional, IDs abaixo de 100000).
- "Desfazer" após concluir/excluir.
- Busca nas notas.
- Categorias (receita em [09 §9.1](09-guias-praticos.md#91-adicionar-um-campo-novo-na-tarefa-ex-categoria)).
- Repetições mais elaboradas ("a cada 2 semanas", "terça e quinta"); veja a receita em [09 §9.5](09-guias-praticos.md#95-oferecer-outra-antecedência-de-aviso).

**Depois**
- Estatísticas (receita de tela em [09 §9.2](09-guias-praticos.md#92-criar-uma-tela-nova-e-uma-aba-na-barra-inferior)).
- Widget Android na tela inicial (exige código nativo Kotlin/Java).
- Tema claro e tamanho de letra ajustável.
- Testes de tela com Playwright (item 14).
- iOS (`npm i @capacitor/ios && npx cap add ios`; precisa de Mac com Xcode).
