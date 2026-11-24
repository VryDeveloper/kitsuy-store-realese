// @vitest-environment node
import { describe, it, expect, beforeEach } from "vitest";
import { randomBytes } from "crypto";
import { cifrar, decifrar } from "./cripto.js";

describe("cripto", () => {
  beforeEach(() => {
    process.env.DADOS_CHAVE_CRIPTO = randomBytes(32).toString("base64");
  });

  it("cifra e decifra; o texto não aparece no valor gravado", () => {
    const v = cifrar("123.456.789-00");
    expect(v.startsWith("enc:v1:")).toBe(true);
    expect(v).not.toContain("123");
    expect(decifrar(v)).toBe("123.456.789-00");
    expect(cifrar("x")).not.toBe(cifrar("x")); // IV aleatório
  });

  it("mantém valores antigos em texto puro", () => {
    expect(decifrar("12345678900")).toBe("12345678900");
  });

  it("recusa valor adulterado e chave errada", () => {
    const v = cifrar("segredo");
    const adulterado = v.slice(0, -4) + (v.endsWith("AAAA") ? "BBBB" : "AAAA");
    expect(() => decifrar(adulterado)).toThrow();
    process.env.DADOS_CHAVE_CRIPTO = randomBytes(32).toString("base64");
    expect(() => decifrar(v)).toThrow();
  });

  it("falha sem chave em vez de gravar em texto puro", () => {
    delete process.env.DADOS_CHAVE_CRIPTO;
    expect(() => cifrar("x")).toThrow(/DADOS_CHAVE_CRIPTO/);
  });
});
