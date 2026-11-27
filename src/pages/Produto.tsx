import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronLeft, MessageCircle, ShoppingCart } from "lucide-react";
import { CabecalhoSimples } from "@/components/CabecalhoSimples";
import { CarrinhoSheet } from "@/components/CarrinhoSheet";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useProdutos } from "@/hooks/useProdutos";
import { linkWhatsApp } from "@/config/loja";
import { descricaoSeo, fotosDoProduto, tituloSeo } from "@/lib/seoProduto";
import { cn } from "@/lib/utils";

/** No navegador (e no teste local) o título/descrição acompanham a figure; no deploy o HTML já chega com tudo via api/seo. */
function useHeadProduto(titulo?: string, descricao?: string) {
  useEffect(() => {
    if (!titulo) return;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const antes = { titulo: document.title, descricao: meta?.content };
    document.title = titulo;
    if (meta && descricao) meta.content = descricao;
    return () => {
      document.title = antes.titulo;
      if (meta && antes.descricao) meta.content = antes.descricao;
    };
  }, [titulo, descricao]);
}

export default function Produto() {
  const { slug } = useParams();
  const { produtos, carregando } = useProdutos();
  const { itens, adicionar } = useCart();
  const { toast } = useToast();
  const [api, setApi] = useState<CarouselApi>();
  const [atual, setAtual] = useState(0);

  // Só pronta entrega tem vitrine; links antigos sem slug caem pelo id.
  const produto = produtos.find((p) => p.source === "products" && (p.slug === slug || p.id === slug));
  useHeadProduto(produto && tituloSeo(produto), produto && descricaoSeo(produto));

  useEffect(() => {
    if (!api) return;
    const aoMudar = () => setAtual(api.selectedScrollSnap());
    api.on("select", aoMudar);
    return () => void api.off("select", aoMudar);
  }, [api]);

  if (carregando) {
    return (
      <>
        <CabecalhoSimples />
        <div className="container mx-auto px-4 py-10 grid md:grid-cols-2 gap-8">
          <div className="aspect-square bg-gray-100 rounded-2xl animate-pulse" />
          <div className="h-64 bg-gray-100 rounded-2xl animate-pulse" />
        </div>
      </>
    );
  }

  if (!produto) {
    return (
      <>
        <CabecalhoSimples />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">Figure não encontrada</h1>
          <Link to="/estoque" className="text-[#EA3E83] font-semibold">Ver o catálogo</Link>
        </main>
      </>
    );
  }

  const fotos = fotosDoProduto(produto);
  const disponivel = produto.inStock?.toLowerCase() !== "indisponível";
  const noCarrinho = itens.some((i) => i.id === produto.id);
  const detalhes = [
    ["Fabricante", produto.fabricante],
    ["Série / anime", produto.serie],
    ["Escala", produto.escala],
    ["Altura", produto.alturaFiguraCm && `${String(produto.alturaFiguraCm).replace(".", ",")} cm`],
    ["Material", produto.material],
  ].filter(([, v]) => v) as [string, string][];

  const comprar = () => {
    adicionar({ id: produto.id, collectionName: "products", nome: produto.title, preco: produto.price, imagem: produto.image });
    toast({ title: "Adicionado ao carrinho", description: produto.title });
  };

  return (
    <>
      <CabecalhoSimples />
      <main className="container mx-auto px-4 py-6 md:py-10">
        <div className="flex items-center justify-between mb-6">
          <Link to="/estoque" className="inline-flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#EA3E83]">
            <ChevronLeft className="h-4 w-4" /> Voltar ao catálogo
          </Link>
          <CarrinhoSheet />
        </div>

        <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
          <section aria-label="Fotos">
            <Carousel setApi={setApi} opts={{ loop: fotos.length > 1 }} className="rounded-2xl overflow-hidden bg-black">
              <CarouselContent className="ml-0">
                {fotos.map((f, i) => (
                  <CarouselItem key={f.url + i} className="pl-0">
                    <img
                      src={f.url}
                      alt={f.alt}
                      className={cn("w-full aspect-square object-contain", !disponivel && "grayscale")}
                      loading={i === 0 ? "eager" : "lazy"}
                      fetchPriority={i === 0 ? "high" : undefined}
                      draggable={false}
                    />
                  </CarouselItem>
                ))}
              </CarouselContent>
              {fotos.length > 1 && (
                <>
                  <CarouselPrevious className="left-3 hidden sm:flex" />
                  <CarouselNext className="right-3 hidden sm:flex" />
                </>
              )}
            </Carousel>
            {fotos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                {fotos.map((f, i) => (
                  <button
                    key={f.url + i}
                    type="button"
                    aria-label={`Ver foto ${i + 1}`}
                    aria-current={i === atual}
                    onClick={() => api?.scrollTo(i)}
                    className={cn("shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-lg overflow-hidden border-2 transition", i === atual ? "border-[#EA3E83]" : "border-transparent opacity-70 hover:opacity-100")}
                  >
                    <img src={f.url} alt="" loading="lazy" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">{produto.title}</h1>
            {produto.serie && <p className="text-gray-500 mb-4">{produto.serie}</p>}
            {produto.discount && <p className="text-lg line-through text-gray-400">{produto.discount}</p>}
            <p className="text-3xl font-bold text-primary mb-2">{produto.price}</p>
            <p className={cn("text-sm font-semibold mb-6", disponivel ? "text-green-700" : "text-gray-500")}>
              {disponivel ? "Em estoque · peça única, pronta entrega" : "Esgotada"}
            </p>

            <div className="flex gap-2 mb-8">
              <Button size="lg" className="flex-1" disabled={!disponivel || noCarrinho} onClick={comprar}>
                <ShoppingCart className="mr-2 h-5 w-5" />
                {noCarrinho ? "No carrinho" : "Adicionar ao carrinho"}
              </Button>
              <Button size="lg" variant="outline" aria-label="Perguntar no WhatsApp" onClick={() => window.open(linkWhatsApp(`Olá! Gostaria de saber mais sobre: ${produto.title} ${produto.price}`), "_blank")}>
                <MessageCircle className="h-5 w-5" />
              </Button>
            </div>

            {produto.description && (
              <>
                <h2 className="text-lg font-bold mb-2">Descrição</h2>
                <p className="text-gray-700 whitespace-pre-line mb-6">{produto.description}</p>
              </>
            )}
            {detalhes.length > 0 && (
              <>
                <h2 className="text-lg font-bold mb-2">Detalhes</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
                  {detalhes.map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-gray-500">{k}</dt>
                      <dd className="font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
