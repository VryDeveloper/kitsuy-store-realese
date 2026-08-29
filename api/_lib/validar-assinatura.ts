import { createHmac, timingSafeEqual } from "crypto";

/**
 * Valida a assinatura HMAC do webhook do Mercado Pago.
 *
 * Documentação oficial:
 * https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 *
 * O header `x-signature` chega no formato: "ts=<timestamp>,v1=<hash>"
 * O manifest usado para calcular o HMAC é: "id:<data.id>;request-id:<x-request-id>;ts:<ts>;"
 */
export function validarAssinaturaWebhook(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string,
): boolean {
  try {
    const partes = signature.split(",");
    const tsStr = partes.find((p) => p.trim().startsWith("ts="))?.split("=")[1];
    const v1 = partes.find((p) => p.trim().startsWith("v1="))?.split("=")[1];

    if (!tsStr || !v1) {
      console.warn("[validar-assinatura] Formato de assinatura inválido");
      return false;
    }

    // Rejeita requisições com timestamp muito antigo (mais de 5 minutos).
    // O Mercado Pago manda `ts` em SEGUNDOS (Unix timestamp), não em
    // milissegundos — sem essa conversão, `diff` dá sempre um valor
    // gigantesco (ordem de trilhões de ms) e toda notificação real é
    // rejeitada como expirada, mesmo chegando na hora certa.
    const diff = Math.abs(Date.now() - Number(tsStr) * 1000);
    if (Number.isNaN(diff) || diff > 300_000) {
      console.warn("[validar-assinatura] Timestamp expirado ou inválido", {
        diff,
      });
      return false;
    }

    // dataId deve estar em minúsculo conforme a doc do Mercado Pago
    const manifest = `id:${dataId.toLowerCase()};request-id:${requestId};ts:${tsStr};`;
    const expected = createHmac("sha256", secret)
      .update(manifest)
      .digest("hex");

    // Comparação em tempo constante — evita timing attack. Os buffers
    // precisam ter o mesmo tamanho antes de chamar timingSafeEqual.
    const expectedBuf = Buffer.from(expected, "hex");
    const receivedBuf = Buffer.from(v1, "hex");
    const isValid =
      expectedBuf.length === receivedBuf.length &&
      timingSafeEqual(expectedBuf, receivedBuf);

    if (!isValid) {
      console.warn("[validar-assinatura] HMAC não confere");
    }

    return isValid;
  } catch (error) {
    console.error("[validar-assinatura] Erro ao validar:", error);
    return false;
  }
}
