# Auditoria — Sistema de Pagamento Kitsuy Store

Escopo revisado: `api/criar-preferencia.ts`, `api/webhook.ts`, `api/verificar-pagamento.ts`, `api/calcular-frete.ts`, `api/_lib/*`, `firestore.rules`, `src/lib/api.ts`, `src/components/checkout/*.tsx`, `src/pages/CheckoutPage.tsx`, `src/pages/PedidoConfirmado.tsx`, `scripts/dev-api-server.ts`.

## Resumo executivo

- **Nenhuma falha crítica de fraude financeira ou vazamento de dados foi encontrada.** Preço/frete são sempre recalculados no backend a partir do Firestore (nunca confiam no corpo da requisição), o status "pago" só é setado pelo webhook após consulta real à API do Mercado Pago, e as Firestore Rules bloqueiam 100% do acesso client-side às coleções `pedidos`, `cotacoes_frete` e `pagamentos_webhook`.
- **Maior risco real de negócio: overselling.** O campo `inStock` só vira `"indisponível"` dentro do webhook, *depois* do pagamento aprovado — nada reserva o produto no momento em que o pedido é criado como `"pendente"`. Dois clientes podem concluir o checkout do mesmo item ao mesmo tempo.
- **Injeção de HTML nos emails transacionais.** `criar-preferencia.ts` não valida os campos de `cliente`/`endereco` no servidor (só checa se o objeto existe) e `email-templates.ts` interpola esses campos em HTML sem escapar. Um POST direto (fora do formulário) pode injetar HTML/links nos emails enviados à loja e ao cliente.
- **Nenhum rate limiting** em `/api/calcular-frete` (custa créditos de API na SuperFrete) nem em `/api/criar-preferencia` (cria pedidos + preferências MP ilimitadamente).
- **Webhook não trata reembolso/estorno/mediação** (`refunded`, `charged_back`, `in_mediation`) — cai no `default` e o pedido silenciosamente volta para `"pending"`, e o produto nunca é remarcado como disponível.

## Falhas críticas (corrigir antes de ir pra produção / antes de mais vendas reais)

Nenhuma encontrada nos três critérios definidos (pagar menos do que deveria, marcar pedido como pago sem pagar, vazar dado de outro cliente). Os três pontos abaixo, apesar de reais, não se encaixam nesses critérios e foram classificados como Importantes.

## Falhas importantes (não são exploráveis facilmente, mas geram inconsistência/dor operacional ou risco de abuso)

### 1. Overselling — produto não é reservado até o webhook confirmar o pagamento
**Arquivo:** `api/webhook.ts:179-197` (marca `inStock: "indisponível"` só aqui) vs. `api/criar-preferencia.ts:120-124` (só *lê* `inStock`, não reserva nada)
**Risco concreto:** dois clientes calculam frete e criam preferência para o mesmo produto quase simultaneamente — ambos passam pela checagem `produto.inStock !== "indisponível"` porque nenhum dos dois pagou ainda. Se ambos pagarem, a loja vende o mesmo item (provavelmente único/colecionável, já que não existe campo de quantidade em nenhum lugar do schema) duas vezes e precisa reembolsar um dos dois.
**Sugestão:** marcar o produto como reservado (ex: `status: "reservado"`, com TTL) já na criação do pedido pendente, dentro de uma transação Firestore, e liberar automaticamente se o pedido expirar sem pagamento.

### 2. Injeção de HTML nos emails de confirmação (dados de cliente não validados no backend)
**Arquivo:** `api/criar-preferencia.ts:58` (só valida `!cliente || !endereco`, nenhum campo individual) → `api/_lib/email-templates.ts:89-91,112,61-63,94,117` (interpola `cliente.nome`, `cliente.telefone`, `endereco.*` direto no HTML, sem escape)
**Risco concreto:** o formulário do frontend (`FormEndereco.tsx`) valida com Zod, mas isso não impede um POST direto para `/api/criar-preferencia` com `cliente.nome = "<a href=phishing>clique aqui</a>"`. Esse conteúdo vai parar, sem escape, no email HTML enviado tanto para `EMAIL_LOJA_NOTIFICACAO` quanto para o email do "cliente" informado — ou seja, dá pra usar a infraestrutura de envio da loja (domínio verificado no Resend) para mandar HTML malicioso convincente para qualquer endereço. O email só é disparado depois de um pagamento aprovado (`webhook.ts:200`), o que reduz o abuso casual mas não elimina o risco para um atacante disposto a pagar o valor mínimo de um produto.
**Sugestão:** validar/sanitizar `cliente` e `endereco` no backend (schema equivalente ao do frontend) e fazer escape de HTML (`&`, `<`, `>`, `"`, `'`) em toda interpolação nos templates de email.

