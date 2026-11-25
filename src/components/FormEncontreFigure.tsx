import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { linkWhatsApp } from "@/config/loja";
import MagneticBounce from "@/components/MagneticBounce";

/** Monta a mensagem do WhatsApp a partir do formulário "Encontre sua figure". */
export function mensagemEncontreFigure(d: FormData): string {
  const campo = (nome: string) => String(d.get(nome) ?? "").trim();
  return [
    "Olá! Vim do site e quero encontrar uma figure:",
    `• Personagem: ${campo("personagem")}`,
    campo("anime") && `• Anime/série: ${campo("anime")}`,
    campo("link") && `• Link ou referência: ${campo("link")}`,
    campo("detalhes") && `• Detalhes: ${campo("detalhes")}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const campoCls =
  "mt-2 w-full rounded-2xl border-2 border-pink-100 bg-pink-50 px-4 py-3 text-base font-normal text-gray-900 outline-none transition-colors focus:border-[#d4237a]";

export default function FormEncontreFigure() {
  const enviar = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    window.open(linkWhatsApp(mensagemEncontreFigure(new FormData(e.currentTarget))), "_blank", "noopener");
  };

  return (
    <form onSubmit={enviar} className="rounded-3xl bg-white p-8 text-left text-gray-900 shadow-xl md:p-10">
      <p className="fredoka text-2xl font-bold">Encontre sua figure</p>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        <label className="block font-semibold">
          Personagem *
          <input name="personagem" required className={campoCls} placeholder="Ex.: Hatsune Miku" />
        </label>
        <label className="block font-semibold">
          Anime ou série
          <input name="anime" className={campoCls} placeholder="Ex.: Vocaloid" />
        </label>
        <label className="block font-semibold sm:col-span-2">
          Link ou referência
          <input name="link" type="url" className={campoCls} placeholder="https://" />
        </label>
        <label className="block font-semibold sm:col-span-2">
          Detalhes
          <textarea name="detalhes" rows={3} className={campoCls} placeholder="Linha, tamanho, versão…" />
        </label>
      </div>
      <MagneticBounce className="mt-7 w-full sm:w-auto">
        <button
          type="submit"
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-[#d4237a] px-7 font-bold text-white transition-colors hover:bg-[#b81a68]"
        >
          <Send className="h-5 w-5" aria-hidden="true" /> Enviar pelo WhatsApp
        </button>
      </MagneticBounce>
    </form>
  );
}
