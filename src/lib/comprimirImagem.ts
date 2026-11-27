/**
 * Reduz a foto no navegador antes do upload: lado maior até `max` px, em webp
 * (jpeg se o navegador não gerar webp). Foto já pequena e leve passa intacta.
 */
export async function comprimirImagem(arquivo: File, max = 1920, qualidade = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  if (escala === 1 && arquivo.size < 300 * 1024) return arquivo;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * escala);
  canvas.height = Math.round(bitmap.height * escala);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const gerar = (tipo: string) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, qualidade));
  const webp = await gerar("image/webp");
  const blob = webp?.type === "image/webp" ? webp : await gerar("image/jpeg");
  if (!blob) throw new Error("Não foi possível comprimir a imagem");
  return blob.size < arquivo.size ? blob : arquivo;
}
