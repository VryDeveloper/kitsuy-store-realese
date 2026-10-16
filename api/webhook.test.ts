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

vi.mock("mercadopago", () => ({
  Payment: class {
    constructor() {}
    async get(data: any) {
      return {
        id: 123456,
        status: "approved",
        external_reference: "pedido-123",
        payment_type_id: "credit_card",
        installments: 1,
        transaction_amount: 299.90,
      };
    }
  },
}));

const mockDb = db as any;
const mockValidarAssinatura = validarAssinaturaWebhook as any;

function createRequest(body: any, headers: any = {}): VercelRequest {
  return {
    method: "POST",
    headers: {
      "x-signature": headers["x-signature"],
      "x-request-id": headers["x-request-id"],
      ...headers,
    },
    body,
    query: { "data.id": headers["data.id"] },
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

describe("POST /api/webhook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      const req = createRequest(
        { type: "payment", data: {} }, // id ausente
        {
          "x-signature": "ts=123,v1=valida",
          "x-request-id": "req-123",
          "data.id": undefined,
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
      const mockMarcarVendidos = marcarMultiplosProdutosVendidos as any;

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
      const mockMarcarVendidos = marcarMultiplosProdutosVendidos as any;

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
      const { liberarReservaMultiplosProdutos } = await import("./_lib/estoque.js");
      const mockLiberarReserva = liberarReservaMultiplosProdutos as any;

      criarMockPedido("pendente");

      // Simular pagamento rejeitado
      vi.mocked(await import("mercadopago").then(m => m.Payment)).mockImplementationOnce(() => ({
        get: vi.fn().mockResolvedValueOnce({
          id: 123456,
          status: "rejected", // pagamento recusado
          external_reference: "pedido-123",
          payment_type_id: "credit_card",
          installments: 1,
        }),
      }) as any);

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
      const { liberarMultiplosProdutosAposReembolso } = await import("./_lib/estoque.js");
      const mockLiberarReembolso = liberarMultiplosProdutosAposReembolso as any;

      criarMockPedido("paid"); // já estava pago

      // Simular estorno
      vi.mocked(await import("mercadopago").then(m => m.Payment)).mockImplementationOnce(() => ({
        get: vi.fn().mockResolvedValueOnce({
          id: 123456,
          status: "refunded", // estornado
          external_reference: "pedido-123",
          payment_type_id: "credit_card",
          installments: 1,
        }),
      }) as any);

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
      const { marcarMultiplosProdutosVendidos, liberarMultiplosProdutosAposReembolso } = await import("./_lib/estoque.js");

      criarMockPedido("paid");

      // Simular disputa em aberta
      vi.mocked(await import("mercadopago").then(m => m.Payment)).mockImplementationOnce(() => ({
        get: vi.fn().mockResolvedValueOnce({
          id: 123456,
          status: "in_mediation",
          external_reference: "pedido-123",
          payment_type_id: "credit_card",
          installments: 1,
        }),
      }) as any);

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
      expect((marcarMultiplosProdutosVendidos as any)).not.toHaveBeenCalled();
      expect((liberarMultiplosProdutosAposReembolso as any)).not.toHaveBeenCalled();
    });
  });

  describe("notificações", () => {
    beforeEach(() => {
      mockValidarAssinatura.mockReturnValue(true);
    });

    it("envia emails de confirmação quando pagamento aprovado", async () => {
      const { resend } = await import("./_lib/resend.js");
      const mockSend = (resend as any).emails.send;

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
      expect(mockSend).toHaveBeenCalledTimes(2); // loja + cliente
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
      const mockTelegram = notificarPedidoTelegram as any;

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
