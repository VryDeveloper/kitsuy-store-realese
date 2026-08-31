/**
 * Cubagem + bin packing pra consolidar o frete de um carrinho com vários
 * produtos em um número mínimo de caixas, em vez de calcular frete "por
 * produto" (que multiplica o custo mesmo quando várias figures cabem numa
 * caixa só).
 *
 * Integrado em `api/calcular-frete.ts` (agrupa o carrinho em caixas, cota
 * cada caixa na SuperFrete, consolida por transportadora) e
 * `api/criar-preferencia.ts` (reserva múltiplos produtos atomicamente via
 * `api/_lib/estoque.ts::reservarMultiplosProdutos`).
 *
 * Segue o mesmo padrão de nomenclatura de campos já usado em
 * `api/calcular-frete.ts` (pesoEmKg, alturaEmCm, larguraEmCm, comprimentoEmCm).
 */

export interface CaixaDisponivel {
  nome: string;
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  pesoMaxKg: number;
}

// Caixas reais usadas no envio das figures (confirmado com a loja):
// item único vai na caixa pequena; a partir de 2 itens no mesmo pacote,
// vai na caixa maior. Ambas com limite de 1kg.
export const CAIXAS_DISPONIVEIS: CaixaDisponivel[] = [
  { nome: "Única", comprimentoCm: 30, larguraCm: 20, alturaCm: 20, pesoMaxKg: 1 },
  { nome: "Multi", comprimentoCm: 35, larguraCm: 27, alturaCm: 26, pesoMaxKg: 1 },
];

// Dimensões padrão da caixa de envio, usadas quando o produto ainda não tem
// essas informações cadastradas no Firestore. Valores provisórios (20x20x30cm,
// até 1kg) — ajustar por produto assim que possível.
export const DIMENSOES_PADRAO = {
  pesoEmKg: 1,
  alturaEmCm: 20,
  larguraEmCm: 20,
  comprimentoEmCm: 30,
};

const FATOR_CUBAGEM_PADRAO = 6000;

/** Peso cúbico = (C × L × A) / fator. Fator padrão dos Correios/transportadoras: 6000. */
export function calcularPesoCubado(
  comprimentoCm: number,
  larguraCm: number,
  alturaCm: number,
  fator = FATOR_CUBAGEM_PADRAO,
): number {
  return (comprimentoCm * larguraCm * alturaCm) / fator;
}

export interface ItemCarrinho {
  produtoId: string;
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
  pesoEmKg: number;
  precoEmCentavos: number;
}

export interface CaixaResultado {
  caixa: CaixaDisponivel;
  itens: ItemCarrinho[];
  pesoRealSomadoKg: number;
  pesoCubadoKg: number;
  /** max(peso real somado, peso cubado da caixa) — o que de fato é cobrado. */
  pesoCobradoKg: number;
  valorSeguradoEmCentavos: number;
}

export interface ResultadoAgrupamento {
  caixas: CaixaResultado[];
  /** Itens que sozinhos já excedem a maior caixa disponível — "frete sob consulta". */
  itensSemCaixa: ItemCarrinho[];
}

function volumeCm3(dim: {
  comprimentoCm: number;
  larguraCm: number;
  alturaCm: number;
}): number {
  return dim.comprimentoCm * dim.larguraCm * dim.alturaCm;
}

/**
 * Agrupa os itens do carrinho em caixas usando first-fit decreasing: ordena
 * do maior volume pro menor e encaixa cada item na primeira caixa aberta com
 * espaço (volume e peso) suficiente; se não couber em nenhuma, abre uma
 * caixa nova (a menor disponível que comporte o item sozinho). Não é bin
 * packing ótimo — não precisa ser, pro volume de pedidos de uma loja
 * pequena first-fit decreasing já dá um resultado bom o suficiente.
 */
