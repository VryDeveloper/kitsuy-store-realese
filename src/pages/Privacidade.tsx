import { useState } from "react";
import { CabecalhoSimples } from "@/components/CabecalhoSimples";
import { Button } from "@/components/ui/button";
import { EMAIL_LOJA, WHATSAPP_EXIBICAO } from "@/config/loja";
import { lerConsentimento, salvarConsentimento } from "@/lib/analytics";

const ATUALIZADO_EM = "28/11/2026";

/** Política de Privacidade + Termos de Uso (LGPD — Lei 13.709/2018). */
const Privacidade = () => {
  const [consentimento, setConsentimento] = useState(lerConsentimento);

  const alternar = () => {
    const novo = consentimento === "aceito" ? "recusado" : "aceito";
    salvarConsentimento(novo);
    setConsentimento(novo);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CabecalhoSimples />
      <main className="container mx-auto max-w-3xl px-4 py-10 text-gray-700 leading-relaxed [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_p]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:my-1 [&_a]:text-[#EA3E83] [&_a]:underline">
        <h1>Política de Privacidade e Termos de Uso</h1>
        <p className="text-sm text-gray-500">Última atualização: {ATUALIZADO_EM}</p>

        <section id="privacidade">
          <h2>1. Quem somos</h2>
          <p>
            A Kitsuy Store vende figures e colecionáveis pela internet. Somos a
            controladora dos dados pessoais tratados neste site. Contato para
            assuntos de privacidade: <a href={`mailto:${EMAIL_LOJA}`}>{EMAIL_LOJA}</a>{" "}
            ou WhatsApp {WHATSAPP_EXIBICAO}.
          </p>

          <h2>2. Dados que coletamos</h2>
          <ul>
            <li>
              <strong>Na compra:</strong> nome, e-mail, CPF, telefone e endereço de
              entrega — necessários para emitir o pedido, calcular o frete e
              enviar o produto. CPF e telefone ficam guardados criptografados.
            </li>
            <li>
              <strong>Na conta:</strong> nome e e-mail do login (Google ou e-mail e
              senha) e o histórico dos seus pedidos.
            </li>
            <li>
              <strong>Métricas de uso (só se você aceitar os cookies):</strong>{" "}
              páginas e seções vistas, cliques em botões e imagens, produtos
              adicionados ao carrinho, país e estado aproximados (pelo endereço
              IP), tipo de aparelho, navegador e sistema. Se você estiver logado,
              essas métricas ficam ligadas à sua conta. Campos de formulário
              nunca são gravados.
            </li>
          </ul>

          <h2>3. Para que usamos</h2>
          <ul>
            <li>Processar pagamentos, entregar pedidos e falar com você sobre eles (execução de contrato).</li>
            <li>Cumprir obrigações legais e fiscais.</li>
            <li>Entender como o site é usado e melhorá-lo (seu consentimento — pode ser retirado a qualquer momento).</li>
          </ul>
          <p>Não vendemos seus dados.</p>

          <h2>4. Com quem compartilhamos</h2>
          <ul>
            <li><strong>Mercado Pago</strong> — pagamento.</li>
            <li><strong>Correios / transportadoras e SuperFrete</strong> — cálculo e envio do frete.</li>
            <li><strong>Google Firebase</strong> — login e banco de dados.</li>
            <li><strong>Vercel</strong> — hospedagem do site.</li>
            <li><strong>Resend</strong> — envio de e-mails do pedido.</li>
            <li><strong>PostHog</strong> — métricas de uso, só com seu consentimento.</li>
          </ul>
          <p>Alguns desses serviços podem guardar dados fora do Brasil, com as garantias previstas na LGPD.</p>

          <h2>5. Cookies</h2>
          <p>
            Usamos o armazenamento do navegador para manter seu carrinho e seu
            login (essenciais, sempre ativos). Cookies de métricas só são usados
            se você aceitar.
          </p>
          <p>
            Sua escolha atual:{" "}
            <strong>
              {consentimento === "aceito" ? "métricas aceitas" : consentimento === "recusado" ? "métricas recusadas" : "ainda não escolhida"}
            </strong>
          </p>
          <Button variant="outline" onClick={alternar}>
            {consentimento === "aceito" ? "Recusar métricas" : "Aceitar métricas"}
          </Button>

          <h2>6. Por quanto tempo guardamos</h2>
          <p>
            Dados de pedidos: pelo prazo exigido pela lei fiscal e de defesa do
            consumidor. Métricas de uso: até 12 meses.
          </p>

          <h2>7. Seus direitos</h2>
          <p>
            Você pode pedir a qualquer momento: confirmação e acesso aos seus
            dados, correção, exclusão, portabilidade, informação sobre com quem
            compartilhamos e revogação do consentimento. Basta escrever para{" "}
            <a href={`mailto:${EMAIL_LOJA}`}>{EMAIL_LOJA}</a>. Você também pode
            reclamar à ANPD (Autoridade Nacional de Proteção de Dados).
          </p>
        </section>

        <section id="termos">
          <h2>8. Termos de Uso</h2>
          <ul>
            <li>Ao usar o site e comprar, você concorda com estes termos.</li>
            <li>Os produtos de pronta-entrega são peças únicas; a compra só é confirmada após o pagamento aprovado. A reserva do carrinho expira se o pagamento não for concluído no prazo.</li>
            <li>Preços, fotos e disponibilidade podem mudar sem aviso; o valor que vale é o mostrado no fechamento do pedido.</li>
            <li>Trocas e devoluções seguem o Código de Defesa do Consumidor: arrependimento em até 7 dias do recebimento, com o produto na embalagem original.</li>
            <li>É proibido usar o site para fraude, copiar o conteúdo ou tentar burlar a segurança.</li>
            <li>Podemos atualizar estes termos; a data no topo mostra a última versão.</li>
          </ul>
        </section>
      </main>
    </div>
  );
};

export default Privacidade;
