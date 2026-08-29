import type { VercelRequest, VercelResponse } from "@vercel/node";
import { randomUUID } from "crypto";
import { db } from "./_lib/firebase-admin.js";
import { handleCORS } from "../lib/cors.js";
import { estaDisponivelAgora } from "./_lib/estoque.js";
import {
  agruparCarrinhoEmCaixas,
  montarPayloadCotacaoSuperFrete,
  consolidarCotacoesPorTransportadora,
  type ItemCarrinho,
} from "./_lib/frete-consolidado.js";

// Cotação de frete válida por 30 minutos — tempo suficiente para o cliente
// terminar o checkout sem deixar a janela de uso aberta indefinidamente.
const TTL_COTACAO_MS = 30 * 60 * 1000;

// Dimensões padrão da caixa de envio, usadas quando o produto ainda não tem
// essas informações cadastradas no Firestore. Valores provisórios (20x20x30cm,
// até 1kg) — ajustar por produto assim que possível.
const DIMENSOES_PADRAO = {
  pesoEmKg: 1,
  alturaEmCm: 20,
  larguraEmCm: 20,
  comprimentoEmCm: 30,
};

interface CotacaoSuperFrete {
  id: string | number;
  name: string;
  delivery_time: number;
  price: number;
  discount?: string | number;
  has_error?: boolean;
  error?: string;
}

/**
 * A SuperFrete retorna `price` já com um desconto embutido e `discount` como
 * o valor de conta/contrato a subtrair mais uma vez pra chegar no preço final
 * — confirmado contra o site oficial: `price - discount` bate com o valor
 * "com desconto" mostrado ao cliente logado, e `price + discount` bate com o
 * valor "riscado" (tabela cheia, sem nenhum desconto). `discount` vem como
 * string — nem sempre presente dependendo da transportadora, por isso o
 * fallback pra 0 nas duas funções.
 */
function valorFinalEmCentavos(cotacao: Pick<CotacaoSuperFrete, "price" | "discount">): number {
  return Math.round((cotacao.price - (Number(cotacao.discount) || 0)) * 100);
}

function valorOriginalEmCentavos(cotacao: Pick<CotacaoSuperFrete, "price" | "discount">): number {
  return Math.round((cotacao.price + (Number(cotacao.discount) || 0)) * 100);
}

