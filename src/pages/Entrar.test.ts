import { describe, it, expect, vi } from "vitest";

vi.mock("@/firebaseConfig", () => ({ auth: {} }));
import { destinoSeguro, mensagemErro } from "./Entrar";

describe("Entrar", () => {
  it("só volta para caminho interno", () => {
    expect(destinoSeguro("/checkout")).toBe("/checkout");
    expect(destinoSeguro("//evil.com")).toBe("/minha-conta");
    expect(destinoSeguro("https://evil.com")).toBe("/minha-conta");
    expect(destinoSeguro(null)).toBe("/minha-conta");
  });

  it("traduz erro do Firebase e tem mensagem padrão", () => {
    expect(mensagemErro({ code: "auth/invalid-credential" })).toBe("E-mail ou senha incorretos.");
    expect(mensagemErro(new Error("x"))).toContain("Tente novamente");
  });
});
