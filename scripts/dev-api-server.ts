/**
 * Servidor de API local — bypass do `vercel dev`.
 *
 * Depois de meses tentando fazer `vercel dev` + Vite conviverem no Windows
 * (ver SETUP_CHECKOUT.md, seção 8, e o relatório de handoff da branch
 * feature/checkout-pagamento), a CLI da Vercel continuou tentando subir o
 * Vite sozinho e falhando na detecção de porta (`EACCES: permission denied
 * $PORT` / `Failed to detect a server running on port ...`), mesmo com
 * `"framework": null` no vercel.json e o script `dev` renomeado para
 * `dev:vite` no package.json.
 *
 * Este script é a "opção 4" descrita no relatório: um servidor HTTP simples
 * (sem framework extra, só `node:http`) que importa os handlers de `api/*.ts`
 * diretamente e os expõe nas mesmas rotas, adaptando `req`/`res` para o
 * formato `VercelRequest`/`VercelResponse` esperado por eles. Isso elimina
 * de vez o problema de detecção de porta do `vercel dev`, ao custo de não
 * emular 100% o ambiente de produção da Vercel (sem edge runtime, sem
 * roteamento automático de pastas, etc. — mas essas rotas não usam nada
 * disso).
 *
 * Uso:
 *   npm run dev:api
 *
 * O Vite (`npm run dev:vite`) continua repassando `/api/*` para
 * `http://localhost:3000` (ver vite.config.ts), então do ponto de vista do
 * frontend nada muda.
 */

import {
  createServer,
  type IncomingMessage,
  type ServerResponse,
} from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";

// ─── Carrega .env.local manualmente (sem depender de flags do Node) ───────
const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");

function loadEnvFile(path: string): void {
  if (!existsSync(path)) return;

  const content = readFileSync(path, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;

    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(projectRoot, ".env.local"));

const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 3000;

// ─── Rotas disponíveis (mapeadas 1:1 para os arquivos em api/) ─────────────
type Handler = (
  req: VercelRequest,
  res: VercelResponse,
) => unknown | Promise<unknown>;

const routeLoaders: Record<string, () => Promise<{ default: Handler }>> = {
  "/api/calcular-frete": () => import("../api/calcular-frete.js"),
  "/api/criar-preferencia": () => import("../api/criar-preferencia.js"),
  "/api/verificar-pagamento": () => import("../api/verificar-pagamento.js"),
  "/api/webhook": () => import("../api/webhook.js"),
  "/api/cron/limpar-pedidos-expirados": () =>
    import("../api/cron/limpar-pedidos-expirados.js"),
};

// ─── Adapta IncomingMessage/ServerResponse para VercelRequest/VercelResponse ─
async function buildVercelReqRes(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<{ vReq: VercelRequest; vRes: VercelResponse }> {
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );

  const query: Record<string, string | string[]> = {};
  for (const key of url.searchParams.keys()) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }

  let body: unknown = undefined;
  if (req.method && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks).toString("utf8");
    if (raw) {
      try {
        body = JSON.parse(raw);
      } catch {
        body = raw;
      }
    } else {
      body = {};
    }
  }

  const vReq = req as unknown as VercelRequest;
  Object.assign(vReq, { query, body, cookies: {} });

  const vRes = res as unknown as VercelResponse;
  Object.assign(vRes, {
    status(code: number) {
      res.statusCode = code;
      return vRes;
    },
    json(data: unknown) {
      if (!res.getHeader("Content-Type")) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(data));
      return vRes;
    },
    send(data: unknown) {
      res.end(typeof data === "string" ? data : JSON.stringify(data));
      return vRes;
    },
  });

  return { vReq, vRes };
}

// ─── Servidor ───────────────────────────────────────────────────────────────
const server = createServer(async (req, res) => {
  const url = new URL(
    req.url ?? "/",
    `http://${req.headers.host ?? "localhost"}`,
  );
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  const loader = routeLoaders[pathname];

  if (!loader) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Rota não encontrada", pathname }));
    return;
  }

  try {
    const { default: handler } = await loader();
    const { vReq, vRes } = await buildVercelReqRes(req, res);
    await handler(vReq, vRes);
  } catch (error) {
    console.error(`[dev-api-server] Erro ao processar ${pathname}:`, error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error: "Erro interno no servidor de API local",
          details: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
});

server.listen(PORT, () => {
  console.log(
    `[dev-api-server] ✅ API local rodando em http://localhost:${PORT}`,
  );
  console.log(
    `[dev-api-server] Rotas disponíveis: ${Object.keys(routeLoaders).join(", ")}`,
  );
});
