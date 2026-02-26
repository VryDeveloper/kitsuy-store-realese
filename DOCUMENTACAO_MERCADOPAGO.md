# 💳 Sistema de Pagamentos Mercado Pago - Kitsuy Store

## 🎯 Visão Geral

Sistema de pagamentos **REAL e SEGURO** integrado com Mercado Pago, implementado com arquitetura serverless usando Vercel Functions + Firebase + React.

### ✅ Implementado:
- ✅ Backend seguro com Vercel Functions
- ✅ Criação de pagamento sem expor credenciais
- ✅ Webhook para confirmação automática
- ✅ Armazenamento de pedidos no Firebase
- ✅ Páginas de retorno (sucesso, pendente, falha)
- ✅ Integração completa no frontend
- ✅ Suporte a PIX, Cartão e Boleto

---

## 🏗️ Arquitetura

```
┌─────────────────┐
│   FRONTEND      │
│  (React/Vite)   │
│                 │
│  - ProductDetail│
│  - Payment Pages│
└────────┬────────┘
         │
         │ POST /api/create-payment
         ▼
┌─────────────────┐
│ VERCEL FUNCTION │
│                 │
│  1. Valida dados│
│  2. Busca no    │
│     Firebase    │
│  3. Cria pref.  │
│     Mercado Pago│
│  4. Salva pedido│
└────────┬────────┘
         │
         │ Redireciona
         ▼
┌─────────────────┐
│  MERCADO PAGO   │
│   (Checkout)    │
│                 │
│  - PIX          │
│  - Cartão       │
│  - Boleto       │
└────────┬────────┘
         │
         │ Webhook POST /api/webhook
         ▼
┌─────────────────┐
│ VERCEL FUNCTION │
│                 │
│  1. Valida      │
│     pagamento   │
│  2. Atualiza    │
│     pedido      │
│  3. Firebase    │
└─────────────────┘
```

---

## 📁 Estrutura de Arquivos

### Backend (Vercel Functions)
```
api/
├── create-payment.ts    # Cria preferência de pagamento
└── webhook.ts           # Recebe notificações do MP
```

### Frontend
```
src/
├── services/
│   └── paymentService.ts       # Serviço de pagamento
├── pages/
│   ├── ProductDetail.tsx       # Botão de pagamento
│   ├── PaymentSuccess.tsx      # Página de sucesso
│   ├── PaymentPending.tsx      # Página pendente
│   └── PaymentFailure.tsx      # Página de falha
└── App.tsx                     # Rotas
```

### Configuração
```
.env                    # Variáveis de ambiente (LOCAL)
.env.example           # Template de exemplo
```

---

## 🔐 Configuração de Variáveis de Ambiente

### 1. Obter Credenciais do Mercado Pago

#### Acessar o Painel:
1. Vá para: https://www.mercadopago.com.br/developers/panel
2. Faça login com sua conta Mercado Pago
3. Clique em **"Suas integrações"**
4. Crie uma nova aplicação ou use uma existente

#### Copiar Credenciais:
- **SANDBOX (Testes)**: Use para desenvolvimento
- **PRODUÇÃO**: Use após aprovação da aplicação

### 2. Configurar Localmente

Edite o arquivo `.env`:

```bash
# ===================================
# MERCADO PAGO - CONFIGURAÇÃO
# ===================================

# SANDBOX (Testes)
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxx-xxxxxx-xxxxxxxxxxxxxxxx-xxxxxxxxxxxx

# URL do site
VITE_SITE_URL=http://localhost:8081

# ===================================
# FIREBASE ADMIN (para Vercel)
# ===================================
FIREBASE_PROJECT_ID=kitsuystore-f2805
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@kitsuystore-f2805.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nSUA_CHAVE_AQUI\n-----END PRIVATE KEY-----\n"
```

### 3. Obter Credenciais do Firebase Admin

1. Acesse: https://console.firebase.google.com
2. Selecione seu projeto: **kitsuystore-f2805**
3. Vá em **Configurações do projeto** (ícone de engrenagem)
4. Aba **Contas de serviço**
5. Clique em **"Gerar nova chave privada"**
6. Baixe o arquivo JSON
7. Extraia os valores:
   ```json
   {
     "project_id": "kitsuystore-f2805",
     "client_email": "firebase-adminsdk-xxxxx@...",
     "private_key": "-----BEGIN PRIVATE KEY-----\n..."
   }
   ```

### 4. Configurar na Vercel (Produção)

Após fazer deploy na Vercel:

1. Acesse o painel da Vercel
2. Selecione seu projeto
3. Vá em **Settings** → **Environment Variables**
4. Adicione TODAS as variáveis do `.env`:

```
Nome: VITE_MERCADOPAGO_PUBLIC_KEY
Valor: APP_USR-xxxxxxxx... (PRODUÇÃO)

Nome: MERCADOPAGO_ACCESS_TOKEN
Valor: APP_USR-xxxxxxxxxxxx... (PRODUÇÃO)

Nome: VITE_SITE_URL
Valor: https://seu-site.vercel.app

Nome: FIREBASE_PROJECT_ID
Valor: kitsuystore-f2805

Nome: FIREBASE_CLIENT_EMAIL
Valor: firebase-adminsdk-xxxxx@...

Nome: FIREBASE_PRIVATE_KEY
Valor: -----BEGIN PRIVATE KEY-----\n...
```

