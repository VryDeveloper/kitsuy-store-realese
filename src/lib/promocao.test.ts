import { describe, expect, it } from "vitest";
import { figuresEmPromocao } from "./promocao";
import type { Product } from "@/hooks/useProdutos";

const p = (id: string, price: string, discount: string, extra: Partial<Product> = {}): Product => ({
  id, title: id, price, discount, image: "", inStock: "disponível", source: "products", ...extra,
});

describe("figuresEmPromocao", () => {
  it("pega as 3 com maior desconto, só disponíveis e de pronta entrega", () => {
    const lista = [
      p("10pct", "R$ 900,00", "R$ 1.000,00"),
      p("50pct", "R$ 500,00", "R$ 1.000,00"),
      p("30pct", "R$ 700,00", "R$ 1.000,00"),
      p("20pct", "R$ 800,00", "R$ 1.000,00"),
      p("esgotada", "R$ 100,00", "R$ 1.000,00", { inStock: "indisponível" }),
      p("encomenda", "R$ 100,00", "R$ 1.000,00", { source: "masterpiece" }),
      p("semDesconto", "R$ 100,00", ""),
      p("antigoMenor", "R$ 1.000,00", "R$ 900,00"),
    ];
    expect(figuresEmPromocao(lista).map((x) => [x.id, x.descontoPct])).toEqual([
      ["50pct", 50],
      ["30pct", 30],
      ["20pct", 20],
    ]);
  });
});
