// 💳 Serviço de Pagamento - Kitsuy Store

// ─── Config ───────────────────────────────────────────────────────────────────

/**
 * Em dev (npm run dev:full), o Vite roda na porta 8081 mas as Vercel Functions
 * rodam em outra porta. No entanto, o Vercel Dev cuida do proxy.
 * Usar path relativo ('') é a forma mais segura de evitar erros de CORS.
 */
const API_BASE = '';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CreatePaymentData {
  productId: string;
  collectionName: string;
  quantity: number;
  buyerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export interface PaymentResponse {
  success: boolean;
  orderId: string;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string | null;
}

// ─── Classe de erro tipada ────────────────────────────────────────────────────

export class PaymentError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'NETWORK_ERROR'
      | 'TIMEOUT'
      | 'API_ERROR'
      | 'MISSING_CHECKOUT_URL'
      | 'PRODUCT_NOT_FOUND'
      | 'PRODUCT_UNAVAILABLE'
      | 'VALIDATION_ERROR'
      | 'UNKNOWN',
    public readonly statusCode?: number,
  ) {
    super(message);
    this.name = 'PaymentError';
    Object.setPrototypeOf(this, PaymentError.prototype);
  }
}

// ─── Mapeamento de status HTTP para código de erro ───────────────────────────

function httpStatusToCode(status: number): PaymentError['code'] {
  if (status === 404) return 'PRODUCT_NOT_FOUND';
  if (status === 400) return 'VALIDATION_ERROR';
  return 'API_ERROR';
}

// ─── Criar pagamento (chama o backend) ───────────────────────────────────────

export async function createPayment(data: CreatePaymentData): Promise<PaymentResponse> {
  const url = `${API_BASE}/api/create-payment`;

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(15_000), // 15 segundos de timeout
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'TimeoutError') {
      throw new PaymentError(
        'O servidor demorou para responder. Verifique sua conexão e tente novamente.',
        'TIMEOUT',
      );
    }
    throw new PaymentError(
      'Não foi possível conectar ao servidor de pagamento. Verifique sua conexão.',
      'NETWORK_ERROR',
    );
  }

  if (!response.ok) {
    let serverMessage = 'Erro ao criar pagamento';
    try {
      const body = await response.json() as { error?: string };
      if (body.error) serverMessage = body.error;
    } catch {
      // body não é JSON — usa mensagem padrão
    }

    throw new PaymentError(
      serverMessage,
      httpStatusToCode(response.status),
      response.status,
    );
  }

  return response.json() as Promise<PaymentResponse>;
}

// ─── Processar pagamento e redirecionar ──────────────────────────────────────

export async function processPayment(data: CreatePaymentData): Promise<void> {
  // Deixa o erro subir tipado — quem chama trata com switch(err.code)
  const paymentResponse = await createPayment(data);

  const isDev = import.meta.env.DEV;

  // SEMPRE usar initPoint para testes reais de produção
    const checkoutUrl = paymentResponse.initPoint;

  if (!checkoutUrl) {
    throw new PaymentError(
      'URL de checkout não retornada pelo servidor. Tente novamente.',
      'MISSING_CHECKOUT_URL',
    );
  }

  console.info('[payment] Redirecionando para checkout', {
    orderId: paymentResponse.orderId,
    env: isDev ? 'sandbox' : 'production',
  });

  window.location.href = checkoutUrl;
}

// ─── Mensagens amigáveis para exibir ao usuário ───────────────────────────────

export function getPaymentErrorMessage(err: unknown): string {
  if (err instanceof PaymentError) {
    switch (err.code) {
      case 'TIMEOUT':
      case 'NETWORK_ERROR':
        return 'Problema de conexão. Verifique sua internet e tente novamente.';
      case 'PRODUCT_NOT_FOUND':
        return 'Produto não encontrado. Atualize a página e tente novamente.';
      case 'PRODUCT_UNAVAILABLE':
        return 'Este produto está indisponível no momento.';
      case 'VALIDATION_ERROR':
        return err.message; // mensagem já vem do servidor e é legível
      default:
        return 'Ocorreu um erro ao processar o pagamento. Tente novamente.';
    }
  }
  return 'Ocorreu um erro inesperado. Tente novamente.';
}

// ─── Status do pedido (expansível) ───────────────────────────────────────────

export async function getOrderStatus(orderId: string) {
  return { orderId };
}
