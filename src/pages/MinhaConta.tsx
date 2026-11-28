import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { signOut, sendEmailVerification } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";
import { meusPedidos } from "@/lib/api";
import { formatarMoeda } from "@/lib/preco";
import { esquecerUsuario } from "@/lib/analytics";
import { CabecalhoSimples } from "@/components/CabecalhoSimples";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Package } from "lucide-react";

const STATUS: Record<string, string> = {
  paid: "Pago",
  pendente: "Aguardando pagamento",
  cancelado: "Cancelado",
  reembolsado: "Reembolsado",
};

const MinhaConta = () => {
  const { usuario, carregando } = useAuth();
  const { toast } = useToast();
  const pedidos = useQuery({
    queryKey: ["meus-pedidos", usuario?.uid],
    queryFn: meusPedidos,
    enabled: !!usuario,
  });

  if (carregando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="h-10 w-10 animate-spin text-[#EA3E83]" />
      </div>
    );
  }
  if (!usuario) return <Navigate to="/entrar?voltar=/minha-conta" replace />;

  const reenviarVerificacao = async () => {
    try {
      await sendEmailVerification(usuario);
      toast({ title: "E-mail de confirmação enviado." });
    } catch {
      toast({ title: "Não foi possível enviar agora. Tente mais tarde.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoSimples />
      <div className="container mx-auto px-4 py-10 max-w-3xl space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="fredoka text-[#EA3E83]">
                Olá{usuario.displayName ? `, ${usuario.displayName.split(" ")[0]}` : ""}!
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">{usuario.email}</p>
            </div>
            <Button variant="outline" onClick={() => { esquecerUsuario(); signOut(auth); }}>
              Sair
            </Button>
          </CardHeader>
          {!usuario.emailVerified && (
            <CardContent className="text-sm text-gray-600">
              Confirme seu e-mail para ver também os pedidos feitos antes de criar a conta.{" "}
              <button onClick={reenviarVerificacao} className="text-[#EA3E83] font-semibold hover:underline">
                Reenviar e-mail
              </button>
            </CardContent>
          )}
        </Card>

        <h2 className="fredoka text-2xl text-gray-900">Meus pedidos</h2>

        {pedidos.isLoading && <Loader2 className="h-8 w-8 animate-spin text-[#EA3E83]" />}
        {pedidos.isError && <p className="text-destructive">{(pedidos.error as Error).message}</p>}
        {pedidos.data?.length === 0 && (
          <p className="text-gray-500">Você ainda não tem pedidos por aqui.</p>
        )}

        {pedidos.data?.map((p) => (
          <Card key={p.pedidoId}>
            <CardContent className="p-4 space-y-3">
              <div className="flex flex-wrap justify-between gap-2 text-sm">
                <span className="font-semibold text-gray-900">
                  {p.criadoEm ? new Date(p.criadoEm).toLocaleDateString("pt-BR") : ""}
                </span>
                <span className="rounded-full bg-pink-50 px-3 py-0.5 font-semibold text-[#EA3E83]">
                  {STATUS[p.status] ?? p.status}
                </span>
              </div>
              {p.produtos.map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  {item.imagem ? (
                    <img src={item.imagem} alt="" className="h-14 w-14 rounded-lg object-cover" />
                  ) : (
                    <Package className="h-14 w-14 p-3 text-gray-300" />
                  )}
                  <span className="flex-1 text-sm text-gray-700">{item.nome}</span>
                  <span className="text-sm text-gray-500">{formatarMoeda(item.preco / 100)}</span>
                </div>
              ))}
              <div className="flex justify-between border-t pt-3 text-sm">
                <span className="text-gray-500">{p.transportadora}</span>
                <span className="font-semibold">Total {formatarMoeda(p.totalEmCentavos / 100)}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default MinhaConta;
