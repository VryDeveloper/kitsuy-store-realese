import type { VercelRequest, VercelResponse } from "@vercel/node";
import { put } from "@vercel/blob";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "./_lib/firebase-admin.js";
import { usuarioDoToken } from "./_lib/auth.js";
import { ErroAdmin, ehAdmin, validarConfig, validarProduto } from "./_lib/admin.js";
import { handleCORS } from "../lib/cors.js";

/**
 * POST /api/admin  (header Authorization: Bearer <idToken> de um ADMIN_EMAILS)
 * body: { acao, ... }
 *   eu                          → só confere se é admin
 *   salvarProduto { id?, dados } → cria ou atualiza products/{id}
 *   apagarProduto { id }
 *   salvarConfig  { config }     → grava config/site (textos, imagens, features)
 *   upload        { nome, dataUrl } → sobe a imagem no Vercel Blob e devolve a URL
 *
 * Uma rota só para não gastar funções do plano Hobby da Vercel (limite 12).
 */
const TIPOS_IMAGEM = ["image/webp", "image/jpeg", "image/png", "image/avif"];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (handleCORS(req, res)) return;
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  if (!ehAdmin(await usuarioDoToken(req))) {
    return res.status(403).json({ error: "Acesso só para administradores" });
  }

  const body = (req.body ?? {}) as Record<string, unknown>;
  try {
    switch (body.acao) {
      case "eu":
        return res.status(200).json({ ok: true });

      case "salvarProduto": {
        const dados = validarProduto((body.dados ?? {}) as Record<string, unknown>);
        const produtos = db.collection("products");
        const id = typeof body.id === "string" && body.id ? body.id : null;
        if (!id) {
          const ref = await produtos.add({ ...dados, estoqueStatus: "disponivel", lastUpdated: new Date() });
          return res.status(201).json({ id: ref.id });
        }
        const ref = produtos.doc(id);
        await db.runTransaction(async (tx) => {
          const atual = (await tx.get(ref)).data();
          if (!atual) throw new ErroAdmin("Produto não encontrado");
          const extra: Record<string, unknown> = {};
          // Marcar como disponível um item vendido = repor estoque. Reserva em andamento não é mexida.
          if (dados.inStock === "disponível" && atual.estoqueStatus === "vendido") {
            Object.assign(extra, { estoqueStatus: "disponivel", vendidoPedidoId: null });
          }
          tx.update(ref, { ...dados, ...extra, lastUpdated: new Date() });
        });
        return res.status(200).json({ id });
      }

      case "apagarProduto": {
        if (typeof body.id !== "string" || !body.id) throw new ErroAdmin("id ausente");
        await db.collection("products").doc(body.id).delete();
        return res.status(200).json({ id: body.id });
      }

      case "salvarConfig": {
        const config = validarConfig((body.config ?? {}) as Record<string, unknown>);
        await db.collection("config").doc("site").set({ ...config, atualizadoEm: FieldValue.serverTimestamp() });
        return res.status(200).json({ ok: true });
      }

      case "upload": {
        const m = /^data:([\w/+.-]+);base64,(.+)$/.exec(String(body.dataUrl ?? ""));
        if (!m || !TIPOS_IMAGEM.includes(m[1])) throw new ErroAdmin("Envie uma imagem webp, jpg, png ou avif");
        const arquivo = Buffer.from(m[2], "base64");
        const nome = String(body.nome ?? "imagem").replace(/[^\w.-]/g, "_").slice(0, 80);
        const blob = await put(`site/${nome}`, arquivo, {
          access: "public",
          contentType: m[1],
          addRandomSuffix: true,
        });
        return res.status(200).json({ url: blob.url });
      }

      default:
        return res.status(400).json({ error: "Ação desconhecida" });
    }
  } catch (error) {
    if (error instanceof ErroAdmin) return res.status(400).json({ error: error.message });
    console.error("[admin] ❌ Erro:", error);
    return res.status(500).json({ error: "Erro ao salvar" });
  }
}
