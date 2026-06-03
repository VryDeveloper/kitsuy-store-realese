import { useEffect, useRef, useState } from "react";

const imagens = [
  "src/assets/avaliacoes/1.jpg",
  "src/assets/avaliacoes/2.jpg",
  "src/assets/avaliacoes/3.jpg",
  "src/assets/avaliacoes/4.jpg",
  "src/assets/avaliacoes/5.jpg",
  "src/assets/avaliacoes/6.jpg",
  "src/assets/avaliacoes/7.jpg",
  "src/assets/avaliacoes/8.jpg",
  "src/assets/avaliacoes/9.jpg",
  "src/assets/avaliacoes/10.jpg",
  "src/assets/avaliacoes/11.jpg",
  "src/assets/avaliacoes/12.jpg",
  "src/assets/avaliacoes/13.jpg",
];

export default function DepoimentosCarousel() {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const startX = useRef(0);
  const isDragging = useRef(false);

  // autoplay
  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      next();
    }, 3000);

    return () => clearInterval(interval);
  }, [index, isHovered]);

  const next = () => {
    setIndex((prev) => (prev + 1) % imagens.length);
  };

  const prev = () => {
    setIndex((prev) => (prev - 1 + imagens.length) % imagens.length);
  };

  // swipe mobile
  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = true;
  };

  const handleTouchEnd = (e) => {
    if (!isDragging.current) return;

    const endX = e.changedTouches[0].clientX;
    const diff = startX.current - endX;

    if (diff > 50) next();
    if (diff < -50) prev();

    isDragging.current = false;
  };

  // calcula posição relativa (para efeito de slide)
  const getPosition = (i) => {
    const diff = (i - index + imagens.length) % imagens.length;

    if (diff === 0) return "center";
    if (diff === 1) return "right";
    if (diff === imagens.length - 1) return "left";

    return "hidden";
  };

  return (
    <section
      id="depoimentos"
      className="py-20 bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="text-center mb-12">
        <span className="inline-block bg-pink-100 text-[#EA3E83] text-xs font-bold px-4 py-1 rounded-full mb-4 tracking-widest uppercase">
          Avaliações
        </span>

        <h2 className="fredoka text-4xl md:text-5xl font-bold text-gray-900">
          Clientes reais, Avaliações reais 🧡
        </h2>
        <p className="mt-4 text-gray-600 max-w-2xl mx-auto">
          Veja o que nossos clientes têm a dizer sobre a Kitsuy! Nossas
          avaliações no Instagram e Whatsapp!
        </p>
      </div>

      {/* CAROUSEL */}
      <div className="relative flex justify-center items-center h-[620px] overflow-hidden">
        {imagens.map((img, i) => {
          const pos = getPosition(i);

          return (
            <div
              key={i}
              className={`
                absolute transition-all duration-700 ease-in-out
                ${
                  pos === "center" && "translate-x-0 scale-110 opacity-100 z-30"
                }
                ${
                  pos === "left" &&
                  "-translate-x-[260px] scale-90 opacity-60 z-20"
                }
                ${
                  pos === "right" &&
                  "translate-x-[260px] scale-90 opacity-60 z-20"
                }
                ${
                  pos === "hidden" &&
                  "opacity-0 scale-75 z-0 pointer-events-none"
                }
              `}
            >
              <div
                className="
                  w-[280px] md:w-[320px] h-[500px]
                  rounded-2xl
                  backdrop-blur-lg
                  bg-white/30
                  border border-white/40
                  shadow-xl
                  overflow-hidden
                "
              >
                <img
                  src={img}
                  alt="Avaliação cliente"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* INDICADORES */}
      <div className="flex justify-center mt-8 gap-3">
        {imagens.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`
              w-3 h-3 rounded-full transition-all duration-300
              ${
                i === index
                  ? "bg-[#EA3E83] scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }
            `}
          />
        ))}
      </div>
    </section>
  );
}
