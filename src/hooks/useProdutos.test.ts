import { describe, expect, it } from "vitest";
import { ordenarProdutos, type Product } from "./useProdutos";

const p = (id: string, inStock: string, displayOrder?: number) =>
  ({ id, inStock, displayOrder }) as Product;

describe("ordenarProdutos", () => {
  it("põe indisponíveis no fim e respeita displayOrder", () => {
    const ordem = ordenarProdutos([
      p("a", "indisponível", 1),
      p("b", "disponível"),
      p("c", "disponível", 2),
      p("d", "disponível", 1),
    ]).map((x) => x.id);
    expect(ordem).toEqual(["d", "c", "b", "a"]);
  });
});
