import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebaseConfig";
import { identificar } from "@/lib/analytics";

interface AuthValor {
  usuario: User | null;
  carregando: boolean;
}

const AuthContext = createContext<AuthValor>({ usuario: null, carregando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [valor, setValor] = useState<AuthValor>({ usuario: null, carregando: true });

  useEffect(
    () =>
      onAuthStateChanged(auth, (usuario) => {
        setValor({ usuario, carregando: false });
        if (usuario) identificar(usuario.uid, usuario.email, usuario.displayName);
      }),
    [],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
