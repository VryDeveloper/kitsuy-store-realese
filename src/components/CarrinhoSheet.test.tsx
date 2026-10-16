import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CartProvider, useCart, type ItemCarrinho } from "@/contexts/CartContext";
import { CarrinhoSheet } from "./CarrinhoSheet";

vi.mock("react-router-dom", () => ({
  useNavigate: () => vi.fn(),
}));

function TestCarrinhoWithControls() {
  const { adicionar, remover } = useCart();

  return (
    <div>
      <CarrinhoSheet />
      <button
        onClick={() =>
          adicionar({
            id: "prod1",
            nome: "Produto Teste",
            preco: "R$ 100,00",
            imagem: "img.jpg",
            collectionName: "products",
          })
        }
        data-testid="add-item-1"
      >
        Add Item 1
      </button>
      <button
        onClick={() =>
          adicionar({
            id: "prod2",
            nome: "Produto 2",
            preco: "R$ 200,00",
            imagem: "img2.jpg",
            collectionName: "products",
          })
        }
        data-testid="add-item-2"
      >
        Add Item 2
      </button>
      <button
        onClick={() =>
          adicionar({
            id: "prod3",
            nome: "Produto 3",
            preco: "R$ 300,00",
            imagem: "img3.jpg",
            collectionName: "products",
          })
        }
        data-testid="add-item-3"
      >
        Add Item 3
      </button>
      <button
        onClick={() => remover("prod1")}
        data-testid="remove-item-1"
      >
        Remove Item 1
      </button>
    </div>
  );
}

function TestCarrinhoWrapper() {
  return (
    <CartProvider>
      <TestCarrinhoWithControls />
    </CartProvider>
  );
}

describe("CarrinhoSheet", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe("carrinho vazio", () => {
    it("exibe mensagem de carrinho vazio", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      expect(screen.getByText("Seu carrinho está vazio")).toBeInTheDocument();
    });

    it("exibe ícone de pacote quando vazio", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      const emptyMessage = screen.getByText("Seu carrinho está vazio");
      expect(emptyMessage).toBeInTheDocument();
    });

    it("não exibe badge de contador quando carrinho está vazio", () => {
      render(<TestCarrinhoWrapper />);
      const badges = screen.queryAllByText(/^\d+$/);
      expect(badges.length).toBe(0);
    });
  });

  describe("listar itens", () => {
    it("exibe itens adicionados ao carrinho", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      expect(screen.getByText("Produto Teste")).toBeInTheDocument();
      const priceElements = screen.getAllByText("R$ 100,00");
      expect(priceElements.length).toBeGreaterThan(0);
    });

    it("exibe múltiplos itens com imagens e preços", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));
      await user.click(screen.getByTestId("add-item-2"));

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      expect(screen.getByText("Produto Teste")).toBeInTheDocument();
      expect(screen.getByText("Produto 2")).toBeInTheDocument();
      expect(screen.getByAltText("Produto Teste")).toHaveAttribute("src", "img.jpg");
      expect(screen.getByAltText("Produto 2")).toHaveAttribute("src", "img2.jpg");
    });
  });

  describe("remover item", () => {
    it("remove item ao clicar no botão X", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      expect(screen.getByText("Produto Teste")).toBeInTheDocument();
      expect(screen.getByText("1")).toBeInTheDocument();

      const itemElement = screen.getByText("Produto Teste").closest("div[class*='border'][class*='rounded-lg']");
      expect(itemElement).toBeInTheDocument();

      const removeButton = within(itemElement!).getByRole("button");
      expect(removeButton).toBeInTheDocument();

      await user.click(removeButton);

      await waitFor(() => {
        expect(screen.queryByText("Produto Teste")).not.toBeInTheDocument();
      });

      expect(screen.getByText("Seu carrinho está vazio")).toBeInTheDocument();
      expect(screen.queryByText("1")).not.toBeInTheDocument();
    });
  });

  describe("total em R$", () => {
    it("calcula e exibe o total correto para um item", async () => {
      const user = userEvent.setup();

      const item: ItemCarrinho = {
        id: "prod-custom",
        nome: "Produto Custom",
        preco: "R$ 250,50",
        imagem: "img.jpg",
        collectionName: "products",
      };
      localStorage.setItem("kitsuy_carrinho", JSON.stringify([item]));

      render(<TestCarrinhoWrapper />);

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText("Produto Custom")).toBeInTheDocument();
      });

      const totalElement = screen.getByText("Total").closest("div");
      expect(within(totalElement!).getByText("R$ 250,50")).toBeInTheDocument();
    });

    it("soma corretamente múltiplos itens", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));
      await user.click(screen.getByTestId("add-item-2"));
      await user.click(screen.getByTestId("add-item-3"));

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText("Produto Teste")).toBeInTheDocument();
      });

      const totalElement = screen.getByText("Total").closest("div");
      expect(within(totalElement!).getByText("R$ 600,00")).toBeInTheDocument();
    });

    it("exibe total em reais formatado corretamente", async () => {
      const user = userEvent.setup();

      const items: ItemCarrinho[] = [
        {
          id: "prod-big",
          nome: "Item Big",
          preco: "R$ 1.234,56",
          imagem: "img.jpg",
          collectionName: "products",
        },
      ];
      localStorage.setItem("kitsuy_carrinho", JSON.stringify(items));

      render(<TestCarrinhoWrapper />);

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText("Item Big")).toBeInTheDocument();
      });

      const totalElement = screen.getByText("Total").closest("div");
      expect(within(totalElement!).getByText("R$ 1.234,56")).toBeInTheDocument();
    });
  });

  describe("badge de contador", () => {
    it("exibe número de itens no badge", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));
      await user.click(screen.getByTestId("add-item-2"));

      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });

    it("atualiza o badge quando carrinho muda", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));
      await waitFor(() => {
        expect(screen.getByText("1")).toBeInTheDocument();
      });

      await user.click(screen.getByTestId("add-item-2"));
      await waitFor(() => {
        expect(screen.getByText("2")).toBeInTheDocument();
      });
    });
  });

  describe("UI elementos", () => {
    it("exibe título 'Seu carrinho'", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      expect(screen.getByText("Seu carrinho")).toBeInTheDocument();
    });

    it("exibe botão 'Finalizar compra'", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /finalizar compra/i })).toBeInTheDocument();
      });
    });

    it("exibe mensagem sobre frete", async () => {
      const user = userEvent.setup();
      render(<TestCarrinhoWrapper />);

      await user.click(screen.getByTestId("add-item-1"));

      const trigger = screen.getAllByRole("button")[0];
      await user.click(trigger);

      await waitFor(() => {
        expect(screen.getByText(/frete calculado na próxima etapa/i)).toBeInTheDocument();
      });
    });
  });
});
