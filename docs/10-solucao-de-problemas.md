# 10. Solução de problemas

Procure pelo sintoma. Se nada resolver, apague as pastas geradas e comece limpo (última seção).

---

## No navegador (`npm run dev`)

### As telas abrem, mas nenhum dado aparece / nada salva
**Console (F12):** `404 /assets/sql-wasm.wasm` ou `both async and sync fetching of the wasm failed`.

**Causa:** o arquivo `public/assets/sql-wasm.wasm` foi apagado ou não veio no clone.
**Solução:** recrie-o seguindo [02 — Instalação §2.2](02-instalacao-e-ambiente.md#o-arquivo-publicassetssql-wasmwasm-já-incluído--não-apague) e reinicie o `npm run dev`.

### `LinkError: WebAssembly.instantiate(): Import #34 "a" "I": function import requires a callable`
**Causa:** o `.wasm` é de uma versão do sql.js incompatível com o jeep-sqlite (geralmente copiado de `node_modules/sql.js`, que é 1.14).
**Solução:** substitua pelo `.wasm` da **sql.js 1.12.0**.

### `memory access out of bounds`
**Causa:** `.wasm` de versão antiga demais (ex.: 1.10).
**Solução:** use o da **1.12.0**.

### Os dados somem quando recarrego a página
**Causa:** alguma função de escrita em `lib/database/` não chama `await persistWeb()` no final.
**Solução:** adicione a chamada. No Android isso não acontece, porque lá a gravação é direta no arquivo.

### Quero zerar os dados do navegador
F12 → *Application* → *Storage* → **Clear site data**, e recarregue.

### Notificação não aparece no navegador
Esperado. Teste lembretes em um aparelho/emulador Android.

### `Error: "next start" does not work with "output: export"`
Use `npx serve out` para servir o build estático.

---

## No build

### `npm run build` falha com `useSearchParams() should be wrapped in a suspense boundary`
Envolva o componente que usa `useSearchParams` em `<Suspense>` (exemplo em [09 §9.3](09-guias-praticos.md#93-como-a-edição-de-tarefa-funciona-e-como-reaproveitar-o-padrão)).

### `npm run build` falha dizendo que uma rota dinâmica precisa de `generateStaticParams`
Exportação estática não aceita `[id]` livre. Troque por `?id=` (veja [03 §3.4](03-arquitetura.md#34-por-que-exportação-estática-e-o-que-isso-proíbe)).

### `npm run lint` mostra milhares de avisos e erros em `android/app/src/main/assets/public/`
**Causa:** o ESLint está analisando o JavaScript **compilado** que o `cap sync` copia para dentro do Android. Isso acontece se alguém remover `"android/**"` do `globalIgnores` em `eslint.config.mjs`.
**Solução:** mantenha a linha `"android/**"` no `globalIgnores`. Com ela, `npm run lint` termina sem erros.

### `npx tsc --noEmit` diz `Cannot find name 'LayoutProps'`
**Causa:** esse tipo é gerado pelo Next.js na pasta `.next/` e ainda não existe (projeto recém-clonado ou `.next` apagada).
**Solução:** rode `npx next typegen` (ou `npm run dev`/`npm run build` uma vez) antes do `tsc`.

### `npx cap ...` falha com erro de versão do Node
A CLI do Capacitor 8 exige **Node 22+**. Atualize o Node (recomendado: usar o `nvm` ou o instalador oficial).

---

## No Android

### Mudei o código e nada mudou no celular
Faltou `npm run build` **e/ou** `npx cap sync android`. Rode os dois e dê Run de novo. Se persistir, desinstale o app do aparelho e rode novamente.

### App abre com tela branca
1. Rodou `npm run build && npx cap sync android`? Confira se `android/app/src/main/assets/public/index.html` existe.
2. Veja os erros do JavaScript: no Chrome do computador, abra `chrome://inspect`, encontre o aparelho e clique em **inspect**. O console da WebView aparece igual ao do navegador.
3. Se você usou *live reload*, o app pode estar tentando acessar o servidor de desenvolvimento. Rode `npx cap sync android` de novo (sem live reload).

### Gradle: `project ':capacitor-cordova-android-plugins' not found` ou `capacitor.settings.gradle` com erro
A pasta `android/` veio do Git sem os arquivos gerados. Rode na raiz:

```bash
npm install
npm run build
npx cap sync android
```

Depois, no Android Studio: *File → Sync Project with Gradle Files*.

### Gradle: `Unsupported class file major version`, `invalid source release: 21` ou erro de JDK
O projeto precisa de **JDK 21**. Android Studio → *Settings → Build, Execution, Deployment → Build Tools → Gradle → Gradle JDK* → selecione um JDK 21 (ex.: *jbr-21*).

### Gradle: `compileSdk 36` / SDK não encontrado
Instale o **Android SDK Platform 36** pelo *SDK Manager* do Android Studio. Se o arquivo `android/local.properties` não existir, abra o projeto pelo Android Studio (ele cria) ou crie com `sdk.dir=/caminho/para/Android/Sdk`.

### Lembrete não tocou
Verifique, nesta ordem:

1. A tarefa tinha **"Definir lembrete" ligado** e horário **no futuro** quando foi salva? (Horário passado não agenda.)
2. A permissão de notificações está concedida? *Configurações → Apps → Minha Agenda → Notificações*.
3. *Alarmes e lembretes* permitido (Android 12+)? *Configurações → Apps → Minha Agenda → Alarmes e lembretes*.
4. Otimização de bateria do fabricante: coloque o app como "sem restrições".
5. Está agendado? `adb shell dumpsys alarm | grep -i minhaagenda`.
6. A tarefa foi concluída depois? Concluir cancela o lembrete.

### O botão voltar do Android troca de tela com um painel aberto
O painel não registrou `useBackHandler(true, onClose)`. Adicione a chamada no componente do painel ([06 §6.4](06-telas-e-componentes.md#64-botão-voltar-libnavigationbackbuttonts)).

### O botão voltar do Android não faz nada / não sai do app
1. Confira se o plugin está instalado e sincronizado: `npx cap sync android` deve listar `@capacitor/app` entre os plugins.
2. Confira se `AppInit` chama `installBackButtonHandling()`.
3. Se algum código chamar `App.addListener("backButton", …)` em outro lugar, os dois ouvintes vão disputar o botão. Centralize tudo em `lib/navigation/backButton.ts`.

### Usuário perdeu os dados ao trocar de celular ou reinstalar
É o comportamento esperado: o backup automático do Android está **desligado** (`android:allowBackup="false"`) por decisão do projeto. Os dados ficam só no aparelho. Veja [08 — Backup automático desligado](08-android-build-e-publicacao.md#backup-automático-desligado).

### Exportar backup não abre a janela de compartilhar (Android)
1. Rode `npx cap sync android` e confira se `@capacitor/filesystem` e `@capacitor/share` aparecem na lista de plugins.
2. Confira se `android/app/src/main/res/xml/file_paths.xml` tem `<cache-path … path="." />` (o arquivo é gravado na pasta cache).
3. Veja o erro no console da WebView (`chrome://inspect`).

### Restaurar: o arquivo .json aparece cinza ou não aparece no seletor
O seletor não tem filtro de tipo justamente por isso. Se ainda assim não aparecer, o arquivo provavelmente está num app que não se integra ao seletor do Android (ex.: dentro do WhatsApp). Peça para o usuário salvar o arquivo em **Downloads** ou no **Drive** antes.

### Restaurar mostra "Backup corrompido (tarefa nº N: campo)"
O arquivo foi alterado à mão ou cortado no meio. O app não restaura nada parcialmente. Use outro arquivo de backup, ou corrija o campo indicado (abra o JSON num editor de texto; a tarefa nº N é a N-ésima da lista `tasks`).

### Restaurou, mas alguns lembretes não tocam
A mensagem de sucesso avisa quando lembretes não puderam ser agendados (geralmente notificações bloqueadas). Libere as notificações nas configurações do Android e edite/salve a tarefa, ou restaure de novo. Tarefas com horário no passado nunca recebem lembrete.

### Concluí uma tarefa que se repete e ela não ficou "concluída"
É o comportamento esperado: tarefas que se repetem **pulam para a próxima data** e continuam pendentes. Para encerrar de vez: Editar → "Não repete" → concluir. Ou excluir.

### Tarefa repetida parou de avisar depois de umas duas semanas
O app agenda os avisos das próximas 14 ocorrências e renova a lista **a cada abertura**. Se o app não for aberto por mais tempo que isso, os avisos acabam. Abrir o app uma vez já reagenda tudo. Se for um problema frequente, aumente `RECURRING_REMINDERS_AHEAD` (`lib/notifications/notifications.ts`), respeitando o limite de ~500 alarmes do Android.

### Tarefa mensal do dia 31 apareceu no dia 30 (ou 28/29)
Esperado: nos meses sem dia 31, a repetição cai no último dia do mês, e volta para o 31 nos meses que têm.

### `npm test` falha
Leia a linha marcada com ✘: ela mostra o valor recebido e o esperado. Os testes cobrem regras puras (`lib/utils/repeat.ts`, horários em `lib/notifications/notifications.ts`, leitura em `lib/backup/backup.ts`). Se você mudou uma regra de propósito, atualize o teste junto.

### Fiquei preso na tela de bloqueio
O pedido de digital sempre oferece **"Usar PIN/padrão"** do celular. Se o celular não tiver mais digital, rosto nem PIN, o app desliga o bloqueio sozinho na próxima abertura. Em último caso (perde os dados se não houver backup): *Configurações do Android → Apps → Minha Agenda → Armazenamento → Limpar dados*.

### O app pede a digital toda hora
Ele pede ao abrir e ao voltar depois de **30 s ou mais** fora. Para mudar o tempo, altere `LOCK_AFTER_BACKGROUND_MS` (`lib/security/appLock.ts`). Se pedir **em loop** logo após desbloquear, a proteção contra a pausa causada pela própria tela de biometria não funcionou nesse aparelho: aumente o 1500 de `ignoreEventsUntil` em `components/AppLock.tsx`.

### "Bloquear com digital" está desabilitado
O celular não tem digital, rosto nem PIN/padrão de tela cadastrados. Cadastre um nas configurações do Android e abra Configurações do app de novo.

### Troquei o som, mas a notificação continua com o som antigo
1. Lembretes que **já apareceram** não mudam; só os próximos.
2. Confira o som do canal em *Configurações do Android → Apps → Minha Agenda → Notificações → Lembretes de tarefas*. Se o usuário mudou o som por lá, o Android mantém essa escolha.
3. Em desenvolvimento: se você **substituiu um arquivo de som mantendo o nome**, o Android pode manter o antigo em cache. Desinstale e instale o app de novo, ou dê outro nome ao arquivo (veja [09 §9.6](09-guias-praticos.md#96-adicionar-um-novo-som-de-notificação)).

### O botão ▶ não toca nada
Confira se o arquivo existe em `public/sounds/` com o mesmo nome de `SOUND_OPTIONS` e se o volume de mídia do celular não está no zero (a prévia usa o volume de mídia; a notificação, o de notificação).

### Notificação aparece sem som mesmo com som escolhido
O usuário pode ter colocado o celular no silencioso/Não perturbe, ou baixado a importância do canal nas configurações do Android. "Silencioso (só aparece)" também não toca de propósito.

### O app não pediu permissão de notificação
O pedido aparece uma única vez. Se o usuário negou, o Android não pergunta de novo; a liberação é manual nas configurações do sistema. Em Android 12 ou anterior não existe pedido (a permissão é concedida na instalação).

### Ver os dados gravados no aparelho
Android Studio → *App Inspection* → *Database Inspector* (veja [04 §4.7](04-banco-de-dados.md#47-inspecionando-o-banco)).

---

## Começar do zero (limpeza completa)

```bash
rm -rf node_modules .next out
rm -rf android/app/build android/build android/.gradle
npm install
npm run build
npx cap sync android
```

No Android Studio: *File → Invalidate Caches… → Invalidate and Restart*.
