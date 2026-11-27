import type { Product } from "@/hooks/useProdutos";
import { precoEmReais } from "@/lib/preco";

export type ProdutoEmPromocao = Product & { descontoPct: number };

function comDesconto(p: Product): ProdutoEmPromocao {
  const antigo = precoEmReais(p.discount ?? "");
  const pct = antigo ? Math.round((1 - precoEmReais(p.price) / antigo) * 100) : 0;
  return { ...p, descontoPct: pct > 0 && pct < 100 ? pct : 0 };
}

/**
 * Figures do destaque de promoções. Com `escolhidas` (ids salvos no painel), usa essas, na ordem, pulando
 * as que não existem mais ou estão indisponíveis. Sem escolha: até `max` com maior % de desconto.
 */
export function figuresEmPromocao(produtos: Product[], escolhidas: string[] = [], max = 3): ProdutoEmPromocao[] {
  const disponiveis = produtos.filter((p) => p.source === "products" && p.inStock?.toLowerCase() !== "indisponível");
  if (escolhidas.length) {
    return escolhidas
      .map((id) => disponiveis.find((p) => p.id === id))
      .filter((p): p is Product => !!p)
      .slice(0, max)
      .map(comDesconto);
  }
  return disponiveis
    .map(comDesconto)
    .filter((p) => p.descontoPct > 0)
    .sort((a, b) => b.descontoPct - a.descontoPct)
    .slice(0, max);
}
