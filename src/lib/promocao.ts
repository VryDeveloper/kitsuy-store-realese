import type { Product } from "@/hooks/useProdutos";
import { precoEmReais } from "@/lib/preco";

export type ProdutoEmPromocao = Product & { descontoPct: number };

/** Até `max` figures de pronta entrega disponíveis, do maior para o menor % de desconto. */
export function figuresEmPromocao(produtos: Product[], max = 3): ProdutoEmPromocao[] {
  return produtos
    .filter((p) => p.source === "products" && p.inStock?.toLowerCase() !== "indisponível")
    .map((p) => {
      const antigo = precoEmReais(p.discount ?? "");
      return { ...p, descontoPct: antigo ? Math.round((1 - precoEmReais(p.price) / antigo) * 100) : 0 };
    })
    .filter((p) => p.descontoPct > 0 && p.descontoPct < 100)
    .sort((a, b) => b.descontoPct - a.descontoPct)
    .slice(0, max);
}
