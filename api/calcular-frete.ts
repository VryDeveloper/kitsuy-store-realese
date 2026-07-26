import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { db } from "./_lib/firebase-admin";
import { handleCORS } from "../lib/cors";

// Cotação de frete válida por 30 minutos — tempo suficiente para o cliente
// terminar o checkout sem deixar a janela de uso aberta indefinidamente.
const TTL_COTACAO_MS = 30 * 60 * 1000;

/**
 * GET /api/calcular-frete?cep=XXXXXXXX&produtoId=ID
 *
 * Calcula o frete via SuperFrete. As dimensões e o peso do produto são
 * SEMPRE lidos do Firestore (coleção `products`) — nunca aceitos do
 * frontend, para impedir que um cliente manipule o cálculo de frete.
 *
 * Esta rota só deve ser usada para produtos da coleção `products`
 * (estoque pronto). A coleção `masterpiece` não tem checkout real.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { cep, produtoId } = req.query;

  if (!cep || !/^\d{8}$/.test(String(cep))) {
    return res
      .status(400)
      .json({ error: "CEP inválido. Deve conter 8 dígitos." });
  }

  if (!produtoId || typeof produtoId !== "string") {
    return res.status(400).json({ error: "produtoId é obrigatório" });
  }

  const inicioTotal = Date.now();

  try {
    console.log("[calcular-frete] Iniciando", { cep, produtoId });

    // Produto SEMPRE buscado na coleção "products" (única com checkout real)
    const inicioFirestore = Date.now();
    const produtoDoc = await db.collection("products").doc(produtoId).get();
    console.log(
      `[calcular-frete] Firestore respondeu em ${Date.now() - inicioFirestore}ms`,
    );

    if (!produtoDoc.exists) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }

    const produto = produtoDoc.data()!;

    if (produto.inStock?.toLowerCase() === "indisponível") {
      return res.status(400).json({ error: "Produto indisponível no momento" });
    }

    if (
      !produto.pesoEmKg ||
      !produto.alturaEmCm ||
      !produto.larguraEmCm ||
      !produto.comprimentoEmCm
    ) {
      console.warn("[calcular-frete] Produto sem dimensões configuradas", {
        produtoId,
      });
      return res.status(400).json({
        error: "Produto sem dimensões configuradas. Contate o suporte.",
      });
    }

    if (!process.env.SUPERFRETE_TOKEN || !process.env.LOJA_CEP_ORIGEM) {
      console.error("[calcular-frete] Variáveis SuperFrete não configuradas");
      return res.status(500).json({
        error: "Serviço de frete temporariamente indisponível",
      });
    }

    const precoParaSeguro = parseFloat(
      String(produto.price)
        .replace(/[^\d,]/g, "")
        .replace(",", "."),
    );

    const inicioSuperFrete = Date.now();
    const response = await fetch(
      "https://api.superfrete.com/api/v0/calculator",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.SUPERFRETE_TOKEN}`,
          "Content-Type": "application/json",
          "User-Type": "shipper",
        },
        body: JSON.stringify({
          from: { postal_code: process.env.LOJA_CEP_ORIGEM },
          to: { postal_code: cep },
          package: {
            height: produto.alturaEmCm,
            width: produto.larguraEmCm,
            length: produto.comprimentoEmCm,
            weight: produto.pesoEmKg,
          },
          // A API da SuperFrete espera "services" como string separada por
          // vírgula (ex: "1,2,3"), não como array — enviar um array faz a
          // API retornar 500 com "data.services.split is not a function".
          services: "1,2,3", // PAC, SEDEX, Jadlog
          options: {
            insurance_value: precoParaSeguro,
            receipt: false,
            own_hand: false,
          },
        }),
      },
    );
    console.log(
      `[calcular-frete] SuperFrete respondeu em ${Date.now() - inicioSuperFrete}ms (status ${response.status})`,
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[calcular-frete] Erro SuperFrete:", errorText);
      return res
        .status(502)
        .json({ error: "Erro ao calcular frete. Tente novamente." });
    }

    interface CotacaoSuperFrete {
      id: string | number;
      name: string;
      delivery_time: number;
      price: number;
      error?: string;
    }

    const cotacoes = (await response.json()) as CotacaoSuperFrete[];

    const cotacoesValidas = cotacoes.filter((c) => !c.error);

    if (cotacoesValidas.length === 0) {
      return res.status(400).json({
        error: "Nenhuma opção de frete disponível para este CEP",
      });
    }

    // ── PERSISTIR CADA COTAÇÃO NO FIRESTORE (fonte da verdade) ───────────
    // O "id" devolvido ao frontend passa a ser o ID desse documento, não o
    // id do serviço da SuperFrete. Isso permite que /api/criar-preferencia
    // recupere o valor REAL cotado aqui, em vez de confiar em qualquer
    // número que o cliente mande no corpo da requisição de pagamento.
    const agora = Date.now();
    const expiraEm = new Date(agora + TTL_COTACAO_MS);

    const opcoes = await Promise.all(
      cotacoesValidas.map(async (c) => {
        const cotacaoId = randomUUID();
        const valorEmCentavos = Math.round(c.price * 100);
        const transportadora = c.name;
        const prazoEmDias = c.delivery_time;

        await db
          .collection("cotacoes_frete")
          .doc(cotacaoId)
          .set({
            cotacaoId,
            produtoId,
            cep: String(cep),
            transportadora,
            prazoEmDias,
            valorEmCentavos,
            criadoEm: new Date(agora),
            expiraEm,
            usada: false,
          });

        return {
          id: cotacaoId,
          transportadora,
          prazoEmDias,
          valorEmCentavos,
          valorFormatado: new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(c.price),
        };
      }),
    );

    console.log(
      `[calcular-frete] Concluído em ${Date.now() - inicioTotal}ms (total)`,
    );

    return res.status(200).json({ opcoes });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error(
      `[calcular-frete] Erro após ${Date.now() - inicioTotal}ms:`,
      error,
    );

    return res.status(500).json({
      error: "Erro ao calcular frete",
      ...(process.env.NODE_ENV !== "production" && { details: message }),
    });
  }
}
