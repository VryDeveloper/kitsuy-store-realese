import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageCircle } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useToast } from "@/hooks/use-toast";
import { linkWhatsApp } from "@/config/loja";
import { caminhoProduto, fotosDoProduto, type FotoProduto } from "@/lib/seoProduto";

interface ProductCardProps {
  id?: string;
  source?: string;
  image: string;
  title: string;
  price: string;
  inStock: string;
  discount: string;
  slug?: string | null;
  images?: FotoProduto[] | null;
  imageAlt?: string | null;
}

/** Com o mouse em cima, alterna as fotos a cada 1,5 s; ao sair volta para a capa. */
function useFotoNoHover(total: number) {
  const [hover, setHover] = useState(false);
  const [carregar, setCarregar] = useState(false); // extras só entram no DOM no 1º hover
  const [ativa, setAtiva] = useState(0);
  useEffect(() => {
    if (!hover || total < 2) return setAtiva(0);
    const t = setInterval(() => setAtiva((i) => (i + 1) % total), 1500);
    return () => clearInterval(t);
  }, [hover, total]);
  return {
    ativa,
    carregar,
    eventos: {
      // Só mouse: no toque o "hover" emulado faria a foto trocar no meio do clique.
      onPointerEnter: (e: React.PointerEvent) => e.pointerType === "mouse" && (setHover(true), setCarregar(true)),
      onPointerLeave: () => setHover(false),
    },
  };
}

export const ProductCard = ({
  id,
  source,
  image,
  title,
  price,
  inStock,
  discount,
  slug,
  images,
  imageAlt,
}: ProductCardProps) => {
  const { itens, adicionar } = useCart();
  const { toast } = useToast();
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Estado para controlar o overlay

  const whatsappMessage = `Olá! Gostaria de saber mais sobre: ${title} ${price}`;
  const whatsappLink = linkWhatsApp(whatsappMessage);

  const isOutOfStock = inStock.toLowerCase() === "indisponível";

  // Checkout real só existe para produtos da coleção `products`.
  const podeComprarOnline = source === "products" && !!id;
  const jaEstaNoCarrinho = podeComprarOnline && itens.some((item) => item.id === id);
  // Figure de pronta entrega disponível → o card leva para a vitrine (/produto/:slug).
  const vitrine = podeComprarOnline && !isOutOfStock ? caminhoProduto({ id: id!, slug }) : null;
  const fotos = fotosDoProduto({ id: id ?? "", title, price, image, images, imageAlt });
  const { ativa, carregar, eventos } = useFotoNoHover(vitrine ? fotos.length : 1);

  const handleComprarClick = () => {
    if (!podeComprarOnline) {
      window.open(whatsappLink, "_blank");
      return;
    }

    if (jaEstaNoCarrinho) return;

    adicionar({ id: id!, collectionName: source!, nome: title, preco: price, imagem: image });
    toast({ title: "Adicionado ao carrinho", description: title });
  };

  return (
    <>
      {/* Card de Produto */}
      <Card
        {...eventos}
        className="group relative overflow-hidden transition-all duration-300 border-none hover:shadow-2xl hover:scale-105 animate-fade-in flex flex-col 
h-auto sm:h-[450px] md:h-[485px]"
      >
        <div className="relative overflow-hidden bg-black h-max">
          <img
            src={image}
            alt={fotos[0].alt}
            className={`w-full h-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-110 cursor-pointer ${isOutOfStock ? "grayscale" : ""} ${ativa ? "opacity-0" : ""}`}
            onClick={vitrine ? undefined : () => setSelectedImage(image)} // Sem vitrine: abre o modal da imagem
            draggable={false} // Impede o drag da imagem
          />
          {carregar &&
            fotos.slice(1).map((f, i) => (
              <img
                key={f.url + i}
                src={f.url}
                alt=""
                aria-hidden
                className={`absolute inset-0 w-full h-full object-cover transition-[transform,opacity] duration-500 group-hover:scale-110 ${ativa === i + 1 ? "opacity-100" : "opacity-0"}`}
                draggable={false}
              />
            ))}
          <div className="absolute top-3 right-3">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
              {inStock}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between flex-1">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">
              {/* after:inset-0 estica o link pelo card inteiro (o botão do WhatsApp fica por cima, z-10) */}
              {vitrine ? <Link to={vitrine} className="after:absolute after:inset-0">{title}</Link> : title}
            </h3>
            <h4 className="text-lg line-through text-primary">{discount}</h4>
            <p className="text-2xl font-bold text-primary">{price}</p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex gap-2">
            {vitrine ? (
              <Button asChild variant="default" size="sm" className="flex-1 min-w-0 relative z-10">
                <Link to={vitrine}>
                  <ShoppingCart className="mr-2 h-4 w-4 shrink-0" />
                  <span className="truncate">{jaEstaNoCarrinho ? "No carrinho" : "Ver figure"}</span>
                </Link>
              </Button>
            ) : (
            <Button
              variant="default"
              size="sm"
              className="flex-1 min-w-0"
              disabled={isOutOfStock || jaEstaNoCarrinho}
              onClick={handleComprarClick}
            >
              <ShoppingCart className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {jaEstaNoCarrinho
                  ? "No carrinho"
                  : podeComprarOnline
                    ? "Adicionar ao carrinho"
                    : "Comprar"}
              </span>
            </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 relative z-10"
              aria-label="Perguntar no WhatsApp"
              onClick={() => window.open(whatsappLink, "_blank")}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          </CardFooter>
        </div>
      </Card>

      {/* Modal/Overlay para visualização da imagem */}
      {selectedImage && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center"
          onClick={() => setSelectedImage(null)} // Fecha o modal quando clica fora da imagem
        >
          <img
            src={selectedImage}
            alt="Preview"
            className="max-w-[90vw] max-h-[90vh] rounded-2xl shadow-2xl"
            onClick={(e) => e.stopPropagation()} // Impede que o clique na imagem feche o modal
            draggable={false} // Impede o drag da imagem no modal
          />
        </div>
      )}
    </>
  );
};
