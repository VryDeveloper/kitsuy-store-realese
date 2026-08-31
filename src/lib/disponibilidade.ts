import { Timestamp } from "firebase/firestore";

/**
 * Calcula a disponibilidade "ao vivo" de um produto no cliente, espelhando a
 * mesma lógica de `reservarProduto()` em api/_lib/estoque.ts — sem isso, o
 * campo `inStock` salvo no Firestore fica "indisponível" travado até
 * alguém tentar comprar de novo (o que reclama a reserva vencida dentro da
 * transação do backend) ou o cron passar. Um visitante só navegando nunca
 * dispara nenhum dos dois, então via de regra o produto continuaria
 * aparecendo indisponível bem depois do prazo da reserva já ter vencido.
 *
 * Calculando aqui a partir de `estoqueStatus`/`reservadoAte` em vez de
 * confiar cegamente no `inStock` salvo, a disponibilidade se autocorrige no
 * instante em que o prazo vence, sem depender de nenhum gatilho.
 */
export function inStockAoVivo(produto: {
  estoqueStatus?: string;
  inStock?: string;
  reservadoAte?: Timestamp | null;
}): string {
  const { estoqueStatus, inStock, reservadoAte } = produto;

  if (estoqueStatus === "reservado") {
    const reservaExpirada = !!reservadoAte && reservadoAte.toMillis() < Date.now();
    return reservaExpirada ? "disponível" : "indisponível";
  }

  if (estoqueStatus === "vendido") {
    return "indisponível";
  }

  // "disponivel" ou produto legado sem estoqueStatus — cai no inStock salvo.
  return inStock ?? "disponível";
}
