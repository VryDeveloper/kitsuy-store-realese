import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProdutoCheckout, DadosCliente, Endereco, OpcaoFrete } from '@/types/checkout';
import { criarPreferencia } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Props {
  produto: ProdutoCheckout;
  cliente: DadosCliente;
  endereco: Endereco;
  frete: OpcaoFrete;
  onVoltar: () => void;
}

// Declarar o tipo global do Mercado Pago
declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function FormPagamento({ produto, cliente, endereco, frete, onVoltar }: Props) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);

  useEffect(() => {
    const inicializarPagamento = async () => {
      setCarregando(true);
      setErro(null);

      try {
        // Criar preferência no backend
        const resultado = await criarPreferencia({
          produtoId: produto.id,
          collectionName: produto.collectionName,
          freteEscolhido: {
            id: frete.id,
            transportadora: frete.transportadora,
            prazoEmDias: frete.prazoEmDias,
            valorEmCentavos: frete.valorEmCentavos,
          },
          cliente: {
            nome: cliente.nome,
            email: cliente.email,
            telefone: cliente.telefone,
            cpf: cliente.cpf,
          },
          endereco: {
            cep: endereco.cep,
            logradouro: endereco.logradouro,
            numero: endereco.numero,
            complemento: endereco.complemento,
            bairro: endereco.bairro,
            cidade: endereco.cidade,
            uf: endereco.uf,
          },
        });

        setPreferenceId(resultado.preferenceId);
        setPedidoId(resultado.pedidoId);

        // Carregar SDK do Mercado Pago
        if (!document.querySelector('#mercadopago-sdk')) {
          const script = document.createElement('script');
          script.id = 'mercadopago-sdk';
          script.src = 'https://sdk.mercadopago.com/js/v2';
          script.async = true;

          script.onload = () => {
            inicializarMercadoPago(resultado.preferenceId);
          };

          script.onerror = () => {
            setErro('Erro ao carregar Mercado Pago. Tente novamente.');
            setCarregando(false);
          };

          document.head.appendChild(script);
        } else {
          // SDK já carregado
          inicializarMercadoPago(resultado.preferenceId);
        }
      } catch (error) {
        const mensagem = error instanceof Error ? error.message : 'Erro ao criar pagamento';
        setErro(mensagem);
        toast({
          title: 'Erro ao criar pagamento',
          description: mensagem,
          variant: 'destructive',
        });
        setCarregando(false);
      }
    };

    const inicializarMercadoPago = (prefId: string) => {
      try {
        const publicKey = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

        if (!publicKey) {
          throw new Error('Chave pública do Mercado Pago não configurada');
        }

        const mp = new window.MercadoPago(publicKey, {
          locale: 'pt-BR',
        });

        const bricks = mp.bricks();

        // Limpar container anterior se existir
        const container = document.getElementById('mp-wallet-container');
        if (container) {
          container.innerHTML = '';
        }

        // Renderizar Wallet Brick (botão de pagamento do MP)
        bricks
          .create('wallet', 'mp-wallet-container', {
            initialization: {
              preferenceId: prefId,
            },
            customization: {
              texts: {
                action: 'pay',
                valueProp: 'security_safety',
              },
            },
            callbacks: {
              onReady: () => {
                console.log('[MP Brick] Pronto');
                setCarregando(false);
              },
              onError: (error: any) => {
                console.error('[MP Brick] Erro:', error);
                setErro('Erro ao carregar pagamento. Tente novamente.');
                setCarregando(false);
              },
              onSubmit: () => {
                console.log('[MP Brick] Submetido - redirecionando para MP');
              },
            },
          })
          .catch((error: any) => {
            console.error('[MP Brick] Erro ao criar:', error);
            setErro('Erro ao inicializar pagamento');
            setCarregando(false);
          });
      } catch (error) {
        console.error('[MP] Erro ao inicializar:', error);
        setErro('Erro ao configurar pagamento');
        setCarregando(false);
      }
    };

    inicializarPagamento();

    // Cleanup ao desmontar o componente
    return () => {
      const container = document.getElementById('mp-wallet-container');
      if (container) {
        container.innerHTML = '';
      }
    };
  }, [produto, cliente, endereco, frete, toast]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pagamento</CardTitle>
        <CardDescription>
          Escolha a forma de pagamento (PIX, Cartão de Débito ou Crédito até 4x)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
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
            {/* Container do Mercado Pago Brick */}
            <div id="mp-wallet-container" className="min-h-[200px]"></div>

            {/* Informações de segurança */}
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
