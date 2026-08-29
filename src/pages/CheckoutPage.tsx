import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import { getPedidoReservado, chaveCarrinho } from "@/lib/reservaSessao";
import { inStockAoVivo } from "@/lib/disponibilidade";
import { ResumoPedido } from "@/components/checkout/ResumoPedido";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Loader2, AlertTriangle } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { itens: itensCarrinho, remover: removerDoCarrinho } = useCart();
  const { toast } = useToast();

  const [produtos, setProdutos] = useState<ProdutoCheckout[]>([]);
  const [carregandoProdutos, setCarregandoProdutos] = useState(true);
  const [erroProdutos, setErroProdutos] = useState<string | null>(null);

  const [etapa, setEtapa] = useState<EtapaCheckout>("endereco");
  const [cliente, setCliente] = useState<DadosCliente | null>(null);
  const [endereco, setEndereco] = useState<Endereco | null>(null);
  const [freteEscolhido, setFreteEscolhido] = useState<OpcaoFrete | null>(null);

  // Evita rebuscar os produtos toda vez que `itensCarrinho` muda de
  // referência (o array do contexto é recriado a cada render) — só refaz a
  // busca se o CONJUNTO de produtoIds realmente mudou.
  const idsCarrinho = itensCarrinho.map((i) => i.id).sort().join(",");
  const idsBuscadosRef = useRef<string | null>(null);

  useEffect(() => {
    if (idsBuscadosRef.current === idsCarrinho) return;
    idsBuscadosRef.current = idsCarrinho;

    if (itensCarrinho.length === 0) {
      setErroProdutos("Seu carrinho está vazio.");
      setCarregandoProdutos(false);
      return;
    }

    const buscarProdutos = async () => {
      setCarregandoProdutos(true);
      setErroProdutos(null);

      try {
        const chave = chaveCarrinho(itensCarrinho.map((i) => i.id));
        const temReservaPropria = !!getPedidoReservado(chave);

        const resultados = await Promise.all(
          itensCarrinho.map(async (item) => {
            const snap = await getDoc(doc(db, item.collectionName, item.id));
            return { item, snap };
          }),
        );

        const disponiveis: ProdutoCheckout[] = [];
        const removidos: { id: string; nome: string }[] = [];

        for (const { item, snap } of resultados) {
          if (!snap.exists()) {
            removidos.push({ id: item.id, nome: item.nome });
            continue;
          }

          const data = snap.data();

          // inStockAoVivo() calcula a disponibilidade a partir do prazo real
          // da reserva (reservadoAte), não do campo `inStock` salvo — assim
          // um checkout abandonado libera pra qualquer visitante assim que o
          // prazo vence. Se este navegador já tem uma reserva em andamento
          // pro carrinho atual (voltou/recarregou a página), deixa passar
          // mesmo ela ainda não tendo vencido — quem decide de verdade se a
          // reserva ainda é dele é o backend (renovarReservaMultiplosProdutos),
          // na próxima chamada a /api/criar-preferencia.
          if (
            inStockAoVivo(data).toLowerCase() === "indisponível" &&
            !temReservaPropria
          ) {
            removidos.push({ id: item.id, nome: item.nome });
            continue;
          }

          disponiveis.push({
            id: item.id,
            nome: data.title,
            preco: data.price,
            imagem: data.image,
          });
        }

        if (removidos.length > 0) {
          removidos.forEach(({ id }) => removerDoCarrinho(id));
          toast({
            title:
              removidos.length === 1
                ? "Um produto saiu do carrinho"
                : "Produtos saíram do carrinho",
            description: `${removidos.map((r) => r.nome).join(", ")} não está(ão) mais disponível(is).`,
            variant: "destructive",
          });
        }

        setProdutos(disponiveis);

        if (disponiveis.length === 0) {
          setErroProdutos("Nenhum produto do carrinho está disponível no momento.");
        }
      } catch (error) {
        console.error("Erro ao buscar produtos do carrinho:", error);
        setErroProdutos("Erro ao carregar carrinho. Tente novamente.");
      } finally {
        setCarregandoProdutos(false);
      }
    };

    buscarProdutos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsCarrinho]);

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

  if (carregandoProdutos) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#EA3E83]" />
      </div>
    );
  }

  if (erroProdutos || produtos.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white px-4 text-center">
        <AlertTriangle className="h-12 w-12 text-[#EA3E83] mb-4" />
        <h1 className="fredoka text-2xl text-gray-900 mb-2">Ops!</h1>
        <p className="text-gray-500 mb-6">{erroProdutos}</p>
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
                produtos={produtos}
                cep={endereco.cep}
                onVoltar={() => setEtapa("endereco")}
                onEscolher={handleFreteEscolhido}
              />
            )}

            {etapa === "pagamento" && cliente && endereco && freteEscolhido && (
              <FormPagamento
                produtos={produtos}
                cliente={cliente}
                endereco={endereco}
                frete={freteEscolhido}
                onVoltar={() => setEtapa("frete")}
              />
            )}
          </div>

          <div className="lg:col-span-1">
            <ResumoPedido produtos={produtos} frete={freteEscolhido} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
