import { Fragment, createElement, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/firebaseConfig";
import { FEATURES_PADRAO, TEXTOS_PADRAO, type ConfigSalva } from "@/config/site";
import { AVALIACOES_PADRAO, BANNERS_PADRAO, GALERIA_PADRAO } from "@/config/imagensPadrao";

export async function buscarConfigSite(): Promise<ConfigSalva> {
  const snap = await getDoc(doc(db, "config", "site"));
  return (snap.data() as ConfigSalva) ?? {};
}

/**
 * Conteúdo editável do site. Enquanto carrega (ou se der erro) devolve os
 * padrões do código, então a página nunca fica vazia.
 */
export function useConfigSite() {
  const { data = {} } = useQuery({ queryKey: ["config-site"], queryFn: buscarConfigSite, staleTime: 5 * 60_000 });
  const ou = <T,>(salvo: T[] | undefined, p: T[]) => (salvo?.length ? salvo : p);
  return {
    banners: ou(data.banners, BANNERS_PADRAO),
    galeria: ou(data.galeria, GALERIA_PADRAO),
    avaliacoes: ou(data.avaliacoes, AVALIACOES_PADRAO),
    destaques: data.destaques ?? [],
    textos: { ...TEXTOS_PADRAO, ...data.textos },
    features: { ...FEATURES_PADRAO, ...data.features },
  };
}

/** "Sua figure, *direto do Japão*" → o trecho entre * vira <Destaque>. */
export function comDestaque(texto: string, Destaque: (t: string) => ReactNode): ReactNode {
  return texto.split("*").map((parte, i) => createElement(Fragment, { key: i }, i % 2 ? Destaque(parte) : parte));
}
