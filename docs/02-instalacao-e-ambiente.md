# 2. Instalação e ambiente

Este guia leva você de uma máquina "zerada" até o app rodando — primeiro no navegador, depois no Android.

## 2.1 Requisitos

### Para trabalhar só na interface (navegador)

| Ferramenta | Versão | Por quê |
|---|---|---|
| **Node.js** | **22 ou mais novo** (LTS recomendado) | O Next.js 16 pede ≥ 20.9 e a CLI do Capacitor 8 pede **≥ 22**. Com Node 18 ou 20 o `npx cap …` falha. |
| **npm** | o que vem com o Node | O projeto usa `package-lock.json` (não misture com yarn/pnpm). |
| **Git** | qualquer recente | Controle de versão. |
| Editor | VS Code recomendado | Extensões úteis: *ESLint*, *Tailwind CSS IntelliSense*. |

### Para gerar o app Android (além do acima)

| Ferramenta | Versão | Observação |
|---|---|---|
| **Android Studio** | versão recente (com suporte a **AGP 8.13** e **compileSdk 36**) | Inclui o SDK do Android e o emulador. |
| **JDK** | **21** | O Capacitor 8 compila com Java 21 (`JavaVersion.VERSION_21`). O Android Studio já traz um JDK 21 embutido (*JetBrains Runtime*) — basta usar ele. |
| **Android SDK Platform 36** | — | Instale em *Android Studio → Settings → Languages & Frameworks → Android SDK*. |
| Celular Android 7.0+ **ou** um emulador | API 24+ | Para testar notificações de verdade, prefira **API 33+**. |

> ⚠️ O README antigo dizia "JDK 17" e "Node 18+". Esses valores estão **desatualizados** — use JDK 21 e Node 22+.

Confira as versões:

```bash
node -v      # deve mostrar v22.x ou maior
npm -v
java -version   # (opcional) se for compilar fora do Android Studio, deve ser 21
```

## 2.2 Primeira instalação

```bash
git clone <url-do-repositorio> minha-agenda
cd minha-agenda
npm install
```

O `npm install` baixa tudo o que está em `package.json` para a pasta `node_modules/` (não versionada).

### O arquivo `public/assets/sql-wasm.wasm` (já incluído — não apague)

No navegador, o banco SQLite roda via **jeep-sqlite**, que carrega um arquivo WebAssembly de **`public/assets/sql-wasm.wasm`**. O arquivo **já faz parte do projeto** (≈ 650 KB, da **sql.js 1.12.0**), então você não precisa fazer nada. Sem ele, o app abre, mas nenhuma tela carrega dados e o console mostra `404 /assets/sql-wasm.wasm`.

> ⚠️ **A versão importa.** O jeep-sqlite 2.8 traz embutido o código JavaScript do sql.js de uma versão antiga, e o `.wasm` precisa ser compatível com ele. Testamos:
>
> | `.wasm` do sql.js | Resultado |
> |---|---|
> | 1.10.3 | ❌ `memory access out of bounds` |
> | **1.11.0 / 1.12.0** | ✅ funciona |
> | 1.13.0 / 1.14.x (a que o `npm install` instala) | ❌ `LinkError: ... function import requires a callable` |
>
> Por isso **não** substitua o arquivo por um copiado de `node_modules/sql.js/dist/`. Se atualizar o `jeep-sqlite` no futuro, teste de novo e troque o `.wasm` se necessário.

**Se o arquivo sumir ou precisar ser recriado**, baixe a versão 1.12.0:

```bash
# bash (Linux/macOS/Git Bash)
mkdir -p public/assets
curl -L -o public/assets/sql-wasm.wasm https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm
```

```powershell
# Windows PowerShell
New-Item -ItemType Directory -Force public/assets | Out-Null
Invoke-WebRequest https://cdn.jsdelivr.net/npm/sql.js@1.12.0/dist/sql-wasm.wasm -OutFile public/assets/sql-wasm.wasm
```

```bash
# Alternativa sem CDN (usa o registro do npm)
npm pack sql.js@1.12.0
tar -xzf sql.js-1.12.0.tgz
mkdir -p public/assets && cp package/dist/sql-wasm.wasm public/assets/
rm -rf package sql.js-1.12.0.tgz
```

O arquivo também vai parar dentro do APK, mas é inofensivo (no Android o SQLite nativo é usado).

## 2.3 Rodando no navegador

```bash
npm run dev
```

Abra **http://localhost:3000**.

- O app foi desenhado para celular (largura máx. 448 px). No Chrome/Edge, aperte **F12** e ative o **modo dispositivo** (ícone de celular) para ver como no Android.
- Cada alteração salva no código recarrega a tela automaticamente.
- Os dados ficam no **IndexedDB** do navegador (banco `jeepSqliteStore`). Para "zerar" o banco: F12 → *Application* → *IndexedDB* → apague o banco, ou use *Clear site data*.
- **Notificações não são testáveis de forma confiável no navegador.** Use um aparelho/emulador Android para isso.
- O ícone redondo **"N"** no canto inferior esquerdo é o indicador de desenvolvimento do Next.js; ele não aparece no build final.

