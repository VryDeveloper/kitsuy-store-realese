import { useEffect, useRef } from "react";

/*
 * Líquido rosa feito de bolinhas (metaballs). Cada gota soma um "campo" numa grade de baixa resolução e onde o
 * campo passa do LIMIAR vira líquido: por isso gotas próximas se fundem e se separam como líquido de verdade.
 * Parado, forma a onda do rodapé e balança. O mouse rápido arremessa o líquido pela seção (as gotas se juntam
 * no ar e depois nadam de volta e refazem a onda), o mouse devagar empurra e o clique (ou toque) explode.
 */

const LIMIAR = 0.35; // campo a partir do qual é líquido
const F_MAX = 1.2; // campo a partir do qual já é miolo (cor cheia)
const NIVEIS = 128; // tons da tabela de cores por nível de campo...
const NG = 16; // ...e por inclinação (brilho na parte de cima das gotas)
const INFLUENCIA = 1.85; // o campo de uma gota vai até 1,85× o raio; sozinha ela aparece com o próprio raio
const PASSO = 1 / 60; // a física anda em passos fixos de 1/60 s
const GRAVIDADE = 0.32; // px por passo²
const VEL_MAX = 26; // px por passo
const RAIO_DEDO = 34; // buraco que o cursor abre no líquido
const RAIO_CLIQUE = 230;

interface Gota {
  hx: number; // casa na onda, para onde ela volta
  hy: number;
  balanco: number; // quanto acompanha o balanço da onda (1 = linha de cima)
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  solta: boolean; // saiu da onda
  livre: number; // segundos voando antes de começar a nadar de volta
  imune: number; // segundos sem levar outro golpe do mouse (senão ele "empurra" a gota junto, como um rodo)
}

const suave = (a: number, b: number, x: number) => {
  const k = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return k * k * (3 - 2 * k);
};

