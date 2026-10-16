// @vitest-environment node
import { describe, it, expect, beforeEach, vi } from "vitest";
import { Timestamp } from "firebase-admin/firestore";
import {
  estaDisponivelAgora,
  EstoqueIndisponivelError,
  reservarProduto,
  renovarReservaProduto,
  reservarMultiplosProdutos,
  renovarReservaMultiplosProdutos,
  marcarProdutoVendido,
  liberarReservaProduto,
  liberarReservaProdutos,
  marcarMultiplosProdutosVendidos,
  liberarReservaMultiplosProdutos,
  liberarMultiplosProdutosAposReembolso,
  liberarProdutoAposReembolso,
  RESERVA_TTL_MS,
} from "./estoque.js";

// Mock Firebase Admin
vi.mock("./firebase-admin.js", () => {
  const mockDb = {
    collection: vi.fn(),
    runTransaction: vi.fn(),
  };
  return { db: mockDb };
});

import { db } from "./firebase-admin.js";

const mockDb = db as any;

describe("estaDisponivelAgora", () => {
  it("retorna true para produto com estoqueStatus 'disponivel'", () => {
    const produto = {
      estoqueStatus: "disponivel",
      inStock: "disponível",
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(true);
  });

  it("retorna false para produto com estoqueStatus 'vendido'", () => {
    const produto = {
      estoqueStatus: "vendido",
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(false);
  });

  it("retorna true se a reserva expirou (reservadoAte no passado)", () => {
    const produto = {
      estoqueStatus: "reservado",
      reservadoAte: Timestamp.fromMillis(Date.now() - 1000), // 1s atrás
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(true);
  });

  it("retorna false se a reserva ainda está válida", () => {
    const produto = {
      estoqueStatus: "reservado",
      reservadoAte: Timestamp.fromMillis(Date.now() + 1000), // 1s no futuro
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(false);
  });

  it("cai de volta no inStock legado quando não tem estoqueStatus", () => {
    const produto = {
      inStock: "disponível",
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(true);
  });

  it("retorna false para inStock legado 'indisponível'", () => {
    const produto = {
      inStock: "indisponível",
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(false);
  });

  it("normaliza inStock em maiúsculas", () => {
    const produto = {
      inStock: "DISPONÍVEL",
    };

    const resultado = estaDisponivelAgora(produto);

    expect(resultado).toBe(true);
  });
});

describe("reservarProduto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reserva um produto disponível com sucesso", async () => {
    const pedidoId = "pedido-123";
    const produto = {
      id: "prod-1",
      title: "Produto Teste",
      inStock: "disponível",
      estoqueStatus: "disponivel",
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await reservarProduto(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(resultado.produto).toEqual(produto);
    expect(resultado.reservadoAte).toBeInstanceOf(Date);
    expect(mockTx.update).toHaveBeenCalled();
  });

  it("rejeita se produto não existe", async () => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: false,
      }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    await expect(
      reservarProduto({ collectionName: "products", produtoId: "prod-1" }, "pedido-123")
    ).rejects.toThrow(EstoqueIndisponivelError);
  });

  it("rejeita se produto já está vendido", async () => {
    const produto = {
      estoqueStatus: "vendido",
      vendidoPedidoId: "outro-pedido",
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    await expect(
      reservarProduto({ collectionName: "products", produtoId: "prod-1" }, "pedido-123")
    ).rejects.toThrow(EstoqueIndisponivelError);
  });

  it("rejeita se produto está reservado por outro pedido (reserva válida)", async () => {
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: "outro-pedido",
      reservadoAte: Timestamp.fromMillis(Date.now() + 10000), // 10s no futuro
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    await expect(
      reservarProduto({ collectionName: "products", produtoId: "prod-1" }, "pedido-123")
    ).rejects.toThrow(EstoqueIndisponivelError);
  });

  it("reclama reserva expirada e faz a nova", async () => {
    const pedidoId = "novo-pedido";
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: "pedido-antigo",
      reservadoAte: Timestamp.fromMillis(Date.now() - 1000), // 1s atrás, expirado
      title: "Produto",
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await reservarProduto(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(resultado.produto).toEqual(produto);
    expect(mockTx.update).toHaveBeenCalled();
  });

  it("retorna reservadoAte com TTL correto (RESERVA_TTL_MS a partir de agora)", async () => {
    const agora = Date.now();
    const produto = { estoqueStatus: "disponivel", title: "Produto" };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await reservarProduto(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    const diferenca = resultado.reservadoAte.getTime() - agora;
    expect(diferenca).toBeGreaterThanOrEqual(RESERVA_TTL_MS - 100);
    expect(diferenca).toBeLessThanOrEqual(RESERVA_TTL_MS + 100);
  });
});

describe("renovarReservaProduto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renova a reserva se o pedido é dono da reserva atual", async () => {
    const pedidoId = "pedido-123";
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: pedidoId,
      title: "Produto",
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await renovarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(resultado).not.toBeNull();
    expect(resultado?.produto).toEqual(produto);
    expect(mockTx.update).toHaveBeenCalled();
  });

  it("retorna null se produto não existe", async () => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: false,
      }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await renovarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(resultado).toBeNull();
  });

  it("retorna null se a reserva não pertence a este pedido", async () => {
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: "outro-pedido",
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await renovarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(resultado).toBeNull();
  });

  it("retorna null se produto não está em status 'reservado'", async () => {
    const produto = {
      estoqueStatus: "disponivel",
      reservadoPedidoId: "pedido-123",
    };

    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    const resultado = await renovarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(resultado).toBeNull();
  });
});

describe("reservarMultiplosProdutos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reserva múltiplos produtos atomicamente", async () => {
    const pedidoId = "pedido-123";
    const produtos = [
      { id: "prod-1", title: "Produto 1", inStock: "disponível" },
      { id: "prod-2", title: "Produto 2", inStock: "disponível" },
    ];

    const mockTx = {
      get: vi.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[0],
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[1],
        }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({}),
    });

    const resultado = await reservarMultiplosProdutos(
      [
        { collectionName: "products", produtoId: "prod-1" },
        { collectionName: "products", produtoId: "prod-2" },
      ],
      pedidoId
    );

    expect(resultado.produtos.size).toBe(2);
    expect(mockTx.update).toHaveBeenCalledTimes(2);
  });

  it("falha atomicamente se um produto indisponível (nada é reservado)", async () => {
    const produtos = [
      { id: "prod-1", title: "Produto 1", inStock: "disponível" },
      { id: "prod-2", title: "Produto 2", estoqueStatus: "vendido" },
    ];

    const mockTx = {
      get: vi.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[0],
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[1],
        }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({}),
    });

    await expect(
      reservarMultiplosProdutos(
        [
          { collectionName: "products", produtoId: "prod-1" },
          { collectionName: "products", produtoId: "prod-2" },
        ],
        "pedido-123"
      )
    ).rejects.toThrow(EstoqueIndisponivelError);

    expect(mockTx.update).not.toHaveBeenCalled();
  });

  it("rejeita carrinho com produto duplicado", async () => {
    const mockTx = {
      get: vi.fn(),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({}),
    });

    await expect(
      reservarMultiplosProdutos(
        [
          { collectionName: "products", produtoId: "prod-1" },
          { collectionName: "products", produtoId: "prod-1" }, // duplicado
        ],
        "pedido-123"
      )
    ).rejects.toThrow(EstoqueIndisponivelError);
  });
});

