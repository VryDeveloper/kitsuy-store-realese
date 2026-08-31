/**
 * Templates de email em HTML inline, sem dependência de template engine.
 * Mantém a identidade visual da loja (cor primária #EA3E83, fonte Fredoka).
 *
 * Todo campo vindo de `cliente`/`endereco` (dados fornecidos pelo
 * comprador) passa por `escapeHtml()` antes de entrar no HTML — ver
 * comentário em `escape-html.ts` sobre por que isso é necessário mesmo
 * já existindo validação de formato em `_lib/validar-checkout.ts`.
 */
import { escapeHtml } from "./escape-html.js";
import type { ResultadoVerificacaoFrete } from "./verificar-disponibilidade-frete.js";

const COR_PRIMARIA = "#EA3E83";

// Mesmo número usado no botão de WhatsApp em todo o site (ver src/pages/FAQs.tsx e outros).
const WHATSAPP_LOJA = "5571997020168";
const WHATSAPP_LOJA_FORMATADO = "+55 71 99702-0168";

function linkWhatsAppLoja(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_LOJA}?text=${encodeURIComponent(mensagem)}`;
}

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/** Uma linha de tabela por produto (com miniatura, quando o produto tem imagem) — usado nos dois templates. */
function linhasProdutos(produtos: ProdutoEmailPedido[]): string {
  return produtos
    .map((p) => {
      const miniatura = p.imagem
        ? `<img src="${escapeHtml(p.imagem)}" alt="${escapeHtml(p.nome)}" width="48" height="48" style="width:48px;height:48px;object-fit:cover;border-radius:8px;display:block;" />`
        : "";

      return `
      <tr>
        <td style="padding:8px 8px 8px 0;width:48px;">${miniatura}</td>
        <td style="padding:8px 0;color:#777;">${escapeHtml(p.nome)}</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;">${formatarMoeda(p.precoEmCentavos)}</td>
      </tr>`;
    })
    .join("");
}

function tituloProduto(produtos: ProdutoEmailPedido[]): string {
  if (produtos.length <= 1) {
    return produtos[0]?.nome ?? "Produto";
  }
  return `${produtos.length} itens`;
}

function wrapper(conteudo: string): string {
  return `
  <div style="background-color:#f7f7f7;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
      <div style="background:${COR_PRIMARIA};padding:24px;text-align:center;">
        <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:1px;">KITSUY STORE</span>
      </div>
      <div style="padding:28px 24px;color:#333333;">
        ${conteudo}
      </div>
      <div style="padding:16px 24px;background:#fafafa;text-align:center;">
        <p style="font-size:12px;color:#999999;margin:0;">© ${new Date().getFullYear()} Kitsuy Store. Todos os direitos reservados.</p>
      </div>
    </div>
  </div>`;
}

interface ProdutoEmailPedido {
  nome: string;
  imagem?: string;
  precoEmCentavos: number;
}

interface DadosEmailPedido {
  pedidoId: string;
  produtos: ProdutoEmailPedido[];
  totalEmCentavos: number;
  transportadora: string;
  prazoEmDias: number;
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
  };
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
  };
  siteUrl: string;
}

/** Email enviado para a loja (owner) quando um pedido é aprovado. */
export function templateEmailLoja(dados: DadosEmailPedido): {
  subject: string;
  html: string;
} {
  const enderecoFormatado = `${escapeHtml(dados.endereco.logradouro)}, ${escapeHtml(dados.endereco.numero)}${
    dados.endereco.complemento
      ? ` - ${escapeHtml(dados.endereco.complemento)}`
      : ""
  }, ${escapeHtml(dados.endereco.bairro)}, ${escapeHtml(dados.endereco.cidade)}/${escapeHtml(dados.endereco.uf)} - CEP ${escapeHtml(dados.endereco.cep)}`;

  const html = wrapper(`
    <h2 style="color:${COR_PRIMARIA};margin-top:0;">🎉 Novo pedido pago!</h2>
    <p>Um pedido foi aprovado e precisa ser preparado para envio.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Pedido</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;">${escapeHtml(dados.pedidoId)}</td>
      </tr>
      <tr>
        <td colspan="3" style="padding:8px 0;color:#777;">Produto(s)</td>
      </tr>
      ${linhasProdutos(dados.produtos)}
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Total</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;color:${COR_PRIMARIA};">${formatarMoeda(dados.totalEmCentavos)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Frete</td>
        <td style="padding:8px 0;text-align:right;">${escapeHtml(dados.transportadora)} (${dados.prazoEmDias} dias úteis)</td>
      </tr>
    </table>

    <h3 style="margin-bottom:6px;">Dados do cliente</h3>
    <p style="margin:2px 0;">${escapeHtml(dados.cliente.nome)}</p>
    <p style="margin:2px 0;">${escapeHtml(dados.cliente.email)}</p>
    <p style="margin:2px 0;">${escapeHtml(dados.cliente.telefone)}</p>
    <p style="margin:2px 0;">CPF: ${escapeHtml(dados.cliente.cpf)}</p>

    <h3 style="margin-bottom:6px;">Endereço de entrega</h3>
    <p style="margin:2px 0;">${enderecoFormatado}</p>
  `);

  return {
    subject: `🎉 Novo pedido pago — ${tituloProduto(dados.produtos)}`,
    html,
  };
}

/** Email enviado para o cliente quando o pedido é aprovado. */
export function templateEmailCliente(dados: DadosEmailPedido): {
  subject: string;
  html: string;
} {
  const linkPedido = `${dados.siteUrl}/pedido-confirmado?id=${dados.pedidoId}`;

  const html = wrapper(`
    <h2 style="color:${COR_PRIMARIA};margin-top:0;">Compra confirmada! 🧡</h2>
    <p>Olá, ${escapeHtml(dados.cliente.nome)}! Recebemos seu pagamento e já estamos preparando seu pedido.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td colspan="3" style="padding:8px 0;color:#777;">Produto(s)</td>
      </tr>
      ${linhasProdutos(dados.produtos)}
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Total pago</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;color:${COR_PRIMARIA};">${formatarMoeda(dados.totalEmCentavos)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Envio</td>
        <td style="padding:8px 0;text-align:right;">${escapeHtml(dados.transportadora)} — até ${dados.prazoEmDias} dias úteis</td>
      </tr>
    </table>

    <p>Assim que seu pedido for postado, avisaremos você novamente.</p>

    <div style="text-align:center;margin:28px 0;">
      <a href="${linkPedido}" style="background:${COR_PRIMARIA};color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-weight:bold;display:inline-block;">
        Ver detalhes do pedido
      </a>
    </div>

    <p style="font-size:13px;color:#999;">Se tiver qualquer dúvida, é só responder este email ou chamar no WhatsApp da loja.</p>

    <div style="margin-top:20px;padding:14px 16px;background:#fdf1f6;border-radius:12px;">
      <p style="margin:0;font-size:13px;color:#666;">
        Não recebeu alguma atualização sobre este pedido ou algo parece errado?
        Fala com a gente no WhatsApp:
        <a href="${linkWhatsAppLoja(`Olá! Fiz o pedido ${dados.pedidoId} e preciso de ajuda.`)}" style="color:${COR_PRIMARIA};font-weight:bold;text-decoration:none;">
          ${WHATSAPP_LOJA_FORMATADO}
        </a>
      </p>
    </div>
  `);

  return {
    subject: "🧡🦊 Seu pedido na Kitsuy Store foi confirmado!",
    html,
  };
}

/**
 * Email enviado para a loja (owner) revalidando se a transportadora
 * escolhida no checkout ainda está disponível pra emissão da etiqueta —
 * ver `_lib/verificar-disponibilidade-frete.ts` sobre por que isso não é
 * uma garantia, só o melhor sinal disponível antes da emissão manual.
 */
export function templateEmailVerificacaoFrete(dados: {
  pedidoId: string;
  resultado: ResultadoVerificacaoFrete;
}): { subject: string; html: string } {
  const { pedidoId, resultado } = dados;
  const pedidoIdSeguro = escapeHtml(pedidoId);

  if (resultado.status === "confirmado") {
    const html = wrapper(`
      <h2 style="color:${COR_PRIMARIA};margin-top:0;">✅ Frete confirmado</h2>
      <p>Revalidamos a cotação do pedido <strong>${pedidoIdSeguro}</strong> — a transportadora escolhida pelo cliente (<strong>${escapeHtml(resultado.transportadoraEscolhida)}</strong>) continua disponível. Pode emitir a etiqueta normalmente.</p>
    `);
    return { subject: `✅ Frete OK — pedido ${pedidoId}`, html };
  }

  if (resultado.status === "alternativa") {
    const listaOpcoes = resultado.opcoesDisponiveis
      .map(
        (o) =>
          `<li>${escapeHtml(o.transportadora)} — ${formatarMoeda(o.valorEmCentavos)} (${o.prazoEmDias} dias)</li>`,
      )
      .join("");

    const html = wrapper(`
      <h2 style="color:${COR_PRIMARIA};margin-top:0;">⚠️ Confirme o frete antes de emitir</h2>
      <p>No pedido <strong>${pedidoIdSeguro}</strong>, o cliente escolheu <strong>${escapeHtml(resultado.transportadoraEscolhida)}</strong>, mas ao revalidar agora essa opção não voltou na cotação.</p>
      <p><strong>Alternativa recomendada:</strong> ${escapeHtml(resultado.recomendada.transportadora)} — ${formatarMoeda(resultado.recomendada.valorEmCentavos)} (${resultado.recomendada.prazoEmDias} dias).</p>
      <p>Outras opções disponíveis agora:</p>
      <ul style="padding-left:20px;">${listaOpcoes}</ul>
      <p style="font-size:13px;color:#999;">Tente emitir pela transportadora escolhida primeiro — pode ter sido instabilidade momentânea. Se falhar, use a alternativa acima.</p>
    `);
    return { subject: `⚠️ Confirme o frete — pedido ${pedidoId}`, html };
  }

  const html = wrapper(`
    <h2 style="color:${COR_PRIMARIA};margin-top:0;">🚨 Nenhuma transportadora disponível</h2>
    <p>No pedido <strong>${pedidoIdSeguro}</strong>, revalidamos o frete e nenhuma transportadora retornou cotação válida agora (escolhida: ${escapeHtml(resultado.transportadoraEscolhida)}). Verifique manualmente no painel da SuperFrete antes de prometer prazo ao cliente.</p>
  `);
  return { subject: `🚨 Frete indisponível — pedido ${pedidoId}`, html };
}
