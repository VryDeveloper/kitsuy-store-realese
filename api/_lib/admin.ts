import type { DecodedIdToken } from "firebase-admin/auth";
import { TEXTOS_PADRAO, FEATURES_PADRAO, type ConfigSalva } from "../../src/config/site.js";

/** Erro com mensagem para mostrar ao admin (vira 400). */
export class ErroAdmin extends Error {}

/** ADMIN_EMAILS="a@x.com,b@y.com" — só contas com e-mail verificado da lista. */
export function ehAdmin(usuario: Pick<DecodedIdToken, "email" | "email_verified"> | null, lista = process.env.ADMIN_EMAILS ?? ""): boolean {
  if (!usuario?.email || !usuario.email_verified) return false;
  const emails = lista.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  return emails.includes(usuario.email.toLowerCase());
}

const texto = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const numeroOuNull = (v: unknown) => {
  const n = Number(v);
  return v === "" || v == null || !Number.isFinite(n) || n <= 0 ? null : n;
};
const urlValida = (v: unknown) => /^(https:\/\/|\/(?!\/))/.test(texto(v)) ? texto(v) : "";

/** Valida o produto vindo do painel. Lança Error com a mensagem para o usuário. */
export function validarProduto(d: Record<string, unknown>) {
  const title = texto(d.title, 200);
  const price = texto(d.price, 30);
  const image = urlValida(d.image);
  if (!title || !image) throw new ErroAdmin("Título e imagem são obrigatórios");
  if (!/^R\$ ?[\d.]+,\d{2}$/.test(price)) throw new ErroAdmin('Preço no formato "R$ 1.234,56"');
  const discount = texto(d.discount, 30);
  if (discount && !/^R\$ ?[\d.]+,\d{2}$/.test(discount)) throw new ErroAdmin('Preço antigo no formato "R$ 1.234,56"');
  return {
    title,
    price,
    discount: discount || null,
    image,
    inStock: d.inStock === "indisponível" ? "indisponível" : "disponível",
    displayOrder: Number(d.displayOrder) || 1,
    pesoEmKg: numeroOuNull(d.pesoEmKg),
    alturaEmCm: numeroOuNull(d.alturaEmCm),
    larguraEmCm: numeroOuNull(d.larguraEmCm),
    comprimentoEmCm: numeroOuNull(d.comprimentoEmCm),
  };
}

/** Mantém só chaves conhecidas, com os tipos certos. */
export function validarConfig(c: Record<string, unknown>): ConfigSalva {
  const lista = (v: unknown) => (Array.isArray(v) ? v : []);
  const out: ConfigSalva = {
    banners: lista(c.banners)
      .map((b) => ({ image: urlValida(b?.image), alt: texto(b?.alt, 300), href: urlValida(b?.href) }))
      .filter((b) => b.image),
    galeria: lista(c.galeria).map(urlValida).filter(Boolean),
    avaliacoes: lista(c.avaliacoes).map(urlValida).filter(Boolean),
    destaques: lista(c.destaques).filter((id) => typeof id === "string" && /^[\w-]{1,100}$/.test(id)).slice(0, 3),
    textos: {},
    features: {},
  };
  const textos = (c.textos ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(TEXTOS_PADRAO) as (keyof typeof TEXTOS_PADRAO)[]) {
    if (typeof textos[k] === "string" && textos[k]) out.textos![k] = texto(textos[k]);
  }
  const features = (c.features ?? {}) as Record<string, unknown>;
  for (const k of Object.keys(FEATURES_PADRAO) as (keyof typeof FEATURES_PADRAO)[]) {
    if (typeof features[k] === "boolean") out.features![k] = features[k] as boolean;
  }
  return out;
}
