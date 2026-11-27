import { precoEmReais } from "./preco.js";

/** Domínio oficial: canonical, og:url e sitemap apontam sempre para ele (nunca para o preview). */
export const SITE_URL = "https://kitsuystore.com.br";

export interface FotoProduto {
  url: string;
  alt?: string | null;
}

/** Campos da figure usados na página e no SEO (todos os extras são opcionais). */
export interface ProdutoSeo {
  id: string;
  title: string;
  price: string;
  image: string;
  imageAlt?: string | null;
  images?: FotoProduto[] | null;
  slug?: string | null;
  description?: string | null;
  fabricante?: string | null;
  serie?: string | null;
  escala?: string | null;
  alturaFiguraCm?: number | null;
  material?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
}

/** "Hatsune Miku 1/7 – Good Smile!" → "hatsune-miku-1-7-good-smile" */
export function gerarSlug(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export const caminhoProduto = (p: Pick<ProdutoSeo, "id" | "slug">) => `/produto/${p.slug || p.id}`;

/** Capa + extras, na ordem, com alt preenchido (o salvo no painel ou nome + ângulo). */
export function fotosDoProduto(p: ProdutoSeo): { url: string; alt: string }[] {
  const capa = { url: p.image, alt: p.imageAlt || p.title };
  const extras = (p.images ?? []).filter((f) => f?.url).map((f, i) => ({ url: f.url, alt: f.alt || `${p.title} — foto ${i + 2}` }));
  return [capa, ...extras];
}

const corta = (t: string, max: number) => (t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`);

export function tituloSeo(p: ProdutoSeo): string {
  if (p.seoTitle) return p.seoTitle;
  const serie = p.serie && !p.title.toLowerCase().includes(p.serie.toLowerCase()) ? ` (${p.serie})` : "";
  return corta(`${p.title}${serie} | Kitsuy Store`, 70);
}

export function descricaoSeo(p: ProdutoSeo): string {
  if (p.seoDescription) return p.seoDescription;
  const partes = [
    `${p.title}${p.fabricante ? ` da ${p.fabricante}` : ""}${p.serie ? `, de ${p.serie}` : ""}`,
    `por ${p.price} na Kitsuy Store`,
  ];
  const resto = p.description ? ` ${p.description.replace(/\s+/g, " ")}` : " Figure original, pronta entrega, envio para todo o Brasil.";
  return corta(`${partes.join(" ")}.${resto}`, 160);
}

/** Dados estruturados schema.org/Product (preço e estoque nos resultados do Google). */
export function jsonLdProduto(p: ProdutoSeo, disponivel: boolean) {
  const url = SITE_URL + caminhoProduto(p);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.title,
    image: fotosDoProduto(p).map((f) => f.url),
    description: descricaoSeo(p),
    sku: p.id,
    ...(p.fabricante && { brand: { "@type": "Brand", name: p.fabricante } }),
    ...(p.material && { material: p.material }),
    ...(p.alturaFiguraCm && { height: { "@type": "QuantitativeValue", value: p.alturaFiguraCm, unitCode: "CMT" } }),
    offers: {
      "@type": "Offer",
      url,
      priceCurrency: "BRL",
      price: precoEmReais(p.price).toFixed(2),
      availability: disponivel ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}
