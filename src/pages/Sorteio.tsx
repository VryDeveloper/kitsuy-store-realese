import { useEffect, useRef, useState } from "react";
import { Instagram, MessageCircle, CheckCircle2 } from "lucide-react";

// ⚠️ Coloque a imagem da figure em src/assets/ e ajuste o import abaixo
import mikuFigure from "@/assets/sorteiofigure.png";
import kitsuyIcon from "@/assets/KitsuyIcon.png";
import FigureCarousel from "@/components/FigureCarousel";

// ─── Hook: animação de contagem ───────────────────────────────────────────────
function useCountUp(target: number, duration = 2600) {
  const [count, setCount] = useState(0);
  const [filled, setFilled] = useState(false);
  const [started, setStarted] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !started) setStarted(true);
      },
      { threshold: 0.3 },
    );
    if (sectionRef.current) observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    const t0 = performance.now();
    const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const e = easeOutExpo(p);
      setCount(Math.floor(e * target));
      if (p < 1) requestAnimationFrame(tick);
      else {
        setCount(target);
        setFilled(true);
      }
    };
    requestAnimationFrame(tick);
  }, [started, target, duration]);

  return { count, filled, sectionRef };
}

// ─── Dados ────────────────────────────────────────────────────────────────────
const PRIZE_CARDS = [
  {
    num: "01",
    title: "100% Original",
    desc: "Figure licenciada, lacrada de fábrica. Nada de réplica ou bootleg.",
  },
  {
    num: "02",
    title: "Importada do Japão",
    desc: "Diretamente de lojas licenciadas do Japão!",
  },
  {
    num: "03",
    title: "Entrega no Brasil",
    desc: "O ganhador recebe em casa, sem custo de frete (limite de R$40). Em qualquer estado!",
  },
];

const REGRAS = [
  {
    num: "01",
    titulo: "Siga o perfil",
    desc: "Siga @kitsuystore no Instagram. Perfis privados são aceitos desde que o seguimento seja verificável!.",
  },
  {
    num: "02",
    titulo: "Curta a publicação",
    desc: "Dê like na foto oficial do sorteio no feed da Kitsuy Store. Isso ajuda a divulgar para mais pessoas e é uma forma de confirmar sua participação!",
  },
  {
    num: "03",
    titulo: "Marque um amigo",
    desc: "Marque 2 amigos nos comentários. Para participar e necessario pelo menos 2 marcações que contaram como apenas UMA participacao. Marcações extras NÃO aumentam suas chances, mas ajudam a divulgar o sorteio para mais pessoas!",
  },
  {
    num: "04",
    titulo: "Chance extra! (opcional)",
    desc: "Compartilhe nos seus stories marcando @kitsuystore para ganhar mais uma chance! Lembre-se de deixar seu perfil aberto no dia do sorteio para verificarmos a marcação.",
  },
  {
    num: "05",
    titulo: "Sorteio ao vivo",
    desc: "O sorteio será feito ao vivo no Instagram ao atingirmos 1.500 Seguidores. O ganhador deve responder em até 24h. Caso contrário, faremos um novo sorteio.",
  },
];

const CHECKS = [
  "Gratuito",
  "Sem compra necessária",
  "Figure 100% original",
  "Entrega no Brasil",
  "Sorteio ao vivo",
];

const BUBBLE_COUNT = 22;