**IMPORTANTE**: Marque todas como **Production**, **Preview** e **Development**

---

## 🔥 Estrutura do Firebase

### Coleção: `orders`

Cada pedido é salvo com a seguinte estrutura:

```typescript
{
  orderId: "order_1234567890_abc123",
  productId: "abc123",
  collectionName: "products",
  productTitle: "Gojo Satoru - Jujutsu Kaisen",
  productImage: "https://...",
  quantity: 1,
  unitPrice: 450.00,
  totalAmount: 450.00,
  
  // Status
  status: "pending" | "paid" | "cancelled",
  paymentStatus: "pending" | "approved" | "rejected",
  paymentStatusDetail: "accredited" | "pending_contingency" | ...,
  
  // Mercado Pago
  mercadopagoPreferenceId: "123456789-abc-def",
  mercadopagoExternalReference: "1234567890-abc123",
  mercadopagoPaymentId: "987654321",
  transactionAmount: 450.00,
  paymentMethodId: "pix" | "credit_card" | "ticket",
  
  // Comprador
  buyerInfo: {
    name: "João Silva",
    email: "joao@example.com",
    phone: "71999999999"
  },
  payerEmail: "joao@example.com",
  
  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
  paidAt: Timestamp | null
}
```

### Campos Importantes:

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `status` | string | Status do pedido: `pending`, `paid`, `cancelled` |
| `paymentStatus` | string | Status do pagamento MP: `pending`, `approved`, `rejected` |
| `mercadopagoPaymentId` | string | ID da transação (após pagamento) |
| `transactionAmount` | number | Valor realmente pago |
| `paidAt` | Timestamp | Data/hora da confirmação |

---

## 🚀 Como Funciona - Fluxo Completo

### 1. **Usuário Clica em "Pagar com Mercado Pago"**

Frontend (`ProductDetail.tsx`):
```typescript
const handlePayment = async () => {
  await processPayment({
    productId: product.id,
    collectionName: product.source,
    quantity: quantity,
  });
};
```

### 2. **Frontend Chama API Segura**

Service (`paymentService.ts`):
```typescript
const response = await fetch('/api/create-payment', {
  method: 'POST',
  body: JSON.stringify(data),
});
```

### 3. **Backend Cria Preferência**

API (`api/create-payment.ts`):
```typescript
// 1. Busca produto no Firebase (não confia no frontend)
const productSnap = await db.collection(collectionName).doc(productId).get();

// 2. Calcula valor no backend
const unitPrice = parseFloat(product.price);
const totalAmount = unitPrice * quantity;

// 3. Cria preferência no Mercado Pago
const response = await preference.create({ body: preferenceData });

// 4. Salva pedido no Firebase
await db.collection('orders').doc(orderId).set({...});

// 5. Retorna URL de checkout
return { initPoint: response.init_point };
```

### 4. **Usuário Paga no Mercado Pago**

- Redireciona para checkout do Mercado Pago
- Usuário escolhe forma de pagamento:
  - **PIX**: QR Code ou Copia e Cola
  - **Cartão**: Preenche dados do cartão
  - **Boleto**: Gera boleto para pagamento

### 5. **Mercado Pago Confirma Pagamento**

Webhook (`api/webhook.ts`):
```typescript
// 1. Recebe notificação do MP
const { type, data } = req.body;

// 2. Busca detalhes do pagamento
const paymentInfo = await payment.get({ id: paymentId });

// 3. Atualiza pedido no Firebase
await db.collection('orders').doc(orderId).update({
  status: 'paid',
  paymentStatus: 'approved',
  mercadopagoPaymentId: paymentId,
  paidAt: admin.firestore.FieldValue.serverTimestamp(),
});
```

### 6. **Usuário é Redirecionado**

Baseado no resultado:
- **Sucesso**: `/pagamento/sucesso?payment_id=123`
- **Pendente**: `/pagamento/pendente`
- **Falha**: `/pagamento/falha`

---

## 🧪 Como Testar - Modo Sandbox

### 1. **Configurar Credenciais de Teste**

No `.env`, use credenciais **TEST**:
```bash
VITE_MERCADOPAGO_PUBLIC_KEY=TEST-xxxxxxxx
MERCADOPAGO_ACCESS_TOKEN=TEST-xxxxxxxxxxxx
```

### 2. **Iniciar Servidor Local**

```bash
npm run dev
```

### 3. **Acessar Página de Produto**

```
http://localhost:8081/produto/ID_DO_PRODUTO
```

### 4. **Clicar em "Pagar com Mercado Pago"**

Você será redirecionado para o checkout SANDBOX do Mercado Pago.

### 5. **Usar Cartões de Teste**

#### Cartões de Teste do Mercado Pago:

**Cartão Aprovado:**
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: APRO (qualquer nome)
```

**Cartão Recusado:**
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 11/25
Nome: OTHE (para testar recusa)
```

