import { describe, expect, it } from "vitest";
import { caminhoProduto, descricaoSeo, fotosDoProduto, gerarSlug, jsonLdProduto, tituloSeo } from "./seoProduto";

const miku = { id: "abc", title: "Hatsune Miku 1/7", price: "R$ 1.260,00", image: "https://x.com/capa.webp" };

describe("gerarSlug", () => {
  it("tira acento e símbolo", () => {
    expect(gerarSlug("  Ação: Miku 1/7 – Good Smile! ")).toBe("acao-miku-1-7-good-smile");
    expect(gerarSlug("***")).toBe("");
  });
});

describe("SEO da figure", () => {
  it("gera título e descrição a partir dos campos, e respeita o que veio do painel", () => {
    const p = { ...miku, serie: "Vocaloid", fabricante: "Good Smile" };
    expect(tituloSeo(p)).toBe("Hatsune Miku 1/7 (Vocaloid) | Kitsuy Store");
    expect(descricaoSeo(p)).toMatch(/^Hatsune Miku 1\/7 da Good Smile, de Vocaloid por R\$ 1\.260,00/);
    expect(descricaoSeo(p).length).toBeLessThanOrEqual(160);
    expect(tituloSeo({ ...p, seoTitle: "Meu título" })).toBe("Meu título");
  });

  it("monta fotos com alt e usa o slug no caminho", () => {
    const fotos = fotosDoProduto({ ...miku, images: [{ url: "https://x.com/2.webp" }, { url: "" }] });
    expect(fotos).toEqual([
      { url: miku.image, alt: miku.title },
      { url: "https://x.com/2.webp", alt: "Hatsune Miku 1/7 — foto 2" },
    ]);
    expect(caminhoProduto({ id: "abc", slug: null })).toBe("/produto/abc");
    expect(caminhoProduto({ id: "abc", slug: "miku" })).toBe("/produto/miku");
  });

  it("JSON-LD com preço em BRL e disponibilidade", () => {
    const ld = jsonLdProduto({ ...miku, fabricante: "Good Smile" }, false);
    expect(ld.offers).toMatchObject({ price: "1260.00", priceCurrency: "BRL", availability: "https://schema.org/OutOfStock" });
    expect(ld).toMatchObject({ brand: { name: "Good Smile" } });
    expect(jsonLdProduto(miku, true)).not.toHaveProperty("brand");
  });
});
