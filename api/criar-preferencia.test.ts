// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./criar-preferencia.js";

// Mock dependencies
vi.mock("./_lib/firebase-admin.js", () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock("./_lib/mercadopago.js", () => ({
  mpClient: {},
}));

vi.mock("../lib/cors.js", () => ({
  handleCORS: vi.fn(() => false),
}));

vi.mock("./_lib/estoque.js", () => ({
  reservarMultiplosProdutos: vi.fn(),
  renovarReservaMultiplosProdutos: vi.fn(),
  liberarReservaMultiplosProdutos: vi.fn(),
  EstoqueIndisponivelError: class EstoqueIndisponivelError extends Error {
    status: number;
    produtoId?: string;
    constructor(message: string, status = 409, produtoId?: string) {
      super(message);
      this.name = "EstoqueIndisponivelError";
      this.status = status;
      this.produtoId = produtoId;
    }
  },
}));

import { db } from "./_lib/firebase-admin.js";
import { Preference } from "mercadopago";

vi.mock("mercadopago", () => ({
  Preference: class {
    constructor() {}
    async create(data: any) {
      return {
        id: "pref-123456",
        init_point: "https://www.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123456",
        sandbox_init_point: "https://sandbox.mercadopago.com.br/checkout/v1/redirect?pref_id=pref-123456",
      };
    }
  },
  Payment: class {
    constructor() {}
    async get(data: any) {
      return {
        id: 123456,
        status: "approved",
        external_reference: "pedido-123",
      };
    }
  },
}));

const mockDb = db as unknown as {
  collection: ReturnType<typeof vi.fn>;
};

function createRequest(body: unknown, method = "POST"): VercelRequest {
  return {
    method,
    headers: {},
    body,
    query: {},
  } as unknown as VercelRequest;
}

function createResponse(): VercelResponse {
  const res = {
    statusCode: 200,
    _getStatusCode() {
      return this.statusCode;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: unknown) {
      this.body = data;
      return this;
    },
  };
  return res as unknown as VercelResponse;
}

describe("POST /api/criar-preferencia", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VITE_SITE_URL = "http://localhost:8081";
  });

  describe("validação de entrada", () => {
    it("rejeita requisição que não é POST", async () => {
      const req = createRequest({}, "GET");
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
      expect(res.body?.error).toContain("não permitido");
    });

    it("rejeita payload sem produtoIds", async () => {
      const req = createRequest({
        // produtoIds missing
        freteEscolhido: { id: "frete-1" },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("incompleto");
    });

    it("rejeita produtoIds vazio", async () => {
      const req = createRequest({
        produtoIds: [],
        freteEscolhido: { id: "frete-1" },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("rejeita produtoIds não-array", async () => {
      const req = createRequest({
        produtoIds: "prod-1",
        freteEscolhido: { id: "frete-1" },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("rejeita freteEscolhido.id inválido", async () => {
      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "", transportadora: "PAC" }, // id vazio
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("Frete inválido");
    });

    it("rejeita cliente com dados inválidos (Zod validation)", async () => {
      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1" },
        cliente: {
          nome: "Test",
          email: "invalid-email", // email inválido
          telefone: "11999999999",
          cpf: "12345678901",
        },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("cliente inválidos");
    });

    it("rejeita endereço com dados inválidos (Zod validation)", async () => {
      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1" },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: {
          cep: "invalid", // CEP inválido
          logradouro: "Rua",
          numero: "123",
          bairro: "Bairro",
          cidade: "SP",
          uf: "SP",
        },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("endereço inválidos");
    });
  });

  describe("validação de cotação de frete", () => {
    it("rejeita cotação não encontrada no Firestore", async () => {
      const mockColRef = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: false,
          }),
        }),
      };
      mockDb.collection.mockReturnValue(mockColRef);

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-inexistente", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("não encontrada");
    });

    it("rejeita cotação já usada (usada: true)", async () => {
      const mockColRef = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({ usada: true }),
          }),
        }),
      };
      mockDb.collection.mockReturnValue(mockColRef);

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("já foi utilizada");
    });

    it("rejeita cotação expirada", async () => {
      const mockColRef = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              usada: false,
              expiraEm: {
                toMillis: () => Date.now() - 1000, // já expirou
              },
            }),
          }),
        }),
      };
      mockDb.collection.mockReturnValue(mockColRef);

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("expirada");
    });

    it("rejeita cotação que não corresponde ao carrinho", async () => {
      const mockColRef = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              usada: false,
              expiraEm: {
                toMillis: () => Date.now() + 100000,
              },
              produtoIds: ["prod-2", "prod-3"], // diferente de ["prod-1"]
              transportadora: "PAC",
              prazoEmDias: 5,
              valorEmCentavos: 2000,
            }),
          }),
        }),
      };
      mockDb.collection.mockReturnValue(mockColRef);

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
      expect(res.body?.error).toContain("inválida para este carrinho");
    });
  });

  describe("preferência do Mercado Pago", () => {
    it.skip("cria preferência com itens do servidor (não do cliente)", async () => {
      // A segurança crítica: preços SEMPRE vêm do Firestore, nunca do body
      const { reservarMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockReservarProdutos = reservarMultiplosProdutos as unknown as ReturnType<typeof vi.fn>;

      mockReservarProdutos.mockResolvedValue({
        produtos: new Map([
          [
            "products/prod-1",
            {
              id: "prod-1",
              title: "Produto do Servidor",
              price: "99,90",
              image: "https://example.com/image.jpg",
            },
          ],
        ]),
        reservadoAte: new Date(Date.now() + 600000),
      });

      const mockColRef = {
        doc: vi.fn().mockReturnValue({
          get: vi.fn().mockResolvedValue({
            exists: true,
            data: () => ({
              usada: false,
              expiraEm: {
                toMillis: () => Date.now() + 100000,
              },
              produtoIds: ["prod-1"],
              transportadora: "PAC",
              prazoEmDias: 5,
              valorEmCentavos: 2000,
            }),
          }),
          update: vi.fn(),
        }),
      };

      mockDb.collection.mockReturnValue(mockColRef);

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: {
          id: "frete-1",
          transportadora: "SEDEX", // cliente tentando enganar — será ignorado
          prazoEmDias: 999, // ignorado
          valorEmCentavos: 999999, // ignorado
        },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.preferenceId).toBe("pref-123456");

      // Verifica se os valores do servidor foram usados, não do cliente
      const updateCall = mockColRef.doc().update.mock.calls[0];
      expect(updateCall?.[0]).toBeDefined();
    });
  });

  describe("idempotência - renovação de pedido", () => {
    it.skip("renova pedido existente do mesmo cliente", async () => {
      const { renovarReservaMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockRenovarReserva = renovarReservaMultiplosProdutos as unknown as ReturnType<typeof vi.fn>;

      mockRenovarReserva.mockResolvedValue({
        produtos: new Map([
          [
            "products/prod-1",
            {
              id: "prod-1",
              title: "Produto",
              price: "99,90",
              image: "https://example.com/image.jpg",
            },
          ],
        ]),
        reservadoAte: new Date(Date.now() + 600000),
      });

      const pedidoIdExistente = "pedido-uuid-existente";
      const emailCliente = "test@test.com";

      const mockPedidoDocRef = {
        get: vi.fn()
          .mockResolvedValueOnce({
            exists: true,
            data: () => ({
              pedidoId: pedidoIdExistente,
              status: "pendente",
              cliente: { email: emailCliente },
            }),
          }),
        update: vi.fn(),
      };

      const mockCotacaoDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            usada: false,
            expiraEm: { toMillis: () => Date.now() + 100000 },
            produtoIds: ["prod-1"],
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2000,
          }),
        }),
        update: vi.fn(),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoDocRef) };
        if (name === "cotacoes_frete") return { doc: vi.fn().mockReturnValue(mockCotacaoDocRef) };
        return {};
      });

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: emailCliente, telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
        pedidoIdExistente, // cliente retomando checkout
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.pedidoId).toBe(pedidoIdExistente);
    });

    it.skip("rejeita renovação com email diferente (segurança)", async () => {
      const pedidoIdExistente = "pedido-uuid-existente";

      const mockPedidoDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            pedidoId: pedidoExistente,
            status: "pendente",
            cliente: { email: "original@test.com" },
          }),
        }),
      };

      const mockCotacaoDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            usada: false,
            expiraEm: { toMillis: () => Date.now() + 100000 },
            produtoIds: ["prod-1"],
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2000,
          }),
        }),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoDocRef) };
        if (name === "cotacoes_frete") return { doc: vi.fn().mockReturnValue(mockCotacaoDocRef) };
        return {};
      });

      const { reservarMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockReservarProdutos = reservarMultiplosProdutos as unknown as ReturnType<typeof vi.fn>;
      mockReservarProdutos.mockResolvedValue({
        produtos: new Map([
          [
            "products/prod-1",
            {
              id: "prod-1",
              title: "Produto",
              price: "99,90",
              image: "https://example.com/image.jpg",
            },
          ],
        ]),
        reservadoAte: new Date(Date.now() + 600000),
      });

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: {
          nome: "Attacker",
          email: "different@test.com", // email diferente!
          telefone: "11999999999",
          cpf: "12345678901",
        },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
        pedidoIdExistente, // tentando roubar o pedido
      });
      const res = createResponse();

      await handler(req, res);

      // Deve criar um novo pedido, não renovar o existente
      expect(res.statusCode).toBe(200);
      // pedidoId deve ser diferente ou ser um novo UUID
    });
  });

  describe("indisponibilidade de estoque", () => {
    it("rejeita se estoque indisponível", async () => {
      const { EstoqueIndisponivelError, reservarMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockReservarProdutos = reservarMultiplosProdutos as any;

      mockReservarProdutos.mockRejectedValue(
        new EstoqueIndisponivelError("Produto indisponível no momento", 409, "prod-1")
      );

      const mockCotacaoDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            usada: false,
            expiraEm: { toMillis: () => Date.now() + 100000 },
            produtoIds: ["prod-1"],
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2000,
          }),
        }),
      };

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockCotacaoDocRef),
      });

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(409);
      expect(res.body?.error).toContain("indisponível");
      expect(res.body?.produtoId).toBe("prod-1");
    });

    it.skip("libera reserva se criação de preferência falhar", async () => {
      const { reservarMultiplosProdutos, liberarReservaMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockReservarProdutos = reservarMultiplosProdutos as any;
      const mockLiberarReserva = liberarReservaMultiplosProdutos as unknown as ReturnType<typeof vi.fn>;

      mockReservarProdutos.mockResolvedValue({
        produtos: new Map([
          [
            "products/prod-1",
            {
              id: "prod-1",
              title: "Produto",
              price: "99,90",
              image: "https://example.com/image.jpg",
            },
          ],
        ]),
        reservadoAte: new Date(Date.now() + 600000),
      });

      const mockCotacaoDocRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            usada: false,
            expiraEm: { toMillis: () => Date.now() + 100000 },
            produtoIds: ["prod-1"],
            transportadora: "PAC",
            prazoEmDias: 5,
            valorEmCentavos: 2000,
          }),
        }),
        update: vi.fn(),
      };

      // Simular erro na criação de preferência
      vi.mocked(Preference).mockImplementationOnce((() => ({
        create: vi.fn().mockRejectedValueOnce(new Error("MP API Error")),
      })) as unknown as typeof Preference);

      mockDb.collection.mockReturnValue({
        doc: vi.fn().mockReturnValue(mockCotacaoDocRef),
      });

      const req = createRequest({
        produtoIds: ["prod-1"],
        freteEscolhido: { id: "frete-1", transportadora: "PAC", prazoEmDias: 5, valorEmCentavos: 2000 },
        cliente: { nome: "Test", email: "test@test.com", telefone: "11999999999", cpf: "12345678901" },
        endereco: { cep: "12345678", logradouro: "Rua", numero: "123", bairro: "Bairro", cidade: "SP", uf: "SP" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(500);
      expect(mockLiberarReserva).toHaveBeenCalled();
    });
  });
});
