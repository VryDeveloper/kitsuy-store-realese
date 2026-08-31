import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ProdutoCheckout,
  DadosCliente,
  Endereco,
  OpcaoFrete,
} from "@/types/checkout";
import { criarPreferencia } from "@/lib/api";
import {
  getPedidoReservado,
  salvarPedidoReservado,
  chaveCarrinho,
} from "@/lib/reservaSessao";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  produtos: ProdutoCheckout[];
  cliente: DadosCliente;
  endereco: Endereco;
  frete: OpcaoFrete;
  onVoltar: () => void;
}

export function FormPagamento({
  produtos,
  cliente,
  endereco,
  frete,
  onVoltar,
}: Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [initPoint, setInitPoint] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const inicializarPagamento = async () => {
      setCarregando(true);
      setErro(null);

      try {
        const chave = chaveCarrinho(produtos.map((p) => p.id));

        // Cria o pedido "pendente" e a preferência no backend.
        // Preço e frete são sempre recalculados no servidor.
        const resultado = await criarPreferencia({
          produtoIds: produtos.map((p) => p.id),
          freteEscolhido: {
            id: frete.id,
            transportadora: frete.transportadora,
            prazoEmDias: frete.prazoEmDias,
            valorEmCentavos: frete.valorEmCentavos,
          },
          cliente,
          endereco,
          pedidoIdExistente: getPedidoReservado(chave) ?? undefined,
        });

        if (cancelado) return;

        setPedidoId(resultado.pedidoId);
        salvarPedidoReservado(chave, resultado.pedidoId);
        setInitPoint(resultado.initPoint);
        setCarregando(false);
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : "Erro ao criar pagamento";
        setErro(mensagem);
        toast({
          title: "Erro ao criar pagamento",
          description: mensagem,
          variant: "destructive",
        });
        setCarregando(false);
      }
    };

    inicializarPagamento();

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Abre o checkout do Mercado Pago numa aba NOVA e mantém esta aba na
  // loja, navegando pra tela de "aguardando pagamento" (que fica
  // consultando o status até o webhook confirmar). Antes, o próprio SDK do
  // Mercado Pago redirecionava esta mesma aba pro checkout deles — e o
  // "auto_return" configurado na preferência não é confiável pra Pix (a
  // aprovação acontece de forma assíncrona, fora da página), então o
  // cliente nunca mais via a loja depois de pagar.
  const handlePagar = () => {
    if (!initPoint || !pedidoId) return;

    window.open(initPoint, "_blank", "noopener,noreferrer");
    navigate(`/pedido-confirmado?id=${pedidoId}`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="fredoka text-[#EA3E83]">Pagamento</CardTitle>
        <CardDescription>
          Escolha a forma de pagamento (PIX, Cartão de Débito ou Crédito até 4x)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {erro && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{erro}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
              <Button onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        )}

        <div className={erro ? "hidden" : "space-y-6"}>
          {carregando && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#EA3E83] mb-4" />
              <p className="text-muted-foreground">Preparando pagamento...</p>
            </div>
          )}

          {!carregando && (
            <>
              <Button
                onClick={handlePagar}
                disabled={!initPoint}
                className="w-full bg-[#009EE3] hover:bg-[#0084bd] text-white py-6 text-base gap-2"
              >
                Pagar com Mercado Pago
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Abre em uma nova aba. Você vai pra uma tela que atualiza
                sozinha assim que o pagamento for confirmado.
              </p>

              <div className="text-center space-y-2 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  🔒 Pagamento 100% seguro processado pelo Mercado Pago
                </p>
                <p className="text-xs text-muted-foreground">
                  Seus dados financeiros não são armazenados por nós
                </p>
                {pedidoId && (
                  <p className="text-xs text-muted-foreground font-mono">
                    ID do Pedido: {pedidoId.slice(0, 8)}...
                  </p>
                )}
              </div>

              <Button variant="outline" onClick={onVoltar} className="w-full">
                Voltar ao Frete
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
