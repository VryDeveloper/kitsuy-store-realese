import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { DadosCliente, Endereco } from "@/types/checkout";
import { buscarEnderecoPorCEP } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const schema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
  cep: z.string().length(8, "CEP deve ter 8 dígitos"),
  logradouro: z.string().min(3, "Logradouro obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  uf: z.string().length(2, "UF inválida"),
});

type FormData = z.infer<typeof schema>;

interface Props {
  onContinuar: (cliente: DadosCliente, endereco: Endereco) => void;
}

export function FormEndereco({ onContinuar }: Props) {
  const { toast } = useToast();
  const [buscandoCEP, setBuscandoCEP] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const handleCEPBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, "");

    if (cep.length !== 8) return;

    setBuscandoCEP(true);
    try {
      const endereco = await buscarEnderecoPorCEP(cep);
      setValue("logradouro", endereco.logradouro);
      setValue("bairro", endereco.bairro);
      setValue("cidade", endereco.cidade);
      setValue("uf", endereco.uf);
    } catch (error) {
      toast({
        title: "Erro ao buscar CEP",
        description:
          error instanceof Error ? error.message : "CEP não encontrado",
        variant: "destructive",
      });
    } finally {
      setBuscandoCEP(false);
    }
  };

  const onSubmit = (data: FormData) => {
    const cliente: DadosCliente = {
      nome: data.nome,
      email: data.email,
      telefone: data.telefone,
      cpf: data.cpf,
    };

    const endereco: Endereco = {
      cep: data.cep,
      logradouro: data.logradouro,
      numero: data.numero,
      complemento: data.complemento,
      bairro: data.bairro,
      cidade: data.cidade,
      uf: data.uf,
    };

    onContinuar(cliente, endereco);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="fredoka text-[#EA3E83]">
          Dados de Entrega
        </CardTitle>
        <CardDescription>
          Preencha seus dados para calcular o frete
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo *</Label>
            <Input
              id="nome"
              {...register("nome")}
              placeholder="Seu nome completo"
            />
            {errors.nome && (
              <p className="text-sm text-destructive">{errors.nome.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="seu@email.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input
                id="telefone"
                {...register("telefone")}
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
              {errors.telefone && (
                <p className="text-sm text-destructive">
                  {errors.telefone.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cpf">CPF *</Label>
            <Input
              id="cpf"
              {...register("cpf")}
              placeholder="000.000.000-00"
              maxLength={14}
            />
            {errors.cpf && (
              <p className="text-sm text-destructive">{errors.cpf.message}</p>
            )}
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-semibold mb-4">Endereço de Entrega</h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <div className="relative">
                  <Input
                    id="cep"
                    {...register("cep")}
                    onBlur={handleCEPBlur}
                    placeholder="00000000"
                    maxLength={9}
                  />
                  {buscandoCEP && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-[#EA3E83]" />
                  )}
                </div>
                {errors.cep && (
                  <p className="text-sm text-destructive">
                    {errors.cep.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="logradouro">Logradouro *</Label>
                <Input
                  id="logradouro"
                  {...register("logradouro")}
                  placeholder="Rua, Avenida, etc."
                />
                {errors.logradouro && (
                  <p className="text-sm text-destructive">
                    {errors.logradouro.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero">Número *</Label>
                  <Input
                    id="numero"
                    {...register("numero")}
                    placeholder="123"
                  />
                  {errors.numero && (
                    <p className="text-sm text-destructive">
                      {errors.numero.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="complemento">Complemento</Label>
                  <Input
                    id="complemento"
                    {...register("complemento")}
                    placeholder="Apto, Bloco, etc."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="bairro">Bairro *</Label>
                <Input
                  id="bairro"
                  {...register("bairro")}
                  placeholder="Bairro"
                />
                {errors.bairro && (
                  <p className="text-sm text-destructive">
                    {errors.bairro.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cidade">Cidade *</Label>
                  <Input
                    id="cidade"
                    {...register("cidade")}
                    placeholder="Cidade"
                  />
                  {errors.cidade && (
                    <p className="text-sm text-destructive">
                      {errors.cidade.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uf">UF *</Label>
                  <Input
                    id="uf"
                    {...register("uf")}
                    placeholder="SP"
                    maxLength={2}
                    className="uppercase"
                  />
                  {errors.uf && (
                    <p className="text-sm text-destructive">
                      {errors.uf.message}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-[#EA3E83] hover:bg-[#c72e6c]"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Calcular Frete"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
