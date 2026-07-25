import { Resend } from "resend";

/**
 * Client do Resend para envio de emails transacionais.
 * SOMENTE BACKEND — a API key nunca deve chegar ao frontend.
 */

if (!process.env.RESEND_API_KEY) {
  console.warn(
    "[resend] RESEND_API_KEY não configurada — envio de emails desabilitado",
  );
}

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;
