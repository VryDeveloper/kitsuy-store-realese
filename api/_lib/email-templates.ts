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

const COR_PRIMARIA = "#EA3E83";

function formatarMoeda(centavos: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(centavos / 100);
}

/** Uma linha de tabela por produto — usado nos dois templates. */
function linhasProdutos(produtos: ProdutoEmailPedido[]): string {
  return produtos
    .map(
      (p) => `
      <tr>
        <td style="padding:8px 0;color:#777;">${escapeHtml(p.nome)}</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;">${formatarMoeda(p.precoEmCentavos)}</td>
      </tr>`,
    )
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
    dados.endereco.complemento ? ` - ${escapeHtml(dados.endereco.complemento)}` : ""
  }, ${escapeHtml(dados.endereco.bairro)}, ${escapeHtml(dados.endereco.cidade)}/${escapeHtml(dados.endereco.uf)} - CEP ${escapeHtml(dados.endereco.cep)}`;

  const html = wrapper(`
    <h2 style="color:${COR_PRIMARIA};margin-top:0;">🎉 Novo pedido pago!</h2>
    <p>Um pedido foi aprovado e precisa ser preparado para envio.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td style="padding:8px 0;color:#777;">Pedido</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;">${escapeHtml(dados.pedidoId)}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Produto(s)</td>
      </tr>
      ${linhasProdutos(dados.produtos)}
      <tr>
        <td style="padding:8px 0;color:#777;">Total</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;color:${COR_PRIMARIA};">${formatarMoeda(dados.totalEmCentavos)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#777;">Frete</td>
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
    <h2 style="color:${COR_PRIMARIA};margin-top:0;">Compra confirmada! 🎊</h2>
    <p>Olá, ${escapeHtml(dados.cliente.nome)}! Recebemos seu pagamento e já estamos preparando seu pedido.</p>

    <table style="width:100%;border-collapse:collapse;margin:20px 0;">
      <tr>
        <td colspan="2" style="padding:8px 0;color:#777;">Produto(s)</td>
      </tr>
      ${linhasProdutos(dados.produtos)}
      <tr>
        <td style="padding:8px 0;color:#777;">Total pago</td>
        <td style="padding:8px 0;font-weight:bold;text-align:right;color:${COR_PRIMARIA};">${formatarMoeda(dados.totalEmCentavos)}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#777;">Envio</td>
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
  `);

  return {
    subject: "🎊 Seu pedido na Kitsuy Store foi confirmado!",
    html,
  };
}
