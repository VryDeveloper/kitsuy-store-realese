import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { chamarAdmin } from "@/lib/api";

/** Pergunta ao backend se a conta logada está em ADMIN_EMAILS (a lista só existe no servidor). */
export function useAcessoAdmin() {
  const { usuario } = useAuth();
  return useQuery({
    queryKey: ["admin-eu", usuario?.uid],
    queryFn: () => chamarAdmin("eu"),
    enabled: !!usuario,
    retry: false,
    staleTime: Infinity,
  });
}