export function agruparCarrinhoEmCaixas(
  itensCarrinho: ItemCarrinho[],
  caixasDisponiveis: CaixaDisponivel[] = CAIXAS_DISPONIVEIS,
): ResultadoAgrupamento {
  const itensOrdenados = [...itensCarrinho].sort(
    (a, b) => volumeCm3(b) - volumeCm3(a),
  );
  const caixasOrdenadas = [...caixasDisponiveis].sort(
    (a, b) => volumeCm3(a) - volumeCm3(b),
  );

  interface CaixaAberta {
    caixa: CaixaDisponivel;
    itens: ItemCarrinho[];
    volumeOcupadoCm3: number;
    pesoOcupadoKg: number;
  }

  const caixasAbertas: CaixaAberta[] = [];
  const itensSemCaixa: ItemCarrinho[] = [];

  for (const item of itensOrdenados) {
    const volumeItem = volumeCm3(item);

    // Menor caixa que comportaria este item sozinho (volume e peso).
    const menorCaixaSuficiente = caixasOrdenadas.find(
      (c) => volumeItem <= volumeCm3(c) && item.pesoEmKg <= c.pesoMaxKg,
    );

    if (!menorCaixaSuficiente) {
      itensSemCaixa.push(item);
      continue;
    }

    const caixaComEspaco = caixasAbertas.find(
      (aberta) =>
        aberta.volumeOcupadoCm3 + volumeItem <= volumeCm3(aberta.caixa) &&
        aberta.pesoOcupadoKg + item.pesoEmKg <= aberta.caixa.pesoMaxKg,
    );

    if (caixaComEspaco) {
      caixaComEspaco.itens.push(item);
      caixaComEspaco.volumeOcupadoCm3 += volumeItem;
      caixaComEspaco.pesoOcupadoKg += item.pesoEmKg;
      continue;
    }

    caixasAbertas.push({
      caixa: menorCaixaSuficiente,
      itens: [item],
      volumeOcupadoCm3: volumeItem,
      pesoOcupadoKg: item.pesoEmKg,
    });
  }

  const caixas: CaixaResultado[] = caixasAbertas.map(({ caixa, itens }) => {
    const pesoRealSomadoKg = itens.reduce((soma, i) => soma + i.pesoEmKg, 0);
    const pesoCubadoKg = calcularPesoCubado(
      caixa.comprimentoCm,
      caixa.larguraCm,
      caixa.alturaCm,
    );
    const valorSeguradoEmCentavos = itens.reduce(
      (soma, i) => soma + i.precoEmCentavos,
      0,
    );

    return {
      caixa,
      itens,
      pesoRealSomadoKg,
      pesoCubadoKg,
      pesoCobradoKg: Math.max(pesoRealSomadoKg, pesoCubadoKg),
      valorSeguradoEmCentavos,
    };
  });

  return { caixas, itensSemCaixa };
}

// Códigos de serviço da SuperFrete: 1 PAC, 2 SEDEX, 3 Jadlog, 31 Loggi, 33 J&T.
// Loja confirmou que consegue postar por todas essas transportadoras a partir
// do CEP de origem cadastrado. Não inclui o 17 (Mini Envios): seu limite de
// peso (0.3kg) é menor que o peso mínimo cobrado de qualquer caixa definida
// em CAIXAS_DISPONIVEIS, então nunca cotaria nada mesmo se pedido.
const SERVICOS_COTADOS = "1,2,3,31,33";

/** Payload de cotação da SuperFrete pra uma caixa consolidada (mesmo formato usado em api/calcular-frete.ts). */
export interface PayloadCotacaoSuperFrete {
  from: { postal_code: string };
  to: { postal_code: string };
  package: { height: number; width: number; length: number; weight: number };
  services: string;
  options: { insurance_value: number; use_insurance_value: boolean; receipt: boolean; own_hand: boolean };
}

