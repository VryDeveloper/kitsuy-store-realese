# Setup do Checkout — Kitsuy Store

Guia passo a passo para configurar o checkout real (frete + pagamento + emails)
em desenvolvimento e produção.

> Este checkout vale **somente para produtos da coleção `products`** (estoque
> pronto). A coleção `masterpiece` continua funcionando só com orçamento via
> WhatsApp — nada mudou lá.

---

## 1. Visão geral do fluxo

```
Cliente clica "Comprar" (produto da coleção `products`)
   → /checkout?produto=ID&colecao=products
   → Preenche endereço (FormEndereco)
   → Calcula frete via SuperFrete (OpcoesFrete)
   → Escolhe frete → cria pedido "pendente" no Firestore + preferência no MP
   → Paga (Mercado Pago Bricks)
   → Mercado Pago notifica /api/webhook
   → Webhook valida assinatura, confirma pagamento na API do MP,
     marca pedido como "paid", marca produto como "indisponível",
     envia emails (loja + cliente) via Resend
   → Cliente é redirecionado para /pedido-confirmado?id=PEDIDO_ID
```

---

## 2. Contas necessárias

| Serviço      | Para que serve                            | Link                                      |
| ------------ | ----------------------------------------- | ----------------------------------------- |
| Mercado Pago | Processar pagamentos (PIX, cartão)        | https://www.mercadopago.com.br/developers |
| SuperFrete   | Cotação de frete (PAC/SEDEX/Jadlog)       | https://superfrete.com                    |
| Firebase     | Banco de dados (Firestore) + Admin SDK    | https://console.firebase.google.com       |
| Resend       | Envio de emails transacionais             | https://resend.com                        |
| Vercel       | Hospedagem do site + serverless functions | https://vercel.com                        |

---

## 3. Mercado Pago

1. Crie uma conta em https://www.mercadopago.com.br/developers/panel
2. Crie uma aplicação ("Suas integrações" → "Criar aplicação")
3. Em **Credenciais de teste**, copie:
   - `Public Key` → `VITE_MERCADOPAGO_PUBLIC_KEY`
   - `Access Token` → `MERCADOPAGO_ACCESS_TOKEN`
4. Configure o **Webhook**:
   - Vá em "Webhooks" dentro da sua aplicação
   - URL de notificação: `https://SEU_DOMINIO/api/webhook`
     (em desenvolvimento local, use um túnel — ver seção 8)
   - Evento: `Pagamentos`
   - Copie a **Assinatura secreta (secret)** → `MERCADOPAGO_WEBHOOK_SECRET`
5. Quando estiver pronto para produção, repita o processo com as
   **credenciais de produção** (não misture teste com produção).

---

## 4. SuperFrete

1. Crie uma conta em https://superfrete.com
2. Gere um token de API em "Integrações" → "Token de API"
   → `SUPERFRETE_TOKEN`
3. Defina o CEP de onde os produtos são enviados (CEP da loja/depósito)
   → `LOJA_CEP_ORIGEM` (somente números, ex: `01310100`)
4. **Importante:** cada produto da coleção `products` no Firestore precisa
   ter os campos de dimensão para o cálculo de frete funcionar:
   ```
   pesoEmKg: number       (ex: 0.8)
   alturaEmCm: number     (ex: 20)
   larguraEmCm: number    (ex: 15)
   comprimentoEmCm: number (ex: 15)
   ```
   Sem esses campos, `/api/calcular-frete` retorna erro para aquele produto.

---

## 5. Firebase Admin SDK

