import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { CartProvider } from "./contexts/CartContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import FAQs from "./pages/FAQs";
import Estoque from "./pages/Estoque";
import Sorteio from "./pages/Sorteio";
import CheckoutPage from "./pages/CheckoutPage";
import PedidoConfirmado from "./pages/PedidoConfirmado";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <CartProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
        </BrowserRouter>
      </TooltipProvider>
    </CartProvider>
  </QueryClientProvider>
);

export default App;
