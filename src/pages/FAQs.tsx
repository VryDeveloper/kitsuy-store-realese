import { Button } from "@/components/ui/button";
import { Instagram, MessageCircle, Menu, ChevronDown } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import kitsuyIcon from "@/assets/KitsuyIcon.png";
import kitsuyIconBlack from "@/assets/KitsuyIconBlack.png";

const FAQs = () => {
  const whatsappLink = "https://wa.me/5571997020168?text=Olá! Vim do site e gostaria de conhecer os produtos!";
  const instagramLink = "https://instagram.com/kitsuystore";

  const faqData = [
    {
      question: "Os produtos são 100% originais?",
      answer: "Sim! Todos os nossos produtos são 100% originais e licenciados, não trabalhamos com figures falsificadas!. Trabalhamos apenas com fornecedores confiáveis e todas as figures são importadas do Japão"
    },
    {
      question: "Como funciona o envio?",
      answer: "Realizamos envios para todo o Brasil através dos Correios. Pronta-Entregas tem o prazo de entrega varia de acordo com sua região, geralmente entre 5 a 15 dias úteis. Você receberá o código de rastreamento assim que o produto for postado! Em caso de cotação, o produto vem diretamente do Japão,"
    },
    {
      question: "Qual é o prazo de entrega?",
      answer: "O prazo de entrega varia de acordo com sua localização. Para capitais, geralmente leva de 5 a 10 dias úteis. Para demais localidades, pode levar até 15 dias úteis. Enviamos o código de rastreamento para você acompanhar sua encomenda. Se a sua compra for uma cotação, o item demora de 30 a 65 dias uteis para chegar do Japão!"
    },
    {
      question: "Vocês trabalham com pré-venda?",
      answer: "Sim! Oferecemos pré-vendas de lançamentos exclusivos. Entre em contato pelo WhatsApp para saber sobre as próximas pre-vendas disponíveis."
    },
    {
      question: "Posso trocar ou devolver um produto?",
      answer: "Sim! Aceitamos trocas e devoluções em até 7 dias após o recebimento, desde que o produto esteja em perfeitas condições e na embalagem original. Entre em contato conosco para mais detalhes sobre o processo."
    },
    {
      question: "Como posso pagar?",
      answer: "Aceitamos várias formas de pagamento: PIX (possibilidade de desconto), cartão de crédito, débito e transferência bancária. Entre em contato pelo WhatsApp para negociar a melhor forma de pagamento para você."
    },
    {
      question: "Vocês têm loja física?",
      answer: "Atualmente operamos apenas no formato online, garantindo os melhores preços e atendimento personalizado via WhatsApp e Instagram. Isso nos permite oferecer produtos com valores mais acessíveis!"
    },
    {
      question: "Como sei que meu pedido foi confirmado?",
      answer: "Assim que recebermos seu pagamento e confirmarmos o pedido, você receberá uma mensagem no WhatsApp com todos os detalhes, incluindo previsão de envio e código de rastreamento quando disponível."
    },
    {
      question: "Vocês têm o produto X em estoque?",
      answer: "Nossa disponibilidade é atualizada constantemente pelo site. Para verificar se temos um produto específico em estoque, entre em contato conosco pelo WhatsApp. Também podemos verificar a possibilidade de encomendar produtos que não estão disponíveis no momento."
    },
    {
      question: "Posso fazer encomendas especiais?",
      answer: "Sim! Se você procura uma figure específica ou algum produto colecionavel (cartas Pokémon, gachapon, banners, etc) que não está em nosso catálogo, podemos tentar encomendar para você. Entre em contato e nos informe o que está procurando. Faremos o possível para encontrar!"
    },
    {
      question: "As figures vêm montadas?",
      answer: "Depende do modelo. Algumas figures vêm totalmente montadas, enquanto outras podem precisar de montagem simples (encaixe de partes). Todas vêm com instruções claras quando necessário."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">
      {/* Header / Navigation - Asian Style */}
      <header className="sticky top-0 h-[6.5rem] border z-50 bg-card/98 bg-white shadow-md rounded-b-[24px]">
        <nav className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center gap-4">
            {/* Logo */}
            <div className="flex items-center gap-2 min-w-fit">
              <img
                src={kitsuyIcon}
                alt="Kitsuy Icon"
                className="w-24 h-24 object-contain animate-float"
              />
              <h1 className="text-2xl md:text-4xl font-display font-bold bg-[#FF9AB4] bg-clip-text text-transparent hover:cursor-default hover:scale-105 transition-transform duration-200">
                KITSUY STORE
              </h1>
            </div>
            
            {/* Navigation Links */}
            <div className="hidden md:flex flex-1 max-w-md mx-4">
              <div className="flex items-center justify-center space-x-6 w-full">
                <a
                  href="/"
                  className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                >
                  Início
                </a>
                
                <a
                  href="/#sobre"
                  className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                >
                  Sobre
                </a>
                
                <a
                  href="/#figures"
                  className="text-sm font-bold text-gray-700 hover:text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md"
                >
                  Figures
                </a>
                
                <a
                  href="/faqs"
                  className="text-sm font-bold text-pink-600 transition-colors duration-200 hover:-translate-y-1 transition-transform duration-200 hover:shadow-md p-1 rounded-md border-b-2 border-pink-600"
                >
                  FAQs
                </a>
              </div>
            </div>

            {/* Actions Menu & Social */}
            <div className="flex gap-2 items-center">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => window.open(instagramLink, '_blank')}
                className="hidden sm:flex hover:scale-110 hover:text-white hover:bg-black"
              >
                <Instagram className="h-5 w-5" />
              </Button>
              
              {/* Quick Actions Menu */}
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2 bg-primary text-white border-primary hover:bg-black hover:border-black w-auto h-10">
                    <Menu className="h-4 w-4" />
                    <span className="hidden sm:inline">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-[300px] sm:w-[400px]">
                  <SheetHeader>
                    <SheetTitle className="font-japanese text-xl">Ações Rápidas</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 space-y-4">
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.open(whatsappLink, '_blank')}
                    >
                      <MessageCircle className="h-5 w-5" />
                      Atendimento WhatsApp
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.open(instagramLink, '_blank')}
                    >
                      <Instagram className="h-5 w-5" />
                      Seguir no Instagram
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full justify-start gap-3 h-12"
                      onClick={() => window.location.href = '/'}
                    >
                      <ChevronDown className="h-5 w-5 rotate-90" />
                      Voltar ao Início
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-b from-white to-light-gray relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute bottom-0 w-full h-32" 
          />
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl mx-auto text-center animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-display font-bold mb-8 bg-gradient-to-r from-pink-500 via-pink-400 to-pink-600 bg-clip-text text-transparent animate-gradient-x">
              Perguntas Frequentes
            </h1>
            <p className="text-lg text-foreground leading-relaxed mb-8 font-japanese">
              Tire suas dúvidas sobre nossos produtos, entregas, pagamentos e muito mais!
            </p>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqData.map((faq, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border-2 border-accent/20 rounded-lg px-6 hover:border-primary/50 transition-all bg-card shadow-sm hover:shadow-md"
                >
                  <AccordionTrigger className="text-left font-semibold text-lg hover:text-primary py-6 hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground leading-relaxed pb-6 pt-2">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>

            {/* CTA após FAQs */}
            <div className="mt-16 text-center p-8 bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl border-2 border-primary/20">
              <h3 className="text-2xl md:text-3xl font-display font-bold mb-4 text-primary">
                Ainda tem dúvidas?
              </h3>
              <p className="text-lg mb-6 text-foreground">
                Nossa equipe está pronta para te ajudar! Entre em contato conosco.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  onClick={() => window.open(whatsappLink, '_blank')}
                  className="bg-primary hover:bg-primary/90 text-white shadow-lg hover:shadow-xl"
                >
                  <MessageCircle className="mr-2 h-5 w-5" />
                  WhatsApp
                </Button>
                <Button 
                  variant="outline"
                  size="lg"
                  onClick={() => window.open(instagramLink, '_blank')}
                  className="border-2 border-primary text-primary hover:bg-primary hover:text-white"
                >
                  <Instagram className="mr-2 h-5 w-5" />
                  Instagram
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer - Traditional Style */}
      <footer id="contato" className="bg-foreground text-background py-8 border-t-4 border-white">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src={kitsuyIconBlack}
              alt="Kitsuy IconBlack"
              className="w-12 h-12 object-contain"
            />
            <h3 className="text-xl font-display font-bold">KITSUY STORE</h3>
          </div>
          <p className="text-sm opacity-80 mb-2 font-japanese">
            Obrigado Por Vir!
          </p>
          <p className="text-sm opacity-80 mb-4">
            Figures, Camisetas e colecionaveis!
          </p>
          <div className="flex justify-center gap-4 mb-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(whatsappLink, '_blank')}
              className="text-background hover:text-white"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => window.open(instagramLink, '_blank')}
              className="text-background hover:text-white"
            >
              <Instagram className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs opacity-60">
            Site em Contrução! Envie seu Feedback para kitsuystore@gmail.com
          </p>
          <p className="text-xs opacity-60">
            © 2025 Kitsuy Store. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default FAQs;