**Mais cartões**: https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards

### 6. **Testar Webhook Localmente**

Para testar webhook em desenvolvimento local, use **ngrok**:

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta local
ngrok http 8081

# Copiar URL pública (ex: https://abc123.ngrok.io)
# Configurar no Mercado Pago:
# https://abc123.ngrok.io/api/webhook
```

---

## 🌐 Deploy em Produção

### 1. **Fazer Deploy na Vercel**

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### 2. **Configurar Variáveis de Ambiente**

Na Vercel, adicione todas as variáveis (veja seção acima).

### 3. **Mudar para Credenciais de Produção**

No painel do Mercado Pago:
- Use credenciais **APP_USR** (não TEST)
- Sua aplicação precisa estar **aprovada**

### 4. **Configurar Webhook no Mercado Pago**

1. Acesse: https://www.mercadopago.com.br/developers/panel
2. Vá em sua aplicação
3. **Webhook** → Adicionar URL:
   ```
   https://seu-site.vercel.app/api/webhook
   ```
4. Selecione eventos:
   - ✅ Pagamentos
   - ✅ Estorno/Devolução

### 5. **Testar em Produção**

Use cartão real ou PIX real para testar!

---

## 🔒 Segurança Implementada

### ✅ O que está seguro:

1. **Access Token NUNCA exposto ao frontend**
   - Apenas no backend (Vercel Functions)
   - Variável de ambiente protegida

2. **Valores calculados no backend**
   - Frontend NÃO pode alterar preços
   - Produto buscado diretamente no Firebase

3. **Validações**
   - Produto existe?
   - Produto disponível?
   - Quantidade válida?
   - Preço correto?

4. **Webhook validado**
   - Busca real no Mercado Pago
   - Atualiza apenas após confirmação
   - Não confia em dados do frontend

### ❌ O que NÃO fazer:

- ❌ Nunca coloque `MERCADOPAGO_ACCESS_TOKEN` no frontend
- ❌ Nunca confie em valores enviados pelo frontend
- ❌ Nunca atualize pedido sem validar no MP
- ❌ Nunca exponha suas credenciais no código

---

## 📊 Monitoramento e Logs

### Ver Logs na Vercel:

1. Acesse seu projeto na Vercel
2. Vá em **Deployments**
3. Clique no deployment ativo
4. Aba **Functions**
5. Selecione `api/create-payment` ou `api/webhook`
6. Veja logs em tempo real

### Logs Importantes:

```
✅ Pedido criado: order_1234567890_abc123
💳 Preferência MP: 123456789-abc-def
📩 Webhook recebido: { type: 'payment', data: {...} }
💳 Status do pagamento: approved
✅ Pedido order_xxx atualizado para: paid (approved)
```

---

## 🐛 Troubleshooting

### Erro: "Configuração de pagamento ausente"

**Causa**: `MERCADOPAGO_ACCESS_TOKEN` não configurado

**Solução**:
- Verifique `.env` localmente
- Verifique variáveis na Vercel (produção)

### Erro: "Produto não encontrado"

**Causa**: ID ou coleção incorretos

**Solução**:
- Verifique se o produto existe no Firebase
- Confirme o `collectionName` (products, masterpiece, etc.)

### Webhook não está funcionando

**Causa**: URL incorreta ou não acessível

**Solução**:
- Verifique URL no painel do Mercado Pago
- Use ngrok para testar localmente
- Verifique logs da função webhook

### Pagamento aprovado mas pedido não atualizou

**Causa**: Webhook não recebeu notificação

**Solução**:
- Verifique URL do webhook
- Veja logs na Vercel
- Teste manualmente: POST para `/api/webhook`

---

## 📞 Suporte Mercado Pago

- **Documentação**: https://www.mercadopago.com.br/developers/pt/docs
- **Fórum**: https://www.mercadopago.com.br/developers/pt/support/center
- **Chat**: Disponível no painel de desenvolvedores

---

## ✅ Checklist Final

Antes de ir para produção:

- [ ] Credenciais de PRODUÇÃO configuradas
- [ ] Variáveis de ambiente na Vercel
- [ ] Webhook configurado no Mercado Pago
- [ ] Teste com pagamento real (pequeno valor)
- [ ] Confirme que webhook atualiza Firebase
- [ ] Páginas de retorno funcionando
- [ ] Logs sendo registrados corretamente
- [ ] Aplicação aprovada no Mercado Pago

---

## 🎉 Conclusão

Você agora tem um sistema de pagamentos **REAL e SEGURO** pronto para produção!

**Principais benefícios:**
- ✅ Segurança máxima (backend protegido)
- ✅ Múltiplas formas de pagamento
- ✅ Confirmação automática via webhook
- ✅ Rastreamento completo de pedidos
- ✅ Pronto para escalar

**Desenvolvido para:** Kitsuy Store  
**Data:** 17/02/2026  
**Versão:** 1.0.0

---

**📧 Contato:**
- Email: kitsuystore@gmail.com
- WhatsApp: (71) 99702-0168
- Instagram: @kitsuystore
