// @vitest-environment node
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./calcular-frete.js";

// Mock Firebase Admin
vi.mock("./_lib/firebase-admin.js", () => ({
  db: {
    collection: vi.fn(function (name: string) {
      return {
        doc: vi.fn((id: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({}),
          }),
          set: vi.fn().mockResolvedValue(undefined),
        })),
      };
    }),
  },
}));

// Mock modules that calcular-frete depends on
vi.mock("../lib/cors.js", () => ({
  handleCORS: vi.fn(() => false),
}));

vi.mock("./_lib/estoque.js", () => ({
  estaDisponivelAgora: vi.fn(() => true),
}));

vi.mock("./_lib/frete-consolidado.js", async () => {
  const actual = await vi.importActual("./_lib/frete-consolidado.js");
  return {
    ...actual,
    agruparCarrinhoEmCaixas: vi.fn(function (itens: any) {
      return {
        caixas: [
          {
            caixa: { nome: "Única", comprimentoCm: 30, larguraCm: 20, alturaCm: 20, pesoMaxKg: 1 },
            itens,
            pesoRealSomadoKg: 0.5,
            pesoCubadoKg: 0.167,
            pesoCobradoKg: 0.5,
            valorSeguradoEmCentavos: itens.reduce((sum: number, i: any) => sum + i.precoEmCentavos, 0),
          },
        ],
        itensSemCaixa: [],
      };
    }),
    cotarCaixasNaSuperFrete: vi.fn(),
  };
});

import { db } from "./_lib/firebase-admin.js";
import { estaDisponivelAgora } from "./_lib/estoque.js";
import {
  agruparCarrinhoEmCaixas,
  cotarCaixasNaSuperFrete,
} from "./_lib/frete-consolidado.js";
import { handleCORS } from "../lib/cors.js";

function createMockRequest(overrides: any = {}): VercelRequest {
  return {
    headers: {},
    query: {},
    body: undefined,
    method: "GET",
    ...overrides,
  } as VercelRequest;
}

function createMockResponse(): VercelResponse {
  const mockRes: any = {
    status: vi.fn(function (code: number) {
      this.statusCode = code;
      return this;
    }),
    json: vi.fn(function (data: any) {
      this.body = data;
      return this;
    }),
    statusCode: 200,
    body: undefined,
  };
  return mockRes;
}

function setupDbMock(productData: Record<string, any> = {}) {
  vi.mocked(db.collection).mockImplementation((name: string) => ({
    doc: vi.fn((id: string) => ({
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          price: "100,00",
          pesoEmKg: 0.5,
          alturaEmCm: 20,
          larguraEmCm: 20,
          comprimentoEmCm: 30,
          ...productData,
        }),
      }),
      set: vi.fn().mockResolvedValue(undefined),
    })),
  } as any));
}

