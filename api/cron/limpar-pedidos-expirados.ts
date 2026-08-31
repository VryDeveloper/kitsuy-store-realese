import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../_lib/firebase-admin.js";
import { liberarReservasExpiradas } from "../_lib/estoque.js";
import { validarCronSecret } from "../_lib/validar-cron-secret.js";

/**
 * GET /api/cron/limpar-pedidos-expirados
 *
 * Faz duas coisas independentes na mesma execução:
 *
 * 1. Marca como "expirado" pedidos "pendente" cuja janela de pagamento já
 *    passou — housekeeping/relatório, pra não acumular "pendente" órfãos
 *    que nunca mais vão virar pagamento.
 * 2. Libera de volta pra "disponível" as reservas de produto cujo TTL já
 *    venceu (ver liberarReservasExpiradas em api/_lib/estoque.ts). Isso é
 *    reforço: reservarProduto() já reclama reservas vencidas na PRÓXIMA
 *    tentativa de compra do mesmo produto, mas se ninguém tentar comprar de
 *    novo o produto ficaria "indisponível" na listagem indefinidamente sem
 *    este passo.
 *
 * Protegida por `Authorization: Bearer ${CRON_SECRET}`. A Vercel injeta
 * esse header automaticamente em invocações de Cron Jobs quando a env var
 * CRON_SECRET está configurada no projeto — ver vercel.json.
 */

const COLLECTION_PRODUTOS = "products"; // mesma coleção usada em criar-preferencia.ts

// Pedidos antigos (de antes desta feature existir) podem não ter
// `reservadoAte`. Pra esses, cai no fallback de `criadoEm` + esta janela —
// mesma duração da expiração da preferência no Mercado Pago (ver
// PREFERENCIA_EXPIRACAO_MINUTOS em criar-preferencia.ts). Não usar
// `criadoEm < agora` puro: isso é sempre verdade (todo pedido pendente tem
// criadoEm no passado), o que expiraria pedidos recém-criados por engano.
const JANELA_EXPIRACAO_LEGADO_MS = 60 * 60 * 1000;

const FIRESTORE_BATCH_LIMIT = 500;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  if (!process.env.CRON_SECRET) {
    console.error(
      "[cron/limpar-pedidos-expirados] ❌ CRON_SECRET não configurado — rejeitando por segurança",
    );
    return res.status(401).json({ error: "Cron não configurado corretamente" });
  }

  if (
    !validarCronSecret(req.headers.authorization, process.env.CRON_SECRET)
  ) {
    console.error("[cron/limpar-pedidos-expirados] ❌ Autorização inválida ou ausente");
    return res.status(401).json({ error: "Não autorizado" });
  }

  try {
    const agoraMs = Date.now();

    // Único filtro no Firestore é `status == "pendente"` (índice simples,
    // sem precisar de índice composto). A comparação de tempo é feita em
    // memória — no volume de pedidos desta loja isso é desprezível, e evita
    // depender de um índice composto (status + reservadoAte) que exigiria
    // um passo manual de criação no console do Firebase antes do primeiro
    // deploy.
    const pendentesSnap = await db
      .collection("pedidos")
      .where("status", "==", "pendente")
      .get();

    const idsExpirados: string[] = [];

    for (const doc of pendentesSnap.docs) {
      const pedido = doc.data();
      const reservadoAteMs = pedido.reservadoAte?.toMillis?.() as
        | number
        | undefined;
      const criadoEmMs = pedido.criadoEm?.toMillis?.() as number | undefined;

      const expirou =
        reservadoAteMs !== undefined
          ? reservadoAteMs < agoraMs
          : criadoEmMs !== undefined &&
            agoraMs - criadoEmMs > JANELA_EXPIRACAO_LEGADO_MS;

      if (expirou) {
        idsExpirados.push(doc.id);
      }
    }

    let totalAtualizado = 0;

    for (let i = 0; i < idsExpirados.length; i += FIRESTORE_BATCH_LIMIT) {
      const lote = idsExpirados.slice(i, i + FIRESTORE_BATCH_LIMIT);
      const batch = db.batch();

      for (const pedidoId of lote) {
        batch.update(db.collection("pedidos").doc(pedidoId), {
          status: "expirado",
          atualizadoEm: new Date(),
        });
      }

      await batch.commit();
      totalAtualizado += lote.length;
    }

    console.log(
      `[cron/limpar-pedidos-expirados] ✅ ${totalAtualizado} de ${pendentesSnap.size} pedido(s) "pendente" marcado(s) como "expirado"`,
    );

    const produtosLiberados = await liberarReservasExpiradas(
      COLLECTION_PRODUTOS,
    );

    console.log(
      `[cron/limpar-pedidos-expirados] ✅ ${produtosLiberados} reserva(s) de produto vencida(s) liberada(s)`,
    );

    return res.status(200).json({
      success: true,
      pedidosPendentesAnalisados: pendentesSnap.size,
      pedidosMarcadosComoExpirados: totalAtualizado,
      produtosComReservaLiberada: produtosLiberados,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[cron/limpar-pedidos-expirados] ❌ Erro:", error);

    return res.status(500).json({
      error: "Erro ao limpar pedidos expirados",
      details: message,
    });
  }
}
