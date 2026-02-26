import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { XCircle, ArrowLeft, RefreshCw } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const PaymentFailure = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-2 border-red-500 shadow-2xl">
        <CardHeader className="text-center space-y-6 pb-8">
          <div className="flex justify-center">
            <div className="relative">
              <div className="relative bg-red-500 rounded-full p-6">
                <XCircle className="h-16 w-16 text-white" />
              </div>
            </div>
          </div>
          
          <div>
            <h1 className="fredoka text-4xl md:text-5xl font-bold text-red-600 mb-2">
              Pagamento Recusado 😔
            </h1>
            <p className="text-xl text-muted-foreground">
              Não foi possível processar seu pagamento
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Motivos Comuns */}
          <div className="bg-red-50 border-2 border-red-200 rounded-lg p-6">
            <h3 className="font-bold text-lg text-red-900 mb-3">
              Motivos mais comuns:
            </h3>
            <ul className="space-y-2 text-red-800">
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Dados do cartão incorretos</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Saldo insuficiente</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Cartão vencido ou bloqueado</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Limite de compras atingido</span>
              </li>
              <li className="flex items-start gap-2">
                <span>•</span>
                <span>Problema de comunicação com o banco</span>
              </li>
            </ul>
          </div>

          {/* O que fazer */}
          <div className="bg-muted/50 rounded-lg p-4">
            <h4 className="font-semibold mb-2">O que fazer agora?</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">1.</span>
                <span>Verifique os dados do seu cartão e tente novamente</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">2.</span>
                <span>Entre em contato com seu banco para verificar o motivo</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">3.</span>
                <span>Tente usar outro método de pagamento</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-bold mt-0.5">4.</span>
                <span>Fale conosco pelo WhatsApp se precisar de ajuda</span>
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

          {/* Mensagem */}
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Não se preocupe! Seus dados estão seguros e nenhum valor foi cobrado.
            </p>
          </div>

          {/* Botões */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="default"
              size="lg"
              className="flex-1"
              onClick={() => navigate(-1)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Tentar Novamente
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para a Loja
            </Button>
          </div>
          
          {/* Botão WhatsApp */}
          <Button
            variant="outline"
            size="lg"
            className="w-full"
            onClick={() => window.open("https://wa.me/5571997020168", "_blank")}
          >
            Preciso de Ajuda - WhatsApp
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default PaymentFailure;
