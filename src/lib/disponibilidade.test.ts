import { describe, it, expect } from "vitest";
import { inStockAoVivo } from "./disponibilidade";
import { Timestamp } from "firebase/firestore";

describe("inStockAoVivo", () => {
  describe("quando estoqueStatus é 'reservado'", () => {
    it("retorna 'indisponível' quando reserva ainda está válida", () => {
      const futuro = new Date(Date.now() + 30 * 60 * 1000);
      const produto = {
        estoqueStatus: "reservado",
        reservadoAte: Timestamp.fromDate(futuro),
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });

    it("retorna 'disponível' quando reserva expirou", () => {
      const passado = new Date(Date.now() - 1 * 60 * 1000);
      const produto = {
        estoqueStatus: "reservado",
        reservadoAte: Timestamp.fromDate(passado),
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("disponível");
    });

    it("retorna 'indisponível' quando estoqueStatus é reservado mas sem reservadoAte", () => {
      const produto = {
        estoqueStatus: "reservado",
        reservadoAte: null,
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });

    it("retorna 'indisponível' quando estoqueStatus é reservado e reservadoAte é undefined", () => {
      const produto = {
        estoqueStatus: "reservado",
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });
  });

  describe("quando estoqueStatus é 'vendido'", () => {
    it("sempre retorna 'indisponível'", () => {
      const produto = {
        estoqueStatus: "vendido",
        inStock: "disponível",
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });

    it("retorna 'indisponível' mesmo com reservadoAte expirado", () => {
      const passado = new Date(Date.now() - 1 * 60 * 1000);
      const produto = {
        estoqueStatus: "vendido",
        reservadoAte: Timestamp.fromDate(passado),
        inStock: "disponível",
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });
  });

  describe("quando estoqueStatus é 'disponível' ou legado", () => {
    it("retorna o inStock salvo quando estoqueStatus é 'disponível'", () => {
      const produto = {
        estoqueStatus: "disponível",
        inStock: "indisponível",
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });

    it("retorna o inStock salvo quando estoqueStatus é undefined", () => {
      const produto = {
        inStock: "disponível",
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("disponível");
    });

    it("retorna 'disponível' quando inStock é undefined", () => {
      const produto = {
        estoqueStatus: "disponível",
        inStock: undefined,
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("disponível");
    });

    it("retorna 'disponível' como padrão quando nenhum campo está definido", () => {
      const produto = {};

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("disponível");
    });
  });

  describe("edge cases", () => {
    it("retorna 'indisponível' quando reserva não expirou ainda (timestamp igual)", () => {
      const agora = Date.now();
      const produto = {
        estoqueStatus: "reservado",
        reservadoAte: Timestamp.fromMillis(agora),
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });

    it("retorna 'indisponível' um milissegundo antes da expiração", () => {
      const futuro = Date.now() + 1;
      const produto = {
        estoqueStatus: "reservado",
        reservadoAte: Timestamp.fromMillis(futuro),
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("indisponível");
    });

    it("funciona com produto objeto vazio", () => {
      const produto = {};
      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("disponível");
    });

    it("ignora inStock quando estoqueStatus é 'reservado' ou 'vendido'", () => {
      const passado = new Date(Date.now() - 1 * 60 * 1000);
      const produto = {
        estoqueStatus: "reservado",
        inStock: "disponível",
        reservadoAte: Timestamp.fromDate(passado),
      };

      const resultado = inStockAoVivo(produto);
      expect(resultado).toBe("disponível");
    });
  });
});
