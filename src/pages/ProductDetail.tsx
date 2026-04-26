import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "@/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ShoppingCart, 
  MessageCircle, 
  Instagram, 
  ArrowLeft, 
  Plus, 
  Minus,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  CreditCard
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { processPayment, PaymentError, getPaymentErrorMessage } from "@/services/paymentService";
import { useToast } from "@/hooks/use-toast";
import kitsuyIcon from "@/assets/KitsuyIcon.png";
import kitsuyIconBlack from "@/assets/KitsuyIconBlack.png";

// 🎯 Interface para o produto
interface Product {
  id: string;
  title: string;
  inStock: string;
  discount: string;
  price: string;
  image: string;
  displayOrder?: number;
  description?: string;
  stock?: number;
  featured?: boolean;
  source?: string;
  images?: string[]; // Array de imagens adicionais
  category?: string;
  deliveryTime?: string;
  pixPrice?: string;
  installments?: string;
}

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);

  const { toast } = useToast();
  const whatsappLink = "https://wa.me/5571997020168";
  const instagramLink = "https://instagram.com/kitsuystore";

  // 🔥 Buscar produto no Firebase
  useEffect(() => {
    const fetchProduct = async () => {
      if (!id) {
        setLoading(false);
        return;
      }

      try {
        // Tentar buscar em todas as coleções
        const collections = ["products", "masterpiece", "lancamentos", "premium"];
        let foundProduct: Product | null = null;

        for (const collectionName of collections) {
          const docRef = doc(db, collectionName, id);
          const docSnap = await getDoc(docRef);

          if (docSnap.exists()) {
            foundProduct = {
              id: docSnap.id,
              source: collectionName,
              ...docSnap.data(),
            } as Product;
            break;
          }
        }

        if (foundProduct) {
          setProduct(foundProduct);
          // Define a primeira imagem como selecionada
          setSelectedImage(foundProduct.image);
        } else {
          console.error("Produto não encontrado");
        }
      } catch (error) {
        console.error("Erro ao buscar produto:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // Funções de controle de quantidade
  const increaseQuantity = () => {
    if (product?.stock && quantity < product.stock) {
      setQuantity(quantity + 1);
    } else if (!product?.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  // Gerar mensagem WhatsApp
  const generateWhatsAppMessage = () => {
    const message = `Olá! Gostaria de comprar:\n\n*${product?.title}*\nQuantidade: ${quantity}\nPreço: ${product?.price}`;
    return `${whatsappLink}?text=${encodeURIComponent(message)}`;
  };

  // 💳 Processar pagamento com Mercado Pago
  const handlePayment = async () => {
    if (!product) return;

    setIsProcessingPayment(true);
    setPaymentError(null);

    try {
      toast({
        title: "Processando...",
        description: "Redirecionando para o pagamento seguro",
      });

      // Chamar serviço de pagamento
      await processPayment({
        productId: product.id,
        collectionName: product.source || 'products',
        quantity: quantity,
      });
      // Se chegou aqui, o redirect aconteceu — não há mais código a executar

    } catch (err) {
      const message = getPaymentErrorMessage(err);
      setPaymentError(message);

      toast({
        title: "Erro ao processar pagamento",
        description: message,
        variant: "destructive",
      });

      // Log detalhado para debug (não aparece para o usuário)
      if (err instanceof PaymentError) {
        console.error('[ProductDetail] PaymentError', { 
          code: err.code, 
          status: err.statusCode, 
          message: err.message 
        });
      } else {
        console.error('[ProductDetail] Erro inesperado no pagamento:', err);
      }
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Verificar disponibilidade
  const isOutOfStock = product?.inStock?.toLowerCase() === "indisponível";
  const isInStock = product?.inStock?.toLowerCase() === "disponível";

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="fredoka text-xl text-primary">Carregando produto...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center">
        <div className="text-center">
          <XCircle className="h-24 w-24 text-destructive mx-auto mb-4" />
          <h2 className="fredoka text-3xl font-bold text-foreground mb-4">
            Produto não encontrado
          </h2>
          <Button onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para a loja
          </Button>
        </div>
      </div>
    );
  }

  // Array de imagens (imagem principal + imagens adicionais)
  const allImages = [product.image, ...(product.images || [])];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header / Navigation */}
      <header className="sticky top-0 h-[6.5rem] border z-50 bg-card/98 bg-white shadow-md rounded-b-[24px]">
        <nav className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 min-w-fit cursor-pointer"
              onClick={() => navigate("/")}
            >
              <img
                src={kitsuyIcon}
                alt="Kitsuy Icon"
                className="w-24 h-24 object-contain animate-float"
              />
              <h1 className="fredoka text-2xl md:text-4xl font-display font-bold bg-[#FF9AB4] bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
                KITSUY STORE
              </h1>
            </div>

            {/* Actions */}
            <div className="flex gap-2 items-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/")}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Voltar</span>
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => window.open(instagramLink, "_blank")}
                className="hidden sm:flex hover:scale-110 hover:text-white hover:bg-black"
              >
                <Instagram className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </nav>
      </header>

      {/* Product Detail Section */}
      <section className="py-8 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            
            {/* Galeria de Imagens */}
            <div className="space-y-4">
              {/* Imagem Principal */}
              <Card className="overflow-hidden border-2 border-primary/20 hover:border-primary/50 transition-all">
                <div 
                  className="relative bg-black aspect-square cursor-pointer group"
                  onClick={() => setImageModalOpen(true)}
                >
                  <img
                    src={selectedImage}
                    alt={product.title}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${
                      isOutOfStock ? "grayscale" : ""
                    }`}
                  />
                  {/* Badge de disponibilidade */}
                  <div className="absolute top-4 right-4">
                    <span
                      className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 ${
                        isInStock
                          ? "bg-green-500 text-white"
                          : "bg-red-500 text-white"
                      }`}
                    >
                      {isInStock ? (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          {product.inStock}
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4" />
                          {product.inStock}
                        </>
                      )}
                    </span>
                  </div>
                </div>
              </Card>

              {/* Miniaturas */}
              {allImages.length > 1 && (
                <div className="grid grid-cols-4 gap-2">
                  {allImages.map((img, index) => (
                    <Card
                      key={index}
                      className={`cursor-pointer overflow-hidden border-2 transition-all hover:border-primary ${
                        selectedImage === img
                          ? "border-primary ring-2 ring-primary"
                          : "border-border"
                      }`}
                      onClick={() => setSelectedImage(img)}
                    >
                      <div className="aspect-square bg-black">
                        <img
                          src={img}
                          alt={`${product.title} - ${index + 1}`}
                          className={`w-full h-full object-cover ${
                            isOutOfStock ? "grayscale" : ""
                          }`}
                        />
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Informações do Produto */}
            <div className="space-y-6">
              {/* Título e Categoria */}
              <div>
                {product.category && (
                  <span className="inline-block px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold mb-3">
                    {product.category}
                  </span>
                )}
                <h1 className="fredoka text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {product.title}
                </h1>
                {product.description && (
                  <p className="text-muted-foreground text-base leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Preços */}
              <Card className="bg-muted/50 border-2 border-primary/20">
                <CardContent className="p-6 space-y-4">
                  {/* Preço com desconto */}
                  {product.discount && product.discount !== product.price && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">De:</span>
                      <span className="text-xl line-through text-muted-foreground">
                        {product.discount}
                      </span>
                    </div>
                  )}

                  {/* Preço normal */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">
                      Preço à vista
                    </p>
                    <p className="fredoka text-4xl md:text-5xl font-bold text-primary">
                      {product.price}
                    </p>
                  </div>

                  {/* Preço no Pix */}
                  {product.pixPrice && (
                    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4">
                      <p className="text-sm text-green-700 font-semibold mb-1">
                        💰 No PIX
                      </p>
                      <p className="fredoka text-2xl font-bold text-green-600">
                        {product.pixPrice}
                      </p>
                    </div>
                  )}

                  {/* Parcelamento */}
                  {product.installments && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground">
                        ou {product.installments}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Controle de Quantidade */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-foreground">
                  Quantidade:
                </label>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={decreaseQuantity}
                    disabled={quantity <= 1 || isOutOfStock}
                    className="h-12 w-12"
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      if (val > 0) setQuantity(val);
                    }}
                    disabled={isOutOfStock}
                    className="text-center text-xl font-bold h-12 w-20"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={increaseQuantity}
                    disabled={isOutOfStock}
                    className="h-12 w-12"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  {product.stock && (
                    <span className="text-sm text-muted-foreground ml-2">
                      ({product.stock} disponíveis)
                    </span>
                  )}
                </div>
              </div>

              {/* Informações de Entrega */}
              {product.deliveryTime && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                  <Clock className="h-6 w-6 text-blue-600" />
                  <div>
                    <p className="text-sm font-semibold text-blue-900">
                      Prazo de Entrega
                    </p>
                    <p className="text-sm text-blue-700">{product.deliveryTime}</p>
                  </div>
                </div>
              )}

              {/* Botões de Ação */}
              <div className="space-y-3 pt-4">
                {/* Mensagem de erro de pagamento */}
                {paymentError && (
                  <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {paymentError}
                  </div>
                )}

                {/* Botão Mercado Pago - Destaque */}
                <Button
                  variant="default"
                  size="lg"
                  className="w-full h-16 text-lg bg-gradient-to-r from-[#009EE3] to-[#0070BA] hover:from-[#0070BA] hover:to-[#009EE3] border-0 shadow-lg"
                  onClick={handlePayment}
                  disabled={isOutOfStock || isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Processando...
                    </span>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-6 w-6" />
                      {isOutOfStock ? "Produto Indisponível" : "Pagar com Mercado Pago"}
                    </>
                  )}
                </Button>

                {/* Descrição do Mercado Pago */}
                <p className="text-xs text-center text-muted-foreground">
                  💳 Pague com cartão, PIX ou boleto de forma segura
                </p>

                {/* Botão WhatsApp - Secundário */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      Ou
                    </span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-lg"
                  onClick={() => window.open(generateWhatsAppMessage(), "_blank")}
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  Comprar via WhatsApp
                </Button>
              </div>

              {/* Informações Adicionais */}
              <Card className="bg-card border-2">
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start gap-3">
                    <Package className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Produto 100% Original</p>
                      <p className="text-sm text-muted-foreground">
                        Figures autênticas e licenciadas
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-primary mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">Garantia de Qualidade</p>
                      <p className="text-sm text-muted-foreground">
                        Embalagem original e lacrada
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-8 border-t-4 border-white mt-12">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src={kitsuyIconBlack}
              alt="Kitsuy IconBlack"
              className="w-12 h-12 object-contain"
            />
            <h3 className="text-xl font-display font-bold">KITSUY STORE</h3>
          </div>
          <p className="text-sm opacity-80 mb-2">Obrigado Por Vir!</p>
          <p className="text-sm opacity-80 mb-4">
            Figures, Camisetas e colecionáveis!
          </p>
          <div className="flex justify-center gap-4 mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(whatsappLink, "_blank")}
              className="text-background hover:text-white"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => window.open(instagramLink, "_blank")}
              className="text-background hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs opacity-60">
            © 2025 Kitsuy Store. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* Modal de Imagem em Fullscreen */}
      {imageModalOpen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModalOpen(false)}
        >
          <img
            src={selectedImage}
            alt={product.title}
            className="max-w-full max-h-full rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setImageModalOpen(false)}
          >
            <XCircle className="h-6 w-6" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductDetail;
