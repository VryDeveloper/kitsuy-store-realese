import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { verificarPagamento } from "@/lib/api";
import { StatusPedido } from "@/types/checkout";
import { useCart } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Clock, XCircle, Loader2, Package } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const PedidoConfirmado = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const pedidoId = searchParams.get("id");
  const { limpar: limparCarrinho } = useCart();

  const [pedido, setPedido] = useState<StatusPedido | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [consultandoPagamento, setConsultandoPagamento] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Esta página é pra onde o cliente vai logo depois de abrir o checkout do
  // Mercado Pago numa aba nova (ver FormPagamento.tsx). O pagamento (Pix
  // principalmente) é aprovado de forma assíncrona nessa outra aba, então
  // aqui a gente fica consultando o status em segundo plano até o webhook
  // confirmar — por até ~10 minutos, o mesmo prazo da reserva do produto —
  // e a tela troca sozinha pra "Pagamento Confirmado" assim que acontecer.
  useEffect(() => {
    if (!pedidoId) {
      setErro("Pedido não informado.");
      setCarregando(false);
      setConsultandoPagamento(false);
      return;
    }

    let tentativas = 0;
    const maxTentativas = 150; // 150 × 4s ≈ 10 minutos

    const consultar = async () => {
      try {
        const resultado = await verificarPagamento(pedidoId);
        setPedido(resultado);
        setCarregando(false);

        const resolvido =
          resultado.status === "paid" || resultado.status === "cancelado";

        // Só limpa o carrinho quando o pagamento é CONFIRMADO — nunca antes,
        // pra não perder os itens se o pagamento ainda estiver em
        // andamento ou vier a falhar depois.
        if (resultado.status === "paid") {
          limparCarrinho();
        }

        if (resolvido || tentativas >= maxTentativas) {
          clearInterval(intervalo);
          setConsultandoPagamento(false);
        }
      } catch (error) {
        clearInterval(intervalo);
        setErro(
          error instanceof Error ? error.message : "Erro ao consultar pedido",
        );
        setCarregando(false);
        setConsultandoPagamento(false);
      }

      tentativas += 1;
    };

    consultar();
    const intervalo = setInterval(consultar, 4000);

    return () => clearInterval(intervalo);
    // limparCarrinho não precisa estar nas deps: sempre chama o mesmo
    // setItens([]) do contexto independente da closure ser "antiga".
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
                      Aguardando pagamento
                    </h1>
                    <p className="text-gray-500 mt-1">
                      Finalize o pagamento na aba do Mercado Pago que abrimos
                      pra você. Assim que for aprovado, esta página atualiza
                      sozinha e você recebe um email de confirmação.
                    </p>
                    {consultandoPagamento ? (
                      <p className="text-xs text-muted-foreground mt-3 flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando automaticamente...
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground mt-3">
                        Ainda não recebemos a confirmação. Se você já pagou,
                        aguarde mais alguns instantes e recarregue a página.
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="space-y-2">
                  {pedido.produtos.map((produto, i) => (
                    <div key={i} className="flex gap-4 items-center">
                      {produto.imagem && (
                        <img
                          src={produto.imagem}
                          alt={produto.nome}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{produto.nome}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center text-sm text-gray-500">
                  <span>
                    {pedido.transportadora} · {pedido.prazoEmDias} dias úteis
                  </span>
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
