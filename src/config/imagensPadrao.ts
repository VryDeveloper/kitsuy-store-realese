// Imagens que vêm no código: usadas enquanto o painel não salvar outras.
import banner1 from "@/assets/banner-1.webp";
import bannerSorteio from "@/assets/banner-sorteio.webp";
import bannerInstagram from "@/assets/banner-instagram.webp";
import { INSTAGRAM_URL } from "@/config/loja";
import type { Banner } from "@/config/site";

const todas = (arquivos: Record<string, string>) =>
  Object.entries(arquivos)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
    .map(([, url]) => url);

export const BANNERS_PADRAO: Banner[] = [
  { image: banner1, alt: "Friren-Banner" },
  { image: bannerSorteio, alt: "Sorteio especial Kitsuy Store: concorra à figure Hatsune Miku Clione pelo Instagram", href: INSTAGRAM_URL },
  { image: bannerInstagram, alt: "Siga a Kitsuy Store no Instagram: @kitsuystore", href: INSTAGRAM_URL },
];

export const GALERIA_PADRAO = todas(import.meta.glob("@/assets/figure-*.webp", { eager: true, import: "default" }));
export const AVALIACOES_PADRAO = todas(import.meta.glob("@/assets/avaliacoes/*.webp", { eager: true, import: "default" }));