describe("POST /api/calcular-frete handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SUPERFRETE_TOKEN = "token-teste";
    process.env.LOJA_CEP_ORIGEM = "40296330";
    process.env.NODE_ENV = "test";

    // Reset default db mock
    vi.mocked(db.collection).mockImplementation((name: string) => ({
      doc: vi.fn((id: string) => ({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({}),
        }),
        set: vi.fn().mockResolvedValue(undefined),
      })),
    } as any));
  });

  afterEach(() => {
    delete process.env.SUPERFRETE_TOKEN;
    delete process.env.LOJA_CEP_ORIGEM;
  });

  describe("validação de método HTTP", () => {
    it("rejeita POST com erro 405", async () => {
      const req = createMockRequest({ method: "POST" });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalledWith({
        error: "Método não permitido",
      });
    });

    it("aceita GET", async () => {
      vi.mocked(db.collection).mockImplementation((name: string) => ({
        doc: vi.fn((id: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          }),
          set: vi.fn().mockResolvedValue(undefined),
        })),
      } as any));

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("validação de CEP", () => {
    it("rejeita CEP ausente", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "CEP inválido. Deve conter 8 dígitos.",
      });
    });

    it("rejeita CEP com menos de 8 dígitos", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { cep: "0131010", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "CEP inválido. Deve conter 8 dígitos.",
      });
    });

    it("rejeita CEP com mais de 8 dígitos", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { cep: "013101000", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "CEP inválido. Deve conter 8 dígitos.",
      });
    });

    it("rejeita CEP com caracteres não-dígitos", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { cep: "0131010a", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("aceita CEP com 8 dígitos válidos", async () => {
      vi.mocked(db.collection).mockImplementation((name: string) => ({
        doc: vi.fn((id: string) => ({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
            }),
          }),
          set: vi.fn().mockResolvedValue(undefined),
        })),
      } as any));

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("validação de produtoIds", () => {
    it("rejeita produtoIds ausente", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "produtoIds é obrigatório",
      });
    });

    it("rejeita produtoIds vazio", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "produtoIds é obrigatório",
      });
    });

    it("rejeita produtoIds com apenas espaços", async () => {
      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "  ,  , " },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it("aceita produtoIds único", async () => {
      setupDbMock();

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("aceita produtoIds múltiplos separados por vírgula", async () => {
      setupDbMock();

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1,prod2,prod3" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("deduplica produtoIds repetidos", async () => {
      const mockGet = vi.fn(async () => ({
        exists: true,
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
      } as any);

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1,prod2,prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      // Deve chamar db.get apenas 2 vezes (prod1 e prod2, não 3)
      expect(mockGet).toHaveBeenCalledTimes(2);
    });
  });

  describe("busca de produtos no Firestore", () => {
    it("rejeita produto não encontrado", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: false,
          })),
        })),
      } as any);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "nao-existe" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: "Produto não encontrado",
        produtoIds: ["nao-existe"],
      });
    });

    it("busca produtos da coleção 'products'", async () => {
      const mockCollection = vi.fn();
      vi.mocked(db.collection).mockImplementation(mockCollection);

      const mockGet = vi.fn(async () => ({
        exists: true,
        data: () => ({
          price: "100,00",
          pesoEmKg: 0.5,
          alturaEmCm: 20,
          larguraEmCm: 20,
          comprimentoEmCm: 30,
        }),
      }));

      mockCollection.mockReturnValue({
        doc: vi.fn(() => ({
          get: mockGet,
        })),
      } as any);

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(mockCollection).toHaveBeenCalledWith("products");
    });
  });

  describe("cálculo de preço em centavos", () => {
    it("converte preço string formatado em centavos", async () => {
      setupDbMock({ price: "100,50" });

      vi.mocked(agruparCarrinhoEmCaixas).mockReturnValue({
        caixas: [
          {
            caixa: { nome: "Única", comprimentoCm: 30, larguraCm: 20, alturaCm: 20, pesoMaxKg: 1 },
            itens: [
              {
                produtoId: "prod1",
                comprimentoCm: 20,
                larguraCm: 20,
                alturaCm: 20,
                pesoEmKg: 0.5,
                precoEmCentavos: 10050,
              },
            ],
            pesoRealSomadoKg: 0.5,
            pesoCubadoKg: 0.133,
            pesoCobradoKg: 0.5,
            valorSeguradoEmCentavos: 10050,
          },
        ],
        itensSemCaixa: [],
      });

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });

    it("converte preço com centavos sem vírgula", async () => {
      setupDbMock({ price: "10050" });

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("uso de dimensões padrão", () => {
    it("usa dimensões padrão quando produto não tem peso configurado", async () => {
      setupDbMock({ pesoEmKg: undefined });

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
          {
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2228,
            valorOriginalEmCentavos: 2500,
          },
        ],
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe("agrupamento em caixas", () => {
    it("rejeita itens que excedem caixa máxima", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 100,
              larguraEmCm: 100,
              comprimentoEmCm: 100,
            }),
          })),
        })),
      } as any);

      vi.mocked(agruparCarrinhoEmCaixas).mockReturnValue({
        caixas: [],
        itensSemCaixa: [
          {
            produtoId: "grande",
            comprimentoCm: 100,
            larguraCm: 100,
            alturaCm: 100,
            pesoEmKg: 0.5,
            precoEmCentavos: 10000,
          },
        ],
      });

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "grande" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error:
          "Um ou mais produtos do carrinho excedem o tamanho de caixa disponível — fale conosco pelo WhatsApp pra cotar esse frete manualmente.",
        produtoIds: ["grande"],
      });
    });
  });

  describe("cotação na SuperFrete", () => {
    it("retorna opcoes consolidadas de frete com preços formatados", async () => {
      setupDbMock();

      vi.mocked(agruparCarrinhoEmCaixas).mockReturnValue({
        caixas: [
          {
            caixa: { nome: "Única", comprimentoCm: 30, larguraCm: 20, alturaCm: 20, pesoMaxKg: 1 },
            itens: [
              {
                produtoId: "prod1",
                comprimentoCm: 20,
                larguraCm: 20,
                alturaCm: 20,
                pesoEmKg: 0.5,
                precoEmCentavos: 10000,
              },
            ],
            pesoRealSomadoKg: 0.5,
            pesoCubadoKg: 0.133,
            pesoCobradoKg: 0.5,
            valorSeguradoEmCentavos: 10000,
          },
        ],
        itensSemCaixa: [],
      });

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([
        [
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
      ]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();
      const response = vi.mocked(res.json).mock.calls[0][0];
      expect(response.opcoes).toBeDefined();
      expect(response.opcoes.length).toBeGreaterThan(0);
      expect(response.opcoes[0]).toHaveProperty("id");
      expect(response.opcoes[0]).toHaveProperty("transportadora");
      expect(response.opcoes[0]).toHaveProperty("prazoEmDias");
      expect(response.opcoes[0]).toHaveProperty("valorEmCentavos");
      expect(response.opcoes[0]).toHaveProperty("valorFormatado");
    });

    it("rejeita quando SuperFrete não retorna opções", async () => {
      setupDbMock();

      vi.mocked(agruparCarrinhoEmCaixas).mockReturnValue({
        caixas: [
          {
            caixa: { nome: "Única", comprimentoCm: 30, larguraCm: 20, alturaCm: 20, pesoMaxKg: 1 },
            itens: [
              {
                produtoId: "prod1",
                comprimentoCm: 20,
                larguraCm: 20,
                alturaCm: 20,
                pesoEmKg: 0.5,
                precoEmCentavos: 10000,
              },
            ],
            pesoRealSomadoKg: 0.5,
            pesoCubadoKg: 0.133,
            pesoCobradoKg: 0.5,
            valorSeguradoEmCentavos: 10000,
          },
        ],
        itensSemCaixa: [],
      });

      vi.mocked(cotarCaixasNaSuperFrete).mockResolvedValue([[]]);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Nenhuma opção de frete disponível para este CEP",
      });
    });
  });

  describe("variáveis de ambiente", () => {
    it("rejeita sem SUPERFRETE_TOKEN configurado", async () => {
      delete process.env.SUPERFRETE_TOKEN;

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Serviço de frete temporariamente indisponível",
      });
    });

    it("rejeita sem LOJA_CEP_ORIGEM configurado", async () => {
      delete process.env.LOJA_CEP_ORIGEM;

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Serviço de frete temporariamente indisponível",
      });
    });
  });

  describe("disponibilidade de produtos", () => {
    it("rejeita produtos indisponíveis no estoque", async () => {
      vi.mocked(db.collection).mockReturnValue({
        doc: vi.fn(() => ({
          get: vi.fn(async () => ({
            exists: true,
            data: () => ({
              price: "100,00",
              pesoEmKg: 0.5,
              alturaEmCm: 20,
              larguraEmCm: 20,
              comprimentoEmCm: 30,
              stock: 0, // Sem estoque
            }),
          })),
        })),
      } as any);

      vi.mocked(estaDisponivelAgora).mockReturnValue(false);

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "indisponivel" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: "Um ou mais produtos do carrinho não estão mais disponíveis",
        produtoIds: ["indisponivel"],
      });
    });
  });

  describe("tratamento de erros", () => {
    it("retorna erro 500 com mensagem genérica em produção", async () => {
      process.env.NODE_ENV = "production";

      vi.mocked(db.collection).mockImplementation(() => {
        throw new Error("Erro de conexão com banco");
      });

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: "Erro ao calcular frete",
      });
    });

    it("retorna detalhes do erro em modo não-produção", async () => {
      process.env.NODE_ENV = "test";

      vi.mocked(db.collection).mockImplementation(() => {
        throw new Error("Erro específico de teste");
      });

      const req = createMockRequest({
        method: "GET",
        query: { cep: "01310100", produtoIds: "prod1" },
      });
      const res = createMockResponse();

      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      const callArgs = vi.mocked(res.json).mock.calls[0][0];
      expect(callArgs.error).toBe("Erro ao calcular frete");
      expect(callArgs.details).toBeDefined();
    });
  });
});
