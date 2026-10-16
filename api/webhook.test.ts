// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./webhook.js";

// Mock dependencies
vi.mock("./_lib/firebase-admin.js", () => ({
  db: {
    collection: vi.fn(),
  },
}));

vi.mock("./_lib/mercadopago.js", () => ({
  mpClient: {},
}));

vi.mock("./_lib/validar-assinatura.js", () => ({
  validarAssinaturaWebhook: vi.fn(),
}));

vi.mock("./_lib/resend.js", () => ({
  resend: {
    emails: {
      send: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
}));

vi.mock("./_lib/notificar-telegram.js", () => ({
  notificarPedidoTelegram: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_lib/notificar-whatsapp.js", () => ({
  notificarWhatsApp: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./_lib/verificar-disponibilidade-frete.js", () => ({
  verificarDisponibilidadeFrete: vi.fn().mockResolvedValue({
    disponivel: true,
    mensagem: "Frete disponível",
  }),
}));

vi.mock("./_lib/estoque.js", () => ({
  marcarMultiplosProdutosVendidos: vi.fn().mockResolvedValue(undefined),
  liberarReservaMultiplosProdutos: vi.fn().mockResolvedValue(undefined),
  liberarMultiplosProdutosAposReembolso: vi.fn().mockResolvedValue(undefined),
}));

import { db } from "./_lib/firebase-admin.js";
import { validarAssinaturaWebhook } from "./_lib/validar-assinatura.js";
import { resend } from "./_lib/resend.js";
import { notificarPedidoTelegram } from "./_lib/notificar-telegram.js";

// Estado para o mock de Payment - pode ser alterado per teste
let mockPaymentStatus = "approved";

vi.mock("mercadopago", () => ({
  Payment: class {
    constructor() {}
    async get(data: any) {
      return {
        id: 123456,
        status: mockPaymentStatus,
        external_reference: "pedido-123",
        payment_type_id: "credit_card",
        installments: 1,
        transaction_amount: 299.90,
      };
    }
  },
}));

const mockDb = db as unknown as {
  collection: ReturnType<typeof vi.fn>;
};

const mockValidarAssinatura = validarAssinaturaWebhook as ReturnType<typeof vi.fn>;
const mockResend = resend as unknown as {
  emails: { send: ReturnType<typeof vi.fn> };
};

function createRequest(body: unknown, headers: Record<string, unknown> = {}): VercelRequest {
  return {
    method: "POST",
    headers: {
      "x-signature": headers["x-signature"],
      "x-request-id": headers["x-request-id"],
      ...headers,
    },
    body,
    query: { "data.id": headers["data.id"] },
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

describe("POST /api/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetAllMocks();
    mockPaymentStatus = "approved"; // Reset para padrão
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-secret";
    process.env.VITE_SITE_URL = "http://localhost:8081";
    process.env.EMAIL_REMETENTE = "noreply@kitsuy.com";
    process.env.EMAIL_LOJA_NOTIFICACAO = "loja@kitsuy.com";
  });

  describe("validação de segurança", () => {
    it("rejeita requisição sem MERCADOPAGO_WEBHOOK_SECRET configurado", async () => {
      delete process.env.MERCADOPAGO_WEBHOOK_SECRET;

      const req = createRequest({
        type: "payment",
        data: { id: "123456" },
      });
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain("não configurado");
    });

    it("rejeita requisição sem assinatura (x-signature ausente)", async () => {
      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        { "x-request-id": "req-123" } // falta x-signature
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain("autenticação");
    });

    it("rejeita requisição sem x-request-id", async () => {
      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        { "x-signature": "ts=123,v1=abc" } // falta x-request-id
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
    });

    it("rejeita requisição sem data.id", async () => {
      const req = createRequest(
        { type: "payment", data: {} }, // data.id ausente
        { "x-signature": "ts=123,v1=abc", "x-request-id": "req-123" }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
    });

    it("rejeita assinatura inválida", async () => {
      mockValidarAssinatura.mockReturnValue(false);

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=invalida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(401);
      expect(res.body?.error).toContain("inválida");
    });

    it("rejeita apenas com método não-POST", async () => {
      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      req.method = "GET";
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(405);
    });
  });

  describe("processamento de notificações", () => {
    beforeEach(() => {
      mockValidarAssinatura.mockReturnValue(true);
    });

    it("registra webhook no Firestore para auditoria", async () => {
      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "pendente",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(mockWebhookRef.set).toHaveBeenCalled();
    });

    it("ignora tipos de notificação que não são 'payment'", async () => {
      mockValidarAssinatura.mockReturnValue(true);

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        return {};
      });

      const req = createRequest(
        { type: "merchant_order", data: { id: "123456" } }, // tipo diferente
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.message).toContain("ignorado");
    });

    it("retorna 400 se payment id ausente no body", async () => {
      mockValidarAssinatura.mockReturnValue(true);

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: {} }, // id ausente no body
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456", // mas dataId é válido para assinatura
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(400);
    });

    it("retorna sucesso se pedido não encontrado (webhook já processado/orfão)", async () => {
      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: false,
        }),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.success).toBe(false);
    });
  });

  describe("atualização de status de pagamento", () => {
    beforeEach(() => {
      mockValidarAssinatura.mockReturnValue(true);
    });

    const criarMockPedido = (status: string = "pendente") => {
      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status,
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      return { mockPedidoRef, mockWebhookRef };
    };

    it("marca produto como vendido quando pagamento é aprovado", async () => {
      const { marcarMultiplosProdutosVendidos } = await import("./_lib/estoque.js");
      const mockMarcarVendidos = marcarMultiplosProdutosVendidos as unknown as ReturnType<typeof vi.fn>;

      criarMockPedido("pendente");

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.status).toBe("paid");
      expect(mockMarcarVendidos).toHaveBeenCalled();
    });

    it("não marca como vendido novamente (idempotência) se já estava pago", async () => {
      const { marcarMultiplosProdutosVendidos } = await import("./_lib/estoque.js");
      const mockMarcarVendidos = marcarMultiplosProdutosVendidos as unknown as ReturnType<typeof vi.fn>;

      criarMockPedido("paid"); // já estava pago

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockMarcarVendidos).not.toHaveBeenCalled(); // não marca novamente
    });

    it("libera reserva quando pagamento é recusado", async () => {
      mockPaymentStatus = "rejected";
      const { liberarReservaMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockLiberarReserva = liberarReservaMultiplosProdutos as ReturnType<typeof vi.fn>;

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "pendente",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.status).toBe("cancelado");
      expect(mockLiberarReserva).toHaveBeenCalled();
    });

    it("devvolve produto ao estoque quando pagamento é estornado (refund)", async () => {
      mockPaymentStatus = "refunded";
      const { liberarMultiplosProdutosAposReembolso } = await import("./_lib/estoque.js");
      const mockLiberarReembolso = liberarMultiplosProdutosAposReembolso as ReturnType<typeof vi.fn>;

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "paid",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.status).toBe("reembolsado");
      expect(mockLiberarReembolso).toHaveBeenCalled();
    });

    it("registra disputa (in_mediation) sem liberar estoque", async () => {
      mockPaymentStatus = "in_mediation";
      const { marcarMultiplosProdutosVendidos, liberarMultiplosProdutosAposReembolso } = await import("./_lib/estoque.js");

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "paid",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(res.body?.status).toBe("em_disputa");
      expect(marcarMultiplosProdutosVendidos as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
      expect(liberarMultiplosProdutosAposReembolso as unknown as ReturnType<typeof vi.fn>).not.toHaveBeenCalled();
    });
  });

  describe("notificações", () => {
    beforeEach(() => {
      mockValidarAssinatura.mockReturnValue(true);
    });

    it("envia emails de confirmação quando pagamento aprovado", async () => {
      const { resend } = await import("./_lib/resend.js");
      const mockSend = mockResend.emails.send;

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "pendente",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999", cpf: "12345678901" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products", imagem: "url" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
      expect(mockSend.mock.calls.length).toBeGreaterThanOrEqual(2); // loja + cliente (pode ter mais se frete check)
    });

    it("não falha se Resend não está configurado", async () => {
      process.env.EMAIL_REMETENTE = "";
      process.env.EMAIL_LOJA_NOTIFICACAO = "";

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "pendente",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200);
    });

    it("trata erros em notificações graciosamente sem impedir webhook", async () => {
      const { notificarPedidoTelegram } = await import("./_lib/notificar-telegram.js");
      const mockTelegram = notificarPedidoTelegram as unknown as ReturnType<typeof vi.fn>;

      mockTelegram.mockRejectedValueOnce(new Error("Telegram error"));

      const mockWebhookRef = {
        set: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue(undefined),
      };

      const mockPedidoRef = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({
            status: "pendente",
            cliente: { nome: "Cliente", email: "client@test.com", telefone: "11999999999" },
            frete: { transportadora: "PAC", prazoEmDias: 5 },
            pagamento: { totalEmCentavos: 10000 },
            produtos: [{ id: "prod-1", nome: "Produto", preco: 9900, collectionName: "products" }],
            endereco: {
              logradouro: "Rua",
              numero: "123",
              bairro: "Bairro",
              cidade: "SP",
              uf: "SP",
              cep: "12345678",
            },
          }),
        }),
        update: vi.fn().mockResolvedValue(undefined),
      };

      mockDb.collection.mockImplementation((name: string) => {
        if (name === "pagamentos_webhook") return { doc: vi.fn().mockReturnValue(mockWebhookRef) };
        if (name === "pedidos") return { doc: vi.fn().mockReturnValue(mockPedidoRef) };
        return {};
      });

      const req = createRequest(
        { type: "payment", data: { id: "123456" } },
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": "123456",
        }
      );
      const res = createResponse();

      await handler(req, res);

      expect(res.statusCode).toBe(200); // sucesso apesar do erro
    });
  });
});
