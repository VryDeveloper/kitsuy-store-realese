import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/firebase-admin";
import { handleCORS } from "../lib/cors";

/**
 * GET /api/verificar-pagamento?pedidoId=ID
 *
 * Usado pela página de agradecimento (PedidoConfirmado) para consultar o
 * status atual de um pedido. Retorna apenas os campos necessários — nunca
 * expõe dados sensíveis do cliente (CPF, endereço completo, etc).
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const { pedidoId } = req.query;

  if (!pedidoId || typeof pedidoId !== "string") {
    return res.status(400).json({ error: "pedidoId obrigatório" });
  }

  try {
    console.log("[verificar-pagamento] Consultando pedido:", pedidoId);

    const doc = await db.collection("pedidos").doc(pedidoId).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Pedido não encontrado" });
    }

    const pedido = doc.data()!;

    return res.status(200).json({
      pedidoId,
      status: pedido.status,
      produto: pedido.produto?.nome || "Produto",
      imagem: pedido.produto?.imagem || "",
      totalEmCentavos: pedido.pagamento?.totalEmCentavos || 0,
      transportadora: pedido.frete?.transportadora || "",
      prazoEmDias: pedido.frete?.prazoEmDias || 0,
      clienteNome: pedido.cliente?.nome || "",
      clienteEmail: pedido.cliente?.email || "",
      criadoEm: pedido.criadoEm,
      atualizadoEm: pedido.atualizadoEm,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[verificar-pagamento] Erro:", error);

    return res.status(500).json({
      error: "Erro ao verificar pagamento",
      ...(process.env.NODE_ENV !== "production" && { details: message }),
    });
  }
}
