import { db } from "./firebase-admin.js";
import type { ProdutoRef } from "./estoque.js";
import {
  cotarCarrinhoNaSuperFrete,
  DIMENSOES_PADRAO,
  type ItemCarrinho,
  type OpcaoFreteConsolidada,
} from "./frete-consolidado.js";

/**
 * Revalida a disponibilidade do frete de um pedido JÁ PAGO, recotando o
 * carrinho na SuperFrete em tempo real — NÃO emite etiqueta nenhuma. A API
 * da SuperFrete não expõe um jeito de checar cobertura sem recotar (o
 * próprio suporte deles confirmou: "o próprio /calculator é a ferramenta de
 * verificação"), e mesmo assim não há garantia absoluta — só é confirmado
 * de verdade no momento da emissão manual da etiqueta no painel deles. Isso
 * é só o melhor sinal disponível pra saber ANTES de tentar emitir.
 *
 * Ordena as opções cotadas agora do jeito que a loja deve tentar emitir a
 * etiqueta: primeiro a transportadora que o cliente escolheu no checkout
 * (se ainda estiver cotável agora), senão a mais barata das alternativas.
 */

export type ResultadoVerificacaoFrete =
  | {
      status: "confirmado";
      transportadoraEscolhida: string;
      opcao: OpcaoFreteConsolidada;
    }
  | {
      status: "alternativa";
      transportadoraEscolhida: string;
      recomendada: OpcaoFreteConsolidada;
      opcoesDisponiveis: OpcaoFreteConsolidada[];
    }
  | {
      status: "indisponivel";
      transportadoraEscolhida: string;
    };

export async function verificarDisponibilidadeFrete(
  produtosPedido: ProdutoRef[],
  cep: string,
  transportadoraEscolhida: string,
): Promise<ResultadoVerificacaoFrete> {
  const produtoDocs = await Promise.all(
    produtosPedido.map((p) => db.collection(p.collectionName).doc(p.produtoId).get()),
  );

  const itens: ItemCarrinho[] = produtoDocs
    .filter((doc) => doc.exists)
    .map((doc) => {
      const produto = doc.data()!;
      const precoEmReais = parseFloat(
        String(produto.price)
          .replace(/[^\d,]/g, "")
          .replace(",", "."),
      );

      return {
        produtoId: doc.id,
        pesoEmKg: produto.pesoEmKg || DIMENSOES_PADRAO.pesoEmKg,
        alturaCm: produto.alturaEmCm || DIMENSOES_PADRAO.alturaEmCm,
        larguraCm: produto.larguraEmCm || DIMENSOES_PADRAO.larguraEmCm,
        comprimentoCm: produto.comprimentoEmCm || DIMENSOES_PADRAO.comprimentoEmCm,
        precoEmCentavos: Math.round(precoEmReais * 100),
      };
    });

  const { opcoes } = await cotarCarrinhoNaSuperFrete(itens, cep);

  if (opcoes.length === 0) {
    return { status: "indisponivel", transportadoraEscolhida };
  }

  const opcaoEscolhida = opcoes.find(
    (o) => o.transportadora === transportadoraEscolhida,
  );
  if (opcaoEscolhida) {
    return { status: "confirmado", transportadoraEscolhida, opcao: opcaoEscolhida };
  }

  const opcoesOrdenadas = [...opcoes].sort(
    (a, b) => a.valorEmCentavos - b.valorEmCentavos,
  );

  return {
    status: "alternativa",
    transportadoraEscolhida,
    recomendada: opcoesOrdenadas[0],
    opcoesDisponiveis: opcoesOrdenadas,
  };
}
