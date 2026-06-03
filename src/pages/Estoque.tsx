import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import {
  Instagram,
  MessageCircle,
  Package,
  Search,
  Menu,
  MessageCircleQuestion,
  ChevronLeft,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

import kitsuyIcon from "@/assets/KitsuyIcon.png";
import kitsuyIconBlack from "@/assets/KitsuyIconBlack.png";

interface Product {
  id: string;
  title: string;
  inStock: string;
  discount: string;
  price: string;
  image: string;
  displayOrder?: number;
  description?: string;
  stock?: number;
  featured?: boolean;
  source?: string;
}

const Estoque = () => {
  const [figures, setFigures] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const whatsappLink =
    "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de conhecer os produtos!";
  const whatsappEstoque =
    "https://wa.me/5571997020168?text=Olá! Vim do site e quero saber sobre as figures disponíveis no estoque!";
  const instagramLink = "https://instagram.com/kitsuystore";

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const productsRef = collection(db, "products");
        const masterpieceRef = collection(db, "masterpiece");

        const [productsSnap, masterpieceSnap] = await Promise.all([
          getDocs(productsRef),
          getDocs(masterpieceRef),
        ]);

        const productsData = productsSnap.docs.map((doc) => ({
          id: doc.id,
          source: "products",
          ...doc.data(),
        })) as Product[];

        const masterpieceData = masterpieceSnap.docs.map((doc) => ({
          id: doc.id,
          source: "masterpiece",
          ...doc.data(),
        })) as Product[];

        const allFigures = [...productsData, ...masterpieceData].sort(
          (a, b) => {
            const aOut = a.inStock?.toLowerCase() === "indisponível";
            const bOut = b.inStock?.toLowerCase() === "indisponível";
            if (aOut !== bOut) return aOut ? 1 : -1;
            const orderA = Number(a.displayOrder) || 999999;
            const orderB = Number(b.displayOrder) || 999999;
            return orderA - orderB;
          },
        );

        setFigures(allFigures);
      } catch (error) {
        console.error("Erro ao carregar produtos:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const filteredFigures = figures.filter((fig) =>
    fig.title?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const stockFigures = filteredFigures.filter(
    (fig) => fig.source === "products",
  );
  const masterpieceFigures = filteredFigures.filter(
    (fig) => fig.source === "masterpiece",
  );

  return (
    <div className="min-h-screen bg-white">
      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-white border-b border-pink-100 shadow-sm">
        <nav className="container mx-auto px-4 h-20 flex justify-between items-center gap-4">
          <a href="/" className="flex items-center gap-2 min-w-fit">
            <img
              src={kitsuyIcon}
              alt="Kitsuy Icon"
              className="w-14 h-14 object-contain animate-float"
            />
            <span className="fredoka text-2xl md:text-3xl font-light text-[#EA3E83]">
              KITSUY STORE
            </span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            <a
              href="/"
              className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors"
            >
              <ChevronLeft className="h-4 w-4" /> Início
            </a>
            <a
              href="/faqs"
              className="text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors"
            >
              FAQs
            </a>
          </div>

          <div className="flex gap-2 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(instagramLink, "_blank")}
              className="hidden sm:flex hover:bg-pink-50 hover:text-[#EA3E83]"
            >
              <Instagram className="h-5 w-5" />
            </Button>
            <Button
              onClick={() => window.open(whatsappLink, "_blank")}
              className="hidden sm:flex bg-[#EA3E83] hover:bg-[#c72e6c] text-white gap-2"
              size="sm"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </Button>
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="md:hidden gap-2 border-[#EA3E83] text-[#EA3E83]"
                >
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="text-[#EA3E83] fredoka text-xl">
                    Menu
                  </SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {[
                    {
                      icon: MessageCircle,
                      label: "WhatsApp",
                      action: () => window.open(whatsappLink, "_blank"),
                    },
                    {
                      icon: Instagram,
                      label: "Instagram",
                      action: () => window.open(instagramLink, "_blank"),
                    },
                    {
                      icon: MessageCircleQuestion,
                      label: "FAQs",
                      action: () => (window.location.href = "/faqs"),
                    },
                    {
                      icon: ChevronLeft,
                      label: "Voltar ao início",
                      action: () => (window.location.href = "/"),
                    },
                  ].map(({ icon: Icon, label, action }) => (
                    <Button
                      key={label}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                      onClick={action}
                    >
                      <Icon className="h-5 w-5" /> {label}
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* HERO DA PÁGINA */}
      <section className="py-14 px-4 bg-gradient-to-b from-gray-50 to-white text-center">
        <div className="container mx-auto max-w-3xl">
          <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
            Pronta Entrega · No Brasil
          </span>
          <h1 className="fredoka text-4xl md:text-5xl font-light text-gray-900 mb-4">
            Figures em estoque
          </h1>
          <p className="text-gray-500 text-lg max-w-xl mx-auto mb-8">
            Essas já estão aqui no Brasil. Sem esperar importação — envio em até
            4 dias úteis para todo o país.
          </p>

          {/* Barra de pesquisa */}
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Pesquisar figure..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-base rounded-full border-2 border-pink-200 focus:border-[#EA3E83] focus:ring-0 shadow-sm"
            />
          </div>
          {searchQuery && (
            <p className="text-sm text-gray-500 mt-3">
              {filteredFigures.length}{" "}
              {filteredFigures.length === 1
                ? "produto encontrado"
                : "produtos encontrados"}
            </p>
          )}
        </div>
      </section>

      {/* SEÇÃO: EM ESTOQUE (products) */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-3 h-8 bg-[#EA3E83] rounded-full" />
            <h2 className="fredoka text-2xl font-light text-gray-900">
              Em estoque
            </h2>
            <span className="text-sm text-gray-400 ml-2">
              {loading ? "carregando..." : `${stockFigures.length} itens`}
            </span>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-[420px] bg-gray-100 rounded-2xl animate-pulse"
                />
              ))}
            </div>
          ) : stockFigures.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {stockFigures.map((figure, index) => (
                <div key={index}>
                  <ProductCard {...figure} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Package className="h-16 w-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nenhuma figure em estoque no momento.</p>
              <p className="text-sm mt-2">
                Fale com a gente para saber o que está chegando!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* SEÇÃO: SOB ENCOMENDA (masterpiece) */}
      {masterpieceFigures.length > 0 && (
        <section className="py-12 px-4 bg-gray-50">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-8 bg-gray-800 rounded-full" />
              <h2 className="fredoka text-2xl font-light text-gray-900">
                Sob encomenda
              </h2>
              <span className="text-sm text-gray-400 ml-2">
                {masterpieceFigures.length} itens
              </span>
            </div>
            <p className="text-gray-500 font-semibold text-sm mb-8 ml-6">
              Estas figures precisam ser importadas sob pedido. Prazo: 30 a 65
              dias úteis.
            </p>

            <div className="overflow-x-auto pb-4">
              <div className="flex gap-6 min-w-max px-1">
                {masterpieceFigures.map((fig, index) => (
                  <div
                    key={index}
                    className="w-[220px] bg-white rounded-2xl shadow-md p-4 flex flex-col hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
                  >
                    <img
                      src={fig.image}
                      alt={fig.title}
                      draggable={false}
                      className="w-full aspect-ratio object-cover rounded-xl mb-3"
                    />
                    <h3 className="font-light text-gray-900 text-sm leading-tight mb-3 line-clamp-2">
                      {fig.title}
                    </h3>
                    <button
                      className="w-full py-2 rounded-xl bg-[#EA3E83] text-white text-sm font-semibold hover:bg-[#c72e6c] mt-auto transition-colors"
                      onClick={() => {
                        const msg = `Olá! Vi a figure "${fig.title}" no site e quero um orçamento!`;
                        window.open(
                          `https://wa.me/5571997020168?text=${encodeURIComponent(msg)}`,
                          "_blank",
                        );
                      }}
                    >
                      Pedir orçamento
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* CTA FINAL */}
      <section className="py-16 px-4 bg-[#EA3E83] text-white text-center">
        <div className="container mx-auto max-w-2xl">
          <h2 className="fredoka text-3xl md:text-4xl font-light mb-4">
            Não encontrou o que queria?
          </h2>
          <p className="opacity-90 mb-8">
            Se existe no Japão, a gente encontra. Manda o nome ou a foto e a
            gente pesquisa pra você — orçamento grátis e sem compromisso.
          </p>
          <Button
            size="lg"
            onClick={() => window.open(whatsappEstoque, "_blank")}
            className="bg-white text-[#EA3E83] hover:bg-white/90 gap-2 font-bold px-8 py-6 text-base rounded-full"
          >
            <MessageCircle className="h-5 w-5" />
            Chamar no WhatsApp
          </Button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-950 text-white py-8 px-4">
        <div className="container mx-auto max-w-5xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <img
              src={kitsuyIconBlack}
              alt="Kitsuy"
              className="w-8 h-8 object-contain"
            />
            <span className="fredoka text-lg font-bold">KITSUY STORE</span>
          </div>
          <p className="text-xs text-gray-600">
            © 2025 Kitsuy Store. Todos os direitos reservados.
          </p>
          <div className="flex gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(whatsappLink, "_blank")}
              className="text-gray-400 hover:text-white"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(instagramLink, "_blank")}
              className="text-gray-400 hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Estoque;
