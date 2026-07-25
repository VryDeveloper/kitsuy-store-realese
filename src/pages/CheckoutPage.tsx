import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import {
  ProdutoCheckout,
  DadosCliente,
  Endereco,
  OpcaoFrete,
  EtapaCheckout,
} from "@/types/checkout";
import { FormEndereco } from "@/components/checkout/FormEndereco";
import { OpcoesFrete } from "@/components/checkout/OpcoesFrete";
import { FormPagamento } from "@/components/checkout/FormPagamento";
import { ResumoPedido } from "@/components/checkout/ResumoPedido";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const CheckoutPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const produtoId = searchParams.get("produto");
  const colecao = searchParams.get("colecao");

  const [produto, setProduto] = useState<ProdutoCheckout | null>(null);
  const [carregandoProduto, setCarregandoProduto] = useState(true);
  const [erroProduto, setErroProduto] = useState<string | null>(null);

  const [etapa, setEtapa] = useState<EtapaCheckout>("endereco");
  const [cliente, setCliente] = useState<DadosCliente | null>(null);
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [freteEscolhido, setFreteEscolhido] = useState<OpcaoFrete | null>(null);

  // Somente produtos da coleção `products` têm checkout real.
  useEffect(() => {
    if (!produtoId || colecao !== "products") {
      setErroProduto("Este produto não está disponível para compra online.");
      setCarregandoProduto(false);
      return;
    }

    const buscarProduto = async () => {
      try {
        const docRef = doc(db, "products", produtoId);
        const snap = await getDoc(docRef);

        if (!snap.exists()) {
          setErroProduto("Produto não encontrado.");
          return;
        }

        const data = snap.data();

        if (data.inStock?.toLowerCase() === "indisponível") {
          setErroProduto("Este produto está indisponível no momento.");
          return;
        }

        setProduto({
          id: produtoId,
          nome: data.title,
          preco: data.price,
          imagem: data.image,
        });
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
        setErroProduto("Erro ao carregar produto. Tente novamente.");
      } finally {
        setCarregandoProduto(false);
      }
    };

    buscarProduto();
  }, [produtoId, colecao]);

  const handleEnderecoContinuar = (
    dadosCliente: DadosCliente,
    dadosEndereco: Endereco,
  ) => {
    setCliente(dadosCliente);
    setEndereco(dadosEndereco);
    setEtapa("frete");
  };

  const handleFreteEscolhido = (frete: OpcaoFrete) => {
    setFreteEscolhido(frete);
    setEtapa("pagamento");
  };

  if (carregandoProduto) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#EA3E83]" />
      </div>
    );
  }

  if (erroProduto || !produto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-[#EA3E83] mb-4" />
        <h1 className="fredoka text-2xl text-gray-900 mb-2">Ops!</h1>
        <p className="text-gray-500 mb-6">{erroProduto}</p>
        <Button
          onClick={() => navigate("/estoque")}
          className="bg-[#EA3E83] hover:bg-[#c72e6c]"
        >
          Voltar ao Estoque
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-pink-100 shadow-sm">
        <div className="container mx-auto px-4 h-20 flex items-center gap-4">
          <button
            onClick={() => navigate("/estoque")}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Voltar
          </button>
          <div className="flex items-center gap-2 ml-auto">
            <img
              src={kitsuyIcon}
              alt="Kitsuy"
              className="w-10 h-10 object-contain"
            />
            <span className="fredoka text-xl font-light text-[#EA3E83]">
              KITSUY STORE
            </span>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {(["endereco", "frete", "pagamento"] as EtapaCheckout[]).map(
            (step, index) => (
              <div key={step} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    etapa === step
                      ? "bg-[#EA3E83] text-white"
                      : index <
                          ["endereco", "frete", "pagamento"].indexOf(etapa)
                        ? "bg-[#EA3E83]/20 text-[#EA3E83]"
                        : "bg-gray-200 text-gray-400"
                  }`}
                >
                  {index + 1}
                </div>
                {index < 2 && <div className="w-8 h-0.5 bg-gray-200 mx-1" />}
              </div>
            ),
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {etapa === "endereco" && (
              <FormEndereco onContinuar={handleEnderecoContinuar} />
            )}

            {etapa === "frete" && endereco && (
              <OpcoesFrete
                produto={produto}
                cep={endereco.cep}
                onVoltar={() => setEtapa("endereco")}
                onEscolher={handleFreteEscolhido}
              />
            )}

            {etapa === "pagamento" && cliente && endereco && freteEscolhido && (
              <FormPagamento
                produto={produto}
                cliente={cliente}
                endereco={endereco}
                frete={freteEscolhido}
                onVoltar={() => setEtapa("frete")}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <ResumoPedido produto={produto} frete={freteEscolhido} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