// ─── Componente ───────────────────────────────────────────────────────────────
const Sorteio = () => {
  const { count, filled, sectionRef } = useCountUp(1500);
  const [progWidth, setProgWidth] = useState("0%");

  const instagramLink = "https://instagram.com/kitsuystore";
  const whatsappLink =
    "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de saber mais sobre o sorteio!";

  useEffect(() => {
    setProgWidth(`${(count / 1500) * 100}%`);
  }, [count]);

  const bubbles = useRef(
    Array.from({ length: BUBBLE_COUNT }, (_, i) => ({
      id: i,
      size: Math.random() * 7 + 3,
      left: Math.random() * 100,
      duration: Math.random() * 14 + 8,
      delay: Math.random() * 12,
    })),
  );

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Nunito:wght@400;600;700;900&display=swap');
        .sp {
          --cyan:#007a6e; --cyan-bright:#00c4ae; --cyan-light:#e0faf7;
          --cyan-mid:#b2ede7; --cyan-dim:rgba(0,196,174,.12);
          --bg:#f5fffe; --bg2:#eafaf8; --bg3:#ffffff;
          --text:#0a2825; --muted:#3d7a74; --border:rgba(0,196,174,.2);
          font-family:"Nunito",sans-serif;
          background:var(--bg); color:var(--text); overflow-x:hidden;
        }
        .sp-bubble {
          position:fixed; border-radius:50%; background:var(--cyan-bright);
          opacity:0; animation:sp-rise linear infinite; pointer-events:none;
        }
        @keyframes sp-rise {
          0%{transform:translateY(100vh) scale(0);opacity:0}
          10%{opacity:.12} 90%{opacity:.04}
          100%{transform:translateY(-120px) scale(1.3);opacity:0}
        }
        @keyframes sp-float {
          0%,100%{transform:translateY(0)} 50%{transform:translateY(-14px)}
        }
        .sp-float { animation:sp-float 4s ease-in-out infinite; }
        .sp .bebas { font-family:"Bebas Neue",sans-serif; }
        .sp-counter-filled { color:var(--cyan)!important; -webkit-text-stroke:0!important; }
        .sp-prog { transition:width 2.6s cubic-bezier(.16,1,.3,1); }
        .sp-prize-card:hover { border-color:var(--cyan-bright)!important; transform:translateY(-4px); box-shadow:0 12px 32px rgba(0,196,174,.12); }
        .sp-rule:hover { border-color:var(--cyan-bright)!important; box-shadow:0 6px 20px rgba(0,196,174,.10); }
        .sp-watermark {
          position:absolute; left:-2%; bottom:5%;
          font-family:"Bebas Neue",sans-serif;
          font-size:clamp(8rem,18vw,16rem); line-height:1;
          color:rgba(0,196,174,.06); letter-spacing:.05em;
          pointer-events:none; user-select:none; white-space:nowrap;
        }
        .sp-cta-wm {
          position:absolute; left:-3%; bottom:-10%;
          font-family:"Bebas Neue",sans-serif; font-size:22rem; line-height:1;
          color:rgba(255,255,255,.05); pointer-events:none;
          letter-spacing:.1em; white-space:nowrap;
        }
        @media(max-width:768px){
          .sp-hero-grid{grid-template-columns:1fr!important}
          .sp-hero-img{order:-1}
          .sp-hero-text{text-align:center}
          .sp-hero-sub{margin:0 auto 2rem!important}
        }
      `}</style>

      <div className="sp min-h-screen">
        {/* Bolhas */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {bubbles.current.map((b) => (
            <div
              key={b.id}
              className="sp-bubble"
              style={{
                width: b.size,
                height: b.size,
                left: `${b.left}%`,
                animationDuration: `${b.duration}s`,
                animationDelay: `${b.delay}s`,
              }}
            />
          ))}
        </div>

        {/* ── HEADER ── */}
        <header
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between"
          style={{
            padding: ".9rem 2.5rem",
            background: "rgba(245,255,254,.88)",
            backdropFilter: "blur(12px)",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <img
                src={kitsuyIcon}
                alt="Kitsuy"
                className="w-10 h-10 object-contain"
              />
              <span
                className="fredoka text-xl font-bold text-[#FF9AB4]"
                style={{ letterSpacing: ".05em" }}
              >
                KITSUY STORE
              </span>
            </div>
          </div>

          <nav className="hidden md:flex gap-6">
            {(
              [
                ["Início", "/"],
                ["Estoque", "/estoque"],
                ["Sorteio", "/sorteio"],
              ] as [string, string][]
            ).map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  color: href === "/sorteio" ? "var(--cyan)" : "var(--muted)",
                  fontWeight: 900,
                  fontSize: ".82rem",
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </nav>
          <a
            href={instagramLink}
            target="_blank"
            rel="noreferrer"
            style={{
              background: "var(--cyan)",
              color: "#fff",
              fontWeight: 900,
              fontSize: ".78rem",
              padding: ".45rem 1.1rem",
              borderRadius: "99px",
              textDecoration: "none",
              letterSpacing: ".05em",
              boxShadow: "0 4px 14px rgba(0,122,110,.25)",
            }}
          >
            Seguir no Instagram
          </a>
        </header>

        {/* ── HERO ── */}
        <section
          className="relative overflow-hidden"
          style={{ paddingTop: "7rem" }}
        >
          <div
            className="absolute pointer-events-none"
            style={{
              right: "-5%",
              top: "10%",
              width: 600,
              height: 600,
              background:
                "radial-gradient(circle,rgba(0,196,174,.15) 0%,transparent 68%)",
            }}
          />
          <div
            className="sp-hero-grid container mx-auto grid items-center gap-8"
            style={{
              gridTemplateColumns: "1fr 1fr",
              padding: "3rem 4rem 4rem",
              maxWidth: 1100,
            }}
          >
            <div className="sp-watermark">SORTEIO</div>

            {/* Texto */}
            <div className="sp-hero-text relative z-10">
              <div
                className="inline-flex items-center gap-2 mb-6"
                style={{
                  background: "var(--cyan-dim)",
                  border: "1.5px solid var(--cyan-bright)",
                  color: "var(--cyan)",
                  fontSize: ".7rem",
                  fontWeight: 900,
                  letterSpacing: ".15em",
                  textTransform: "uppercase",
                  padding: ".3rem .85rem",
                  borderRadius: "99px",
                }}
              >
                Sorteio especial · 1.500 seguidores
              </div>
              <h1
                className="bebas mb-4"
                style={{
                  fontSize: "clamp(3.5rem,7vw,6.5rem)",
                  lineHeight: 0.95,
                  letterSpacing: ".03em",
                  color: "var(--text)",
                }}
              >
                CONCORRA
                <br />À FIGURE
                <br />
                <span
                  style={{
                    color: "var(--cyan-bright)",
                    fontSize: "1.2em",
                  }}
                >
                  HATSUNE
                  <br />
                  MIKU
                </span>
              </h1>
              <p
                className="sp-hero-sub mb-10"
                style={{
                  color: "var(--muted)",
                  fontSize: ".95rem",
                  lineHeight: 1.75,
                  maxWidth: 420,
                  fontWeight: 600,
                }}
              >
                Para celebrar{" "}
                <strong style={{ color: "var(--text)" }}>
                  1.500 seguidores
                </strong>
                , vamos sortear a figure{" "}
                <strong style={{ color: "var(--text)" }}>
                  Hatsune Miku Clione
                </strong>{" "}
                — 100% original, importada do Japão, entregue na sua porta. De
                graça! 💙
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <a
                  href={instagramLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 hover:scale-105 transition-transform"
                  style={{
                    background: "var(--cyan)",
                    color: "#fff",
                    fontWeight: 900,
                    fontSize: ".95rem",
                    padding: ".8rem 1.8rem",
                    borderRadius: "99px",
                    textDecoration: "none",
                    boxShadow: "0 6px 22px rgba(0,122,110,.3)",
                  }}
                >
                  <Instagram className="w-4 h-4" /> Seguir @kitsuystore
                </a>
                <a
                  href="#regras"
                  className="inline-flex items-center gap-2 hover:scale-105 transition-transform"
                  style={{
                    background: "transparent",
                    color: "var(--cyan)",
                    fontWeight: 900,
                    fontSize: ".95rem",
                    padding: ".8rem 1.8rem",
                    borderRadius: "99px",
                    border: "1.5px solid var(--cyan-bright)",
                    textDecoration: "none",
                  }}
                >
                  Ver regras
                </a>
              </div>
            </div>

            {/* Figure */}
            <div className="sp-hero-img relative flex justify-center items-end z-10">
              <div
                className="absolute"
                style={{
                  bottom: -20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 280,
                  height: 40,
                  background:
                    "radial-gradient(ellipse,rgba(0,122,110,.18) 0%,transparent 70%)",
                  borderRadius: "50%",
                }}
              />
              <img
                src={mikuFigure}
                alt="Hatsune Miku Clione figure"
                className="sp-float w-full"
                style={{
                  borderRadius: 30,
                  maxWidth: 440,
                  filter: "drop-shadow(0 12px 40px rgba(0,122,110,.18))",
                }}
              />
            </div>
          </div>
        </section>

        {/* ── CONTADOR ── */}
        <section
          ref={sectionRef}
          id="counter-sec"
          className="flex flex-col items-center justify-center text-center relative overflow-hidden"
          style={{ padding: "5rem 4rem", background: "var(--bg2)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at 20% 50%,rgba(0,196,174,.08) 0%,transparent 50%),radial-gradient(circle at 80% 50%,rgba(0,196,174,.06) 0%,transparent 50%)",
            }}
          />
          <p
            className="relative z-10"
            style={{
              fontSize: ".75rem",
              fontWeight: 900,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: ".4rem",
            }}
          >
            Nossa meta
          </p>
          <div
            className={`bebas relative z-10 ${filled ? "sp-counter-filled" : ""}`}
            style={{
              fontSize: "clamp(7rem,17vw,13rem)",
              lineHeight: 1,
              color: "var(--cyan-mid)",
              WebkitTextStroke: filled ? "0" : "2px var(--cyan-bright)",
              letterSpacing: ".04em",
              transition: "color .4s",
            }}
          >
            {count.toLocaleString("pt-BR")}
          </div>
          <p
            className="relative z-10"
            style={{
              color: "var(--muted)",
              fontSize: "1rem",
              fontWeight: 700,
              marginTop: ".4rem",
              marginBottom: "2rem",
            }}
          >
            seguidores no Instagram
          </p>
          <div
            className="relative z-10"
            style={{
              width: "min(480px,88%)",
              height: 8,
              background: "var(--cyan-light)",
              borderRadius: "99px",
              overflow: "hidden",
              border: "1px solid var(--cyan-mid)",
            }}
          >
            <div
              className="sp-prog h-full"
              style={{
                width: progWidth,
                background:
                  "linear-gradient(90deg,var(--cyan-bright),var(--cyan))",
                borderRadius: "99px",
                boxShadow: "0 0 12px rgba(0,196,174,.4)",
              }}
            />
          </div>
          <div
            className="relative z-10 flex justify-between"
            style={{
              width: "min(480px,88%)",
              marginTop: ".5rem",
              fontSize: ".72rem",
              color: "var(--muted)",
              fontWeight: 700,
            }}
          >
            <span>0</span>
            <span style={{ color: "var(--cyan)", fontWeight: 900 }}>1.500</span>
          </div>
        </section>

        {/* ── PRÊMIO ── */}
        <section style={{ padding: "5rem 4rem", background: "var(--bg3)" }}>
          <div className="mx-auto" style={{ maxWidth: 860 }}>
            <p
              style={{
                fontSize: ".7rem",
                fontWeight: 900,
                letterSpacing: ".2em",
                textTransform: "uppercase",
                color: "var(--cyan-bright)",
                marginBottom: ".6rem",
              }}
            >
              O prêmio
            </p>
            <h2
              className="bebas"
              style={{
                fontSize: "clamp(2.2rem,4.5vw,3.8rem)",
                letterSpacing: ".04em",
                color: "var(--text)",
                marginBottom: ".8rem",
              }}
            >
              Hatsune Miku Clione
            </h2>

            <FigureCarousel></FigureCarousel>

            <p
              className=""
              style={{
                color: "var(--muted)",
                maxWidth: 460,
                lineHeight: 1.75,
                fontSize: ".9rem",
                fontWeight: 600,
              }}
            >
              Uma das figures mais desejadas da Miku — edição Clione, com base
              aquática detalhada, cabelos esvoaçantes e acabamento premium.
              Importada direto do Japão pela Kitsuy Store 💌
            </p>
            <div
              className="grid mt-10"
              style={{
                gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
                gap: "1.25rem",
              }}
            >
              {PRIZE_CARDS.map(({ num, title, desc }) => (
                <div
                  key={num}
                  className="sp-prize-card"
                  style={{
                    background: "var(--bg2)",
                    border: "1.5px solid var(--border)",
                    borderRadius: 18,
                    padding: "1.5rem",
                    transition: "border-color .3s,transform .3s,box-shadow .3s",
                    cursor: "default",
                  }}
                >
                  <div
                    className="bebas"
                    style={{
                      fontSize: "3rem",
                      color: "var(--cyan-bright)",
                      lineHeight: 1,
                      marginBottom: ".4rem",
                    }}
                  >
                    {num}
                  </div>
                  <div
                    style={{
                      fontSize: ".95rem",
                      fontWeight: 900,
                      color: "var(--text)",
                      marginBottom: ".3rem",
                    }}
                  >
                    {title}
                  </div>
                  <div
                    style={{
                      fontSize: ".82rem",
                      color: "var(--muted)",
                      lineHeight: 1.65,
                      fontWeight: 600,
                    }}
                  >
                    {desc}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── REGRAS ── */}
        <section
          id="regras"
          className="mx-auto"
          style={{ padding: "5rem 4rem", maxWidth: 860 }}
        >
          <p
            style={{
              fontSize: ".7rem",
              fontWeight: 900,
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--cyan-bright)",
              marginBottom: ".6rem",
            }}
          >
            Como participar
          </p>
          <h2
            className="bebas"
            style={{
              fontSize: "clamp(2.2rem,4.5vw,3.8rem)",
              letterSpacing: ".04em",
              color: "var(--text)",
            }}
          >
            Regras do sorteio
          </h2>
          <div className="flex flex-col mt-10" style={{ gap: ".9rem" }}>
            {REGRAS.map(({ num, titulo, desc }) => (
              <div
                key={num}
                className="sp-rule flex items-start gap-5"
                style={{
                  padding: "1.2rem 1.4rem",
                  background: "var(--bg3)",
                  border: "1.5px solid var(--border)",
                  borderRadius: 14,
                  transition: "border-color .25s,box-shadow .25s",
                  cursor: "default",
                }}
              >
                <div
                  className="bebas shrink-0"
                  style={{
                    fontSize: "2rem",
                    color: "var(--cyan-bright)",
                    lineHeight: 1,
                    minWidth: "2.2rem",
                  }}
                >
                  {num}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: ".9rem",
                      fontWeight: 900,
                      color: "var(--text)",
                      marginBottom: ".2rem",
                    }}
                  >
                    {titulo}
                  </h3>
                  <p
                    style={{
                      fontSize: ".82rem",
                      color: "var(--muted)",
                      lineHeight: 1.65,
                      fontWeight: 600,
                    }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div
            style={{
              marginTop: "1.75rem",
              padding: ".9rem 1.1rem",
              background: "var(--cyan-light)",
              border: "1px solid var(--cyan-mid)",
              borderRadius: 10,
              fontSize: ".72rem",
              color: "var(--muted)",
              lineHeight: 1.6,
              fontWeight: 600,
            }}
          >
            Sorteio sem fins comerciais realizado pela Kitsuy Store. Válido para
            residentes no Brasil. Não nos responsabilizamos por perfis
            bloqueados ou inativos. Proibida a participação com perfis falsos ou
            criados exclusivamente para o sorteio.
          </div>
        </section>

        {/* ── CTA FINAL ── */}
        <section
          className="text-center relative overflow-hidden"
          style={{
            padding: "6rem 4rem",
            background: "linear-gradient(135deg,var(--cyan) 0%,#00a693 100%)",
          }}
        >
          <div className="sp-cta-wm">KITSUY</div>
          <h2
            className="bebas relative z-10"
            style={{
              fontSize: "clamp(3rem,7vw,5.5rem)",
              letterSpacing: ".04em",
              color: "#fff",
              marginBottom: ".8rem",
            }}
          >
            BOA SORTE!
            <br />
          </h2>
          <p
            className="relative z-10 mx-auto"
            style={{
              color: "rgba(255,255,255,.82)",
              fontSize: ".95rem",
              maxWidth: 440,
              lineHeight: 1.75,
              fontWeight: 600,
              marginBottom: "2.5rem",
            }}
          >
            Cada seguidor nos aproxima da Miku. Compartilhe com quem também ama
            figures!
          </p>
          <div className="relative z-10 flex flex-wrap gap-4 justify-center">
            <a
              href={instagramLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2"
              style={{
                background: "#fff",
                color: "var(--cyan)",
                fontWeight: 900,
                fontSize: ".95rem",
                padding: ".8rem 1.8rem",
                borderRadius: "99px",
                textDecoration: "none",
                boxShadow: "0 6px 20px rgba(0,0,0,.12)",
              }}
            >
              <Instagram className="w-4 h-4" /> Seguir @kitsuystore
            </a>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2"
              style={{
                background: "transparent",
                color: "#fff",
                fontWeight: 900,
                fontSize: ".95rem",
                padding: ".8rem 1.8rem",
                borderRadius: "99px",
                border: "1.5px solid rgba(255,255,255,.55)",
                textDecoration: "none",
              }}
            >
              <MessageCircle className="w-4 h-4" /> Falar com a loja
            </a>
          </div>
          <div
            className="relative z-10 flex flex-wrap gap-x-7 gap-y-3 justify-center"
            style={{ marginTop: "2.25rem" }}
          >
            {CHECKS.map((item) => (
              <span
                key={item}
                className="flex items-center gap-2"
                style={{
                  fontSize: ".78rem",
                  color: "rgba(255,255,255,.8)",
                  fontWeight: 700,
                }}
              >
                <CheckCircle2 className="w-4 h-4" />
                {item}
              </span>
            ))}
          </div>
        </section>

        {/* ── FOOTER ── */}
        <footer
          className="flex items-center justify-between flex-wrap"
          style={{
            padding: "1.75rem 4rem",
            background: "var(--text)",
            gap: "1rem",
          }}
        >
          <span
            className="bebas"
            style={{ fontSize: "1.25rem", color: "var(--cyan-bright)" }}
          >
            KITSUY STORE
          </span>
          <div className="flex gap-6">
            {(
              [
                ["Início", "/"],
                ["Estoque", "/estoque"],
                ["FAQs", "/faqs"],
                ["Sorteio", "/sorteio"],
              ] as [string, string][]
            ).map(([label, href]) => (
              <a
                key={label}
                href={href}
                style={{
                  color:
                    href === "/sorteio"
                      ? "var(--cyan-bright)"
                      : "rgba(255,255,255,.45)",
                  fontSize: ".78rem",
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                {label}
              </a>
            ))}
          </div>
          <p style={{ fontSize: ".7rem", color: "rgba(255,255,255,.25)" }}>
            © 2025 Kitsuy Store. Todos os direitos reservados.
          </p>
        </footer>
      </div>
    </>
  );
};

export default Sorteio;
