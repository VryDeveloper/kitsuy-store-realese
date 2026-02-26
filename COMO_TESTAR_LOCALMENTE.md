# 🚀 Como Testar Pagamentos Localmente - SOLUÇÃO DEFINITIVA

## ⚠️ PROBLEMA IDENTIFICADO

O erro **"Failed to execute 'json' on 'Response': Unexpected end of JSON input"** acontece porque:

- As APIs serverless em `/api/create-payment.ts` e `/api/webhook.ts` **NÃO funcionam no Vite puro**
- Elas precisam do **runtime da Vercel** para executar (Node.js serverless functions)

## ✅ SOLUÇÃO SIMPLES: Usar apenas Vercel Dev

### 📋 Passo a Passo:

#### 1️⃣ Pare qualquer servidor rodando
No terminal, pressione **Ctrl + C** para parar todos os servidores

#### 2️⃣ Execute este comando único:
```bash
npm run dev:test
```

**O que acontece:**
- ✅ Vercel Dev detecta automaticamente que é um projeto Vite
- ✅ Inicia o Vite na porta 8081
- ✅ Configura e serve as APIs serverless em `/api/*`
- ✅ Carrega variáveis de ambiente do `.env.local`

#### 3️⃣ Aguarde inicialização
Você verá algo como:
```
Vercel CLI 50.x.x
> Running Dev Command "npm run dev"
> VITE v5.x.x ready in xxx ms
> Ready! Available at http://localhost:8081
```

#### 4️⃣ Acesse e teste!
1. Abra: **http://localhost:8081**
2. Escolha um produto
3. Clique em **"Pagar com Mercado Pago"**
4. Agora funcionará! ✅

---

## 💳 Cartões de Teste do Mercado Pago (SANDBOX)

### ✅ APROVADO
```
Número: 5031 4332 1540 6351
Nome: APRO
Validade: 11/25
CVV: 123
CPF: 123.456.789-01
```

### ❌ RECUSADO
```
Número: 5031 7557 3453 0604
Nome: OTHE
Validade: 11/25
CVV: 123
CPF: 123.456.789-01
```

### ⏳ PENDENTE
```
Número: 5031 4332 1540 6351
Nome: CONT
Validade: 11/25
CVV: 123
CPF: 123.456.789-01
```

---

## 📋 Comandos Disponíveis

### ✅ Desenvolvimento com APIs (RECOMENDADO)
```bash
npm run dev:test
```
- Frontend + APIs funcionando
- Porta: 8081
- Perfeito para testar pagamentos

### Desenvolvimento simples (sem APIs)
```bash
npm run dev
```
- Apenas frontend
- ❌ Pagamentos não funcionam

### Build para produção
```bash
npm run build
```

### Preview do build
```bash
npm run preview
```

---

## 🐛 Troubleshooting

### Erro: "vercel: command not found"
```bash
npm install -g vercel
```

### Erro: "Port 8081 is already in use"
Mate o processo que está usando a porta:
```bash
# Windows
netstat -ano | findstr :8081
taskkill /PID <número_do_pid> /F
```

### APIs retornam erro 500
Verifique se:
1. Arquivo `.env.local` existe e está correto
2. Variável `FIREBASE_PRIVATE_KEY` tem `\n` para quebras de linha
3. Variável `MERCADOPAGO_ACCESS_TOKEN` começa com `TEST-`

### Console mostra "Failed to load resource"
Normal durante desenvolvimento. O importante é que após clicar em "Pagar com Mercado Pago", você seja redirecionado para o checkout.

---

## ⚡ Diferença Entre os Comandos

| Comando | Frontend | APIs | Para quê usar |
|---------|----------|------|---------------|
| `npm run dev` | ✅ Porta 8081 | ❌ Não funciona | Desenvolver UI |
| `npm run dev:test` | ✅ Porta 8081 | ✅ Funciona | **Testar pagamentos** |

---

## 🎯 Resumo Rápido

```bash
# Pare tudo
Ctrl + C

# Inicie tudo
npm run dev:test

# Acesse
http://localhost:8081

# Teste com cartão
5031 4332 1540 6351 - Nome: APRO
```

---

## 🚀 Deploy para Produção (Vercel)

Quando estiver tudo funcionando localmente:

1. Faça commit no Git
2. Conecte o repositório na Vercel
3. Configure as variáveis de ambiente:
   - `VITE_MERCADOPAGO_PUBLIC_KEY` (use credenciais de PRODUÇÃO sem `TEST-`)
   - `MERCADOPAGO_ACCESS_TOKEN` (use credenciais de PRODUÇÃO sem `TEST-`)
   - `VITE_SITE_URL` (URL da Vercel, ex: `https://kitsuy-store.vercel.app`)
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_CLIENT_EMAIL`
   - `FIREBASE_PRIVATE_KEY`
4. Deploy automático! 🎉

---

**✅ Agora você pode testar pagamentos localmente!** 💪
