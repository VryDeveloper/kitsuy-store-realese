import type { VercelRequest, VercelResponse } from "@vercel/node";
import { Payment } from "mercadopago";
import { db } from "./_lib/firebase-admin";
import { mpClient } from "./_lib/mercadopago";
import { validarAssinaturaWebhook } from "./_lib/validar-assinatura";
import { resend } from "./_lib/resend";
import {
  templateEmailLoja,
  templateEmailCliente,
} from "./_lib/email-templates";
import { notificarWhatsApp } from "./_lib/notificar-whatsapp";

/**
 * WEBHOOK DO MERCADO PAGO
 *
 * Este é o ÚNICO lugar em toda a aplicação onde um pedido pode ser marcado
 * como "pago". Nenhuma outra rota do backend e nada no frontend tem
 * permissão para alterar esse status.
 *
 * Fluxo de segurança:
 * 1. Valida a assinatura HMAC (x-signature / x-request-id) — rejeita com 401
 *    se inválida ou ausente.
 * 2. NUNCA confia no payload recebido — consulta a API do Mercado Pago
 *    (fonte da verdade) para confirmar o status real do pagamento.
 * 3. Atualiza o pedido no Firestore e, se aprovado, marca o produto como
 *    indisponível.
 * 4. Dispara emails de notificação (loja + cliente) via Resend.
 * 5. Chama o stub de notificação via WhatsApp (não implementado ainda).
 */

// ─── Mapeamento de status do Mercado Pago ─────────────────────────────────

function mapMPStatus(mpStatus: string | undefined): {
  orderStatus: "paid" | "pending" | "cancelado";
  paymentStatus: string;
} {
  switch (mpStatus) {
    case "approved":
      return { orderStatus: "paid", paymentStatus: "approved" };
    case "pending":
    case "in_process":
      return { orderStatus: "pending", paymentStatus: "pending" };
    case "rejected":
    case "cancelled":
      return { orderStatus: "cancelado", paymentStatus: "rejected" };
    default:
      return { orderStatus: "pending", paymentStatus: mpStatus ?? "unknown" };
  }
}

// ─── Handler principal ──────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  // ── Validar assinatura (SEGURANÇA CRÍTICA — NÃO NEGOCIÁVEL) ───────────
  const xSignature = req.headers["x-signature"] as string | undefined;
  const xRequestId = req.headers["x-request-id"] as string | undefined;
  const dataId =
    (req.query["data.id"] as string | undefined) ?? req.body?.data?.id;

  if (!process.env.MERCADOPAGO_WEBHOOK_SECRET) {
    console.error(
      "[webhook] ❌ MERCADOPAGO_WEBHOOK_SECRET não configurado — rejeitando por segurança",
    );
    return res
      .status(401)
      .json({ error: "Webhook não configurado corretamente" });
  }

  if (!xSignature || !xRequestId || !dataId) {
    console.error("[webhook] ❌ Headers de assinatura ausentes");
    return res.status(401).json({ error: "Headers de autenticação ausentes" });
  }

  const assinaturaValida = validarAssinaturaWebhook(
    xSignature,
    xRequestId,
    String(dataId),
    process.env.MERCADOPAGO_WEBHOOK_SECRET,
  );

  if (!assinaturaValida) {
    console.error("[webhook] ❌ Assinatura inválida — requisição rejeitada");
    return res.status(401).json({ error: "Assinatura inválida" });
  }

  try {
    const { type, data } = req.body as { type: string; data?: { id?: string } };

    console.log("[webhook] Notificação recebida", {
      type,
      dataId: data?.id,
      timestamp: new Date().toISOString(),
    });

    // ── Registrar webhook no Firestore (auditoria) ────────────────────
    const webhookId = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    await db
      .collection("pagamentos_webhook")
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

    // ── Processar apenas notificações de pagamento ─────────────────────
    if (type !== "payment") {
      return res
        .status(200)
        .json({ success: true, message: `Tipo "${type}" ignorado` });
    }

    const paymentId = data?.id;
    if (!paymentId) {
      console.error("[webhook] Payment ID ausente no body");
      return res.status(400).json({ error: "Payment ID ausente" });
    }

    // ── Buscar detalhes do pagamento na API do MP (FONTE DA VERDADE) ───
    // Nunca confiar apenas no payload recebido — a API é sempre consultada.
    const paymentApi = new Payment(mpClient);
    const paymentInfo = await paymentApi.get({ id: paymentId });

    console.log("[webhook] Detalhes do pagamento", {
      paymentId,
      status: paymentInfo.status,
      statusDetail: paymentInfo.status_detail,
      amount: paymentInfo.transaction_amount,
      externalReference: paymentInfo.external_reference,
    });

    const pedidoId = paymentInfo.external_reference;
    if (!pedidoId) {
      console.error("[webhook] external_reference ausente no pagamento", {
        paymentId,
      });
      return res
        .status(200)
        .json({ success: false, message: "external_reference ausente" });
    }

    // ── Buscar pedido no Firestore ──────────────────────────────────────
    const pedidoRef = db.collection("pedidos").doc(pedidoId);
    const pedidoDoc = await pedidoRef.get();

    if (!pedidoDoc.exists) {
      console.error("[webhook] Pedido não encontrado", { pedidoId });
      return res
        .status(200)
        .json({ success: false, message: "Pedido não encontrado" });
    }

    const pedidoData = pedidoDoc.data()!;
    const jaEstavaPago = pedidoData.status === "paid";
    const { orderStatus, paymentStatus } = mapMPStatus(
      paymentInfo.status ?? undefined,
    );

    // ── Atualizar pedido no Firestore ────────────────────────────────────
    await pedidoRef.update({
      status: orderStatus,
      atualizadoEm: new Date(),
      "pagamento.mercadoPagoId": String(paymentId),
      "pagamento.metodo": paymentInfo.payment_type_id ?? null,
      "pagamento.parcelas": paymentInfo.installments ?? null,
    });

    // ── SE APROVADO E AINDA NÃO ESTAVA PAGO: estoque + notificações ─────
    // A checagem `jaEstavaPago` evita reprocessar (ex: retentativas do MP)
    if (orderStatus === "paid" && !jaEstavaPago) {
      const { id: produtoId, collectionName } = pedidoData.produto || {};

      if (produtoId && collectionName) {
        try {
          await db.collection(collectionName).doc(produtoId).update({
            inStock: "indisponível",
            atualizadoEm: new Date(),
          });
          console.log(
            `[webhook] 📦 Produto ${produtoId} marcado como indisponível`,
          );
        } catch (err) {
          console.error(
            `[webhook] ❌ Erro ao atualizar estoque do produto ${produtoId}:`,
            err,
          );
        }
      }

      // ── Notificações por email (loja + cliente) via Resend ────────────
      await enviarEmailsDeConfirmacao(pedidoData, pedidoId);

      // ── Ponto de extensão para notificação via WhatsApp (stub) ────────
      try {
        await notificarWhatsApp({
          telefoneCliente: pedidoData.cliente?.telefone ?? "",
          nomeCliente: pedidoData.cliente?.nome ?? "",
          nomeProduto: pedidoData.produto?.nome ?? "",
          pedidoId,
          totalEmCentavos: pedidoData.pagamento?.totalEmCentavos ?? 0,
        });
      } catch (err) {
        // Uma falha na notificação nunca deve impedir a confirmação do pagamento
        console.error("[webhook] Erro ao chamar stub de WhatsApp:", err);
      }
    }

    // Atualizar registro do webhook com referência ao pedido
    await db.collection("pagamentos_webhook").doc(webhookId).update({
      pedidoId,
      status: paymentStatus,
    });

    console.log(`[webhook] ✅ Pedido ${pedidoId} atualizado → ${orderStatus}`);

    return res
      .status(200)
      .json({ success: true, pedidoId, status: orderStatus });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[webhook] ❌ Erro ao processar:", error);

    // Retornar 500 faz o Mercado Pago retentar a notificação (comportamento correto)
    return res
      .status(500)
      .json({ error: "Erro ao processar webhook", details: message });
  }
}

