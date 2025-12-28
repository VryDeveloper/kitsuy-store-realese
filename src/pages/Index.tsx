import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { Instagram, MessageCircle, Package, Heart, Zap, Menu, Search, BugIcon, MessageCircleQuestion } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import StyledWrapper from "@/components/ui/buttonPlay";
import { ProductOfertaCard } from "@/components/ProductOfertaCard";
import { CountdownTimer } from "@/components/CountdownTimer";
import { db } from "@/firebaseConfig"; // 🔥 Firestore
import { collection, getDocs } from "firebase/firestore"; // 🔥 Firestore
import { SpeedInsights } from "@vercel/speed-insights/next"
import TituloWorm from "@/components/TituloWorm";

// 🎯 Interface para definir a estrutura dos produtos
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
  source?: string; // 🔥 identifica a coleção
}

// Banners
import banner1 from "@/assets/banner-1.png";
import banner2 from "@/assets/banner-2.png";
import banner3 from "@/assets/banner-3.png";
import kitsuyIcon from "@/assets/KitsuyIcon.png";
import kitsuyIconBlack from "@/assets/KitsuyIconBlack.png";

// Ofertas locais (pode depois migrar para Firestore também)
import oferta1 from "@/assets/oferta1.webp";
import oferta2 from "@/assets/oferta2.webp";
import { useNavigate, useNavigation } from "react-router-dom";

