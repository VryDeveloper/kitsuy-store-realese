import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Clock, ArrowLeft } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const PaymentPending = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-yellow-500 shadow-2xl">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-yellow-500 rounded-full animate-pulse opacity-20"></div>
              <div className="relative bg-yellow-500 rounded-full p-6">
                <Clock className="h-16 w-16 text-white animate-pulse" />
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="fredoka text-4xl md:text-5xl font-bold text-yellow-600 mb-2">
              Pagamento Pendente ⏳
            </h1>
            <p className="text-xl text-muted-foreground">
              Aguardando confirmação do pagamento
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Informações */}
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-6">
            <h3 className="font-bold text-lg text-yellow-900 mb-3">
              O que fazer agora?
            </h3>
            <div className="space-y-3 text-yellow-800">
              <p>
                <strong>Boleto:</strong> Se você escolheu boleto, o pagamento pode levar até 2 dias úteis para ser confirmado.
              </p>
              <p>
                <strong>PIX:</strong> Caso tenha escolhido PIX, o pagamento é processado em poucos minutos.
              </p>
              <p>
                <strong>Transferência:</strong> Aguarde a compensação bancária (até 1 dia útil).
              </p>
            </div>
          </div>

          {/* Próximos Passos */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">Próximos Passos:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">1.</span>
                <span>Você receberá um email assim que o pagamento for confirmado</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">2.</span>
                <span>Nossa equipe entrará em contato via WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">3.</span>
                <span>Caso tenha dúvidas, entre em contato conosco</span>
              </li>
            </ul>
          </div>

          {/* Logo */}
          <div className="flex justify-center pt-4">
            <img
              src={kitsuyIcon}
              alt="Kitsuy Store"
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
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

export default PaymentPending;
