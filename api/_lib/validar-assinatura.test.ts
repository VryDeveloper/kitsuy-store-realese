// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { validarAssinaturaWebhook } from "./validar-assinatura.js";

function criarAssinatura(dataId: string, requestId: string, ts: string, secret: string): string {
  const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`;
  const hash = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  return `ts=${ts},v1=${hash}`;
}

describe("validarAssinaturaWebhook", () => {
  const secret = "test-webhook-secret";
  const dataId = "12345";
  const requestId = "req-abc123";
  const agora = Math.floor(Date.now() / 1000);

  it("valida uma assinatura correta", () => {
    const signature = criarAssinatura(dataId, requestId, String(agora), secret);

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(true);
  });

  it("rejeita assinatura com hash inválido", () => {
    const signature = `ts=${agora},v1=invalidhash0000000000000000000000000000000000000000`;

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(false);
  });

  it("rejeita assinatura com secret errado", () => {
    const signature = criarAssinatura(dataId, requestId, String(agora), "wrong-secret");

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, "correct-secret");

    expect(resultado).toBe(false);
  });

  it("rejeita assinatura com requestId diferente", () => {
    const signature = criarAssinatura(dataId, requestId, String(agora), secret);

    const resultado = validarAssinaturaWebhook(signature, "different-request-id", dataId, secret);

    expect(resultado).toBe(false);
  });

  it("rejeita assinatura com dataId diferente", () => {
    const signature = criarAssinatura(dataId, requestId, String(agora), secret);

    const resultado = validarAssinaturaWebhook(signature, requestId, "999999", secret);

    expect(resultado).toBe(false);
  });

  it("aceita dataId em maiúscula (normaliza para minúscula)", () => {
    const dataIdMaiuscula = "ABCD123";
    const signature = criarAssinatura(dataIdMaiuscula, requestId, String(agora), secret);

    const resultado = validarAssinaturaWebhook(signature, requestId, dataIdMaiuscula, secret);

    expect(resultado).toBe(true);
  });

  it("rejeita timestamp muito antigo (mais de 5 minutos)", () => {
    const tsAntigo = Math.floor(Date.now() / 1000) - 600; // 10 minutos atrás
    const signature = criarAssinatura(dataId, requestId, String(tsAntigo), secret);

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(false);
  });

  it("rejeita timestamp no futuro (mais de 5 minutos)", () => {
    const tsFuturo = Math.floor(Date.now() / 1000) + 600; // 10 minutos no futuro
    const signature = criarAssinatura(dataId, requestId, String(tsFuturo), secret);

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(false);
  });

  it("aceita timestamp dentro da janela de 5 minutos", () => {
    const ts4MinutosAtras = Math.floor(Date.now() / 1000) - 240;
    const signature = criarAssinatura(dataId, requestId, String(ts4MinutosAtras), secret);

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(true);
  });

  it("rejeita assinatura com formato inválido (sem ts=)", () => {
    const signature = `v1=somehash`;

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(false);
  });

  it("rejeita assinatura com formato inválido (sem v1=)", () => {
    const signature = `ts=${agora}`;

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(false);
  });

  it("rejeita assinatura com timestamp não-numérico", () => {
    const signature = `ts=invalid,v1=somehash`;

    const resultado = validarAssinaturaWebhook(signature, requestId, dataId, secret);

    expect(resultado).toBe(false);
  });

  it("rejeita graciosamente erros durante validação", () => {
    // Simular um erro passando valores que causam exceção
    const resultado = validarAssinaturaWebhook("", "", "", "");

    expect(resultado).toBe(false);
  });
});
