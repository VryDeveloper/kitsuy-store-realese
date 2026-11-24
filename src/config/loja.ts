/** Contatos da loja — único lugar para trocar número, perfil ou e-mail. */
export const WHATSAPP_NUMERO = "5571997020168";
export const WHATSAPP_EXIBICAO = "(71) 99702-0168";
export const INSTAGRAM_URL = "https://instagram.com/kitsuystore";
export const EMAIL_LOJA = "kitsuystore@gmail.com";

export function linkWhatsApp(mensagem: string): string {
  return `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent(mensagem)}`;
}

export const MENSAGENS_WHATSAPP = {
  conhecer: "Olá! Vim do site e gostaria de conhecer os produtos!",
  orcamento: "Olá! Vim do site e gostaria de fazer um orçamento de encomenda!",
  estoque: "Olá! Vim do site e quero saber sobre as figures disponíveis no estoque!",
  sorteio: "Olá! Vim do site e gostaria de saber mais sobre o sorteio!",
};
