import { useEffect, useRef } from "react";

const PONTOS = 72; // pontos da superfície simulada
const RIGIDEZ = 0.018; // força que puxa cada ponto de volta ao nível
const AMORTECE = 0.035; // quanto o movimento perde por quadro
const ESPALHA = 0.14; // quanto cada ponto puxa os vizinhos (é o que faz a ondulação correr para os lados)
const ALCANCE = 130; // px acima da superfície em que o líquido "procura" o cursor

interface Gota {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
}

/**
 * Onda rosa líquida no rodapé da seção de promoção (canvas).
 * Parada ela balança sozinha; com mouse (desktop) a superfície sobe atrás do cursor, ondula com o movimento
 * e espirra gotas ao ser atravessada rápido ou clicada. Sem animação com "reduzir movimento".
 */
export function OndaLiquida({ cor, corFundo, className = "" }: { cor: string; corFundo: string; className?: string }) {
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
    const mouse = { x: 0, y: 0, vy: 0, dentro: false, acima: true };
    let w = 0;
    let h = 0;
    let t = 0;
    let raf = 0;
    let visivel = false;
    let ultimoEspirro = -1; // em segundos de `t`; evita uma rajada de espirros numa passada só

    const nivel = () => h * 0.42;
    const indice = (x: number) => Math.max(0, Math.min(PONTOS - 1, Math.round((x / w) * (PONTOS - 1))));
    // Balanço de base (duas senoides) + a física; `fase`/`peso` diferenciam a camada de trás.
    const superficie = (i: number, fase = 0, peso = 1) => {
      const x = i / (PONTOS - 1);
      return (
        nivel() +
        Math.sin(x * 6.3 + t * 0.9 + fase) * h * 0.06 +
        Math.sin(x * 13.7 - t * 1.3 + fase * 2) * h * 0.03 +
        alt[i] * peso
      );
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
        if (distancia > -h && distancia < ALCANCE) {
          for (let i = Math.max(0, Math.floor(iM - 8)); i <= Math.min(PONTOS - 1, Math.ceil(iM + 8)); i++) {
            const g = Math.exp(-(((i - iM) / 2.4) ** 2));
            if (distancia > 0) vel[i] -= g * (1 - distancia / ALCANCE) * 2.6; // sobe atrás do cursor
            vel[i] += g * mouse.vy * 0.06; // empurrado pelo movimento vertical
          }
        }
        const acima = distancia > 0;
        if (acima !== mouse.acima && Math.abs(mouse.vy) > 6 && t - ultimoEspirro > 0.35) {
          espirrar(mouse.x, Math.min(1.5, Math.abs(mouse.vy) / 18));
          ultimoEspirro = t;
        }
        mouse.acima = acima;
      }
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

    function camada(preenchimento: string, fase: number, peso: number, subir: number) {
      ctx!.beginPath();
      ctx!.moveTo(0, h);
      let xAnt = 0;
      let yAnt = superficie(0, fase, peso) - subir;
      ctx!.lineTo(xAnt, yAnt);
      for (let i = 1; i < PONTOS; i++) {
        const x = (i / (PONTOS - 1)) * w;
        const y = superficie(i, fase, peso) - subir;
        ctx!.quadraticCurveTo(xAnt, yAnt, (xAnt + x) / 2, (yAnt + y) / 2);
        xAnt = x;
        yAnt = y;
      }
      ctx!.lineTo(w, yAnt);
      ctx!.lineTo(w, h);
      ctx!.closePath();
      ctx!.fillStyle = preenchimento;
      ctx!.fill();
    }

    function desenhar() {
      ctx!.clearRect(0, 0, w, h);
      camada(corFundo, 1.7, 0.6, h * 0.12);
      camada(cor, 0, 1, 0);
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
      if (mouse.dentro) mouse.vy = mouse.vy * 0.5 + (p.y - mouse.y) * 0.5;
      mouse.x = p.x;
      mouse.y = p.y;
      mouse.dentro = true;
    };
    const sair = () => {
      mouse.dentro = false;
    };
    const clicar = (e: PointerEvent) => {
      const p = posicao(e);
      if (e.pointerType === "mouse" && p.y > nivel() - ALCANCE) espirrar(p.x, 1.3);
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
  }, [cor, corFundo]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
