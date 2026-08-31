/**
 * Notificação de pedido aprovado via Telegram — rede de segurança
 * independente do Resend: se o email da loja falhar (chave inválida,
 * domínio não verificado, instabilidade do provedor), essa notificação
 * ainda chega, porque não depende do mesmo serviço nem do mesmo código de
 * envio. Chamada separadamente do fluxo de email em api/webhook.ts, cada
 * uma no seu próprio try/catch — uma falha aqui nunca deve derrubar a
 * outra nem impedir a confirmação do pagamento.
 *
 * Setup (ver SETUP_CHECKOUT.md): criar um bot com o @BotFather, pegar o
 * token e o chat_id, e configurar TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID.
 */

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

export interface NotificacaoPedidoTelegram {
  pedidoId: string;
  nomeCliente: string;
  telefoneCliente: string;
  produtos: { nome: string; precoEmCentavos: number }[];
  totalEmCentavos: number;
  transportadora: string;
  prazoEmDias: number;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
}

export async function notificarPedidoTelegram(
  dados: NotificacaoPedidoTelegram,
): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn(
      "[notificar-telegram] TELEGRAM_BOT_TOKEN/TELEGRAM_CHAT_ID não configurados — pulando notificação",
    );
    return;
  }

  const listaProdutos = dados.produtos
    .map((p) => `• ${p.nome} — ${formatarMoeda(p.precoEmCentavos)}`)
    .join("\n");

  const enderecoFormatado =
    `${dados.endereco.logradouro}, ${dados.endereco.numero}` +
    (dados.endereco.complemento ? ` - ${dados.endereco.complemento}` : "") +
    `, ${dados.endereco.bairro}, ${dados.endereco.cidade}/${dados.endereco.uf} - CEP ${dados.endereco.cep}`;

  const texto =
    `🎉 Novo pedido pago!\n\n` +
    `Pedido: ${dados.pedidoId}\n` +
    `Cliente: ${dados.nomeCliente}\n` +
    `Telefone: ${dados.telefoneCliente}\n\n` +
    `${listaProdutos}\n\n` +
    `Total: ${formatarMoeda(dados.totalEmCentavos)}\n` +
    `Frete: ${dados.transportadora} (${dados.prazoEmDias} dias úteis)\n\n` +
    `📦 Endereço de entrega:\n${enderecoFormatado}`;

  // Sem parse_mode — texto puro, sem risco de quebrar a mensagem com
  // caracteres especiais de Markdown/HTML vindos de nome de produto/cliente.
  const response = await fetch(
    `https://api.telegram.org/bot${token}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: texto }),
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Telegram recusou a notificação: ${errorText}`);
  }
}
