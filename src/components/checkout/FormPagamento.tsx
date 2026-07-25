import { useState, useEffect } from "react";
import {
  ProdutoCheckout,
  DadosCliente,
  Endereco,
  OpcaoFrete,
} from "@/types/checkout";
import { criarPreferencia } from "@/lib/api";
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
  produto: ProdutoCheckout;
  cliente: DadosCliente;
  endereco: Endereco;
  frete: OpcaoFrete;
  onVoltar: () => void;
}

// Declaração do SDK global do Mercado Pago (carregado via script tag)
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MercadoPago: any;
  }
}

export function FormPagamento({
  produto,
  cliente,
  endereco,
  frete,
  onVoltar,
}: Props) {
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    const inicializarPagamento = async () => {
      setCarregando(true);
      setErro(null);

      try {
        // Cria o pedido "pendente" e a preferência no backend.
        // Preço e frete são sempre recalculados no servidor.
        const resultado = await criarPreferencia({
          produtoId: produto.id,
          freteEscolhido: {
            id: frete.id,
            transportadora: frete.transportadora,
            prazoEmDias: frete.prazoEmDias,
            valorEmCentavos: frete.valorEmCentavos,
          },
          cliente,
          endereco,
        });

        if (cancelado) return;

        setPedidoId(resultado.pedidoId);

        if (!document.querySelector("#mercadopago-sdk")) {
          const script = document.createElement("script");
          script.id = "mercadopago-sdk";
          script.src = "https://sdk.mercadopago.com/js/v2";
          script.async = true;

          script.onload = () => inicializarMercadoPago(resultado.preferenceId);
          script.onerror = () => {
            setErro("Erro ao carregar Mercado Pago. Tente novamente.");
            setCarregando(false);
          };

          document.head.appendChild(script);
        } else {
          inicializarMercadoPago(resultado.preferenceId);
        }
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

    const inicializarMercadoPago = (prefId: string) => {
      try {
        const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

        if (!publicKey) {
          throw new Error("Chave pública do Mercado Pago não configurada");
        }

        const mp = new window.MercadoPago(publicKey, { locale: "pt-BR" });
        const bricks = mp.bricks();

        const container = document.getElementById("mp-wallet-container");
        if (container) container.innerHTML = "";

        bricks
          .create("wallet", "mp-wallet-container", {
            initialization: { preferenceId: prefId },
            customization: {
              texts: { action: "pay", valueProp: "security_safety" },
            },
            callbacks: {
              onReady: () => setCarregando(false),
              onError: () => {
                setErro("Erro ao carregar pagamento. Tente novamente.");
                setCarregando(false);
              },
              onSubmit: () => {
                // Redirecionamento para o Checkout Pro é feito pelo próprio Brick
              },
            },
          })
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .catch((error: any) => {
            console.error("[MP Brick] Erro ao criar:", error);
            setErro("Erro ao inicializar pagamento");
            setCarregando(false);
          });
      } catch (error) {
        console.error("[MP] Erro ao inicializar:", error);
        setErro("Erro ao configurar pagamento");
        setCarregando(false);
      }
    };

    inicializarPagamento();

    return () => {
      cancelado = true;
      const container = document.getElementById("mp-wallet-container");
      if (container) container.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="fredoka text-[#EA3E83]">Pagamento</CardTitle>
        <CardDescription>
          Escolha a forma de pagamento (PIX, Cartão de Débito ou Crédito até 4x)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#EA3E83] mb-4" />
            <p className="text-muted-foreground">Preparando pagamento...</p>
          </div>
        )}

        {erro && !carregando && (
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

        {!carregando && !erro && (
          <div className="space-y-6">
            <div id="mp-wallet-container" className="min-h-[200px]" />

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
          </div>
        )}
      </CardContent>
    </Card>
  );
}
