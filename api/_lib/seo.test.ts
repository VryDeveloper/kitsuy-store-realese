import { describe, expect, it } from "vitest";
import { estaDisponivel, htmlDoProduto, sitemap } from "./seo.js";

const html = `<html><head>
<title>
  Loja
</title>
<meta
  name="description"
  content="genérica"
/>
<meta property="og:image:width" content="1200" />
<meta name="twitter:card" content="summary" />
<meta name="viewport" content="width=device-width" />
</head><body></body></html>`;

const p = { id: "abc", slug: "miku", title: 'Miku "</script>"', price: "R$ 100,00", image: "https://x.com/a.webp?x=1&y=2" };

describe("htmlDoProduto", () => {
  const out = htmlDoProduto(html, p, true);
  it("troca as tags genéricas pelas da figure", () => {
    expect(out).not.toContain("genérica");
    expect(out).not.toContain("og:image:width");
    expect(out.match(/<title>/g)).toHaveLength(1);
    expect(out).toContain('name="viewport"');
    expect(out).toContain('<link rel="canonical" href="https://kitsuystore.com.br/produto/miku" />');
    expect(out).toContain('content="https://x.com/a.webp?x=1&amp;y=2"');
  });
  it("escapa texto do painel (atributos e JSON-LD)", () => {
    expect(out).toContain("Miku &quot;&lt;/script&gt;&quot;");
    expect(out.match(/<\/script>/g)).toHaveLength(1); // só o fechamento do JSON-LD
    expect(out).toContain('"availability":"https://schema.org/InStock"');
  });
});

describe("sitemap e disponibilidade", () => {
  it("lista páginas fixas e figures com lastmod", () => {
    const xml = sitemap([{ ...p, lastUpdated: new Date("2026-11-20T10:00:00Z") }]);
    expect(xml).toContain("<loc>https://kitsuystore.com.br/estoque</loc>");
    expect(xml).toContain("<loc>https://kitsuystore.com.br/produto/miku</loc><lastmod>2026-11-20</lastmod>");
  });
  it("vendido ou indisponível sai; reservado fica", () => {
    expect(estaDisponivel({ estoqueStatus: "vendido", inStock: "disponível" })).toBe(false);
    expect(estaDisponivel({ inStock: "Indisponível" })).toBe(false);
    expect(estaDisponivel({ estoqueStatus: "reservado", inStock: "disponível" })).toBe(true);
  });
});
