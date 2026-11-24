import { getAuth, type DecodedIdToken } from "firebase-admin/auth";
import type { VercelRequest } from "@vercel/node";
import "./firebase-admin.js"; // garante o initializeApp antes do getAuth

/**
 * Lê o header `Authorization: Bearer <idToken>` do Firebase Auth e confere
 * a assinatura com o Admin SDK. Devolve null se não houver token ou se ele
 * for inválido/expirado — quem chama decide se isso é erro (meus-pedidos)
 * ou só "compra sem conta" (criar-preferencia).
 */
export async function usuarioDoToken(
  req: VercelRequest,
): Promise<DecodedIdToken | null> {
  const header = req.headers.authorization ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  if (!token) return null;

  try {
    return await getAuth().verifyIdToken(token);
  } catch {
    return null;
  }
}
