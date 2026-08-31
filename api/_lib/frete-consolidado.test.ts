import { describe, it, expect } from "vitest";
import {
  calcularPesoCubado,
  agruparCarrinhoEmCaixas,
  montarPayloadCotacaoSuperFrete,
  consolidarCotacoesPorTransportadora,
  type ItemCarrinho,
  type CaixaDisponivel,
  type CotacaoPorCaixa,
} from "./frete-consolidado.js";

function item(overrides: Partial<ItemCarrinho> = {}): ItemCarrinho {
  return {
    produtoId: "produto-teste",
    comprimentoCm: 15,
    larguraCm: 15,
    alturaCm: 15,
    pesoEmKg: 0.5,
    precoEmCentavos: 10000,
    ...overrides,
  };
}

describe("calcularPesoCubado", () => {
  it("calcula (C × L × A) / 6000 por padrão", () => {
    expect(calcularPesoCubado(20, 20, 20)).toBeCloseTo(8000 / 6000);
  });

  it("aceita um fator customizado", () => {
    expect(calcularPesoCubado(20, 20, 20, 5000)).toBeCloseTo(8000 / 5000);
  });
});

describe("agruparCarrinhoEmCaixas", () => {
  it("carrinho com 1 único item vai pra menor caixa que comporta ele (sem regressão do fluxo atual)", () => {
    const itens = [item({ comprimentoCm: 18, larguraCm: 18, alturaCm: 18, pesoEmKg: 1 })];

    const resultado = agruparCarrinhoEmCaixas(itens);

    expect(resultado.itensSemCaixa).toHaveLength(0);
    expect(resultado.caixas).toHaveLength(1);
    expect(resultado.caixas[0].caixa.nome).toBe("Única");
    expect(resultado.caixas[0].itens).toEqual(itens);
  });

  it("agrupa vários itens pequenos numa única caixa quando cabem juntos", () => {
    const itens = [
      item({ produtoId: "a", comprimentoCm: 10, larguraCm: 10, alturaCm: 10, pesoEmKg: 0.3 }),
      item({ produtoId: "b", comprimentoCm: 10, larguraCm: 10, alturaCm: 10, pesoEmKg: 0.3 }),
      item({ produtoId: "c", comprimentoCm: 10, larguraCm: 10, alturaCm: 10, pesoEmKg: 0.3 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens);

    expect(resultado.itensSemCaixa).toHaveLength(0);
    expect(resultado.caixas).toHaveLength(1);
    expect(resultado.caixas[0].itens).toHaveLength(3);
  });

  it("abre uma segunda caixa quando a mistura de itens grandes e pequenos não cabe numa só", () => {
    const itens = [
      item({ produtoId: "grande-1", comprimentoCm: 25, larguraCm: 20, alturaCm: 20, pesoEmKg: 0.5 }),
      item({ produtoId: "grande-2", comprimentoCm: 25, larguraCm: 20, alturaCm: 20, pesoEmKg: 0.5 }),
      item({ produtoId: "pequeno", comprimentoCm: 8, larguraCm: 8, alturaCm: 8, pesoEmKg: 0.05 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens);

    expect(resultado.itensSemCaixa).toHaveLength(0);
    expect(resultado.caixas.length).toBeGreaterThanOrEqual(2);

    const totalItensNasCaixas = resultado.caixas.reduce(
      (soma, c) => soma + c.itens.length,
      0,
    );
    expect(totalItensNasCaixas).toBe(3);
  });

  it("marca como 'sem caixa' (frete sob consulta) um item maior que a maior caixa disponível", () => {
    const itens = [
      item({ comprimentoCm: 100, larguraCm: 100, alturaCm: 100, pesoEmKg: 1 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens);

    expect(resultado.caixas).toHaveLength(0);
    expect(resultado.itensSemCaixa).toHaveLength(1);
  });

  it("marca como 'sem caixa' um item cujo peso real excede o peso máximo de todas as caixas, mesmo cabendo no volume", () => {
    const itens = [
      item({ comprimentoCm: 5, larguraCm: 5, alturaCm: 5, pesoEmKg: 999 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens);

    expect(resultado.caixas).toHaveLength(0);
    expect(resultado.itensSemCaixa).toHaveLength(1);
  });

  it("usa o peso real (não o cubado) quando o produto é denso — peso real alto, volume baixo", () => {
    // Caixa sintética (as caixas reais de produção têm limite de 1kg, o que
    // torna esse cenário impossível nelas — o peso cubado de ambas já passa
    // de 1kg. Usa uma caixa de teste maior só pra validar a lógica do
    // Math.max(pesoReal, pesoCubado) isoladamente.
    const caixaTeste: CaixaDisponivel = {
      nome: "Teste",
      comprimentoCm: 10,
      larguraCm: 10,
      alturaCm: 10,
      pesoMaxKg: 5,
    };
    const itens = [
      item({ comprimentoCm: 10, larguraCm: 10, alturaCm: 10, pesoEmKg: 4.5 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens, [caixaTeste]);

    const pesoCubadoDaCaixaTeste = calcularPesoCubado(
      caixaTeste.comprimentoCm,
      caixaTeste.larguraCm,
      caixaTeste.alturaCm,
    );

    expect(resultado.caixas).toHaveLength(1);
    expect(resultado.caixas[0].pesoRealSomadoKg).toBe(4.5);
    expect(pesoCubadoDaCaixaTeste).toBeLessThan(4.5);
    expect(resultado.caixas[0].pesoCobradoKg).toBe(4.5); // prevalece o real
  });

  it("usa o peso cubado quando ele é maior que o peso real somado (caixa grande e leve)", () => {
    const itens = [
      item({ comprimentoCm: 18, larguraCm: 18, alturaCm: 18, pesoEmKg: 0.1 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens);
    const [caixaResultado] = resultado.caixas;

    expect(caixaResultado.pesoCobradoKg).toBe(caixaResultado.pesoCubadoKg);
    expect(caixaResultado.pesoCubadoKg).toBeGreaterThan(caixaResultado.pesoRealSomadoKg);
  });

  it("soma o valor dos itens de cada caixa pro valor segurado", () => {
    const itens = [
      item({ produtoId: "a", precoEmCentavos: 5000 }),
      item({ produtoId: "b", precoEmCentavos: 7000 }),
    ];

    const resultado = agruparCarrinhoEmCaixas(itens);

    expect(resultado.caixas).toHaveLength(1);
    expect(resultado.caixas[0].valorSeguradoEmCentavos).toBe(12000);
  });
});

describe("montarPayloadCotacaoSuperFrete", () => {
  it("monta o payload no mesmo formato usado hoje em api/calcular-frete.ts", () => {
    const itens = [item({ precoEmCentavos: 26000 })];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    const payload = montarPayloadCotacaoSuperFrete(caixas[0], "40296330", "01310100");

    expect(payload).toEqual({
      from: { postal_code: "40296330" },
      to: { postal_code: "01310100" },
      package: {
        height: caixas[0].caixa.alturaCm,
        width: caixas[0].caixa.larguraCm,
        length: caixas[0].caixa.comprimentoCm,
        weight: caixas[0].pesoCobradoKg,
      },
      services: "1,2,3,31,33",
      options: {
        insurance_value: 260,
        use_insurance_value: true,
        receipt: false,
        own_hand: false,
      },
    });
  });
});

function cotacao(overrides: Partial<CotacaoPorCaixa> = {}): CotacaoPorCaixa {
  return {
    transportadora: "PAC",
    prazoEmDias: 5,
    valorEmCentavos: 2000,
    valorOriginalEmCentavos: 2500,
    ...overrides,
  };
}

describe("consolidarCotacoesPorTransportadora", () => {
  it("carrinho de 1 caixa só — mesmo resultado do fluxo atual (sem regressão)", () => {
    const cotacoesPorCaixa = [
      [cotacao({ transportadora: "PAC", valorEmCentavos: 2228, prazoEmDias: 5 }),
       cotacao({ transportadora: "SEDEX", valorEmCentavos: 1432, prazoEmDias: 1 })],
    ];

    const opcoes = consolidarCotacoesPorTransportadora(cotacoesPorCaixa);

    expect(opcoes).toEqual([
      { transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2228, valorOriginalEmCentavos: 2500 },
      { transportadora: "SEDEX", prazoEmDias: 1, valorEmCentavos: 1432, valorOriginalEmCentavos: 2500 },
    ]);
  });

  it("soma o valor e usa o maior prazo quando uma transportadora cotou as duas caixas", () => {
    const cotacoesPorCaixa = [
      [cotacao({ transportadora: "PAC", valorEmCentavos: 2000, prazoEmDias: 5 })],
      [cotacao({ transportadora: "PAC", valorEmCentavos: 1500, prazoEmDias: 7 })],
    ];

    const opcoes = consolidarCotacoesPorTransportadora(cotacoesPorCaixa);

    expect(opcoes).toEqual([
      { transportadora: "PAC", prazoEmDias: 7, valorEmCentavos: 3500, valorOriginalEmCentavos: 5000 },
    ]);
  });

  it("exclui a transportadora que não cotou todas as caixas", () => {
    const cotacoesPorCaixa = [
      [
        cotacao({ transportadora: "PAC", valorEmCentavos: 2000 }),
        cotacao({ transportadora: "SEDEX", valorEmCentavos: 3000 }),
      ],
      [cotacao({ transportadora: "PAC", valorEmCentavos: 1500 })], // SEDEX não cotou esta caixa
    ];

    const opcoes = consolidarCotacoesPorTransportadora(cotacoesPorCaixa);

    expect(opcoes).toEqual([
      { transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 3500, valorOriginalEmCentavos: 5000 },
    ]);
  });

  it("retorna lista vazia se não houver nenhuma caixa", () => {
    expect(consolidarCotacoesPorTransportadora([])).toEqual([]);
  });
});
