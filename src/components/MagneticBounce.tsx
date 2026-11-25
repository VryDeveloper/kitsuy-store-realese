import type { ReactNode } from "react";
import { animate, motion, useMotionValue, useReducedMotion, useSpring } from "framer-motion";

/**
 * Envolve um botão existente sem mudar o visual: ímã leve que segue o mouse
 * (até `forca` px) e um bounce de gelatina ao entrar e ao clicar.
 * Desligado no toque (ímã) e com "reduzir movimento" (tudo).
 */
export default function MagneticBounce({
  children,
  forca = 4,
  className = "",
}: {
  children: ReactNode;
  /** Deslocamento máximo do ímã em px. */
  forca?: number;
  className?: string;
}) {
  const reduz = useReducedMotion();
  const x = useSpring(0, { stiffness: 160, damping: 14, mass: 0.4 });
  const y = useSpring(0, { stiffness: 160, damping: 14, mass: 0.4 });
  const sx = useMotionValue(1);
  const sy = useMotionValue(1);
  const mola = { type: "spring" as const, stiffness: 420, damping: 10 };

  if (reduz) return <span className={`inline-flex ${className}`}>{children}</span>;

  return (
    <motion.span
      className={`inline-flex ${className}`}
      style={{ x, y, scaleX: sx, scaleY: sy }}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        animate(sx, 1, { ...mola, velocity: 0.8 });
        animate(sy, 1, { ...mola, velocity: -0.8 });
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        const lim = (v: number) => Math.max(-1, Math.min(1, v));
        x.set(lim((e.clientX - r.left - r.width / 2) / (r.width / 2)) * forca);
        y.set(lim((e.clientY - r.top - r.height / 2) / (r.height / 2)) * forca);
      }}
      onPointerLeave={() => {
        x.set(0);
        y.set(0);
      }}
      onPointerDown={() => {
        animate(sx, 0.97, { duration: 0.1 });
        animate(sy, 0.93, { duration: 0.1 });
      }}
      onPointerUp={() => {
        animate(sx, 1, { ...mola, stiffness: 520 });
        animate(sy, 1, { ...mola, stiffness: 520 });
      }}
      onPointerCancel={() => {
        sx.set(1);
        sy.set(1);
      }}
    >
      {children}
    </motion.span>
  );
}
