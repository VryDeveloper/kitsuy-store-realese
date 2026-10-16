import { describe, it, expect, beforeEach, vi } from "vitest";
import { calcularFrete, criarPreferencia, verificarPagamento, buscarEnderecoPorCEP } from "./api";

describe("api", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("calcularFrete", () => {
    it("faz requisição GET com CEP e produtoIds codificados", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ fretes: [] }),
      });
      global.fetch = mockFetch;

      await calcularFrete("12345-678", ["prod1", "prod2"]);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/api/calcular-frete");
      expect(url).toContain("cep=");
      expect(url).toContain("produtoIds=");
    });

    it("codifica corretamente o CEP com caracteres especiais", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ fretes: [] }),
      });
      global.fetch = mockFetch;

      await calcularFrete("01310-100", ["prod1"]);

      const urlChamada = mockFetch.mock.calls[0][0];
      expect(urlChamada).toContain("cep=01310");
    });

    it("retorna o JSON da resposta quando sucesso", async () => {
      const respostaEsperada = { fretes: [{ id: "1", valor: 100 }] };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => respostaEsperada,
      }));

      const resultado = await calcularFrete("12345-678", ["prod1"]);

      expect(resultado).toEqual(respostaEsperada);
    });

    it("lança erro quando resposta não é ok", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "CEP inválido" }),
      }));

      await expect(calcularFrete("00000-000", ["prod1"])).rejects.toThrow("CEP inválido");
    });

    it("usa mensagem padrão quando erro não retorna JSON", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("Não é JSON");
        },
      }));

      await expect(calcularFrete("12345-678", ["prod1"])).rejects.toThrow(
        "Erro ao calcular frete"
      );
    });

    it("codifica múltiplos produtoIds com vírgula", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ fretes: [] }),
      });
      global.fetch = mockFetch;

      await calcularFrete("12345-678", ["prod1", "prod2", "prod3"]);

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("produtoIds=");
      expect(url).toContain("prod1");
      expect(url).toContain("prod2");
      expect(url).toContain("prod3");
    });
  });

  describe("criarPreferencia", () => {
    it("faz requisição POST com dados do payload", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ preferenceId: "pref-123" }),
      });
      global.fetch = mockFetch;

      const dados = {
        produtoIds: ["prod1"],
        freteEscolhido: {
          id: "frete-1",
          transportadora: "PAC",
          prazoEmDias: 5,
          valorEmCentavos: 5000,
        },
        cliente: {
          nome: "João Silva",
          email: "joao@example.com",
          telefone: "11999999999",
          cpf: "12345678900",
        },
        endereco: {
          cep: "12345-678",
          logradouro: "Rua A",
          numero: "123",
          complemento: "Apt 1",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
        },
      };

      await criarPreferencia(dados);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/api/criar-preferencia"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dados),
        })
      );
    });

    it("retorna o JSON da resposta quando sucesso", async () => {
      const respostaEsperada = { preferenceId: "pref-123", initPoint: "https://..." };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => respostaEsperada,
      }));

      const dados = {
        produtoIds: ["prod1"],
        freteEscolhido: {
          id: "frete-1",
          transportadora: "PAC",
          prazoEmDias: 5,
          valorEmCentavos: 5000,
        },
        cliente: {
          nome: "João Silva",
          email: "joao@example.com",
          telefone: "11999999999",
          cpf: "12345678900",
        },
        endereco: {
          cep: "12345-678",
          logradouro: "Rua A",
          numero: "123",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
        },
      };

      const resultado = await criarPreferencia(dados);

      expect(resultado).toEqual(respostaEsperada);
    });

    it("lança erro com mensagem do servidor quando falha", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Pagamento não autorizado" }),
      }));

      const dados = {
        produtoIds: ["prod1"],
        freteEscolhido: {
          id: "frete-1",
          transportadora: "PAC",
          prazoEmDias: 5,
          valorEmCentavos: 5000,
        },
        cliente: {
          nome: "João Silva",
          email: "joao@example.com",
          telefone: "11999999999",
          cpf: "12345678900",
        },
        endereco: {
          cep: "12345-678",
          logradouro: "Rua A",
          numero: "123",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
        },
      };

      await expect(criarPreferencia(dados)).rejects.toThrow("Pagamento não autorizado");
    });

    it("usa mensagem padrão quando erro não retorna JSON", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("Não é JSON");
        },
      }));

      const dados = {
        produtoIds: ["prod1"],
        freteEscolhido: {
          id: "frete-1",
          transportadora: "PAC",
          prazoEmDias: 5,
          valorEmCentavos: 5000,
        },
        cliente: {
          nome: "João Silva",
          email: "joao@example.com",
          telefone: "11999999999",
          cpf: "12345678900",
        },
        endereco: {
          cep: "12345-678",
          logradouro: "Rua A",
          numero: "123",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
        },
      };

      await expect(criarPreferencia(dados)).rejects.toThrow(
        "Erro ao criar preferência de pagamento"
      );
    });

    it("suporta pedidoIdExistente opcional", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ preferenceId: "pref-123" }),
      });
      global.fetch = mockFetch;

      const dados = {
        produtoIds: ["prod1"],
        freteEscolhido: {
          id: "frete-1",
          transportadora: "PAC",
          prazoEmDias: 5,
          valorEmCentavos: 5000,
        },
        cliente: {
          nome: "João Silva",
          email: "joao@example.com",
          telefone: "11999999999",
          cpf: "12345678900",
        },
        endereco: {
          cep: "12345-678",
          logradouro: "Rua A",
          numero: "123",
          bairro: "Centro",
          cidade: "São Paulo",
          uf: "SP",
        },
        pedidoIdExistente: "pedido-456",
      };

      await criarPreferencia(dados);

      const bodyChamada = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(bodyChamada.pedidoIdExistente).toBe("pedido-456");
    });
  });

  describe("verificarPagamento", () => {
    it("faz requisição GET com pedidoId codificado", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ status: "aprovado" }),
      });
      global.fetch = mockFetch;

      await verificarPagamento("pedido-123");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("/api/verificar-pagamento");
      expect(url).toContain("pedidoId=");
    });

    it("retorna o JSON da resposta quando sucesso", async () => {
      const respostaEsperada = { status: "aprovado", valor: 100 };
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => respostaEsperada,
      }));

      const resultado = await verificarPagamento("pedido-123");

      expect(resultado).toEqual(respostaEsperada);
    });

    it("lança erro quando pedido não encontrado", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        json: async () => ({ error: "Pedido não encontrado" }),
      }));

      await expect(verificarPagamento("pedido-inexistente")).rejects.toThrow(
        "Pedido não encontrado"
      );
    });

    it("usa mensagem padrão quando erro não retorna JSON", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
        json: async () => {
          throw new Error("Não é JSON");
        },
      }));

      await expect(verificarPagamento("pedido-123")).rejects.toThrow("Pedido não encontrado");
    });
  });

  describe("buscarEnderecoPorCEP", () => {
    it("valida se CEP tem 8 dígitos", async () => {
      await expect(buscarEnderecoPorCEP("123")).rejects.toThrow("CEP inválido");
    });

    it("remove caracteres não numéricos do CEP", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          logradouro: "Rua A",
          bairro: "Centro",
          localidade: "São Paulo",
          uf: "SP",
        }),
      });
      global.fetch = mockFetch;

      await buscarEnderecoPorCEP("01310-100");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("01310100");
    });

    it("faz requisição GET para ViaCEP API", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          logradouro: "Rua A",
          bairro: "Centro",
          localidade: "São Paulo",
          uf: "SP",
        }),
      });
      global.fetch = mockFetch;

      await buscarEnderecoPorCEP("01310-100");

      const url = mockFetch.mock.calls[0][0];
      expect(url).toContain("viacep.com.br");
    });

    it("retorna o endereço formatado quando encontrado", async () => {
      const enderecoMock = {
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        localidade: "São Paulo",
        uf: "SP",
      };

      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => enderecoMock,
      }));

      const resultado = await buscarEnderecoPorCEP("01310-100");

      expect(resultado).toEqual({
        logradouro: "Avenida Paulista",
        bairro: "Bela Vista",
        cidade: "São Paulo",
        uf: "SP",
      });
    });

    it("lança erro quando CEP não é encontrado", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ erro: true }),
      }));

      await expect(buscarEnderecoPorCEP("99999-999")).rejects.toThrow("CEP não encontrado");
    });

    it("lança erro quando requisição falha", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: false,
      }));

      await expect(buscarEnderecoPorCEP("01310-100")).rejects.toThrow("Erro ao buscar CEP");
    });

    it("mapeia 'localidade' para 'cidade' na resposta", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          logradouro: "Rua X",
          bairro: "Bairro Y",
          localidade: "Cidade Z",
          uf: "MG",
        }),
      }));

      const resultado = await buscarEnderecoPorCEP("30130-100");

      expect(resultado.cidade).toBe("Cidade Z");
      expect(resultado).not.toHaveProperty("localidade");
    });

    it("funciona com CEP sem formatação", async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          logradouro: "Rua A",
          bairro: "Centro",
          localidade: "São Paulo",
          uf: "SP",
        }),
      });
      global.fetch = mockFetch;

      await buscarEnderecoPorCEP("01310100");

      const urlChamada = mockFetch.mock.calls[0][0];
      expect(urlChamada).toContain("01310100");
    });

    it("valida com CEP contendo apenas 7 dígitos", async () => {
      await expect(buscarEnderecoPorCEP("0131010")).rejects.toThrow("CEP inválido");
    });

    it("valida com CEP contendo 9 dígitos", async () => {
      await expect(buscarEnderecoPorCEP("013101001")).rejects.toThrow("CEP inválido");
    });
  });
});
