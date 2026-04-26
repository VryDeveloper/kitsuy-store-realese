import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Payment } from 'mercadopago';
import { db } from './_lib/firebase-admin';
import { mpClient } from './_lib/mercadopago';
import { validarAssinaturaWebhook } from './_lib/validar-assinatura';

/**
 * WEBHOOK DO MERCADO PAGO
 * 
 * Este é o único lugar onde um pedido pode ser marcado como "pago".
 * NUNCA confie nos dados do body - sempre consulte a API do MP.
 */

// ─── Mapeamento de status do Mercado Pago ─────────────────────────────────────

function mapMPStatus(mpStatus: string | undefined): {
  orderStatus: string;
  paymentStatus: string;
} {
  switch (mpStatus) {
    case 'approved':
      return { orderStatus: 'paid', paymentStatus: 'approved' };
    case 'pending':
    case 'in_process':
      return { orderStatus: 'pending', paymentStatus: 'pending' };
    case 'rejected':
    case 'cancelled':
      return { orderStatus: 'cancelled', paymentStatus: 'rejected' };
    default:
      return { orderStatus: 'pending', paymentStatus: mpStatus ?? 'unknown' };
  }
}

// ─── Handler principal ────────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  // ── Validar assinatura (SEGURANÇA CRÍTICA) ────────────────────────────────
  const xSignature = req.headers['x-signature'] as string | undefined;
  const xRequestId = req.headers['x-request-id'] as string | undefined;
  const dataId = (req.query['data.id'] as string | undefined) ?? req.body?.data?.id;

  if (process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    if (!xSignature || !xRequestId || !dataId) {
      console.error('[webhook] ❌ Headers de assinatura ausentes');
      return res.status(401).json({ error: 'Headers de autenticação ausentes' });
    }

    const isValid = validarAssinaturaWebhook(
      xSignature,
      xRequestId,
      String(dataId),
      process.env.MERCADOPAGO_WEBHOOK_SECRET
    );

    if (!isValid) {
      console.error('[webhook] ❌ Assinatura inválida — requisição rejeitada');
      return res.status(401).json({ error: 'Assinatura inválida' });
    }
  } else {
    console.warn('[webhook] ⚠️ MERCADOPAGO_WEBHOOK_SECRET não configurado - validação ignorada');
  }

  try {
    const { type, data } = req.body as { type: string; data?: { id?: string } };

    console.log('[webhook] Notificação recebida', {
      type,
      dataId: data?.id,
      timestamp: new Date().toISOString(),
    });

    // ── Registrar webhook no Firebase (auditoria) ─────────────────────────
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db
      .collection('pagamentos_webhook')
      .doc(webhookId)
      .set({
        webhookId,
        tipo: type,
        payload: req.body,
        recebidoEm: new Date(),
        mercadoPagoId: data?.id ?? null,
        pedidoId: null,
        status: null,
      });

    // ── Processar apenas notificações de pagamento ─────────────────────────
    if (type !== 'payment') {
      return res.status(200).json({ success: true, message: `Tipo "${type}" ignorado` });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.error('[webhook] Payment ID ausente no body');
      return res.status(400).json({ error: 'Payment ID ausente' });
    }

    // ── Buscar detalhes do pagamento no MP (FONTE DA VERDADE) ─────────────
    const paymentApi = new Payment(mpClient);

    const paymentInfo = await paymentApi.get({ id: paymentId });

    console.log('[webhook] Detalhes do pagamento', {
      paymentId,
      status: paymentInfo.status,
      statusDetail: paymentInfo.status_detail,
      amount: paymentInfo.transaction_amount,
      externalReference: paymentInfo.external_reference,
    });

    const pedidoId = paymentInfo.external_reference;
    if (!pedidoId) {
      console.error('[webhook] external_reference ausente no pagamento', { paymentId });
      return res.status(200).json({ success: false, message: 'external_reference ausente' });
    }

    // ── Buscar pedido no Firebase ──────────────────────────────────────────
    const pedidoDoc = await db.collection('pedidos').doc(pedidoId).get();

    if (!pedidoDoc.exists) {
      console.error('[webhook] Pedido não encontrado', { pedidoId });
      return res.status(200).json({ success: false, message: 'Pedido não encontrado' });
    }

    const { orderStatus, paymentStatus } = mapMPStatus(paymentInfo.status ?? undefined);

    // ── Atualizar pedido no Firebase ───────────────────────────────────────
    await db
      .collection('pedidos')
      .doc(pedidoId)
      .update({
        status: orderStatus,
        atualizadoEm: new Date(),
        'pagamento.mercadoPagoId': String(paymentId),
        'pagamento.metodo': paymentInfo.payment_type_id ?? null,
        'pagamento.parcelas': paymentInfo.installments ?? null,
      });

    // Atualizar registro do webhook com referência ao pedido
    await db
      .collection('pagamentos_webhook')
      .doc(webhookId)
      .update({
        pedidoId,
        status: paymentInfo.status,
      });

    console.log(`[webhook] ✅ Pedido ${pedidoId} atualizado → ${orderStatus}`);

    return res.status(200).json({ success: true, pedidoId, status: orderStatus });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[webhook] ❌ Erro ao processar:', error);

    // Retornar 500 faz o Mercado Pago retentar a notificação (comportamento correto)
    return res.status(500).json({ error: 'Erro ao processar webhook' });
  }
}
