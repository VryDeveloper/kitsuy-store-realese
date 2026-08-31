import { MercadoPagoConfig } from "mercadopago";

/**
 * Client do Mercado Pago configurado com o access token secreto.
 * SOMENTE BACKEND — o access token nunca deve chegar ao frontend.
 */

if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
  throw new Error(
    "MERCADOPAGO_ACCESS_TOKEN não configurado nas variáveis de ambiente",
  );
}

export const mpClient = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: { timeout: 10000 },
});
