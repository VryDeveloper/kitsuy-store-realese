/**
 * Funções centralizadas para chamar as rotas do backend
 * Todo fetch passa por aqui
 */

const BASE = ''; // rotas relativas — funciona em qualquer ambiente

export async function calcularFrete(
  cep: string,
  produtoId: string,
  collectionName: string
) {
  const res = await fetch(
    `${BASE}/api/calcular-frete?cep=${cep}&produtoId=${produtoId}&collectionName=${collectionName}`
  );
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erro ao calcular frete');
  }
  return res.json();
}

export async function criarPreferencia(dados: {
  produtoId: string;
  collectionName: string;
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
}) {
  const res = await fetch(`${BASE}/api/criar-preferencia`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(dados),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Erro ao criar preferência de pagamento');
  }
  return res.json();
}

export async function verificarPagamento(pedidoId: string) {
  const res = await fetch(`${BASE}/api/verificar-pagamento?pedidoId=${pedidoId}`);
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || 'Pedido não encontrado');
  }
  return res.json();
}

/**
 * Busca endereço pelo CEP usando a API gratuita ViaCEP
 */
export async function buscarEnderecoPorCEP(cep: string) {
  const cepLimpo = cep.replace(/\D/g, '');
  
  if (cepLimpo.length !== 8) {
    throw new Error('CEP inválido');
  }

  const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
  
  if (!res.ok) {
    throw new Error('Erro ao buscar CEP');
  }

  const data = await res.json();

  if (data.erro) {
    throw new Error('CEP não encontrado');
  }

  return {
    logradouro: data.logradouro,
    bairro: data.bairro,
    cidade: data.localidade,
    uf: data.uf,
  };
}
