import { Timestamp } from "firebase-admin/firestore";
import { db } from "./firebase-admin.js";

/**
 * Máquina de estados de estoque por produto — usada para impedir overselling
 * (dois pedidos reservando o mesmo item ao mesmo tempo) e para restaurar o
 * estoque quando um pagamento é recusado/cancelado antes de aprovar, ou
 * estornado (refund/chargeback) depois de já aprovado.
 *
 * Campos novos no doc de `products/{id}` (além dos já existentes `inStock`,
 * `title`, `price`, etc.):
 * - `estoqueStatus`: "disponivel" | "reservado" | "vendido"
 * - `reservadoPedidoId`: string | null — pedido que detém a reserva atual
 * - `reservadoAte`: Timestamp | null — quando a reserva expira
 * - `vendidoPedidoId`: string | null — pedido cujo pagamento foi aprovado
 *
 * O campo legado `inStock` ("disponível"/"indisponível"), usado por todas as
 * telas de listagem e pelo `calcular-frete`, continua sendo mantido em
 * sincronia automaticamente: "indisponível" sempre que estoqueStatus for
 * "reservado" ou "vendido", "disponível" quando voltar a "disponivel".
 *
 * Produtos criados antes desta mudança não têm `estoqueStatus` — nesse caso
 * a checagem de disponibilidade cai de volta no campo `inStock` antigo.
 */

export const RESERVA_TTL_MS = 10 * 60 * 1000;

export class EstoqueIndisponivelError extends Error {
  status: number;
  /** Qual produto causou a falha — usado pelo carrinho pra remover só esse item, não o carrinho inteiro. */
  produtoId?: string;
  constructor(message: string, status = 409, produtoId?: string) {
    super(message);
    this.name = "EstoqueIndisponivelError";
    this.status = status;
    this.produtoId = produtoId;
  }
}

export interface ProdutoRef {
  collectionName: string;
  produtoId: string;
}

function produtoDocRef({ collectionName, produtoId }: ProdutoRef) {
  return db.collection(collectionName).doc(produtoId);
}

/**
 * Disponibilidade "ao vivo": calcula a partir de `estoqueStatus` +
 * `reservadoAte`, não do campo `inStock` salvo. Sem isso, rotas de leitura
 * (calcular-frete, listagem de produtos) continuariam enxergando um
 * produto como indisponível mesmo com o prazo da reserva já vencido, até
 * alguém tentar comprar de novo (o que reclama a reserva dentro da
 * transação de reservarProduto) ou o cron passar — deixando um checkout
 * abandonado com aparência de "esgotado" por mais tempo do que devia.
 */
export function estaDisponivelAgora(
  produto: FirebaseFirestore.DocumentData,
): boolean {
  const estoqueStatus = produto.estoqueStatus as string | undefined;

  if (estoqueStatus === "reservado") {
    const reservaAtual = produto.reservadoAte as Timestamp | undefined;
    return !!reservaAtual && reservaAtual.toMillis() < Date.now();
  }

  if (estoqueStatus === "vendido") {
    return false;
  }

  const inStockLegado = String(produto.inStock ?? "").toLowerCase();
  return inStockLegado !== "indisponível";
}

/**
 * Lê e reserva o produto atomicamente para `pedidoId`. Lança
 * EstoqueIndisponivelError se o produto não existir, já estiver vendido, ou
 * estiver reservado por outro pedido cuja reserva ainda não expirou.
 *
 * Reservas expiradas (reservadoAte no passado) são "reclamadas"
 * automaticamente pela próxima tentativa de compra — não depende de um cron
 * rodando para o sistema voltar a funcionar.
 */
export async function reservarProduto(
  ref: ProdutoRef,
  pedidoId: string,
): Promise<{ produto: FirebaseFirestore.DocumentData; reservadoAte: Date }> {
  const docRef = produtoDocRef(ref);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);

    if (!snap.exists) {
      throw new EstoqueIndisponivelError("Produto não encontrado", 404);
    }

    const produto = snap.data()!;
    const estoqueStatus = produto.estoqueStatus as string | undefined;
    const inStockLegado = String(produto.inStock ?? "").toLowerCase();
    const agoraMs = Date.now();

    let disponivel: boolean;

    if (estoqueStatus === "reservado") {
      const reservaAtual = produto.reservadoAte as Timestamp | undefined;
      const reservaExpirada =
        !!reservaAtual && reservaAtual.toMillis() < agoraMs;

      if (!reservaExpirada) {
        throw new EstoqueIndisponivelError(
          "Este produto está reservado em outro pedido no momento. Tente novamente em alguns minutos.",
        );
      }
      disponivel = true; // reserva expirada — este pedido reclama o item
    } else if (estoqueStatus === "vendido") {
      disponivel = false;
    } else {
      // estoqueStatus "disponivel" ou produto legado (nunca passou por essa
      // máquina de estados) — cai no campo `inStock` antigo.
      disponivel = inStockLegado !== "indisponível";
    }

    if (!disponivel) {
      throw new EstoqueIndisponivelError("Produto indisponível no momento", 400);
    }

    const reservadoAte = new Date(agoraMs + RESERVA_TTL_MS);

    tx.update(docRef, {
      estoqueStatus: "reservado",
      inStock: "indisponível",
      reservadoPedidoId: pedidoId,
      reservadoAte,
      atualizadoEm: new Date(agoraMs),
    });

    return { produto, reservadoAte };
  });
}

