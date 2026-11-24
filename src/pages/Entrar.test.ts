import { describe, it, expect, vi } from "vitest";

vi.mock("@/firebaseConfig", () => ({ auth: {} }));
import { destinoSeguro, mensagemErro, problemaSenha } from "./Entrar";

describe("Entrar", () => {
  it("só volta para caminho interno", () => {
    expect(destinoSeguro("/checkout")).toBe("/checkout");
    expect(destinoSeguro("//evil.com")).toBe("/minha-conta");
    expect(destinoSeguro("https://evil.com")).toBe("/minha-conta");
    expect(destinoSeguro(null)).toBe("/minha-conta");
    expect(destinoSeguro(String.raw`/\evil.com`)).toBe("/minha-conta");
  });

  it("traduz erro do Firebase e tem mensagem padrão", () => {
    expect(mensagemErro({ code: "auth/invalid-credential" })).toBe("E-mail ou senha incorretos.");
    expect(mensagemErro(new Error("x"))).toContain("Tente novamente");
  });

  it("cadastro exige senha longa e confirmação igual", () => {
    expect(problemaSenha("curta1", "curta1")).toMatch(/8 caracteres/);
    expect(problemaSenha("senhaforte123", "senhaforte124")).toMatch(/não são iguais/);
    expect(problemaSenha("senhaforte123", "senhaforte123")).toBeNull();
  });

  it("não revela se o e-mail tem conta", () => {
    expect(mensagemErro({ code: "auth/user-not-found" })).toBe(mensagemErro({ code: "auth/wrong-password" }));
  });
});
