import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { useAuth } from "@/contexts/AuthContext";
import { CabecalhoSimples } from "@/components/CabecalhoSimples";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const ERROS: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/user-not-found": "Não existe conta com esse e-mail.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail. Use \"Entrar\".",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Espere um pouco e tente de novo.",
  "auth/popup-blocked": "O navegador bloqueou a janela do Google. Libere pop-ups e tente de novo.",
  "auth/configuration-not-found": "Login ainda não está disponível. Tente mais tarde.",
  "auth/operation-not-allowed": "Login ainda não está disponível. Tente mais tarde.",
  "auth/account-exists-with-different-credential":
    "Esse e-mail já tem conta com outra forma de login.",
};

export function mensagemErro(erro: unknown): string {
  const code = (erro as { code?: string })?.code ?? "";
  return ERROS[code] ?? "Não foi possível entrar. Tente novamente.";
}

// Só aceita caminho interno ("/checkout"), nunca "//site.com" ou URL externa.
export function destinoSeguro(voltar: string | null): string {
  return voltar && voltar.startsWith("/") && !voltar.startsWith("//") ? voltar : "/minha-conta";
}

const Entrar = () => {
  const { usuario, carregando } = useAuth();
  const [params] = useSearchParams();
  const { toast } = useToast();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  if (!carregando && usuario) return <Navigate to={destinoSeguro(params.get("voltar"))} replace />;

  const executar = async (acao: () => Promise<unknown>) => {
    setEnviando(true);
    try {
      await acao();
    } catch (erro) {
      // Fechar a janela do Google não é erro para o cliente.
      if ((erro as { code?: string })?.code !== "auth/popup-closed-by-user") {
        toast({ title: mensagemErro(erro), variant: "destructive" });
      }
    } finally {
      setEnviando(false);
    }
  };

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    executar(async () => {
      if (modo === "entrar") {
        await signInWithEmailAndPassword(auth, email, senha);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, senha);
        await sendEmailVerification(user);
        toast({ title: "Conta criada!", description: "Enviamos um e-mail para confirmar seu endereço." });
      }
    });
  };

  const esqueciSenha = () =>
    executar(async () => {
      if (!email) {
        toast({ title: "Digite seu e-mail acima primeiro.", variant: "destructive" });
        return;
      }
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Pronto!", description: "Se houver conta com esse e-mail, enviamos o link para trocar a senha." });
    });

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoSimples />
      <div className="container mx-auto px-4 py-10 max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="fredoka text-[#EA3E83]">Sua conta Kitsuy</CardTitle>
            <CardDescription>
              Entre para acompanhar seus pedidos. Comprar sem conta continua funcionando.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={enviando}
              onClick={() => executar(() => signInWithPopup(auth, new GoogleAuthProvider()))}
            >
              Continuar com Google
            </Button>

            <div className="flex items-center gap-3 text-xs text-gray-400">
              <div className="h-px flex-1 bg-gray-200" /> ou com e-mail <div className="h-px flex-1 bg-gray-200" />
            </div>

            <Tabs value={modo} onValueChange={(v) => setModo(v as "entrar" | "criar")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="entrar">Entrar</TabsTrigger>
                <TabsTrigger value="criar">Criar conta</TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={enviar} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="senha">Senha</Label>
                <Input
                  id="senha"
                  type="password"
                  autoComplete={modo === "entrar" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <Button type="submit" className="w-full bg-[#EA3E83] hover:bg-[#c72e6c]" disabled={enviando}>
                {enviando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {modo === "entrar" ? "Entrar" : "Criar conta"}
              </Button>
              {modo === "entrar" && (
                <button
                  type="button"
                  onClick={esqueciSenha}
                  className="w-full text-sm text-gray-500 hover:text-[#EA3E83]"
                >
                  Esqueci minha senha
                </button>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Entrar;
