import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

/**
 * Firebase Admin SDK — SOMENTE BACKEND.
 *
 * Este arquivo nunca deve ser importado por código que roda no navegador
 * (nada dentro de src/ deve importar daqui). Ele usa credenciais de service
 * account que dão acesso total ao Firestore, ignorando as regras de
 * segurança do client SDK.
 */

if (
  !process.env.FIREBASE_PROJECT_ID ||
  !process.env.FIREBASE_CLIENT_EMAIL ||
  !process.env.FIREBASE_PRIVATE_KEY
) {
  throw new Error(
    "Firebase Admin: variáveis de ambiente ausentes. Verifique FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL e FIREBASE_PRIVATE_KEY.",
  );
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // A chave privada vem com \n escapados nas variáveis de ambiente
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    }),
  });
}

export const db = getFirestore();