/**
 * Renova a reserva existente de `pedidoId`, estendendo `reservadoAte` por
 * mais RESERVA_TTL_MS a partir de agora. Retorna `null` (em vez de lançar)
 * quando este pedido não é o dono da reserva atual — sinal para o chamador
 * cair de volta em reservarProduto() e tratar como uma tentativa nova.
 *
 * Existe pra suportar o cliente saindo e voltando ao checkout (ex: clicou
 * "Voltar", recarregou a página) dentro da janela de reserva: sem isso, a
 * nova tentativa geraria um pedidoId diferente e reservarProduto() a
 * rejeitaria como se fosse um comprador concorrente, mesmo sendo o mesmo
 * cliente.
 */
export async function renovarReservaProduto(
  ref: ProdutoRef,
  pedidoId: string,
): Promise<{ produto: FirebaseFirestore.DocumentData; reservadoAte: Date } | null> {
  const docRef = produtoDocRef(ref);

  return db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);
    if (!snap.exists) return null;

    const produto = snap.data()!;
    if (
      produto.estoqueStatus !== "reservado" ||
      produto.reservadoPedidoId !== pedidoId
    ) {
      return null; // reserva já não é (mais) deste pedido
    }

    const reservadoAte = new Date(Date.now() + RESERVA_TTL_MS);

    tx.update(docRef, {
      reservadoAte,
      atualizadoEm: new Date(),
    });

    return { produto, reservadoAte };
  });
}

function chaveProduto(ref: ProdutoRef): string {
  return `${ref.collectionName}/${ref.produtoId}`;
}

/**
 * Versão multi-produto de reservarProduto() — reserva TODOS os produtos do
 * carrinho atomicamente para `pedidoId`, dentro de UMA ÚNICA transação do
 * Firestore. Faz todas as leituras (tx.get) antes de qualquer escrita
 * (tx.update) — exigência do próprio Firestore para transações — e só
 * escreve a reserva em todos os produtos se TODOS estiverem disponíveis. Se
 * um único item do carrinho não estiver disponível, a transação inteira
 * lança EstoqueIndisponivelError (identificando qual produtoId falhou) e
 * NADA é escrito — nenhum outro produto do carrinho fica "meio reservado".
 * É essa atomicidade "tudo ou nada" que impede overselling quando dois
 * carrinhos disputam o mesmo produto ao mesmo tempo.
 */
export async function reservarMultiplosProdutos(
  refs: ProdutoRef[],
  pedidoId: string,
): Promise<{
  produtos: Map<string, FirebaseFirestore.DocumentData>;
  reservadoAte: Date;
}> {
  const chaves = refs.map(chaveProduto);
  if (new Set(chaves).size !== chaves.length) {
    throw new EstoqueIndisponivelError(
      "Carrinho contém o mesmo produto duplicado",
      400,
    );
  }

  return db.runTransaction(async (tx) => {
    const docRefs = refs.map(produtoDocRef);
    const snaps = await Promise.all(docRefs.map((docRef) => tx.get(docRef)));

    const produtos = new Map<string, FirebaseFirestore.DocumentData>();
    const agoraMs = Date.now();

    for (let i = 0; i < refs.length; i++) {
      const snap = snaps[i];
      const ref = refs[i];

      if (!snap.exists) {
        throw new EstoqueIndisponivelError(
          "Produto não encontrado",
          404,
          ref.produtoId,
        );
      }

      const produto = snap.data()!;
      if (!estaDisponivelAgora(produto)) {
        throw new EstoqueIndisponivelError(
          "Este produto está reservado em outro pedido ou já foi vendido. Tente novamente em alguns minutos.",
          409,
          ref.produtoId,
        );
      }

      produtos.set(chaveProduto(ref), produto);
    }

    const reservadoAte = new Date(agoraMs + RESERVA_TTL_MS);

    docRefs.forEach((docRef) => {
      tx.update(docRef, {
        estoqueStatus: "reservado",
        inStock: "indisponível",
        reservadoPedidoId: pedidoId,
        reservadoAte,
        atualizadoEm: new Date(agoraMs),
      });
    });

    return { produtos, reservadoAte };
  });
}

