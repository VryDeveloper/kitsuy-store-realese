import { useState, useEffect } from "react";
import { ProdutoCheckout, OpcaoFrete } from "@/types/checkout";
import { calcularFrete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Truck, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  produtos: ProdutoCheckout[];
  cep: string;
  onVoltar: () => void;
  onEscolher: (frete: OpcaoFrete) => void;
}

export function OpcoesFrete({ produtos, cep, onVoltar, onEscolher }: Props) {
  const { toast } = useToast();
  const [opcoes, setOpcoes] = useState<OpcaoFrete[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<string | null>(null);

  const produtoIds = produtos.map((p) => p.id).join(",");

  useEffect(() => {
    const buscarFrete = async () => {
      setCarregando(true);
      setErro(null);

      try {
        const resultado = await calcularFrete(cep, produtoIds.split(","));
        setOpcoes(resultado.opcoes);

        if (resultado.opcoes.length > 0) {
          setSelecionado(resultado.opcoes[0].id);
        }
      } catch (error) {
        const mensagem =
          error instanceof Error ? error.message : "Erro ao calcular frete";
        setErro(mensagem);
        toast({
          title: "Erro ao calcular frete",
          description: mensagem,
          variant: "destructive",
        });
      } finally {
        setCarregando(false);
      }
    };

    buscarFrete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cep, produtoIds]);

  const handleContinuar = () => {
    const freteEscolhido = opcoes.find((o) => o.id === selecionado);
    if (freteEscolhido) {
      onEscolher(freteEscolhido);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="fredoka text-[#EA3E83]">
          Escolha o Frete
        </CardTitle>
        <CardDescription>
          Calculando para o CEP: <strong>{cep}</strong>
        </CardDescription>
      </CardHeader>
      <CardContent>
        {carregando && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#EA3E83] mb-4" />
            <p className="text-muted-foreground">
              Calculando opções de frete...
            </p>
          </div>
        )}

        {erro && !carregando && (
          <div className="text-center py-8">
            <p className="text-destructive mb-4">{erro}</p>
            <Button variant="outline" onClick={onVoltar}>
              Voltar e corrigir endereço
            </Button>
          </div>
        )}

        {!carregando && !erro && opcoes.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">
              Nenhuma opção de frete disponível para este endereço.
            </p>
            <Button variant="outline" onClick={onVoltar}>
              Voltar e corrigir endereço
            </Button>
          </div>
        )}

        {!carregando && opcoes.length > 0 && (
          <div className="space-y-4">
            <RadioGroup
              value={selecionado || undefined}
              onValueChange={setSelecionado}
            >
              {opcoes.map((opcao) => (
                <div
                  key={opcao.id}
                  className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer transition-transform duration-150 hover:scale-[1.02]"
                  onClick={() => setSelecionado(opcao.id)}
                >
                  <RadioGroupItem value={opcao.id} id={opcao.id} />
                  <Label
                    htmlFor={opcao.id}
                    className="flex-1 cursor-pointer flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{opcao.transportadora}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {opcao.prazoEmDias} dia
                          {opcao.prazoEmDias > 1 ? "s" : ""} úteis
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      {opcao.valorOriginalEmCentavos > opcao.valorEmCentavos && (
                        <p className="text-xs text-muted-foreground line-through">
                          {opcao.valorOriginalFormatado}
                        </p>
                      )}
                      <p className="font-bold text-lg text-[#EA3E83]">
                        {opcao.valorFormatado}
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={onVoltar} className="flex-1">
                Voltar
              </Button>
              <Button
                onClick={handleContinuar}
                disabled={!selecionado}
                className="flex-1 bg-[#EA3E83] hover:bg-[#c72e6c]"
              >
                Continuar para Pagamento
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
