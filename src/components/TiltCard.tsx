import { useRef, useEffect } from "react";

function TiltCard({ children, className = "", onClick }) {
  const ref = useRef(null);

  const state = useRef({
    targetX: 0,
    targetY: 0,
    currentX: 0,
    currentY: 0,
    raf: null,
  });

  useEffect(() => {
    const animate = () => {
      const el = ref.current;
      if (!el) return;

      const s = state.current;

      // suavização (quanto menor, mais suave)
      s.currentX += (s.targetX - s.currentX) * 0.1;
      s.currentY += (s.targetY - s.currentY) * 0.1;

      el.style.transform = `
        perspective(1000px)
        rotateX(${s.currentY}deg)
        rotateY(${s.currentX}deg)
        scale(1.03)
      `;

      el.style.boxShadow = `
        ${-s.currentX * 2}px ${s.currentY * 2}px 25px rgba(234,62,131,0.2)
      `;

      s.raf = requestAnimationFrame(animate);
    };

    state.current.raf = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(state.current.raf);
  }, []);

  const handleMouseMove = (e) => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    state.current.targetX = (x / rect.width - 0.5) * 10;
    state.current.targetY = (y / rect.height - 0.5) * -10;
  };

  const handleLeave = () => {
    state.current.targetX = 0;
    state.current.targetY = 0;
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      className={`will-change-transform transition-shadow duration-300 ${className}`}
    >
      {children}
    </div>
  );
}
export default TiltCard;
