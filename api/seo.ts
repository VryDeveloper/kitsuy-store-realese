import type { VercelRequest, VercelResponse } from "@vercel/node";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "./_lib/firebase-admin.js";
import { estaDisponivel, htmlDoProduto, sitemap } from "./_lib/seo.js";
import type { ProdutoSeo } from "../src/lib/seoProduto.js";

/**
 * GET /produto/:slug  → (rewrite) /api/seo?slug=...   index.html com title/meta/OG/JSON-LD da figure
 * GET /sitemap.xml    → (rewrite) /api/seo?sitemap=1  páginas fixas + figures disponíveis
 *
 * Uma função só para as duas coisas (limite de 12 funções no Hobby).
 */
let htmlCache: string | null = null;

async function indexHtml(req: VercelRequest): Promise<string> {
  if (htmlCache) return htmlCache;
  try {
    htmlCache = await readFile(join(process.cwd(), "dist", "index.html"), "utf8"); // vercel.json → includeFiles
  } catch {
    // shortcut: se o includeFiles não vier no bundle, busca o arquivo estático do próprio deploy.
    const resposta = await fetch(`https://${req.headers.host}/index.html`);
    if (!resposta.ok) throw new Error(`index.html: HTTP ${resposta.status}`);
    htmlCache = await resposta.text();
  }
  return htmlCache;
}

type Doc = ProdutoSeo & { estoqueStatus?: string; inStock?: string; lastUpdated?: { toDate(): Date } };

async function buscarProduto(slug: string): Promise<Doc | null> {
  const produtos = db.collection("products");
  const porSlug = await produtos.where("slug", "==", slug).limit(1).get();
  const doc = porSlug.docs[0] ?? (/^[\w-]{1,100}$/.test(slug) ? await produtos.doc(slug).get() : null);
  return doc?.exists ? ({ id: doc.id, ...doc.data() } as Doc) : null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  try {
    if (req.query.sitemap) {
      const snap = await db.collection("products").get();
      const produtos = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Doc)
        .filter(estaDisponivel)
        .map((p) => ({ ...p, lastUpdated: p.lastUpdated?.toDate?.() ?? null }));
      res.setHeader("Content-Type", "application/xml; charset=utf-8");
      res.setHeader("Cache-Control", "public, s-maxage=3600, stale-while-revalidate=86400");
      return res.status(200).send(sitemap(produtos));
    }

    const html = await indexHtml(req);
    const slug = String(req.query.slug ?? "");
    const produto = slug ? await buscarProduto(slug) : null;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // Sem a figure: entrega a SPA mesmo assim (ela mostra "não encontrada"), mas avisa o Google com 404.
    if (!produto?.title || !produto.image) return res.status(404).send(html);
    res.setHeader("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
    return res.status(200).send(htmlDoProduto(html, produto, estaDisponivel(produto)));
  } catch (error) {
    console.error("[seo] ❌ Erro:", error);
    // Falhou o SEO: melhor a página funcionar sem as tags do que cair.
    try {
      return res.status(200).setHeader("Content-Type", "text/html; charset=utf-8").send(await indexHtml(req));
    } catch {
      return res.status(500).send("Erro ao carregar a página");
    }
  }
}
