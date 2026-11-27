import { escapeHtml } from "./escape-html.js";
import { SITE_URL, caminhoProduto, descricaoSeo, fotosDoProduto, jsonLdProduto, tituloSeo, type ProdutoSeo } from "../../src/lib/seoProduto.js";

/** Pronta entrega disponível (reserva em andamento conta como disponível: ela vence sozinha). */
export function estaDisponivel(d: { estoqueStatus?: string; inStock?: string }): boolean {
  return d.estoqueStatus !== "vendido" && d.inStock?.toLowerCase() !== "indisponível";
}

// Tags do index.html que a página da figure substitui.
const TAGS_GENERICAS = [
  /<title>[\s\S]*?<\/title>/i,
  /<meta\b[^>]*\b(?:name|property)="(?:description|og:[\w:]+|twitter:[\w:]+)"[^>]*>/gi,
  /<link\b[^>]*\brel="canonical"[^>]*>/gi,
];

/** Injeta no index.html o <head> próprio da figure (crawlers de WhatsApp/Instagram não rodam JS). */
export function htmlDoProduto(html: string, p: ProdutoSeo, disponivel: boolean): string {
  const titulo = tituloSeo(p);
  const descricao = descricaoSeo(p);
  const url = SITE_URL + caminhoProduto(p);
  const capa = fotosDoProduto(p)[0];
  const meta = (attr: string, nome: string, valor: string) => `<meta ${attr}="${nome}" content="${escapeHtml(valor)}" />`;
  // "<" escapado: um texto com "</script>" não fecha a tag antes da hora.
  const jsonLd = JSON.stringify(jsonLdProduto(p, disponivel)).replace(/</g, "\\u003c");
  const head = [
    `<title>${escapeHtml(titulo)}</title>`,
    meta("name", "description", descricao),
    `<link rel="canonical" href="${escapeHtml(url)}" />`,
    meta("property", "og:type", "product"),
    meta("property", "og:url", url),
    meta("property", "og:title", titulo),
    meta("property", "og:description", descricao),
    meta("property", "og:image", capa.url),
    meta("property", "og:image:alt", capa.alt),
    meta("property", "og:site_name", "Kitsuy Store"),
    meta("property", "og:locale", "pt_BR"),
    meta("name", "twitter:card", "summary_large_image"),
    meta("name", "twitter:title", titulo),
    meta("name", "twitter:description", descricao),
    meta("name", "twitter:image", capa.url),
    `<script type="application/ld+json">${jsonLd}</script>`,
  ].join("\n    ");
  const limpo = TAGS_GENERICAS.reduce((h, re) => h.replace(re, ""), html);
  return limpo.replace("</head>", `    ${head}\n  </head>`);
}

const PAGINAS_FIXAS = ["/", "/estoque", "/faqs", "/sorteio"];

export function sitemap(produtos: (ProdutoSeo & { lastUpdated?: Date | null })[]): string {
  const url = (loc: string, lastmod?: Date | null) =>
    `  <url><loc>${escapeHtml(SITE_URL + loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ""}</url>`;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...PAGINAS_FIXAS.map((p) => url(p)),
    ...produtos.map((p) => url(caminhoProduto(p), p.lastUpdated)),
    "</urlset>",
  ].join("\n");
}
