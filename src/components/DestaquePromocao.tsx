import { Link } from "react-router-dom";
import { ChevronRight, CreditCard, Percent, ShieldCheck, ShoppingCart, Tag, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { comDestaque } from "@/hooks/useConfigSite";
import type { ProdutoEmPromocao } from "@/lib/promocao";

const ROSA = "#FF3E8E";

// Pétalas decorativas: [top, left, tamanho, rotação]
const PETALAS: [string, string, number, number][] = [
  ["8%", "4%", 22, -30], ["14%", "93%", 20, 40], ["16%", "57%", 14, 10], ["40%", "96%", 18, -20],
  ["48%", "2%", 12, 60], ["82%", "23%", 18, 25], ["84%", "56%", 20, -45], ["88%", "95%", 16, 15],
];

interface Props {
  figures: ProdutoEmPromocao[];
  titulo: string;
  subtitulo: string;
}

/** Seção preta e rosa com até 3 figures de pronta entrega com maior desconto (liga/desliga em /admin). */
export function DestaquePromocao({ figures, titulo, subtitulo }: Props) {
  const { itens, adicionar } = useCart();
  const { toast } = useToast();
  const maiorDesconto = figures[0]?.descontoPct ?? 0;
  const rosa = (t: string) => <span style={{ color: ROSA }}>{t}</span>;

  return (
    <section aria-labelledby="titulo-promocao" className="relative overflow-hidden bg-[#0b0a0f] text-white pt-14 pb-28 px-4 mt-6">
      {/* Nuvens e pétalas */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute top-[12%] left-[10%] h-6 w-48 rounded-full bg-white/[0.04]" />
        <div className="absolute top-[9%] right-[2%] h-8 w-40 rounded-full bg-white/[0.04]" />
        <div className="absolute bottom-[22%] left-[30%] h-5 w-72 rounded-full bg-white/[0.04]" />
        {PETALAS.map(([top, left, tam, rot], i) => (
          // a animação usa transform, então a rotação fica num elemento de dentro
          <span key={i} className="absolute animate-float" style={{ top, left, animationDelay: `${i * 0.7}s` }}>
            <span className="block" style={{ width: tam, height: tam * 1.3, background: ROSA, opacity: 0.85, borderRadius: "100% 0 100% 0", transform: `rotate(${rot}deg)` }} />
          </span>
        ))}
      </div>

      <div className="relative container mx-auto max-w-7xl">
        {/* Selo "Oferta especial" */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#FF3E8E]/70" />
          <span className="flex items-center gap-2 rounded-full border-2 px-5 py-2 text-sm md:text-lg font-black tracking-wide" style={{ borderColor: ROSA, color: ROSA }}>
            <Tag className="h-5 w-5 fill-current" /> OFERTA ESPECIAL
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#FF3E8E]/70" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          {/* Cards */}
          <ul className="grid grid-cols-3 gap-2 sm:gap-4">
            {figures.map((f) => {
              const noCarrinho = itens.some((item) => item.id === f.id);
              return (
                <li
                  key={f.id}
                  className="group relative aspect-[3/5] overflow-hidden rounded-2xl border-2 bg-black transition-transform duration-300 hover:-translate-y-1"
                  style={{ borderColor: ROSA, boxShadow: `0 0 28px ${ROSA}55` }}
                >
                  <img src={f.image} alt={f.title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                  <span className="absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-[10px] sm:text-xs font-black" style={{ background: ROSA }}>
                    -{f.descontoPct}%
                  </span>
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent p-2 sm:p-3 pt-6 sm:pt-10">
                    <p className="hidden sm:block line-clamp-2 text-sm font-bold leading-tight">{f.title}</p>
                    <p className="hidden sm:block text-xs text-white/50 line-through">{f.discount}</p>
                    <div className="flex items-center justify-between gap-1">
                      <p className="whitespace-nowrap text-[11px] sm:text-base font-black" style={{ color: ROSA }}>{f.price}</p>
                      <button
                        type="button"
                        aria-label={noCarrinho ? `${f.title} já está no carrinho` : `Adicionar ${f.title} ao carrinho`}
                        disabled={noCarrinho}
                        onClick={() => {
                          adicionar({ id: f.id, collectionName: "products", nome: f.title, preco: f.price, imagem: f.image });
                          toast({ title: "Adicionado ao carrinho", description: f.title });
                        }}
                        className="grid h-7 w-7 sm:h-9 sm:w-9 shrink-0 place-items-center rounded-full transition-opacity disabled:opacity-40"
                        style={{ background: ROSA }}
                      >
                        <ShoppingCart className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Texto e chamada */}
          <div className="text-center lg:text-left">
            <h2 id="titulo-promocao" className="fredoka italic text-4xl md:text-5xl xl:text-6xl font-bold leading-[1.05] mb-5">
              {comDestaque(titulo, rosa)}
            </h2>
            <p className="text-lg md:text-2xl text-white/90 mb-8">
              {comDestaque(subtitulo, (t) => <strong style={{ color: ROSA }}>{t}</strong>)}
            </p>

            <div className="mx-auto lg:mx-0 mb-8 flex max-w-md items-center gap-4 sm:gap-5 rounded-3xl border-2 px-5 sm:px-6 py-4" style={{ borderColor: ROSA }}>
              <span className="grid h-16 w-16 shrink-0 -rotate-12 place-items-center rounded-2xl" style={{ background: ROSA }}>
                <Percent className="h-8 w-8" strokeWidth={3} />
              </span>
              <span className="h-14 w-px bg-white/20" />
              <p className="text-left leading-none whitespace-nowrap">
                <span className="block text-lg font-black">ATÉ</span>
                <span className="text-4xl sm:text-5xl md:text-6xl font-black">{maiorDesconto}%</span>{" "}
                <span className="text-3xl sm:text-4xl md:text-5xl font-black" style={{ color: ROSA }}>OFF</span>
              </p>
            </div>

            <ul className="mb-9 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-white/85">
              {[
                { Icone: ShieldCheck, texto: "Compra segura" },
                { Icone: Truck, texto: "Envio para todo o Brasil" },
                { Icone: CreditCard, texto: "PIX ou cartão" },
              ].map(({ Icone, texto }) => (
                <li key={texto} className="flex items-center gap-2">
                  <Icone className="h-6 w-6" style={{ color: ROSA }} /> {texto}
                </li>
              ))}
            </ul>

            <Link
              to="/estoque"
              className="inline-flex items-center gap-3 rounded-full px-9 py-4 text-lg font-black tracking-wide shadow-lg transition-transform hover:scale-105"
              style={{ background: ROSA, boxShadow: `0 10px 30px ${ROSA}66` }}
            >
              <ShoppingCart className="h-5 w-5" /> APROVEITE AGORA <ChevronRight className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Onda rosa no rodapé */}
      <svg aria-hidden viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute bottom-0 left-0 h-20 md:h-28 w-full">
        <path d="M0,60 C240,0 420,10 640,70 C860,130 1100,110 1260,60 C1340,35 1400,40 1440,50 L1440,120 L0,120 Z" fill={ROSA} />
      </svg>
    </section>
  );
}
