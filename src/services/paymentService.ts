// 💳 Serviço de Pagamento - Kitsuy Store
// Integração segura com Mercado Pago via backend

interface CreatePaymentData {
  productId: string;
  collectionName: string;
  quantity: number;
  buyerInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

interface PaymentResponse {
  success: boolean;
  orderId: string;
  preferenceId: string;
  initPoint: string;
  sandboxInitPoint: string;
}

/**
 * 🔒 Criar pagamento seguro
 * Chama o backend para criar preferência no Mercado Pago
 */
export async function createPayment(data: CreatePaymentData): Promise<PaymentResponse> {
  try {
    const response = await fetch('/api/create-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Erro ao criar pagamento');
    }

    const result: PaymentResponse = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Erro ao criar pagamento:', error);
    throw error;
  }
}

/**
 * 🚀 Processar pagamento e redirecionar para checkout
 */
export async function processPayment(data: CreatePaymentData): Promise<void> {
  try {
    // Criar pagamento no backend
    const paymentResponse = await createPayment(data);

    // Determinar qual URL usar (sandbox em desenvolvimento, produção em prod)
    const isDevelopment = import.meta.env.DEV;
    const checkoutUrl = isDevelopment 
      ? paymentResponse.sandboxInitPoint 
      : paymentResponse.initPoint;

    // Redirecionar para checkout do Mercado Pago
    window.location.href = checkoutUrl;
  } catch (error) {
    console.error('❌ Erro ao processar pagamento:', error);
    throw error;
  }
}

/**
 * 📊 Buscar status do pedido
 */
export async function getOrderStatus(orderId: string) {
  // Esta função pode ser expandida para buscar status do pedido no Firebase
  // Por enquanto, retorna apenas o ID para busca manual
  return { orderId };
}
