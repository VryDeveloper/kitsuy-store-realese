import type { VercelRequest, VercelResponse } from '@vercel/node';
import { db } from './_lib/firebase-admin';
import { handleCORS } from '../lib/cors';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS
  if (handleCORS(req, res)) return;

  // Permitir apenas GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const { cep, produtoId, collectionName } = req.query;

  // Validação básica de CEP (apenas dígitos, 8 caracteres)
  if (!cep || !/^\d{8}$/.test(String(cep))) {
    return res.status(400).json({ error: 'CEP inválido. Deve conter 8 dígitos.' });
  }

  if (!produtoId || !collectionName) {
    return res.status(400).json({ error: 'produtoId e collectionName são obrigatórios' });
  }

  try {
    console.log('[calcular-frete] Iniciando', { cep, produtoId, collectionName });

    // Buscar dimensões e peso do produto no Firebase (backend)
    // NUNCA confiar nos dados enviados pelo cliente
    const produtoDoc = await db
      .collection(String(collectionName))
      .doc(String(produtoId))
      .get();

    if (!produtoDoc.exists) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const produto = produtoDoc.data()!;

    // Verificar se o produto tem as dimensões necessárias
    if (
      !produto.pesoEmKg ||
      !produto.alturaEmCm ||
      !produto.larguraEmCm ||
      !produto.comprimentoEmCm
    ) {
      console.warn('[calcular-frete] Produto sem dimensões configuradas', { produtoId });
      return res.status(400).json({
        error: 'Produto sem dimensões configuradas. Contate o suporte.',
      });
    }

    // Verificar se SuperFrete está configurado
    if (!process.env.SUPERFRETE_TOKEN || !process.env.LOJA_CEP_ORIGEM) {
      console.error('[calcular-frete] Variáveis SuperFrete não configuradas');
      return res.status(500).json({
        error: 'Serviço de frete temporariamente indisponível',
      });
    }

    // Preparar preço para seguro (converter de string BRL para número)
    const precoParaSeguro = parseFloat(
      produto.price.replace(/[^\d,]/g, '').replace(',', '.')
    );

    // Chamar API SuperFrete
    const response = await fetch('https://api.superfrete.com/api/v0/calculator', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SUPERFRETE_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Type': 'shipper',
      },
      body: JSON.stringify({
        from: { postal_code: process.env.LOJA_CEP_ORIGEM },
        to: { postal_code: cep },
        package: {
          height: produto.alturaEmCm,
          width: produto.larguraEmCm,
          length: produto.comprimentoEmCm,
          weight: produto.pesoEmKg,
        },
        services: ['1', '2', '3'], // PAC, SEDEX, Jadlog
        options: {
          insurance_value: precoParaSeguro,
          receipt: false,
          own_hand: false,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[calcular-frete] Erro SuperFrete:', errorText);
      return res.status(502).json({ error: 'Erro ao calcular frete. Tente novamente.' });
    }

    const cotacoes = await response.json();

    console.log('[calcular-frete] Cotações recebidas:', cotacoes.length);

    // Retornar apenas os campos necessários para o frontend
    const opcoes = cotacoes
      .filter((c: any) => !c.error)
      .map((c: any) => ({
        id: c.id,
        transportadora: c.name,
        prazoEmDias: c.delivery_time,
        valorEmCentavos: Math.round(c.price * 100),
        valorFormatado: new Intl.NumberFormat('pt-BR', {
          style: 'currency',
          currency: 'BRL',
        }).format(c.price),
      }));

    if (opcoes.length === 0) {
      return res.status(400).json({
        error: 'Nenhuma opção de frete disponível para este CEP',
      });
    }

    return res.status(200).json({ opcoes });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('[calcular-frete] Erro:', error);

    return res.status(500).json({
      error: 'Erro ao calcular frete',
      ...(process.env.NODE_ENV !== 'production' && { details: message }),
    });
  }
}