### Como saber se o banco subiu

No console do navegador (F12 → *Console*) você deve ver linhas como:

```
#### getVersion new res: [{"columns":["user_version"],"values":[[0]]}]
```

Se em vez disso aparecer `404 ... sql-wasm.wasm`, `LinkError` ou `memory access out of bounds`, veja a seção do `sql-wasm.wasm` acima.

## 2.4 Rodando no Android (resumo)

```bash
npm run build           # gera out/
npx cap sync android    # copia out/ para android/ e atualiza plugins
npx cap open android    # abre o Android Studio
```

No Android Studio, escolha um dispositivo e clique em **▶ Run**. Na primeira vez o Gradle baixa várias dependências (precisa de internet e pode levar alguns minutos).

> ⚠️ **Ao clonar o projeto do Git, a pasta `android/` vem incompleta.** Os arquivos `android/app/src/main/assets/public/`, `capacitor.config.json`, `capacitor.plugins.json` e a pasta `android/capacitor-cordova-android-plugins/` estão no `.gitignore` porque são gerados. Se você abrir o Android Studio antes de rodar `npm run build && npx cap sync android`, o Gradle vai falhar com *"project ':capacitor-cordova-android-plugins' not found"* ou o app abrirá em branco.

O passo a passo completo (APK, assinatura, Play Store) está em [08 — Build Android e publicação](08-android-build-e-publicacao.md).

## 2.5 Scripts disponíveis

Definidos em `package.json`:

| Script | Comando real | Uso |
|---|---|---|
| `npm run dev` | `next dev` | Desenvolvimento no navegador |
| `npm run build` | `next build` | Build de produção. Como `next.config.ts` tem `output: "export"`, gera a pasta **`out/`** com HTML/CSS/JS estáticos. Também roda a checagem de tipos. |
| `npm run start` | `next start` | ⚠️ **Não funciona** com `output: "export"` (não há servidor). Para ver o build estático no navegador use `npx serve out`. |
| `npm run lint` | `eslint` | Análise do código (a pasta `android/` é ignorada, pois só tem arquivos gerados). Deve terminar sem erros. |
| `npm test` | `tsx tests/index.ts` | Roda os testes das regras sem navegador nem celular (repetição, horário dos lembretes, leitura do backup). Deve terminar com "Todos os testes passaram." |

## 2.6 Versões das dependências principais

| Pacote | Versão | Papel |
|---|---|---|
| `next` | 16.3.4 | Framework / rotas / build estático |
| `react`, `react-dom` | 19.2.8 | Interface |
| `typescript` | ^5 | Tipagem |
| `tailwindcss`, `@tailwindcss/postcss` | ^4 | Estilos utilitários |
| `@capacitor/core`, `@capacitor/android`, `@capacitor/cli` | ^8.5.1 | Ponte web ↔ Android |
| `@capacitor-community/sqlite` | ^8.1.1 | Plugin SQLite nativo |
| `jeep-sqlite` | ^2.8.0 | SQLite no navegador (só em desenvolvimento) |
| `@capacitor/local-notifications` | ^8.3.1 | Lembretes agendados |
| `@capacitor/app` | ^8.1.2 | Botão voltar do Android (fechar painéis, voltar de tela, sair do app) |
| `@capacitor/filesystem` | ^8.1.5 | Gravar o arquivo de backup na pasta temporária do app (Android) |
| `@capacitor/share` | ^8.0.3 | Abrir a janela de compartilhar do Android para o usuário guardar o backup |
| `@aparajita/capacitor-biometric-auth` | ^10.0.0 | Bloqueio do app com digital/rosto, com o PIN do celular como alternativa. No navegador, simula a biometria com uma janela de confirmação. |
| `lucide-react` | ^1.41.0 | Ícones |
| `tsx` (dev) | 4.19.2 | Executa os testes TypeScript direto no Node (`npm test`) |

> 💡 `next` e `react` estão com versão **fixa** (sem `^`) de propósito. Atualize-os juntos e teste o build e o app no Android depois.

## 2.7 Testando bloqueio e sons no navegador

- **Bloqueio:** em Configurações → Segurança, o interruptor funciona no navegador. No lugar da digital aparece uma janela de confirmação do navegador ("OK" = digital reconhecida, "Cancelar" = falhou). Recarregue a página para ver a tela de bloqueio. Trocar de aba por 30 s ou mais também bloqueia.
- **Sons:** o botão ▶ toca a prévia. A notificação de verdade, com o som escolhido, só pode ser testada no Android.

## 2.7 Variáveis de ambiente

O projeto **não usa** variáveis de ambiente nem arquivos `.env`. Não há chaves de API nem URLs de servidor.
