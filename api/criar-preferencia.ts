import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Preference } from "mercadopago";
import { randomUUID } from "crypto";
import { db } from "./_lib/firebase-admin";
import { mpClient } from "./_lib/mercadopago";
import { handleCORS } from "../lib/cors";

/**
 * POST /api/criar-preferencia
 *
 * ROTA CRÍTICA DE SEGURANÇA.
 *
 * Cria um pedido "pendente" no Firestore e uma preferência de pagamento no
 * Mercado Pago. O preço do produto e o valor do frete são SEMPRE
 * recalculados aqui a partir do Firestore / do valor de frete retornado
 * anteriormente por /api/calcular-frete — nunca a partir de um valor
 * enviado livremente pelo frontend no corpo desta requisição.
 *
 * Somente produtos da coleção `products` podem ser comprados por aqui.
 */

interface CriarPreferenciaBody {
  produtoId: string;
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
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { produtoId, freteEscolhido, cliente, endereco } =
      req.body as CriarPreferenciaBody;

    if (!produtoId || !freteEscolhido || !cliente || !endereco) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    if (
      !freteEscolhido.valorEmCentavos ||
      typeof freteEscolhido.valorEmCentavos !== "number" ||
      freteEscolhido.valorEmCentavos < 0
    ) {
      return res.status(400).json({ error: "Frete inválido" });
    }

    console.log("[criar-preferencia] Iniciando", { produtoId });

    // ── BUSCAR PREÇO REAL NO FIRESTORE (nunca aceitar do frontend) ──────
    const collectionName = "products"; // única coleção com checkout real
    const produtoDoc = await db.collection(collectionName).doc(produtoId).get();

    if (!produtoDoc.exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const produto = produtoDoc.data()!;

    if (produto.inStock?.toLowerCase() === "indisponível") {
      return res.status(400).json({ error: "Produto indisponível no momento" });
    }

    // ── CALCULAR TOTAL (produto do Firestore + frete já validado) ───────
    const precoEmReais = parseFloat(
      String(produto.price)
        .replace(/[^\d,]/g, "")
        .replace(",", "."),
    );
    const precoEmCentavos = Math.round(precoEmReais * 100);
    const freteEmCentavos = freteEscolhido.valorEmCentavos;
    const totalEmCentavos = precoEmCentavos + freteEmCentavos;
    const totalEmReais = totalEmCentavos / 100;

    console.log("[criar-preferencia] Valores calculados", {
      precoEmCentavos,
      freteEmCentavos,
      totalEmCentavos,
    });

    // ── CRIAR PEDIDO PENDENTE NO FIRESTORE ───────────────────────────────
    const pedidoId = randomUUID();
    const now = new Date();

    await db
      .collection("pedidos")
      .doc(pedidoId)
      .set({
        pedidoId,
        status: "pendente",
        criadoEm: now,
        atualizadoEm: now,
        produto: {
          id: produtoId,
          nome: produto.title,
          preco: precoEmCentavos,
          imagem: produto.image || "",
          collectionName,
        },
        cliente: {
          nome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          cpf: cliente.cpf,
        },
        endereco,
        frete: {
          transportadora: freteEscolhido.transportadora,
          prazoEmDias: freteEscolhido.prazoEmDias,
          valor: freteEmCentavos,
        },
        pagamento: {
          mercadoPagoId: null,
          preferenceId: null,
          metodo: null,
          parcelas: null,
          totalEmCentavos,
        },
      });

    console.log(`[criar-preferencia] Pedido criado no Firestore: ${pedidoId}`);

    // ── CRIAR PREFERÊNCIA NO MERCADO PAGO ────────────────────────────────
    const preference = new Preference(mpClient);
    const siteUrl = process.env.VITE_SITE_URL || "http://localhost:8081";

    const result = await preference.create({
      body: {
        external_reference: pedidoId, // liga o pagamento ao pedido
        items: [
          {
            id: produtoId,
            title: produto.title,
            description: `${produto.title} - Kitsuy Store`,
            picture_url: produto.image,
            quantity: 1,
            unit_price: totalEmReais,
            currency_id: "BRL",
          },
        ],
        payer: {
          name: cliente.nome,
          email: cliente.email,
          phone: {
            area_code: "",
            number: cliente.telefone,
          },
          identification: {
            type: "CPF",
            number: cliente.cpf,
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
