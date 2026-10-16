import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResumoPedido } from "./ResumoPedido";
import type { ProdutoCheckout, OpcaoFrete } from "@/types/checkout";

describe("ResumoPedido", () => {
  describe("listar produtos", () => {
    it("exibe um produto com nome, imagem e quantidade", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Colecionável Teste",
          preco: "R$ 150,00",
          imagem: "test.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      expect(screen.getByText("Colecionável Teste")).toBeInTheDocument();
      expect(screen.getByAltText("Colecionável Teste")).toHaveAttribute("src", "test.jpg");
      expect(screen.getByText("Quantidade: 1")).toBeInTheDocument();
    });

    it("exibe múltiplos produtos", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Produto 1",
          preco: "R$ 100,00",
          imagem: "img1.jpg",
        },
        {
          id: "prod2",
          nome: "Produto 2",
          preco: "R$ 200,00",
          imagem: "img2.jpg",
        },
        {
          id: "prod3",
          nome: "Produto 3",
          preco: "R$ 300,00",
          imagem: "img3.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      expect(screen.getByText("Produto 1")).toBeInTheDocument();
      expect(screen.getByText("Produto 2")).toBeInTheDocument();
      expect(screen.getByText("Produto 3")).toBeInTheDocument();
      expect(screen.getByAltText("Produto 1")).toHaveAttribute("src", "img1.jpg");
      expect(screen.getByAltText("Produto 2")).toHaveAttribute("src", "img2.jpg");
      expect(screen.getByAltText("Produto 3")).toHaveAttribute("src", "img3.jpg");
    });

    it("exibe label 'Produto' quando há um único produto", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      expect(screen.getByText("Produto")).toBeInTheDocument();
    });

    it("exibe label 'Produtos' quando há múltiplos produtos", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item 1",
          preco: "R$ 100,00",
          imagem: "img1.jpg",
        },
        {
          id: "prod2",
          nome: "Item 2",
          preco: "R$ 200,00",
          imagem: "img2.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      expect(screen.getByText("Produtos")).toBeInTheDocument();
    });
  });

  describe("cálculo de preço dos produtos", () => {
    it("exibe o valor total de um produto", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 250,50",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      const prices = screen.getAllByText("R$ 250,50");
      expect(prices.length).toBeGreaterThan(0);
    });

    it("soma corretamente múltiplos produtos", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item 1",
          preco: "R$ 100,00",
          imagem: "img1.jpg",
        },
        {
          id: "prod2",
          nome: "Item 2",
          preco: "R$ 200,00",
          imagem: "img2.jpg",
        },
        {
          id: "prod3",
          nome: "Item 3",
          preco: "R$ 300,00",
          imagem: "img3.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      // Total de produtos: 600,00
      const totalElements = screen.getAllByText(/R\$ 600,00/);
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("calcula corretamente com decimais", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item 1",
          preco: "R$ 99,99",
          imagem: "img1.jpg",
        },
        {
          id: "prod2",
          nome: "Item 2",
          preco: "R$ 150,01",
          imagem: "img2.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      const totalElements = screen.getAllByText(/R\$ 250,00/);
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("formata valores grandes corretamente", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item Caro",
          preco: "R$ 1.234,56",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      const prices = screen.getAllByText("R$ 1.234,56");
      expect(prices.length).toBeGreaterThan(0);
    });
  });

  describe("frete", () => {
    it("exibe 'A calcular' quando não há frete selecionado", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      expect(screen.getByText("A calcular")).toBeInTheDocument();
    });

    it("exibe frete e transportadora quando selecionado", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      const frete: OpcaoFrete = {
        id: "frete1",
        transportadora: "Sedex",
        prazoEmDias: 3,
        valorEmCentavos: 3500,
        valorFormatado: "R$ 35,00",
        valorOriginalEmCentavos: 4000,
        valorOriginalFormatado: "R$ 40,00",
      };

      render(<ResumoPedido produtos={produtos} frete={frete} />);

      expect(screen.getByText(/Frete \(Sedex\)/)).toBeInTheDocument();
      expect(screen.getByText("R$ 35,00")).toBeInTheDocument();
    });

    it("exibe prazo de entrega quando frete é selecionado", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      const frete: OpcaoFrete = {
        id: "frete1",
        transportadora: "PAC",
        prazoEmDias: 5,
        valorEmCentavos: 2500,
        valorFormatado: "R$ 25,00",
        valorOriginalEmCentavos: 3000,
        valorOriginalFormatado: "R$ 30,00",
      };

      render(<ResumoPedido produtos={produtos} frete={frete} />);

      expect(screen.getByText("Entrega em até 5 dias úteis")).toBeInTheDocument();
    });

    it("usa plural 'dias' quando prazo > 1", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      const frete: OpcaoFrete = {
        id: "frete1",
        transportadora: "Sedex",
        prazoEmDias: 3,
        valorEmCentavos: 3500,
        valorFormatado: "R$ 35,00",
        valorOriginalEmCentavos: 4000,
        valorOriginalFormatado: "R$ 40,00",
      };

      render(<ResumoPedido produtos={produtos} frete={frete} />);

      expect(screen.getByText("Entrega em até 3 dias úteis")).toBeInTheDocument();
    });

    it("usa singular 'dia' quando prazo = 1", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      const frete: OpcaoFrete = {
        id: "frete1",
        transportadora: "Sedex",
        prazoEmDias: 1,
        valorEmCentavos: 5000,
        valorFormatado: "R$ 50,00",
        valorOriginalEmCentavos: 5000,
        valorOriginalFormatado: "R$ 50,00",
      };

      render(<ResumoPedido produtos={produtos} frete={frete} />);

      expect(screen.getByText(/Entrega em até 1 dia úteis/)).toBeInTheDocument();
    });

    it("soma corretamente produtos + frete no total", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item 1",
          preco: "R$ 100,00",
          imagem: "img1.jpg",
        },
        {
          id: "prod2",
          nome: "Item 2",
          preco: "R$ 200,00",
          imagem: "img2.jpg",
        },
      ];

      const frete: OpcaoFrete = {
        id: "frete1",
        transportadora: "Sedex",
        prazoEmDias: 3,
        valorEmCentavos: 5000, // R$ 50,00
        valorFormatado: "R$ 50,00",
        valorOriginalEmCentavos: 5000,
        valorOriginalFormatado: "R$ 50,00",
      };

      render(<ResumoPedido produtos={produtos} frete={frete} />);

      // Total: 100 + 200 + 50 = 350
      const totalElements = screen.getAllByText(/R\$ 350,00/);
      expect(totalElements.length).toBeGreaterThan(0);
    });
  });

  describe("total", () => {
    it("exibe total sem frete quando frete é null", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 150,00",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      const totalElements = screen.getAllByText(/R\$ 150,00/);
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("exibe total com frete quando frete é selecionado", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      const frete: OpcaoFrete = {
        id: "frete1",
        transportadora: "Sedex",
        prazoEmDias: 3,
        valorEmCentavos: 2500, // R$ 25,00
        valorFormatado: "R$ 25,00",
        valorOriginalEmCentavos: 2500,
        valorOriginalFormatado: "R$ 25,00",
      };

      render(<ResumoPedido produtos={produtos} frete={frete} />);

      // Total: 100 + 25 = 125
      const totalElements = screen.getAllByText(/R\$ 125,00/);
      expect(totalElements.length).toBeGreaterThan(0);
    });

    it("exibe 'Resumo do Pedido' como título", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      expect(screen.getByText("Resumo do Pedido")).toBeInTheDocument();
    });
  });

  describe("produtos com preços em formato brasileiro", () => {
    it("parse corretamente preço com R$ e vírgula", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 1.500,75",
          imagem: "img.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      const prices = screen.getAllByText("R$ 1.500,75");
      expect(prices.length).toBeGreaterThan(0);
    });

    it("calcula total corretamente com múltiplos formatos", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item 1",
          preco: "R$ 1.100,00",
          imagem: "img1.jpg",
        },
        {
          id: "prod2",
          nome: "Item 2",
          preco: "R$ 2.450,50",
          imagem: "img2.jpg",
        },
      ];

      render(<ResumoPedido produtos={produtos} frete={null} />);

      // Total: 1.100 + 2.450,50 = 3.550,50
      const totalElements = screen.getAllByText(/R\$ 3.550,50/);
      expect(totalElements.length).toBeGreaterThan(0);
    });
  });

  describe("card layout", () => {
    it("usa classe 'sticky' para o card", () => {
      const produtos: ProdutoCheckout[] = [
        {
          id: "prod1",
          nome: "Item",
          preco: "R$ 100,00",
          imagem: "img.jpg",
        },
      ];

      const { container } = render(<ResumoPedido produtos={produtos} frete={null} />);

      const card = container.querySelector("[class*='sticky']");
      expect(card).toBeInTheDocument();
    });
  });
});
