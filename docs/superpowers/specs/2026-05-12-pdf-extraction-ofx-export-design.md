# PDF Extraction Refactor + OFX Export

**Data:** 2026-05-12

## Objetivo

Duas melhorias no fluxo do AutoLançamento:
1. Trocar extração de PDF de OpenRouter (multimodal) para pdf-parse + Groq texto — mais estável, sem limite de quota multimodal
2. Adicionar exportação OFX para importação direta no Thomson Reuters Domínio Web — individual e em lote

## Contexto

- PDFs recebidos via Telegram são sempre digitais (texto embutido) — sem necessidade de OCR ou visão
- OpenRouter com Gemma 4 31B atingia quota frequentemente; modelos de texto no Groq têm 14.400 req/dia grátis
- TR_USE_MOCK=true por enquanto — exportação OFX é o caminho para integração real

---

## Seção 1 — Extração de PDF (nova abordagem)

### Stack
- `pdf-parse` — extrai texto do PDF dentro da função Vercel (sem API externa)
- `groq-sdk` — envia o texto extraído para `llama-3.3-70b-versatile` via Groq
- Resposta: mesmo JSON estruturado de transações que hoje

### Arquivos
| Ação | Arquivo |
|---|---|
| Criar | `src/lib/pdf/extractor-groq.ts` |
| Deletar | `src/lib/pdf/extractor-openrouter.ts` |
| Modificar | `src/lib/telegram/webhook-handler.ts` — troca import |
| Modificar | `next.config.ts` — adiciona `pdf-parse` em `serverExternalPackages` |
| Modificar | `.env.local` — adiciona `GROQ_API_KEY` |

### Fluxo
```
PDF Buffer
  └─► pdf-parse → texto bruto
        └─► Groq llama-3.3-70b-versatile → JSON com transações
              └─► validação + mapeamento → ExtractionResult
```

### Env vars
| Variável | Descrição |
|---|---|
| `GROQ_API_KEY` | API key do Groq (console.groq.com) |

---

## Seção 2 — Exportação OFX

### Formato OFX
- OFX 1.02 SGML (mais compatível com TR Domínio Web e bancos brasileiros)
- `CURDEF: BRL`
- `TRNTYPE`: `DEBIT` ou `CREDIT`
- `TRNAMT`: negativo para débitos, positivo para créditos
- `DTPOSTED`: `YYYYMMDDHHMMSS`
- `FITID`: ID da transação (garante unicidade)
- `MEMO`: descrição da transação

### Arquivos
| Ação | Arquivo |
|---|---|
| Criar | `src/lib/export/ofx.ts` |
| Criar | `src/app/api/submissions/[id]/export-ofx/route.ts` |
| Criar | `src/app/api/submissions/export-ofx/route.ts` |
| Modificar | `src/app/admin/queue/[id]/page.tsx` — botão individual |
| Modificar | `src/app/admin/history/page.tsx` — checkboxes + bulk export |

### API Individual
`GET /api/submissions/[id]/export-ofx`
- Admin only
- Busca submission + transactions do Supabase
- Gera OFX e retorna com `Content-Disposition: attachment; filename="empresa-YYYYMMDD.ofx"`

### API em Lote
`POST /api/submissions/export-ofx`
- Body: `{ ids: string[] }` (máx 50)
- Admin only
- Busca todas as transações de todas as submissões
- Gera um único OFX combinado, transações ordenadas por data
- Filename: `exportacao-YYYYMMDD-Nitens.ofx`

### UI — Detalhe da submissão
- Botão "Exportar OFX" no cabeçalho ao lado do badge de status
- Disponível para qualquer status (não só pending)
- Link direto para `GET /api/submissions/[id]/export-ofx`

### UI — Histórico (`/admin/history`)
- Checkbox em cada linha da lista
- Botão flutuante fixo no rodapé: "Exportar X selecionadas" — aparece quando ≥ 1 item selecionado
- Histórico vira client component para gerenciar estado de seleção
- POST para `/api/submissions/export-ofx` com os IDs selecionados → download do arquivo

---

## Dependências a instalar
```bash
npm install groq-sdk pdf-parse
npm install --save-dev @types/pdf-parse
```
