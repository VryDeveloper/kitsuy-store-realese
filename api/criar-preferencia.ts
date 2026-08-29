import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Preference } from "mercadopago";
import { randomUUID } from "crypto";
import { db } from "./_lib/firebase-admin.js";
import { mpClient } from "./_lib/mercadopago.js";
import { handleCORS } from "../lib/cors.js";
import {
  reservarMultiplosProdutos,
  renovarReservaMultiplosProdutos,
  liberarReservaMultiplosProdutos,
  EstoqueIndisponivelError,
  type ProdutoRef,
} from "./_lib/estoque.js";
import { clienteSchema, enderecoSchema } from "./_lib/validar-checkout.js";

/**
 * POST /api/criar-preferencia
 *
 * ROTA CRÍTICA DE SEGURANÇA.
 *
 * Cria um pedido "pendente" no Firestore e uma preferência de pagamento no
 * Mercado Pago pra TODOS os produtos do carrinho de uma vez. O preço de
 * cada produto e o valor do frete são SEMPRE recalculados aqui a partir do
 * Firestore / do valor de frete retornado anteriormente por
 * /api/calcular-frete — nunca a partir de um valor enviado livremente pelo
 * frontend no corpo desta requisição.
 *
 * Somente produtos da coleção `products` podem ser comprados por aqui.
 */

// Janela de validade da preferência no Mercado Pago — depois disso o link
// de pagamento deixa de funcionar, mesmo que o pedido/reserva ainda exista.
const PREFERENCIA_EXPIRACAO_MINUTOS = 60;

interface CriarPreferenciaBody {
  produtoIds: string[];
  freteEscolhido: {
    id: string;
    transportadora: string;
    prazoEmDias: number;
    valorEmCentavos: number;
  };
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
  };
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
  // pedidoId de uma tentativa anterior deste mesmo cliente (guardado no
  // sessionStorage do navegador). Se ainda for o dono da reserva de TODOS os
  // produtos do carrinho atual, ela é renovada em vez de tratada como
  // concorrência — ver renovarReservaMultiplosProdutos.
  pedidoIdExistente?: string;
}

// `pedidoId` circula em URLs (back_urls de sucesso/pendente do Mercado
// Pago) e por isso não pode ser tratado como segredo suficiente pra provar
// que quem está pedindo a renovação é o mesmo cliente da reserva original —
// senão bastaria alguém obter/farejar o pedidoId de outra pessoa (link
// compartilhado, histórico do navegador, referrer) pra assumir a reserva
// dela com os PRÓPRIOS dados de endereço/pagamento. Por isso a renovação só
// é aceita se o email informado agora bater com o email gravado no pedido
// pendente original.
async function pedidoPertenceAoCliente(
  pedidoId: string,
  emailCliente: string,
): Promise<boolean> {
  const pedidoSnap = await db.collection("pedidos").doc(pedidoId).get();
  if (!pedidoSnap.exists) return false;

  const pedido = pedidoSnap.data()!;
  const emailPedido = String(pedido.cliente?.email ?? "")
    .trim()
    .toLowerCase();

  return (
    pedido.status === "pendente" &&
    emailPedido === emailCliente.trim().toLowerCase()
  );
}

