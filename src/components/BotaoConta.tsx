import { Link } from "react-router-dom";
import { User, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

/** Ícone do cabeçalho: leva para /entrar ou, logado, para /minha-conta. */
export function BotaoConta() {
  const { usuario } = useAuth();
  const destino = usuario ? "/minha-conta" : "/entrar";
  const rotulo = usuario ? "Minha conta" : "Entrar";

  return (
    <Button
      asChild
      variant="ghost"
      size="icon"
      className="hover:bg-pink-50 hover:text-[#EA3E83]"
    >
      <Link to={destino} aria-label={rotulo} title={rotulo}>
        {usuario ? <UserCheck className="h-5 w-5" /> : <User className="h-5 w-5" />}
      </Link>
    </Button>
  );
}
