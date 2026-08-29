/**
 * Script de calibração manual da API da SuperFrete.
 *
 * Criado para investigar duas dúvidas que a documentação oficial
 * (https://superfrete.readme.io/reference/cotacao-de-frete) não esclarece:
 *
 * 1. Se `price - discount` (fórmula usada hoje em api/calcular-frete.ts)
 *    ainda é a forma certa de chegar no valor "com desconto" mostrado pro
 *    usuário logado na calculadora oficial do site, ou se `price` sozinho já
 *    é esse valor.
 * 2. O quanto `use_insurance_value: true` (adicionado em
 *    api/_lib/frete-consolidado.ts) muda o preço na prática, comparado com
 *    não enviar seguro nenhum (comportamento antigo).
 *
 * Faz DUAS cotações reais pro mesmo pacote — uma sem seguro (replica o
 * comportamento antigo) e uma com seguro no valor informado (comportamento
 * novo) — e imprime os dois resultados lado a lado. Rode isso e compare os
 * números com a calculadora oficial (https://www.superfrete.com/calculadora)
 * usando o MESMO CEP de origem/destino, dimensões e valor declarado.
 *
 * Uso:
 *   npx tsx scripts/testar-frete-superfrete.ts <cepDestino> [valorDeclaradoReais] [pesoKg] [alturaCm] [larguraCm] [comprimentoCm]
 *
 * Exemplo (caixa "Única" padrão, produto de R$150):
 *   npx tsx scripts/testar-frete-superfrete.ts 01310100 150
 *
 * Lê SUPERFRETE_TOKEN e LOJA_CEP_ORIGEM de .env.local (mesmo mecanismo do
 * scripts/dev-api-server.ts).
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ─── Carrega .env.local manualmente (mesmo padrão de scripts/dev-api-server.ts) ───
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

// ─── Argumentos ─────────────────────────────────────────────────────────────
const [, , cepDestinoArg, valorDeclaradoArg, pesoArg, alturaArg, larguraArg, comprimentoArg] =
  process.argv;

if (!cepDestinoArg) {
  console.error(
    "Uso: npx tsx scripts/testar-frete-superfrete.ts <cepDestino> [valorDeclaradoReais] [pesoKg] [alturaCm] [larguraCm] [comprimentoCm]",
  );
  process.exit(1);
}

const cepDestino = cepDestinoArg.replace(/\D/g, "");
const valorDeclaradoReais = Number(valorDeclaradoArg ?? "150");
// Padrão = caixa "Única" definida em api/_lib/frete-consolidado.ts (CAIXAS_DISPONIVEIS)
const pesoKg = Number(pesoArg ?? "1");
const alturaCm = Number(alturaArg ?? "20");
const larguraCm = Number(larguraArg ?? "20");
const comprimentoCm = Number(comprimentoArg ?? "30");

const cepOrigem = (process.env.LOJA_CEP_ORIGEM ?? "").replace(/\D/g, "");
const token = process.env.SUPERFRETE_TOKEN;

if (!token || !cepOrigem) {
  console.error(
    "SUPERFRETE_TOKEN e/ou LOJA_CEP_ORIGEM ausentes em .env.local — confira o arquivo antes de rodar.",
  );
  process.exit(1);
}

// Mesmos códigos usados hoje em api/_lib/frete-consolidado.ts (SERVICOS_COTADOS)
const SERVICOS = "1,2,3,31,33";

interface CotacaoSuperFrete {
  id: string | number;
  name: string;
  price?: number;
  discount?: string | number;
  delivery_time?: number;
  has_error?: boolean;
  error?: string;
  company?: { name?: string };
}

async function cotar(useInsurance: boolean): Promise<CotacaoSuperFrete[]> {
  const payload = {
    from: { postal_code: cepOrigem },
    to: { postal_code: cepDestino },
    package: {
      height: alturaCm,
      width: larguraCm,
      length: comprimentoCm,
      weight: pesoKg,
    },
    services: SERVICOS,
    options: {
      insurance_value: useInsurance ? valorDeclaradoReais : 0,
      use_insurance_value: useInsurance,
      receipt: false,
      own_hand: false,
    },
  };

  console.log(
    `\n── Requisição (${useInsurance ? "COM seguro" : "SEM seguro"}) ──`,
  );
  console.log(JSON.stringify(payload, null, 2));

  const response = await fetch("https://api.superfrete.com/api/v0/calculator", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Type": "shipper",
      // A doc pede um User-Agent identificando app/versão/contato — sem isso
      // algumas contas recebem respostas degradadas ou bloqueio de rate limit.
      "User-Agent": "kitsuy-store-teste-manual (contato: kitsuystore@gmail.com)",
    },
    body: JSON.stringify(payload),
  });

  const raw = await response.text();

  if (!response.ok) {
    console.error(`Erro HTTP ${response.status}:`, raw);
    return [];
  }

  let cotacoes: CotacaoSuperFrete[];
  try {
    cotacoes = JSON.parse(raw);
  } catch {
    console.error("Resposta não é JSON válido:", raw);
    return [];
  }

  console.log(`\n── Resposta crua (${useInsurance ? "COM seguro" : "SEM seguro"}) ──`);
  console.log(JSON.stringify(cotacoes, null, 2));

  return cotacoes;
}

function imprimirTabela(titulo: string, cotacoes: CotacaoSuperFrete[]): void {
  console.log(`\n=== ${titulo} ===`);
  if (cotacoes.length === 0) {
    console.log("(nenhuma cotação retornada)");
    return;
  }

  for (const c of cotacoes) {
    const price = Number(c.price ?? 0);
    const discount = Number(c.discount ?? 0);
    const disponivel = !c.has_error && !c.error;

    console.log(
      `${(c.company?.name ?? c.name ?? "?").padEnd(12)} | disponível=${disponivel ? "sim" : "NÃO"} | price=${price.toFixed(2)} | discount=${discount.toFixed(2)} | price-discount=${(price - discount).toFixed(2)} | price+discount=${(price + discount).toFixed(2)} | prazo=${c.delivery_time ?? "?"}d${c.error ? ` | erro="${c.error}"` : ""}`,
    );
  }
}

async function main() {
  console.log("Parâmetros:", {
    cepOrigem,
    cepDestino,
    valorDeclaradoReais,
    pesoKg,
    alturaCm,
    larguraCm,
    comprimentoCm,
    servicos: SERVICOS,
  });

  const semSeguro = await cotar(false);
  const comSeguro = await cotar(true);

  imprimirTabela("SEM seguro (comportamento antigo, antes desta correção)", semSeguro);
  imprimirTabela(
    `COM seguro de R$ ${valorDeclaradoReais.toFixed(2)} (comportamento novo)`,
    comSeguro,
  );

  console.log(
    "\nAgora compare a tabela 'COM seguro' acima com o resultado da calculadora oficial " +
      "(https://www.superfrete.com/calculadora) usando o MESMO CEP de origem, CEP de destino, " +
      "dimensões e valor declarado. Se o valor mostrado no site bater com a coluna " +
      "'price-discount', a fórmula atual do código (price - discount) continua certa. Se bater " +
      "com 'price' puro (discount = 0 na prática) ou com 'price+discount', me avise qual coluna " +
      "bateu que eu ajusto api/calcular-frete.ts.",
  );
}

main().catch((error) => {
  console.error("Erro ao executar o teste:", error);
  process.exit(1);
});
