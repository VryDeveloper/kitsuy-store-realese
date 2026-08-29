import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

/**
 * Carrinho de compras — lista de produtos DISTINTOS (cada figure é um
 * colecionável único, estoque de 1 unidade; não existe "quantidade > 1" por
 * item). Persiste em localStorage pra sobreviver ao cliente fechar a aba e
 * voltar depois.
 */

const CHAVE_LOCALSTORAGE = "kitsuy_carrinho";

export interface ItemCarrinho {
  id: string; // produtoId
  collectionName: string; // sempre "products" hoje (única coleção com checkout real)
  nome: string;
  preco: string; // string formatada, mesmo formato usado em ProductCard.price (ex: "R$ 260,00")
  imagem: string;
}

interface CartContextValue {
  itens: ItemCarrinho[];
  adicionar: (item: ItemCarrinho) => void;
  remover: (produtoId: string) => void;
  limpar: () => void;
  contador: number;
}

const CartContext = createContext<CartContextValue | null>(null);

function lerCarrinhoSalvo(): ItemCarrinho[] {
  try {
    const bruto = localStorage.getItem(CHAVE_LOCALSTORAGE);
    if (!bruto) return [];
    const itens = JSON.parse(bruto);
    return Array.isArray(itens) ? itens : [];
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [itens, setItens] = useState<ItemCarrinho[]>(lerCarrinhoSalvo);

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_LOCALSTORAGE, JSON.stringify(itens));
    } catch {
      // localStorage indisponível (ex: modo privado) — carrinho só dura a sessão da aba
    }
  }, [itens]);

  const adicionar = (item: ItemCarrinho) => {
    setItens((atual) => {
      if (atual.some((i) => i.id === item.id)) return atual; // já está no carrinho
      return [...atual, item];
    });
  };

  const remover = (produtoId: string) => {
    setItens((atual) => atual.filter((i) => i.id !== produtoId));
  };

  const limpar = () => setItens([]);

  return (
    <CartContext.Provider
      value={{ itens, adicionar, remover, limpar, contador: itens.length }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart precisa ser usado dentro de um <CartProvider>");
  }
  return ctx;
}