export function montarPayloadCotacaoSuperFrete(
  caixaResultado: CaixaResultado,
  cepOrigem: string,
  cepDestino: string,
): PayloadCotacaoSuperFrete {
  const { caixa, pesoCobradoKg, valorSeguradoEmCentavos } = caixaResultado;

  return {
    from: { postal_code: cepOrigem },
    to: { postal_code: cepDestino },
    package: {
      height: caixa.alturaCm,
      width: caixa.larguraCm,
      length: caixa.comprimentoCm,
      weight: pesoCobradoKg,
    },
    services: SERVICOS_COTADOS,
    options: {
      insurance_value: valorSeguradoEmCentavos / 100,
      // Sem isso, a SuperFrete ignora `insurance_value` por completo e cota
      // com o seguro básico grátis da transportadora — divergindo do preço
      // real cobrado quando a etiqueta é gerada com o valor declarado do
      // produto. Documentado em https://superfrete.readme.io/reference/cotacao-de-frete.
      use_insurance_value: true,
      receipt: false,
      own_hand: false,
    },
  };
}

export interface CotacaoPorCaixa {
  transportadora: string;
  prazoEmDias: number;
  valorEmCentavos: number;
  /** Valor sem o desconto de conta da SuperFrete — usado só pra mostrar riscado ao cliente. */
  valorOriginalEmCentavos: number;
}

export interface OpcaoFreteConsolidada {
  transportadora: string;
  /** Maior prazo entre as caixas que usam essa transportadora — o pedido só chega quando a caixa mais lenta chegar. */
  prazoEmDias: number;
  /** Soma do valor de todas as caixas nessa transportadora. */
  valorEmCentavos: number;
  /** Soma do valor sem desconto de todas as caixas — usado só pra mostrar riscado ao cliente. */
  valorOriginalEmCentavos: number;
}

/**
 * Consolida as cotações retornadas pela SuperFrete pra cada caixa em uma
 * lista única de opções por transportadora, pro cliente escolher 1 opção
 * pro carrinho inteiro (não 1 por caixa). Uma transportadora só entra no
 * resultado final se cotou TODAS as caixas do agrupamento — não faz sentido
 * oferecer "PAC" pro carrinho se o PAC não tem preço pra uma das caixas
 * necessárias (o pedido não pode ser enviado por completo nesse serviço).
 */
export function consolidarCotacoesPorTransportadora(
  cotacoesPorCaixa: CotacaoPorCaixa[][],
): OpcaoFreteConsolidada[] {
  if (cotacoesPorCaixa.length === 0) return [];

  const totalCaixas = cotacoesPorCaixa.length;
  const acumulado = new Map<
    string,
    {
      caixasVistas: number;
      prazoEmDias: number;
      valorEmCentavos: number;
      valorOriginalEmCentavos: number;
    }
  >();

  for (const cotacoesDaCaixa of cotacoesPorCaixa) {
    for (const cotacao of cotacoesDaCaixa) {
      const atual = acumulado.get(cotacao.transportadora);
      if (atual) {
        atual.caixasVistas += 1;
        atual.prazoEmDias = Math.max(atual.prazoEmDias, cotacao.prazoEmDias);
        atual.valorEmCentavos += cotacao.valorEmCentavos;
        atual.valorOriginalEmCentavos += cotacao.valorOriginalEmCentavos;
      } else {
        acumulado.set(cotacao.transportadora, {
          caixasVistas: 1,
          prazoEmDias: cotacao.prazoEmDias,
          valorEmCentavos: cotacao.valorEmCentavos,
          valorOriginalEmCentavos: cotacao.valorOriginalEmCentavos,
        });
      }
    }
  }

  const opcoes: OpcaoFreteConsolidada[] = [];
  for (const [transportadora, dados] of acumulado) {
    if (dados.caixasVistas !== totalCaixas) continue; // não cotou todas as caixas — não é uma opção válida pro carrinho inteiro

    opcoes.push({
      transportadora,
      prazoEmDias: dados.prazoEmDias,
      valorEmCentavos: dados.valorEmCentavos,
      valorOriginalEmCentavos: dados.valorOriginalEmCentavos,
    });
  }

  return opcoes;
}

