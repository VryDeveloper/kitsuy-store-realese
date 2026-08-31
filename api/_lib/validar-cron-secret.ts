import { createHash, timingSafeEqual } from "crypto";

/**
 * Valida o header `Authorization: Bearer <token>` de uma rota de cron
 * contra o valor esperado em `CRON_SECRET`.
 *
 * Mesma ideia de comparação em tempo constante usada em
 * `validar-assinatura.ts` para o webhook do Mercado Pago, mas comparando
 * o hash SHA-256 de ambos os valores em vez do valor bruto — assim
 * `timingSafeEqual` sempre recebe dois buffers do mesmo tamanho (32 bytes),
 * independentemente do tamanho do token recebido, sem precisar de uma
 * checagem de tamanho separada antes (que também vazaria timing).
 */
export function validarCronSecret(
  authorizationHeader: string | undefined,
  secret: string,
): boolean {
  if (!authorizationHeader) return false;

  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const tokenHash = createHash("sha256").update(token).digest();
  const secretHash = createHash("sha256").update(secret).digest();

  return timingSafeEqual(tokenHash, secretHash);
}
