import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageCircle } from "lucide-react";

interface ProductCardProps {
  image: string;
  title: string;
  price: string;
  category: string;
}

export const ProductCard = ({ image, title, price, category }: ProductCardProps) => {
  const whatsappMessage = `Olá! Gostaria de saber mais sobre: ${title}${price}`;
  const whatsappLink = `https://wa.me/5571997020168?text=${encodeURIComponent(whatsappMessage)}`;

  return (
      <Card className="group overflow-hidden transition-all duration-300 border-none hover:shadow-2xl hover:scale-105 animate-fade-in flex flex-col h-[485px]">
        <div className="relative overflow-hidden bg-black h-[500px]">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 right-3">
            <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-semibold">
              {category}
            </span>
          </div>
        </div>
        <div className="flex flex-col flex-1">
          <CardContent className="p-4 flex-1">
            <h3 className="font-semibold text-lg mb-2 line-clamp-2">{title}</h3>
            <p className="text-2xl font-bold text-primary">{price}</p>
          </CardContent>
          <CardFooter className="p-4 pt-0 flex gap-2 mt-auto">
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
  );
};
