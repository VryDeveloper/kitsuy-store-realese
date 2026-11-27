/**
 * Conteúdo editável pelo painel /admin. Fica no Firestore em `config/site`;
 * o que não estiver salvo lá usa os padrões abaixo (o site nunca quebra se
 * o documento não existir). Usado pelo site e pelo backend (api/admin.ts).
 */

export interface Banner {
  image: string;
  alt: string;
  href?: string;
}

export const TEXTOS_PADRAO = {
  sorteioTitulo: "Sorteio de 1.500 seguidores!",
  sorteioSubtitulo: "Siga no Instagram e concorra a uma figure japonesa original - Grátis!",
  promoTitulo: "Desconto Especial em até *3 Figures!*",
  promoSubtitulo: "Garanta suas figures favoritas com um *desconto imperdível!*",
  heroTitulo: "Sua figure dos sonhos, *direto do Japão* até você.",
  heroTexto:
    "A Kitsuy Store é especializada em *Action Figures* originais do *Japão*. Mais do que uma loja, nós buscamos para você as melhores peças diretamente em sites japoneses, cuidando de todo o processo de importação. Você não precisa se preocupar em navegar em sites internacionais, calcular frete ou lidar com a alfândega, trazendo cada peça com segurança, atenção e todo o cuidado que a sua coleção merece! - *a gente faz tudo isso por você!*",
  galeriaTitulo: "Figures que já passaram por aqui",
  galeriaSubtitulo:
    "Cada peça importada com cuidado. Clique para ampliar — e se quiser uma dessas ou qualquer outra, é só chamar.",
  estoqueTitulo: "Figures no estoque no Brasil",
  estoqueSubtitulo: "Sem esperar importação! essas estão aqui e saem em até 4 dias úteis direto para sua casa.",
  avaliacoesTitulo: "Clientes reais, Avaliações reais 🧡",
  avaliacoesSubtitulo: "Veja o que nossos clientes têm a dizer sobre a Kitsuy! Nossas avaliações no Instagram e Whatsapp!",
  encomendaTitulo: "Não encontrou o que procura?",
  encomendaTexto:
    "Se existe no Japão, a gente encontra. Manda o nome ou a foto da figure e a gente já começa a pesquisar pra você — *sem compromisso.*",
};

export type ChaveTexto = keyof typeof TEXTOS_PADRAO;

export const FEATURES_PADRAO = {
  faixaSorteio: true,
  destaquePromocao: false,
};

export type ChaveFeature = keyof typeof FEATURES_PADRAO;

/** O que fica salvo no Firestore — tudo opcional; listas vazias = usar o padrão. */
export interface ConfigSalva {
  banners?: Banner[];
  galeria?: string[];
  avaliacoes?: string[];
  textos?: Partial<Record<ChaveTexto, string>>;
  features?: Partial<Record<ChaveFeature, boolean>>;
}
