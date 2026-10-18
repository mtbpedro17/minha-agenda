# 7. Design e estilos

O app usa **Tailwind CSS 4** com um tema **escuro e roxo**. Não existe arquivo `tailwind.config.js`: no Tailwind 4 a configuração fica **dentro do CSS** (`app/globals.css`), com o bloco `@theme`.

## 7.1 Como as cores funcionam

`app/globals.css` faz duas coisas:

1. Define as cores como **variáveis CSS** em `:root`.
2. No `@theme inline`, transforma cada variável num **token do Tailwind** (`--color-xxx`). A partir daí existem as classes `bg-xxx`, `text-xxx`, `border-xxx`, `ring-xxx` etc.

```css
:root {
  --accent: #8b5cf6;
}
@theme inline {
  --color-accent: var(--accent);   /* → bg-accent, text-accent, ring-accent, shadow-accent/30 … */
}
```

## 7.2 Paleta

| Token / classe | Valor | Uso |
|---|---|---|
| `background` | `#0b0b10` | Fundo da tela |
| `surface` | `#16161f` | Cards, campos, barra inferior |
| `surface-elevated` | `#1c1c28` | Painéis inferiores (*sheets*), círculos de ícone, botão lápis |
| `border` | `#2a2a38` | Bordas e divisórias |
| `foreground` | `#f4f4f6` | Texto principal |
| `muted` | `#9797a8` | Texto secundário, ícones inativos, placeholders |
| `accent` | `#8b5cf6` | Cor da marca: botões, aba ativa, seleção, foco |
| `accent-strong` | `#7c3aed` | (definida, ainda sem uso) |
| `accent-soft` | roxo 14 % | (definida, ainda sem uso) |
| `priority-high` / `-soft` | `#ef4444` / vermelho 14 % | Prioridade Alta, erros, botão excluir |
| `priority-medium` / `-soft` | `#f59e0b` / laranja 14 % | Prioridade Média (a versão `-soft` ainda não é usada) |
| `priority-low` / `-soft` | `#22c55e` / verde 14 % | Prioridade Baixa, contador "Concluídas" (a versão `-soft` ainda não é usada) |

As mesmas cores aparecem também fora do CSS. Ao mudar a identidade visual, atualize **todos** estes lugares:

| Arquivo | O que tem |
|---|---|
| `app/globals.css` | Paleta completa |
| `app/layout.tsx` | `themeColor: "#0b0b10"` (cor da barra do navegador/sistema) |
| `capacitor.config.ts` | `backgroundColor: "#0b0b10"` (fundo da WebView) e `iconColor: "#8b5cf6"` (notificação) |
| `android/app/src/main/res/values/ic_launcher_background.xml` | Fundo do ícone adaptativo do app (hoje `#FFFFFF`, padrão do Capacitor) |
| `android/app/src/main/res/drawable*/splash.png` | Tela de abertura (splash) |

## 7.3 Padrões visuais (copie estes ao criar telas novas)

| Elemento | Classes usadas |
|---|---|
| Área de conteúdo da tela | `<main className="flex-1 overflow-y-auto px-5 pb-28 pt-6">` (`pb-28` deixa espaço para a barra inferior e o botão +; telas sem barra usam `pb-10`) |
| Título da tela | `text-xl font-semibold text-foreground` (secundárias: `text-lg`) |
| Título de seção | `text-sm font-medium text-muted` |
| Card | `rounded-2xl bg-surface px-4 py-3.5` |
| Campo de texto | `w-full rounded-2xl bg-surface px-4 py-3 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent` |
| Botão principal | `w-full rounded-2xl bg-accent py-3.5 font-medium text-white transition-transform active:scale-[0.98]` |
| Botão destrutivo | `rounded-2xl bg-priority-high-soft text-priority-high` |
| Chip/filtro ativo × inativo | `rounded-full px-4 py-1.5 text-sm font-medium` + `bg-accent text-white` × `bg-surface text-muted` |
| Painel inferior (*sheet*) | Fundo: `fixed inset-0 z-30 flex items-end justify-center bg-black/60` · Caixa: `w-full max-w-md rounded-t-3xl bg-surface-elevated p-5` |
| Botão-ícone | `rounded-full p-1.5 text-muted` |
| Feedback de toque | `active:scale-95` (o app não usa *hover*, pois é para toque) |

### Camadas (z-index)

| z | Elemento |
|---|---|
| `z-20` | Barra inferior e botão flutuante + |
| `z-30` | Painéis inferiores (*sheets*) e o fundo escurecido |
| `z-40` | Janela de confirmação (`ConfirmDialog`), acima dos painéis |

### Área segura (entalhe/gestos)

A barra inferior e os *sheets* usam `pb-[max(0.5rem,env(safe-area-inset-bottom))]` para não ficarem embaixo da barra de gestos do Android.

## 7.4 Tipografia

Fonte do sistema (`ui-sans-serif, system-ui, Roboto…`). No Android, isso é **Roboto**. Não há fontes web carregadas, o que mantém o app 100 % offline.

## 7.5 Modo claro

Não existe. `html { color-scheme: dark; }` força controles nativos (seletores de data/hora) no modo escuro, e os inputs de data/hora também usam `[color-scheme:dark]`. Para criar um tema claro, redefina as variáveis de `:root` dentro de uma classe ou de `@media (prefers-color-scheme: light)`. Os tokens do Tailwind acompanham sozinhos.

## 7.6 Adicionando uma cor nova

```css
/* app/globals.css */
:root {
  --info: #38bdf8;
}
@theme inline {
  --color-info: var(--info);
}
```

Depois use `text-info`, `bg-info/20` etc. Reinicie o `npm run dev` se a classe não aparecer.
