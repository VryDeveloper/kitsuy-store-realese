/**
 * Funções centralizadas para chamar as rotas do backend.
 * Todo fetch relacionado ao checkout passa por aqui.
 */

const BASE = ""; // rotas relativas — funciona em qualquer ambiente (dev/prod)

async function parseErro(res: Response, fallback: string): Promise<never> {
  let mensagem = fallback;
  try {
    const data = await res.json();
    mensagem = data.error || fallback;
  } catch {
    // resposta sem JSON — mantém a mensagem padrão
  }
  throw new Error(mensagem);
}

export async function calcularFrete(cep: string, produtoId: string) {
  const res = await fetch(
    `${BASE}/api/calcular-frete?cep=${encodeURIComponent(cep)}&produtoId=${encodeURIComponent(produtoId)}`,
  );
  if (!res.ok) return parseErro(res, "Erro ao calcular frete");
  return res.json();
}

interface CriarPreferenciaPayload {
  produtoId: string;
  freteEscolhido: {
    id: string;
    transportadora: string;
    prazoEmDias: number;
    valorEmCentavos: number;
  };
  cliente: {
    nome: string;
    email: string;
    telefone: string;
    cpf: string;
  };
  endereco: {
    cep: string;
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    uf: string;
  };
}

export async function criarPreferencia(dados: CriarPreferenciaPayload) {
  const res = await fetch(`${BASE}/api/criar-preferencia`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!res.ok) return parseErro(res, "Erro ao criar preferência de pagamento");
  return res.json();
}

export async function verificarPagamento(pedidoId: string) {
  const res = await fetch(
    `${BASE}/api/verificar-pagamento?pedidoId=${encodeURIComponent(pedidoId)}`,
  );
  if (!res.ok) return parseErro(res, "Pedido não encontrado");
  return res.json();
}

/**
 * Busca endereço pelo CEP usando a API gratuita ViaCEP.
 * Não expõe nenhuma credencial — API pública.
 */
export async function buscarEnderecoPorCEP(cep: string) {
  const cepLimpo = cep.replace(/\D/g, "");

  if (cepLimpo.length !== 8) {
    throw new Error("CEP inválido");
  }

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);

  if (!res.ok) {
    throw new Error("Erro ao buscar CEP");
  }

  const data = await res.json();

  if (data.erro) {
    throw new Error("CEP não encontrado");
  }

  return {
    logradouro: data.logradouro as string,
    bairro: data.bairro as string,
    cidade: data.localidade as string,
    uf: data.uf as string,
  };
}
