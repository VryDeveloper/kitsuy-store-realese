import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const posthog = vi.hoisted(() => ({
  __loaded: false,
  init: vi.fn(),
  opt_in_capturing: vi.fn(),
  opt_out_capturing: vi.fn(),
  capture: vi.fn(),
}));
vi.mock("posthog-js", () => ({ default: posthog }));
vi.stubEnv("VITE_POSTHOG_KEY", "phc_teste");
// jsdom não tem IntersectionObserver
vi.stubGlobal("IntersectionObserver", class { observe() {} });

import { BannerCookies } from "./BannerCookies";
import { lerConsentimento, rastrear } from "@/lib/analytics";

const abrir = () =>
  render(
    <MemoryRouter>
      <BannerCookies />
    </MemoryRouter>,
  );

describe("BannerCookies", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("recusar não liga as métricas e esconde o aviso", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    expect(lerConsentimento()).toBe("recusado");
    expect(posthog.init).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("aceitar liga as métricas", () => {
    abrir();
    fireEvent.click(screen.getByRole("button", { name: "Aceitar" }));
    expect(lerConsentimento()).toBe("aceito");
    expect(posthog.init).toHaveBeenCalledOnce();
  });

  it("não mostra o aviso de novo depois da escolha", () => {
    localStorage.setItem("kitsuy_consentimento_cookies", "recusado");
    abrir();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("rastrear não envia nada sem o PostHog carregado", () => {
    rastrear("adicionou_ao_carrinho");
    expect(posthog.capture).not.toHaveBeenCalled();
  });
});
