# 🔐 Configuração de Tokens - Kitsuy Store

## ✅ Tokens Já Configurados

Todos os tokens necessários já estão configurados no arquivo `.env` e `.env.local`:

### 1. Mercado Pago (SANDBOX - Testes)

```env
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-73a3ea04-d391-489e-9e3d-c4dde1114496
MERCADOPAGO_ACCESS_TOKEN=TEST-8683509519908648-021720-ab78f73f7a47faefac48ec060cbbce3e-277732901
```

**📍 Onde conseguir:**
- Acesse: https://www.mercadopago.com.br/developers/panel
- Vá em: **Suas integrações** > **Suas credenciais**
- Use as credenciais de **TESTE** (sandbox) para desenvolvimento
- Use as credenciais de **PRODUÇÃO** quando for publicar

**Como identificar:**
- ✅ Public Key de teste: começa com `TEST-`
- ✅ Access Token de teste: começa com `TEST-`
- 🔴 Produção: NÃO começa com `TEST-`

---

### 2. Firebase Admin

```env
FIREBASE_PROJECT_ID=kitsuystore-f2805
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@kitsuystore-f2805.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**📍 Onde conseguir:**
1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto: **kitsuystore-f2805**
3. Clique no ícone de engrenagem ⚙️ > **Configurações do projeto**
4. Vá na aba: **Contas de serviço**
5. Clique em: **Gerar nova chave privada**
6. Baixe o arquivo JSON
7. Extraia os valores:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`

**⚠️ IMPORTANTE:** A chave privada deve estar entre aspas duplas e com `\n` para quebras de linha:
```env
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBAD...\n-----END PRIVATE KEY-----\n"
```

---

### 3. URL do Site

```env
VITE_SITE_URL=http://localhost:8081
```

**Para desenvolvimento local:**
```env
VITE_SITE_URL=http://localhost:8081
```

**Para produção (Vercel):**
```env
VITE_SITE_URL=https://seu-site.vercel.app
```

---

## 📦 Tokens OPCIONAIS (Não Implementados Ainda)

Se você quiser adicionar mais funcionalidades no futuro:

### Email Service (SendGrid, Mailgun, etc.)
```env
EMAIL_SERVICE_API_KEY=sua_chave_aqui
EMAIL_FROM=noreply@kitsuystore.com
```

### Analytics
```env
GOOGLE_ANALYTICS_ID=G-XXXXXXXXXX
```

### WhatsApp Business API
```env
WHATSAPP_API_TOKEN=sua_chave_aqui
WHATSAPP_PHONE_NUMBER_ID=seu_id_aqui
```

---

## 🚀 Como Testar Localmente

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
Os arquivos `.env` e `.env.local` já estão configurados.

### 3. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

Acesse: http://localhost:8081

### 4. Testar pagamento
1. Acesse um produto na loja
2. Clique em "Comprar"
3. Você será redirecionado para o checkout do Mercado Pago (SANDBOX)
4. Use os **cartões de teste** do Mercado Pago:

**Cartões de Teste (SANDBOX):**
- ✅ **Aprovado:** `5031 4332 1540 6351` (Mastercard)
- ✅ **Aprovado:** `4235 6477 2802 5682` (Visa)
- ❌ **Recusado:** `5031 7557 3453 0604`
- ⏳ **Pendente:** `5031 4332 1540 6351` (com valor específico)

**Dados de teste:**
- Nome: `APRO` (para aprovado) ou `OTHE` (para recusado)
- CPF: `123.456.789-01` (qualquer CPF válido)
- Validade: qualquer data futura
- CVV: `123`

---

## 🌐 Configuração para Produção (Vercel)

### 1. Criar conta na Vercel
https://vercel.com/

### 2. Conectar repositório GitHub
- Importe o repositório da Kitsuy Store
- A Vercel detectará automaticamente como um projeto Vite/React

### 3. Configurar variáveis de ambiente
No painel da Vercel, vá em:
**Settings** > **Environment Variables**

Adicione TODAS as variáveis do arquivo `.env`:

```
VITE_MERCADOPAGO_PUBLIC_KEY
MERCADOPAGO_ACCESS_TOKEN
VITE_SITE_URL
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```

**⚠️ ATENÇÃO:** 
- Para produção, use as credenciais de **PRODUÇÃO** do Mercado Pago (sem `TEST-`)
- Atualize `VITE_SITE_URL` para a URL da Vercel (ex: `https://kitsuy-store.vercel.app`)

### 4. Deploy
```bash
git push origin main
```

A Vercel fará o deploy automaticamente!

---

## 🔧 Troubleshooting

### Erro: "MERCADOPAGO_ACCESS_TOKEN não configurado"
✅ Verifique se o token está no arquivo `.env` ou `.env.local`

### Erro: "Firebase Admin SDK não inicializado"
✅ Verifique se os 3 tokens do Firebase estão corretos
✅ Certifique-se que a PRIVATE_KEY tem `\n` e está entre aspas

### Webhook não funciona localmente
⚠️ Webhooks só funcionam em produção (Vercel)
💡 Para testar localmente, use ferramentas como **ngrok** ou **localtunnel**

### Pagamento não redireciona
✅ Verifique se `VITE_SITE_URL` está correto
✅ Certifique-se que a porta é `8081`

---

## 📚 Documentação Oficial

- **Mercado Pago:** https://www.mercadopago.com.br/developers/pt/docs
- **Firebase Admin:** https://firebase.google.com/docs/admin/setup
- **Vercel:** https://vercel.com/docs
- **Vite:** https://vitejs.dev/

---

## ✅ Checklist Final

- [x] Tokens do Mercado Pago configurados (SANDBOX)
- [x] Tokens do Firebase Admin configurados
- [x] URL do site configurada
- [x] Porta do Vite ajustada para 8081
- [x] vercel.json configurado com rotas de API
- [x] Pronto para testar!

---

**🎉 Tudo está configurado! Execute `npm run dev` e teste sua loja!**
