import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ProductCard";
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
import { db } from "@/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

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
    texto: "Recebi minha figure da Frieren em perfeito estado! O atendimento foi super atencioso, me mandaram fotos antes de enviar. Recomendo muito!",
    estrelas: 5,
    figura: "Frieren — SPM Figure",
  },
  {
    nome: "Carlos Mendes",
    texto: "Pedi uma figure rara que não tinha em nenhum lugar no Brasil. A Kitsuy encontrou em menos de 2 dias e o preço ficou ótimo. Chegou lacrada do Japão.",
    estrelas: 5,
    figura: "Jujutsu Kaisen — Gojo Satoru",
  },
  {
    nome: "Beatriz Santos",
    texto: "Atendimento pelo WhatsApp é 10/10. Tirei todas as dúvidas antes de fechar e eles são super honestos sobre prazos. Já fiz 3 pedidos.",
    estrelas: 5,
    figura: "Demon Slayer — Nezuko",
  },
  {
    nome: "Rafael Costa",
    texto: "Não sabia que existia esse tipo de serviço. Você faz um pedido, eles buscam no Japão e entregam no seu endereço. Simples assim. Figura perfeita.",
    estrelas: 5,
    figura: "One Piece — Zoro",
  },
];

const GALERIA = [figure1, figure2, figure3, figure4, figure5, figure6, figure7];

const STATS = [
  { label: "Figures importadas", value: 200, suffix: "+" },
  { label: "Clientes satisfeitos", value: 150, suffix: "+" },
  { label: "Animes no catálogo", value: 80, suffix: "+" },
  { label: "Avaliação média", value: 5, suffix: "★" },
];

// ─── Hook: Scroll Reveal ───────────────────────────────────────────────────────
function useReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}

// ─── Hook: Counter animado ────────────────────────────────────────────────────
function useCounter(target: number, duration = 1800, trigger: boolean) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!trigger) return;
    let start = 0;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 16);
    return () => clearInterval(timer);
  }, [trigger, target, duration]);
  return count;
}

// ─── Componente StatCard (contador individual) ────────────────────────────────
function StatCard({ label, value, suffix }: { label: string; value: number; suffix: string }) {
  const [triggered, setTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = useCounter(value, 1600, triggered);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setTriggered(true); },
      { threshold: 0.5 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="text-center p-6 bg-white/10 rounded-2xl backdrop-blur-sm">
      <div className="fredoka text-5xl font-bold text-white mb-1">
        {count}{suffix}
      </div>
      <div className="text-white/80 text-sm">{label}</div>
    </div>
  );
}

// ─── Hook: Tilt 3D nos cards ──────────────────────────────────────────────────
function useTilt(ref: React.RefObject<HTMLDivElement>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width - 0.5) * 18;
      const y = ((e.clientY - rect.top) / rect.height - 0.5) * -18;
      el.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg) scale(1.04)`;
      el.style.boxShadow = `${-x * 1.5}px ${y * 1.5}px 30px rgba(234,62,131,0.25)`;
    };
    const onLeave = () => {
      el.style.transform = "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)";
      el.style.boxShadow = "";
    };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, []);
}

// ─── Componente: GaleriaCard com tilt ────────────────────────────────────────
function GaleriaCard({ img, index, onClick }: { img: string; index: number; onClick: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref);
  return (
    <div
      ref={ref}
      onClick={onClick}
      className="tilt-card group relative aspect-square rounded-2xl overflow-hidden cursor-pointer border-2 border-transparent hover:border-[#EA3E83] shadow-sm reveal"
      style={{ transitionDelay: `${index * 0.07}s` }}
    >
      <img src={img} alt={`Figure ${index + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
        <span className="text-white font-bold opacity-0 group-hover:opacity-100 transition-opacity text-sm">Ver maior</span>
      </div>
    </div>
  );
}

// ─── Hook: Typewriter ─────────────────────────────────────────────────────────
function useTypewriter(phrases: string[], speed = 60, pause = 2000) {
  const [displayed, setDisplayed] = useState("");
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = phrases[phraseIdx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && charIdx <= current.length) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx));
        setCharIdx((c) => c + 1);
      }, charIdx === current.length ? pause : speed);
    } else if (deleting && charIdx >= 0) {
      timeout = setTimeout(() => {
        setDisplayed(current.slice(0, charIdx));
        setCharIdx((c) => c - 1);
      }, speed / 2);
    }

    if (!deleting && charIdx > current.length) {
      setDeleting(true);
    } else if (deleting && charIdx < 0) {
      setDeleting(false);
      setCharIdx(0);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }

    return () => clearTimeout(timeout);
  }, [charIdx, deleting, phraseIdx, phrases, speed, pause]);

  return displayed;
}

