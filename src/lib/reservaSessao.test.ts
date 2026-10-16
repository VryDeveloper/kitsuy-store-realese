import { describe, it, expect, beforeEach } from "vitest";
import { chaveCarrinho, getPedidoReservado, salvarPedidoReservado } from "./reservaSessao";

const SESSION_STORAGE_PREFIX = "kitsuy_checkout_pedido_";

describe("reservaSessao", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  describe("chaveCarrinho", () => {
    it("retorna a mesma chave para IDs na mesma ordem", () => {
      const ids1 = ["prod1", "prod2", "prod3"];
      const ids2 = ["prod1", "prod2", "prod3"];

      expect(chaveCarrinho(ids1)).toBe(chaveCarrinho(ids2));
    });

    it("retorna a mesma chave para IDs em ordens diferentes", () => {
      const ids1 = ["prod1", "prod2", "prod3"];
      const ids2 = ["prod3", "prod1", "prod2"];

      expect(chaveCarrinho(ids1)).toBe(chaveCarrinho(ids2));
    });

    it("retorna chaves diferentes para conjuntos diferentes de IDs", () => {
      const ids1 = ["prod1", "prod2"];
      const ids2 = ["prod1", "prod2", "prod3"];

      expect(chaveCarrinho(ids1)).not.toBe(chaveCarrinho(ids2));
    });

    it("retorna uma string com IDs ordenados e separados por vírgula", () => {
      const ids = ["c", "a", "b"];
      const resultado = chaveCarrinho(ids);

      expect(resultado).toBe("a,b,c");
    });

    it("funciona com um único ID", () => {
      const ids = ["prod1"];
      const resultado = chaveCarrinho(ids);

      expect(resultado).toBe("prod1");
    });

    it("funciona com array vazio", () => {
      const ids: string[] = [];
      const resultado = chaveCarrinho(ids);

      expect(resultado).toBe("");
    });

    it("preserva a estabilidade da chave entre múltiplas chamadas", () => {
      const ids = ["z", "a", "m"];
      const chave1 = chaveCarrinho(ids);
      const chave2 = chaveCarrinho(ids);
      const chave3 = chaveCarrinho(ids);

      expect(chave1).toBe(chave2);
      expect(chave2).toBe(chave3);
    });
  });

  describe("salvarPedidoReservado", () => {
    it("salva o pedidoId no sessionStorage", () => {
      const chave = "prod1,prod2";
      const pedidoId = "pedido-123";

      salvarPedidoReservado(chave, pedidoId);

      const salvo = sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${chave}`);
      expect(salvo).toBe(pedidoId);
    });

    it("sobrescreve um pedidoId anterior", () => {
      const chave = "prod1,prod2";

      salvarPedidoReservado(chave, "pedido-1");
      expect(sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${chave}`)).toBe("pedido-1");

      salvarPedidoReservado(chave, "pedido-2");
      expect(sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}${chave}`)).toBe("pedido-2");
    });

    it("permite salvar múltiplos pedidos para chaves diferentes", () => {
      salvarPedidoReservado("prod1,prod2", "pedido-123");
      salvarPedidoReservado("prod3,prod4", "pedido-456");

      expect(sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}prod1,prod2`)).toBe("pedido-123");
      expect(sessionStorage.getItem(`${SESSION_STORAGE_PREFIX}prod3,prod4`)).toBe("pedido-456");
    });

    it("não falha quando sessionStorage indisponível", () => {
      const originalSetItem = sessionStorage.setItem;
      sessionStorage.setItem = () => {
        throw new Error("Simulated error");
      };

      expect(() => {
        salvarPedidoReservado("prod1", "pedido-123");
      }).not.toThrow();

      sessionStorage.setItem = originalSetItem;
    });

    it("usa a chave correta no sessionStorage", () => {
      const chaveCarrinhoProdutos = chaveCarrinho(["z", "a", "b"]);
      salvarPedidoReservado(chaveCarrinhoProdutos, "pedido-abc");

      const chaveEsperada = `${SESSION_STORAGE_PREFIX}${chaveCarrinhoProdutos}`;
      expect(sessionStorage.getItem(chaveEsperada)).toBe("pedido-abc");
    });
  });

  describe("getPedidoReservado", () => {
    it("retorna o pedidoId salvo", () => {
      const chave = "prod1,prod2";
      const pedidoId = "pedido-123";

      salvarPedidoReservado(chave, pedidoId);
      const resultado = getPedidoReservado(chave);

      expect(resultado).toBe(pedidoId);
    });

    it("retorna null quando nenhum pedido foi salvo para a chave", () => {
      const resultado = getPedidoReservado("prod-inexistente");

      expect(resultado).toBeNull();
    });

    it("retorna null após o sessionStorage ser limpo", () => {
      const chave = "prod1,prod2";
      salvarPedidoReservado(chave, "pedido-123");

      sessionStorage.clear();
      const resultado = getPedidoReservado(chave);

      expect(resultado).toBeNull();
    });

    it("recupera o pedidoId correto mesmo com múltiplas chaves salvas", () => {
      salvarPedidoReservado("prod1,prod2", "pedido-123");
      salvarPedidoReservado("prod3,prod4", "pedido-456");
      salvarPedidoReservado("prod5", "pedido-789");

      expect(getPedidoReservado("prod1,prod2")).toBe("pedido-123");
      expect(getPedidoReservado("prod3,prod4")).toBe("pedido-456");
      expect(getPedidoReservado("prod5")).toBe("pedido-789");
    });

    it("não falha quando sessionStorage indisponível", () => {
      const originalGetItem = sessionStorage.getItem;
      sessionStorage.getItem = () => {
        throw new Error("Simulated error");
      };

      const resultado = getPedidoReservado("prod1");
      expect(resultado).toBeNull();

      sessionStorage.getItem = originalGetItem;
    });

    it("retorna o valor exato como foi salvo (sem transformação)", () => {
      const chave = "teste";
      const pedidoId = "pedido-com-caracteres-especiais-123!@#";

      salvarPedidoReservado(chave, pedidoId);
      const resultado = getPedidoReservado(chave);

      expect(resultado).toBe(pedidoId);
    });
  });

  describe("fluxo de checkout com renovação de reserva", () => {
    it("mantém o mesmo pedidoId ao recarregar a página", () => {
      const idsCarrinho = chaveCarrinho(["prod1", "prod2"]);
      const pedidoId = "pedido-original";

      salvarPedidoReservado(idsCarrinho, pedidoId);

      const recuperado = getPedidoReservado(idsCarrinho);
      expect(recuperado).toBe(pedidoId);
    });

    it("permite alternar entre carrinho de tamanhos diferentes sem conflitos", () => {
      const idsCarrinho1 = chaveCarrinho(["prod1"]);
      const idsCarrinho2 = chaveCarrinho(["prod1", "prod2"]);

      salvarPedidoReservado(idsCarrinho1, "pedido-carrinho-1");
      salvarPedidoReservado(idsCarrinho2, "pedido-carrinho-2");

      expect(getPedidoReservado(idsCarrinho1)).toBe("pedido-carrinho-1");
      expect(getPedidoReservado(idsCarrinho2)).toBe("pedido-carrinho-2");
    });

    it("trata carrinho com mesmos produtos em ordens diferentes como um", () => {
      const ordem1 = chaveCarrinho(["prod1", "prod2", "prod3"]);
      const ordem2 = chaveCarrinho(["prod3", "prod1", "prod2"]);

      salvarPedidoReservado(ordem1, "pedido-123");

      expect(getPedidoReservado(ordem2)).toBe("pedido-123");
    });
  });
});
