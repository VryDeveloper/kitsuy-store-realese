import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    // Em desenvolvimento local, o Vite serve o frontend (com HMR) e só
    // repassa /api/* para o servidor local das funções (`npm run dev:api`,
    // porta 3000), que substitui o `vercel dev` — ver scripts/dev-api-server.ts.
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  // Absoluto: com "./" os assets quebram em rotas aninhadas (/produto/x, /minha-conta/pedidos).
  base: "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
