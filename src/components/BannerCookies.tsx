import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { lerConsentimento, salvarConsentimento, type Consentimento } from "@/lib/analytics";

/** Aviso de cookies: nada de métrica é coletado até o visitante aceitar. */
export function BannerCookies() {
  const [escolha, setEscolha] = useState(lerConsentimento);
  if (escolha) return null;

  const escolher = (valor: Consentimento) => {
    salvarConsentimento(valor);
    setEscolha(valor);
  };

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      className="fixed inset-x-3 bottom-3 z-[100] mx-auto max-w-2xl rounded-2xl border border-pink-100 bg-white p-4 shadow-xl md:flex md:items-center md:gap-4"
    >
      <p className="text-sm text-gray-700">
        Usamos cookies para entender como o site é usado (páginas vistas,
        cliques, região e tipo de aparelho) e melhorar sua experiência. Saiba
        mais na{" "}
        <Link to="/privacidade" className="font-semibold text-[#EA3E83] underline">
          Política de Privacidade
        </Link>
        .
      </p>
      <div className="mt-3 flex shrink-0 gap-2 md:mt-0">
        <Button variant="outline" size="sm" onClick={() => escolher("recusado")}>
          Recusar
        </Button>
        <Button
          size="sm"
          className="bg-[#EA3E83] hover:bg-[#d4237a]"
          onClick={() => escolher("aceito")}
        >
          Aceitar
        </Button>
      </div>
    </div>
  );
}
