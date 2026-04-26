# 🛒 Guia Completo de Configuração do Sistema de Checkout

## 📋 Índice
1. [Pré-requisitos](#pré-requisitos)
2. [Configuração do Firebase](#configuração-do-firebase)
3. [Configuração do SuperFrete](#configuração-do-superfrete)
4. [Configuração do Mercado Pago](#configuração-do-mercado-pago)
5. [Variáveis de Ambiente](#variáveis-de-ambiente)
6. [Adicionar Dimensões aos Produtos](#adicionar-dimensões-aos-produtos)
7. [Deploy na Vercel](#deploy-na-vercel)
8. [Testes](#testes)

---

## 🎯 Pré-requisitos

- Node.js 18+ instalado
- Conta Firebase (já configurada)
- Conta Mercado Pago
- Conta SuperFrete
- Acesso ao dashboard da Vercel

---

## 🔥 Configuração do Firebase

### 1. Obter Credenciais de Service Account

1. Acesse: https://console.firebase.google.com/
2. Selecione: **kitsuystore-f2805**
3. Clique no ⚙️ ao lado de "Visão geral do projeto" > **Configurações do projeto**
4. Vá em: **Contas de serviço**
5. Clique em: **Gerar nova chave privada**
6. Baixe o arquivo JSON

### 2. Extrair Variáveis do JSON

Do arquivo JSON baixado, extraia:
- `project_id` → `FIREBASE_PROJECT_ID`
- `client_email` → `FIREBASE_CLIENT_EMAIL`
- `private_key` → `FIREBASE_PRIVATE_KEY` (manter as quebras de linha \n)

### 3. Aplicar Regras de Segurança

Siga as instruções em `FIRESTORE_RULES.md`

---

## 📦 Configuração do SuperFrete

### 1. Criar Conta

1. Acesse: https://superfrete.com/
2. Crie uma conta business
3. Complete o cadastro da sua empresa

### 2. Obter Token da API

1. Faça login no dashboard
2. Vá em: **Configurações** > **Integrações**
3. Clique em: **Gerar Token de API**
4. Copie o token gerado

### 3. Configurar CEP de Origem

- Use o CEP do endereço de onde você despacha os produtos
- Exemplo: Se você envia de São Paulo - SP: `01310100`

---

## 💳 Configuração do Mercado Pago

### 1. Criar Aplicação

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Clique em: **Criar aplicação**
3. Preencha:
   - Nome: "Kitsuy Store Checkout"
   - Produto: "Pagamentos online"

### 2. Obter Credenciais de TESTE (Sandbox)

1. Na sua aplicação, vá em: **Credenciais**
2. Seção **Credenciais de teste**:
   - **Public Key** (começa com TEST-...) → `VITE_MERCADOPAGO_PUBLIC_KEY`
   - **Access Token** (começa com TEST-...) → `MERCADOPAGO_ACCESS_TOKEN`

### 3. Configurar Webhook

1. No painel MP, vá em: **Webhooks**
2. Clique em: **Adicionar webhook**
3. Configure:
   - **URL**: `https://seu-dominio.vercel.app/api/webhook`
   - **Eventos**: Marque "Pagamentos"
4. Após salvar, copie o **Secret** gerado → `MERCADOPAGO_WEBHOOK_SECRET`

### 4. Para Produção (depois de testar)

1. Solicite ativação em: **Ir para produção**
2. Aguarde aprovação do Mercado Pago
3. Após aprovado, use as **Credenciais de produção**
4. Atualizar webhook para URL de produção

---

## 🔐 Variáveis de Ambiente

### No arquivo `.env` local:

```bash
# ===================================
# MERCADO PAGO
# ===================================
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-73a3ea04-d391-489e-9e3d-c4dde1114496
MERCADOPAGO_ACCESS_TOKEN=TEST-8683509519908648-021720-ab78f73f7a47faefac48ec060cbbce3e-277732901
MERCADOPAGO_WEBHOOK_SECRET=sua_chave_secreta_do_webhook

# ===================================
# SUPERFRETE
# ===================================
SUPERFRETE_TOKEN=seu_token_superfrete_aqui
LOJA_CEP_ORIGEM=01310100

# ===================================
# FIREBASE ADMIN (do JSON baixado)
# ===================================
FIREBASE_PROJECT_ID=kitsuystore-f2805
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kitsuystore-f2805.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# ===================================
# FIREBASE CLIENT (já existente)
# ===================================
VITE_FIREBASE_API_KEY=AIzaSyB92QbZa9aLYJ6Vhbam8HPxJln3FcI0FU0
VITE_FIREBASE_AUTH_DOMAIN=kitsuystore-f2805.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=kitsuystore-f2805
VITE_FIREBASE_STORAGE_BUCKET=kitsuystore-f2805.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=812067288329
VITE_FIREBASE_APP_ID=1:812067288329:web:ac4c1a048b1c5d5d3d8fd8

# ===================================
# URL DO SITE
# ===================================
VITE_SITE_URL=http://localhost:8081
```

### Na Vercel (Produção):

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto
3. Vá em: **Settings** > **Environment Variables**
4. Adicione TODAS as variáveis acima (uma por uma)
5. ⚠️ Marque como "Sensitive" as variáveis secretas:
   - `MERCADOPAGO_ACCESS_TOKEN`
   - `MERCADOPAGO_WEBHOOK_SECRET`
   - `SUPERFRETE_TOKEN`
   - `FIREBASE_PRIVATE_KEY`
   - `FIREBASE_CLIENT_EMAIL`

---

## 📐 Adicionar Dimensões aos Produtos

Para o cálculo de frete funcionar, TODOS os produtos precisam ter dimensões.

### Via Firebase Console:

1. Acesse: https://console.firebase.google.com/
2. Vá em: **Firestore Database**
3. Entre na coleção do produto (ex: `products`, `ProductsOferta`)
4. Clique no documento do produto
5. Adicione os seguintes campos:

```javascript
{
  // ... campos existentes ...
  
  // NOVOS CAMPOS OBRIGATÓRIOS:
  "pesoEmKg": 0.35,          // Peso em quilos (ex: 350g = 0.35)
  "alturaEmCm": 25,          // Altura da embalagem em cm
  "larguraEmCm": 15,         // Largura da embalagem em cm
  "comprimentoEmCm": 10      // Comprimento da embalagem em cm
}
```

### Exemplos práticos:

#### Figure pequena (Funko Pop style):
```javascript
{
  "pesoEmKg": 0.2,
  "alturaEmCm": 15,
  "larguraEmCm": 10,
  "comprimentoEmCm": 10
}
```

#### Figure média (action figure):
```javascript
{
  "pesoEmKg": 0.5,
  "alturaEmCm": 30,
  "larguraEmCm": 20,
  "comprimentoEmCm": 15
}
```

#### Figure grande (premium):
```javascript
{
  "pesoEmKg": 1.5,
  "alturaEmCm": 40,
  "larguraEmCm": 30,
  "comprimentoEmCm": 25
}
```

### ⚠️ Regras importantes:
- Medidas sempre da EMBALAGEM (não do produto)
- Peso incluindo embalagem e proteção
- Valores mínimos dos Correios:
  - Altura: mínimo 2cm
  - Largura: mínimo 11cm
  - Comprimento: mínimo 16cm
  - Peso: mínimo 0.1kg

---

## 🚀 Deploy na Vercel

### 1. Preparar para Deploy

```bash
# Testar build local
npm run build

# Verificar se não há erros
```

### 2. Deploy

```bash
# Fazer commit das alterações
git add .
git commit -m "feat: implementação completa de checkout com frete"
git push origin main
```

### 3. Verificar no Dashboard

1. Acesse: https://vercel.com/dashboard
2. O deploy deve iniciar automaticamente
3. Aguarde finalizar (2-3 minutos)
4. Clique no link do projeto para testar

### 4. Configurar Domínio (Opcional)

1. Em Settings > Domains
2. Adicione seu domínio customizado
3. Configure o DNS conforme instruído

---

## 🧪 Testes

### 1. Testar Localmente

```bash
npm run dev
```

Acesse: http://localhost:8081/checkout?produto=ID_DO_PRODUTO&colecao=products

### 2. Fluxo de Teste Completo

1. **Selecionar produto** → Deve carregar dados
2. **Preencher endereço** → CEP deve auto-completar
3. **Calcular frete** → Deve mostrar opções (PAC, SEDEX)
4. **Escolher frete** → Deve avançar para pagamento
5. **Ver botão MP** → Wallet Brick do Mercado Pago
6. **Clicar em pagar** → Redireciona para MP
7. **Usar cartão de teste**:
   - **Aprovado**: 5031 4332 1540 6351
   - **Recusado**: 5031 7557 3453 0604
   - CVV: 123
   - Validade: qualquer data futura
8. **Verificar webhook** → Logs na Vercel Functions
9. **Confirmar pedido** → Status deve mudar no Firestore

### 3. Monitorar Logs

Na Vercel:
- **Functions** > Ver logs em tempo real
- Procurar por `[calcular-frete]`, `[criar-preferencia]`, `[webhook]`

No Firebase:
- **Firestore** > Coleção `pedidos` > Ver documentos criados
- **Firestore** > Coleção `pagamentos_webhook` > Ver notificações

---

## ✅ Checklist Final

- [ ] Regras de segurança aplicadas no Firestore
- [ ] Variáveis de ambiente configuradas na Vercel
- [ ] Dimensões adicionadas em TODOS os produtos
- [ ] Webhook configurado no painel do Mercado Pago
- [ ] CEP de origem configurado (SuperFrete)
- [ ] Teste de compra com cartão de sandbox funcionando
- [ ] Webhook recebendo notificações (ver logs)
- [ ] Status de pedido atualizando no Firestore
- [ ] Credenciais de PRODUÇÃO configuradas (após aprovação MP)

---

## 🆘 Troubleshooting

### Erro: "Produto sem dimensões"
→ Adicione campos `pesoEmKg`, `alturaEmCm`, `larguraEmCm`, `comprimentoEmCm`

### Erro: "FIREBASE_PRIVATE_KEY ausente"
→ Verifique se a chave está com aspas e \n literais na Vercel

### Erro: "Nenhuma opção de frete disponível"
→ Verifique CEP de origem e dimensões do produto

### Webhook não está chegando
→ Verifique URL do webhook no painel MP (deve ser HTTPS)

### Pagamento não atualiza status
→ Verifique logs do webhook na Vercel Functions

---

## 📞 Suporte

- Documentação MP: https://www.mercadopago.com.br/developers/
- Documentação SuperFrete: https://docs.superfrete.com/
- Firebase: https://firebase.google.com/docs
