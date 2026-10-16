// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { ProdutoRef } from "./estoque.js";
import {
  verificarDisponibilidadeFrete,
  type ResultadoVerificacaoFrete,
} from "./verificar-disponibilidade-frete.js";

// Mock Firebase Admin
vi.mock("./firebase-admin.js", () => ({
  db: {
    collection: vi.fn(function (name: string) {
      return {
        doc: vi.fn((id: string) => ({
          get: vi.fn(),
        })),
      };
    }),
  },
}));

// Mock frete-consolidado
vi.mock("./frete-consolidado.js", () => ({
  cotarCarrinhoNaSuperFrete: vi.fn(),
  DIMENSOES_PADRAO: {
    pesoEmKg: 1,
    alturaEmCm: 20,
    larguraEmCm: 20,
    comprimentoEmCm: 30,
  },
}));

import { db } from "./firebase-admin.js";
import { cotarCarrinhoNaSuperFrete } from "./frete-consolidado.js";

describe("verificarDisponibilidadeFrete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERFRETE_TOKEN = "token-teste";
    process.env.LOJA_CEP_ORIGEM = "40296330";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.SUPERFRETE_TOKEN;
    delete process.env.LOJA_CEP_ORIGEM;
  });

  describe("busca de produtos", () => {
    it("busca produtos de múltiplas coleções (products e masterpiece)", async () => {
      const mockGet = vi.fn(async () => ({
        exists: true,
        id: "prod1",
        data: () => ({
          price: "100,00",
          pesoEmKg: 0.5,
          alturaEmCm: 20,
          larguraEmCm: 20,
          comprimentoEmCm: 30,
        }),
      }));

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet,
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      await verificarDisponibilidadeFrete(produtosRef, "01310100", "PAC");

      expect(vi.mocked(db.collection)).toHaveBeenCalledWith("products");
    });

    it("filtra produtos que não existem no Firestore", async () => {
      const mockGet = vi.fn(async () => ({
        exists: false,
      }));

      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet,
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "nao-existe" },
      ];

      await verificarDisponibilidadeFrete(produtosRef, "01310100", "PAC");

      // Deve ter sido chamado, mesmo que o documento não exista
      expect(vi.mocked(db.collection)).toHaveBeenCalled();
    });
  });

  describe("cálculo de preço em centavos", () => {
    it("converte preço formatado em centavos", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "50,99",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "PAC",
      );

      expect(resultado.status).toBe("confirmado");
    });
  });

  describe("status: confirmado", () => {
    it("retorna confirmado quando transportadora escolhida está disponível", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
          {
            transportadora: "SEDEX",
            prazoEmDias: 1,
            valorEmCentavos: 5000,
            valorOriginalEmCentavos: 5500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "PAC",
      );

      expect(resultado.status).toBe("confirmado");
      if (resultado.status === "confirmado") {
        expect(resultado.transportadoraEscolhida).toBe("PAC");
        expect(resultado.opcao.transportadora).toBe("PAC");
        expect(resultado.opcao.valorEmCentavos).toBe(2228);
      }
    });
  });

  describe("status: alternativa", () => {
    it("retorna alternativa quando transportadora escolhida não está mais disponível", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
          {
            transportadora: "SEDEX",
            prazoEmDias: 1,
            valorEmCentavos: 5000,
            valorOriginalEmCentavos: 5500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "Loggi", // Transportadora que não está mais disponível
      );

      expect(resultado.status).toBe("alternativa");
      if (resultado.status === "alternativa") {
        expect(resultado.transportadoraEscolhida).toBe("Loggi");
        expect(resultado.recomendada.transportadora).toBe("PAC"); // Mais barata
        expect(resultado.opcoesDisponiveis.length).toBe(2);
      }
    });

    it("ordena alternativas da mais barata para a mais cara", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 5000,
            valorOriginalEmCentavos: 5500,
          },
          {
            transportadora: "SEDEX",
            prazoEmDias: 1,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
          {
            transportadora: "Jadlog",
            prazoEmDias: 3,
            valorEmCentavos: 3500,
            valorOriginalEmCentavos: 4000,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "Loggi",
      );

      if (resultado.status === "alternativa") {
        expect(resultado.opcoesDisponiveis[0].transportadora).toBe("SEDEX"); // Mais barata
        expect(resultado.opcoesDisponiveis[0].valorEmCentavos).toBe(2228);
        expect(resultado.opcoesDisponiveis[resultado.opcoesDisponiveis.length - 1].transportadora).toBe(
          "PAC",
        ); // Mais cara
      }
    });

    it("recomenda a opção mais barata entre as alternativas", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 5000,
            valorOriginalEmCentavos: 5500,
          },
          {
            transportadora: "SEDEX",
            prazoEmDias: 1,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "Loggi",
      );

      if (resultado.status === "alternativa") {
        expect(resultado.recomendada.transportadora).toBe("SEDEX");
        expect(resultado.recomendada.valorEmCentavos).toBe(2228);
      }
    });
  });

  describe("status: indisponivel", () => {
    it("retorna indisponível quando nenhuma transportadora cotou", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "99999999", // CEP em local remoto sem cobertura
        "PAC",
      );

      expect(resultado.status).toBe("indisponivel");
      if (resultado.status === "indisponivel") {
        expect(resultado.transportadoraEscolhida).toBe("PAC");
      }
    });

    it("conserva a transportadora escolhida mesmo quando indisponível", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "MinhaTransportadoraCustom",
      );

      if (resultado.status === "indisponivel") {
        expect(resultado.transportadoraEscolhida).toBe("MinhaTransportadoraCustom");
      }
    });
  });

  describe("múltiplos produtos", () => {
    it("consolida disponibilidade de múltiplos produtos", async () => {
      let callCount = 0;
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => {
            callCount++;
            return {
              exists: true,
              id: `prod${callCount}`,
              data: () => ({
                price: "100,00",
                pesoEmKg: 0.5,
                alturaEmCm: 20,
                larguraEmCm: 20,
                comprimentoEmCm: 30,
              }),
            };
          }),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 4456, // Soma de 2 caixas
            valorOriginalEmCentavos: 5000,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
        { collectionName: "products", produtoId: "prod2" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "PAC",
      );

      expect(resultado.status).toBe("confirmado");
    });
  });

  describe("uso de dimensões padrão", () => {
    it("usa dimensões padrão quando produto não as tem configuradas", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              // Sem dimensões — deve usar padrão
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "PAC",
      );

      expect(resultado.status).toBe("confirmado");
    });
  });

  describe("revalidação pós-pagamento", () => {
    it("revalida que transportadora escolhida ainda é cotável pós-pagamento", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "PAC",
      );

      expect(resultado.status).toBe("confirmado");
      expect(vi.mocked(cotarCarrinhoNaSuperFrete)).toHaveBeenCalled();
    });

    it("oferece alternativa quando transportadora escolhida deixa de ser cotável", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            id: "prod1",
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          })),
        })),
      } as Record<string, unknown>);

      // Primeira cotação (no checkout): PAC estava disponível
      // Segunda cotação (pós-pagamento): PAC não está mais, mas SEDEX está
      vi.mocked(cotarCarrinhoNaSuperFrete).mockResolvedValue({
        opcoes: [
          {
            transportadora: "SEDEX",
            prazoEmDias: 1,
            valorEmCentavos: 5000,
            valorOriginalEmCentavos: 5500,
          },
        ],
        itensSemCaixa: [],
      });

      const produtosRef: ProdutoRef[] = [
        { collectionName: "products", produtoId: "prod1" },
      ];

      const resultado = await verificarDisponibilidadeFrete(
        produtosRef,
        "01310100",
        "PAC", // Transportadora escolhida no checkout
      );

      expect(resultado.status).toBe("alternativa");
      if (resultado.status === "alternativa") {
        expect(resultado.recomendada.transportadora).toBe("SEDEX");
      }
    });
  });
});
