# Documentação — Minha Agenda

Bem-vindo(a)! Esta pasta reúne tudo o que você precisa para entender, rodar, modificar e publicar o **Minha Agenda**.

## Por onde começar

**Nunca mexeu no projeto?** Siga esta ordem:

1. [Visão geral](01-visao-geral.md) — o que o app faz, tela por tela.
2. [Instalação e ambiente](02-instalacao-e-ambiente.md) — deixe o projeto rodando no navegador.
3. [Arquitetura](03-arquitetura.md) — como as peças se conectam.
4. [Guias práticos](09-guias-praticos.md) — faça sua primeira alteração seguindo uma receita.

**Já conhece o projeto e quer algo específico?**

| Quero… | Leia |
|---|---|
| Saber quais tabelas existem e como ler/gravar dados | [04 — Banco de dados](04-banco-de-dados.md) |
| Entender ou mudar os lembretes (inclusive o aviso antecipado) | [05 — Notificações](05-notificacoes.md) |
| Entender o backup em arquivo (formato, exportar, restaurar) | [04 — Banco de dados §4.6](04-banco-de-dados.md#46-backup-em-arquivo-formato) |
| Saber o que cada tela e componente faz e quais *props* recebe | [06 — Telas e componentes](06-telas-e-componentes.md) |
| Mudar cores, espaçamentos ou criar um componente visual | [07 — Design e estilos](07-design-e-estilos.md) |
| Gerar APK, assinar, publicar na Play Store | [08 — Build Android e publicação](08-android-build-e-publicacao.md) |
| Adicionar campo, tela, configuração… | [09 — Guias práticos](09-guias-praticos.md) |
| Resolver um erro | [10 — Solução de problemas](10-solucao-de-problemas.md) |
| Saber o que ainda não funciona bem | [11 — Problemas conhecidos e roadmap](11-problemas-conhecidos-e-roadmap.md) |

## Glossário rápido

| Termo | Significado neste projeto |
|---|---|
| **Next.js** | Framework React usado para organizar as telas (rotas) e gerar o build. Aqui ele roda em modo **exportação estática**: gera só HTML/CSS/JS, sem servidor. |
| **App Router** | Sistema de rotas do Next.js baseado em pastas: `app/agenda/page.tsx` vira a tela `/agenda`. |
| **Capacitor** | Ferramenta que empacota o site estático dentro de um app Android nativo (uma WebView) e dá acesso a recursos do celular por meio de *plugins*. |
| **Plugin** | Pacote do Capacitor que expõe uma função nativa ao JavaScript. Usamos dois: SQLite e Notificações Locais. |
| **SQLite** | Banco de dados em arquivo, guardado dentro do celular. |
| **jeep-sqlite** | Versão do SQLite que roda **no navegador** (via WebAssembly + IndexedDB). Só é usada quando você roda `npm run dev`. |
| **`out/`** | Pasta gerada por `npm run build` com o app compilado. É ela que vai para dentro do APK. |
| **Sync** | O comando `npx cap sync android`, que copia `out/` para o projeto Android e atualiza os plugins. |
| **Token de cor** | Variável CSS (ex.: `--accent`) que vira uma classe do Tailwind (ex.: `bg-accent`). |
| **Sheet** | Painel que sobe da parte de baixo da tela (ex.: detalhe da tarefa, formulário de nota). |

## Convenções desta documentação

- Caminhos de arquivos são sempre relativos à raiz do projeto (`minha-agenda/`).
- Blocos de comando assumem um terminal **bash** (Linux, macOS, Git Bash ou WSL). Quando o comando for diferente no Windows PowerShell, há uma versão separada.
- ⚠️ marca algo que costuma causar erro. 💡 marca uma dica.
