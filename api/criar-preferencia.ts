import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Preference } from 'mercadopago';
import { v4 as uuidv4 } from 'uuid';
import { db } from './_lib/firebase-admin';
import { mpClient } from './_lib/mercadopago';
import { handleCORS } from '../lib/cors';

/**
 * API CRÍTICA DE SEGURANÇA
 * 
 * Esta rota cria a preferência de pagamento no Mercado Pago.
 * O valor é SEMPRE calculado no backend a partir dos dados do Firebase.
 * NUNCA aceite preço ou frete vindo do frontend.
 */

interface CriarPreferenciaBody {
  produtoId: string;
  collectionName: string;
  freteEscolhido: {
    id: string;
    transportadora: string;
    prazoEmDias: number;
    valorEmCentavos: number;
  };
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
  };
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCORS(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { produtoId, collectionName, freteEscolhido, cliente, endereco } =
      req.body as CriarPreferenciaBody;

    // ── VALIDAÇÃO DE CAMPOS OBRIGATÓRIOS ─────────────────────────────
    if (!produtoId || !collectionName || !freteEscolhido || !cliente || !endereco) {
      return res.status(400).json({ error: 'Dados incompletos' });
    }

    console.log('[criar-preferencia] Iniciando', { produtoId, collectionName });

    // ── BUSCAR PREÇO REAL NO FIREBASE (NUNCA aceitar do frontend) ────
    const produtoDoc = await db.collection(collectionName).doc(produtoId).get();

    if (!produtoDoc.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const produto = produtoDoc.data()!;

    // Verificar disponibilidade
    if (produto.inStock?.toLowerCase() === 'indisponível') {
      return res.status(400).json({ error: 'Produto indisponível no momento' });
    }

    // ── CALCULAR TOTAL (produto + frete, ambos validados) ────────────
    // Converter preço de string BRL para centavos
    const precoEmReais = parseFloat(
      produto.price.replace(/[^\d,]/g, '').replace(',', '.')
    );
    const precoEmCentavos = Math.round(precoEmReais * 100);
    const freteEmCentavos = freteEscolhido.valorEmCentavos;
    const totalEmCentavos = precoEmCentavos + freteEmCentavos;
    const totalEmReais = totalEmCentavos / 100;

    console.log('[criar-preferencia] Valores calculados', {
      precoEmCentavos,
      freteEmCentavos,
      totalEmCentavos,
    });

    // ── CRIAR PEDIDO PENDENTE NO FIREBASE ────────────────────────────
    const pedidoId = uuidv4();
    const now = new Date();

    await db
      .collection('pedidos')
      .doc(pedidoId)
      .set({
        pedidoId,
        status: 'pendente',
        criadoEm: now,
        atualizadoEm: now,
        produto: {
          id: produtoId,
          nome: produto.title,
          preco: precoEmCentavos,
          quantidade: 1,
          imagem: produto.image || '',
        },
        cliente: {
          nome: cliente.nome,
          email: cliente.email,
          telefone: cliente.telefone,
          cpf: cliente.cpf,
        },
        endereco,
        frete: {
          transportadora: freteEscolhido.transportadora,
          prazoEmDias: freteEscolhido.prazoEmDias,
          valor: freteEmCentavos,
        },
        pagamento: {
          mercadoPagoId: null,
          preferenceId: null,
          metodo: null,
          parcelas: null,
          totalEmCentavos,
        },
      });

    console.log(`[criar-preferencia] Pedido criado no Firebase: ${pedidoId}`);

    // ── CRIAR PREFERÊNCIA NO MERCADO PAGO ────────────────────────────
    const preference = new Preference(mpClient);
    const siteUrl = process.env.VITE_SITE_URL || 'http://localhost:8081';

    const result = await preference.create({
      body: {
        external_reference: pedidoId, // liga o pagamento ao pedido
        items: [
          {
            id: produtoId,
            title: produto.title,
            description: `${produto.title} - Kitsuy Store`,
            picture_url: produto.image,
            quantity: 1,
            unit_price: totalEmReais,
            currency_id: 'BRL',
          },
        ],
        payer: {
          name: cliente.nome,
          email: cliente.email,
          phone: {
            area_code: '',
            number: cliente.telefone,
          },
          identification: {
            type: 'CPF',
            number: cliente.cpf,
          },
        },
        payment_methods: {
          installments: 4, // até 4x sem juros
          excluded_payment_types: [],
        },
        notification_url: `${siteUrl}/api/webhook`,
        back_urls: {
          success: `${siteUrl}/pedido-confirmado?id=${pedidoId}`,
          failure: `${siteUrl}/checkout?erro=pagamento`,
          pending: `${siteUrl}/pedido-confirmado?id=${pedidoId}&status=pendente`,
        },
        auto_return: siteUrl.startsWith('https://') ? ('approved' as const) : undefined,
        statement_descriptor: 'KITSUY STORE',
      },
    });

    // Atualizar pedido com preferenceId
    await db
      .collection('pedidos')
      .doc(pedidoId)
      .update({
        'pagamento.preferenceId': result.id,
        atualizadoEm: new Date(),
      });

    console.log('[criar-preferencia] ✅ Preferência MP criada:', result.id);

    return res.status(200).json({
      preferenceId: result.id,
      pedidoId,
      initPoint: result.init_point,
      sandboxInitPoint: result.sandbox_init_point || null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[criar-preferencia] ❌ Erro:', error);

    return res.status(500).json({
      error: 'Erro ao processar pagamento. Tente novamente.',
      ...(process.env.NODE_ENV !== 'production' && { details: message }),
    });
  }
}
