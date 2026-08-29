/**
 * Persiste, por aba (sessionStorage), o pedidoId da reserva de estoque em
 * andamento para um carrinho (chave = ids dos produtos, ordenados e
 * concatenados — ver chaveCarrinho()). Sem isso, voltar/recarregar a página
 * de checkout gera um pedidoId novo a cada tentativa e o backend passa a
 * enxergar o próprio cliente como um comprador concorrente — bloqueando a
 * compra até a reserva anterior expirar. Com o pedidoId salvo, o backend
 * (renovarReservaMultiplosProdutos em api/_lib/estoque.ts) reconhece que é o
 * dono da reserva e apenas a renova.
 */
const chave = (chaveCarrinhoOuProduto: string) =>
  `kitsuy_checkout_pedido_${chaveCarrinhoOuProduto}`;

/** Chave estável pro carrinho atual — mesmo conjunto de produtos, mesma chave, independente da ordem em que foram adicionados. */
export function chaveCarrinho(produtoIds: string[]): string {
  return [...produtoIds].sort().join(",");
}

export function getPedidoReservado(chaveCarrinhoOuProduto: string): string | null {
  try {
    return sessionStorage.getItem(chave(chaveCarrinhoOuProduto));
  } catch {
    return null;
  }
}

export function salvarPedidoReservado(
  chaveCarrinhoOuProduto: string,
  pedidoId: string,
): void {
  try {
    sessionStorage.setItem(chave(chaveCarrinhoOuProduto), pedidoId);
  } catch {
    // sessionStorage indisponível (ex: modo privado) — sem persistência,
    // cada tentativa volta a criar uma reserva nova, como antes desta feature
  }
}
