import posthog from "posthog-js";

/**
 * Métricas do site (PostHog). Só liga DEPOIS que o visitante aceita os
 * cookies — antes disso nada é enviado nem gravado (LGPD).
 *
 * O PostHog sozinho já captura: pageviews, clique em cada botão/link,
 * país/estado (GeoIP), dispositivo, navegador e sistema. Aqui somamos o que
 * ele não pega: clique em imagem, seção vista e eventos do carrinho.
 */

const CHAVE_CONSENTIMENTO = "kitsuy_consentimento_cookies";
export type Consentimento = "aceito" | "recusado";

export function lerConsentimento(): Consentimento | null {
  try {
    const v = localStorage.getItem(CHAVE_CONSENTIMENTO);
    return v === "aceito" || v === "recusado" ? v : null;
  } catch {
    return null;
  }
}

export function salvarConsentimento(valor: Consentimento | null) {
  try {
    if (valor) localStorage.setItem(CHAVE_CONSENTIMENTO, valor);
    else localStorage.removeItem(CHAVE_CONSENTIMENTO);
  } catch {
    // localStorage indisponível: a escolha só vale nesta aba
  }
  if (valor === "aceito") iniciarAnalytics();
  if (valor !== "aceito" && posthog.__loaded) posthog.opt_out_capturing();
}

let iniciado = false;

export function iniciarAnalytics() {
  // Chave pública do projeto (vai no JS do site de qualquer jeito); env sobrescreve.
  const chave =
    import.meta.env.VITE_POSTHOG_KEY || "phc_pnuA4TS5QkWgc5NVriXSnn8sdFSUMHaJi9CmpTXAApsh";
  if (!chave || lerConsentimento() !== "aceito") return;
  if (iniciado) return posthog.opt_in_capturing(); // recusou e depois aceitou
  iniciado = true;

  posthog.init(chave, {
    api_host: import.meta.env.VITE_POSTHOG_HOST || "https://us.i.posthog.com",
    person_profiles: "always", // todo visitante aparece na lista de pessoas
    capture_pageview: "history_change", // SPA: conta cada troca de página
    autocapture: true,
    session_recording: { maskAllInputs: true }, // nunca grava CPF/endereço digitado
    // Painel admin e testes no computador (localhost) não entram nas métricas.
    before_send: (evento) =>
      location.pathname.startsWith("/admin") || location.hostname === "localhost"
        ? null
        : evento,
  });
  posthog.opt_in_capturing();

  // Clique em imagem: o autocapture só pega botões/links, não <img> solta.
  document.addEventListener(
    "click",
    (e) => {
      const img = (e.target as Element).closest?.("img");
      if (img)
        posthog.capture("imagem_clicada", {
          imagem: img.getAttribute("alt") || img.currentSrc.split("/").pop(),
          src: img.currentSrc,
        });
    },
    true,
  );

  observarSecoes();
}

/** Nome legível da seção: id, aria-label ou o primeiro título dela. */
function nomeSecao(el: Element): string {
  return (
    el.id ||
    el.getAttribute("aria-label") ||
    el.querySelector("h1,h2,h3")?.textContent?.trim().slice(0, 60) ||
    "sem-nome"
  );
}

/** Conta "secao_vista" uma vez por seção a cada página aberta. */
function observarSecoes() {
  let vistas = new Set<string>();
  let pagina = location.pathname;

  const io = new IntersectionObserver(
    (entradas) => {
      if (location.pathname !== pagina) {
        pagina = location.pathname;
        vistas = new Set();
      }
      for (const { isIntersecting, target } of entradas) {
        const nome = nomeSecao(target);
        if (!isIntersecting || vistas.has(nome)) continue;
        vistas.add(nome);
        posthog.capture("secao_vista", { secao: nome, pagina });
      }
    },
    { threshold: 0.4 },
  );

  let agendado = false;
  const registrar = () => {
    agendado = false;
    document.querySelectorAll("section, footer").forEach((s) => io.observe(s));
  };
  registrar();
  // Páginas são carregadas sob demanda (React lazy): observa as seções novas,
  // no máximo uma varredura por quadro (carrosséis mexem no DOM o tempo todo).
  new MutationObserver(() => {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(registrar);
  }).observe(document.body, {
    childList: true,
    subtree: true,
  });
}

/** Evento próprio; não faz nada se o visitante não aceitou os cookies. */
export function rastrear(evento: string, props?: Record<string, unknown>) {
  if (posthog.__loaded) posthog.capture(evento, props);
}

/** Liga a visita anônima à conta logada (nome/e-mail na lista de pessoas). */
export function identificar(uid: string, email?: string | null, nome?: string | null) {
  if (posthog.__loaded) posthog.identify(uid, { email, name: nome });
}

export function esquecerUsuario() {
  if (posthog.__loaded) posthog.reset();
}
