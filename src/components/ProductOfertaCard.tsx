import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShoppingCart, MessageCircle } from "lucide-react";

interface ProductOfertaCardProps {
  image: string;
  title: string;
}

export const ProductOfertaCard = ({ image, title}: ProductOfertaCardProps) => {

  return (
    <Card className="scale-105 group overflow-hidden transition-all duration-300 border-white border-[5px] hover:shadow-md hover:scale-105 animate-fade-in flex flex-col h-[480px]">
        <div className="relative overflow-hidden bg-muted h-[420px] w-full">
            <img
            src={image}
            alt={title}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
        </div>
        <CardContent className="p-4 flex-1 bg-black text-white flex items-center mt-auto">
            <h3 className="font-semibold text-lg text-center line-clamp-2 w-full">{title}</h3>
        </CardContent>
    </Card>
  );
};
