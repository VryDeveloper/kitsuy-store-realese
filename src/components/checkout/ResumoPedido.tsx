import { ProdutoCheckout, OpcaoFrete } from '@/types/checkout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface Props {
  produto: ProdutoCheckout;
  frete: OpcaoFrete | null;
}

export function ResumoPedido({ produto, frete }: Props) {
  // Converter preço de string BRL para número
  const precoEmReais = parseFloat(
    produto.preco.replace(/[^\d,]/g, '').replace(',', '.')
  );
  const freteEmReais = frete ? frete.valorEmCentavos / 100 : 0;
  const totalEmReais = precoEmReais + freteEmReais;

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Resumo do Pedido</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Imagem do Produto */}
        <div className="flex gap-4">
          <img
            src={produto.imagem}
            alt={produto.nome}
            className="w-20 h-20 object-cover rounded-md"
          />
          <div className="flex-1">
            <h3 className="font-medium text-sm line-clamp-2">{produto.nome}</h3>
            <p className="text-muted-foreground text-sm mt-1">Quantidade: 1</p>
          </div>
        </div>

        <Separator />

        {/* Valores */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Produto</span>
            <span className="font-medium">{formatarMoeda(precoEmReais)}</span>
          </div>

          {frete && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete ({frete.transportadora})</span>
              <span className="font-medium">{frete.valorFormatado}</span>
            </div>
          )}

          {!frete && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Frete</span>
              <span className="text-muted-foreground text-xs">
                A calcular
              </span>
            </div>
          )}
        </div>

        <Separator />

        {/* Total */}
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold text-primary">
            {formatarMoeda(totalEmReais)}
          </span>
        </div>

        {frete && (
          <p className="text-xs text-muted-foreground text-center pt-2">
            Entrega em até {frete.prazoEmDias} dia{frete.prazoEmDias > 1 ? 's' : ''} úteis
          </p>
        )}
      </CardContent>
    </Card>
  );
}
