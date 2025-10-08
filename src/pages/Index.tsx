import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
import { Instagram, MessageCircle, Sparkles, Package, Heart, Zap, Search, Menu, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { useState } from "react";
import heroBackground from "@/assets/hero-background.jpg";
import productFigure1 from "@/assets/figure-1.png";
import productFigure2 from "@/assets/figure-2.png";
import productFigure4 from "@/assets/figure-3.png";
import productFigure3 from "@/assets/figure-4.png";
import productAccessories from "@/assets/product-accessories.jpg";
import banner1 from "@/assets/banner-1.png";
import banner2 from "@/assets/banner-2.png";
import banner3 from "@/assets/banner-3.png";
import banner4 from "@/assets/banner-4.png";
import kitsuyIcon from "@/assets/KitsuyIcon.png";
import kitsuyIconBlack from "@/assets/KitsuyIconBlack.png";
import Autoplay from 'embla-carousel-autoplay';
import StyledWrapper from "@/components/ui/buttonPlay";
import StaticLogoCloud from "@/components/ui/StaticLogoCloud";


const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const banners = [
    { image: banner1, alt: "Friren-Banner" },
    { image: banner2, alt: "Promocao-Banner" },
    { image: banner3, alt: "Jujutsu Figure-Banner" },
    { image: banner4, alt: "Marin Camiseta-Banner" }
  ];


  const figures = [
    {
      image: productFigure1,
      title: "Frieren Desktop Cute - Taito",
      price: "R$ 189,90",
      category: "Figure"
    },
    {
      image: productFigure2,
      title: "Marin Desktop Cute - Taito",
      price: "R$ 249,90",
      category: "Figure"
    },
    {
      image: productFigure3,
      title: "Camiseta Anime Character - 100% Algodão",
      price: "R$ 79,90",
      category: "Roupa"
    },
    {
      image: productFigure4,
      title: "Gundam Mecha Figure - Articulável Premium",
      price: "R$ 299,90",
      category: "Figure"
    },
    {
      image: productAccessories,
      title: "Kit Chaveiros Anime - 10 Peças Exclusivas",
      price: "R$ 59,90",
      category: "Acessório"
    },
    {
      image: productAccessories,
      title: "Kit Chaveiros Anime - 10 Peças Exclusivas",
      price: "R$ 59,90",
      category: "Acessório"
    },
    {
      image: productAccessories,
      title: "Kit Chaveiros Anime - 10 Peças Exclusivas",
      price: "R$ 59,90",
      category: "Acessório"
    }
  ];

  const products = [
    {
      image: productFigure1,
      title: "Action Figure Anime Premium - Edição Limitada",
      price: "R$ 189,90",
      category: "Figure"
    },
    {
      image: productFigure2,
      title: "Coleção Mangás Populares - Box Completo",
      price: "R$ 249,90",
      category: "Mangá"
    },
    {
      image: productFigure3,
      title: "Camiseta Anime Character - 100% Algodão",
      price: "R$ 79,90",
      category: "Roupa"
    },
    {
      image: productFigure4,
      title: "Gundam Mecha Figure - Articulável Premium",
      price: "R$ 299,90",
      category: "Figure"
    }
  ];

  const whatsappLink = "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de conhecer os produtos!";
  const instagramLink = "https://instagram.com/kitsuystore";

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header / Navigation - Asian Style */}
      <header className="sticky top-0 h-25 z-50 bg-card/98 bg-white">
        <nav className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 min-w-fit">
              <img
                src={kitsuyIcon}
                alt="Kitsuy Icon"
                className="w-24 h-24 object-contain animate-float"
              />
              <h1 className="text-2xl md:text-3xl font-display font-bold bg-gradient-to-r from-pink-500 via-pink-400 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
                KITSUY STORE
              </h1>
            </div>
            {/* Search Bar */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="relative w-full">
                <div className="hidden md:flex flex-1 max-w-md mx-4">
                  <div className="flex items-center justify-center space-x-6 w-full">
                    <button
                      onClick={() => document.getElementById('sobre')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm font-medium text-gray-700 hover:text-pink-600 transition-colors duration-200"
                    >
                      Sobre
                    </button>
                    
                    <button
                      onClick={() => document.getElementById('figures')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm font-medium text-gray-700 hover:text-pink-600 transition-colors duration-200"
                    >
                      Figures
                    </button>
                    
                    <button
                      onClick={() => document.getElementById('camisetas')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm font-medium text-gray-700 hover:text-pink-600 transition-colors duration-200"
                    >
                      Camisetas
                    </button>
                    
                    <button
                      onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                      className="text-sm font-medium text-gray-700 hover:text-pink-600 transition-colors duration-200"
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
                      onClick={() => document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      <Package className="h-5 w-5" />
                      Ver Produtos
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.open(whatsappLink, '_blank')}
                    >
                      <Heart className="h-5 w-5" />
                      Produtos Favoritos
                    </Button>
                  </div>
                  
                  {/* Mobile Search in Menu */}
                  <div className="mt-6 md:hidden">
                    <label className="text-sm font-medium mb-2 block">Buscar</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        type="text" 
                        placeholder="Buscar produtos..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
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
                delay: 3000,
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
                      className="w-full h-full object-cover rounded-2xl"
                    />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2 bg-background/90 backdrop-blur-sm border-2 border-primary/40 hover:bg-primary hover:text-primary-foreground transition-all" />
            <CarouselNext className="right-2 bg-background/90 backdrop-blur-sm border-2 border-primary/40 hover:bg-primary hover:text-primary-foreground transition-all" />
          </Carousel>
        </div>
      </section>

      {/* About Section - Japanese Style */}
      <section id="sobre" className="py-16 bg-gradient-to-b from-white to-light-gray relative overflow-hidden">
        {/* Traditional Wave Pattern Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute bottom-0 w-full h-32" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 50% 100%, currentColor 25%, transparent 26%)',
              backgroundSize: '60px 30px',
              backgroundPosition: '0 0, 30px 15px'
            }}
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-in ">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-2 bg-gradient-to-r from-pink-500 via-pink-400 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
              KITSUY STORE
            </h2>
            <p className="text-sm font-japanese text-muted-foreground mb-6">狐の店</p>
            <p className="text-lg text-foreground leading-relaxed mb-8 font-japanese">
              Somos apaixonados por cultura tradicional e pop japonesa! Na Kitsuy Store você encontra os melhores 
              <span className="text-primary font-semibold"> action figures, mangás, camisetas </span> 
              e artigos colecionáveis animes. 
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
              <div className="p-6 rounded-lg bg-card border-2 border-accent/20 hover:border-accent/50 transition-all hover:shadow-oriental">
                <Package className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 font-japanese">Produtos 100% Originais</h3>
                <p className="text-sm text-muted-foreground">Figures originais e de alta qualidade</p>
              </div>
              <div className="p-6 rounded-lg bg-card border-2 border-accent/20 hover:border-accent/50 transition-all hover:shadow-oriental">
                <Zap className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 font-japanese">Entrega Rápida</h3>
                <p className="text-sm text-muted-foreground">Receba seus produtos com agilidade</p>
              </div>
              <div className="p-6 rounded-lg bg-card border-2 border-accent/20 hover:border-accent/50 transition-all hover:shadow-oriental">
                <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-lg mb-2 font-japanese">Atendimento Dedicado</h3>
                <p className="text-sm text-muted-foreground">Pode contar com a gente!</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products Section Figures */}
      <section id="figures" className="py-16 bg-gradient-to-b from-primary to-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-2 bg-gradient-to-r from-white to-white bg-clip-text text-transparent">
              ACTION FIGURES
            </h2>
            <p className="text-lg font-bold font-japanese text-white mb-4">Nossos Tesouros</p>
            <p className="text-lg text-white text-foreground">
              Figures Originais Disponiveis no Estoque! 
            </p>
          </div>

          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {products.map((figures, index) => (
              <div key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                <ProductCard {...figures} />
              </div>
            ))}
          </div>
        </div>
      </section>
          
      {/* Products Section Camisetas - Oriental Style */}
      <section id="camisetas" className="py-16 bg-gradient-to-b from-white to-primary">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-display font-bold mb-2 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              CAMISETAS
            </h2>
            <p className="text-lg font-bold font-japanese text-primary mb-4">- Sua identidade visual!</p>
            <p className="text-lg font-bold text-foreground">
              Camisetas 100% Algodão, com estampas autênticas.
            </p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
            {products.map((product, index) => (
              <div key={index} style={{ animationDelay: `${index * 0.1}s` }}>
                <ProductCard {...product} />
              </div>
            ))}
          </div>

          <div className="text-center">
            <h1 className="text-white font-bold mb-4">Bora tentar achar sua figure dos sonhos?</h1>
            <Button 
              variant="default" 
              size="lg"
              className="text-white font-bold border-4 border-white bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-lg py-6 px-8 rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              onClick={() => window.open(whatsappLink, '_blank')}
            >
              Venhas fazer sua cotação com a gente!
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section - Traditional Japanese Style */}
      <section id="sobre" className="py-20 bg-primary text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-full h-full" 
            style={{ 
              backgroundImage: 'radial-gradient(circle at 20px 20px, white 2px, transparent 0)',
              backgroundSize: '40px 40px'
            }}
          />
        </div>
        <div className="container mx-auto px-4 text-center relative z-10 animate-slide-up">
          <h2 className="text-4xl md:text-5xl font-display font-bold mb-4">
            今すぐ手に入れよう！
          </h2>
          <p className="text-2xl font-japanese mb-6">
            VEM COM A GENTE!
          </p>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Entre no nosso grupo, e seja o primero a saber de ofertas Exclusivas e Novidades!
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
        </div>
      </section>

      {/* Footer - Traditional Style */}
      <footer className="bg-foreground text-background py-8 border-t-4 border-white">
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
            狐の精神を持つ店
          </p>
          <p className="text-sm opacity-80 mb-4">
            Figures, Camisetas e coleciona
          </p>
          <div className="flex justify-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(whatsappLink, '_blank')}
              className="text-background hover:text-primary"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(instagramLink, '_blank')}
              className="text-background hover:text-primary"
            >
              <Instagram className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs opacity-60">
            © 2025 Kitsuy Store. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
