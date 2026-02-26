import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { CheckCircle, ArrowLeft, Package } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const PaymentSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [paymentId, setPaymentId] = useState<string>("");
  const [externalReference, setExternalReference] = useState<string>("");

  useEffect(() => {
    // Extrair parâmetros da URL retornados pelo Mercado Pago
    const payment = searchParams.get("payment_id");
    const reference = searchParams.get("external_reference");
    
    if (payment) setPaymentId(payment);
    if (reference) setExternalReference(reference);
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-green-500 shadow-2xl">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-green-500 rounded-full animate-ping opacity-20"></div>
              <div className="relative bg-green-500 rounded-full p-6">
                <CheckCircle className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="fredoka text-4xl md:text-5xl font-bold text-green-600 mb-2">
              Pagamento Aprovado! 🎉
            </h1>
            <p className="text-xl text-muted-foreground">
              Seu pedido foi confirmado com sucesso
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informações do Pagamento */}
          <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 space-y-3">
            <div className="flex items-start gap-3">
              <Package className="h-6 w-6 text-green-600 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-lg text-green-900 mb-2">
                  Próximos Passos:
                </h3>
                <ul className="space-y-2 text-green-800">
                  <li className="flex items-start gap-2">
                    <span className="font-bold">1.</span>
                    <span>Você receberá um email de confirmação em breve</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">2.</span>
                    <span>Nossa equipe entrará em contato via WhatsApp para confirmar o envio</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="font-bold">3.</span>
                    <span>Seu pedido será enviado em até 24-48 horas úteis</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Detalhes do Pagamento */}
          {paymentId && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground mb-2">
                Informações da Transação:
              </h4>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-semibold">ID do Pagamento:</span>{" "}
                  <span className="font-mono text-primary">{paymentId}</span>
                </p>
                {externalReference && (
                  <p>
                    <span className="font-semibold">Referência:</span>{" "}
                    <span className="font-mono">{externalReference}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Logo */}
          <div className="flex justify-center pt-4">
            <img
              src={kitsuyIcon}
              alt="Kitsuy Store"
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* Mensagem de Agradecimento */}
          <div className="text-center space-y-2">
            <p className="text-lg font-semibold text-foreground">
              Obrigado pela sua compra! 💖
            </p>
            <p className="text-sm text-muted-foreground">
              Ficamos felizes em fazer parte da sua coleção
            </p>
          </div>

          {/* Botões de Ação */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              Voltar para a Loja
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => window.open("https://wa.me/5571997020168", "_blank")}
            >
              Contatar Suporte
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentSuccess;
