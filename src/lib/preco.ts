/** Preço guardado como texto ("R$ 1.260,00") → número em reais (0 se não tiver número). */
export function precoEmReais(preco: string): number {
  return parseFloat(preco.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
}

export function formatarMoeda(reais: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(reais);
}
