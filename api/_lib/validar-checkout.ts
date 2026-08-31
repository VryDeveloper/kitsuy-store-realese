import { z } from "zod";

/**
 * Validação de `cliente`/`endereco` recebidos em POST /api/criar-preferencia.
 *
 * Espelha exatamente as regras já usadas em
 * `src/components/checkout/FormEndereco.tsx` (schema Zod do formulário do
 * frontend) — mesmos limites de tamanho, mesmo formato de CEP/UF, etc. Não
 * inventa regra nova nem torna nada mais rígido do que já é hoje no
 * frontend.
 *
 * Duplicado aqui em vez de importado de um módulo compartilhado entre
 * `src/` e `api/` por dois motivos: (1) a correção deste bug pediu
 * explicitamente para não tocar em `FormEndereco.tsx`; (2) `api/*.ts` e
 * `src/*.tsx` são empacotados por pipelines diferentes (Vercel Functions
 * vs. build do Vite), então depender de um import cruzado entre as duas
 * pastas é uma superfície a mais pra quebrar sem necessidade. O custo dessa
 * escolha é risco de divergência: se as regras mudarem em
 * `FormEndereco.tsx`, replique a mudança aqui também.
 *
 * Sem essa validação, um POST direto pra /api/criar-preferencia (fora do
 * formulário) podia mandar qualquer conteúdo nesses campos — inclusive
 * HTML — que ia parar sem escape nos emails transacionais (ver
 * api/_lib/email-templates.ts). A validação de formato aqui é a primeira
 * camada de defesa; o escape de HTML nos templates é a segunda,
 * independente desta (campos como "nome" ou "complemento" podem
 * legitimamente conter caracteres especiais sem violar nenhuma regra de
 * formato — validação de formato não é sanitização de saída).
 */

export const clienteSchema = z.object({
  nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().min(10, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
});

export const enderecoSchema = z.object({
  cep: z.string().length(8, "CEP deve ter 8 dígitos"),
  logradouro: z.string().min(3, "Logradouro obrigatório"),
  numero: z.string().min(1, "Número obrigatório"),
  complemento: z.string().optional(),
  bairro: z.string().min(2, "Bairro obrigatório"),
  cidade: z.string().min(2, "Cidade obrigatória"),
  uf: z.string().length(2, "UF inválida"),
});

export type ClienteValidado = z.infer<typeof clienteSchema>;
export type EnderecoValidado = z.infer<typeof enderecoSchema>;