/**
 * Versão multi-produto de renovarReservaProduto() — só renova se `pedidoId`
 * já for dono da reserva de TODOS os produtos do carrinho atual. Retorna
 * `null` (sinal para o chamador cair em reservarMultiplosProdutos com um
 * pedidoId novo) se QUALQUER produto do carrinho não pertencer mais a este
 * pedido — inclusive se o carrinho mudou de composição desde a última
 * tentativa (ex: cliente adicionou um item novo depois de já ter gerado uma
 * preferência de pagamento).
 */
export async function renovarReservaMultiplosProdutos(
  refs: ProdutoRef[],
  pedidoId: string,
): Promise<{
  produtos: Map<string, FirebaseFirestore.DocumentData>;
  reservadoAte: Date;
} | null> {
  return db.runTransaction(async (tx) => {
    const docRefs = refs.map(produtoDocRef);
    const snaps = await Promise.all(docRefs.map((docRef) => tx.get(docRef)));

    const produtos = new Map<string, FirebaseFirestore.DocumentData>();

    for (let i = 0; i < refs.length; i++) {
      const snap = snaps[i];
      if (!snap.exists) return null;

      const produto = snap.data()!;
      if (
        produto.estoqueStatus !== "reservado" ||
        produto.reservadoPedidoId !== pedidoId
      ) {
        return null;
      }

      produtos.set(chaveProduto(refs[i]), produto);
    }

    const reservadoAte = new Date(Date.now() + RESERVA_TTL_MS);

    docRefs.forEach((docRef) => {
      tx.update(docRef, {
        reservadoAte,
        atualizadoEm: new Date(),
      });
    });

    return { produtos, reservadoAte };
  });
}

function logFalhasEstoque(
  operacao: string,
  refs: ProdutoRef[],
  resultados: PromiseSettledResult<void>[],
  pedidoId: string,
): void {
  resultados.forEach((resultado, i) => {
    if (resultado.status === "rejected") {
      console.error(
        `[estoque] Falha ao ${operacao} produto ${refs[i].produtoId} (pedido ${pedidoId}):`,
        resultado.reason,
      );
    }
  });
}

/**
 * Marca todos os produtos do pedido como vendidos. Diferente da reserva,
 * isso NÃO precisa ser atômico entre produtos — nesse ponto o pagamento já
 * foi aprovado, overselling não é mais possível, só resta garantir que
 * nenhum produto fique "esquecido" em "reservado". Cada produto é
 * processado independentemente (Promise.allSettled) reusando
 * marcarProdutoVendido() — uma falha isolada num produto não deve impedir
 * os outros de serem processados, só é logada.
 */
export async function marcarMultiplosProdutosVendidos(
  refs: ProdutoRef[],
  pedidoId: string,
): Promise<void> {
  const resultados = await Promise.allSettled(
    refs.map((ref) => marcarProdutoVendido(ref, pedidoId)),
  );
  logFalhasEstoque("marcar como vendido", refs, resultados, pedidoId);
}

/** Libera a reserva de todos os produtos do pedido (pagamento recusado/cancelado). Ver marcarMultiplosProdutosVendidos sobre não precisar de atomicidade aqui. */
export async function liberarReservaMultiplosProdutos(
  refs: ProdutoRef[],
  pedidoId: string,
): Promise<void> {
  const resultados = await Promise.allSettled(
    refs.map((ref) => liberarReservaProduto(ref, pedidoId)),
  );
  logFalhasEstoque("liberar reserva", refs, resultados, pedidoId);
}

/** Devolve todos os produtos do pedido ao estoque após reembolso/chargeback. Ver marcarMultiplosProdutosVendidos sobre não precisar de atomicidade aqui. */
export async function liberarMultiplosProdutosAposReembolso(
  refs: ProdutoRef[],
  pedidoId: string,
): Promise<void> {
  const resultados = await Promise.allSettled(
    refs.map((ref) => liberarProdutoAposReembolso(ref, pedidoId)),
  );
  logFalhasEstoque("liberar após reembolso", refs, resultados, pedidoId);
}

