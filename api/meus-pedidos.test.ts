// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import handler from "./meus-pedidos.js";

vi.mock("./_lib/firebase-admin.js", () => ({ db: { collection: vi.fn() } }));
vi.mock("./_lib/auth.js", () => ({ usuarioDoToken: vi.fn() }));
vi.mock("../lib/cors.js", () => ({ handleCORS: vi.fn(() => false) }));

import { db } from "./_lib/firebase-admin.js";
import { usuarioDoToken } from "./_lib/auth.js";

const where = vi.fn();
const pedido = (id: string, campos: Record<string, unknown>) => ({
  id,
  data: () => ({ criadoEm: { toDate: () => new Date("2026-11-20") }, ...campos }),
});

function chamar() {
  const res = {
    statusCode: 0,
    body: undefined as unknown,
    status(c: number) { this.statusCode = c; return this; },
    json(b: unknown) { this.body = b; return this; },
  };
  return handler({ method: "GET", headers: {} } as VercelRequest, res as unknown as VercelResponse)
    .then(() => res);
}

describe("GET /api/meus-pedidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (db.collection as ReturnType<typeof vi.fn>).mockReturnValue({ where });
    where.mockImplementation((campo: string) => ({
      get: async () => ({
        docs:
          campo === "uid"
            ? [pedido("a", { uid: "u1", status: "paid", cliente: { cpf: "123" } })]
            : [pedido("b", { status: "pendente" }), pedido("c", { status: "expirado" })],
      }),
    }));
  });

  it("recusa sem login", async () => {
    vi.mocked(usuarioDoToken).mockResolvedValue(null);
    expect((await chamar()).statusCode).toBe(401);
  });

  it("e-mail NÃO verificado: só pedidos do uid", async () => {
    vi.mocked(usuarioDoToken).mockResolvedValue({ uid: "u1", email: "x@y.com", email_verified: false } as never);
    const res = await chamar();
    expect(where).toHaveBeenCalledTimes(1);
    expect((res.body as { pedidos: { pedidoId: string }[] }).pedidos.map((p) => p.pedidoId)).toEqual(["a"]);
  });

  it("e-mail verificado: inclui pedidos sem conta, sem expirados e sem CPF", async () => {
    vi.mocked(usuarioDoToken).mockResolvedValue({ uid: "u1", email: "x@y.com", email_verified: true } as never);
    const res = await chamar();
    expect(where).toHaveBeenCalledWith("cliente.email", "==", "x@y.com");
    const { pedidos } = res.body as { pedidos: { pedidoId: string }[] };
    expect(pedidos.map((p) => p.pedidoId).sort()).toEqual(["a", "b"]);
    expect(JSON.stringify(pedidos)).not.toContain("123");
  });
});
