import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageCircle } from "lucide-react";

interface ProductCardProps {
  image: string;
  title: string;
  price: string;
  inStock: string;
  discount: string;
}

export const ProductCard = ({ image, title, price, inStock, discount }: ProductCardProps) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Estado para controlar o overlay

  const whatsappMessage = `Olá! Gostaria de saber mais sobre: ${title} ${price}`;
  const whatsappLink = `https://wa.me/5571997020168?text=${encodeURIComponent(whatsappMessage)}`;

  const isOutOfStock = inStock.toLowerCase() === 'indisponível';

  return (
    <>
      {/* Card de Produto */}
      <Card className="group overflow-hidden transition-all duration-300 border-none hover:shadow-2xl hover:scale-105 animate-fade-in flex flex-col 
h-auto sm:h-[450px] md:h-[485px]">
        <div className="relative overflow-hidden bg-black h-max">
          <img
            src={image}
            alt={title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 cursor-pointer ${isOutOfStock ? 'grayscale' : ''}`}
            onClick={() => setSelectedImage(image)} // Abre o modal quando clica na imagem
            draggable={false} // Impede o drag da imagem
          />
          <div className="absolute top-3 right-3">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
              {inStock}
            </span>
          </div>
        </div>
        <div className="flex flex-col justify-between flex-1">
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
            <h4 className="text-lg line-through text-primary">{discount}</h4>
            <p className="text-2xl font-bold text-primary">{price}</p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex gap-2">
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => window.open(whatsappLink, '_blank')}
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              Comprar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(whatsappLink, '_blank')}
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