// ─── Envio de emails de confirmação ────────────────────────────────────────

interface PedidoData {
  produto?: { nome?: string; imagem?: string };
  cliente?: { nome?: string; email?: string; telefone?: string };
  endereco?: {
    logradouro?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    cep?: string;
  };
  frete?: { transportadora?: string; prazoEmDias?: number };
  pagamento?: { totalEmCentavos?: number };
}

async function enviarEmailsDeConfirmacao(
  pedidoData: PedidoData,
  pedidoId: string,
): Promise<void> {
  if (!resend) {
    console.warn("[webhook] Resend não configurado — pulando envio de emails");
    return;
  }

  const siteUrl = process.env.VITE_SITE_URL || "http://localhost:8081";
  const remetente = process.env.EMAIL_REMETENTE;
  const emailLoja = process.env.EMAIL_LOJA_NOTIFICACAO;

  if (!remetente) {
    console.warn(
      "[webhook] EMAIL_REMETENTE não configurado — pulando envio de emails",
    );
    return;
  }

  const dadosEmail = {
    pedidoId,
    nomeProduto: pedidoData.produto?.nome ?? "Produto",
    imagemProduto: pedidoData.produto?.imagem,
    totalEmCentavos: pedidoData.pagamento?.totalEmCentavos ?? 0,
    transportadora: pedidoData.frete?.transportadora ?? "",
    prazoEmDias: pedidoData.frete?.prazoEmDias ?? 0,
    cliente: {
      nome: pedidoData.cliente?.nome ?? "",
      email: pedidoData.cliente?.email ?? "",
      telefone: pedidoData.cliente?.telefone ?? "",
    },
    endereco: {
      logradouro: pedidoData.endereco?.logradouro ?? "",
      numero: pedidoData.endereco?.numero ?? "",
      complemento: pedidoData.endereco?.complemento,
      bairro: pedidoData.endereco?.bairro ?? "",
      cidade: pedidoData.endereco?.cidade ?? "",
      uf: pedidoData.endereco?.uf ?? "",
      cep: pedidoData.endereco?.cep ?? "",
    },
    siteUrl,
  };

  // Email para a loja
  try {
    if (emailLoja) {
      const { subject, html } = templateEmailLoja(dadosEmail);
      await resend.emails.send({
        from: remetente,
        to: emailLoja,
        subject,
        html,
      });
      console.log("[webhook] 📧 Email enviado para a loja");
    } else {
      console.warn(
        "[webhook] EMAIL_LOJA_NOTIFICACAO não configurado — pulando email da loja",
      );
    }
  } catch (err) {
    console.error("[webhook] Erro ao enviar email para a loja:", err);
  }

  // Email para o cliente
  try {
    if (dadosEmail.cliente.email) {
      const { subject, html } = templateEmailCliente(dadosEmail);
      await resend.emails.send({
        from: remetente,
        to: dadosEmail.cliente.email,
        subject,
        html,
      });
      console.log("[webhook] 📧 Email enviado para o cliente");
    }
  } catch (err) {
    console.error("[webhook] Erro ao enviar email para o cliente:", err);
  }
}