// ─── Sakura Petals ─────────────────────────────────────────────────────────────
function SakuraPetals() {
  const petals = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    size: `${Math.random() * 10 + 8}px`,
    duration: `${Math.random() * 8 + 7}s`,
    delay: `${Math.random() * 10}s`,
    opacity: Math.random() * 0.5 + 0.3,
  }));

  return (
    <>
      {petals.map((p) => (
        <div
          key={p.id}
          className="sakura-petal select-none"
          style={{
            left: p.left,
            width: p.size,
            height: p.size,
            animationDuration: p.duration,
            animationDelay: p.delay,
            opacity: p.opacity,
          }}
        >
          🌸
        </div>
      ))}
    </>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
const Index = () => {
  const [figures, setFigures] = useState<Product[]>([]);
  const [lancamentosFigures, setLancamentosFigures] = useState<Product[]>([]);
  const [premiumFigures, setPremiumFigures] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchStock, setSearchStock] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useReveal();

  const banners = [
    { image: banner1, alt: "Friren-Banner" },
    { image: banner2, alt: "Promocao-Banner" },
    { image: banner3, alt: "Jujutsu Figure-Banner" },
  ];

  const whatsappLink     = "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de conhecer os produtos!";
  const whatsappOrcamento = "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de fazer um orçamento de encomenda!";
  const whatsappEstoque   = "https://wa.me/5571997020168?text=Olá! Vim do site e quero saber sobre as figures disponíveis no estoque!";
  const instagramLink     = "https://instagram.com/kitsuystore";

  const typewriterText = useTypewriter([
    "direto do Japão até você.",
    "original e lacrada.",
    "sem complicação.",
    "com rastreamento completo.",
  ], 65, 2200);

  // ─── Firestore ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        const productsRef    = collection(db, "products");
        const masterpieceRef = collection(db, "masterpiece");
        const lancamentosRef = collection(db, "lancamentos");
        const premiumRef     = collection(db, "premium");

        const [productsSnap, masterpieceSnap, lancamentosSnap, premiumSnap] = await Promise.all([
          getDocs(productsRef),
          getDocs(masterpieceRef),
          getDocs(lancamentosRef),
          getDocs(premiumRef),
        ]);

        const toData = (snap: typeof productsSnap, source: string) =>
          snap.docs.map((doc) => ({ id: doc.id, source, ...doc.data() })) as Product[];

        const allFigures = [...toData(productsSnap, "products"), ...toData(masterpieceSnap, "masterpiece")];
        const sortedData = allFigures.sort((a, b) => {
          const aOut = a.inStock?.toLowerCase() === "indisponível";
          const bOut = b.inStock?.toLowerCase() === "indisponível";
          if (aOut !== bOut) return aOut ? 1 : -1;
          return (Number(a.displayOrder) || 999999) - (Number(b.displayOrder) || 999999);
        });

        setFigures(sortedData);
        setLancamentosFigures(toData(lancamentosSnap, "lancamentos"));
        setPremiumFigures(toData(premiumSnap, "premium"));
      } catch (error) {
        console.error("Erro ao carregar as coleções:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  const stockFigures  = figures.filter((f) => f.source === "products");
  const filteredStock = stockFigures.filter((f) => f.title.toLowerCase().includes(searchStock.toLowerCase()));

  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      <SakuraPetals />

      {/* ══════════════════════════════════════════════════
          HEADER
      ══════════════════════════════════════════════════ */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-pink-100 shadow-sm">
        <nav className="container mx-auto px-4 h-20 flex justify-between items-center gap-4">

          {/* Logo com bounce */}
          <a href="/" className="flex items-center gap-2 min-w-fit">
            <img src={kitsuyIcon} alt="Kitsuy Icon" className="w-14 h-14 object-contain logo-bounce" />
            <span className="fredoka text-2xl md:text-3xl font-bold text-[#EA3E83]">
              KITSUY STORE
            </span>
          </a>

          {/* Nav desktop */}
          <div className="hidden md:flex items-center gap-6">
            {[
              { label: "Como Funciona", id: "como-funciona" },
              { label: "Figures",       id: "galeria"       },
              { label: "Estoque",       href: "/estoque"    },
              { label: "FAQs",          href: "/faqs"       },
              { label: "Contato",       id: "contato"       },
            ].map((item) =>
              item.href ? (
                <a key={item.label} href={item.href}
                  className="text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors">
                  {item.label}
                </a>
              ) : (
                <button key={item.label}
                  onClick={() => {
                    const el = document.getElementById(item.id!);
                    if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 84, behavior: "smooth" });
                  }}
                  className="text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors">
                  {item.label}
                </button>
              )
            )}
          </div>

          {/* Ações */}
          <div className="flex gap-2 items-center">
            <Button variant="ghost" size="icon"
              onClick={() => window.open(instagramLink, "_blank")}
              className="hidden sm:flex hover:bg-pink-50 hover:text-[#EA3E83]">
              <Instagram className="h-5 w-5" />
            </Button>

            {/* Botão WhatsApp com badge pulsante */}
            <button
              onClick={() => window.open(whatsappLink, "_blank")}
              className="hidden sm:flex items-center gap-2 bg-[#EA3E83] hover:bg-[#c72e6c] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              <span className="wpp-dot" />
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </button>

            {/* Menu mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden gap-2 border-[#EA3E83] text-[#EA3E83]">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="w-[280px]">
                <SheetHeader>
                  <SheetTitle className="text-[#EA3E83] fredoka text-xl">Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-3">
                  {[
                    { icon: MessageCircle, label: "WhatsApp",     action: () => window.open(whatsappLink, "_blank") },
                    { icon: Instagram,     label: "Instagram",    action: () => window.open(instagramLink, "_blank") },
                    { icon: MessageCircleQuestion, label: "FAQs", action: () => (window.location.href = "/faqs") },
                    { icon: Package,       label: "Ver Estoque",  action: () => (window.location.href = "/estoque") },
                  ].map(({ icon: Icon, label, action }) => (
                    <Button key={label} variant="outline" className="w-full justify-start gap-3 h-12" onClick={action}>
                      <Icon className="h-5 w-5" />{label}
                    </Button>
                  ))}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </nav>
      </header>

      {/* ══════════════════════════════════════════════════
          BANNER CAROUSEL
      ══════════════════════════════════════════════════ */}
      <section className="w-full px-4 md:px-6 pt-6">
        <Carousel className="w-full"
          plugins={[Autoplay({ delay: 3500, stopOnInteraction: false, stopOnMouseEnter: true })]}
          opts={{ loop: true }}>
          <CarouselContent>
            {banners.map((banner, index) => (
              <CarouselItem key={index}>
                <div className="relative aspect-[16/9] md:aspect-[21/7] overflow-hidden rounded-2xl">
                  <img src={banner.image} alt={banner.alt} className="w-full h-full object-contain" />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-3 bg-[#EA3E83] text-white border-none hover:bg-[#c72e6c]" />
          <CarouselNext   className="right-3 bg-[#EA3E83] text-white border-none hover:bg-[#c72e6c]" />
        </Carousel>
      </section>

      {/* ══════════════════════════════════════════════════
          HERO — TYPEWRITER
      ══════════════════════════════════════════════════ */}
      <section id="sobre" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-4xl text-center">
          <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase reveal">
            Loja de Action Figures Originais do Japão
          </span>

          {/* Título com typewriter na segunda linha */}
          <h2 className="fredoka text-4xl md:text-6xl font-bold text-gray-900 mb-3 leading-tight reveal reveal-delay-1">
            Sua action figure favorita,
          </h2>
          <h2 className="fredoka text-4xl md:text-6xl font-bold text-[#EA3E83] mb-6 leading-tight min-h-[1.3em] typewriter-cursor reveal reveal-delay-2">
            {typewriterText}
          </h2>

          <p className="text-lg text-gray-600 leading-relaxed max-w-2xl mx-auto mb-10 reveal reveal-delay-3">
            A Kitsuy Store é especializada em <strong>action figures e colecionáveis 100% originais do Japão</strong>.
            Trabalhamos com importação por demanda — você escolhe a figure que quer, a gente busca nas
            melhores lojas japonesas e entrega no seu endereço. Sem complicação, sem intermediário duvidoso.
          </p>

          {/* Diferenciais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto mb-10">
            {[
              { icon: ShieldCheck, title: "100% Originais",       desc: "Só figures licenciadas e autênticas diretamente do Japão" },
              { icon: MapPin,      title: "Buscamos pra você",    desc: "Pesquisamos nas melhores lojas japonesas pelo menor preço" },
              { icon: Heart,       title: "Atendimento humano",   desc: "Tudo resolvido pelo WhatsApp, sem robô nem enrolação" },
            ].map(({ icon: Icon, title, desc }, i) => (
              <div key={title}
                className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-pink-100 hover:border-[#EA3E83] hover:shadow-lg transition-all duration-300 reveal reveal-delay-${i + 1}`}>
                <div className="w-12 h-12 bg-pink-50 rounded-full flex items-center justify-center">
                  <Icon className="h-6 w-6 text-[#EA3E83]" />
                </div>
                <h3 className="fredoka font-bold text-gray-900">{title}</h3>
                <p className="text-sm text-gray-500 text-center">{desc}</p>
              </div>
            ))}
          </div>

          {/* CTA principal com shimmer */}
          <button
            onClick={() => window.open(whatsappOrcamento, "_blank")}
            className="btn-shimmer inline-flex items-center gap-2 text-white text-base font-bold px-10 py-4 rounded-full shadow-lg hover:shadow-xl transition-shadow reveal reveal-delay-4">
            <span className="wpp-dot" />
            <MessageCircle className="h-5 w-5" />
            Pedir um orçamento grátis
          </button>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          STATS — CONTADORES ANIMADOS
      ══════════════════════════════════════════════════ */}
      <section className="py-16 px-4 bg-gradient-to-r from-[#EA3E83] to-[#c72e6c]">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {STATS.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          COMO FUNCIONA — 4 PASSOS
      ══════════════════════════════════════════════════ */}
      <section id="como-funciona" className="py-20 px-4 bg-gradient-to-b from-pink-50 to-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-14 reveal">
            <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
              Simples assim
            </span>
            <h2 className="fredoka text-4xl md:text-5xl font-bold text-gray-900">
              Como funciona nossa loja
            </h2>
            <p className="text-gray-500 mt-3 max-w-xl mx-auto">
              Não precisa entender japonês nem criar conta em site do Japão.
              A gente cuida de tudo pelo WhatsApp.
            </p>
          </div>

          <div className="relative">
            <div className="hidden md:block absolute top-12 left-[12.5%] right-[12.5%] h-0.5 bg-pink-200 z-0" />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative z-10">
              {[
                {
                  step: "01", icon: MessageCircle,
                  title: "Você pergunta",
                  desc: "Manda o nome ou a foto da action figure que você quer no nosso WhatsApp. Vale figure nova, usada, rara ou de pré-venda.",
                },
                {
                  step: "02", icon: Search,
                  title: "A gente busca",
                  desc: "Pesquisamos nas melhores lojas do Japão — AmiAmi, Surugaya, Mercado Secundário — e achamos o melhor preço.",
                },
                {
                  step: "03", icon: Package,
                  title: "Passamos o preço",
                  desc: "Você recebe um orçamento com tudo incluso: figure + frete internacional + nossa taxa. Sem surpresas na entrega.",
                },
                {
                  step: "04", icon: Truck,
                  title: "Você recebe",
                  desc: "Confirmado o pedido, importamos e enviamos direto para o seu endereço no Brasil com rastreamento completo.",
                },
              ].map(({ step, icon: Icon, title, desc }, i) => (
                <div key={step}
                  className={`flex flex-col items-center text-center gap-4 reveal reveal-delay-${i + 1}`}>
                  <div className="relative">
                    <div className="w-24 h-24 bg-white border-4 border-[#EA3E83] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform duration-300">
                      <Icon className="h-9 w-9 text-[#EA3E83]" />
                    </div>
                    <span className="absolute -top-1 -right-1 bg-[#EA3E83] text-white text-xs font-black w-7 h-7 rounded-full flex items-center justify-center">
                      {step}
                    </span>
                  </div>
                  <h3 className="fredoka text-xl font-bold text-gray-900">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-14 text-center reveal">
            <div className="inline-flex flex-col sm:flex-row gap-4 items-center bg-white border-2 border-pink-200 rounded-2xl px-8 py-6 shadow-sm">
              <div className="text-left">
                <p className="font-bold text-gray-900">Pronto para começar?</p>
                <p className="text-sm text-gray-500">Atendemos de segunda a sábado via WhatsApp</p>
              </div>
              <button
                onClick={() => window.open(whatsappOrcamento, "_blank")}
                className="btn-shimmer flex items-center gap-2 text-white text-sm font-bold px-6 py-3 rounded-xl whitespace-nowrap">
                <span className="wpp-dot" />
                <MessageCircle className="h-4 w-4" />
                Quero minha figure
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          GALERIA — tilt 3D
      ══════════════════════════════════════════════════ */}
      <section id="galeria" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12 reveal">
            <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
              Galeria
            </span>
            <h2 className="fredoka text-4xl md:text-5xl font-bold text-gray-900 mb-3">
              Figures que já passaram por aqui
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Action figures 100% originais, importadas direto do Japão.
              Passe o mouse para ver o efeito — e se quiser uma, é só chamar.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {GALERIA.map((img, i) => (
              <GaleriaCard key={i} img={img} index={i} onClick={() => setSelectedImage(img)} />
            ))}
            {/* CTA card */}
            <div
              onClick={() => window.open(whatsappOrcamento, "_blank")}
              className="tilt-card group relative aspect-square rounded-2xl cursor-pointer bg-gradient-to-br from-[#EA3E83] to-[#FF8FBC] border-2 border-[#EA3E83] flex flex-col items-center justify-center gap-3 hover:shadow-xl transition-all duration-300 reveal"
            >
              <MessageCircle className="h-10 w-10 text-white" />
              <p className="text-white font-bold text-center text-sm px-4 leading-tight">
                Quer uma dessas?<br/>Chama no WhatsApp!
              </p>
              <ArrowRight className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Modal imagem ampliada */}
      {selectedImage && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}>
          <img src={selectedImage} alt="Figure ampliada" draggable={false}
            className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 text-white bg-black/50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-black/80 text-xl font-bold">
            ✕
          </button>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          PREVIEW ESTOQUE
      ══════════════════════════════════════════════════ */}
      <section id="estoque-preview" className="py-20 px-4 bg-pink-50">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12 reveal">
            <div>
              <span className="inline-block bg-pink-200 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-3 tracking-widest uppercase">
                Pronta Entrega
              </span>
              <h2 className="fredoka text-4xl font-bold text-gray-900">
                Figures no estoque no Brasil
              </h2>
              <p className="text-gray-500 mt-2">
                Sem esperar importação — essas já estão aqui e saem em até 4 dias úteis.
              </p>
            </div>
            <a href="/estoque" className="flex items-center gap-2 text-[#EA3E83] font-bold hover:underline whitespace-nowrap">
              Ver todos <ChevronRight className="h-4 w-4" />
            </a>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[420px] bg-white rounded-2xl animate-pulse border border-pink-100" />
              ))}
            </div>
          ) : filteredStock.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStock.slice(0, 3).map((figure, index) => (
                <div key={index} className="reveal" style={{ transitionDelay: `${index * 0.1}s` }}>
                  <ProductCard {...figure} />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-400">Nenhum produto disponível no momento.</div>
          )}

          <div className="mt-10 text-center flex flex-col sm:flex-row gap-4 justify-center reveal">
            <a href="/estoque">
              <Button variant="outline"
                className="border-2 border-[#EA3E83] text-[#EA3E83] hover:bg-[#EA3E83] hover:text-white gap-2 px-8 py-6 text-base rounded-full">
                <Package className="h-5 w-5" />
                Ver todas as figures no estoque
              </Button>
            </a>
            <button
              onClick={() => window.open(whatsappEstoque, "_blank")}
              className="btn-shimmer inline-flex items-center gap-2 text-white font-bold px-8 py-4 text-base rounded-full">
              <span className="wpp-dot" />
              <MessageCircle className="h-5 w-5" />
              Perguntar sobre disponibilidade
            </button>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          DEPOIMENTOS
      ══════════════════════════════════════════════════ */}
      <section id="depoimentos" className="py-20 px-4 bg-white">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12 reveal">
            <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
              Depoimentos
            </span>
            <h2 className="fredoka text-4xl md:text-5xl font-bold text-gray-900">
              Quem já pediu, aprova
            </h2>
            <p className="text-gray-400 text-sm mt-2 italic">
              ⚠️ Substitua pelos feedbacks reais dos seus clientes no array DEPOIMENTOS
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {DEPOIMENTOS.map(({ nome, texto, estrelas, figura }, i) => (
              <div key={nome}
                className={`bg-white border-2 border-pink-100 rounded-2xl p-6 hover:border-[#EA3E83] hover:shadow-lg transition-all duration-300 reveal reveal-delay-${i % 2 + 1}`}>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: estrelas }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-[#EA3E83] text-[#EA3E83]" />
                  ))}
                </div>
                <p className="text-gray-700 leading-relaxed mb-4 italic">"{texto}"</p>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">{nome}</span>
                  <span className="text-xs text-gray-400 bg-pink-50 px-3 py-1 rounded-full">{figura}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════
          CTA FINAL
      ══════════════════════════════════════════════════ */}
      <section className="py-20 px-4 bg-gradient-to-br from-[#EA3E83] to-[#c72e6c] text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: "radial-gradient(circle at 30px 30px, white 3px, transparent 0)", backgroundSize: "60px 60px" }} />
        <div className="container mx-auto max-w-4xl text-center relative z-10 reveal">
          <h2 className="fredoka text-4xl md:text-6xl font-bold mb-4">
            Não encontrou o que procura?
          </h2>
          <p className="text-xl opacity-90 mb-4 max-w-2xl mx-auto">
            Se existe no Japão, a gente encontra. Manda o nome ou a foto da action figure
            e a gente já começa a pesquisar pra você — <strong>sem compromisso.</strong>
          </p>
          <p className="text-base opacity-75 mb-10">
            Atendemos via WhatsApp de segunda a sábado. Orçamento grátis, sem robô.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <button
              onClick={() => window.open(whatsappOrcamento, "_blank")}
              className="inline-flex items-center justify-center gap-2 bg-white text-[#EA3E83] hover:bg-white/90 font-bold px-8 py-4 text-base rounded-full shadow-lg transition-all">
              <span className="wpp-dot" style={{ background: "#EA3E83" }} />
              <MessageCircle className="h-5 w-5" />
              Pedir orçamento pelo WhatsApp
            </button>
            <Button size="lg" variant="outline"
              onClick={() => window.open(instagramLink, "_blank")}
              className="border-2 border-white text-white hover:bg-white hover:text-[#EA3E83] gap-2 text-base px-8 py-6 rounded-full">
              <Instagram className="h-5 w-5" />
              Seguir no Instagram
            </Button>
          </div>

          <div className="flex flex-wrap justify-center gap-6 text-sm">
            {["Figures 100% originais", "Orçamento sem compromisso", "Rastreamento completo", "Atendimento humano", "PIX ou cartão"].map((item) => (
              <div key={item} className="flex items-center gap-2 opacity-90">
                <CheckCircle2 className="h-4 w-4" />{item}
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
            <div>
              <div className="flex items-center gap-2 mb-3">
                <img src={kitsuyIconBlack} alt="Kitsuy" className="w-10 h-10 object-contain" />
                <span className="fredoka text-xl font-bold">KITSUY STORE</span>
              </div>
              <p className="text-sm text-gray-400 leading-relaxed">
                Loja especializada em action figures e colecionáveis 100% originais do Japão.
                Importação por demanda — sua coleção merece o original.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 text-gray-300 uppercase tracking-wider">Navegação</h4>
              <div className="flex flex-col gap-2">
                {[
                  { label: "Como funciona", href: "#como-funciona" },
                  { label: "Estoque",       href: "/estoque"       },
                  { label: "FAQs",          href: "/faqs"          },
                ].map(({ label, href }) => (
                  <a key={label} href={href} className="text-sm text-gray-400 hover:text-white transition-colors">{label}</a>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-sm mb-3 text-gray-300 uppercase tracking-wider">Contato</h4>
              <div className="flex flex-col gap-3">
                <button onClick={() => window.open(whatsappLink, "_blank")}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors text-left">
                  <MessageCircle className="h-4 w-4" /> WhatsApp: (71) 99702-0168
                </button>
                <button onClick={() => window.open(instagramLink, "_blank")}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors text-left">
                  <Instagram className="h-4 w-4" /> @kitsuystore
                </button>
                <button onClick={() => (window.location.href = "mailto:kitsuystore@gmail.com")}
                  className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors text-left">
                  <Clock className="h-4 w-4" /> kitsuystore@gmail.com
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs text-gray-600">
            <span>© 2025 Kitsuy Store. Todos os direitos reservados.</span>
            <span>Action Figures e Colecionáveis 100% Originais do Japão.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;