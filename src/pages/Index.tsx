import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import DepoimentosCarousel from "@/components/DepoimentosCarousel";
import TiltCard from "@/components/TiltCard";
import BotaoAnimado from "@/components/BotaoAnimado";
import {
  Instagram,
  MessageCircle,
  Package,
  Heart,
  Search,
  Menu,
  MessageCircleQuestion,
  MapPin,
  Star,
  ChevronRight,
  Truck,
  ShieldCheck,
  Clock,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { ProductOfertaCard } from "@/components/ProductOfertaCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { CarrinhoSheet } from "@/components/CarrinhoSheet";
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";
import { inStockAoVivo } from "@/lib/disponibilidade";

// ─── Interfaces ────────────────────────────────────────────────────────────────
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

// ─── Assets ────────────────────────────────────────────────────────────────────
import banner1 from "@/assets/banner-1.png";
import banner2 from "@/assets/banner-2.png";
import banner3 from "@/assets/banner-3.png";
import kitsuyIcon from "@/assets/KitsuyIcon.png";
import kitsuyIconBlack from "@/assets/KitsuyIconBlack.png";
import figure1 from "@/assets/figure-1.png";
import figure2 from "@/assets/figure-2.png";
import figure3 from "@/assets/figure-3.png";
import figure4 from "@/assets/figure-4.png";
import figure5 from "@/assets/figure-5.png";
import figure6 from "@/assets/figure-6.png";
import figure7 from "@/assets/figure-7.png";

// ─── Dados estáticos ───────────────────────────────────────────────────────────
const DEPOIMENTOS = [
  {
    nome: "Ana Lima",
    texto:
      "Recebi minha figure da Frieren em perfeito estado! O atendimento foi super atencioso, me mandaram fotos antes de enviar. Recomendo muito!",
    estrelas: 5,
    figura: "Frieren — SPM Figure",
  },
  {
    nome: "Carlos Mendes",
    texto:
      "Pedi uma figure rara que não tinha em nenhum lugar no Brasil. A Kitsuy encontrou em menos de 2 dias e o preço ficou ótimo. Chegou lacrada do Japão.",
    estrelas: 5,
    figura: "Jujutsu Kaisen — Gojo Satoru",
  },
  {
    nome: "Beatriz Santos",
    texto:
      "Atendimento pelo WhatsApp é 10/10. Tirei todas as dúvidas antes de fechar e eles são super honestos sobre prazos. Já fiz 3 pedidos.",
    estrelas: 5,
    figura: "Demon Slayer — Nezuko",
  },
  {
    nome: "Rafael Costa",
    texto:
      "Não sabia que existia esse tipo de serviço. Você faz um pedido, eles buscam no Japão e entregam no seu endereço. Simples assim. Figura perfeita.",
    estrelas: 5,
    figura: "One Piece — Zoro",
  },
];

const GALERIA = [figure1, figure2, figure3, figure4, figure5, figure6, figure7];

// ─── Componente ────────────────────────────────────────────────────────────────
const Index = () => {
  const [figures, setFigures] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchStock, setSearchStock] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const banners = [
    { image: banner1, alt: "Friren-Banner" },
    { image: banner2, alt: "Promocao-Banner" },
    { image: banner3, alt: "Jujutsu Figure-Banner" },
  ];

  const whatsappLink =
    "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de conhecer os produtos!";
  const whatsappOrcamento =
    "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de fazer um orçamento de encomenda!";
  const whatsappEstoque =
    "https://wa.me/5571997020168?text=Olá! Vim do site e quero saber sobre as figures disponíveis no estoque!";
  const instagramLink = "https://instagram.com/kitsuystore";

  // ─── Firestore ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const productsRef = collection(db, "products");
        const masterpieceRef = collection(db, "masterpiece");

        const [productsSnap, masterpieceSnap] = await Promise.all([
          getDocs(productsRef),
          getDocs(masterpieceRef),
        ]);

        const productsData = productsSnap.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            source: "products",
            ...data,
            inStock: inStockAoVivo(data),
          };
        }) as Product[];

        const masterpieceData = masterpieceSnap.docs.map((doc) => ({
          id: doc.id,
          source: "masterpiece",
          ...doc.data(),
        })) as Product[];

        const allFigures = [...productsData, ...masterpieceData];
        const sortedData = allFigures.sort((a, b) => {
          const aOut = a.inStock?.toLowerCase() === "indisponível";
          const bOut = b.inStock?.toLowerCase() === "indisponível";
          if (aOut !== bOut) return aOut ? 1 : -1;
          const orderA = Number(a.displayOrder) || 999999;
          const orderB = Number(b.displayOrder) || 999999;
          return orderA - orderB;
        });

        setFigures(sortedData);
      } catch (error) {
        console.error("Erro ao carregar as coleções:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  const stockFigures = figures.filter((fig) => fig.source === "products");
  const filteredStock = stockFigures.filter((fig) =>
    fig.title.toLowerCase().includes(searchStock.toLowerCase()),
  );

  // ─── JSX ─────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* ══════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white border-b border-pink-100 shadow-sm">
        <nav className="container mx-auto px-4 h-20 flex justify-between items-center gap-4">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2 min-w-fit">
            <img
              src={kitsuyIcon}
              alt="Kitsuy Icon"
              className="w-14 h-14 object-contain animate-float"
            />
            <span className="fredoka text-2xl md:text-3xl font-bold text-[#FF9AB4]">
              KITSUY STORE
            </span>
          </a>

          {/* Nav desktop */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: "Como Funciona", id: "como-funciona" },
              { label: "Figures", id: "galeria" },
              { label: "Estoque", href: "/estoque" },
              { label: "FAQs", href: "/faqs" },
              { label: "Contato", id: "contato" },
              { label: "Sorteio", href: "/sorteio" },
            ].map((item) =>
              item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <button
                  key={item.label}
                  onClick={() => {
                    const el = document.getElementById(item.id!);
                    if (el) {
                      const y =
                        el.getBoundingClientRect().top + window.scrollY - 84;
                      window.scrollTo({ top: y, behavior: "smooth" });
                    }
                  }}
                  className="text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors"
                >
                  {item.label}
                </button>
              ),
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 items-center">
            <CarrinhoSheet />
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

            {/* Menu mobile */}
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
                      icon: Package,
                      label: "Ver Estoque",
                      action: () => (window.location.href = "/estoque"),
                    },
                  ].map(({ icon: Icon, label, action }) => (
                    <Button
                      key={label}
                      variant="outline"
                      className="w-full justify-start gap-3 h-12"
                      onClick={action}
                    >
                      <Icon className="h-5 w-5" />
                      {label}
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      <section className="w-full px-4 md:px-6 mt-4">
        <a
          href="/sorteio"
          className="group relative flex flex-col sm:flex-row items-center justify-between gap-4 w-full bg-gradient-to-r from-[#5CE1E6] to-[#AAECEF] rounded-2xl px-6 py-5 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01] overflow-hidden cursor-pointer"
        >
          {/* Padrão de fundo decorativo */}
          <div
            className="absolute inset-0 opacity-10 pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20px 20px, white 2px, transparent 0)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Lado esquerdo: ícone + texto */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="text-4xl select-none animate-bounce">🩵</div>
            <div>
              <p className="fredoka text-white text-xl md:text-2xl font-bold leading-tight">
                Sorteio de 1.500 seguidores!
              </p>
              <p className="text-white/85 text-sm font-semibold">
                Siga no Instagram e concorra a uma figure japonesa original -
                Grátis!
              </p>
            </div>
          </div>

          {/* Lado direito: CTA */}
          <div className="flex items-center gap-2 bg-white text-[#00C4AE] font-bold text-sm px-5 py-2.5 rounded-full shadow-md group-hover:bg-[#fffff] transition-colors whitespace-nowrap relative z-10">
            Quero participar
            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </a>
      </section>

      {/* ══════════════════════════════════════════════════
          BANNER CAROUSEL
      ══════════════════════════════════════════════════ */}
      <section className="w-full px-4 md:px-6 pt-6">
        <Carousel
          className="w-full"
          plugins={[
            Autoplay({
              delay: 3500,
              stopOnInteraction: false,
              stopOnMouseEnter: true,
            }),
          ]}
          opts={{ loop: true }}
        >
          <CarouselContent>
            {banners.map((banner, index) => (
              <CarouselItem key={index}>
                <div className="relative aspect-[16/9] md:aspect-[21/7] overflow-hidden rounded-2xl">
                  <img
                    src={banner.image}
                    alt={banner.alt}
                    className="w-full h-full object-contain"
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3 bg-[#EA3E83] text-white border-none hover:bg-[#c72e6c]" />
          <CarouselNext className="right-3 bg-[#EA3E83] text-white border-none hover:bg-[#c72e6c]" />
        </Carousel>
      </section>

      {/* ══════════════════════════════════════════════════
          HERO — O QUE É A KITSUY STORE
      ══════════════════════════════════════════════════ */}
      <section id="sobre" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
            Sobre a Kitsuy Store
          </span>
          <h2 className="fredoka text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Sua figure dos sonhos,{" "}
            <span className="text-[#EA3E83]">direto do Japão</span> até você.
          </h2>
          <div className="w-124 h-1 mx-auto mb-6 rounded-full bg-[#EA3E83]/20 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#EA3E83] to-transparent animate-shimmer" />
          </div>
          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10">
            A Kitsuy Store é especializada em <strong>Action Figures</strong>{" "}
            originais do <strong>Japão</strong>. Mais do que uma loja, nós
            buscamos para você as melhores peças diretamente em sites japoneses,
            cuidando de todo o processo de importação. Você não precisa se
            preocupar em navegar em sites internacionais, calcular frete ou
            lidar com a alfândega, trazendo cada peça com segurança, atenção e
            todo o cuidado que a sua coleção merece! -{" "}
            <strong>a gente faz tudo isso por você! </strong>
          </p>
          {/* Diferenciais rápidos */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {[
              {
                icon: ShieldCheck,
                title: "100% Originais",
                desc: "Só figures licenciadas e autênticas do Japão, nada de réplicas ou falsificações. Garantia de qualidade pra sua coleção.",
              },
              {
                icon: MapPin,
                title: "Buscamos pra você",
                desc: "Orcamento personalizado para a figure que você quer, mesmo que seja rara ou esgotada no Brasil!",
              },
              {
                icon: Heart,
                title: "Atendimento humano",
                desc: "Tudo resolvido pelo WhatsApp, sem chatbots. A gente responde suas dúvidas e te ajuda a escolher a melhor peça pra sua coleção.",
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-pink-100 hover:border-[#EA3E83] hover:shadow-lg transition-all duration-300 hover:translate-y-[-5px] cursor-pointer"
              >
                <button onClick={() => window.open(whatsappLink, "_blank")}>
                  <Icon className="h-6 w-6 text-[#EA3E83]" />
                </button>
                <h3 className="fredoka font-light text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 font-semibold text-center">
                  {desc}
                </p>
              </div>
            ))}
          </div>

          <Button
            size="lg"
            onClick={() => window.open(whatsappOrcamento, "_blank")}
            className="bg-[#EA3E83] hover:bg-[#c72e6c] text-white gap-2 text-base px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <MessageCircle className="h-5 w-5" />
            Pedir um orçamento grátis
          </Button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          COMO FUNCIONA — 4 PASSOS
      ══════════════════════════════════════════════════ */}
      <section
        id="como-funciona"
        className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white"
      >
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14">
            <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
              Encomendas
            </span>
            <h2 className="fredoka text-4xl md:text-5xl text-gray-900">
              Como funciona nossa loja
            </h2>
          </div>

          <div className="relative">
            {/* Linha conectora desktop */}
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-pink-100 overflow-hidden z-0">
              <div className="h-full bg-[#EA3E83] animate-line-flow" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                {
                  step: "01",
                  icon: MessageCircle,
                  title: "Você pergunta",
                  desc: "Manda uma mensagem no WhatsApp com o nome ou imagem da figure que você quer. Pode ser qualquer item colecionável japonês.",
                },
                {
                  step: "02",
                  icon: Search,
                  title: "A gente busca",
                  desc: "Pesquisamos nas lojas do Japão e encontramos o melhor preço disponível.",
                },
                {
                  step: "03",
                  icon: Package,
                  title: "Passamos o preço",
                  desc: "Te enviamos um orçamento com o valor total: produto + frete internacional + nossa taxa de serviço. Sem surpresas.",
                },
                {
                  step: "04",
                  icon: Truck,
                  title: "Você recebe",
                  desc: "Confirmado o pedido, importamos e enviamos direto para nosso estoque no Brasil onde preparamos e enviamos diretamente para o seu endereço!.",
                },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div
                  key={step}
                  className="flex flex-col items-center text-center gap-4"
                >
                  <div className="relative">
                    <div
                      className="w-24 h-24 bg-white border-4 border-[#EA3E83] rounded-full flex items-center justify-center shadow-md step-bubble"
                      style={{ animationDelay: `${(Number(step) - 1) * 2}s` }}
                    >
                      <Icon className="h-9 w-9 text-[#EA3E83]" />
                    </div>
                    <span className="absolute -top-1 -right-1 bg-[#EA3E83] text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="fredoka text-xl text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 font-semibold leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA central */}
          <div className="mt-14 text-center">
            <div className="inline-flex flex-col sm:flex-row gap-4 items-center bg-white border-2 border-pink-200 rounded-2xl px-8 py-6 shadow-sm">
              <div className="text-left">
                <p className="font-bold text-gray-900">Feedbacks? Sim!</p>
                <p className="text-sm text-gray-500">
                  A gente adora ouvir nossos clientes! 🧡
                </p>
              </div>
              <Button
                onClick={() =>
                  scrollTo({
                    top: document.getElementById("depoimentos")!.offsetTop - 84,
                    behavior: "smooth",
                  })
                }
                className="bg-[#EA3E83] hover:bg-[#c72e6c] text-white gap-2 whitespace-nowrap"
              >
                <MessageCircle className="h-4 w-4" />
                Quero dar minha opinião!
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          GALERIA DE FIGURES
          ⚠️  Substitua as imagens em src/assets/figure-*.png
              pelas fotos que você quiser exibir aqui.
      ══════════════════════════════════════════════════ */}
      <section id="galeria" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
              Galeria
            </span>
            <h2 className="fredoka text-4xl md:text-5xl font-light text-gray-900 mb-3">
              Figures que já passaram por aqui
            </h2>
            <p className="font-semibold text-gray-500 max-w-xl mx-auto">
              Cada peça importada com cuidado. Clique para ampliar — e se quiser
              uma dessas ou qualquer outra, é só chamar.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {GALERIA.map((img, i) => (
              <TiltCard
                key={i}
                onClick={() => setSelectedImage(img)}
                className="group relative aspect-ratio rounded-2xl overflow-hidden border-2 border-transparent hover:border-white shadow-sm hover:shadow-xl"
              >
                <img
                  src={img}
                  alt={`Figure ${i + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                />

                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
                  <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity text-sm">
                    Ver maior
                  </span>
                </div>
              </TiltCard>
            ))}

            {/* Card CTA dentro da galeria */}
            <div
              onClick={() => window.open(whatsappOrcamento, "_blank")}
              className="group relative aspect-ratio rounded-2xl overflow-hidden cursor-pointer bg-gradient-to-br from-[#EA3E83] to-[#FF8FBC] flex flex-col items-center justify-center gap-3 hover:shadow-xl transition-all duration-300"
            >
              <MessageCircle className="h-10 w-10 text-white" />
              <p className="text-white font-bold text-center text-sm px-4 leading-tight">
                Quer uma dessas? Chama no WhatsApp!
              </p>
              <ArrowRight className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Modal imagem ampliada */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <img
            src={selectedImage}
            alt="Figure ampliada"
            draggable={false}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80 text-xl font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          ESTOQUE — PREVIEW (3 cards) + LINK PARA /estoque
      ══════════════════════════════════════════════════ */}
      <section id="estoque-preview" className="py-20 px-4 bg-gray-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12">
            <div>
              <span className="inline-block bg-pink-500 text-white text-xs font-bold px-4 py-1 rounded-full mb-3 tracking-widest uppercase">
                Pronta Entrega
              </span>
              <h2 className="fredoka text-4xl font-light text-gray-900">
                Figures no estoque no Brasil
              </h2>
              <p className="font-semibold text-gray-500 mt-2">
                Sem esperar importação! essas estão aqui e saem em até 4 dias
                úteis direto para sua casa.
              </p>
            </div>
            <a
              href="/estoque"
              className="flex items-center gap-2 text-[#EA3E83] font-bold hover:underline whitespace-nowrap"
            >
              Ver todos <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[420px] bg-white rounded-2xl animate-pulse border border-pink-100"
                />
              ))}
            </div>
          ) : filteredStock.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStock.slice(0, 3).map((figure, index) => (
                <div key={index}>
                  <ProductCard {...figure} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              Nenhum produto disponível no momento.
            </div>
          )}

          {/* CTA ver mais */}
          <div className="mt-10 text-center flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/estoque">
              <Button
                variant="outline"
                className="border-2 border-[#EA3E83] text-[#EA3E83] hover:bg-[#EA3E83] hover:text-white gap-2 px-8 py-6 text-base rounded-full"
              >
                <Package className="h-5 w-5" />
                Ver todas as figures no estoque
              </Button>
            </a>
            <Button
              onClick={() => window.open(whatsappEstoque, "_blank")}
              className="bg-[#EA3E83] hover:bg-[#c72e6c] text-white gap-2 px-8 py-6 text-base rounded-full"
            >
              <MessageCircle className="h-5 w-5" />
              Perguntar sobre disponibilidade
            </Button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          DEPOIMENTOS
          ⚠️  Substitua os textos no array DEPOIMENTOS
              pelos feedbacks reais dos seus clientes.
      ══════════════════════════════════════════════════ */}

      <section id="depoimentos" className="py-20 px-4 bg-white">
        <DepoimentosCarousel />
        <div className="mt-10 text-center">
          <button
            id="feedbacks"
            className="bg-[#EA3E83] hover:bg-[#c72e6c] text-white gap-2 px-8 py-4 text-base rounded-full"
            onClick={() =>
              window.open("https://forms.gle/NpLpF855u32zKAL37", "_blank")
            }
          >
            Enviar Feedback!
          </button>
        </div>

        <div className="container mx-auto max-w-5xl">
          {/* <div className="text-center mb-12">
            <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
              Depoimentos
            </span>
            <h2 className="fredoka text-4xl md:text-5xl font-bold text-gray-900">
              Quem já pediu, aprova
            </h2>
            <p className="text-gray-500 mt-3">
              ⚠️{" "}
              <em>
                Substitua esses textos pelos feedbacks reais dos seus clientes.
              </em>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DEPOIMENTOS.map(({ nome, texto, estrelas, figura }) => (
              <div
                key={nome}
                className="bg-white border-2 border-pink-100 rounded-2xl p-6 hover:border-[#EA3E83] hover:shadow-lg transition-all duration-300"
              >
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: estrelas }).map((_, i) => (
                    <Star
                      key={i}
                      className="h-4 w-4 fill-[#EA3E83] text-[#EA3E83]"
                    />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-4 italic">
                  "{texto}"
                </p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{nome}</span>
                  <span className="text-xs text-gray-400 bg-pink-50 px-3 py-1 rounded-full">
                    {figura}
                  </span>
                </div>
              </div>
            ))}
          </div> */}
        </div>
        <button
          onClick={() => scrollTo({ top: 0, behavior: "smooth" })}
          className="mt-10 flex items-center gap-2 text-[#EA3E83] font-bold hover:underline mx-auto"
        >
          Voltar ao topo <ChevronRight className="h-4 w-4" />
        </button>
      </section>

      {/* ══════════════════════════════════════════════════
          ENCOMENDA — CTA
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#EA3E83] to-[#c72e6c] text-white relative overflow-hidden">
        {/* Padrão de fundo decorativo */}
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30px 30px, white 3px, transparent 0)",
            backgroundSize: "60px 60px",
          }}
        />
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="fredoka text-4xl md:text-6xl font-bold mb-4">
            Não encontrou o que procura?
          </h2>
          <p className="text-xl opacity-90 mb-4 max-w-2xl mx-auto">
            Se existe no Japão, a gente encontra. Manda o nome ou a foto da
            figure e a gente já começa a pesquisar pra você —{" "}
            <strong>sem compromisso.</strong>
          </p>
          <p className="text-base opacity-75 mb-10">
            Atendemos via WhatsApp de segunda a sábado. Orçamento grátis, sem
            robô.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              onClick={() => window.open(whatsappOrcamento, "_blank")}
              className="bg-white text-[#EA3E83] hover:bg-white gap-2 text-base px-8 py-6 rounded-full font-bold shadow-lg"
            >
              <MessageCircle className="h-5 w-5" />
              Pedir orçamento pelo WhatsApp
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open(instagramLink, "_blank")}
              className="border-2 border-white text-black hover:bg-white hover:text-[#EA3E83] gap-2 text-base px-8 py-6 rounded-full"
            >
              <Instagram className="h-5 w-5" />
              Seguir no Instagram
            </Button>
          </div>

          {/* Checklist de garantias */}
          <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm">
            {[
              "Figures 100% originais",
              "Orçamento sem compromisso",
              "Rastreamento completo",
              "Atendimento humano",
              "Pagamento via PIX ou cartão",
            ].map((item) => (
              <div key={item} className="flex items-center gap-2 opacity-90">
                <CheckCircle2 className="h-4 w-4" />
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════ */}
      <footer id="contato" className="bg-gray-950 text-white py-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img
                  src={kitsuyIconBlack}
                  alt="Kitsuy"
                  className="w-10 h-10 object-contain"
                />
                <span className="fredoka text-xl font-bold">KITSUY STORE</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Importação de figures e colecionáveis japoneses por demanda. Sua
                coleção merece o original.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-bold text-sm mb-3 text-gray-300 uppercase tracking-wider">
                Navegação
              </h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Como funciona", href: "#como-funciona" },
                  { label: "Estoque", href: "/estoque" },
                  { label: "FAQs", href: "/faqs" },
                ].map(({ label, href }) => (
                  <a
                    key={label}
                    href={href}
                    className="text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>

            {/* Contato */}
            <div>
              <h4 className="font-bold text-sm mb-3 text-gray-300 uppercase tracking-wider">
                Contato
              </h4>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => window.open(whatsappLink, "_blank")}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors text-left"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp: (71) 99702-0168
                </button>
                <button
                  onClick={() => window.open(instagramLink, "_blank")}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors text-left"
                >
                  <Instagram className="h-4 w-4" />
                  @kitsuystore
                </button>
                <button
                  onClick={() =>
                    (window.location.href = "mailto:kitsuystore@gmail.com")
                  }
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors text-left"
                >
                  <Clock className="h-4 w-4" />
                  kitsuystore@gmail.com
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
            <span>© 2025 Kitsuy Store. Todos os direitos reservados.</span>
            <span>Figures, Colecionáveis e muito mais do Japão.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