describe("marcarProdutoVendido", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (produto: any) => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({}),
    });

    return { mockTx };
  };

  it("marca produto como vendido com sucesso", async () => {
    const pedidoId = "pedido-123";
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: pedidoId,
    };

    const { mockTx } = setupMock(produto);

    await marcarProdutoVendido(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(mockTx.update).toHaveBeenCalled();
  });

  it("é idempotente - não falha se já está marcado como vendido", async () => {
    const pedidoId = "pedido-123";
    const produto = {
      estoqueStatus: "vendido",
      vendidoPedidoId: pedidoId,
    };

    const { mockTx } = setupMock(produto);

    await marcarProdutoVendido(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(mockTx.update).not.toHaveBeenCalled();
  });
});

describe("liberarReservaProduto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (produto: any) => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    const mockDocRef = {
      get: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });

    return { mockTx, mockDocRef };
  };

  it("libera a reserva se ela pertence ao pedido", async () => {
    const pedidoId = "pedido-123";
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: pedidoId,
    };

    const { mockTx } = setupMock(produto);

    await liberarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(mockTx.update).toHaveBeenCalled();
  });

  it("é idempotente - não faz nada se a reserva já foi liberada", async () => {
    const produto = {
      estoqueStatus: "disponivel",
      reservadoPedidoId: null,
    };

    const { mockTx } = setupMock(produto);

    await liberarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(mockTx.update).not.toHaveBeenCalled();
  });

  it("não libera se a reserva pertence a outro pedido", async () => {
    const produto = {
      estoqueStatus: "reservado",
      reservadoPedidoId: "outro-pedido",
    };

    const { mockTx } = setupMock(produto);

    await liberarReservaProduto(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(mockTx.update).not.toHaveBeenCalled();
  });
});

