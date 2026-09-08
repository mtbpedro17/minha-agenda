# Minha Agenda

Aplicativo pessoal de agenda, tarefas e lembretes — **100% offline**.

Construído com **Next.js + TypeScript + Tailwind CSS + Capacitor + SQLite**, conforme a documentação técnica do projeto.

---

## ✅ O que já está implementado

- **Tela Hoje** — saudação, frase motivacional do dia, resumo (urgentes/pendentes/concluídas) e próximas tarefas.
- **Tela Agenda** — tira de dias da semana + notas do dia (criar, editar, excluir).
- **Tela Tarefas** — filtros (Todas / Pendentes / Concluídas), agrupamento por prioridade, busca por título, exclusão.
- **Nova Tarefa** — título, descrição, data, hora, prioridade (Alta/Média/Baixa) e lembrete.
- **Lembretes/notificações locais** — agendados via `@capacitor/local-notifications`, funcionam mesmo com o app fechado.
- **Banco de dados local SQLite** — tabelas `tasks`, `notes` e `settings`, sem backend, sem internet.
- **Configurações** — nome do usuário (usado na saudação).
- Tema escuro + roxo, cards arredondados, navegação inferior — fiel ao mockup enviado.

## 🧱 Estrutura do projeto

```
minha-agenda/
├── app/                     # Rotas (Next.js App Router)
│   ├── page.tsx             # Tela Hoje
│   ├── agenda/page.tsx      # Tela Agenda
│   ├── tarefas/page.tsx     # Tela Tarefas
│   ├── tarefas/nova/page.tsx
│   └── configuracoes/page.tsx
├── components/              # TaskCard, NoteCard, PriorityBadge, etc.
├── lib/
│   ├── database/            # sqlite.ts, tasks.ts, notes.ts, settings.ts
│   ├── notifications/       # notifications.ts
│   └── utils/                # date.ts, quotes.ts
├── types/                   # task.ts, note.ts
├── android/                 # Projeto nativo Android (gerado pelo Capacitor)
├── capacitor.config.ts
└── next.config.ts           # output: "export" (build 100% estático)
```

---

## 🚀 Como rodar em desenvolvimento (navegador)

Você pode iterar na interface direto no navegador antes de gerar o APK:

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`. Nesse modo o app usa **jeep-sqlite** (SQLite rodando via IndexedDB no navegador) — é só para você visualizar/testar a interface; os dados **não** vão para o SQLite nativo do Android nesse modo.

---

## 📱 Como gerar o APK (Android Studio)

### Pré-requisitos
- [Android Studio](https://developer.android.com/studio) instalado
- JDK 17 (o Android Studio já traz um embutido)
- Node.js 18+

### Passo a passo

1. **Instale as dependências**
   ```bash
   npm install
   ```

2. **Gere o build estático do Next.js**
   ```bash
   npm run build
   ```
   Isso cria a pasta `out/` com todo o app compilado (HTML/JS/CSS estáticos).

3. **Sincronize com o projeto Android**
   ```bash
   npx cap sync android
   ```
   Esse comando copia o conteúdo de `out/` para dentro de `android/app/src/main/assets/public` e atualiza os plugins nativos.

4. **Abra no Android Studio**
   ```bash
   npx cap open android
   ```
   (ou abra a pasta `android/` manualmente pelo Android Studio)

5. **Rode no emulador ou dispositivo**
   Clique em ▶️ Run no Android Studio. Na primeira vez, o Gradle vai baixar as dependências (precisa de internet nesse passo de build — o app em si roda 100% offline depois de instalado).

6. **Gerar o APK final**
   No Android Studio: `Build → Build Bundle(s) / APK(s) → Build APK(s)`
   O arquivo `.apk` aparece em `android/app/build/outputs/apk/debug/`.

   Para gerar um APK assinado (release), use `Build → Generate Signed Bundle / APK`.

### ⚠️ Sempre que você alterar o código React/Next.js
Repita os passos 2 e 3 (`npm run build` + `npx cap sync android`) antes de rodar no Android Studio novamente — o Capacitor só enxerga o que está na pasta `out/`.

---

## 🔔 Sobre as notificações

- O ícone de notificação (`ic_stat_reminder`) já está incluído em `android/app/src/main/res/drawable/`.
- As permissões necessárias (`POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED`) já estão no `AndroidManifest.xml`.
- No Android 13+, o app vai pedir permissão de notificação na primeira abertura.

## 🎨 Personalizar o ícone do app

O ícone padrão do Capacitor está em uso. Para trocar pelo ícone roxo com o "check" do mockup:
1. No Android Studio: botão direito em `app` → `New → Image Asset`.
2. Escolha sua imagem do ícone (fundo roxo `#8B5CF6` + check branco).
3. Gere para todas as densidades — ele substitui os `mipmap/ic_launcher*` automaticamente.

## 🗺️ Próximos passos sugeridos (não incluídos neste MVP)

Conforme o roadmap da documentação (v2/v3):
- Edição de tarefas existentes (hoje só é possível excluir e recriar)
- Categorias e tarefas recorrentes
- Estatísticas e widgets Android
- Exportação/backup dos dados (JSON local)

---

**Filosofia do projeto:** simples, rápido, privado e offline.
