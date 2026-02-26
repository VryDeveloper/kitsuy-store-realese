import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import admin from 'firebase-admin';

// Inicializar Firebase Admin (apenas uma vez)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID || 'kitsuystore-f2805',
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();

// 🔒 Webhook - Receber notificações do Mercado Pago
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Webhook aceita apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { type, data } = req.body;

    console.log('📩 Webhook recebido:', { type, data });

    // Mercado Pago envia notificação de pagamento
    if (type === 'payment') {
      const paymentId = data.id;

      if (!paymentId) {
        console.error('❌ Payment ID não encontrado');
        return res.status(400).json({ error: 'Payment ID ausente' });
      }

      // Configurar Mercado Pago
      const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
      if (!accessToken) {
        console.error('MERCADOPAGO_ACCESS_TOKEN não configurado');
        return res.status(500).json({ error: 'Configuração ausente' });
      }

      const client = new MercadoPagoConfig({ 
        accessToken,
        options: { timeout: 5000 }
      });

      const payment = new Payment(client);

      // 🔍 Buscar informações do pagamento no Mercado Pago
      const paymentInfo = await payment.get({ id: paymentId });

      console.log('💳 Status do pagamento:', paymentInfo.status);
      console.log('💰 Valor:', paymentInfo.transaction_amount);

      // Extrair dados do pedido
      const externalReference = paymentInfo.external_reference;
      const status = paymentInfo.status;
      const statusDetail = paymentInfo.status_detail;

      // Buscar pedido no Firebase pela external_reference
      const ordersRef = db.collection('orders');
      const querySnapshot = await ordersRef
        .where('mercadopagoExternalReference', '==', externalReference)
        .limit(1)
        .get();

      if (querySnapshot.empty) {
        console.error('❌ Pedido não encontrado:', externalReference);
        return res.status(404).json({ error: 'Pedido não encontrado' });
      }

      const orderDoc = querySnapshot.docs[0];
      const orderId = orderDoc.id;

      // Mapear status do Mercado Pago para status do pedido
      let orderStatus = 'pending';
      let paymentStatus = status || 'pending';

      switch (status) {
        case 'approved':
          orderStatus = 'paid';
          paymentStatus = 'approved';
          break;
        case 'pending':
        case 'in_process':
          orderStatus = 'pending';
          paymentStatus = 'pending';
          break;
        case 'rejected':
        case 'cancelled':
          orderStatus = 'cancelled';
          paymentStatus = 'rejected';
          break;
        default:
          orderStatus = 'pending';
          paymentStatus = status || 'pending';
      }

      // 🔥 Atualizar pedido no Firebase
      await db.collection('orders').doc(orderId).update({
        status: orderStatus,
        paymentStatus: paymentStatus,
        paymentStatusDetail: statusDetail,
        mercadopagoPaymentId: paymentId,
        transactionAmount: paymentInfo.transaction_amount,
        paymentMethodId: paymentInfo.payment_method_id,
        payerEmail: paymentInfo.payer?.email || '',
        paidAt: status === 'approved' ? admin.firestore.FieldValue.serverTimestamp() : null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`✅ Pedido ${orderId} atualizado para: ${orderStatus} (${paymentStatus})`);

      // Retornar sucesso para o Mercado Pago
      return res.status(200).json({ 
        success: true,
        orderId,
        status: orderStatus 
      });
    }

    // Outros tipos de notificação
    return res.status(200).json({ 
      success: true,
      message: 'Notificação recebida' 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro no webhook:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar webhook',
      details: errorMessage 
    });
  }
}
