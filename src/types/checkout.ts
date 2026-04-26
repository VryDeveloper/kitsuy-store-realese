/**
 * Tipos TypeScript para o fluxo de checkout
 */

export interface DadosCliente {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
}

export interface Endereco {
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  uf: string;
}

export interface OpcaoFrete {
  id: string;
  transportadora: string;
  prazoEmDias: number;
  valorEmCentavos: number;
  valorFormatado: string;
}

export interface ProdutoCheckout {
  id: string;
  nome: string;
  preco: string;
  imagem: string;
  collectionName: string;
}

export type EtapaCheckout = 'endereco' | 'frete' | 'pagamento' | 'confirmacao';

export interface EstadoCheckout {
  etapa: EtapaCheckout;
  produto: ProdutoCheckout | null;
  cliente: DadosCliente | null;
  endereco: Endereco | null;
  freteEscolhido: OpcaoFrete | null;
  preferenceId: string | null;
  pedidoId: string | null;
}
