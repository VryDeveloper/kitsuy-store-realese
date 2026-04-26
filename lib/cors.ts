import type { VercelRequest, VercelResponse } from '@vercel/node';

const ALLOWED_ORIGINS = [
  process.env.VITE_SITE_URL || 'http://localhost:8081',
  'http://localhost:8081',
  'http://localhost:5173',
  'https://kitsuy-store.vercel.app',
  'https://kitsuy-store-realese.vercel.app',
];

export function setCORSHeaders(req: VercelRequest, res: VercelResponse): void {
  const origin = req.headers.origin ?? '';
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Trata preflight OPTIONS e seta headers CORS.
 * Retorna true se a request era OPTIONS (já respondida) e o handler deve sair.
 */
export function handleCORS(req: VercelRequest, res: VercelResponse): boolean {
  setCORSHeaders(req, res);
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
