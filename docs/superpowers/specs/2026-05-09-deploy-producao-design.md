# Deploy de Produção — AutoLançamento

**Data:** 2026-05-09

## Objetivo

Colocar o AutoLançamento online no Vercel para testar o fluxo completo via bot Telegram:
cliente envia PDF → Gemini extrai transações → admin aprova no dashboard web → (TR mock).

## Contexto

- Supabase (DB + Auth + Storage): já configurado e funcional
- Código do bot Telegram: completo em `src/lib/telegram/` e `src/app/api/webhooks/telegram/route.ts`
- Migrations: 3 arquivos prontos (`001`, `002`, `003`)
- Build: passando localmente

## Arquitetura do Deploy

```
GitHub (repo privado)
  └─► Vercel (Next.js 16, deploy automático no push)
        ├─ /api/webhooks/telegram  ← Telegram envia updates aqui
        ├─ /admin/*               ← Dashboard do contador
        └─ /(client)/*            ← Portal do cliente
             ↑
        Supabase Cloud (já configurado)
        Google AI / Gemini (já tem key)
```

## Passos do Deploy

### 1. GitHub
- Criar repo privado `autolancamento` na conta do usuário via `gh repo create`
- Push do branch `main`

### 2. Vercel
- Criar projeto conectado ao repo GitHub
- Framework: Next.js (detectado automaticamente)
- Configurar todas as env vars do `.env.local` no painel do Vercel
- Atualizar `NEXT_PUBLIC_APP_URL` para a URL do Vercel gerada

### 3. Google OAuth (Supabase)
- Já configurado — apenas adicionar a URL do Vercel como Redirect URL no Supabase Auth dashboard

### 4. Webhook do Telegram
- Registrar via API do Telegram:
  `https://api.telegram.org/bot{TOKEN}/setWebhook?url=https://[app].vercel.app/api/webhooks/telegram`

### 5. Descobrir e corrigir ADMIN_TELEGRAM_CHAT_ID
- Problema atual: `ADMIN_TELEGRAM_CHAT_ID=AutoLancamentos_bot` (username do bot, não chat_id)
- Corrigir: adicionar log temporário no webhook para logar o `chatId` no primeiro `/start`
- Depois atualizar a env var no Vercel com o número correto e fazer redeploy

## Variáveis de Ambiente no Vercel

| Variável | Status |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ pronto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ pronto |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ pronto |
| `ADMIN_EMAILS` | ✅ pronto |
| `GOOGLE_AI_API_KEY` | ✅ pronto |
| `TELEGRAM_BOT_TOKEN` | ✅ pronto |
| `ADMIN_TELEGRAM_CHAT_ID` | ⚠️ precisa corrigir (descobrir via log) |
| `NEXT_PUBLIC_APP_URL` | ⚠️ atualizar com URL do Vercel |
| `TR_USE_MOCK` | ✅ `true` |

## Fluxo de Teste

1. Admin manda `/start` para o bot → bot responde com chat_id
2. Atualizar `ADMIN_TELEGRAM_CHAT_ID` no Vercel → redeploy
3. Cliente (conta de teste) manda PDF para o bot
4. Admin acessa `https://[app].vercel.app/admin/queue` e vê a submissão
5. Admin aprova → TR mock responde com sucesso
