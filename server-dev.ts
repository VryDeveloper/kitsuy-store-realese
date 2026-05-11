// server-dev.ts — servidor local para testar as Vercel Functions
import 'dotenv/config';
import { config } from 'dotenv';
import { resolve } from 'path';

// Carrega .env.local (tem prioridade sobre .env)
config({ path: resolve(process.cwd(), '.env.local'), override: true });

import http from 'http';
import type { IncomingMessage, ServerResponse } from 'http';

// Simula VercelRequest
function createVercelReq(req: IncomingMessage, body: unknown, url: URL) {
  const query: Record<string, string> = {};
  url.searchParams.forEach((v, k) => { query[k] = v; });
  return Object.assign(req, { body, query });
}

// Simula VercelResponse — sem recursão no end()
function createVercelRes(res: ServerResponse) {
  const extraHeaders: Record<string, string> = {};
  let statusCode = 200;

  const vRes = {
    statusCode,
    status(code: number) {
      statusCode = code;
      res.statusCode = code;
      return vRes;
    },
    setHeader(key: string, value: string) {
      extraHeaders[key] = value;
      res.setHeader(key, value);
      return vRes;
    },
    json(data: unknown) {
      res.statusCode = statusCode;
      Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));   // chama o end() ORIGINAL do Node
      return vRes;
    },
    end(data?: string) {
      res.statusCode = statusCode;
      Object.entries(extraHeaders).forEach(([k, v]) => res.setHeader(k, v));
      res.end(data);                   // chama o end() ORIGINAL do Node
      return vRes;
    },
    // encadeia com status()
    get headers() { return extraHeaders; },
  };

  return vRes;
}

// Servidor HTTP
const server = http.createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const rawUrl = req.url ?? '/';
  const url = new URL(rawUrl, `http://localhost`);

  // Ler body
  let body: unknown = {};
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const raw = Buffer.concat(chunks).toString();
    try { body = JSON.parse(raw); } catch { body = {}; }
  }

  const vReq = createVercelReq(req, body, url);
  const vRes = createVercelRes(res);

  console.log(`[${new Date().toISOString()}] ${req.method} ${rawUrl}`);

  try {
    const apiPath = url.pathname.replace('/api/', '');
    const filePath = resolve(process.cwd(), 'api', `${apiPath}.ts`);
    
    // Se o arquivo existe na pasta api/, tenta carregar
    try {
      // Importa dinamicamente a função da API
      const mod = await import(`./api/${apiPath}.js`);
      await mod.default(vReq as never, vRes as never);
      return;
    } catch (e) {
      console.warn(`[server-dev] Rota /api/${apiPath} não encontrada ou erro no arquivo.`);
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: `Rota não encontrada: ${rawUrl}` }));
    }
  } catch (err) {
    console.error('[server-dev] Erro não tratado:', err);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Erro interno do servidor' }));
    }
  }
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`\n✅ Backend local rodando em http://localhost:${PORT}`);
  console.log(`   POST http://localhost:${PORT}/api/create-payment`);
  console.log(`   POST http://localhost:${PORT}/api/webhook\n`);
});