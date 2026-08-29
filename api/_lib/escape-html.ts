/**
 * Escapa caracteres especiais de HTML antes de interpolar texto vindo de
 * usuários (nome, endereço, etc.) em templates de email.
 *
 * Segunda camada de defesa, independente da validação de formato em
 * `_lib/validar-checkout.ts` — campos de texto livre como "nome" ou
 * "complemento" podem legitimamente conter caracteres como `&` ou `"` sem
 * violar nenhuma regra de formato. Validação de formato não é sanitização
 * de saída; as duas são necessárias.
 *
 * Não há nenhuma lib de escape de HTML já instalada no projeto (Resend é só
 * um client de envio, não inclui isso) — daí o utilitário próprio, pequeno
 * o suficiente pra não justificar uma dependência nova.
 */
export function escapeHtml(valor: string | number | undefined | null): string {
  if (valor === undefined || valor === null) return "";

  // A ordem importa: `&` precisa ser o primeiro replace, senão os `&` que
  // os outros replaces introduzem (ex: `&lt;`) seriam escapados de novo.
  return String(valor)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
