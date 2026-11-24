import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { CartProvider } from "./contexts/CartContext";
import Index from "./pages/Index";

// A home carrega junto com o app; as outras páginas só quando forem abertas.
const FAQs = lazy(() => import("./pages/FAQs"));
const Estoque = lazy(() => import("./pages/Estoque"));
const Sorteio = lazy(() => import("./pages/Sorteio"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const PedidoConfirmado = lazy(() => import("./pages/PedidoConfirmado"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<div className="min-h-screen" />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/faqs" element={<FAQs />} />
              <Route path="/estoque" element={<Estoque />} />
              <Route path="/sorteio" element={<Sorteio />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/pedido-confirmado" element={<PedidoConfirmado />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}

              <Route path="*" element={<Index />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
        <SpeedInsights />
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
