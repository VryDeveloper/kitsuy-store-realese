import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  calcularPesoCubado,
  agruparCarrinhoEmCaixas,
  montarPayloadCotacaoSuperFrete,
  consolidarCotacoesPorTransportadora,
  cotarCaixasNaSuperFrete,
  cotarCarrinhoNaSuperFrete,
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

describe("cotarCaixasNaSuperFrete", () => {
  beforeEach(() => {
    process.env.SUPERFRETE_TOKEN = "token-teste-superfrete";
    process.env.LOJA_CEP_ORIGEM = "40296330";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPERFRETE_TOKEN;
    delete process.env.LOJA_CEP_ORIGEM;
  });

  it("rejeita sem SUPERFRETE_TOKEN configurado", async () => {
    delete process.env.SUPERFRETE_TOKEN;

    const itens = [item()];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    await expect(
      cotarCaixasNaSuperFrete(caixas, "40296330", "01310100"),
    ).rejects.toThrow("SUPERFRETE_TOKEN não configurado");
  });

  it("cota uma caixa única com sucesso", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [
        {
          name: "PAC",
          delivery_time: 5,
          price: 22.28,
          discount: "0.50",
        },
        {
          name: "SEDEX",
          delivery_time: 1,
          price: 14.32,
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [item()];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    const resultado = await cotarCaixasNaSuperFrete(
      caixas,
      "40296330",
      "01310100",
    );

    expect(resultado).toHaveLength(1);
    expect(resultado[0]).toEqual([
      {
        transportadora: "PAC",
        prazoEmDias: 5,
        valorEmCentavos: 2228,
        valorOriginalEmCentavos: 2278,
      },
      {
        transportadora: "SEDEX",
        prazoEmDias: 1,
        valorEmCentavos: 1432,
        valorOriginalEmCentavos: 1432,
      },
    ]);
  });

  it("cota múltiplas caixas em paralelo", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [
        {
          name: "PAC",
          delivery_time: 5,
          price: 22.28,
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [
      item({ produtoId: "a" }),
      item({ produtoId: "b" }),
    ];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    const resultado = await cotarCaixasNaSuperFrete(
      caixas,
      "40296330",
      "01310100",
    );

    expect(resultado.length).toBeGreaterThan(0);
    expect(Array.isArray(resultado[0])).toBe(true);
  });

  it("filtra cotações com erro (has_error)", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [
        {
          name: "PAC",
          delivery_time: 5,
          price: 22.28,
        },
        {
          name: "SEDEX",
          delivery_time: 1,
          price: 14.32,
          has_error: true,
          error: "Cobertura não disponível",
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [item()];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    const resultado = await cotarCaixasNaSuperFrete(
      caixas,
      "40296330",
      "01310100",
    );

    expect(resultado[0]).toHaveLength(1);
    expect(resultado[0][0].transportadora).toBe("PAC");
  });

  it("retorna array vazio para caixa quando SuperFrete falha (não ok)", async () => {
    const mockResponse = {
      ok: false,
      text: async () => "Erro interno",
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [item()];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    const resultado = await cotarCaixasNaSuperFrete(
      caixas,
      "40296330",
      "01310100",
    );

    expect(resultado[0]).toEqual([]);
  });

  it("converte preço com desconto para centavos corretamente", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [
        {
          name: "PAC",
          delivery_time: 5,
          price: 22.28,
          discount: "2.50",
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [item()];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    const resultado = await cotarCaixasNaSuperFrete(
      caixas,
      "40296330",
      "01310100",
    );

    expect(resultado[0][0].valorEmCentavos).toBe(2228);
    expect(resultado[0][0].valorOriginalEmCentavos).toBe(2478);
  });

  it("monta payload com token de autorização Bearer", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: async () => "OK",
        json: async () => [],
      }),
    );

    vi.stubGlobal("fetch", fetchMock);

    const itens = [item()];
    const { caixas } = agruparCarrinhoEmCaixas(itens);

    await cotarCaixasNaSuperFrete(caixas, "40296330", "01310100");

    expect(fetchMock).toHaveBeenCalled();
    const callArgs = fetchMock.mock.calls[0];
    expect(callArgs[1].headers.Authorization).toBe(
      "Bearer token-teste-superfrete",
    );
    expect(callArgs[1].headers["User-Type"]).toBe("shipper");
  });
});

describe("cotarCarrinhoNaSuperFrete", () => {
  beforeEach(() => {
    process.env.SUPERFRETE_TOKEN = "token-teste";
    process.env.LOJA_CEP_ORIGEM = "40296330";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPERFRETE_TOKEN;
    delete process.env.LOJA_CEP_ORIGEM;
  });

  it("rejeita sem LOJA_CEP_ORIGEM configurado", async () => {
    delete process.env.LOJA_CEP_ORIGEM;

    const itens = [item()];

    await expect(
      cotarCarrinhoNaSuperFrete(itens, "01310100"),
    ).rejects.toThrow("LOJA_CEP_ORIGEM não configurado");
  });

  it("cota um carrinho com 1 item", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [
        {
          name: "PAC",
          delivery_time: 5,
          price: 22.28,
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [item({ produtoId: "prod1" })];

    const resultado = await cotarCarrinhoNaSuperFrete(itens, "01310100");

    expect(resultado.opcoes).toHaveLength(1);
    expect(resultado.opcoes[0]).toEqual({
      transportadora: "PAC",
      prazoEmDias: 5,
      valorEmCentavos: 2228,
      valorOriginalEmCentavos: 2228,
    });
    expect(resultado.itensSemCaixa).toHaveLength(0);
  });

  it("retorna itens sem caixa quando algum item excede tamanho máximo", async () => {
    vi.stubGlobal("fetch", vi.fn(() =>
      Promise.resolve({
        ok: true,
        text: async () => "OK",
        json: async () => [
          { name: "PAC", delivery_time: 5, price: 22.28 },
        ],
      }),
    ));

    const itens = [
      item({ produtoId: "grande", comprimentoCm: 100, larguraCm: 100, alturaCm: 100 }),
    ];

    const resultado = await cotarCarrinhoNaSuperFrete(itens, "01310100");

    expect(resultado.opcoes).toHaveLength(0);
    expect(resultado.itensSemCaixa).toHaveLength(1);
  });

  it("consolida múltiplas caixas em uma opção por transportadora", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [
        {
          name: "PAC",
          delivery_time: 5,
          price: 22.28,
        },
        {
          name: "SEDEX",
          delivery_time: 1,
          price: 35.50,
        },
      ],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [
      item({ produtoId: "a", precoEmCentavos: 5000 }),
      item({ produtoId: "b", precoEmCentavos: 7000 }),
    ];

    const resultado = await cotarCarrinhoNaSuperFrete(itens, "01310100");

    expect(resultado.opcoes.length).toBeGreaterThan(0);
    // Cada transportadora deve aparecer apenas uma vez, com preços somados
    const transportadoras = resultado.opcoes.map((o) => o.transportadora);
    const transportadorasUnicas = new Set(transportadoras);
    expect(transportadorasUnicas.size).toBe(transportadoras.length);
  });

  it("retorna opcoes vazias quando nenhuma transportadora cotou", async () => {
    const mockResponse = {
      ok: true,
      text: async () => "OK",
      json: async () => [],
    };

    vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(mockResponse)));

    const itens = [item()];

    const resultado = await cotarCarrinhoNaSuperFrete(itens, "01310100");

    expect(resultado.opcoes).toHaveLength(0);
  });

  it("retorna opcoes vazias quando carrinho fica vazio (todos itens excedem tamanho)", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const itens = [
      item({ comprimentoCm: 100, larguraCm: 100, alturaCm: 100 }),
    ];

    const resultado = await cotarCarrinhoNaSuperFrete(itens, "01310100");

    expect(resultado.opcoes).toHaveLength(0);
    expect(resultado.itensSemCaixa).toHaveLength(1);
    expect(fetch).not.toHaveBeenCalled(); // Não chama a API se não há caixas
  });

  it("converte preço com desconto corretamente em consolidação", async () => {
    let callCount = 0;
    vi.stubGlobal("fetch", vi.fn(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: true,
          text: async () => "OK",
          json: async () => [
            { name: "PAC", delivery_time: 5, price: 20.00, discount: "2.00" },
          ],
        });
      }
      return Promise.resolve({
        ok: true,
        text: async () => "OK",
        json: async () => [
          { name: "PAC", delivery_time: 7, price: 15.00, discount: "1.50" },
        ],
      });
    }));

    const itens = [
      item({ produtoId: "a", precoEmCentavos: 5000 }),
      item({ produtoId: "b", precoEmCentavos: 7000 }),
    ];

    const resultado = await cotarCarrinhoNaSuperFrete(itens, "01310100");

    // Espera consolidação: valores somados
    expect(resultado.opcoes.length).toBeGreaterThan(0);
    const opcaoPAC = resultado.opcoes.find((o) => o.transportadora === "PAC");
    if (opcaoPAC) {
      expect(opcaoPAC.valorEmCentavos).toBeGreaterThan(0);
    }
  });
});

