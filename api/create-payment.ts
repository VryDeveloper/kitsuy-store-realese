import type { VercelRequest, VercelResponse } from '@vercel/node';
import { MercadoPagoConfig, Preference } from 'mercadopago';

// 🔥 Importar Firebase Admin para buscar dados do produto
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

// Tipos
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

interface Product {
  id: string;
  title: string;
  price: string;
  image: string;
  inStock: string;
}

// 🔒 Função principal - Criar preferência de pagamento
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { productId, collectionName, quantity, buyerInfo }: CreatePaymentBody = req.body;

    // Validações básicas
    if (!productId || !collectionName || !quantity || quantity < 1) {
      return res.status(400).json({ 
        error: 'Dados inválidos. Necessário: productId, collectionName e quantity válida' 
      });
    }

    // 🔥 Buscar produto no Firebase (SEGURANÇA: não confiar no frontend)
    const productRef = db.collection(collectionName).doc(productId);
    const productSnap = await productRef.get();

    if (!productSnap.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const product = { id: productSnap.id, ...productSnap.data() } as Product;

    // Verificar disponibilidade
    if (product.inStock?.toLowerCase() === 'indisponível') {
      return res.status(400).json({ error: 'Produto indisponível' });
    }

    // 💰 Calcular valor total (extrair número do preço "R$ 450")
    const priceMatch = product.price.match(/[\d,.]+/);
    if (!priceMatch) {
      return res.status(400).json({ error: 'Preço do produto inválido' });
    }

    const unitPrice = parseFloat(priceMatch[0].replace(',', '.'));
    const totalAmount = unitPrice * quantity;

    // Configurar Mercado Pago
    const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
    if (!accessToken) {
      console.error('MERCADOPAGO_ACCESS_TOKEN não configurado');
      return res.status(500).json({ error: 'Configuração de pagamento ausente' });
    }

    const client = new MercadoPagoConfig({ 
      accessToken,
      options: { timeout: 5000 }
    });

    const preference = new Preference(client);

    // Site URL para retorno
    const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:8081';

    // Criar preferência de pagamento
    const preferenceData = {
      items: [
        {
          id: productId,
          title: product.title,
          description: `${product.title} - Kitsuy Store`,
          picture_url: product.image,
          category_id: 'art',
          quantity: quantity,
          currency_id: 'BRL',
          unit_price: unitPrice,
        },
      ],
      payer: {
        name: buyerInfo?.name || '',
        email: buyerInfo?.email || '',
        phone: {
          area_code: '',
          number: buyerInfo?.phone || '',
        },
      },
      back_urls: {
        success: `${siteUrl}/pagamento/sucesso`,
        failure: `${siteUrl}/pagamento/falha`,
        pending: `${siteUrl}/pagamento/pendente`,
      },
      auto_return: 'approved' as const,
      notification_url: `${siteUrl}/api/webhook`,
      statement_descriptor: 'KITSUY STORE',
      external_reference: `${Date.now()}-${productId}`,
      metadata: {
        product_id: productId,
        collection_name: collectionName,
        quantity: quantity,
      },
    };

    const response = await preference.create({ body: preferenceData });

    // 🔥 Criar pedido pendente no Firebase
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
      mercadopagoPreferenceId: response.id,
      mercadopagoExternalReference: preferenceData.external_reference,
      buyerInfo: buyerInfo || {},
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log(`✅ Pedido criado: ${orderId}`);
    console.log(`💳 Preferência MP: ${response.id}`);

    // Retornar init_point para redirecionamento
    return res.status(200).json({
      success: true,
      orderId,
      preferenceId: response.id,
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('❌ Erro ao criar pagamento:', error);
    return res.status(500).json({ 
      error: 'Erro ao processar pagamento',
      details: errorMessage 
    });
  }
}
