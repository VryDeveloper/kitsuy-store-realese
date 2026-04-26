import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { db } from '../lib/firebase';
import admin from '../lib/firebase';
import { handleCORS } from '../lib/cors';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface CreatePaymentBody {
  productId: string;
  collectionName: string;
  quantity: number;
  buyerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface ProductDoc {
  id: string;
  title: string;
  price: string;
  image: string;
  inStock: string;
}

// ─── Utilitário de preço ─────────────────────────────────────────────────────

/**
 * Converte preço no formato brasileiro (ex: "R$ 1.450,00") para número float.
 * Remove separadores de milhar (ponto) e converte vírgula decimal em ponto.
 */
function parseBRLPrice(raw: string): number {
  // Remove tudo que não seja dígito ou vírgula
  const onlyDigitsAndComma = raw.replace(/[^\d,]/g, '');
  // Troca vírgula decimal por ponto
  const normalized = onlyDigitsAndComma.replace(',', '.');
  const value = parseFloat(normalized);
  if (isNaN(value) || value <= 0) {
    throw new Error(`Preço inválido no banco de dados: "${raw}"`);
  }
  return value;
}

// ─── Handler principal ───────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS — responde preflight e sai, ou seta headers e continua
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { productId, collectionName, quantity, buyerInfo } =
      req.body as CreatePaymentBody;

    // ── Validação de entrada ──────────────────────────────────────────────────
    if (!productId || typeof productId !== 'string' || productId.trim() === '') {
      return res.status(400).json({ error: 'productId é obrigatório' });
    }
    if (!collectionName || typeof collectionName !== 'string' || collectionName.trim() === '') {
      return res.status(400).json({ error: 'collectionName é obrigatório' });
    }
    if (!quantity || typeof quantity !== 'number' || quantity < 1 || !Number.isInteger(quantity)) {
      return res.status(400).json({ error: 'quantity deve ser um inteiro maior que 0' });
    }

    console.log('[create-payment] Iniciando', {
      productId,
      collectionName,
      quantity,
      hasBuyerInfo: !!buyerInfo,
      timestamp: new Date().toISOString(),
    });

    // ── Buscar produto no Firebase ────────────────────────────────────────────
    const productSnap = await db.collection(collectionName).doc(productId).get();

    if (!productSnap.exists) {
      console.warn('[create-payment] Produto não encontrado', { productId, collectionName });
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const product = { id: productSnap.id, ...productSnap.data() } as ProductDoc;

    console.log('[create-payment] Produto encontrado', {
      id: product.id,
      title: product.title,
      rawPrice: product.price,
      inStock: product.inStock,
    });

    // ── Verificar disponibilidade ─────────────────────────────────────────────
    if (product.inStock?.toLowerCase() === 'indisponível') {
      return res.status(400).json({ error: 'Produto indisponível no momento' });
    }

    // ── Calcular valor (SEMPRE no backend, nunca confiar no frontend) ─────────
    const unitPrice = parseBRLPrice(product.price);
    const totalAmount = parseFloat((unitPrice * quantity).toFixed(2));

    console.log('[create-payment] Preço calculado', { unitPrice, totalAmount });

    // ── Configurar Mercado Pago ───────────────────────────────────────────────
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('[create-payment] MERCADOPAGO_ACCESS_TOKEN não configurado');
      return res.status(500).json({ error: 'Configuração de pagamento ausente no servidor' });
    }

    const client = new MercadoPagoConfig({
      accessToken,
      options: { timeout: 10_000 },
    });

    const preferenceApi = new Preference(client);

    const siteUrl = process.env.VITE_SITE_URL ?? 'http://localhost:8081';
    const externalReference = `${Date.now()}-${productId}`;

    // ── Criar preferência de pagamento ────────────────────────────────────────
    const preferencePayload = {
      items: [
        {
          id: productId,
          title: product.title,
          description: `${product.title} - Kitsuy Store`,
          picture_url: product.image,
          category_id: 'art',
          quantity,
          currency_id: 'BRL',
          unit_price: unitPrice,
        },
      ],
      payer: {
        name: buyerInfo?.name ?? '',
        email: buyerInfo?.email ?? '',
        phone: {
          area_code: '',
          number: buyerInfo?.phone ?? '',
        },
      },
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso`,
        failure: `${siteUrl}/pagamento/falha`,
        pending: `${siteUrl}/pagamento/pendente`,
      },
      // auto_return só funciona com URLs públicas (não localhost)
      ...(siteUrl.startsWith('https://') && { auto_return: 'approved' as const }),
      notification_url: `${siteUrl}/api/webhook`,
      statement_descriptor: 'KITSUY STORE',
      external_reference: externalReference,
      metadata: {
        product_id: productId,
        collection_name: collectionName,
        quantity,
      },
    };

    const mpResponse = await preferenceApi.create({ body: preferencePayload });

    console.log('[create-payment] Preferência MP criada', {
      preferenceId: mpResponse.id,
      hasInitPoint: !!mpResponse.init_point,
      hasSandboxInitPoint: !!mpResponse.sandbox_init_point,
    });

    // ── Salvar pedido pendente no Firebase ────────────────────────────────────
    const orderId = `order_${Date.now()}_${productId}`;

    await db.collection('orders').doc(orderId).set({
      orderId,
      productId,
      collectionName,
      productTitle: product.title,
      productImage: product.image,
      quantity,
      unitPrice,
      totalAmount,
      status: 'pending',
      paymentStatus: 'pending',
      mercadopagoPreferenceId: mpResponse.id,
      mercadopagoExternalReference: externalReference,
      buyerInfo: buyerInfo ?? {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`[create-payment] ✅ Pedido criado: ${orderId}`);

    // ── Retornar ao frontend ──────────────────────────────────────────────────
    return res.status(200).json({
      success: true,
      orderId,
      preferenceId: mpResponse.id,
      initPoint: mpResponse.init_point,
      sandboxInitPoint: mpResponse.sandbox_init_point ?? null,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[create-payment] ❌ Erro:', error);

    // Não expor stack trace em produção
    return res.status(500).json({
      error: 'Erro ao processar pagamento. Tente novamente.',
      ...(process.env.NODE_ENV !== 'production' && { details: message }),
    });
  }
}