### 3. Sem rate limiting em `/api/calcular-frete` e `/api/criar-preferencia`
**Arquivo:** `api/calcular-frete.ts` (handler inteiro), `api/criar-preferencia.ts` (handler inteiro) — nenhuma checagem de IP/taxa em nenhum dos dois
**Risco concreto:** um script pode chamar `calcular-frete` em loop e esgotar a cota/orçamento do token da SuperFrete, ou chamar `criar-preferencia` repetidamente para encher o Firestore com pedidos `"pendente"` órfãos e criar dezenas de preferências no Mercado Pago sem custo nenhum para o atacante.
**Sugestão:** rate limiting por IP (ex: Vercel Edge Config / Upstash Ratelimit) nessas duas rotas.

### 4. `mapMPStatus` não trata reembolso, chargeback ou mediação
**Arquivo:** `api/webhook.ts:33-49`
**Risco concreto:** se um pagamento aprovado for depois estornado (`refunded`) ou entrar em disputa (`charged_back`, `in_mediation`), o Mercado Pago reenvia o webhook com esse novo status. Como `mapMPStatus` não reconhece esses valores, cai no `default` e retorna `orderStatus: "pending"` — o pedido que estava `"paid"` silenciosamente vira `"pending"` (status incorreto exibido ao cliente/loja) e, pior, como o bloco de `orderStatus === "paid"` não é reexecutado, **o produto nunca volta a ficar `"disponível"`** mesmo tendo sido reembolsado — o item fica preso como "vendido" para sempre.
**Sugestão:** adicionar `refunded`, `charged_back` e `in_mediation` ao mapeamento, com um status próprio (`"reembolsado"`/`"em_disputa"`) e lógica que restaura `inStock` quando aplicável.

### 5. Nenhuma expiração de pedido pendente / preferência do Mercado Pago
**Arquivo:** `api/criar-preferencia.ts:195-236` (chamada `preference.create()` sem `expires`/`expiration_date_to`); nenhum cron/job encontrado no repositório para limpar pedidos `"pendente"` antigos
**Risco concreto:** pedidos `"pendente"` se acumulam no Firestore indefinidamente sem nenhuma rotina de limpeza; a preferência do Mercado Pago em si nunca expira, então um link de pagamento gerado há semanas continua válido e pagável pelo preço congelado na época. (A cotação de frete em si já expira em 30 min — `api/calcular-frete.ts:8` — isso está correto; o problema é o pedido/preferência ao redor dela.)
**Sugestão:** setar `expires: true` + `expiration_date_to` na preferência (ex: 30-60 min) e uma rotina periódica (cron job / Cloud Function agendada) que marca como `"expirado"` pedidos `"pendente"` antigos.

## Melhorias recomendadas (padrão de mercado, não urgente)

