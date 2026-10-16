import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart, type ItemCarrinho } from "./CartContext";

const CHAVE_LOCALSTORAGE = "kitsuy_carrinho";

function TestComponent() {
  const { itens, adicionar, remover, limpar, contador } = useCart();
  return (
    <div>
      <div data-testid="contador">{contador}</div>
      <div data-testid="itens">
        {itens.map((i) => (
          <div key={i.id} data-testid={`item-${i.id}`}>
            {i.nome}
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          adicionar({
            id: "prod1",
            nome: "Produto 1",
            preco: "R$ 100,00",
            imagem: "img1.jpg",
            collectionName: "products",
          })
        }
        data-testid="btn-add"
      >
        Adicionar
      </button>
      <button
        onClick={() => remover("prod1")}
        data-testid="btn-remove"
      >
        Remover
      </button>
      <button
        onClick={() => limpar()}
        data-testid="btn-limpar"
      >
        Limpar
      </button>
    </div>
  );
}

describe("CartContext", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("adicionar", () => {
    it("adiciona um item ao carrinho", async () => {
      const user = userEvent.setup();
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const btn = screen.getByTestId("btn-add");
      await user.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("1");
      });
      expect(screen.getByTestId("item-prod1")).toBeInTheDocument();
    });

    it("não adiciona item duplicado", async () => {
      const user = userEvent.setup();
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const btn = screen.getByTestId("btn-add");
      await user.click(btn);
      await user.click(btn);

      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("1");
      });
    });

    it("adiciona múltiplos itens diferentes", async () => {
      const user = userEvent.setup();
      const MultiAddComponent = () => {
        const { adicionar, contador } = useCart();
        return (
          <div>
            <div data-testid="contador">{contador}</div>
            <button
              onClick={() => {
                adicionar({
                  id: "prod1",
                  nome: "Produto 1",
                  preco: "R$ 100,00",
                  imagem: "img1.jpg",
                  collectionName: "products",
                });
                adicionar({
                  id: "prod2",
                  nome: "Produto 2",
                  preco: "R$ 200,00",
                  imagem: "img2.jpg",
                  collectionName: "products",
                });
              }}
              data-testid="btn-add-multi"
            >
              Adicionar 2
            </button>
          </div>
        );
      };

      render(
        <CartProvider>
          <MultiAddComponent />
        </CartProvider>
      );

      await user.click(screen.getByTestId("btn-add-multi"));
      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("2");
      });
    });
  });

  describe("remover", () => {
    it("remove um item do carrinho", async () => {
      const user = userEvent.setup();
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const btnAdd = screen.getByTestId("btn-add");
      await user.click(btnAdd);
      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("1");
      });

      const btnRemove = screen.getByTestId("btn-remove");
      await user.click(btnRemove);
      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("0");
      });
    });

    it("não falha ao tentar remover item inexistente", async () => {
      const user = userEvent.setup();
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      const btnRemove = screen.getByTestId("btn-remove");
      await user.click(btnRemove);
      expect(screen.getByTestId("contador")).toHaveTextContent("0");
    });
  });

  describe("limpar", () => {
    it("remove todos os itens do carrinho", async () => {
      const user = userEvent.setup();
      const MultiItemComponent = () => {
        const { adicionar, contador, limpar } = useCart();
        return (
          <div>
            <div data-testid="contador">{contador}</div>
            <button
              onClick={() => {
                adicionar({
                  id: "prod1",
                  nome: "Produto 1",
                  preco: "R$ 100,00",
                  imagem: "img1.jpg",
                  collectionName: "products",
                });
                adicionar({
                  id: "prod2",
                  nome: "Produto 2",
                  preco: "R$ 200,00",
                  imagem: "img2.jpg",
                  collectionName: "products",
                });
              }}
              data-testid="btn-add-multi"
            >
              Adicionar
            </button>
            <button
              onClick={() => limpar()}
              data-testid="btn-limpar"
            >
              Limpar
            </button>
          </div>
        );
      };

      render(
        <CartProvider>
          <MultiItemComponent />
        </CartProvider>
      );

      await user.click(screen.getByTestId("btn-add-multi"));
      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("2");
      });

      await user.click(screen.getByTestId("btn-limpar"));
      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("0");
      });
    });
  });

  describe("persistência com localStorage", () => {
    it("salva o carrinho no localStorage após adicionar", async () => {
      const user = userEvent.setup();
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      await user.click(screen.getByTestId("btn-add"));

      await waitFor(() => {
        const saved = localStorage.getItem(CHAVE_LOCALSTORAGE);
        expect(saved).toBeTruthy();
        const parsed = JSON.parse(saved!);
        expect(parsed).toHaveLength(1);
        expect(parsed[0].id).toBe("prod1");
      });
    });

    it("carrega o carrinho do localStorage ao montar", () => {
      const item: ItemCarrinho = {
        id: "prod1",
        nome: "Produto Salvo",
        preco: "R$ 100,00",
        imagem: "img.jpg",
        collectionName: "products",
      };

      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify([item]));

      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("contador")).toHaveTextContent("1");
      expect(screen.getByTestId("item-prod1")).toHaveTextContent("Produto Salvo");
    });

    it("atualiza localStorage ao remover", async () => {
      const user = userEvent.setup();
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      await user.click(screen.getByTestId("btn-add"));
      await waitFor(() => {
        expect(localStorage.getItem(CHAVE_LOCALSTORAGE)).toBeTruthy();
      });

      await user.click(screen.getByTestId("btn-remove"));

      await waitFor(() => {
        const saved = localStorage.getItem(CHAVE_LOCALSTORAGE);
        expect(saved).toBe("[]");
      });
    });

    it("atualiza localStorage ao limpar", async () => {
      const user = userEvent.setup();
      const MultiItemComponent = () => {
        const { adicionar, limpar } = useCart();
        return (
          <div>
            <button
              onClick={() => {
                adicionar({
                  id: "prod1",
                  nome: "Produto 1",
                  preco: "R$ 100,00",
                  imagem: "img1.jpg",
                  collectionName: "products",
                });
                adicionar({
                  id: "prod2",
                  nome: "Produto 2",
                  preco: "R$ 200,00",
                  imagem: "img2.jpg",
                  collectionName: "products",
                });
              }}
              data-testid="btn-add-multi"
            >
              Adicionar
            </button>
            <button
              onClick={() => limpar()}
              data-testid="btn-limpar"
            >
              Limpar
            </button>
          </div>
        );
      };

      render(
        <CartProvider>
          <MultiItemComponent />
        </CartProvider>
      );

      await user.click(screen.getByTestId("btn-add-multi"));
      await waitFor(() => {
        expect(localStorage.getItem(CHAVE_LOCALSTORAGE)).toBeTruthy();
      });

      await user.click(screen.getByTestId("btn-limpar"));
      await waitFor(() => {
        expect(localStorage.getItem(CHAVE_LOCALSTORAGE)).toBe("[]");
      });
    });

    it("recupera do carrinho corrompido retornando array vazio", () => {
      localStorage.setItem(CHAVE_LOCALSTORAGE, "não é json válido");

      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("contador")).toHaveTextContent("0");
    });

    it("recupera de localStorage inválido retornando array vazio", () => {
      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify({ notAnArray: true }));

      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("contador")).toHaveTextContent("0");
    });
  });

  describe("contador", () => {
    it("retorna 0 quando carrinho está vazio", () => {
      render(
        <CartProvider>
          <TestComponent />
        </CartProvider>
      );

      expect(screen.getByTestId("contador")).toHaveTextContent("0");
    });

    it("retorna a quantidade correta de itens", async () => {
      const user = userEvent.setup();
      const MultiItemComponent = () => {
        const { adicionar, contador } = useCart();
        return (
          <div>
            <div data-testid="contador">{contador}</div>
            <button
              onClick={() => {
                for (let i = 1; i <= 5; i++) {
                  adicionar({
                    id: `prod${i}`,
                    nome: `Produto ${i}`,
                    preco: `R$ ${i}00,00`,
                    imagem: `img${i}.jpg`,
                    collectionName: "products",
                  });
                }
              }}
              data-testid="btn-add-many"
            >
              Adicionar 5
            </button>
          </div>
        );
      };

      render(
        <CartProvider>
          <MultiItemComponent />
        </CartProvider>
      );

      await user.click(screen.getByTestId("btn-add-many"));
      await waitFor(() => {
        expect(screen.getByTestId("contador")).toHaveTextContent("5");
      });
    });
  });

  describe("useCart hook", () => {
    it("throws error when used outside CartProvider", () => {
      const WrongComponent = () => {
        try {
          useCart();
          return <div>Should not render</div>;
        } catch (e) {
          return <div data-testid="error">{String(e)}</div>;
        }
      };

      render(<WrongComponent />);
      expect(screen.getByTestId("error")).toBeInTheDocument();
    });
  });
});