/** Tabela (nível de campo × inclinação) → pixel RGBA empacotado para Uint32Array. `cor` em "#rrggbb". */
function tabelaDeCores(cor: string) {
  const hex = parseInt(cor.slice(1), 16);
  const rgb = [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
  const tabela = new Uint32Array(NIVEIS * NG);
  for (let i = 0; i < NIVEIS; i++) {
    const f = ((i + 0.5) / NIVEIS) * F_MAX;
    const alfa = Math.round(suave(LIMIAR - 0.05, LIMIAR + 0.05, f) * 255);
    const borda = 1 - suave(LIMIAR, LIMIAR * 1.6, f);
    for (let k = 0; k < NG; k++) {
      const brilho = borda * (k / (NG - 1)) * 0.5; // clareia só a borda de cima, como luz batendo no líquido
      const [r, g, b] = rgb.map((c) => Math.round(c + (255 - c) * brilho));
      tabela[i * NG + k] = ((alfa << 24) | (b << 16) | (g << 8) | r) >>> 0;
    }
  }
  return tabela;
}

/** Líquido interativo que cobre a seção-mãe (fica atrás do conteúdo). Sem animação com "reduzir movimento". */
export function OndaLiquida({ cor, className = "" }: { cor: string; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    const area = canvas?.parentElement;
    if (!canvas || !ctx || !area) return;

    const reduz = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const tabela = tabelaDeCores(cor);
    // x/y no canvas; cx/cy na tela: a velocidade vem da tela, então rolar a página não "arremessa" nada
    const mouse = { x: 0, y: 0, cx: 0, cy: 0, pcx: 0, pcy: 0, vx: 0, vy: 0, dentro: false };
    const voando: Gota[] = [];
    let gotas: Gota[] = [];
    let topo: Gota[] = []; // linha de cima da onda, de onde saem os pulinhos
    let w = 0;
    let h = 0;
    let S = 2; // 1 célula da grade = S×S px
    let gw = 1;
    let gh = 1;
    let campo = new Float32Array(1);
    let colBase = new Float32Array(1);
    let img = ctx.createImageData(1, 1);
    let px = new Uint32Array(img.data.buffer);
    let topoBase = 0;
    let raioBase = 0;
    let escalaInc = 0;
    let linhaAnt = 0; // primeira linha da grade pintada no quadro anterior
    let t = 0;
    let acumulado = 0;
    let ultimo = 0;
    let raf = 0;
    let visivel = false;
    let calmaDesde = 0;
    let proximoPulo = 2;

    // Balanço da onda parada: cada gota anda num pequeno círculo, como numa onda de verdade
    const ondaY = (x: number) => Math.sin(x * 0.0045 + t * 0.8) * 9 + Math.sin(x * 0.011 - t * 1.1) * 4;
    const ondaX = (x: number) => Math.cos(x * 0.0045 + t * 0.8) * 4;

    const montar = () => {
      const ret = canvas.getBoundingClientRect();
      w = ret.width;
      h = ret.height;
      // ~160 mil células no máximo; o navegador estica o canvas e suaviza as bordas
      S = Math.max(2, Math.round(Math.sqrt((w * h) / 160_000)));
      gw = Math.max(1, Math.ceil(w / S));
      gh = Math.max(1, Math.ceil(h / S));
      canvas.width = gw;
      canvas.height = gh;
      campo = new Float32Array(gw * gh);
      colBase = new Float32Array(gw);
      img = ctx.createImageData(gw, gh);
      px = new Uint32Array(img.data.buffer);
      linhaAnt = 0;

      const celular = w < 640;
      const R = celular ? 12 : Math.min(20, Math.max(14, w / 72));
      const altura = celular ? 95 : 130; // altura da onda parada
      topoBase = h - altura * 0.3;
      raioBase = R * INFLUENCIA;
      escalaInc = (3 * raioBase) / S;
      gotas = [];
      topo = [];
      for (let linha = 0; linha < 4; linha++) {
        const hy = h - altura + linha * R * 0.95;
        const balanco = 1 - linha * 0.25;
        for (let hx = linha % 2 ? R / 2 : 0; hx <= w + R / 2; hx += R) {
          const x = hx + ondaX(hx) * balanco;
          const y = hy + ondaY(hx) * balanco;
          const g: Gota = { hx, hy, balanco, x, y, vx: 0, vy: 0, r: R * (0.88 + Math.random() * 0.24), solta: false, livre: 0, imune: 0 };
          gotas.push(g);
          if (linha === 0) topo.push(g);
        }
      }
    };

    const soltar = (g: Gota, segundos: number) => {
      g.solta = true;
      g.livre = Math.max(g.livre, segundos);
    };

    const explodir = (cx: number, cy: number) => {
      for (const g of gotas) {
        const dx = g.x - cx;
        const dy = g.y - cy;
        const d = Math.hypot(dx, dy);
        if (d > RAIO_CLIQUE) continue;
        const nx = d ? dx / d : 0;
        const ny = d ? dy / d : -1;
        // da onda espirra para cima e para os lados (nada de afundar no chão)
        const ey = g.solta ? ny - 0.3 : Math.min(ny, 0) - 0.6;
        const m = Math.hypot(nx, ey) || 1;
        const forca = 5 + 15 * (1 - d / RAIO_CLIQUE);
        g.vx += (nx / m) * forca;
        g.vy += (ey / m) * forca;
        soltar(g, 0.6 + Math.random() * 0.8);
      }
    };

    const passo = () => {
      t += PASSO;
      let vel = 0;
      if (mouse.dentro) {
        mouse.vx = mouse.vx * 0.5 + (mouse.cx - mouse.pcx) * 0.5;
        mouse.vy = mouse.vy * 0.5 + (mouse.cy - mouse.pcy) * 0.5;
        mouse.pcx = mouse.cx;
        mouse.pcy = mouse.cy;
        vel = Math.hypot(mouse.vx, mouse.vy);
      }
      const raioGolpe = vel > 3 ? 50 + Math.min(vel, 40) * 2.2 : 0;
      voando.length = 0;
      let fora = 0; // gotas fora da onda (voando ou voltando)

      for (const g of gotas) {
        if (mouse.dentro) {
          const dx = g.x - mouse.x;
          const dy = g.y - mouse.y;
          const d = Math.hypot(dx, dy) || 1;
          const nx = dx / d;
          const ny = dy / d;
          if (d < raioGolpe && g.imune <= 0) {
            // Mouse rápido arremessa o que acerta: de frente vai longe, de raspão menos. Quem está na frente já
            // leva o golpe pela menor distância em que o cursor vai passar dela.
            const frente = mouse.vx * nx + mouse.vy * ny; // > 0: o cursor vem na direção dela
            const dEf = frente > 0 ? Math.abs(dx * mouse.vy - dy * mouse.vx) / vel : d;
            const f = Math.max(0, 1 - dEf / raioGolpe);
            // Da onda o líquido explode como um chafariz (para cima, abrindo para os lados); no ar a gota vai para
            // onde foi batida
            const forca = g.solta ? f * (Math.max(0, frente) * 0.8 + vel * 0.4) : f * (vel * 0.75 + 4);
            let ex = g.solta ? nx + (mouse.vx / vel) * 0.3 : (Math.random() - 0.5) * 1.2 + (mouse.vx / vel) * 0.1;
            let ey = g.solta ? ny + (mouse.vy / vel) * 0.3 - 0.2 : -1;
            const m = Math.hypot(ex, ey) || 1;
            ex /= m;
            ey /= m;
            const falta = forca - (g.vx * ex + g.vy * ey);
            if (falta > 0) {
              g.vx += ex * falta;
              g.vy += ey * falta;
            }
            if (forca > 5) {
              soltar(g, 0.6 + Math.random() * 0.7 + f * 0.4);
              g.imune = 0.5;
            }
          }
          // O cursor abre caminho e não gruda: empurra para fora e tira a velocidade que vem contra ele
          const toque = RAIO_DEDO + g.r;
          if (d < toque) {
            g.x = mouse.x + nx * toque;
            g.y = mouse.y + ny * toque;
            const contra = g.vx * nx + g.vy * ny;
            if (contra < 0) {
              g.vx -= contra * nx;
              g.vy -= contra * ny;
            }
          }
        }

        if (g.imune > 0) g.imune -= PASSO;
        const alvoX = g.hx + ondaX(g.hx) * g.balanco;
        const alvoY = g.hy + ondaY(g.hx) * g.balanco;
        if (!g.solta) {
          // presa na onda: segue a casa com bastante amortecimento (sem cara de gelatina)
          g.vx = (g.vx + (alvoX - g.x) * 0.09) * 0.76;
          g.vy = (g.vy + (alvoY - g.y) * 0.09) * 0.76;
        } else if (g.livre > 0) {
          // voando: gravidade e um pouco de resistência do ar
          g.livre -= PASSO;
          g.vx *= 0.996;
          g.vy = g.vy * 0.996 + GRAVIDADE;
        } else {
          // nadando de volta: vai rápido para casa e desacelera ao chegar
          const dx = alvoX - g.x;
          const dy = alvoY - g.y;
          const d = Math.hypot(dx, dy);
          if (d < g.r * 1.2) g.solta = false;
          else {
            const v = Math.min(12, d * 0.08 + 1.5) / d;
            g.vx += (dx * v - g.vx) * 0.1;
            g.vy += (dy * v - g.vy) * 0.1 + GRAVIDADE * 0.08;
          }
        }

        const v2 = g.vx * g.vx + g.vy * g.vy;
        if (v2 > VEL_MAX * VEL_MAX) {
          const k = VEL_MAX / Math.sqrt(v2);
          g.vx *= k;
          g.vy *= k;
        }
        g.x += g.vx;
        g.y += g.vy;
        if (g.solta) {
          // quica nas bordas da seção
          if (g.x < 0) {
            g.x = 0;
            g.vx = Math.abs(g.vx) * 0.55;
          } else if (g.x > w) {
            g.x = w;
            g.vx = -Math.abs(g.vx) * 0.55;
          }
          if (g.y < g.r) {
            g.y = g.r;
            g.vy = Math.abs(g.vy) * 0.55;
          } else if (g.y > h - g.r / 2) {
            g.y = h - g.r / 2;
            g.vy = -Math.abs(g.vy) * 0.35;
            g.vx *= 0.9;
          }
          fora++;
          if (g.livre > 0) voando.push(g);
        }
      }

      // Tensão superficial: gotas voando perto umas das outras se atraem até encostar e andam juntas
      // (na volta não, senão uma empurra a outra para longe da casa)
      for (let i = 0; i < voando.length; i++) {
        const a = voando[i];
        for (let j = i + 1; j < voando.length; j++) {
          const b = voando[j];
          const alcance = (a.r + b.r) * 1.3;
          const dx = b.x - a.x;
          if (dx > alcance || dx < -alcance) continue;
          const dy = b.y - a.y;
          const d2 = dx * dx + dy * dy;
          if (d2 > alcance * alcance || d2 < 0.01) continue;
          const d = Math.sqrt(d2);
          const k = ((d - (a.r + b.r) * 0.75) * 0.006) / d;
          const vx = (b.vx - a.vx) * 0.02 + dx * k;
          const vy = (b.vy - a.vy) * 0.02 + dy * k;
          a.vx += vx;
          a.vy += vy;
          b.vx -= vx;
          b.vy -= vy;
        }
      }

      // Com tudo calmo, de vez em quando um pedaço da crista pula e cai de volta
      if (fora) calmaDesde = t;
      else if (t - calmaDesde > 1.5 && t > proximoPulo && topo.length > 5) {
        const i0 = Math.floor(Math.random() * (topo.length - 5));
        const forca = 5 + Math.random() * 4;
        for (let k = 0; k < 5; k++) {
          const g = topo[i0 + k];
          g.vx = (Math.random() - 0.5) * 1.2;
          g.vy = -forca * (1 - Math.abs(k - 2) * 0.18);
          soltar(g, forca * 0.1); // tempo de subir e cair de volta
        }
        proximoPulo = t + 2 + Math.random() * 2.5;
      }
    };

    // Soma o campo de uma bolinha (núcleo de Wyvill: suave e zera no raio de influência)
    const somar = (x: number, y: number, ri: number, peso: number) => {
      const ri2 = ri * ri;
      const c0 = Math.max(0, Math.floor((x - ri) / S));
      const c1 = Math.min(gw - 1, Math.floor((x + ri) / S));
      const l0 = Math.max(0, Math.floor((y - ri) / S));
      const l1 = Math.min(gh - 1, Math.floor((y + ri) / S));
      for (let l = l0; l <= l1; l++) {
        const dy = (l + 0.5) * S - y;
        const dy2 = dy * dy;
        const linha = l * gw;
        for (let c = c0; c <= c1; c++) {
          const dx = (c + 0.5) * S - x;
          const q = dx * dx + dy2;
          if (q < ri2) {
            const u = 1 - q / ri2;
            campo[linha + c] += peso * u * u * u;
          }
        }
      }
    };

    const desenhar = () => {
      // Só recalcula da gota mais alta para baixo (com a onda parada, é só o rodapé)
      let linhaIni = Math.floor((topoBase - raioBase - 14) / S);
      for (const g of gotas) linhaIni = Math.min(linhaIni, Math.floor((g.y - g.r * 3.2) / S));
      linhaIni = Math.max(0, linhaIni - 1);
      const linha0 = Math.min(linhaIni, linhaAnt);
      linhaAnt = linhaIni;
      campo.fill(0, linha0 * gw);

      // Faixa do fundo: nunca seca, só baixa quando o líquido sai
      for (let c = 0; c < gw; c++) colBase[c] = topoBase + ondaY((c + 0.5) * S) * 0.35;
      const rb2 = raioBase * raioBase;
      for (let l = Math.max(0, Math.floor((topoBase - 5 - raioBase) / S)); l < gh; l++) {
        const y = (l + 0.5) * S;
        const linha = l * gw;
        for (let c = 0; c < gw; c++) {
          const acima = colBase[c] - y;
          if (acima <= 0) campo[linha + c] += 1;
          else if (acima < raioBase) {
            const u = 1 - (acima * acima) / rb2;
            campo[linha + c] += u * u * u;
          }
        }
      }

      for (const g of gotas) {
        somar(g.x, g.y, g.r * INFLUENCIA, 1);
        // gota rápida ganha um rastro atrás e fica com formato de gota esticada
        const v = g.solta ? Math.hypot(g.vx, g.vy) : 0;
        if (v > 5) {
          const k = Math.min(1.3, (1.6 * g.r) / v);
          somar(g.x - g.vx * k, g.y - g.vy * k, g.r * 0.75 * INFLUENCIA, 0.6);
        }
      }

      // Campo → pixels: abaixo do limiar é transparente; na borda, o brilho depende da inclinação
      const escala = NIVEIS / F_MAX;
      for (let l = linha0; l < gh; l++) {
        const linha = l * gw;
        const acima = l > 0 ? linha - gw : -1;
        const abaixo = l < gh - 1 ? linha + gw : linha;
        for (let c = 0; c < gw; c++) {
          const f = campo[linha + c];
          if (f < LIMIAR - 0.05) {
            px[linha + c] = 0;
            continue;
          }
          const nivel = f >= F_MAX ? NIVEIS - 1 : (f * escala) | 0;
          const inc = (campo[abaixo + c] - (acima < 0 ? 0 : campo[acima + c])) * escalaInc;
          px[linha + c] = tabela[nivel * NG + (inc <= 0 ? 0 : inc >= NG - 1 ? NG - 1 : inc | 0)];
        }
      }
      ctx.putImageData(img, 0, 0, 0, linha0, gw, gh - linha0);
    };

    const quadro = (agora: number) => {
      raf = 0;
      if (!visivel) return;
      acumulado += ultimo ? Math.min(0.1, (agora - ultimo) / 1000) : PASSO;
      ultimo = agora;
      if (mouse.dentro) {
        const r = canvas.getBoundingClientRect();
        mouse.x = mouse.cx - r.left;
        mouse.y = mouse.cy - r.top;
      }
      // Passos fixos: a mesma física a 60 ou 144 Hz (a meia folga evita alternar 0 e 2 passos a 60 Hz)
      let passos = 0;
      while (acumulado >= PASSO / 2 && passos < 3) {
        passo();
        acumulado -= PASSO;
        passos++;
      }
      if (passos === 3) acumulado = 0;
      if (passos) desenhar();
      raf = requestAnimationFrame(quadro);
    };

    montar();
    desenhar();
    const ro = new ResizeObserver(() => {
      montar();
      desenhar();
    });
    ro.observe(canvas);
    if (reduz) return () => ro.disconnect();

    // Só anima enquanto a seção está na tela.
    const io = new IntersectionObserver(([e]) => {
      visivel = e.isIntersecting;
      if (visivel && !raf) {
        ultimo = 0;
        raf = requestAnimationFrame(quadro);
      }
    });
    io.observe(canvas);

    const mover = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!mouse.dentro) {
        mouse.pcx = e.clientX;
        mouse.pcy = e.clientY;
        mouse.vx = 0;
        mouse.vy = 0;
        mouse.dentro = true;
      }
      mouse.cx = e.clientX;
      mouse.cy = e.clientY;
    };
    const sair = () => {
      mouse.dentro = false;
    };
    const clicar = (e: MouseEvent) => {
      // clique em botão ou link é só clique; no resto da seção o líquido explode (no celular, com um toque)
      if ((e.target as Element).closest("a, button, input, label, select, textarea")) return;
      const r = canvas.getBoundingClientRect();
      explodir(e.clientX - r.left, e.clientY - r.top);
    };
    area.addEventListener("pointermove", mover);
    area.addEventListener("pointerleave", sair);
    area.addEventListener("click", clicar);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      area.removeEventListener("pointermove", mover);
      area.removeEventListener("pointerleave", sair);
      area.removeEventListener("click", clicar);
    };
  }, [cor]);

  return <canvas ref={ref} aria-hidden className={className} />;
}
