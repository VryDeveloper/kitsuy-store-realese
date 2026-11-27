import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { collection, getDocs } from "firebase/firestore";
import { ArrowDown, ArrowUp, ExternalLink, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { db } from "@/firebaseConfig";
import { CabecalhoSimples } from "@/components/CabecalhoSimples";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useConfigSite } from "@/hooks/useConfigSite";
import { useAcessoAdmin } from "@/hooks/useAcessoAdmin";
import { chamarAdmin } from "@/lib/api";
import { comprimirImagem } from "@/lib/comprimirImagem";
import { caminhoProduto, descricaoSeo, gerarSlug, tituloSeo, type FotoProduto, type ProdutoSeo } from "@/lib/seoProduto";
import type { Banner, ChaveFeature, ChaveTexto } from "@/config/site";
import { AVALIACOES_PADRAO, BANNERS_PADRAO, GALERIA_PADRAO } from "@/config/imagensPadrao";

// Lista igual à do código vai vazia (= "usar o padrão"), para não gravar no banco o caminho do bundle.
// shortcut: lista que mistura padrão + upload grava o caminho /assets/...-hash; se trocar o arquivo no código, suba a imagem pelo painel.
const vaziaSePadrao = <T,>(lista: T[], padrao: T[]) => (JSON.stringify(lista) === JSON.stringify(padrao) ? [] : lista);

const ROTULOS_TEXTO: Record<ChaveTexto, string> = {
  sorteioTitulo: "Faixa do sorteio — título",
  sorteioSubtitulo: "Faixa do sorteio — subtítulo",
  promoTitulo: "Destaque de promoções — título",
  heroTitulo: "Título principal",
  heroTexto: "Texto \"Sobre a Kitsuy\"",
  galeriaTitulo: "Galeria — título",
  galeriaSubtitulo: "Galeria — subtítulo",
  estoqueTitulo: "Pronta entrega — título",
  estoqueSubtitulo: "Pronta entrega — subtítulo",
  avaliacoesTitulo: "Avaliações — título",
  avaliacoesSubtitulo: "Avaliações — subtítulo",
  encomendaTitulo: "\"Não encontrou?\" — título",
  encomendaTexto: "\"Não encontrou?\" — texto",
};

const ROTULOS_FEATURE: Record<ChaveFeature, string> = {
  faixaSorteio: "Faixa azul do sorteio no topo da home",
  destaquePromocao: "Destaque de promoções (seção preta com até 3 figures de pronta entrega)",
};

const MAX_MB = 3; // a função da Vercel aceita até 4,5 MB de corpo; base64 aumenta ~33%

function lerArquivo(arquivo: Blob): Promise<string> {
  return new Promise((ok, erro) => {
    const leitor = new FileReader();
    leitor.onload = () => ok(String(leitor.result));
    leitor.onerror = () => erro(new Error("Não foi possível ler o arquivo"));
    leitor.readAsDataURL(arquivo);
  });
}

async function subirImagem(arquivo: File): Promise<string> {
  const leve = await comprimirImagem(arquivo);
  if (leve.size > MAX_MB * 1024 * 1024) throw new Error(`Imagem acima de ${MAX_MB} MB mesmo comprimida — use uma foto menor`);
  const extensao = leve.type === "image/webp" ? ".webp" : leve.type === "image/jpeg" ? ".jpg" : "";
  const nome = extensao ? arquivo.name.replace(/\.\w+$/, "") + extensao : arquivo.name;
  const { url } = await chamarAdmin<{ url: string }>("upload", { nome, dataUrl: await lerArquivo(leve) });
  return url;
}

function BotaoUpload({ aoSubir, children }: { aoSubir: (url: string) => void; children: ReactNode }) {
  const { toast } = useToast();
  const [enviando, setEnviando] = useState(false);
  return (
    <Button asChild variant="outline" size="sm" disabled={enviando}>
      <label className="cursor-pointer gap-2">
        <Upload className="h-4 w-4" /> {enviando ? "Enviando..." : children}
        <input
          type="file"
          accept="image/webp,image/jpeg,image/png,image/avif"
          className="sr-only"
          onChange={async (e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (!arquivo) return;
            setEnviando(true);
            try {
              aoSubir(await subirImagem(arquivo));
            } catch (err) {
              toast({ title: (err as Error).message, variant: "destructive" });
            }
            setEnviando(false);
          }}
        />
      </label>
    </Button>
  );
}

