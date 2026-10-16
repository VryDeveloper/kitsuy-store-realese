// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./verificar-pagamento.js";

// Mock dependencies
vi.mock("./_lib/firebase-admin.js", () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock("../lib/cors.js", () => ({
  handleCORS: vi.fn(() => false),
}));

import { db } from "./_lib/firebase-admin.js";

const mockDb = db as any;

function createRequest(query: any, method = "GET"): VercelRequest {
  return {
    method,
    headers: {},
    query,
    body: {},
  } as any;
}

function createResponse(): VercelResponse {
  const res: any = {
    statusCode: 200,
    _getStatusCode() {
      return this.statusCode;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = data;
      return this;
    },
  };
  return res;
}

describe("GET /api/verificar-pagamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("validação de entrada", () => {
    it("rejeita requisição que não é GET", async () => {
      const req = createRequest({ pedidoId: "pedido-123" }, "POST");
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain("não permitido");
    });

    it("rejeita sem pedidoId", async () => {
      const req = createRequest({});
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("obrigatório");
    });

    it("rejeita pedidoId não-string", async () => {
      const req = createRequest({ pedidoId: 123 });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("obrigatório");
    });

    it("rejeita pedidoId vazio", async () => {
      const req = createRequest({ pedidoId: "" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("obrigatório");
    });
  });

  describe("busca de pedido", () => {
    it("retorna dados do pedido para ID válido", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-123",
            status: "paid",
            produtos: [
              {
                nome: "Produto 1",
                imagem: "https://example.com/produto-1.jpg",
                preco: 10000, // em centavos
              },
              {
                nome: "Produto 2",
                imagem: "https://example.com/produto-2.jpg",
                preco: 5000,
              },
            ],
            frete: {
              transportadora: "PAC",
              prazoEmDias: 5,
            },
            pagamento: {
              totalEmCentavos: 15000,
            },
            cliente: {
              nome: "João Silva",
              email: "joao@example.com",
            },
            criadoEm: new Date("2024-01-15"),
            atualizadoEm: new Date("2024-01-16"),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.pedidoId).toBe("pedido-123");
      expect(res.body?.status).toBe("paid");
      expect(res.body?.produtos).toHaveLength(2);
      expect(res.body?.totalEmCentavos).toBe(15000);
      expect(res.body?.transportadora).toBe("PAC");
      expect(res.body?.prazoEmDias).toBe(5);
      expect(res.body?.clienteNome).toBe("João Silva");
      expect(res.body?.clienteEmail).toBe("joao@example.com");
    });

    it("retorna 404 para pedido não encontrado", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: false,
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "inexistente" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(404);
      expect(res.body?.error).toContain("não encontrado");
    });

    it("suporta schema legado (produto singular, não produtos array)", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-old",
            status: "paid",
            produto: {
              nome: "Produto Antigo",
              imagem: "https://example.com/antigo.jpg",
              preco: 25000,
            },
            frete: { transportadora: "SEDEX", prazoEmDias: 1 },
            pagamento: { totalEmCentavos: 25000 },
            cliente: { nome: "Cliente Antigo", email: "antigo@example.com" },
            criadoEm: new Date("2023-01-01"),
            atualizadoEm: new Date("2023-01-02"),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-old" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.produtos).toHaveLength(1);
      expect(res.body?.produtos[0].nome).toBe("Produto Antigo");
    });

    it("usa valores padrão quando campos opcionais estão ausentes", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-minimal",
            status: "pendente",
            // sem produtos, cliente, frete, pagamento
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-minimal" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.produtos).toEqual([]);
      expect(res.body?.totalEmCentavos).toBe(0);
      expect(res.body?.transportadora).toBe("");
      expect(res.body?.prazoEmDias).toBe(0);
      expect(res.body?.clienteNome).toBe("");
      expect(res.body?.clienteEmail).toBe("");
    });
  });

  describe("segurança e privacidade", () => {
    it("não expõe dados sensíveis (CPF, endereço completo, telefone)", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-123",
            status: "paid",
            produtos: [{ nome: "Produto", imagem: "", preco: 10000 }],
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            cliente: {
              nome: "João Silva",
              email: "joao@example.com",
              telefone: "11999999999", // deve ser ocultado
              cpf: "12345678901", // deve ser ocultado
            },
            endereco: {
              logradouro: "Rua Secreta",
              numero: "123",
              complemento: "Apt 456",
              bairro: "Bairro Privado",
              cidade: "São Paulo",
              uf: "SP",
              cep: "01310100", // deve ser ocultado
            },
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      // Verifica que dados sensíveis não são retornados
      expect(res.body).not.toHaveProperty("cliente.cpf");
      expect(res.body).not.toHaveProperty("cliente.telefone");
      expect(res.body).not.toHaveProperty("endereco");
      // Apenas informações públicas são retornadas
      expect(res.body?.clienteNome).toBe("João Silva");
      expect(res.body?.clienteEmail).toBe("joao@example.com");
    });

    it("não expõe detalhes de pagamento internos", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-123",
            status: "paid",
            produtos: [{ nome: "Produto", imagem: "", preco: 10000 }],
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: {
              totalEmCentavos: 10000,
              mercadoPagoId: "mp-123456", // deve ser ocultado
              preferenceId: "pref-123456", // deve ser ocultado
              metodo: "credit_card", // deve ser ocultado
              parcelas: 3, // deve ser ocultado
            },
            cliente: { nome: "Cliente", email: "client@example.com" },
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      // Apenas totalEmCentavos é exposto
      expect(res.body?.totalEmCentavos).toBe(10000);
      // Detalhes de pagamento não devem ser retornados
      expect(res.body).not.toHaveProperty("pagamento.mercadoPagoId");
      expect(res.body).not.toHaveProperty("pagamento.preferenceId");
      expect(res.body).not.toHaveProperty("metodo");
      expect(res.body).not.toHaveProperty("parcelas");
    });
  });

  describe("tratamento de erros", () => {
    it("retorna 500 em erro do Firestore com detalhes apenas em desenvolvimento", async () => {
      const mockDocRef = {
        get: vi.fn().mockRejectedValue(new Error("Firestore connection error")),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      process.env.NODE_ENV = "development";

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body?.error).toContain("Erro ao verificar");
      expect(res.body?.details).toBe("Firestore connection error");
    });

    it("oculta detalhes de erro em produção", async () => {
      const mockDocRef = {
        get: vi.fn().mockRejectedValue(new Error("Firestore connection error")),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      process.env.NODE_ENV = "production";

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(res.body?.error).toContain("Erro ao verificar");
      expect(res.body).not.toHaveProperty("details");
    });
  });

  describe("formatação de dados", () => {
    it("formata dados corretamente para o cliente", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-123",
            status: "paid",
            produtos: [
              { nome: "P1", imagem: "url1", preco: 10050 },
              { nome: "P2", imagem: "", preco: 5000 },
            ],
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 15050 },
            cliente: { nome: "Cliente", email: "client@test.com" },
            criadoEm: new Date("2024-01-15"),
            atualizadoEm: new Date("2024-01-16"),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body).toEqual({
        pedidoId: "pedido-123",
        status: "paid",
        produtos: [
          { nome: "P1", imagem: "url1", preco: 10050 },
          { nome: "P2", imagem: "", preco: 5000 },
        ],
        totalEmCentavos: 15050,
        transportadora: "PAC",
        prazoEmDias: 5,
        clienteNome: "Cliente",
        clienteEmail: "client@test.com",
        criadoEm: new Date("2024-01-15"),
        atualizadoEm: new Date("2024-01-16"),
      });
    });

    it("normaliza valores padrão para produto sem imagem", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-123",
            status: "paid",
            produtos: [
              { nome: "Produto", preco: 10000 }, // sem imagem
            ],
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            cliente: { nome: "Cliente", email: "client@test.com" },
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.produtos[0]).toEqual({
        nome: "Produto",
        imagem: "",
        preco: 10000,
      });
    });

    it("usa 'Produto' como nome padrão se nome ausente", async () => {
      const mockDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: "pedido-123",
            status: "paid",
            produtos: [
              { imagem: "url", preco: 10000 }, // sem nome
            ],
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            cliente: { nome: "Cliente", email: "client@test.com" },
            criadoEm: new Date(),
            atualizadoEm: new Date(),
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockDocRef),
      });

      const req = createRequest({ pedidoId: "pedido-123" });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.produtos[0].nome).toBe("Produto");
    });
  });
});
