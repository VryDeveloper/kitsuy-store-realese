import { describe, it, expect, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { CartProvider } from "@/contexts/CartContext";
import { ProductCard } from "./ProductCard";

// jsdom não tem PointerEvent: sem isso o pointerType chega vazio.
class PointerEventFake extends MouseEvent {
  pointerType: string;
  constructor(tipo: string, init: PointerEventInit = {}) {
    super(tipo, init);
    this.pointerType = init.pointerType ?? "";
  }
}
window.PointerEvent ??= PointerEventFake as typeof PointerEvent;

const base = { id: "p1", source: "products", title: "Miku", price: "R$ 100,00", discount: "", image: "capa.webp", inStock: "disponível", slug: "miku" };
const renderCard = (props: Partial<typeof base> & { images?: { url: string }[] } = {}) =>
  render(<MemoryRouter><CartProvider><ProductCard {...base} {...props} /></CartProvider></MemoryRouter>);

describe("ProductCard", () => {
  it("em estoque: leva para a vitrine em vez de pôr no carrinho", () => {
    renderCard();
    expect(screen.getByRole("link", { name: "Miku" })).toHaveAttribute("href", "/produto/miku");
    expect(screen.getByRole("link", { name: /ver figure/i })).toHaveAttribute("href", "/produto/miku");
  });

  it("fora de estoque: continua sem página", () => {
    renderCard({ inStock: "indisponível" });
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("hover com mouse alterna as fotos e volta para a capa ao sair", () => {
    vi.useFakeTimers();
    const { container } = renderCard({ images: [{ url: "lado.webp" }] });
    const card = container.querySelector(".group")!;
    expect(container.querySelectorAll("img")).toHaveLength(1); // extras só no hover
    fireEvent.pointerEnter(card, { pointerType: "mouse" });
    const extra = () => container.querySelector('img[src="lado.webp"]')!;
    expect(extra()).toHaveClass("opacity-0");
    act(() => vi.advanceTimersByTime(1500));
    expect(extra()).toHaveClass("opacity-100");
    fireEvent.pointerLeave(card);
    expect(extra()).toHaveClass("opacity-0");
    vi.useRealTimers();
  });

  it("toque não dispara a troca", () => {
    const { container } = renderCard({ images: [{ url: "lado.webp" }] });
    fireEvent.pointerEnter(container.querySelector(".group")!, { pointerType: "touch" });
    expect(container.querySelectorAll("img")).toHaveLength(1);
  });
});
