import { useQuery } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { inStockAoVivo } from "@/lib/disponibilidade";
import type { ProdutoSeo } from "@/lib/seoProduto";

export interface Product extends Omit<ProdutoSeo, "description"> {
  id: string;
  title: string;
  inStock: string;
  discount: string;
  price: string;
  image: string;
  displayOrder?: number;
  description?: string;
  stock?: number;
  featured?: boolean;
  /** "products" = pronta entrega (checkout) · "masterpiece" = sob encomenda */
  source?: string;
}

/** Disponíveis primeiro; dentro de cada grupo, pela ordem manual `displayOrder`. */
export function ordenarProdutos(produtos: Product[]): Product[] {
  return [...produtos].sort((a, b) => {
    const aOut = a.inStock?.toLowerCase() === "indisponível";
    const bOut = b.inStock?.toLowerCase() === "indisponível";
    if (aOut !== bOut) return aOut ? 1 : -1;
    return (Number(a.displayOrder) || 999999) - (Number(b.displayOrder) || 999999);
  });
}

async function buscarProdutos(): Promise<Product[]> {
  const [productsSnap, masterpieceSnap] = await Promise.all([
    getDocs(collection(db, "products")),
    getDocs(collection(db, "masterpiece")),
  ]);

  const pronta = productsSnap.docs.map((doc) => {
    const data = doc.data();
    return { id: doc.id, source: "products", ...data, inStock: inStockAoVivo(data) };
  }) as Product[];

  const encomenda = masterpieceSnap.docs.map((doc) => ({
    id: doc.id,
    source: "masterpiece",
    ...doc.data(),
  })) as Product[];

  return ordenarProdutos([...pronta, ...encomenda]);
}

/** Todas as figures do site (pronta entrega + sob encomenda), já ordenadas. */
export function useProdutos() {
  const { data = [], isLoading, error } = useQuery({
    queryKey: ["produtos"],
    queryFn: buscarProdutos,
    staleTime: 60_000,
  });
  if (error) console.error("Erro ao carregar produtos:", error);
  return { produtos: data, carregando: isLoading };
}
