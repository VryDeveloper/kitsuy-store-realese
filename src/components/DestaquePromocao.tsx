import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, CreditCard, Percent, ShieldCheck, ShoppingCart, Tag, Truck } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { comDestaque } from "@/hooks/useConfigSite";
import { Button } from "@/components/ui/button";
import MagneticBounce from "@/components/MagneticBounce";
import { OndaLiquida } from "@/components/OndaLiquida";
import type { ProdutoEmPromocao } from "@/lib/promocao";

const ROSA = "#FF3E8E";
const TROCA_MS = 7000;

// Círculos que sobem: [left, tamanho px, duração s, atraso s]
const CIRCULOS: [string, number, number, number][] = [
  ["4%", 14, 11, 0], ["12%", 8, 14, 3], ["22%", 20, 16, 6], ["35%", 10, 12, 1.5], ["47%", 16, 18, 8],
  ["58%", 8, 13, 4], ["66%", 22, 17, 2], ["78%", 12, 15, 7], ["88%", 18, 19, 5], ["95%", 9, 12, 9],
];

/** Escreve `texto` letra a letra sempre que ele (ou a `chave`) muda. */
function useDigitacao(texto: string, desligado: boolean, chave = "") {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (desligado) return;
    const id = setInterval(() => setN((atual) => (atual >= texto.length ? atual : atual + 1)), 45);
    return () => clearInterval(id);
  }, [texto, desligado, chave]);
  return desligado ? texto : texto.slice(0, n);
}

interface Props {
  figures: ProdutoEmPromocao[];
  titulo: string;
}

