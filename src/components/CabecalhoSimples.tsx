import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import kitsuyIcon from "@/assets/KitsuyIcon.png";

/** Cabeçalho das páginas de conta, no mesmo estilo do checkout. */
export function CabecalhoSimples() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-pink-100 shadow-sm">
      <div className="container mx-auto px-4 h-20 flex items-center gap-4">
        <Link
          to="/"
          className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-[#EA3E83] transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Início
        </Link>
        <div className="flex items-center gap-2 ml-auto">
          <img src={kitsuyIcon} alt="Kitsuy" className="w-10 h-10 object-contain" />
          <span className="fredoka text-xl font-light text-[#EA3E83]">KITSUY STORE</span>
        </div>
      </div>
    </header>
  );
}