/**
 * GET /api/calcular-frete?cep=XXXXXXXX&produtoIds=id1,id2,id3
 *
 * Calcula o frete consolidado do carrinho via SuperFrete: agrupa os
 * produtos em caixas (cubagem + bin packing, ver api/_lib/frete-consolidado.ts),
 * cota cada caixa separadamente na SuperFrete, e consolida o resultado por
 * transportadora (uma opção só entra no resultado se cotou TODAS as caixas).
 * Dimensões e peso são SEMPRE lidos do Firestore — nunca aceitos do
 * frontend, para impedir que um cliente manipule o cálculo de frete.
 *
 * Esta rota só deve ser usada para produtos da coleção `products` (estoque
 * pronto). A coleção `masterpiece` não tem checkout real.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { cep, produtoIds: produtoIdsRaw } = req.query;

  if (!cep || !/^\d{8}$/.test(String(cep))) {
    return res
      .status(400)
      .json({ error: "CEP inválido. Deve conter 8 dígitos." });
  }

  if (!produtoIdsRaw || typeof produtoIdsRaw !== "string") {
    return res.status(400).json({ error: "produtoIds é obrigatório" });
  }

  const produtoIds = [
    ...new Set(
      produtoIdsRaw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean),
    ),
  ];

  if (produtoIds.length === 0) {
    return res.status(400).json({ error: "produtoIds é obrigatório" });
  }

  const inicioTotal = Date.now();

  try {
    console.log("[calcular-frete] Iniciando", { cep, produtoIds });

    // Produtos SEMPRE buscados na coleção "products" (única com checkout real)
    const produtoDocs = await Promise.all(
      produtoIds.map((id) => db.collection("products").doc(id).get()),
    );

    const naoEncontrados = produtoIds.filter((_, i) => !produtoDocs[i].exists);
    if (naoEncontrados.length > 0) {
      return res
        .status(404)
        .json({ error: "Produto não encontrado", produtoIds: naoEncontrados });
    }

    const indisponiveis: string[] = [];
    const itens: ItemCarrinho[] = produtoIds.map((produtoId, i) => {
      const produto = produtoDocs[i].data()!;

      if (!estaDisponivelAgora(produto)) {
        indisponiveis.push(produtoId);
      }

      if (
        !produto.pesoEmKg ||
        !produto.alturaEmCm ||
        !produto.larguraEmCm ||
        !produto.comprimentoEmCm
      ) {
        console.warn(
          "[calcular-frete] Produto sem dimensões configuradas — usando padrão",
          { produtoId },
        );
      }

      const precoEmReais = parseFloat(
        String(produto.price)
          .replace(/[^\d,]/g, "")
          .replace(",", "."),
      );

      return {
        produtoId,
        pesoEmKg: produto.pesoEmKg || DIMENSOES_PADRAO.pesoEmKg,
        alturaCm: produto.alturaEmCm || DIMENSOES_PADRAO.alturaEmCm,
        larguraCm: produto.larguraEmCm || DIMENSOES_PADRAO.larguraEmCm,
        comprimentoCm: produto.comprimentoEmCm || DIMENSOES_PADRAO.comprimentoEmCm,
        precoEmCentavos: Math.round(precoEmReais * 100),
      };
    });

    if (indisponiveis.length > 0) {
      return res.status(400).json({
        error: "Um ou mais produtos do carrinho não estão mais disponíveis",
        produtoIds: indisponiveis,
      });
    }

    if (!process.env.SUPERFRETE_TOKEN || !process.env.LOJA_CEP_ORIGEM) {
      console.error("[calcular-frete] Variáveis SuperFrete não configuradas");
      return res.status(500).json({
        error: "Serviço de frete temporariamente indisponível",
      });
    }

    const { caixas, itensSemCaixa } = agruparCarrinhoEmCaixas(itens);

    if (itensSemCaixa.length > 0) {
      return res.status(400).json({
        error:
          "Um ou mais produtos do carrinho excedem o tamanho de caixa disponível — fale conosco pelo WhatsApp pra cotar esse frete manualmente.",
        produtoIds: itensSemCaixa.map((item) => item.produtoId),
      });
    }

    // ── COTAR CADA CAIXA NA SUPERFRETE (em paralelo) ───────────────────────
    const inicioSuperFrete = Date.now();
    const resultadosPorCaixa = await Promise.all(
      caixas.map(async (caixaResultado) => {
        const payload = montarPayloadCotacaoSuperFrete(
          caixaResultado,
          process.env.LOJA_CEP_ORIGEM!,
          String(cep),
        );

        const response = await fetch(
          "https://api.superfrete.com/api/v0/calculator",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.SUPERFRETE_TOKEN}`,
              "Content-Type": "application/json",
              "User-Type": "shipper",
            },
            body: JSON.stringify(payload),
          },
        );

        if (!response.ok) {
          const errorText = await response.text();
          console.error(
            `[calcular-frete] Erro SuperFrete pra caixa ${caixaResultado.caixa.nome}:`,
            errorText,
          );
          return { caixaResultado, cotacoes: [] as CotacaoSuperFrete[] };
        }

        const cotacoes = (await response.json()) as CotacaoSuperFrete[];
        return {
          caixaResultado,
          cotacoes: cotacoes.filter((c) => !c.has_error && !c.error),
        };
      }),
    );
    console.log(
      `[calcular-frete] SuperFrete (${caixas.length} caixa(s)) respondeu em ${Date.now() - inicioSuperFrete}ms`,
    );

    const cotacoesPorCaixa = resultadosPorCaixa.map(({ cotacoes }) =>
      cotacoes.map((c) => ({
        transportadora: c.name,
        prazoEmDias: c.delivery_time,
        valorEmCentavos: valorFinalEmCentavos(c),
        valorOriginalEmCentavos: valorOriginalEmCentavos(c),
      })),
    );

    const opcoesConsolidadas = consolidarCotacoesPorTransportadora(cotacoesPorCaixa);

    if (opcoesConsolidadas.length === 0) {
      return res.status(400).json({
        error: "Nenhuma opção de frete disponível para este CEP",
      });
    }

    // ── PERSISTIR CADA OPÇÃO CONSOLIDADA NO FIRESTORE (fonte da verdade) ───
    // O "id" devolvido ao frontend passa a ser o ID desse documento, não o
    // id do serviço da SuperFrete. Isso permite que /api/criar-preferencia
    // recupere o valor REAL cotado aqui, em vez de confiar em qualquer
    // número que o cliente mande no corpo da requisição de pagamento.
    const agora = Date.now();
    const expiraEm = new Date(agora + TTL_COTACAO_MS);

    const opcoes = await Promise.all(
      opcoesConsolidadas.map(async (opcaoConsolidada) => {
        const cotacaoId = randomUUID();

        // Breakdown por caixa, só pra transportadora desta opção — auditável.
        const caixasDaOpcao = resultadosPorCaixa
          .map(({ caixaResultado, cotacoes }) => {
            const cotacaoDaCaixa = cotacoes.find(
              (c) => c.name === opcaoConsolidada.transportadora,
            );
            if (!cotacaoDaCaixa) return null;

            return {
              nomeCaixa: caixaResultado.caixa.nome,
              produtoIds: caixaResultado.itens.map((item) => item.produtoId),
              pesoCobradoKg: caixaResultado.pesoCobradoKg,
              valorSeguradoEmCentavos: caixaResultado.valorSeguradoEmCentavos,
              valorEmCentavosDestaCaixa: valorFinalEmCentavos(cotacaoDaCaixa),
              valorOriginalEmCentavosDestaCaixa: valorOriginalEmCentavos(cotacaoDaCaixa),
              prazoEmDiasDestaCaixa: cotacaoDaCaixa.delivery_time,
            };
          })
          .filter((c): c is NonNullable<typeof c> => c !== null);

        await db
          .collection("cotacoes_frete")
          .doc(cotacaoId)
          .set({
            cotacaoId,
            produtoIds,
            cep: String(cep),
            transportadora: opcaoConsolidada.transportadora,
            prazoEmDias: opcaoConsolidada.prazoEmDias,
            valorEmCentavos: opcaoConsolidada.valorEmCentavos,
            valorOriginalEmCentavos: opcaoConsolidada.valorOriginalEmCentavos,
            caixas: caixasDaOpcao,
            criadoEm: new Date(agora),
            expiraEm,
            usada: false,
          });

        const formatador = new Intl.NumberFormat("pt-BR", {
          style: "currency",
          currency: "BRL",
        });

        return {
          id: cotacaoId,
          transportadora: opcaoConsolidada.transportadora,
          prazoEmDias: opcaoConsolidada.prazoEmDias,
          valorEmCentavos: opcaoConsolidada.valorEmCentavos,
          valorFormatado: formatador.format(opcaoConsolidada.valorEmCentavos / 100),
          valorOriginalEmCentavos: opcaoConsolidada.valorOriginalEmCentavos,
          valorOriginalFormatado: formatador.format(
            opcaoConsolidada.valorOriginalEmCentavos / 100,
          ),
        };
      }),
    );

    console.log(
      `[calcular-frete] Concluído em ${Date.now() - inicioTotal}ms (total, ${caixas.length} caixa(s))`,
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