const Index = () => {
  const [figures, setFigures] = useState<Product[]>([]); // 🔥 State para produtos vindos do Firestore
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(""); // Estado para pesquisa

  const banners = [
    { image: banner1, alt: "Friren-Banner" },
    { image: banner2, alt: "Promocao-Banner" },
    { image: banner3, alt: "Jujutsu Figure-Banner" }
  ];

  const ofertaEspecial = [
    {
      image: oferta1,
      title: "Tobi - Vibration Stars",
      price: "R$ 216",
      category: "Figure",
    },
    {
      image: oferta2,
      title: "Itachi - EFFECTREME",
      price: "R$ 260",
      category: "Figure",
    },
  ];

  const whatsappLink = "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de conhecer os produtos!";
  const whatsappLink3 = "https://wa.me/5571997020168?text=Vim do site. Gostaria de saber sobre a oferta double!";
  const whatsappLink2 = "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria fazer um orçamento!";
  const instagramLink = "https://instagram.com/kitsuystore";

  // 🔥 Firestore - Buscar products
    useEffect(() => {
      const fetchAllProducts = async () => {
        try {
          const productsRef = collection(db, "products");
          const masterpieceRef = collection(db, "masterpiece");

          const [productsSnap, masterpieceSnap] = await Promise.all([
            getDocs(productsRef),
            getDocs(masterpieceRef),
          ]);

          const productsData = productsSnap.docs.map((doc) => ({
            id: doc.id,
            source: "products",      // 🔥 identifica a coleção
            ...doc.data(),
          })) as Product[];

          const masterpieceData = masterpieceSnap.docs.map((doc) => ({
            id: doc.id,
            source: "masterpiece",   // 🔥 identifica a coleção
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
        }
      };

      fetchAllProducts();
    }, []);

  // Filtrar produtos baseado na pesquisa
  
  const masterpieceFigures = figures.filter(
    (fig) => fig.source === "masterpiece"
  );

  const stockFigures = figures.filter(
    (fig) => fig.source === "products"
  );

  const filteredAll = figures.filter((fig) =>
    fig.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  /*const filteredStock = filteredAll.filter((fig) => fig.source === "products");
  const filteredMasterpiece = filteredAll.filter((fig) => fig.source === "masterpiece");*/

  const [searchStock, setSearchStock] = useState("");
  const [searchMasterpiece, setSearchMasterpiece] = useState("");

  const filteredStock = stockFigures.filter((fig) =>
    fig.title.toLowerCase().includes(searchStock.toLowerCase())
  );

  const filteredMasterpiece = masterpieceFigures.filter((fig) =>
    fig.title.toLowerCase().includes(searchMasterpiece.toLowerCase())
  );

  const [selectedImage, setSelectedImage] = useState(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header / Navigation - Asian Style */}
      <header className="sticky top-0 h-[6.5rem] border z-50 bg-card/98 bg-white shadow-md rounded-b-[24px]">
        <nav className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 min-w-fit">
              <img
                src={kitsuyIcon}
                alt="Kitsuy Icon"
                className="w-24 h-24 object-contain animate-float"
              />
              <h1 className="fredoka text-2xl md:text-4xl font-display font-bold bg-[#FF9AB4] bg-clip-text text-transparent hover:cursor-default hover:scale-105 transition-transform duration-200">
                KITSUY STORE
              </h1>
            </div>
            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <div className="hidden md:flex flex-1 max-w-md mx-4">
                  <div className="flex items-center justify-center space-x-6 w-full">
                    <button
                      onClick={() => {
                        const section = document.getElementById('sobre');
                        if (section) {
                          const y = section.getBoundingClientRect().top + window.scrollY - 80; // 80px = altura do header
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                    >
                      Sobre
                    </button>
                    
                    <button
                      onClick={() => {
                        const section = document.getElementById('figures');
                        if (section) {
                          const y = section.getBoundingClientRect().top + window.scrollY - 80; // 80px = altura do header
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                    >
                      Figures
                    </button>
                    
                    <div className="relative group">
                      <button
                        onClick={() => document.getElementById('camisetas')?.scrollIntoView({ behavior: 'smooth' })}
                        className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md outline-none focus:outline-none focus:ring-0 focus:border-none"
                        style={{ outline: 'none', border: 'none', boxShadow: 'none' }}
                      >
                        Camisetas
                      </button>
                      
                      {/* Tooltip que aparece no hover */}
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                        <div className="bg-pink-500 text-white text-xs font-semibold px-2 py-1 rounded-md shadow-lg whitespace-nowrap">
                          Em breve!
                        </div>
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-pink-500 rotate-45"></div>
                      </div>
                    </div>

                    <a
                      href="/faqs"
                      className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                    >
                      FAQs
                    </a>

                    <button
                      onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                    >
                      Contato
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Menu & Social */}
            <div className="flex gap-2 items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.open(instagramLink, '_blank')}
                className="hidden sm:flex hover:scale-110 hover:text-white hover:bg-black"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              
              {/* Quick Actions Menu - Accordion Style */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-primary text-white border-primary hover:bg-black hover:border-black w-auto h-10">
                    <Menu className="h-4 w-4" />
                    <span className="hidden sm:inline ">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="font-japanese text-xl">Ações Rápidas</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.open(whatsappLink, '_blank')}
                    >
                      <MessageCircle className="h-5 w-5" />
                      Atendimento WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.open(instagramLink, '_blank')}
                    >
                      <Instagram className="h-5 w-5" />
                      Seguir no Instagram
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.location.href = '/faqs'}
                    >
                      <MessageCircleQuestion className="h-5 w-5" />
                      FAQS
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <Package className="h-5 w-5" />
                      Ver Produtos
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </header>

      {/* Banner Carousel - Hero Section */}
      
      <section className="w-full overflow-hidden" style={{ paddingTop: '24px' }}>
        <div className="w-full rounded" style={{ paddingLeft: '24px', paddingRight: '24px' }}>
          <Carousel 
            className="w-full" 
            plugins={[
              Autoplay({ 
                delay: 3500,
                stopOnInteraction: false,
                stopOnMouseEnter: true,
              })
            ]}
            opts={{ 
              loop: true,
            }}
          >
            <CarouselContent>
              {banners.map((banner, index) => (
                <CarouselItem key={index}>
                  <div className="relative aspect-[16/9] md:aspect-[21/7] overflow-hidden rounded-none">
                    <img
                      src={banner.image}
                      alt={banner.alt}
                      className="w-full h-full object-contain rounded-2xl"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="text-white left-2 bg-primary/90 backdrop-blur-sm border-2 border-background hover:bg-background hover:text-primary transition-all" />
            <CarouselNext className="text-white right-2 bg-primary/90 backdrop-blur-sm border-2 border-background hover:bg-background hover:text-primary transition-all" />
          </Carousel>
        </div>
      </section>

      {/* About Section - Japanese Style */}
      <section id="sobre" className="py-16 bg-gradient-to-b from-white to-light-gray relative overflow-hidden">
        {/* Traditional Wave Pattern Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute bottom-0 w-full h-32" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 20px 20px, gray 4px, transparent 0)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-in ">
            <h2 className="fredoka text-4xl md:text-5xl font-display font-bold mb-2 bg-primary bg-clip-text text-transparent animate-gradient-x">
              KITSUY STORE
            </h2>
            <p className="fredoka font-normal text-lg text-foreground leading-relaxed mb-8">
              Aqui você encontra <span className="font-semibold text-primary font-semibold">Action Figures 100% originas</span>, trazidas diretamente do Japão, com envio rápido e atendimento dedicado.
              Nossa missão é ajudar você a completar sua coleção!
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="p-6 rounded-lg bg-card border-2 border-[#EA3E83] hover:border-[#F094FA] transition-all hover:shadow-oriental">
                <Package className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 font-japanese">Produtos 100% Originais</h3>
                <p className="text-sm text-muted-foreground">Figures autênticas e licenciadas pelas marcas japonesas mais renomadas.</p>
              </div>
              <div className="p-6 rounded-lg bg-card border-2 border-[#EA3E83] hover:border-[#F094FA] transition-all hover:shadow-oriental">
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 font-japanese">Entrega Rápida</h3>
                <p className="text-sm text-muted-foreground">Envio imediato para todo o Brasil com rastreamento atualizado.</p>
              </div>
              <div className="p-6 rounded-lg bg-card border-2 border-[#EA3E83] hover:border-[#F094FA] transition-all hover:shadow-oriental">
                <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 font-japanese">Atendimento Dedicado</h3>
                <p className="text-sm text-muted-foreground">Suporte personalizado via WhatsApp e Instagram.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section Figures OFERTA ESPECIAL */}
      <section id="oferta" className="py-16 rounded-[64px] mx-4 md:m-10" style={{ display: "none" }}>
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="fredoka text-4xl md:text-5xl font-display font-bold mb-4 bg-gradient-to-r from-primary to-[#FF4DA6] bg-clip-text text-transparent">
              OFERTA DOUBLE!
            </h2>
            <p className="fredoka text-lg font-md font-japanese text-secondary mb-1">A oportunidade perfeita para ampliar sua coleção!</p>
            <p className="fredoka text-lg font-md font-japanese text-secondary mb-6">Figures exclusivas com descontos por tempo limitado — Garanta antes que acabe!</p>
            
            {/* Timer de Oferta */}
            <CountdownTimer></CountdownTimer>
          </div>

          {/* Container dos produtos centralizados */}
          <div className="flex justify-center">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl">
              {ofertaEspecial.map((ofertaEspecial, index) => (
                <div 
                  key={index} 
                  className="transform hover:scale-105 transition-transform duration-300"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Card com destaque especial */}
                  <div className="relative">
                    <div className="absolute -top-3 -right-3 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold z-10 animate-pulse">
                       Exclusivo
                    </div>
                    <ProductOfertaCard 
                      {...ofertaEspecial}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Texto de urgência */}
          <div className="text-center mt-12">
            <div className="flex justify-center gap-4 flex-wrap">
            <button className="relative bg-black-700 text-white text-[24px] font-bold py-3 px-8 rounded-3xl transition-all duration-500 transform hover:scale-105 overflow-hidden group shadow-lg shadow-cyan-500/30 active:scale-95"
            onClick={() => window.open(whatsappLink3, '_blank')}>
              
              {/* Borda neon constante */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 opacity-100 animate-pulse">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 animate-spin" style={{animationDuration: '4s'}}></div>
              </div>
              
              {/* Efeito de ripple no clique */}
              <div className="absolute inset-0 rounded-3xl bg-white opacity-0 group-active:opacity-20 group-active:animate-ripple transition-opacity duration-100"></div>
              
              <div className="absolute inset-[3px] rounded-3xl bg-black group-hover:transition-colors duration-100"></div>
              
              <span className="relative z-10">R$475</span>
            </button>
          </div>
          </div>
        </div>
      </section>


      {/* Products Section Figures */}
        <section id="figures" 
        className="py-16 m-10 rounded-[64px]"
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 animate-fade-in">
              <h2 className="fredoka text-4xl md:text-5xl font-display font-bold mb-2 bg-primary bg-clip-text text-transparent">
                SOB ENCOMENDA
              </h2>

              <p className="fredoka text-lg bg-secondary bg-clip-text text-transparent mb-6">
                Figures Originais Disponíveis para Encomenda!
              </p>

              {/* Barra de Pesquisa */}
              <div className="max-w-md mx-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Pesquisar produtos..."
                    value={searchMasterpiece}
                    onChange={(e) => setSearchMasterpiece(e.target.value)}
                    className="pl-10 pr-4 py-6 text-lg bg-white border-2 border-white/20 focus:border-white focus:ring-2 focus:ring-white/50 rounded-xl shadow-lg"
                  />
                </div>

                {searchMasterpiece && (
                  <p className="text-black font-bold text-md mt-2">
                    {filteredMasterpiece.length}{" "}
                    {filteredMasterpiece.length === 1
                      ? "produto encontrado"
                      : "produtos encontrados"}
                  </p>
                )}
              </div>
            </div>

            {/* CARROSSEL HORIZONTAL */}
            <div className="overflow-x-auto scrollbar-hide">
              <div className="flex gap-8 px-4 py-4">
                {filteredMasterpiece.map((fig, index) => (
                  <div
                    key={index}
                    className="w-[220px] md:w-[260px] min-w-[220px] md:min-w-[260px] bg-white rounded-3xl shadow-xl p-4 flex flex-col transition-all hover:scale-[1.03]"
                  >
                    <img
                      src={fig.image}
                      alt={fig.title}
                      draggable={false}
                      onClick={() => setSelectedImage(fig.image)}
                      className="w-full h-70 object-cover rounded-2xl mb-3"
                    />

                    <h3 className="text-xl font-bold text-black mb-1">
                      {fig.title.length > 50 ? fig.title.slice(0, 50) + "..." : fig.title}
                    </h3>

                    {/* </div>p className="text-secondary text-lg mb-3">{fig.price}</p> */}

                    <button
                      className="w-full px-4 py-2 rounded-xl bg-primary text-white font-semibold hover:opacity-90 mt-auto"
                    >
                      Ver Detalhes
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {selectedImage && (
              <div 
                className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
                onClick={() => setSelectedImage(null)} 
                >
                <img
                  src={selectedImage}
                  alt="Imagem Ampliada"
                  draggable={false}
                  className="max-w-full max-h-full m-4 rounded-lg shadow-lg select-none"
                />
          </div>
            )}
          </div>

        </section>


      

      {/* Products Section Figures */}
      <section id="figures" className="py-16 m-5 rounded-[64px]">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <TituloWorm/>
            <p
              className="
                max-w-3xl mx-auto fredoka text-lg mb-6 
                text-transparent bg-clip-text 
                bg-[linear-gradient(90deg,#ff004c,#ff7a00,#ffe600,#37ff00,#00e5ff,#6a00ff,#ff00d4,#ff004c)]
                bg-[length:200%_200%]
                animate-[rainbow-move_6s_linear_infinite]
              "
            >
              Figures Originais com até 50% OFF. Últimas unidades em queima de estoque!
            </p>


            
            {/* Barra de Pesquisa */}
            <div className="max-w-md mx-auto">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Pesquisar produtos..."
                  value={searchStock}
                  onChange={(e) => setSearchStock(e.target.value)}
                  className="pl-10 pr-4 py-6 text-lg bg-white border-2 border-white/20 focus:border-white focus:ring-2 focus:ring-white/50 rounded-xl shadow-lg"
                />
              </div>
              {searchStock && (
                <p className="text-black font-md text-sm mt-2">
                  {filteredStock.length} {filteredStock.length === 1 ? 'produto encontrado' : 'produtos encontrados'}
                </p>
              )}
            </div>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {filteredStock.length > 0 ? (
              filteredStock.map((figure, index) => (
                <div key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                  <ProductCard {...figure} />
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <p className="text-white text-xl font-semibold">
                  Nenhum produto encontrado para "{searchQuery}"
                </p>
                <p className="text-white/80 mt-2">
                  Tente pesquisar com outros termos
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
      

      {/* CTA Section - Traditional Japanese Style */}
      <section id="sobre" className="py-20 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 20px 20px, white 4px, transparent 0)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10 animate-slide-up">
          <h2 className="oregano text-4xl md:text-5xl font-display font-bold mb-4">
            Não achou oque queria?
          </h2>
          <p className="fredoka text-2xl font-japanese mb-6">
            Fala com a gente!
          </p>
          <p className="fredoka text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Entre no nosso chat, e consulte o item que você deseja!
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              variant="secondary" 
              size="xl"
              onClick={() => window.open(whatsappLink, '_blank')}
              className="bg-white text-primary hover:bg-white/90 shadow-lg hover:text-black hover:shadow-xl"
            >
              <MessageCircle className="mr-2 h-5 w-5" />
              WhatsApp
            </Button>
            <Button 
              variant="outline" 
              size="xl"
              onClick={() => window.open(instagramLink, '_blank')}
              className="border-2 border-white text-primary hover:bg-white hover:text-black"
            >
              <Instagram className="mr-2 h-5 w-5" />
              Instagram
            </Button>
          </div>
          <div className="p-2">
            <Button 
                variant="secondary" 
                size="xl"
                onClick={() => window.location.href = "mailto:kitsuystore@gmail.com"}
                className="bg-white text-primary hover:bg-white/90 shadow-lg hover:text-black hover:shadow-xl"
              >
                <MessageCircle className="mr-2 h-5 w-5" />
                kitsuystore@gmail.com
              </Button>
          </div>
        </div>
      </section>

      {/* Footer - Traditional Style */}
      <footer id="contato" className="bg-foreground text-background py-8 border-t-4 border-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
                src={kitsuyIconBlack}
                alt="Kitsuy IconBlack"
                className="w-12 h-12 object-contain"
              />
            <h3 className="text-xl font-display font-bold">KITSUY STORE</h3>
          </div>
          <p className="text-sm opacity-80 mb-2 font-japanese">
            Obrigado Por Vir!
          </p>
          <p className="text-sm opacity-80 mb-4">
            Figures, Camisetas e colecionaveis!
          </p>
          <div className="flex justify-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(whatsappLink, '_blank')}
              className="text-background hover:text-white"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(instagramLink, '_blank')}
              className="text-background hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs opacity-60">
            Site em Contrução! Envie seu Feedback para kitsuystore@gmail.com
          </p>
          <p className="text-xs opacity-60">
            © 2025 Kitsuy Store. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
