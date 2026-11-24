import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Criptografia de campos sensíveis (CPF, telefone) antes de gravar no
 * Firestore. O Google já criptografa o disco; esta camada protege contra
 * vazamento pelo próprio banco (regra mal configurada, export, acesso ao
 * console): sem a chave, que só existe na Vercel, o dado é ilegível.
 *
 * AES-256-GCM (autenticado: detecta adulteração), IV aleatório por valor.
 * Formato: "enc:v1:" + base64(iv[12] + tag[16] + texto cifrado).
 * O "v1" deixa trocar de chave/algoritmo no futuro sem perder os antigos.
 */

const PREFIXO = "enc:v1:";

function chave(): Buffer {
  const k = Buffer.from(process.env.DADOS_CHAVE_CRIPTO ?? "", "base64");
  if (k.length !== 32) {
    throw new Error("DADOS_CHAVE_CRIPTO ausente ou inválida (precisa de 32 bytes em base64)");
  }
  return k;
}

export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", chave(), iv);
  const cifrado = Buffer.concat([c.update(texto, "utf8"), c.final()]);
  return PREFIXO + Buffer.concat([iv, c.getAuthTag(), cifrado]).toString("base64");
}

export function decifrar(valor: string): string {
  // Pedidos gravados antes desta mudança continuam em texto puro.
  if (!valor.startsWith(PREFIXO)) return valor;
  const buf = Buffer.from(valor.slice(PREFIXO.length), "base64");
  const d = createDecipheriv("aes-256-gcm", chave(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}
