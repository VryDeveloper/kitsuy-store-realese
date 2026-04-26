import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { collection, doc, getDoc } from 'firebase/firestore';
import { db } from '@/firebaseConfig';
import { EstadoCheckout, ProdutoCheckout } from '@/types/checkout';
import { FormEndereco } from '@/components/checkout/FormEndereco';
import { OpcoesFrete } from '@/components/checkout/OpcoesFrete';
import { FormPagamento } from '@/components/checkout/FormPagamento';
import { ResumoPedido } from '@/components/checkout/ResumoPedido';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CheckoutPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [estado, setEstado] = useState<EstadoCheckout>({
    etapa: 'endereco',
    produto: null,
    cliente: null,
    endereco: null,
    freteEscolhido: null,
    preferenceId: null,
    pedidoId: null,
  });

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Carregar produto da URL
  useEffect(() => {
    const produtoId = searchParams.get('produto');
    const collectionName = searchParams.get('colecao');

    if (!produtoId || !collectionName) {
      setErro('Produto não especificado');
      setCarregando(false);
      return;
    }

    const carregarProduto = async () => {
      try {
        const produtoRef = doc(collection(db, collectionName), produtoId);
        const produtoSnap = await getDoc(produtoRef);

        if (!produtoSnap.exists()) {
          setErro('Produto não encontrado');
          return;
        }

        const produtoData = produtoSnap.data();

        const produto: ProdutoCheckout = {
          id: produtoId,
          nome: produtoData.title,
          preco: produtoData.price,
          imagem: produtoData.image,
          collectionName,
        };

        setEstado((prev) => ({ ...prev, produto }));
      } catch (error) {
        console.error('Erro ao carregar produto:', error);
        setErro('Erro ao carregar produto');
      } finally {
        setCarregando(false);
      }
    };

    carregarProduto();
  }, [searchParams]);

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (erro || !estado.produto) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-bold mb-4">Ops!</h1>
          <p className="text-muted-foreground mb-6">{erro || 'Produto não encontrado'}</p>
          <Button onClick={() => navigate('/')}>Voltar para a loja</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-2"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Finalizar Compra</h1>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coluna principal - Formulários */}
          <div className="lg:col-span-2 space-y-6">
            {/* Etapa 1: Endereço */}
            {estado.etapa === 'endereco' && (
              <FormEndereco
                onContinuar={(cliente, endereco) => {
                  setEstado((prev) => ({
                    ...prev,
                    cliente,
                    endereco,
                    etapa: 'frete',
                  }));
                }}
              />
            )}

            {/* Etapa 2: Frete */}
            {estado.etapa === 'frete' && estado.produto && estado.endereco && (
              <OpcoesFrete
                produto={estado.produto}
                cep={estado.endereco.cep}
                onVoltar={() => setEstado((prev) => ({ ...prev, etapa: 'endereco' }))}
                onEscolher={(frete) => {
                  setEstado((prev) => ({
                    ...prev,
                    freteEscolhido: frete,
                    etapa: 'pagamento',
                  }));
                }}
              />
            )}

            {/* Etapa 3: Pagamento */}
            {estado.etapa === 'pagamento' &&
              estado.produto &&
              estado.cliente &&
              estado.endereco &&
              estado.freteEscolhido && (
                <FormPagamento
                  produto={estado.produto}
                  cliente={estado.cliente}
                  endereco={estado.endereco}
                  frete={estado.freteEscolhido}
                  onVoltar={() => setEstado((prev) => ({ ...prev, etapa: 'frete' }))}
                />
              )}
          </div>

          {/* Coluna lateral - Resumo */}
          <div className="lg:col-span-1">
            <ResumoPedido
              produto={estado.produto}
              frete={estado.freteEscolhido}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