/**
 * Confirma a venda: reservado (ou disponível/legado) → vendido, estado
 * terminal. Idempotente — se o produto já estiver "vendido" para este
 * mesmo pedido, não faz nada (protege contra retentativas do webhook do MP).
 */
export async function marcarProdutoVendido(
  ref: ProdutoRef,
  pedidoId: string,
): Promise<void> {
  const docRef = produtoDocRef(ref);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);

    if (!snap.exists) {
      console.warn(
        `[estoque] Produto ${ref.produtoId} não encontrado ao marcar como vendido (pedido ${pedidoId})`,
      );
      return;
    }

    const produto = snap.data()!;
    if (
      produto.estoqueStatus === "vendido" &&
      produto.vendidoPedidoId === pedidoId
    ) {
      return; // já processado
    }

    tx.update(docRef, {
      estoqueStatus: "vendido",
      inStock: "indisponível",
      vendidoPedidoId: pedidoId,
      reservadoPedidoId: null,
      reservadoAte: null,
      atualizadoEm: new Date(),
    });
  });
}

/**
 * Libera a reserva de volta pra "disponível" quando o pagamento é
 * recusado/cancelado antes de ser aprovado. Só age se a reserva atual do
 * produto ainda pertencer a este pedido — idempotente contra reprocessamento
 * do webhook e contra sobrescrever a reserva de um pedido mais novo.
 */
export async function liberarReservaProduto(
  ref: ProdutoRef,
  pedidoId: string,
): Promise<void> {
  const docRef = produtoDocRef(ref);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);

    if (!snap.exists) return;

    const produto = snap.data()!;
    if (
      produto.estoqueStatus !== "reservado" ||
      produto.reservadoPedidoId !== pedidoId
    ) {
      return; // nada a liberar: já liberado, ou a reserva é de outro pedido
    }

    tx.update(docRef, {
      estoqueStatus: "disponivel",
      inStock: "disponível",
      reservadoPedidoId: null,
      reservadoAte: null,
      atualizadoEm: new Date(),
    });
  });
}

/**
 * Varre a coleção de produtos em busca de reservas cujo TTL já passou e as
 * libera de volta pra "disponível". Sem isso, um produto cujo checkout foi
 * abandonado (sem chegar a tentar pagar, e portanto sem passar pelo
 * webhook) só voltaria a ficar disponível na PRÓXIMA tentativa de compra
 * dele mesmo (reclamação preguiçosa em reservarProduto) — se ninguém tentar
 * comprar de novo, ele fica "indisponível" pra sempre na listagem, mesmo
 * com o TTL vencido. Chamada pelo cron `limpar-pedidos-expirados`, que já
 * roda periodicamente.
 */
export async function liberarReservasExpiradas(
  collectionName: string,
): Promise<number> {
  const agora = Timestamp.now();

  const reservadosSnap = await db
    .collection(collectionName)
    .where("estoqueStatus", "==", "reservado")
    .where("reservadoAte", "<", agora)
    .get();

  let totalLiberado = 0;

  for (const doc of reservadosSnap.docs) {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(doc.ref);
      if (!snap.exists) return;

      const produto = snap.data()!;
      const reservaAtual = produto.reservadoAte as Timestamp | undefined;
      if (
        produto.estoqueStatus !== "reservado" ||
        !reservaAtual ||
        reservaAtual.toMillis() >= Date.now()
      ) {
        return; // reclamado por outro pedido (ou renovado) entre a query e agora
      }

      tx.update(doc.ref, {
        estoqueStatus: "disponivel",
        inStock: "disponível",
        reservadoPedidoId: null,
        reservadoAte: null,
        atualizadoEm: new Date(),
      });
    });
    totalLiberado += 1;
  }

  return totalLiberado;
}

/**
 * Reverte um produto "vendido" de volta pra "disponível" quando o pagamento
 * é estornado (refund) ou perdido em chargeback, depois de já aprovado. Só
 * age se o produto ainda estiver marcado como vendido para este pedido
 * específico — idempotente contra reprocessamento do webhook.
 */
export async function liberarProdutoAposReembolso(
  ref: ProdutoRef,
  pedidoId: string,
): Promise<void> {
  const docRef = produtoDocRef(ref);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(docRef);

    if (!snap.exists) return;

    const produto = snap.data()!;
    if (
      produto.estoqueStatus !== "vendido" ||
      produto.vendidoPedidoId !== pedidoId
    ) {
      return; // já revertido, ou o produto pertence a outra venda
    }

    tx.update(docRef, {
      estoqueStatus: "disponivel",
      inStock: "disponível",
      vendidoPedidoId: null,
      atualizadoEm: new Date(),
    });
  });
}
