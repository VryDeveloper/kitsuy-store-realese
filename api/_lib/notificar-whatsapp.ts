/**
 * STUB — Ponto de extensão para notificação via WhatsApp.
 *
 * Ainda NÃO implementado de verdade. Esta função é chamada pelo webhook
 * quando um pedido é aprovado, mas atualmente não faz nada além de logar.
 *
 * TODO: integrar Meta Cloud API (WhatsApp Business Platform) quando o
 * número dedicado da loja estiver aprovado. Ver:
 * https://developers.facebook.com/docs/whatsapp/cloud-api
 *
 * Quando implementado, esta função deve:
 * 1. Montar a mensagem de confirmação do pedido
 * 2. Chamar a API do WhatsApp Business (Meta Cloud API) com o token
 *    armazenado em variável de ambiente (ex: WHATSAPP_CLOUD_API_TOKEN)
 * 3. Tratar erros sem derrubar o fluxo do webhook (nunca deixar uma falha
 *    de notificação impedir a confirmação do pagamento)
 */

export interface NotificacaoWhatsAppParams {
  telefoneCliente: string;
  nomeCliente: string;
  nomeProduto: string;
  pedidoId: string;
  totalEmCentavos: number;
}

export async function notificarWhatsApp(
  params: NotificacaoWhatsAppParams,
): Promise<void> {
  // TODO: integrar Meta Cloud API quando número dedicado estiver aprovado
  console.log("[notificar-whatsapp] Stub chamado (não implementado):", {
    telefoneCliente: params.telefoneCliente,
    pedidoId: params.pedidoId,
  });
  return Promise.resolve();
}