interface CotacaoBrutaSuperFrete {
  name: string;
  delivery_time: number;
  price: number;
  discount?: string | number;
  has_error?: boolean;
  error?: string;
}

/**
 * Confirmado com o suporte da SuperFrete: `price` já é o valor final líquido
 * (o que é debitado da carteira na emissão da etiqueta) — `discount` é só
 * informativo, pra exibição tipo "de/por". `discount` vem como string — nem
 * sempre presente dependendo da transportadora, por isso o fallback pra 0.
 */
function valorFinalEmCentavos(cotacao: Pick<CotacaoBrutaSuperFrete, "price">): number {
  return Math.round(cotacao.price * 100);
}

function valorOriginalEmCentavos(
  cotacao: Pick<CotacaoBrutaSuperFrete, "price" | "discount">,
): number {
  return Math.round((cotacao.price + (Number(cotacao.discount) || 0)) * 100);
}

/**
 * Cota cada caixa (já agrupada por `agruparCarrinhoEmCaixas`) na SuperFrete,
 * em paralelo. Descarta cotações com erro (`has_error`/`error`) — uma
 * transportadora que não cotou uma caixa simplesmente não aparece pra ela.
 * Única fonte da verdade da chamada HTTP à SuperFrete: usada tanto por
 * `api/calcular-frete.ts` (cotação exibida no checkout) quanto por
 * `api/_lib/verificar-disponibilidade-frete.ts` (revalidação pós-pagamento).
 */
export async function cotarCaixasNaSuperFrete(
  caixas: CaixaResultado[],
  cepOrigem: string,
  cepDestino: string,
): Promise<CotacaoPorCaixa[][]> {
  const token = process.env.SUPERFRETE_TOKEN;
  if (!token) {
    throw new Error("SUPERFRETE_TOKEN não configurado");
  }

  return Promise.all(
    caixas.map(async (caixaResultado) => {
      const payload = montarPayloadCotacaoSuperFrete(caixaResultado, cepOrigem, cepDestino);

      const response = await fetch("https://api.superfrete.com/api/v0/calculator", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "User-Type": "shipper",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `[frete-consolidado] Erro SuperFrete pra caixa ${caixaResultado.caixa.nome}:`,
          errorText,
        );
        return [];
      }

      const cotacoesBrutas = (await response.json()) as CotacaoBrutaSuperFrete[];

      return cotacoesBrutas
        .filter((c) => !c.has_error && !c.error)
        .map((c) => ({
          transportadora: c.name,
          prazoEmDias: c.delivery_time,
          valorEmCentavos: valorFinalEmCentavos(c),
          valorOriginalEmCentavos: valorOriginalEmCentavos(c),
        }));
    }),
  );
}

export interface ResultadoCotacaoCarrinho {
  opcoes: OpcaoFreteConsolidada[];
  /** Itens que sozinhos já excedem a maior caixa disponível — "frete sob consulta". */
  itensSemCaixa: ItemCarrinho[];
}

/**
 * Agrupa o carrinho em caixas, cota cada uma na SuperFrete e consolida o
 * resultado por transportadora — o fluxo completo de ponta a ponta usado
 * tanto na cotação do checkout quanto na revalidação pós-pagamento.
 */
export async function cotarCarrinhoNaSuperFrete(
  itens: ItemCarrinho[],
  cepDestino: string,
): Promise<ResultadoCotacaoCarrinho> {
  const cepOrigem = process.env.LOJA_CEP_ORIGEM;
  if (!cepOrigem) {
    throw new Error("LOJA_CEP_ORIGEM não configurado");
  }

  const { caixas, itensSemCaixa } = agruparCarrinhoEmCaixas(itens);
  if (caixas.length === 0) return { opcoes: [], itensSemCaixa };

  const cotacoesPorCaixa = await cotarCaixasNaSuperFrete(caixas, cepOrigem, cepDestino);

  return { opcoes: consolidarCotacoesPorTransportadora(cotacoesPorCaixa), itensSemCaixa };
}
