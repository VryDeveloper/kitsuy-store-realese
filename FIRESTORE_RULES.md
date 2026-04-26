# Regras de Segurança do Firestore

## ⚠️ IMPORTANTE: APLICAR ESTAS REGRAS NO FIREBASE CONSOLE

Acesse o Firebase Console > Firestore Database > Rules e cole o conteúdo abaixo:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PRODUTOS: Leitura pública, escrita apenas admin
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    match /ProductsOferta/{productId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    match /ProductsMasterPiece/{productId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.admin == true;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // PEDIDOS: BLOQUEADOS para o cliente
    // Apenas o Firebase Admin SDK (backend) pode acessar
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    match /pedidos/{pedidoId} {
      allow read, write: if false;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // WEBHOOKS: BLOQUEADOS para todos (apenas backend)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    match /pagamentos_webhook/{webhookId} {
      allow read, write: if false;
    }
    
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // ORDERS (sistema antigo - manter compatibilidade)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    match /orders/{orderId} {
      allow read, write: if false;
    }
  }
}
```

## 🔒 Por que estas regras são críticas?

### ❌ O que NÃO pode acontecer:
- Cliente criar/editar pedidos diretamente no Firestore
- Cliente modificar preços ou status de pagamento
- Cliente acessar dados de outros clientes
- Qualquer escrita sem passar pelo backend

### ✅ O que PODE acontecer:
- Cliente ler produtos públicos
- Backend (Firebase Admin SDK) gravar pedidos
- Backend atualizar status via webhook
- Sistema de auditoria registrar webhooks

## 📝 Estrutura das Coleções

### `/pedidos/{pedidoId}`
Criada pelo backend em `api/criar-preferencia.ts`

```typescript
{
  pedidoId: string (UUID v4)
  status: 'pendente' | 'pago' | 'cancelado'
  criadoEm: Timestamp
  atualizadoEm: Timestamp
  produto: {
    id: string
    nome: string
    preco: number (em centavos)
    quantidade: number
    imagem: string
  }
  cliente: {
    nome: string
    email: string
    telefone: string
    cpf: string
  }
  endereco: {
    cep: string
    logradouro: string
    numero: string
    complemento?: string
    bairro: string
    cidade: string
    uf: string
  }
  frete: {
    transportadora: string
    prazoEmDias: number
    valor: number (em centavos)
  }
  pagamento: {
    mercadoPagoId: string | null
    preferenceId: string
    metodo: string | null
    parcelas: number | null
    totalEmCentavos: number
  }
}
```

### `/pagamentos_webhook/{webhookId}`
Auditoria de webhooks recebidos do Mercado Pago

```typescript
{
  webhookId: string
  tipo: string (ex: 'payment')
  payload: object (body completo da notificação)
  recebidoEm: Timestamp
  mercadoPagoId: string
  pedidoId: string
  status: string
}
```

## 🚀 Como Aplicar

1. Acesse: https://console.firebase.google.com/
2. Selecione seu projeto: **kitsuystore-f2805**
3. No menu lateral: **Firestore Database**
4. Aba: **Rules**
5. Cole as regras acima
6. Clique em **Publish**

## ✅ Testar Segurança

Após aplicar, você pode testar no Firebase Console:
- Simular leitura de produtos → ✅ Permitido
- Simular escrita em pedidos → ❌ Negado
- Backend consegue gravar → ✅ Permitido (via Admin SDK)