1. No [Console do Firebase](https://console.firebase.google.com), abra o
   projeto já usado pelo site.
2. Vá em **Configurações do projeto** → **Contas de serviço**.
3. Clique em **Gerar nova chave privada** → baixa um arquivo `.json`.
4. Desse arquivo, copie:
   - `project_id` → `FIREBASE_PROJECT_ID`
   - `client_email` → `FIREBASE_CLIENT_EMAIL`
   - `private_key` → `FIREBASE_PRIVATE_KEY`
     (mantenha as quebras de linha como `\n` dentro de uma string entre aspas)
5. **Nunca** commite esse arquivo `.json` nem o conteúdo dele em texto puro
   no código-fonte.
6. Publique as regras do Firestore incluídas neste projeto
   (`firestore.rules`) para bloquear acesso do client SDK às coleções
   `pedidos` e `pagamentos_webhook`:
   ```
   firebase deploy --only firestore:rules
   ```

---

## 6. Resend (emails)

1. Crie uma conta em https://resend.com
2. Gere uma API Key em "API Keys" → `RESEND_API_KEY`
3. Verifique um domínio em "Domains" (ex: `kitsuystore.com`) seguindo as
   instruções de DNS (SPF/DKIM) fornecidas pelo Resend.
4. Defina o remetente com esse domínio verificado:
   `EMAIL_REMETENTE=pedidos@kitsuystore.com`
5. Defina para qual email as notificações de nova venda devem chegar:
   `EMAIL_LOJA_NOTIFICACAO=dono-da-loja@email.com`

> Sem domínio verificado, o Resend só permite enviar para o próprio email
> cadastrado na conta — ok para testar, mas não funciona em produção.

---

## 7. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha tudo:

```bash
copy .env.example .env.local
```

Confirme que `.env.local` **nunca** aparece em `git status` como arquivo a
ser commitado (o `.gitignore` já está configurado para isso).

Na Vercel, configure as mesmas variáveis em **Project Settings → Environment
Variables** (separadamente para Production, Preview e Development, se
necessário).

---

## 8. Testando localmente (Vite + servidor de API local)

> **Atualização:** depois de muita tentativa, `vercel dev` se mostrou pouco
> confiável neste projeto no Windows — mesmo com `"framework": null` no
> `vercel.json` e o script `dev` renomeado para `dev:vite` (para evitar que
> o `vercel dev` tentasse subir o Vite sozinho), a CLI continuava travando
> na detecção de porta (`Failed to detect a server running on port ...` ou
> `EACCES: permission denied $PORT`). Para não bloquear o desenvolvimento
> local nessa dependência externa, criamos um servidor de API local simples
> em `scripts/dev-api-server.ts` — ele importa os handlers de `api/*.ts`
> diretamente (sem nenhuma dependência da Vercel) e os expõe em
> `http://localhost:3000`, exatamente como o `vercel dev` faria. Não emula
> 100% o ambiente de produção (sem edge runtime, sem roteamento automático
> de pastas), mas para as rotas deste projeto (handlers simples
> `@vercel/node`) o comportamento é equivalente.
>
> Se preferir tentar `vercel dev` de novo no futuro (ex: depois de uma
> atualização da CLI), os comandos antigos ficam registrados no histórico
> do git (`vercel dev --listen 3000`). As hipóteses de próximos passos para
> fazer o `vercel dev` funcionar estão documentadas no relatório de handoff
> da branch.

> **Antes de começar:** confirme que nada mais está ocupando as portas 3000
> e 8080. É comum o **Docker Desktop** (`com.docker.backend.exe`) reservar a
> porta 8080 em segundo plano — feche o Docker Desktop se ele não for
> necessário para o teste, ou o `npm run dev:vite` vai falhar/mudar de porta
> silenciosamente. Verifique com:
>
> ```powershell
> netstat -ano | findstr LISTENING | findstr ":3000 :8080"
> ```
>
> Se aparecer algo, identifique o processo com
> `tasklist /FI "PID eq <PID>"` antes de encerrar.

1. **Terminal 1** — sobe somente as funções serverless (`api/`) na porta 3000:

   ```bash
   npm run dev:api
   ```

   Isso roda `scripts/dev-api-server.ts` com `tsx watch` (recarrega sozinho
   a cada alteração em `api/*.ts`). Ele lê `.env.local` automaticamente, não
   precisa de nenhuma flag extra do Node.

2. **Terminal 2** — sobe o frontend normalmente, com HMR funcionando:
   ```bash
   npm run dev:vite
   ```
   O Vite sobe em `http://localhost:8080` e já está configurado
   (`vite.config.ts`) para repassar toda chamada `/api/*` para
   `http://localhost:3000`, onde o servidor de API local está rodando.
3. Acesse `http://localhost:8080` no navegador (não a porta 3000).
4. O Mercado Pago precisa alcançar seu `/api/webhook` publicamente para
   enviar notificações. Em desenvolvimento local, use um túnel apontando
   para a porta do **frontend** (8080), já que ela repassa `/api` para o
   backend:
   ```bash
   ngrok http 8080
   ```
   E configure a URL do ngrok como URL de notificação no painel do Mercado
   Pago (seção 3, passo 4) e em `VITE_SITE_URL` no `.env.local` (reinicie o
   `npm run dev:vite` depois de alterar o `.env.local`).
5. Teste o fluxo completo:
   - Acesse `/estoque`, clique em **Comprar** num produto com `inStock:
"disponível"` (precisa ter os campos de dimensão preenchidos).
   - Preencha o endereço → deve calcular o frete via SuperFrete.
   - Escolha um frete → deve abrir o Mercado Pago Brick.
   - Pague com um [cartão de teste do Mercado Pago](https://www.mercadopago.com.br/developers/pt/docs/checkout-api/additional-content/your-integrations/test/cards).
   - Confirme que o webhook foi chamado (veja os logs do Terminal 1, o
     `npm run dev:api`).
   - Confirme no Firestore que o pedido virou `status: "paid"` e que o
     produto ficou `inStock: "indisponível"`.
   - Confirme que os emails chegaram (loja + cliente).
   - Veja a página `/pedido-confirmado?id=PEDIDO_ID`.

---

## 9. Checklist antes de ir para produção

- [ ] Trocar credenciais de teste do Mercado Pago pelas de produção
- [ ] Trocar o `SUPERFRETE_TOKEN` de teste (sandbox) pelo token de produção
      gerado em https://web.superfrete.com/#/integrations — sem isso, toda
      cotação de frete usa preços de teste (sandbox), bem diferentes dos
      preços reais mostrados na calculadora oficial do site. Dá pra confirmar
      qual token está configurado rodando `npm run frete:testar` e olhando a
      URL da logo da transportadora na resposta crua: se aparecer
      `sandbox-api-superfrete` no domínio, ainda é o token de teste.
- [ ] Configurar o webhook de produção apontando para o domínio real
- [ ] Confirmar domínio verificado no Resend
- [ ] Confirmar que todos os produtos da coleção `products` têm os campos
      de dimensão (`pesoEmKg`, `alturaEmCm`, `larguraEmCm`, `comprimentoEmCm`)
- [ ] Publicar as `firestore.rules`
- [ ] Configurar todas as variáveis de ambiente na Vercel (Production)
- [ ] Testar uma compra real de baixo valor de ponta a ponta

---

## 10. Notificação via WhatsApp (futuro)

O arquivo `api/_lib/notificar-whatsapp.ts` é apenas um **stub** — ele é
chamado pelo webhook quando um pedido é aprovado, mas hoje só loga no
console. Quando o número dedicado do WhatsApp Business estiver aprovado na
Meta Cloud API, implemente a chamada real dentro dessa função (o restante
do fluxo já está pronto para receber a integração sem mudanças em outros
arquivos).
