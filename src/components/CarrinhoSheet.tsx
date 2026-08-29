import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingCart, X, Package } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

function precoParaNumero(preco: string): number {
  return parseFloat(preco.replace(/[^\d,]/g, "").replace(",", ".")) || 0;
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

export function CarrinhoSheet() {
  const { itens, remover, contador } = useCart();
  const navigate = useNavigate();

  const total = itens.reduce((soma, item) => soma + precoParaNumero(item.preco), 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <ShoppingCart className="h-5 w-5" />
          {contador > 0 && (
            <span className="absolute -top-1 -right-1 bg-[#EA3E83] text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {contador}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[340px] sm:w-[400px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-[#EA3E83] fredoka text-xl">
            Seu carrinho
          </SheetTitle>
        </SheetHeader>

        {itens.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400 gap-3">
            <Package className="h-12 w-12 opacity-30" />
            <p className="text-sm">Seu carrinho está vazio</p>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto space-y-3 mt-4">
              {itens.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 border rounded-lg p-3"
                >
                  <img
                    src={item.imagem}
                    alt={item.nome}
                    className="w-14 h-14 object-cover rounded-md"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">{item.nome}</p>
                    <p className="text-sm text-[#EA3E83] font-bold">{item.preco}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0"
                    onClick={() => remover(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold text-[#EA3E83]">
                  {formatarMoeda(total)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Frete calculado na próxima etapa
              </p>
              <Button
                className="w-full bg-[#EA3E83] hover:bg-[#c72e6c]"
                onClick={() => navigate("/checkout")}
              >
                Finalizar compra
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
