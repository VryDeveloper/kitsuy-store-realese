import { useEffect, useRef } from "react";

const PONTOS = 72; // pontos da superfície simulada
const RIGIDEZ = 0.012; // força que puxa cada ponto de volta ao nível (baixa = onda mais lenta, menos "gelatina")
const AMORTECE = 0.05; // quanto o movimento perde por quadro (alto = para de balançar logo)
const ESPALHA = 0.22; // quanto cada ponto puxa os vizinhos (é o que faz a ondulação correr para os lados)
const CONTATO = 36; // px acima da superfície em que o cursor já empurra o líquido

interface Gota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/**
 * Onda rosa líquida no rodapé da seção de promoção (canvas).
 * Parada ela balança sozinha; com mouse (desktop) o cursor empurra o líquido ao passar por ele, deixando um
 * rastro de ondas, e espirra gotas ao atravessar rápido ou clicar. Sem animação com "reduzir movimento".
 */
export function OndaLiquida({ cor, className = "" }: { cor: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    const area = canvas?.parentElement;
    if (!canvas || !ctx || !area) return;

    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const alt = new Float32Array(PONTOS); // deslocamento de cada ponto (+ = para baixo)
    const vel = new Float32Array(PONTOS);
    const delta = new Float32Array(PONTOS);
    let gotas: Gota[] = [];
    const mouse = { x: 0, y: 0, vx: 0, vy: 0, dentro: false, acima: true };
    let w = 0;
    let h = 0;
    let t = 0;
    let raf = 0;
    let visivel = false;
    let ultimoEspirro = -1; // em segundos de `t`; evita uma rajada de espirros numa passada só

    const nivel = () => h * 0.42;
    const indice = (x: number) => Math.max(0, Math.min(PONTOS - 1, Math.round((x / w) * (PONTOS - 1))));
    // Balanço de base (duas senoides lentas) + a física.
    const superficie = (i: number) => {
      const x = i / (PONTOS - 1);
      return nivel() + Math.sin(x * 6.3 + t * 0.7) * h * 0.05 + Math.sin(x * 13.7 - t) * h * 0.02 + alt[i];
    };

    function medir() {
      const r = canvas!.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width;
      h = r.height;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function espirrar(x: number, forca: number) {
      const i = indice(x);
      const y = superficie(i);
      for (let k = 0; k < 6 + Math.round(forca * 4); k++) {
        gotas.push({
          x: x + (Math.random() - 0.5) * 30,
          y,
          vx: (Math.random() - 0.5) * 3,
          vy: -(2.5 + Math.random() * 3.5) * Math.min(1.6, 0.6 + forca),
          r: 2 + Math.random() * 4,
        });
      }
      for (let j = Math.max(0, i - 3); j <= Math.min(PONTOS - 1, i + 3); j++) vel[j] += 4 * forca;
      gotas = gotas.slice(-60);
    }

    function fisica() {
      if (mouse.dentro) {
        const iM = (mouse.x / w) * (PONTOS - 1);
        const distancia = superficie(indice(mouse.x)) - mouse.y; // > 0: cursor acima do líquido
        if (distancia > -h && distancia < CONTATO) {
          // Só o movimento empurra (cursor parado não faz nada); descer empurra mais que andar de lado.
          const contato = distancia > 0 ? 1 - distancia / CONTATO : 1;
          const empurrao = contato * (Math.min(Math.hypot(mouse.vx, mouse.vy), 40) * 0.07 + Math.max(0, mouse.vy) * 0.05);
          for (let i = Math.max(0, Math.floor(iM - 6)); i <= Math.min(PONTOS - 1, Math.ceil(iM + 6)); i++) {
            vel[i] += Math.exp(-(((i - iM) / 2) ** 2)) * empurrao; // + = para baixo
          }
        }
        const acima = distancia > 0;
        if (acima !== mouse.acima && Math.abs(mouse.vy) > 6 && t - ultimoEspirro > 0.35) {
          espirrar(mouse.x, Math.min(1.5, Math.abs(mouse.vy) / 18));
          ultimoEspirro = t;
        }
        mouse.acima = acima;
      }
      mouse.vx *= 0.85;
      mouse.vy *= 0.85;

      for (let i = 0; i < PONTOS; i++) {
        vel[i] += -RIGIDEZ * alt[i] - AMORTECE * vel[i];
        alt[i] += vel[i];
      }
      for (let passada = 0; passada < 3; passada++) {
        for (let i = 0; i < PONTOS; i++) {
          delta[i] = (i > 0 ? alt[i] - alt[i - 1] : 0) + (i < PONTOS - 1 ? alt[i] - alt[i + 1] : 0);
        }
        for (let i = 0; i < PONTOS; i++) vel[i] -= ESPALHA * delta[i];
      }

      gotas = gotas.filter((g) => {
        g.vy += 0.28;
        g.x += g.vx;
        g.y += g.vy;
        const i = indice(g.x);
        if (g.vy > 0 && g.y > superficie(i)) {
          vel[i] += g.r * 0.35; // ao cair, faz uma ondinha
          return false;
        }
        return g.x > -10 && g.x < w + 10;
      });
    }

    function liquido() {
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      let xAnt = 0;
      let yAnt = superficie(0);
      ctx!.lineTo(xAnt, yAnt);
      for (let i = 1; i < PONTOS; i++) {
        const x = (i / (PONTOS - 1)) * w;
        const y = superficie(i);
        ctx!.quadraticCurveTo(xAnt, yAnt, (xAnt + x) / 2, (yAnt + y) / 2);
        xAnt = x;
        yAnt = y;
      }
      ctx!.lineTo(w, yAnt);
      ctx!.lineTo(w, h);
      ctx!.closePath();
      ctx!.fillStyle = cor;
      ctx!.fill();
    }

    function desenhar() {
      ctx!.clearRect(0, 0, w, h);
      liquido();
      // brilho fino na crista, dá cara de líquido
      ctx!.beginPath();
      for (let i = 0; i < PONTOS; i++) {
        const x = (i / (PONTOS - 1)) * w;
        const y = superficie(i) + 3;
        if (i) ctx!.lineTo(x, y);
        else ctx!.moveTo(x, y);
      }
      ctx!.strokeStyle = "rgba(255,255,255,0.28)";
      ctx!.lineWidth = 2;
      ctx!.stroke();
      ctx!.fillStyle = cor;
      for (const g of gotas) {
        ctx!.beginPath();
        // gota levemente esticada na direção em que se move
        ctx!.ellipse(g.x, g.y, g.r, g.r * (1 + Math.min(0.8, Math.abs(g.vy) / 10)), Math.atan2(g.vy, g.vx) + Math.PI / 2, 0, Math.PI * 2);
        ctx!.fill();
      }
    }

    function quadro() {
      t += 1 / 60;
      fisica();
      desenhar();
      raf = visivel ? requestAnimationFrame(quadro) : 0;
    }

    medir();
    desenhar();
    if (reduz) return;

    const ro = new ResizeObserver(() => {
      medir();
      desenhar();
    });
    ro.observe(canvas);
    // Só anima enquanto a seção está na tela.
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel && !raf) raf = requestAnimationFrame(quadro);
    });
    io.observe(canvas);

    const posicao = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    };
    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const p = posicao(e);
      if (mouse.dentro) {
        mouse.vx = mouse.vx * 0.5 + (p.x - mouse.x) * 0.5;
        mouse.vy = mouse.vy * 0.5 + (p.y - mouse.y) * 0.5;
      }
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.dentro = true;
    };
    const sair = () => {
      mouse.dentro = false;
    };
    const clicar = (e: PointerEvent) => {
      const p = posicao(e);
      if (e.pointerType === "mouse" && p.y > nivel() - CONTATO * 2) espirrar(p.x, 1.1);
    };
    area.addEventListener("pointermove", mover);
    area.addEventListener("pointerleave", sair);
    area.addEventListener("pointerdown", clicar);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      area.removeEventListener("pointermove", mover);
      area.removeEventListener("pointerleave", sair);
      area.removeEventListener("pointerdown", clicar);
    };
  }, [cor]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