// ─── Estoque ──────────────────────────────────────────────────────────────────
interface Produto extends Omit<ProdutoSeo, "id"> {
  id: string;
  title: string;
  price: string;
  discount?: string | null;
  image: string;
  inStock: string;
  displayOrder?: number;
  estoqueStatus?: string;
  pesoEmKg?: number | null;
  alturaEmCm?: number | null;
  larguraEmCm?: number | null;
  comprimentoEmCm?: number | null;
}

const PRODUTO_VAZIO: Omit<Produto, "id"> = { title: "", price: "", discount: "", image: "", inStock: "disponível", displayOrder: 1 };

/** Digitação só de números → "R$ 1.260,00" (mesmo jeito do CRUD antigo). */
function mascaraReais(v: string): string {
  const centavos = Number(v.replace(/\D/g, ""));
  if (!centavos) return "";
  return `R$ ${(centavos / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function useProdutosAdmin() {
  return useQuery({
    queryKey: ["admin-produtos"],
    queryFn: async () => {
      const snap = await getDocs(collection(db, "products"));
      return snap.docs
        .map((d) => ({ id: d.id, ...d.data() }) as Produto)
        .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999));
    },
  });
}

function AbaEstoque() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: produtos = [], isLoading } = useProdutosAdmin();
  const [editando, setEditando] = useState<(Omit<Produto, "id"> & { id?: string }) | null>(null);
  const [salvando, setSalvando] = useState(false);

  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["admin-produtos"] });
    qc.invalidateQueries({ queryKey: ["produtos"] });
  };

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!editando) return;
    setSalvando(true);
    try {
      const { id, ...dados } = editando;
      await chamarAdmin("salvarProduto", { id, dados });
      toast({ title: "Figure salva" });
      setEditando(null);
      recarregar();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setSalvando(false);
  }

  async function apagar(p: Produto) {
    if (!confirm(`Apagar "${p.title}" do estoque? Isso não pode ser desfeito.`)) return;
    try {
      await chamarAdmin("apagarProduto", { id: p.id });
      recarregar();
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
  }

  const campo = (k: keyof Produto) => ({
    value: String(editando?.[k] ?? ""),
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setEditando((p) => p && { ...p, [k]: e.target.value }),
  });

  return (
    <div className="space-y-4">
      <Button onClick={() => setEditando({ ...PRODUTO_VAZIO, displayOrder: produtos.length + 1 })} className="gap-2">
        <Plus className="h-4 w-4" /> Nova figure
      </Button>

      {isLoading ? (
        <p className="text-gray-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto border rounded-xl">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="p-3">Ordem</th>
                <th className="p-3">Figure</th>
                <th className="p-3">Preço</th>
                <th className="p-3">Situação</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.map((p) => (
                <tr key={p.id} className="border-t">
                  <td className="p-3">{p.displayOrder}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <img src={p.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-100" />
                      <button type="button" className="font-medium text-left hover:underline" onClick={() => setEditando({ ...PRODUTO_VAZIO, ...p })}>{p.title}</button>
                    </div>
                  </td>
                  <td className="p-3">
                    {p.price}
                    {p.discount && <span className="ml-2 text-gray-400 line-through">{p.discount}</span>}
                  </td>
                  <td className="p-3">{p.estoqueStatus === "reservado" ? "reservado (checkout)" : p.estoqueStatus === "vendido" ? "vendido" : p.inStock}</td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditando({ ...PRODUTO_VAZIO, ...p })}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label="Apagar" onClick={() => apagar(p)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </td>
                </tr>
              ))}
              {produtos.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">Nenhuma figure cadastrada.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(aberto) => !aberto && setEditando(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editando?.id ? "Editar figure" : "Nova figure"}</DialogTitle>
          </DialogHeader>
          {editando && (
            <form onSubmit={salvar} className="space-y-3">
              <div>
                <Label htmlFor="p-titulo">Título</Label>
                <Input id="p-titulo" required {...campo("title")} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-preco">Preço</Label>
                  <Input id="p-preco" required inputMode="numeric" value={editando.price} onChange={(e) => setEditando({ ...editando, price: mascaraReais(e.target.value) })} />
                </div>
                <div>
                  <Label htmlFor="p-antigo">Preço antigo (riscado)</Label>
                  <Input id="p-antigo" inputMode="numeric" value={editando.discount ?? ""} onChange={(e) => setEditando({ ...editando, discount: mascaraReais(e.target.value) })} />
                </div>
              </div>
              <div>
                <Label htmlFor="p-imagem">Foto de capa</Label>
                <div className="flex gap-2 items-center">
                  {editando.image && <img src={editando.image} alt="" className="w-12 h-12 rounded object-cover" />}
                  <Input id="p-imagem" required placeholder="https://..." {...campo("image")} />
                  <BotaoUpload aoSubir={(url) => setEditando((p) => p && { ...p, image: url })}>{editando.image ? "Trocar" : "Subir"}</BotaoUpload>
                  {editando.image && (
                    <Button type="button" variant="ghost" size="icon" aria-label="Remover capa" title="Remover capa (a 1ª foto adicional vira capa)"
                      onClick={() => setEditando((p) => p && { ...p, image: p.images?.[0]?.url ?? "", imageAlt: p.images?.[0]?.alt ?? "", images: p.images?.slice(1) ?? [] })}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  )}
                </div>
                <Input aria-label="Texto alternativo da capa" className="mt-2" placeholder={`Texto alternativo (vazio = "${editando.title || "nome da figure"}")`} {...campo("imageAlt")} />
              </div>
              <FotosExtras
                titulo={editando.title}
                fotos={editando.images ?? []}
                aoMudar={(images) => setEditando((p) => p && { ...p, images })}
                usarComoCapa={(i) => setEditando((p) => {
                  if (!p) return p;
                  const extras = [...(p.images ?? [])];
                  const [nova] = extras.splice(i, 1, ...(p.image ? [{ url: p.image, alt: p.imageAlt ?? null }] : []));
                  return { ...p, image: nova.url, imageAlt: nova.alt ?? "", images: extras };
                })}
              />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="p-situacao">Situação</Label>
                  <select id="p-situacao" className="w-full h-10 border rounded-md px-2" value={editando.inStock} onChange={(e) => setEditando({ ...editando, inStock: e.target.value })}>
                    <option value="disponível">Disponível</option>
                    <option value="indisponível">Indisponível</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="p-ordem">Ordem de exibição</Label>
                  <Input id="p-ordem" type="number" min={1} {...campo("displayOrder")} />
                </div>
              </div>
              <fieldset className="grid grid-cols-4 gap-2">
                <legend className="text-sm font-medium mb-1">Caixa para o frete (vazio = tamanho padrão)</legend>
                {([["pesoEmKg", "Peso kg"], ["alturaEmCm", "Alt. cm"], ["larguraEmCm", "Larg. cm"], ["comprimentoEmCm", "Comp. cm"]] as const).map(([k, rotulo]) => (
                  <div key={k}>
                    <Label htmlFor={`p-${k}`} className="text-xs">{rotulo}</Label>
                    <Input id={`p-${k}`} type="number" step="0.01" min={0} {...campo(k)} />
                  </div>
                ))}
              </fieldset>
              <fieldset className="space-y-3 border-t pt-3">
                <legend className="text-sm font-medium">Página da figure (opcional — vazio não aparece)</legend>
                <div>
                  <Label htmlFor="p-descricao">Descrição</Label>
                  <Textarea id="p-descricao" rows={4} value={editando.description ?? ""} onChange={(e) => setEditando({ ...editando, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {([["fabricante", "Fabricante", "Good Smile"], ["serie", "Série / anime", "Vocaloid"], ["escala", "Escala", "1/7"], ["alturaFiguraCm", "Altura da figure (cm)", "23"], ["material", "Material", "PVC e ABS"]] as const).map(([k, rotulo, ex]) => (
                    <div key={k}>
                      <Label htmlFor={`p-${k}`}>{rotulo}</Label>
                      <Input id={`p-${k}`} placeholder={ex} type={k === "alturaFiguraCm" ? "number" : "text"} step="0.1" min={0} {...campo(k)} />
                    </div>
                  ))}
                </div>
              </fieldset>
              <fieldset className="space-y-3 border-t pt-3">
                <legend className="text-sm font-medium">SEO (vazio = gerado automaticamente)</legend>
                <div>
                  <Label htmlFor="p-slug">Endereço</Label>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    /produto/<Input id="p-slug" placeholder={gerarSlug(editando.title) || "nome-da-figure"} value={editando.slug ?? ""} onChange={(e) => setEditando({ ...editando, slug: e.target.value })} />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Mudar o endereço quebra links já compartilhados.</p>
                </div>
                <div>
                  <Label htmlFor="p-seo-titulo">Título no Google ({(editando.seoTitle || "").length}/70)</Label>
                  <Input id="p-seo-titulo" maxLength={70} placeholder={tituloSeo({ ...editando, id: "", seoTitle: null })} {...campo("seoTitle")} />
                </div>
                <div>
                  <Label htmlFor="p-seo-descricao">Descrição no Google ({(editando.seoDescription || "").length}/170)</Label>
                  <Textarea id="p-seo-descricao" rows={3} maxLength={170} placeholder={descricaoSeo({ ...editando, id: "", seoDescription: null })} value={editando.seoDescription ?? ""} onChange={(e) => setEditando({ ...editando, seoDescription: e.target.value })} />
                </div>
              </fieldset>
              <div className="flex gap-2 justify-end pt-2 flex-wrap">
                {editando.id && (
                  <Button asChild variant="ghost" className="mr-auto gap-2">
                    <a href={caminhoProduto({ id: editando.id, slug: editando.slug })} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Ver página pública
                    </a>
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setEditando(null)}>Cancelar</Button>
                <Button type="submit" disabled={salvando}>{salvando ? "Salvando..." : "Salvar"}</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Imagens / Textos / Features (um documento só: config/site) ───────────────
type Config = ReturnType<typeof useConfigSite>;

function mover<T>(lista: T[], i: number, delta: number): T[] {
  const j = i + delta;
  if (j < 0 || j >= lista.length) return lista;
  const nova = [...lista];
  [nova[i], nova[j]] = [nova[j], nova[i]];
  return nova;
}

function ListaImagens({ titulo, urls, aoMudar }: { titulo: string; urls: string[]; aoMudar: (u: string[]) => void }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">{titulo}</h3>
        <BotaoUpload aoSubir={(url) => aoMudar([...urls, url])}>Adicionar</BotaoUpload>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-3">
        {urls.map((url, i) => (
          <div key={url + i} className="border rounded-lg overflow-hidden">
            <img src={url} alt="" className="w-full aspect-square object-cover bg-gray-100" />
            <div className="flex justify-between p-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mover para trás" onClick={() => aoMudar(mover(urls, i, -1))}><ArrowUp className="h-3 w-3 -rotate-90" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Remover" onClick={() => aoMudar(urls.filter((_, k) => k !== i))}><Trash2 className="h-3 w-3 text-red-600" /></Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Mover para frente" onClick={() => aoMudar(mover(urls, i, 1))}><ArrowDown className="h-3 w-3 -rotate-90" /></Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function FotosExtras({ titulo, fotos, aoMudar, usarComoCapa }: { titulo: string; fotos: FotoProduto[]; aoMudar: (f: FotoProduto[]) => void; usarComoCapa: (i: number) => void }) {
  const alterar = (i: number, alt: string) => aoMudar(fotos.map((f, k) => (k === i ? { ...f, alt } : f)));
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <Label>Fotos adicionais (outros ângulos)</Label>
        <BotaoUpload aoSubir={(url) => aoMudar([...fotos, { url, alt: "" }])}>Adicionar</BotaoUpload>
      </div>
      {fotos.length === 0 && <p className="text-xs text-gray-500">Nenhuma. No card, as fotos se alternam quando o mouse passa por cima.</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {fotos.map((f, i) => (
          <div key={f.url + i} className="border rounded-lg overflow-hidden">
            <img src={f.url} alt="" className="w-full aspect-square object-cover bg-gray-100" />
            <Input aria-label={`Texto alternativo da foto ${i + 2}`} className="h-8 text-xs rounded-none border-x-0" placeholder={`${titulo || "Figure"} — foto ${i + 2}`} value={f.alt ?? ""} onChange={(e) => alterar(i, e.target.value)} />
            <div className="flex justify-between p-1">
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Mover para trás" onClick={() => aoMudar(mover(fotos, i, -1))}><ArrowUp className="h-3 w-3 -rotate-90" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Usar como capa" title="Usar como capa" onClick={() => usarComoCapa(i)}><Star className="h-3 w-3" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Remover" onClick={() => aoMudar(fotos.filter((_, k) => k !== i))}><Trash2 className="h-3 w-3 text-red-600" /></Button>
              <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Mover para frente" onClick={() => aoMudar(mover(fotos, i, 1))}><ArrowDown className="h-3 w-3 -rotate-90" /></Button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ListaBanners({ banners, aoMudar }: { banners: Banner[]; aoMudar: (b: Banner[]) => void }) {
  const alterar = (i: number, mudanca: Partial<Banner>) => aoMudar(banners.map((b, k) => (k === i ? { ...b, ...mudanca } : b)));
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-bold">Banners principais</h3>
        <BotaoUpload aoSubir={(image) => aoMudar([...banners, { image, alt: "" }])}>Adicionar banner</BotaoUpload>
      </div>
      {banners.map((b, i) => (
        <div key={b.image + i} className="flex flex-col sm:flex-row gap-3 border rounded-lg p-3">
          <img src={b.image} alt="" className="w-full sm:w-56 aspect-[21/7] object-contain bg-gray-100 rounded" />
          <div className="flex-1 space-y-2">
            <Input placeholder="Descrição da imagem (acessibilidade)" value={b.alt} onChange={(e) => alterar(i, { alt: e.target.value })} />
            <Input placeholder="Link ao clicar (opcional) — https://... ou /estoque" value={b.href ?? ""} onChange={(e) => alterar(i, { href: e.target.value })} />
          </div>
          <div className="flex sm:flex-col gap-1">
            <Button variant="ghost" size="icon" aria-label="Subir" onClick={() => aoMudar(mover(banners, i, -1))}><ArrowUp className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Descer" onClick={() => aoMudar(mover(banners, i, 1))}><ArrowDown className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Remover" onClick={() => aoMudar(banners.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4 text-red-600" /></Button>
          </div>
        </div>
      ))}
    </section>
  );
}

function SeletorDestaques({ escolhidos, aoMudar }: { escolhidos: string[]; aoMudar: (ids: string[]) => void }) {
  const { data: produtos = [] } = useProdutosAdmin();
  const alternar = (id: string) =>
    aoMudar(escolhidos.includes(id) ? escolhidos.filter((x) => x !== id) : [...escolhidos, id]);

  return (
    <section className="space-y-3 border rounded-xl p-4">
      <div>
        <h3 className="font-bold">Figures do destaque de promoções</h3>
        <p className="text-sm text-gray-500">
          Escolha até 3, na ordem em que devem aparecer. Sem nenhuma escolhida, o site mostra sozinho as 3 com maior desconto.
          Figures indisponíveis ficam de fora automaticamente.
        </p>
      </div>
      <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {produtos.map((p) => {
          const posicao = escolhidos.indexOf(p.id);
          const lotado = posicao === -1 && escolhidos.length >= 3;
          const indisponivel = p.inStock === "indisponível" || p.estoqueStatus === "vendido";
          return (
            <li key={p.id}>
              <label className={`flex items-center gap-3 rounded-lg border p-2 cursor-pointer ${posicao > -1 ? "border-[#EA3E83] bg-pink-50" : ""} ${lotado ? "opacity-40 cursor-not-allowed" : ""}`}>
                <input type="checkbox" className="accent-[#EA3E83]" checked={posicao > -1} disabled={lotado} onChange={() => alternar(p.id)} />
                <img src={p.image} alt="" className="w-10 h-10 rounded object-cover bg-gray-100" />
                <span className="flex-1 min-w-0 text-sm">
                  <span className="block truncate font-medium">{p.title}</span>
                  <span className="text-gray-500">
                    {p.price}
                    {!p.discount && " · sem preço antigo (não mostra % off)"}
                    {indisponivel && " · indisponível"}
                  </span>
                </span>
                {posicao > -1 && <span className="text-xs font-bold text-[#EA3E83]">{posicao + 1}º</span>}
              </label>
            </li>
          );
        })}
      </ul>
      {escolhidos.length > 0 && (
        <Button variant="outline" size="sm" onClick={() => aoMudar([])}>Voltar para o automático</Button>
      )}
    </section>
  );
}

// ─── Página ───────────────────────────────────────────────────────────────────
export default function Admin() {
  const { usuario, carregando } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();
  const acesso = useAcessoAdmin();
  const atual = useConfigSite();
  const configCarregada = qc.getQueryState(["config-site"])?.status === "success";
  const [config, setConfig] = useState<Config | null>(null);
  const [salvando, setSalvando] = useState(false);

  // Começa a edição a partir do que está no ar (só quando a config já carregou).
  useEffect(() => {
    if (configCarregada && !config) setConfig(atual);
  }, [configCarregada, config, atual]);

  async function salvarConfig() {
    if (!config) return;
    setSalvando(true);
    try {
      await chamarAdmin("salvarConfig", {
        config: {
          ...config,
          banners: vaziaSePadrao(config.banners, BANNERS_PADRAO),
          galeria: vaziaSePadrao(config.galeria, GALERIA_PADRAO),
          avaliacoes: vaziaSePadrao(config.avaliacoes, AVALIACOES_PADRAO),
        },
      });
      await qc.invalidateQueries({ queryKey: ["config-site"] });
      toast({ title: "Site atualizado" });
    } catch (err) {
      toast({ title: (err as Error).message, variant: "destructive" });
    }
    setSalvando(false);
  }

  const tela = (conteudo: ReactNode) => (
    <div className="min-h-screen bg-white">
      <CabecalhoSimples />
      <main className="container mx-auto px-4 py-8 max-w-6xl">{conteudo}</main>
    </div>
  );

  if (carregando || (usuario && acesso.isLoading)) return tela(<p className="text-gray-500">Carregando...</p>);
  if (!usuario) return tela(<p>Faça <Link to="/entrar" className="text-[#EA3E83] underline">login</Link> com a conta de administrador.</p>);
  if (acesso.isError) return tela(<p>Esta conta não tem acesso ao painel.</p>);

  const salvar = (
    <Button onClick={salvarConfig} disabled={salvando || !config} className="bg-[#EA3E83] hover:bg-[#c72e6c]">
      {salvando ? "Salvando..." : "Salvar alterações no site"}
    </Button>
  );

  return tela(
    <>
      <h1 className="fredoka text-3xl mb-6">Painel da loja</h1>
      <Tabs defaultValue="estoque">
        <TabsList className="mb-6 flex-wrap h-auto">
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="imagens">Imagens</TabsTrigger>
          <TabsTrigger value="textos">Textos</TabsTrigger>
          <TabsTrigger value="features">Seções</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque">
          <AbaEstoque />
        </TabsContent>

        {config && (
          <>
            <TabsContent value="imagens" className="space-y-10">
              <ListaBanners banners={config.banners} aoMudar={(banners) => setConfig({ ...config, banners })} />
              <ListaImagens titulo="Figures que já passaram por aqui" urls={config.galeria} aoMudar={(galeria) => setConfig({ ...config, galeria })} />
              <ListaImagens titulo="Avaliações" urls={config.avaliacoes} aoMudar={(avaliacoes) => setConfig({ ...config, avaliacoes })} />
              {salvar}
            </TabsContent>

            <TabsContent value="textos" className="space-y-4">
              <p className="text-sm text-gray-500">Coloque um trecho entre *asteriscos* para destacá-lo (rosa no título, negrito nos textos).</p>
              {(Object.keys(ROTULOS_TEXTO) as ChaveTexto[]).map((k) => (
                <div key={k}>
                  <Label htmlFor={`t-${k}`}>{ROTULOS_TEXTO[k]}</Label>
                  <Textarea id={`t-${k}`} rows={k.endsWith("Texto") ? 4 : 2} value={config.textos[k]} onChange={(e) => setConfig({ ...config, textos: { ...config.textos, [k]: e.target.value } })} />
                </div>
              ))}
              {salvar}
            </TabsContent>

            <TabsContent value="features" className="space-y-4">
              {(Object.keys(ROTULOS_FEATURE) as ChaveFeature[]).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <Switch id={`f-${k}`} checked={config.features[k]} onCheckedChange={(v) => setConfig({ ...config, features: { ...config.features, [k]: v } })} />
                  <Label htmlFor={`f-${k}`}>{ROTULOS_FEATURE[k]}</Label>
                </div>
              ))}
              <SeletorDestaques escolhidos={config.destaques} aoMudar={(destaques) => setConfig({ ...config, destaques })} />
              {salvar}
            </TabsContent>
          </>
        )}
      </Tabs>
    </>,
  );
}