function mesmoConjunto(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((id) => setA.has(id));
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { produtoIds, freteEscolhido, cliente, endereco, pedidoIdExistente } =
      req.body as CriarPreferenciaBody;

    if (
      !Array.isArray(produtoIds) ||
      produtoIds.length === 0 ||
      !produtoIds.every((id) => typeof id === "string" && id) ||
      !freteEscolhido ||
      !cliente ||
      !endereco
    ) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    if (!freteEscolhido.id || typeof freteEscolhido.id !== "string") {
      return res.status(400).json({ error: "Frete inválido" });
    }

    // ── VALIDAR CLIENTE E ENDEREÇO (rota crítica de segurança) ───────────
    // O formulário do frontend já valida esses campos com Zod, mas isso não
    // impede um POST direto pra essa rota fora do formulário. Sem validar
    // aqui também, qualquer conteúdo (inclusive HTML) chegava sem checagem
    // até os emails transacionais. Roda antes de qualquer leitura/escrita
    // no Firestore ou reserva de estoque. `safeParse(...).data` também
    // descarta qualquer campo extra fora do schema (modo "strip" do Zod).
    const clienteValidado = clienteSchema.safeParse(cliente);
    if (!clienteValidado.success) {
      return res.status(400).json({
        error: `Dados do cliente inválidos: ${clienteValidado.error.issues[0]?.message ?? "campo inválido"}`,
      });
    }

    const enderecoValidado = enderecoSchema.safeParse(endereco);
    if (!enderecoValidado.success) {
      return res.status(400).json({
        error: `Dados de endereço inválidos: ${enderecoValidado.error.issues[0]?.message ?? "campo inválido"}`,
      });
    }

    const clienteSeguro = clienteValidado.data;
    const enderecoSeguro = enderecoValidado.data;

    console.log("[criar-preferencia] Iniciando", { produtoIds });

    // ── VALIDAR COTAÇÃO DE FRETE NO FIRESTORE (nunca confiar no valor  ───
    // enviado pelo frontend). O "id" recebido é o ID do documento gerado
    // por /api/calcular-frete. Aqui recuperamos o valor REAL cotado —
    // qualquer transportadora/prazo/valor que o body tenha mandado é
    // ignorado a partir daqui.
    const cotacaoRef = db.collection("cotacoes_frete").doc(freteEscolhido.id);
    const cotacaoDoc = await cotacaoRef.get();

    if (!cotacaoDoc.exists) {
      return res.status(400).json({
        error: "Cotação de frete não encontrada. Calcule o frete novamente.",
      });
    }

    const cotacao = cotacaoDoc.data()!;

    if (cotacao.usada) {
      return res.status(400).json({
        error: "Esta cotação de frete já foi utilizada. Calcule o frete novamente.",
      });
    }

    const expiraEmMs = cotacao.expiraEm?.toMillis?.() ?? 0;
    if (Date.now() > expiraEmMs) {
      return res.status(400).json({
        error: "Cotação de frete expirada. Calcule o frete novamente.",
      });
    }

    const cotacaoProdutoIds: string[] = Array.isArray(cotacao.produtoIds)
      ? cotacao.produtoIds
      : [];

    if (!mesmoConjunto(cotacaoProdutoIds, produtoIds)) {
      console.warn("[criar-preferencia] Cotação de frete não bate com o carrinho", {
        produtoIds,
        cotacaoProdutoIds,
      });
      return res.status(400).json({ error: "Cotação de frete inválida para este carrinho" });
    }

    // Valores usados no cálculo final SEMPRE vêm do Firestore, nunca do body.
    const freteReal = {
      transportadora: cotacao.transportadora as string,
      prazoEmDias: cotacao.prazoEmDias as number,
      valorEmCentavos: cotacao.valorEmCentavos as number,
    };

    // ── GERAR ID DO PEDIDO E RESERVAR TODOS OS PRODUTOS ATOMICAMENTE ─────
    // A leitura de cada produto, a checagem de disponibilidade e a escrita
    // da reserva acontecem dentro de UMA ÚNICA transação do Firestore
    // (reservarMultiplosProdutos). Isso impede overselling: se dois
    // carrinhos disputando o(s) mesmo(s) produto(s) chegarem quase ao mesmo
    // tempo, apenas um deles enxerga todos os produtos como disponíveis
    // dentro da transação — o outro falha com EstoqueIndisponivelError
    // (identificando qual produto) antes de qualquer preferência de
    // pagamento ser criada no Mercado Pago, e nenhum produto do carrinho
    // perdedor fica "meio reservado".
    const collectionName = "products"; // única coleção com checkout real
    const refs: ProdutoRef[] = produtoIds.map((produtoId) => ({
      collectionName,
      produtoId,
    }));

    let pedidoId: string;
    let produtos: Map<string, FirebaseFirestore.DocumentData>;
    let reservadoAte: Date;

    try {
      const podeRenovar =
        typeof pedidoIdExistente === "string" &&
        pedidoIdExistente &&
        (await pedidoPertenceAoCliente(pedidoIdExistente, clienteSeguro.email));

      const renovacao = podeRenovar
        ? await renovarReservaMultiplosProdutos(refs, pedidoIdExistente!)
        : null;

      if (renovacao) {
        // Mesmo cliente retomando o checkout (voltou/recarregou) dentro da
        // janela de reserva — reaproveita o pedidoId em vez de disputar uma
        // reserva nova. Se o carrinho mudou de composição desde a última
        // tentativa, renovarReservaMultiplosProdutos já retorna null e cai
        // no bloco de baixo.
        pedidoId = pedidoIdExistente!;
        produtos = renovacao.produtos;
        reservadoAte = renovacao.reservadoAte;
      } else {
        pedidoId = randomUUID();
        const reserva = await reservarMultiplosProdutos(refs, pedidoId);
        produtos = reserva.produtos;
        reservadoAte = reserva.reservadoAte;
      }
    } catch (err) {
      if (err instanceof EstoqueIndisponivelError) {
        console.warn("[criar-preferencia] Produto indisponível para reserva", {
          produtoIds,
          motivo: err.message,
          produtoId: err.produtoId,
        });
        return res
          .status(err.status)
          .json({ error: err.message, produtoId: err.produtoId });
      }
      throw err;
    }

    console.log(
      `[criar-preferencia] ${produtoIds.length} produto(s) reservado(s) até ${reservadoAte.toISOString()} para o pedido ${pedidoId}`,
    );

    // ── CALCULAR TOTAL (produtos do Firestore + frete já validado) ──────
    const itensPedido = produtoIds.map((produtoId) => {
      const produto = produtos.get(`${collectionName}/${produtoId}`)!;
      const precoEmReais = parseFloat(
        String(produto.price)
          .replace(/[^\d,]/g, "")
          .replace(",", "."),
      );
      return {
        produtoId,
        produto,
        precoEmCentavos: Math.round(precoEmReais * 100),
      };
    });

    const precoTotalEmCentavos = itensPedido.reduce(
      (soma, item) => soma + item.precoEmCentavos,
      0,
    );
    const freteEmCentavos = freteReal.valorEmCentavos;
    const totalEmCentavos = precoTotalEmCentavos + freteEmCentavos;

    console.log("[criar-preferencia] Valores calculados", {
      precoTotalEmCentavos,
      freteEmCentavos,
      totalEmCentavos,
    });

    // ── CRIAR PEDIDO PENDENTE NO FIRESTORE ───────────────────────────────
    const now = new Date();

    await db
      .collection("pedidos")
      .doc(pedidoId)
      .set({
        pedidoId,
        status: "pendente",
        criadoEm: now,
        atualizadoEm: now,
        reservadoAte,
        produtos: itensPedido.map(({ produtoId, produto, precoEmCentavos }) => ({
          id: produtoId,
          nome: produto.title,
          preco: precoEmCentavos,
          imagem: produto.image || "",
          collectionName,
        })),
        cliente: {
          nome: clienteSeguro.nome,
          email: clienteSeguro.email,
          telefone: clienteSeguro.telefone,
          cpf: clienteSeguro.cpf,
        },
        endereco: enderecoSeguro,
        frete: {
          transportadora: freteReal.transportadora,
          prazoEmDias: freteReal.prazoEmDias,
          valor: freteEmCentavos,
        },
        cotacaoFreteId: freteEscolhido.id,
        pagamento: {
          mercadoPagoId: null,
          preferenceId: null,
          metodo: null,
          parcelas: null,
          totalEmCentavos,
        },
      });

    console.log(`[criar-preferencia] Pedido criado no Firestore: ${pedidoId}`);

    // Marca a cotação como usada — impede que o mesmo cotacaoId seja
    // reaproveitado em outro pedido (ex: dois checkouts na mesma janela de
    // 30 min tentando usar a mesma cotação de frete barata).
    await cotacaoRef.update({ usada: true, usadaEmPedido: pedidoId });

    // ── CRIAR PREFERÊNCIA NO MERCADO PAGO ────────────────────────────────
    const preference = new Preference(mpClient);
    const siteUrl = process.env.VITE_SITE_URL || "http://localhost:8081";

    // A preferência em si expira independente da reserva dos produtos (que
    // já é resolvida por reservarMultiplosProdutos()/estoque.ts). Isso evita
    // que um link de pagamento gerado há semanas continue pagável pelo
    // preço congelado na época. O Mercado Pago exige ISO 8601 com timezone
    // — toISOString() já retorna nesse formato (UTC, sufixo "Z").
    const agoraPreferencia = new Date();
    const expiraEmPreferencia = new Date(
      agoraPreferencia.getTime() + PREFERENCIA_EXPIRACAO_MINUTOS * 60 * 1000,
    );

    // Um item de preferência por produto (preço real, transparente) + 1
    // item "Frete" — em vez de embutir tudo num único item genérico.
    const itemsPreferencia = [
      ...itensPedido.map(({ produtoId, produto, precoEmCentavos }) => ({
        id: produtoId,
        title: produto.title,
        description: `${produto.title} - Kitsuy Store`,
        picture_url: produto.image,
        quantity: 1,
        unit_price: precoEmCentavos / 100,
        currency_id: "BRL",
      })),
      {
        id: "frete",
        title: `Frete — ${freteReal.transportadora}`,
        description: "Frete",
        quantity: 1,
        unit_price: freteEmCentavos / 100,
        currency_id: "BRL",
      },
    ];

    let result;
    try {
      result = await preference.create({
        body: {
          external_reference: pedidoId, // liga o pagamento ao pedido
          expires: true,
          expiration_date_from: agoraPreferencia.toISOString(),
          expiration_date_to: expiraEmPreferencia.toISOString(),
          items: itemsPreferencia,
          payer: {
            name: clienteSeguro.nome,
            email: clienteSeguro.email,
            phone: {
              area_code: "",
              number: clienteSeguro.telefone,
            },
            identification: {
              type: "CPF",
              number: clienteSeguro.cpf,
            },
          },
          payment_methods: {
            installments: 4,
            excluded_payment_types: [],
          },
          notification_url: `${siteUrl}/api/webhook`,
          back_urls: {
            success: `${siteUrl}/pedido-confirmado?id=${pedidoId}`,
            failure: `${siteUrl}/checkout?erro=pagamento`,
            pending: `${siteUrl}/pedido-confirmado?id=${pedidoId}&status=pendente`,
          },
          auto_return: siteUrl.startsWith("https://")
            ? ("approved" as const)
            : undefined,
          statement_descriptor: "KITSUY STORE",
        },
      });
    } catch (err) {
      // Se a criação da preferência falhar, libera a reserva de TODOS os
      // produtos imediatamente em vez de deixá-los travados até o TTL
      // expirar sozinho.
      console.error(
        "[criar-preferencia] Erro ao criar preferência MP — liberando reserva dos produtos",
        err,
      );
      await liberarReservaMultiplosProdutos(refs, pedidoId);
      throw err;
    }

    await db.collection("pedidos").doc(pedidoId).update({
      "pagamento.preferenceId": result.id,
      atualizadoEm: new Date(),
    });

    console.log("[criar-preferencia] ✅ Preferência MP criada:", result.id);

    return res.status(200).json({
      preferenceId: result.id,
      pedidoId,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point || null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[criar-preferencia] ❌ Erro:", error);

    return res.status(500).json({
      error: "Erro ao processar pagamento. Tente novamente.",
      ...(process.env.NODE_ENV !== "production" && { details: message }),
    });
  }
}
