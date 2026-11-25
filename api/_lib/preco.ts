/**
 * O preço dos produtos é guardado no Firestore como texto formatado
 * ("R$ 1.260,00"). Converte para centavos — NaN se o texto não tiver número.
 */
export function precoEmCentavos(price: unknown): number {
  const emReais = parseFloat(
    String(price)
      .replace(/[^\d,]/g, "")
      .replace(",", "."),
  );
  return Math.round(emReais * 100);
}
