import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verificarPagamento } from "@/lib/api";
import { StatusPedido } from "@/types/checkout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, Loader2, Package } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const PedidoConfirmado = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pedidoId = searchParams.get("id");

  const [pedido, setPedido] = useState<StatusPedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!pedidoId) {
      setErro("Pedido não informado.");
      setCarregando(false);
      return;
    }

    let tentativas = 0;
    const maxTentativas = 10;

    const consultar = async () => {
      try {
        const resultado = await verificarPagamento(pedidoId);
        setPedido(resultado);

        // Enquanto o webhook não confirmar o pagamento, continua tentando
        // por alguns segundos (o webhook pode demorar alguns instantes).
        if (resultado.status === "paid" || tentativas >= maxTentativas) {
          clearInterval(intervalo);
          setCarregando(false);
        }
      } catch (error) {
        clearInterval(intervalo);
        setErro(
          error instanceof Error ? error.message : "Erro ao consultar pedido",
        );
        setCarregando(false);
      }

      tentativas += 1;
    };

    consultar();
    const intervalo = setInterval(consultar, 3000);

    return () => clearInterval(intervalo);
  }, [pedidoId]);

  const formatarMoeda = (centavos: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(centavos / 100);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-pink-100 shadow-sm py-4">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2">
          <img
            src={kitsuyIcon}
            alt="Kitsuy"
            className="w-10 h-10 object-contain"
          />
          <span className="fredoka text-xl font-light text-[#EA3E83]">
            KITSUY STORE
          </span>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 py-12 max-w-2xl flex flex-col items-center justify-center text-center">
        {carregando && !erro && (
          <>
            <Loader2 className="h-12 w-12 animate-spin text-[#EA3E83] mb-4" />
            <h1 className="fredoka text-2xl text-gray-900 mb-2">
              Confirmando seu pagamento...
            </h1>
            <p className="text-gray-500">Isso pode levar alguns segundos.</p>
          </>
        )}

        {erro && (
          <Card className="w-full">
            <CardContent className="pt-6 flex flex-col items-center">
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h1 className="fredoka text-2xl text-gray-900 mb-2">
                Não encontramos seu pedido
              </h1>
              <p className="text-gray-500 mb-6">{erro}</p>
              <Button
                onClick={() => navigate("/estoque")}
                className="bg-[#EA3E83] hover:bg-[#c72e6c]"
              >
                Voltar ao Estoque
              </Button>
            </CardContent>
          </Card>
        )}

        {!erro && !carregando && pedido && (
          <Card className="w-full text-left">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center text-center mb-6">
                {pedido.status === "paid" ? (
                  <>
                    <CheckCircle2 className="h-14 w-14 text-green-500 mb-3" />
                    <h1 className="fredoka text-2xl text-gray-900">
                      Pagamento Confirmado!
                    </h1>
                    <p className="text-gray-500 mt-1">
                      Obrigado pela compra. Enviamos um email com os detalhes do
                      pedido.
                    </p>
                  </>
                ) : pedido.status === "cancelado" ? (
                  <>
                    <XCircle className="h-14 w-14 text-destructive mb-3" />
                    <h1 className="fredoka text-2xl text-gray-900">
                      Pagamento não concluído
                    </h1>
                    <p className="text-gray-500 mt-1">
                      Seu pagamento não foi aprovado. Tente novamente ou fale
                      conosco.
                    </p>
                  </>
                ) : (
                  <>
                    <Clock className="h-14 w-14 text-amber-500 mb-3" />
                    <h1 className="fredoka text-2xl text-gray-900">
                      Pagamento em análise
                    </h1>
                    <p className="text-gray-500 mt-1">
                      Assim que for aprovado, você receberá um email de
                      confirmação.
                    </p>
                  </>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex gap-4 items-center">
                  {pedido.imagem && (
                    <img
                      src={pedido.imagem}
                      alt={pedido.produto}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {pedido.produto}
                    </p>
                    <p className="text-sm text-gray-500">
                      {pedido.transportadora} · {pedido.prazoEmDias} dias úteis
                    </p>
                  </div>
                  <p className="font-bold text-lg text-[#EA3E83]">
                    {formatarMoeda(pedido.totalEmCentavos)}
                  </p>
                </div>

                <div className="border-t pt-4 text-sm text-gray-500">
                  <p>
                    <strong className="text-gray-900">Nome:</strong>{" "}
                    {pedido.clienteNome}
                  </p>
                  <p>
                    <strong className="text-gray-900">Email:</strong>{" "}
                    {pedido.clienteEmail}
                  </p>
                  <p className="mt-2 font-mono text-xs">
                    Pedido: {pedido.pedidoId}
                  </p>
                </div>
              </div>

              <Button
                onClick={() => navigate("/estoque")}
                className="w-full mt-6 bg-[#EA3E83] hover:bg-[#c72e6c] gap-2"
              >
                <Package className="h-4 w-4" />
                Continuar Comprando
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PedidoConfirmado;
