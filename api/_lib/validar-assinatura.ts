import { createHmac } from 'crypto';

/**
 * Valida a assinatura do webhook do Mercado Pago
 * Documentação: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
 */
export function validarAssinaturaWebhook(
  signature: string,
  requestId: string,
  dataId: string,
  secret: string
): boolean {
  try {
    const partes = signature.split(',');
    const tsStr = partes.find(p => p.startsWith('ts='))?.split('=')[1];
    const v1 = partes.find(p => p.startsWith('v1='))?.split('=')[1];

    if (!tsStr || !v1) {
      console.warn('[validar-assinatura] Formato de assinatura inválido');
      return false;
    }

    // Verificar que a requisição não tem mais de 5 minutos (300.000ms)
    const diff = Math.abs(Date.now() - Number(tsStr));
    if (diff > 300_000) {
      console.warn('[validar-assinatura] Timestamp expirado', { diff });
      return false;
    }

    // Criar o manifest conforme documentação do MP
    const manifest = `id:${dataId};request-id:${requestId};ts:${tsStr};`;
    const expected = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    const isValid = expected === v1;

    if (!isValid) {
      console.warn('[validar-assinatura] HMAC não confere');
    }

    return isValid;
  } catch (error) {
    console.error('[validar-assinatura] Erro ao validar:', error);
    return false;
  }
}
