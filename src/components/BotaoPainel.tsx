import { Link } from "react-router-dom";
import { LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAcessoAdmin } from "@/hooks/useAcessoAdmin";

/** Atalho para /admin no cabeçalho — só aparece para contas em ADMIN_EMAILS. */
export function BotaoPainel() {
  if (!useAcessoAdmin().isSuccess) return null;
  return (
    <Button asChild variant="outline" size="sm" className="hidden sm:flex gap-2 border-[#EA3E83] text-[#EA3E83] hover:bg-pink-50">
      <Link to="/admin">
        <LayoutDashboard className="h-4 w-4" />
        Acessar painel
      </Link>
    </Button>
  );
}
