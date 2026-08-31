import type { VercelRequest, VercelResponse } from "@vercel/node";

/**
 * Origens permitidas para chamar as rotas de API.
 * VITE_SITE_URL cobre o domínio de produção configurado nas envs da Vercel.
 */
const ALLOWED_ORIGINS = [
  process.env.VITE_SITE_URL,
  "http://localhost:8081",
  "http://localhost:5173",
  "https://kitsuy-store.vercel.app",
  "https://kitsuy-store-realese.vercel.app",
].filter(Boolean) as string[];

export function setCORSHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin ?? "";
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Max-Age", "86400");
}

/**
 * Trata preflight OPTIONS e seta os headers CORS.
 * Retorna true se a request era OPTIONS (já respondida) — o handler deve
 * encerrar a execução imediatamente quando isso acontecer.
 */
export function handleCORS(req: VercelRequest, res: VercelResponse): boolean {
  setCORSHeaders(req, res);
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
