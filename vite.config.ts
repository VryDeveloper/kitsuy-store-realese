import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Em desenvolvimento local, o Vite serve o frontend normalmente (com HMR
    // funcionando) e apenas repassa as chamadas /api/* para o `vercel dev`,
    // que roda separadamente numa porta própria (padrão: 3000) só para
    // executar as funções serverless. Isso evita o problema conhecido de
    // rodar `vercel dev` na frente do dev server do Vite, onde os rewrites
    // do vercel.json interceptam requisições internas do Vite (/@vite/client,
    // /@react-refresh, /src/*) e quebram o HMR.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  base: "./", // ← ADICIONE ESTA LINHA
  plugins: [react(), mode === "development" && componentTagger()].filter(
    Boolean,
  ),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