describe("liberarProdutoAposReembolso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const setupMock = (produto: any) => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => produto,
      }),
      update: vi.fn(),
    };

    const mockDocRef = {
      get: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue(mockDocRef),
    });

    return { mockTx, mockDocRef };
  };

  it("libera produto vendido de volta ao estoque", async () => {
    const pedidoId = "pedido-123";
    const produto = {
      estoqueStatus: "vendido",
      vendidoPedidoId: pedidoId,
    };

    const { mockTx } = setupMock(produto);

    await liberarProdutoAposReembolso(
      { collectionName: "products", produtoId: "prod-1" },
      pedidoId
    );

    expect(mockTx.update).toHaveBeenCalled();
  });

  it("é idempotente - não falha se já foi liberado", async () => {
    const produto = {
      estoqueStatus: "disponivel",
      vendidoPedidoId: null,
    };

    const { mockTx } = setupMock(produto);

    await liberarProdutoAposReembolso(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(mockTx.update).not.toHaveBeenCalled();
  });

  it("não libera se o produto foi vendido em outro pedido", async () => {
    const produto = {
      estoqueStatus: "vendido",
      vendidoPedidoId: "outro-pedido",
    };

    const { mockTx } = setupMock(produto);

    await liberarProdutoAposReembolso(
      { collectionName: "products", produtoId: "prod-1" },
      "pedido-123"
    );

    expect(mockTx.update).not.toHaveBeenCalled();
  });
});

describe("marcarMultiplosProdutosVendidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marca múltiplos produtos como vendidos (não precisa ser atômico)", async () => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          estoqueStatus: "reservado",
          reservadoPedidoId: "pedido-123",
        }),
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    await marcarMultiplosProdutosVendidos(
      [
        { collectionName: "products", produtoId: "prod-1" },
        { collectionName: "products", produtoId: "prod-2" },
      ],
      "pedido-123"
    );

    // allSettled significa que mesmo que um falhe, os outros continuam
  });
});

describe("liberarReservaMultiplosProdutos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("libera reserva de múltiplos produtos (não precisa ser atômico)", async () => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          estoqueStatus: "reservado",
          reservadoPedidoId: "pedido-123",
        }),
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    await liberarReservaMultiplosProdutos(
      [
        { collectionName: "products", produtoId: "prod-1" },
        { collectionName: "products", produtoId: "prod-2" },
      ],
      "pedido-123"
    );
  });
});

describe("liberarMultiplosProdutosAposReembolso", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("libera múltiplos produtos após reembolso (idempotente)", async () => {
    const mockTx = {
      get: vi.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          estoqueStatus: "vendido",
          vendidoPedidoId: "pedido-123",
        }),
      }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    await liberarMultiplosProdutosAposReembolso(
      [
        { collectionName: "products", produtoId: "prod-1" },
        { collectionName: "products", produtoId: "prod-2" },
      ],
      "pedido-123"
    );
  });
});

describe("renovarReservaMultiplosProdutos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renova reserva de múltiplos produtos", async () => {
    const pedidoId = "pedido-123";
    const produtos = [
      { estoqueStatus: "reservado", reservadoPedidoId: pedidoId, title: "P1" },
      { estoqueStatus: "reservado", reservadoPedidoId: pedidoId, title: "P2" },
    ];

    const mockTx = {
      get: vi.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[0],
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[1],
        }),
      update: vi.fn(),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({}),
    });

    const resultado = await renovarReservaMultiplosProdutos(
      [
        { collectionName: "products", produtoId: "prod-1" },
        { collectionName: "products", produtoId: "prod-2" },
      ],
      pedidoId
    );

    expect(resultado).not.toBeNull();
    expect(resultado?.produtos.size).toBe(2);
    expect(mockTx.update).toHaveBeenCalledTimes(2);
  });

  it("retorna null se qualquer produto não pertence ao pedido (composição mudou)", async () => {
    const produtos = [
      { estoqueStatus: "reservado", reservadoPedidoId: "pedido-123", title: "P1" },
      { estoqueStatus: "reservado", reservadoPedidoId: "outro-pedido", title: "P2" }, // mudou!
    ];

    const mockTx = {
      get: vi.fn()
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[0],
        })
        .mockResolvedValueOnce({
          exists: true,
          data: () => produtos[1],
        }),
    };

    mockDb.runTransaction.mockImplementation(async (fn: Function) => {
      return fn(mockTx);
    });

    mockDb.collection.mockReturnValue({
      doc: vi.fn().mockReturnValue({}),
    });

    const resultado = await renovarReservaMultiplosProdutos(
      [
        { collectionName: "products", produtoId: "prod-1" },
        { collectionName: "products", produtoId: "prod-2" },
      ],
      "pedido-123"
    );

    expect(resultado).toBeNull();
  });
});