| Item | Arquivo:linha | Observação |
|---|---|---|
| Validação de `produtoId` / `cotacaoId` como IDs opacos | `api/calcular-frete.ts:35-37`, `api/criar-preferencia.ts:62-64` | Só checam `typeof === "string"` e truthy. Baixo risco (Firestore Admin SDK não tem injeção estilo SQL, e as Rules já bloqueiam tudo), mas vale validar formato (ex: regex de UUID) como defesa em profundidade. |
| CPF validado só por tamanho (`min(11)`), sem checksum | `src/components/checkout/FormEndereco.tsx:24` | O Mercado Pago provavelmente rejeita CPF inválido no lado dele, mas é mais robusto validar o dígito verificador no frontend também. |
| Log de auditoria de status é implícito, não estruturado | `api/webhook.ts:99-113,218-221` | A coleção `pagamentos_webhook` guarda o payload cru de cada notificação e já serve como trilha de auditoria (o único "quem" possível é sempre "webhook MP", já que é o único caminho de escrita). Ainda assim, adicionar um array `historico: [{status, em, origem}]` dentro do próprio doc de `pedido` facilitaria suporte/debug sem precisar cruzar as duas coleções. |
| Falha ao marcar produto indisponível não bloqueia a confirmação do pagamento | `api/webhook.ts:183-196` | Comportamento é intencional e correto (falha de notificação/estoque não deve travar a confirmação), mas hoje só loga no console — considere um alerta (ex: email pro admin) quando esse `catch` disparar, já que gera risco silencioso de overselling. |
| Sem separação explícita de credenciais teste/produção do Mercado Pago | `.env.example:9-11` | Depende inteiramente de o operador configurar a env certa em cada ambiente na Vercel; não há checagem em código (ex: recusar rodar com uma chave `TEST-` se `NODE_ENV === "production"`). |
| `dataId` usado na validação de assinatura pode, em teoria, divergir do `paymentId` usado para buscar o pagamento | `api/webhook.ts:61-62` (prioriza query `data.id`) vs. `api/webhook.ts:122` (usa só `data?.id` do body) | Na prática o Mercado Pago sempre manda os dois iguais, mas por robustez vale usar a mesma variável nos dois pontos. |

## O que já está correto (não mexer)

- **Preço/frete sempre recalculados no backend.** `api/criar-preferencia.ts:68-135` ignora qualquer valor vindo do body e busca produto (`products/{id}`) e frete (`cotacoes_frete/{id}`) direto do Firestore. A cotação de frete só pode ser usada uma vez (`usada: true` em `api/criar-preferencia.ts:189`) e expira em 30 min (`api/calcular-frete.ts:8,90-95`) — isso impede que dois checkouts reaproveitem a mesma cotação barata.
- **Status "pago" só é setado pelo webhook, e o webhook consulta a API do MP como fonte da verdade.** `api/webhook.ts:130-131` faz `paymentApi.get({id: paymentId})` e usa `paymentInfo.status` da resposta da API — nunca o valor bruto do payload recebido. Não existe nenhuma outra rota do backend que grave `status: "paid"`.
- **`/api/verificar-pagamento` é somente leitura.** `api/verificar-pagamento.ts` inteiro só faz `GET`/leitura do Firestore, nunca escreve. Um cliente indo direto para `/pedido-confirmado?id=X` sem pagar só vê o status real (`"pendente"`), nunca consegue forjar `"paid"` — confirmado, não há esse caminho de bypass.
- **Assinatura HMAC do webhook está correta e é aplicada de forma bloqueante.** `api/_lib/validar-assinatura.ts` usa `timingSafeEqual` (proteção contra timing attack), valida janela de timestamp de 5 min (proteção parcial contra replay) e o handler rejeita com 401 antes de processar qualquer coisa se a env `MERCADOPAGO_WEBHOOK_SECRET` não estiver configurada ou a assinatura for inválida (`api/webhook.ts:58-88`).
- **Idempotência do webhook contra reprocessamento/retentativa do MP.** `api/webhook.ts:163,179` checa `jaEstavaPago` antes de decrementar estoque ou disparar emails — reenvios do mesmo webhook (comportamento normal do MP em caso de timeout) não duplicam efeitos colaterais.
- **Firestore Rules bloqueiam qualquer acesso client-side às coleções sensíveis.** `firestore.rules:25-45` — `pedidos`, `pagamentos_webhook` e `cotacoes_frete` têm `allow read, write: if false` incondicional; só o Admin SDK (backend) acessa. Um usuário não consegue ler nem editar pedido de outra pessoa nem forjar status via SDK do cliente.
- **Chave secreta do Mercado Pago (`MERCADOPAGO_ACCESS_TOKEN`) nunca chega ao frontend.** Só é usada em `api/_lib/mercadopago.ts`, que roda exclusivamente no backend/serverless.
- **`dev-api-server.ts` não diverge da produção.** Ele só importa e expõe os mesmos handlers de `api/*.ts` (`scripts/dev-api-server.ts:81-85`) — não há lógica duplicada/divergente entre dev e produção que pudesse mascarar um bug.

---

Por qual item você quer começar a correção?