/** Seção preta e rosa com até 3 figures de pronta entrega com maior desconto (liga/desliga em /admin). */
export function DestaquePromocao({ figures, titulo }: Props) {
  const { itens, adicionar } = useCart();
  const { toast } = useToast();
  const semMovimento = !!useReducedMotion();
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  // Alterna a figure destacada; para com o mouse no botão de comprar ou se o sistema pede menos movimento.
  useEffect(() => {
    if (pausado || semMovimento || figures.length < 2) return;
    const id = setInterval(() => setAtual((i) => (i + 1) % figures.length), TROCA_MS);
    return () => clearInterval(id);
  }, [pausado, semMovimento, figures.length]);

  const destaque = figures[atual % figures.length];
  // Destacada primeiro; o resto na ordem em que vem depois dela.
  const ordem = figures.map((_, k) => figures[(atual + k) % figures.length]);
  const nome = useDigitacao(destaque.title, semMovimento);
  // chave = id: duas figures com o mesmo preço também redigitam
  const preco = useDigitacao(destaque.price, semMovimento, destaque.id);
  const noCarrinho = itens.some((item) => item.id === destaque.id);
  const maiorDesconto = Math.max(...figures.map((f) => f.descontoPct));

  function comprar() {
    if (noCarrinho) return;
    adicionar({ id: destaque.id, collectionName: "products", nome: destaque.title, preco: destaque.price, imagem: destaque.image });
    toast({ title: "Adicionado ao carrinho", description: destaque.title });
  }

  return (
    <section aria-labelledby="titulo-promocao" className="relative overflow-hidden bg-[#0b0a0f] text-white pt-14 pb-36 md:pb-48 px-4">
      {!semMovimento && (
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {CIRCULOS.map(([left, tam, dur, atraso], i) => (
            <span
              key={i}
              className="circulo-subindo absolute rounded-full"
              style={{ left, width: tam, height: tam, background: i % 3 ? ROSA : "#ffffff", animationDuration: `${dur}s`, animationDelay: `${atraso}s` }}
            />
          ))}
        </div>
      )}

      <div className="relative container mx-auto max-w-7xl">
        {/* Selo "Oferta especial" */}
        <div className="flex items-center gap-4 mb-10">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-[#FF3E8E]/70" />
          <span className="flex items-center gap-2 rounded-full border-2 px-5 py-2 text-sm md:text-base font-black tracking-wide" style={{ borderColor: ROSA, color: ROSA }}>
            <Tag className="h-5 w-5 fill-current" /> OFERTA ESPECIAL
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-[#FF3E8E]/70" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center">
          {/* Destacada grande à esquerda, as outras menores à direita */}
          <ul className="grid grid-cols-3 grid-rows-2 gap-3 sm:gap-4 aspect-[6/5]">
            {/* As molduras ficam paradas; só a imagem troca, com fade e um leve deslize (sem esticar). */}
            {ordem.map((f, k) => (
              <li
                key={k}
                className={`relative overflow-hidden rounded-2xl bg-black ${
                  k === 0 ? "col-span-2 row-span-2" : figures.length === 2 ? "row-span-2 self-center aspect-[4/5]" : ""
                }`}
              >
                <AnimatePresence initial={false}>
                  <motion.button
                    key={f.id}
                    type="button"
                    onClick={() => setAtual(figures.indexOf(f))}
                    aria-label={k === 0 ? f.title : `Destacar ${f.title}`}
                    initial={{ opacity: 0, x: 24 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -24 }}
                    transition={{ duration: semMovimento ? 0 : 0.6, ease: "easeInOut" }}
                    className="absolute inset-0 block"
                  >
                    <img src={f.image} alt="" loading="lazy" className="h-full w-full object-cover" />
                    {f.descontoPct > 0 && (
                      <span className="absolute left-2 top-2 rounded-full px-2.5 py-0.5 text-xs font-black" style={{ background: ROSA }}>
                        -{f.descontoPct}%
                      </span>
                    )}
                  </motion.button>
                </AnimatePresence>
              </li>
            ))}
          </ul>

          {/* Texto e chamada */}
          <div className="text-center lg:text-left">
            <h2 id="titulo-promocao" className="fredoka text-2xl md:text-3xl font-bold leading-tight mb-3">
              {comDestaque(titulo, (t) => <span style={{ color: ROSA }}>{t}</span>)}
            </h2>
            {maiorDesconto > 0 && (
            <div className="mx-auto lg:mx-0 mb-7 flex max-w-sm items-center gap-4 rounded-3xl border-2 px-5 py-3" style={{ borderColor: ROSA }}>
              <span className="grid h-12 w-12 shrink-0 -rotate-12 place-items-center rounded-2xl" style={{ background: ROSA }}>
                <Percent className="h-6 w-6" strokeWidth={3} />
              </span>
              <span className="h-10 w-px bg-white/20" />
              <p className="text-left leading-none whitespace-nowrap">
                <span className="block text-sm font-black">ATÉ</span>
                <span className="text-4xl md:text-5xl font-black">{maiorDesconto}%</span>{" "}
                <span className="text-3xl md:text-4xl font-black" style={{ color: ROSA }}>OFF</span>
              </p>
            </div>
            )}

            <ul className="mb-8 flex flex-wrap justify-center lg:justify-start gap-x-6 gap-y-3 text-sm text-white/85">
              {[
                { Icone: ShieldCheck, texto: "Compra segura" },
                { Icone: Truck, texto: "Envio para todo o Brasil" },
                { Icone: CreditCard, texto: "PIX ou cartão" },
              ].map(({ Icone, texto }) => (
                <li key={texto} className="flex items-center gap-2">
                  <Icone className="h-5 w-5" style={{ color: ROSA }} /> {texto}
                </li>
              ))}
            </ul>

            {/* Nome da figure destacada, digitado, logo acima do botão. O texto completo fica para leitores de tela. */}
            <p className="h-14 md:h-16 overflow-hidden line-clamp-2 text-xl md:text-2xl font-semibold text-white/90 mb-4">
              <span className="sr-only" aria-live="polite">{destaque.title}</span>
              <span aria-hidden>
                {nome}
                <span className="ml-0.5 inline-block w-[2px] h-[1em] align-middle animate-pulse" style={{ background: ROSA }} />
              </span>
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              {/* Mesmo visual e efeito do "Pedir um orçamento grátis" da home */}
              <MagneticBounce>
                <Button
                  size="lg"
                  onClick={comprar}
                  disabled={noCarrinho}
                  onMouseEnter={() => setPausado(true)}
                  onMouseLeave={() => setPausado(false)}
                  onFocus={() => setPausado(true)}
                  onBlur={() => setPausado(false)}
                  aria-label={noCarrinho ? `${destaque.title} já está no carrinho` : `Comprar ${destaque.title} por ${destaque.price}`}
                  className="min-w-[12rem] justify-start bg-[#EA3E83] hover:bg-[#c72e6c] text-white gap-2 text-base px-8 py-6 rounded-full shadow-lg hover:shadow-xl transition-all"
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span aria-hidden>
                    {noCarrinho ? "No carrinho" : preco}
                    {!noCarrinho && preco.length < destaque.price.length && (
                      <span className="ml-0.5 inline-block w-[2px] h-[1em] align-middle bg-white animate-pulse" />
                    )}
                  </span>
                </Button>
              </MagneticBounce>
              <Link to="/estoque" className="inline-flex items-center gap-1 text-sm font-bold text-white/80 hover:text-white">
                Ver todo o estoque <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Onda rosa líquida no rodapé (interativa com o mouse no desktop) */}
      <OndaLiquida cor={ROSA} corFundo="#FF8FBC" className="pointer-events-none absolute bottom-0 left-0 h-32 md:h-44 w-full" />
    </section>
  );
}
