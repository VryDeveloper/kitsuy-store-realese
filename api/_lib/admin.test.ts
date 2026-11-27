import { describe, expect, it } from "vitest";
import { ErroAdmin, ehAdmin, explicarErro, validarConfig, validarProduto } from "./admin.js";

describe("ehAdmin", () => {
  const lista = " Loja@Gmail.com , outra@x.com";
  it("aceita e-mail verificado da lista, sem ligar para maiúsculas", () => {
    expect(ehAdmin({ email: "loja@gmail.com", email_verified: true }, lista)).toBe(true);
  });
  it("recusa e-mail não verificado, fora da lista ou sem login", () => {
    expect(ehAdmin({ email: "loja@gmail.com", email_verified: false }, lista)).toBe(false);
    expect(ehAdmin({ email: "x@x.com", email_verified: true }, lista)).toBe(false);
    expect(ehAdmin(null, lista)).toBe(false);
    expect(ehAdmin({ email: "loja@gmail.com", email_verified: true }, "")).toBe(false);
  });
});

describe("validarProduto", () => {
  const base = { title: " Miku ", price: "R$ 1.260,00", image: "https://x.com/a.webp" };
  it("normaliza os campos", () => {
    expect(validarProduto({ ...base, discount: "", pesoEmKg: "0,5", alturaEmCm: "20" })).toMatchObject({
      title: "Miku",
      discount: null,
      inStock: "disponível",
      pesoEmKg: null,
      alturaEmCm: 20,
    });
  });
  it("recusa preço fora do formato e imagem sem https", () => {
    expect(() => validarProduto({ ...base, price: "1260" })).toThrow(ErroAdmin);
    expect(() => validarProduto({ ...base, image: "javascript:alert(1)" })).toThrow(ErroAdmin);
  });
});

describe("validarConfig", () => {
  it("guarda até 3 ids de destaque válidos", () => {
    expect(validarConfig({ destaques: ["a1", "b/../x", 5, "c2", "d3", "e4"] }).destaques).toEqual(["a1", "c2", "d3"]);
  });
  it("descarta chaves desconhecidas e URLs inválidas", () => {
    const c = validarConfig({
      galeria: ["https://ok.com/a.webp", "javascript:x", "//evil.com/x.webp", "/assets/c.webp"],
      banners: [{ image: "https://ok.com/b.webp", alt: "b", href: "javascript:x" }],
      textos: { heroTitulo: "Oi", hack: "x" },
      features: { destaquePromocao: true, faixaSorteio: "sim" },
      lixo: 1,
    });
    expect(c).toEqual({
      galeria: ["https://ok.com/a.webp", "/assets/c.webp"],
      banners: [{ image: "https://ok.com/b.webp", alt: "b", href: "" }],
      avaliacoes: [],
      destaques: [],
      textos: { heroTitulo: "Oi" },
      features: { destaquePromocao: true },
    });
  });
});

describe("explicarErro", () => {
  it("explica o Blob privado em vez de um erro genérico", () => {
    const msg = explicarErro("upload", new Error("Vercel Blob: Cannot use public access on a private store."));
    expect(msg).toMatch(/^Enviar a imagem falhou: .*privado.*acesso público/);
  });
  it("aponta a variável que falta", () => {
    expect(explicarErro("upload", new Error("No token found"))).toContain("BLOB2_READ_WRITE_TOKEN");
  });
  it("nos outros casos repassa a mensagem original", () => {
    expect(explicarErro("salvarConfig", new Error("deadline exceeded"))).toBe("Salvar o site falhou: deadline exceeded");
  });
});
