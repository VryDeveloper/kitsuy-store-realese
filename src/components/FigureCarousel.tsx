import { useEffect, useRef, useState } from "react";

//─── Substitua estes imports pelas suas imagens reais ───────────────────────
import img1 from "@/assets/figure/frente.jpg";
import img2 from "@/assets/figure/lateral.jpg";
import img3 from "@/assets/figure/base.jpg";

const IMAGES = [
  { src: img1, label: "Frente" },
  { src: img2, label: "Lateral" },
  { src: img3, label: "Base" },
];
//─────────────────────────────────────────────────────────────────────────────

// // Placeholders usados enquanto as imagens reais não estão configuradas
// const IMAGES = [
//   { src: null, label: "Frente" },
//   { src: null, label: "Lateral" },
//   { src: null, label: "Base" },
// ];

const AUTOPLAY_MS = 3200;

export default function FigureCarousel() {
  const [index, setIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const touchX = useRef(0);
  const n = IMAGES.length;

  // Autoplay
  useEffect(() => {
    if (isHovered) return;
    const t = setInterval(() => setIndex((p) => (p + 1) % n), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [index, isHovered, n]);

  const next = () => setIndex((p) => (p + 1) % n);
  const prev = () => setIndex((p) => (p - 1 + n) % n);

  // Swipe mobile
  const onTouchStart = (e) => (touchX.current = e.touches[0].clientX);
  const onTouchEnd = (e) => {
    const diff = touchX.current - e.changedTouches[0].clientX;
    if (diff > 50) next();
    if (diff < -50) prev();
  };

  const getPos = (i) => {
    const diff = (i - index + n) % n;
    if (diff === 0) return "center";
    if (diff === 1) return "right";
    if (diff === n - 1) return "left";
    return "hidden";
  };

  return (
    <div
      className="relative w-full select-none"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* ── Track ─────────────────────────────────────────────────── */}
      <div className="relative flex justify-center items-center h-[340px] overflow-hidden">
        {/* Botão Anterior */}
        <button
          onClick={prev}
          aria-label="Imagem anterior"
          className="
            absolute left-0 z-40
            w-9 h-9 rounded-full
            bg-white/90 hover:bg-white
            border border-gray-200
            flex items-center justify-center
            shadow-sm
            transition-all duration-200
            text-gray-600 hover:text-gray-900
            text-lg font-light
          "
        >
          ‹
        </button>

        {/* Botão Próxima */}
        <button
          onClick={next}
          aria-label="Próxima imagem"
          className="
            absolute right-0 z-40
            w-9 h-9 rounded-full
            bg-white/90 hover:bg-white
            border border-gray-200
            flex items-center justify-center
            shadow-sm
            transition-all duration-200
            text-gray-600 hover:text-gray-900
            text-lg font-light
          "
        >
          ›
        </button>

        {/* Slides */}
        {IMAGES.map((img, i) => {
          const pos = getPos(i);

          return (
            <div
              key={i}
              className={`
                absolute transition-all duration-700 ease-in-out
                rounded-2xl overflow-hidden
                border border-white/50 shadow-xl
                ${pos === "center" && "translate-x-0 scale-110 opacity-100 z-30 w-[280px] h-[280px]"}
                ${pos === "left" && "-translate-x-[190px] scale-90 opacity-55 z-20 w-[180px] h-[240px]"}
                ${pos === "right" && "translate-x-[190px] scale-90 opacity-55 z-20 w-[180px] h-[240px]"}
                ${pos === "hidden" && "opacity-0 scale-75 z-0 pointer-events-none"}
              `}
            >
              {img.src ? (
                <img
                  src={img.src}
                  alt={`Figure Hatsune Miku Clione — ${img.label}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                /* Placeholder — remova quando tiver as imagens reais */
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gray-100">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="36"
                    height="36"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#9ca3af"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <polyline points="21 15 16 10 5 21" />
                  </svg>
                  <span className="text-xs text-gray-400 font-medium">
                    {img.label}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Dots ──────────────────────────────────────────────────── */}
      <div
        className="flex justify-center gap-2 mt-4"
        role="tablist"
        aria-label="Navegação do carrossel"
      >
        {IMAGES.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === index}
            aria-label={`Imagem ${i + 1}`}
            onClick={() => setIndex(i)}
            className={`
              w-2 h-2 rounded-full border-none cursor-pointer p-0
              transition-all duration-300
              ${i === index ? "bg-[#1D9E75] scale-125" : "bg-gray-300 hover:bg-gray-400"}
            `}
          />
        ))}
      </div>
    </div>
  );
}
