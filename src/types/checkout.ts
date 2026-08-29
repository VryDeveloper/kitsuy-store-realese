/**
 * Tipos TypeScript para o fluxo de checkout.
 * Usado apenas para produtos da coleção `products` (estoque pronto).
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
  valorOriginalEmCentavos: number;
  valorOriginalFormatado: string;
}

export interface ProdutoCheckout {
  id: string;
  nome: string;
  preco: string;
  imagem: string;
}

export type EtapaCheckout = "endereco" | "frete" | "pagamento";

export interface EstadoCheckout {
  etapa: EtapaCheckout;
  produtos: ProdutoCheckout[];
  cliente: DadosCliente | null;
  endereco: Endereco | null;
  freteEscolhido: OpcaoFrete | null;
}

export interface StatusPedido {
  pedidoId: string;
  status: "pendente" | "paid" | "cancelado" | string;
  produtos: { nome: string; imagem: string; preco: number }[];
  totalEmCentavos: number;
  transportadora: string;
  prazoEmDias: number;
  clienteNome: string;
  clienteEmail: string;
}
