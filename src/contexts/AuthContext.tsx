import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/firebaseConfig";

interface AuthValor {
  usuario: User | null;
  carregando: boolean;
}

const AuthContext = createContext<AuthValor>({ usuario: null, carregando: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [valor, setValor] = useState<AuthValor>({ usuario: null, carregando: true });

  useEffect(
    () => onAuthStateChanged(auth, (usuario) => setValor({ usuario, carregando: false })),
    [],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
