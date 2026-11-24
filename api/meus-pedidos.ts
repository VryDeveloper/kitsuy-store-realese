import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "./_lib/firebase-admin.js";
import { usuarioDoToken } from "./_lib/auth.js";
import { handleCORS } from "../lib/cors.js";

/**
 * GET /api/meus-pedidos  (header Authorization: Bearer <idToken>)
 *
 * Devolve os pedidos do usuário logado: os gravados com o `uid` dele e,
 * SÓ se o e-mail da conta estiver verificado, os feitos sem conta com o
 * mesmo e-mail. Sem essa checagem, alguém criaria uma conta com o e-mail
 * de outra pessoa (sem confirmar) e veria os pedidos dela.
 *
 * Nunca devolve CPF, telefone ou endereço completo.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  const usuario = await usuarioDoToken(req);
  if (!usuario) {
    return res.status(401).json({ error: "Faça login para ver seus pedidos" });
  }

  try {
    const pedidos = db.collection("pedidos");
    const consultas = [pedidos.where("uid", "==", usuario.uid).get()];
    if (usuario.email && usuario.email_verified) {
      // shortcut: compara o e-mail exatamente como foi digitado no checkout; pedidos com maiúsculas diferentes ficam de fora
      consultas.push(pedidos.where("cliente.email", "==", usuario.email).get());
    }

    const porId = new Map<string, FirebaseFirestore.DocumentData>();
    for (const snap of await Promise.all(consultas)) {
      snap.docs.forEach((d) => porId.set(d.id, d.data()));
    }

    const lista = [...porId.entries()]
      .map(([id, p]) => ({
        pedidoId: id,
        status: p.status ?? "pendente",
        criadoEm: p.criadoEm?.toDate?.().toISOString?.() ?? null,
        totalEmCentavos: p.pagamento?.totalEmCentavos ?? 0,
        transportadora: p.frete?.transportadora ?? "",
        produtos: (Array.isArray(p.produtos) ? p.produtos : []).map(
          (item: { nome?: string; imagem?: string; preco?: number }) => ({
            nome: item.nome || "Produto",
            imagem: item.imagem || "",
            preco: item.preco || 0,
          }),
        ),
      }))
      // Pedido que nunca foi pago e já venceu não interessa ao cliente.
      .filter((p) => p.status !== "expirado")
      .sort((a, b) => (b.criadoEm ?? "").localeCompare(a.criadoEm ?? ""));

    return res.status(200).json({ pedidos: lista });
  } catch (error) {
    console.error("[meus-pedidos] ❌ Erro:", error);
    return res.status(500).json({ error: "Erro ao buscar pedidos" });
  }
}
